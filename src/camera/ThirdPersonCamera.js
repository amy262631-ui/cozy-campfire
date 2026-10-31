import * as THREE from 'three';

const MIN_DIST = 3;
const MAX_DIST = 14;
const MIN_PITCH = 0.08;
const MAX_PITCH = 1.25;

/**
 * 第三人稱軌道跟隨相機
 * - 滑鼠右鍵拖曳：旋轉（手機：單指拖曳）
 * - 滾輪：縮放
 * - 閒置 idleAfter 秒：進入掛機巡航（Cinematic Idle Mode），緩慢環繞
 */
export class ThirdPersonCamera {
  constructor(camera, domElement, player, input, { idleAfter = 60, onIdleChange, occluders = [] } = {}) {
    this.camera = camera;
    this.player = player;
    this.input = input;
    this.idleAfter = idleAfter;
    this.onIdleChange = onIdleChange;
    this.occluders = occluders;
    this.raycaster = new THREE.Raycaster();
    this._dir = new THREE.Vector3();
    this.blockedDistance = Infinity; // 被樹擋住時，相機實際能拉到的距離

    this.yaw = 0;
    this.pitch = 0.36;
    this.distance = 7;
    this.target = { yaw: this.yaw, pitch: this.pitch, distance: this.distance };

    this.isIdle = false;
    this.lookUp = false; // 仰望星空模式
    this._lookAmt = 0;
    this._lookAt = new THREE.Vector3();
    this._saved = null;

    this.focus = player.position.clone().add(new THREE.Vector3(0, 1, 0));
    this._desiredFocus = new THREE.Vector3();

    this.#bindPointer(domElement);
  }

  #bindPointer(el) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('pointerdown', (e) => {
      // 桌機用右鍵；觸控用任意手指
      if (e.pointerType === 'mouse' && e.button !== 2) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.target.yaw -= dx * 0.0055;
      this.target.pitch = THREE.MathUtils.clamp(this.target.pitch + dy * 0.004, MIN_PITCH, MAX_PITCH);
    });

    const stop = (e) => {
      dragging = false;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = Math.exp(e.deltaY * 0.0012);
        this.target.distance = THREE.MathUtils.clamp(this.target.distance * factor, MIN_DIST, MAX_DIST);
      },
      { passive: false },
    );
  }

  #setIdle(idle) {
    if (idle === this.isIdle) return;
    this.isIdle = idle;
    if (idle) {
      this._saved = { pitch: this.target.pitch, distance: this.target.distance };
    } else if (this._saved) {
      this.target.pitch = this._saved.pitch;
      this.target.distance = this._saved.distance;
    }
    this.onIdleChange?.(idle);
  }

  /** 畫面搖晃（釣魚咬鉤時當作「震動」） */
  shake(amount) {
    this._shake = Math.max(this._shake ?? 0, amount);
  }

  update(dt) {
    this.#setIdle(!this.lookUp && this.input.idleSeconds > this.idleAfter);
    this._lookAmt += ((this.lookUp ? 1 : 0) - this._lookAmt) * (1 - Math.exp(-1.8 * dt));
    const L = this._lookAmt;

    if (this.isIdle) {
      // 緩慢環繞、拉遠、稍微壓低視角，營造電影感
      this.target.yaw += dt * 0.09;
      this.target.pitch += (0.22 - this.target.pitch) * (1 - Math.exp(-0.4 * dt));
      this.target.distance += (10 - this.target.distance) * (1 - Math.exp(-0.4 * dt));
    }

    const smooth = this.isIdle ? 1.5 : 10;
    const k = 1 - Math.exp(-smooth * dt);
    this.yaw += (this.target.yaw - this.yaw) * k;
    this.pitch += (this.target.pitch - this.pitch) * k;
    this.distance += (this.target.distance - this.distance) * k;

    this._desiredFocus.copy(this.player.position);
    // showOff：舉魚炫耀時鏡頭往上抬、拉遠，讓頭上的魚完整入鏡
    this._show = (this._show ?? 0) + ((this.showOff ? 1 : 0) - (this._show ?? 0)) * (1 - Math.exp(-4 * dt));
    this._desiredFocus.y += 1.0 + this._show * 0.55;
    this.focus.lerp(this._desiredFocus, 1 - Math.exp(-8 * dt));

    // 仰望星空：相機壓低、拉近到角色身後，視線往天空抬
    const pitch = THREE.MathUtils.lerp(this.pitch, 0.06, L);
    const cp = Math.cos(pitch);
    this._dir.set(Math.sin(this.yaw) * cp, Math.sin(pitch), Math.cos(this.yaw) * cp);

    // 遮擋檢測：從角色往相機打射線，碰到樹就把相機拉近（快速拉近、緩慢退回）
    let allowed = this.distance;
    if (this.occluders.length) {
      this.raycaster.set(this.focus, this._dir);
      this.raycaster.far = this.distance;
      const hit = this.raycaster.intersectObjects(this.occluders, false)[0];
      if (hit) allowed = Math.max(1.2, hit.distance - 0.4);
    }
    const ease = allowed < this.blockedDistance ? 20 : 3;
    this.blockedDistance += (allowed - this.blockedDistance) * (1 - Math.exp(-ease * dt));
    if (!Number.isFinite(this.blockedDistance)) this.blockedDistance = allowed;
    const baseDist = THREE.MathUtils.lerp(this.distance, 3.2, L);
    const dist = Math.min(THREE.MathUtils.lerp(baseDist, Math.max(baseDist, 4.6), this._show), this.blockedDistance);

    this.camera.position.set(
      this.focus.x + this._dir.x * dist,
      Math.max(0.35, this.focus.y + this._dir.y * dist),
      this.focus.z + this._dir.z * dist,
    );
    this._lookAt.set(-Math.sin(this.yaw) * 8 * L, 5 * L, -Math.cos(this.yaw) * 8 * L).add(this.focus);
    this.camera.lookAt(this._lookAt);

    if (this._shake > 0.001) {
      const a = this._shake;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      this.camera.position.z += (Math.random() - 0.5) * a;
      this._shake *= Math.exp(-9 * dt);
    }
  }
}
