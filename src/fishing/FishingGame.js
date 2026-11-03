import * as THREE from 'three';
import { FISH, rollFish, rollSize, packFish } from './fishData.js';
import { createFishMesh, fishScale } from './fishModel.js';
import { haptic } from '../fx/haptics.js';
import { t } from '../i18n/i18n.js';
import { compactScreen } from '../ui/HUD.js';

/**
 * 釣魚小遊戲流程：
 *
 *   cast（坐下、甩竿）→ wait（夜釣浮標立在水上，偶爾試探性點一下；這時拉竿會嚇跑魚）
 *     → bite（浮標整個沉下去，沒有「！」提示，要自己看準時機拉竿；一沉就拉魚會大一點）
 *         ├ 沒拉到 → 魚跑掉了 → wait
 *         └ 拉到了 → reel（連點拉竿，魚會掙扎讓進度倒退，限時）
 *               ├ 時間到 → 線斷了 → wait
 *               └ 成功 → caught（魚飛到手上）→ show（舉魚炫耀）→ 自動再甩竿
 *
 * 由湖畔房間每幀呼叫 update()；F 鍵／手機按鈕／畫面上的大按鈕都會呼叫 press()。
 */
const FLOAT_SCALE = 1.7;
const FLOAT_SINK = 0.18 * FLOAT_SCALE; // 浮標基準點在水面下多深（露出 3～4 段）
const BITE_SINK = 0.24 * FLOAT_SCALE; // 咬鉤時再往下沉多少（色段全部沒入）

export class FishingGame {
  /**
   * onKeep(index, size)：舉著魚的時候起身走開 → 不收起來，繼續舉著到處炫耀（main.js 接手）
   */
  constructor({ group, waterY, hud, ui, audio, cameraRig, onCatch, onKeep }) {
    Object.assign(this, { group, waterY, hud, ui, audio, cameraRig, onCatch, onKeep });
    this.phase = 'idle';
    this.t = 0;
    this.fish = null; // { index, size }
    this.actions = null;

    // 夜釣浮標：細長的身子分成紅、黃、綠幾段，頂端一顆會發光的燈
    // 浮標的「基準點」在水面下 FLOAT_SINK 公尺，水面上露出幾段色段；咬鉤時往下沉，色段一段段沒入水中
    this.bobber = new THREE.Group();
    // 顏色分得清楚：純紅、純黃、純綠，中間夾一條黑線
    const segColors = [0xff2020, 0xffe020, 0x20ff40, 0xff2020, 0xffe020, 0x20ff40];
    const sepMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
    segColors.forEach((c, i) => {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.056, 8), new THREE.MeshBasicMaterial({ color: c }));
      seg.position.y = 0.035 + i * 0.065;
      this.bobber.add(seg);
      const sep = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.009, 8), sepMat);
      sep.position.y = 0.035 + i * 0.065 + 0.0325;
      this.bobber.add(sep);
    });
    const tipY = 0.035 + segColors.length * 0.065;
    const tipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xeaff9a }));
    tipMesh.position.y = tipY;
    this.bobber.add(tipMesh);
    // 光暈（一直面向鏡頭）
    const gc = document.createElement('canvas');
    gc.width = gc.height = 64;
    const gg = gc.getContext('2d');
    const grad = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(230,255,150,0.95)');
    grad.addColorStop(0.35, 'rgba(160,255,90,0.35)');
    grad.addColorStop(1, 'rgba(120,255,60,0)');
    gg.fillStyle = grad;
    gg.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(gc);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.halo.scale.set(0.22, 0.22, 1); // 光暈小一點，浮標才不會糊成一團
    this.halo.position.y = tipY;
    this.bobber.add(this.halo);
    // 不加點光源：浮標每次出現／消失都會讓手機重新編譯整個場景的著色器（卡一下），光暈和倒影就夠亮了
    this.bobber.scale.setScalar(FLOAT_SCALE); // 放大，晚上看得清楚
    this.bobber.visible = false;
    group.add(this.bobber);
    // 水面上的倒影光（平貼在水面）
    this.reflect = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.9),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
    );
    this.reflect.rotation.x = -Math.PI / 2;
    this.reflect.visible = false;
    group.add(this.reflect);

    // 水花：大魚掙扎、拉上岸時噴出來的小水滴
    const dropGeo = new THREE.SphereGeometry(0.025, 6, 4);
    this.drops = Array.from({ length: 60 }, () => {
      const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: 0xe6f2ff, transparent: true, opacity: 0.9, depthWrite: false }));
      m.visible = false;
      group.add(m);
      return { m, v: new THREE.Vector3(), life: 0 };
    });

    // 漣漪（兩圈）
    this.rings = [0, 1].map(() => {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.13, 28),
        new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }),
      );
      r.rotation.x = -Math.PI / 2;
      group.add(r);
      return { mesh: r, t: 1, x: 0, z: 0, big: false };
    });

    // 釣線
    const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3()));
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf0ece2, transparent: true, opacity: 0.75 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    group.add(this.line);

    // 頭上的「！」
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff6e0';
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e8503c';
    g.lineWidth = 8;
    g.stroke();
    g.fillStyle = '#e8503c';
    g.font = 'bold 84px "Noto Sans TC", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t('！'), 66, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    this.bang.visible = false;
    this.bang.renderOrder = 20;
    group.add(this.bang);

    this.from = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.tip = new THREE.Vector3();
    this.head = new THREE.Vector3();
    this.flying = null; // 飛到手上的魚
  }

  get active() {
    return this.phase !== 'idle';
  }

  /** 給網路與其他玩家看的狀態 */
  get netAction() {
    if (this.phase === 'reel') return 'reel';
    if (this.phase === 'show' || this.phase === 'caught') return 'showFish';
    return null;
  }

  get netExtra() {
    return this.fish && this.netAction === 'showFish' ? packFish(this.fish.index, this.fish.size) : 0;
  }

  /** 咬鉤、拉竿、炫耀中（這時不顯示「收竿」提示） */
  get busy() {
    return ['bite', 'reel', 'caught', 'show'].includes(this.phase);
  }

  /** 角色姿勢 */
  get pose() {
    if (this.phase === 'reel') return 'reel';
    if (this.phase === 'show') return 'showOff';
    return null;
  }

  /** 拉竿時不能被搖桿誤觸取消（舉魚時可以走開：會舉著魚到處走） */
  get lockMove() {
    return this.phase === 'reel' || this.phase === 'caught';
  }

  /** 舉著魚：剛舉起來那幾秒鏡頭拉遠拍魚，之後回到平常的鏡頭 */
  get showingOff() {
    return this.phase === 'show' && this.t < 4;
  }

  /**
   * 開始釣魚
   * @param {{ x, z, dir: [number, number] }} spot 坐的位置與面向水面的方向
   */
  start(actions, spot) {
    this.actions = actions;
    this.spot = spot;
    if (spot.group && spot.group !== this.group) this.#attach(spot.group, spot.waterY ?? this.waterY);
    else if (spot.waterY != null) this.waterY = spot.waterY;
    // 鏡頭繞到背後、壓低，看得清楚水面上的浮標
    const rig = this.cameraRig;
    if (rig && !this.savedCam) {
      this.savedCam = { yaw: rig.target.yaw, pitch: rig.target.pitch, distance: rig.target.distance };
      // 從斜後方看（越過肩膀），浮標才不會被自己的身體擋住
      rig.target.yaw = Math.atan2(-spot.dir[0], -spot.dir[1]) + 0.32;
      rig.target.pitch = 0.42;
      rig.target.distance = 3.9;
    }
    this.ui.showTools?.(true); // 「📖 魚類圖鑑」「🏆 排行」按鈕（營火河畔也看得到）
    // 專注計時：這次坐下來釣了多久、釣到幾條
    this.session = { at: performance.now(), n: 0 };
    this.#focusTick();
    clearInterval(this.focusTimer);
    this.focusTimer = setInterval(() => this.#focusTick(), 1000);
    this.#go('cast');
  }

  /** 換到另一個水域（湖畔／營火旁的河畔） */
  #attach(group, waterY) {
    for (const o of [this.bobber, this.reflect, this.line, this.bang, ...this.rings.map((r) => r.mesh), ...this.drops.map((d) => d.m)]) group.add(o);
    this.group = group;
    this.waterY = waterY;
  }

  #focusTick() {
    if (!this.focusEl) {
      this.focusEl = document.createElement('div');
      this.focusEl.className = 'fish-focus';
      document.getElementById('ui')?.appendChild(this.focusEl);
    }
    if (!this.session) {
      this.focusEl.hidden = true;
      return;
    }
    const sec = Math.floor((performance.now() - this.session.at) / 1000);
    this.focusEl.hidden = false;
    this.focusEl.textContent = compactScreen()
      ? `🎣 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}・${t('{n} 條', { n: this.session.n })}`
      : t('🎣 靜靜釣了 {m} 分 {s} 秒・{n} 條', { m: Math.floor(sec / 60), s: sec % 60, n: this.session.n });
  }

  stop() {
    // 舉著魚起身：魚不收，交給 main.js 繼續舉著到處走
    const keep = this.phase === 'show' && this.fish ? { ...this.fish } : null;
    this.#go('idle');
    this.bobber.visible = this.line.visible = this.bang.visible = this.reflect.visible = false;
    clearInterval(this.focusTimer);
    if (this.spot?.place === 'pond') this.ui.showTools?.(false);
    this.session = null;
    this.#focusTick();
    if (this.savedCam && this.cameraRig) {
      Object.assign(this.cameraRig.target, this.savedCam);
      this.savedCam = null;
    }
    if (this.cameraRig) this.cameraRig.focusTarget = null;
    this.ui.showAlert(false);
    this.ui.showReel(false);
    this.#clearFlying();
    const c = this.actions?.character;
    c?.setProp?.('fish', false);
    c?.setProp?.('rod', this.actions?.state === 'fish');
    if (keep) this.onKeep?.(keep.index, keep.size);
  }

  /** 舉魚中按 F／🎣：把魚收進魚簍，繼續甩下一竿 */
  #continue() {
    const c = this.actions?.character;
    c?.setProp?.('fish', false);
    c?.setProp?.('rod', true);
    this.#go('cast');
  }

  /** F 鍵／按鈕。回傳 true 表示被釣魚吃掉了（不要當成「收竿」） */
  press() {
    switch (this.phase) {
      case 'bite':
        this.#hook();
        return true;
      case 'reel':
        this.#reelTap();
        return true;
      case 'show':
        this.#continue();
        return true;
      case 'cast':
      case 'caught':
      case 'scared':
        return true;
      case 'wait':
        this.#early(); // 浮標還沒沉就拉：魚被嚇跑
        return true;
      default:
        return false;
    }
  }

  #go(phase) {
    this.phase = phase;
    this.t = 0;
    if (phase === 'cast') {
      this.fish = null;
      const [dx, dz] = this.spot.dir;
      const [r0, r1] = this.spot.reach ?? [2.6, 3.9];
      const dist = r0 + Math.random() * (r1 - r0);
      const side = (Math.random() - 0.5) * (this.spot.side ?? 1.2);
      this.target.set(this.spot.x + dx * dist + dz * side, this.waterY - FLOAT_SINK, this.spot.z + dz * dist + dx * side);
      this.castStarted = false;
    }
    if (phase === 'wait') {
      this.biteAt = 4 + Math.random() * 9;
      // 試探：浮標輕輕點一下（1～3 次），這時拉竿會把魚嚇跑
      const n = 1 + Math.floor(Math.random() * 3);
      this.nibbles = Array.from({ length: n }, () => 1 + Math.random() * (this.biteAt - 1.6)).sort((a, b) => a - b);
    }
  }

  /** 噴水花：n 顆水滴，power 越大噴越高越遠 */
  #splash(x, z, n, power = 1) {
    let k = 0;
    for (const d of this.drops) {
      if (k >= n) break;
      if (d.life > 0) continue;
      k++;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 1.4) * power;
      d.v.set(Math.cos(a) * sp, (2 + Math.random() * 2.5) * power, Math.sin(a) * sp);
      d.m.position.set(x, this.waterY + 0.05, z);
      d.m.scale.setScalar(0.7 + Math.random() * 0.9);
      d.life = 1;
      d.m.visible = true;
    }
  }

  #ring(x, z, big = false) {
    const r = this.rings.find((q) => q.t >= 1) ?? this.rings[0];
    Object.assign(r, { t: 0, x, z, big });
  }

  #shake(a) {
    this.cameraRig?.shake?.(a);
  }

  #bite() {
    const index = rollFish({ place: this.spot?.place, ...(this.context?.() ?? {}) });
    this.fish = { index, size: rollSize(index) };
    this.window = FISH[index].window * 1.35; // 不再跳「！」，只能看浮標沉下去，所以時間放寬一點
    this.#go('bite');
    this.#ring(this.target.x, this.target.z, true);
    haptic(35); // 輕輕一下就好，主要靠眼睛看浮標
    this.audio?.sfx?.('plop');
  }

  #hook() {
    this.bang.visible = false;
    this.ui.showAlert(false);
    const f = FISH[this.fish.index];
    // 浮標一沉就拉（前 45% 的時間）：漂亮的時機，魚會大一點
    if (this.t < this.window * 0.45 && !f.junk) {
      this.fish.size = Math.min(f.max, Math.round(this.fish.size * 1.15) + 1);
      this.hud.toast(t('🎯 時機抓得漂亮！'), 1600);
    }
    this.need = f.pull;
    this.fight = f.fight;
    this.limit = 8 + f.pull * 0.25;
    this.progress = 0.12;
    this.pulled = false;
    this.#go('reel');
    this.ui.showReel(true);
    this.ui.setReel(this.progress, 1, false);
    haptic(40);
    this.#shake(0.05);
    this.audio?.sfx?.('hook');
  }

  #reelTap() {
    this.progress += 1 / this.need;
    this.pulled = true;
    haptic(12);
    this.#shake(0.025);
    this.audio?.sfx?.('tap');
    if (this.progress >= 1) this.#landed();
  }

  /** 太早拉竿：魚被嚇跑，等一下重新甩竿 */
  #early() {
    this.earlyCount = (this.earlyCount ?? 0) + 1;
    this.hud.toast(this.earlyCount <= 3 ? t('太早拉了，魚被嚇跑 🐟💨 等浮標整個沉下去再拉') : t('太早拉了，魚被嚇跑 🐟💨'), 2600);
    this.audio?.sfx?.('escape');
    this.#ring(this.target.x, this.target.z, true);
    this.#go('scared');
  }

  #escape(msg) {
    this.bang.visible = false;
    this.ui.showAlert(false);
    this.ui.showReel(false);
    this.hud.toast(msg);
    this.audio?.sfx?.('escape');
    this.#go('wait');
  }

  #landed() {
    this.ui.showReel(false);
    this.#go('caught');
    // 魚從浮標的位置跳出水面，飛到手上
    const mesh = createFishMesh(this.fish.index);
    mesh.scale.setScalar(fishScale(this.fish.size));
    mesh.position.copy(this.bobber.position);
    this.group.add(mesh);
    this.flying = { mesh, from: this.bobber.position.clone() };
    this.bobber.visible = this.line.visible = false;
    this.#ring(this.bobber.position.x, this.bobber.position.z, true);
    const fl = FISH[this.fish.index];
    if (!fl.junk) this.#splash(this.bobber.position.x, this.bobber.position.z, 12 + fl.rarity * 8, 0.8 + fl.rarity * 0.2); // 拉出水面的大水花
    this.audio?.sfx?.('splash');
    haptic([30, 40, 30, 40, 60]);
  }

  #clearFlying() {
    if (this.flying) {
      this.group.remove(this.flying.mesh);
      this.flying = null;
    }
  }

  update(dt, time) {
    // 漣漪動畫
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / (r.big ? 1.3 : 1.8));
      r.mesh.position.set(r.x, this.waterY + 0.012, r.z);
      r.mesh.scale.setScalar(1 + r.t * (r.big ? 9 : 5));
      r.mesh.material.opacity = (1 - r.t) * (r.big ? 0.7 : 0.45);
    }
    // 水滴：拋物線落回水面
    for (const d of this.drops) {
      if (d.life <= 0) continue;
      d.v.y -= 9.8 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.life -= dt * 0.9;
      d.m.material.opacity = Math.min(0.9, d.life * 1.5);
      if (d.m.position.y < this.waterY || d.life <= 0) {
        d.life = 0;
        d.m.visible = false;
      }
    }
    if (this.phase === 'idle') return;

    this.t += dt;
    // 主視角變成浮標：等魚的時候鏡頭焦點拉到浮標附近，拉竿、炫耀時回到人身上
    if (this.cameraRig && this.session) {
      const watch = ['wait', 'bite', 'scared'].includes(this.phase) || (this.phase === 'cast' && this.castStarted);
      this.focusPt ??= new THREE.Vector3();
      this.cameraRig.focusTarget = this.focusPt.copy(this.target).setY(this.waterY - 0.4);
      this.cameraRig.focusMix = watch ? 0.7 : this.phase === 'reel' ? 0.45 : 0;
    }
    const c = this.actions?.character;
    if (c?.rod) c.rod.tip.getWorldPosition(this.tip);

    switch (this.phase) {
      case 'cast': {
        // 先坐好 0.5 秒，再花 0.9 秒把浮標拋出去
        if (this.t < 0.5) break;
        if (!this.castStarted) {
          this.castStarted = true;
          this.from.copy(this.tip);
          this.bobber.visible = this.line.visible = true;
          this.audio?.sfx?.('cast');
        }
        const u = Math.min((this.t - 0.5) / 0.9, 1);
        this.bobber.position.lerpVectors(this.from, this.target, u);
        this.bobber.position.y += Math.sin(u * Math.PI) * 1.3;
        if (u >= 1) {
          this.#ring(this.target.x, this.target.z);
          this.audio?.sfx?.('plop');
          this.#go('wait');
        }
        break;
      }
      case 'wait': {
        // 試探：浮標輕輕往下點一小下（大概半段）
        let dip = 0;
        for (const n of this.nibbles) {
          const d = this.t - n;
          if (d > 0 && d < 0.45) {
            dip = Math.sin((d / 0.45) * Math.PI) * 0.035 * FLOAT_SCALE;
            if (d < dt * 1.5) this.#ring(this.target.x, this.target.z);
          }
        }
        this.bobber.position.set(this.target.x, this.waterY - FLOAT_SINK + Math.sin(time * 1.7) * 0.006 - dip, this.target.z);
        if (this.t > this.biteAt) this.#bite();
        break;
      }
      case 'bite': {
        // 真的咬鉤：浮標一口氣往下沉，色段一段段沒入水裡，然後在水下微微抖
        const ratio = 1 - this.t / this.window;
        const sink = Math.min(1, this.t / 0.25) * BITE_SINK;
        this.bobber.position.set(
          this.target.x + Math.sin(time * 26) * 0.006,
          this.waterY - FLOAT_SINK - sink - Math.abs(Math.sin(time * 9)) * 0.02,
          this.target.z,
        );
        if (ratio <= 0) this.#escape(FISH[this.fish.index].rarity >= 4 ? t('差一點！大魚溜走了⋯ 🐟💨') : t('太慢了，魚跑掉了⋯ 🐟💨'));
        break;
      }
      case 'scared': {
        // 被嚇跑：浮標晃一晃，一秒後收線重甩
        this.bobber.position.set(this.target.x, this.waterY - FLOAT_SINK + Math.sin(this.t * 20) * 0.03 * (1 - this.t), this.target.z);
        if (this.t > 1.1) this.#go('cast');
        break;
      }
      case 'reel': {
        this.progress -= this.fight * dt * (0.6 + Math.random() * 0.8); // 魚在掙扎
        this.progress = Math.max(0, this.progress);
        const timeRatio = 1 - this.t / this.limit;
        this.ui.setReel(this.progress, timeRatio, this.pulled);
        // 浮標隨進度被拉近，偶爾被魚扯一下
        const near = new THREE.Vector3(this.spot.x + this.spot.dir[0] * 1.0, this.waterY, this.spot.z + this.spot.dir[1] * 1.0);
        const pos = this.target.clone().lerp(near, this.progress);
        pos.x += Math.sin(time * 23) * 0.08;
        pos.z += Math.cos(time * 17) * 0.06;
        pos.y = this.waterY - FLOAT_SINK - 0.1 + Math.sin(time * 30) * 0.02;
        this.bobber.position.copy(pos);
        if (Math.random() < dt * 3) {
          this.#ring(pos.x, pos.z);
          this.#shake(0.015);
        }
        // 大魚掙扎：一直濺起水花（越稀有、越大條越激烈）
        const fr = FISH[this.fish.index];
        const big = fr.rarity >= 3 || this.fish.size >= fr.max * 0.8;
        if (!fr.junk && Math.random() < dt * (big ? 6 + fr.rarity * 2 : 2)) {
          this.#splash(pos.x, pos.z, big ? 6 + fr.rarity * 2 : 3, big ? 0.7 + fr.rarity * 0.15 : 0.5);
          if (big) this.#ring(pos.x, pos.z, true);
        }
        if (timeRatio <= 0) this.#escape(t('線斷了⋯ 魚逃回湖裡了 🌊'));
        break;
      }
      case 'caught': {
        // 魚跳出水面，劃一道弧線到頭上
        c?.getHeadWorldPosition?.(this.head);
        const u = Math.min(this.t / 0.8, 1);
        const m = this.flying?.mesh;
        if (m) {
          m.position.lerpVectors(this.flying.from, this.head.clone().setY(this.head.y + 0.6), u);
          m.position.y += Math.sin(u * Math.PI) * 1.4;
          m.rotation.z = u * Math.PI * 4;
        }
        if (u >= 1) {
          this.#clearFlying();
          c?.setHeldFish?.(this.fish.index, this.fish.size);
          c?.setProp?.('rod', false);
          c?.setProp?.('fish', true);
          this.#go('show');
          if (this.session) this.session.n += 1;
          this.onCatch?.(this.fish.index, this.fish.size);
          const f = FISH[this.fish.index];
          this.audio?.sfx?.(f.junk ? 'junk' : f.rarity >= 4 ? 'legend' : 'catch');
          this.#shake(f.rarity >= 4 ? 0.12 : 0.04);
        }
        break;
      }
      case 'show':
        // 一直舉著炫耀，等玩家按「繼續釣魚」（或直接走開，舉著魚到處走）
        break;
    }

    // 倒影光貼在水面、跟著浮標；浮標沉下去時變暗
    this.reflect.visible = this.bobber.visible && this.phase !== 'cast';
    if (this.reflect.visible) {
      const depth = (this.waterY - FLOAT_SINK - this.bobber.position.y) / FLOAT_SCALE; // 往下沉了多少
      const [dx, dz] = this.spot?.dir ?? [0, -1];
      this.reflect.position.set(this.bobber.position.x - dx * 0.45, this.waterY + 0.004, this.bobber.position.z - dz * 0.45);
      this.reflect.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz)); // 倒影朝向釣魚的人
      this.reflect.material.opacity = Math.max(0.08, 0.55 - depth * 2);
      this.halo.material.opacity = Math.max(0.25, 1 - depth * 2.5);
    }

    // 「！」跟著頭
    if (this.bang.visible) {
      c?.getHeadWorldPosition?.(this.head);
      this.bang.position.set(this.head.x, this.head.y + 0.75 + Math.sin(time * 12) * 0.04, this.head.z);
      const s = 0.42 + Math.abs(Math.sin(time * 10)) * 0.06;
      this.bang.scale.set(s, s, 1);
    }

    // 釣線：從竿尖垂下一點弧度到浮標
    if (this.line.visible) {
      const pos = this.line.geometry.attributes.position;
      const b = this.bobber.position;
      const sag = this.phase === 'reel' || this.phase === 'bite' ? 0.02 : 0.25;
      for (let i = 0; i < 12; i++) {
        const u = i / 11;
        pos.setXYZ(
          i,
          THREE.MathUtils.lerp(this.tip.x, b.x, u),
          THREE.MathUtils.lerp(this.tip.y, b.y + 0.42 * FLOAT_SCALE, u) - Math.sin(u * Math.PI) * sag,
          THREE.MathUtils.lerp(this.tip.z, b.z, u),
        );
      }
      pos.needsUpdate = true;
    }
  }
}
