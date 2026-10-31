import * as THREE from 'three';
import { FISH, rollFish, rollSize, packFish } from './fishData.js';
import { createFishMesh, fishScale } from './fishModel.js';
import { haptic } from '../fx/haptics.js';
import { t } from '../i18n/i18n.js';

/**
 * 釣魚小遊戲流程：
 *
 *   cast（坐下、甩竿）→ wait（浮標漂、偶爾試探性抖一下）
 *     → bite（浮標沉下去、頭上「！」、手機震動、畫面搖晃，限時拉竿）
 *         ├ 沒拉到 → 魚跑掉了 → wait
 *         └ 拉到了 → reel（連點拉竿，魚會掙扎讓進度倒退，限時）
 *               ├ 時間到 → 線斷了 → wait
 *               └ 成功 → caught（魚飛到手上）→ show（舉魚炫耀）→ 自動再甩竿
 *
 * 由湖畔房間每幀呼叫 update()；F 鍵／手機按鈕／畫面上的大按鈕都會呼叫 press()。
 */
export class FishingGame {
  constructor({ group, waterY, hud, ui, audio, cameraRig, onCatch }) {
    Object.assign(this, { group, waterY, hud, ui, audio, cameraRig, onCatch });
    this.phase = 'idle';
    this.t = 0;
    this.fish = null; // { index, size }
    this.actions = null;

    // 浮標
    this.bobber = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe8503c, emissive: 0x501008, roughness: 0.5 }),
    );
    const bottom = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.5 }),
    );
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), new THREE.MeshStandardMaterial({ color: 0xe8503c }));
    stem.position.y = 0.09;
    this.bobber.add(top, bottom, stem);
    this.bobber.visible = false;
    group.add(this.bobber);

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

  /** 拉竿與炫耀時不能被搖桿誤觸取消 */
  get lockMove() {
    return this.phase === 'reel' || this.phase === 'caught' || this.phase === 'show';
  }

  /**
   * 開始釣魚
   * @param {{ x, z, dir: [number, number] }} spot 坐的位置與面向水面的方向
   */
  start(actions, spot) {
    this.actions = actions;
    this.spot = spot;
    this.#go('cast');
  }

  stop() {
    this.#go('idle');
    this.bobber.visible = this.line.visible = this.bang.visible = false;
    this.ui.showAlert(false);
    this.ui.showReel(false);
    this.#clearFlying();
    const c = this.actions?.character;
    c?.setProp?.('fish', false);
    c?.setProp?.('rod', this.actions?.state === 'fish');
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
      case 'cast':
      case 'caught':
      case 'show':
        return true;
      default:
        return false; // 等待中按 F＝收竿
    }
  }

  #go(phase) {
    this.phase = phase;
    this.t = 0;
    if (phase === 'cast') {
      this.fish = null;
      const [dx, dz] = this.spot.dir;
      const dist = 2.6 + Math.random() * 1.3;
      const side = (Math.random() - 0.5) * 1.2;
      this.target.set(this.spot.x + dx * dist + dz * side, this.waterY, this.spot.z + dz * dist + dx * side);
      this.castStarted = false;
    }
    if (phase === 'wait') {
      this.biteAt = 3.5 + Math.random() * 7;
      this.nibbles = [Math.random() * this.biteAt * 0.8, Math.random() * this.biteAt * 0.9].sort();
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
    const index = rollFish();
    this.fish = { index, size: rollSize(index) };
    this.window = FISH[index].window;
    this.#go('bite');
    this.bang.visible = true;
    this.ui.showAlert(true, 1);
    this.#ring(this.target.x, this.target.z, true);
    haptic([70, 40, 70, 40, 140]);
    this.#shake(0.09);
    this.audio?.sfx?.('bite');
  }

  #hook() {
    this.bang.visible = false;
    this.ui.showAlert(false);
    const f = FISH[this.fish.index];
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
    if (this.phase === 'idle') return;

    this.t += dt;
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
        // 試探性的小抖動
        let dip = 0;
        for (const n of this.nibbles) {
          const d = this.t - n;
          if (d > 0 && d < 0.35) {
            dip = Math.sin(d * 30) * 0.025;
            if (d < dt * 1.5) this.#ring(this.target.x, this.target.z);
          }
        }
        this.bobber.position.set(this.target.x, this.waterY + 0.02 + Math.sin(time * 2.1) * 0.012 - Math.abs(dip), this.target.z);
        if (this.t > this.biteAt) this.#bite();
        break;
      }
      case 'bite': {
        const ratio = 1 - this.t / this.window;
        this.bobber.position.set(
          this.target.x + Math.sin(time * 40) * 0.03,
          this.waterY - 0.05 - Math.abs(Math.sin(time * 16)) * 0.06,
          this.target.z,
        );
        this.ui.showAlert(true, ratio);
        if (ratio <= 0) this.#escape(FISH[this.fish.index].rarity >= 4 ? t('差一點！大魚溜走了⋯ 🐟💨') : t('太慢了，魚跑掉了⋯ 🐟💨'));
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
        pos.y = this.waterY - 0.03 + Math.sin(time * 30) * 0.02;
        this.bobber.position.copy(pos);
        if (Math.random() < dt * 3) {
          this.#ring(pos.x, pos.z);
          this.#shake(0.015);
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
          this.onCatch?.(this.fish.index, this.fish.size);
          const f = FISH[this.fish.index];
          this.audio?.sfx?.(f.junk ? 'junk' : f.rarity >= 4 ? 'legend' : 'catch');
          this.#shake(f.rarity >= 4 ? 0.12 : 0.04);
        }
        break;
      }
      case 'show': {
        if (this.t > 3.6) {
          c?.setProp?.('fish', false);
          c?.setProp?.('rod', true);
          this.#go('cast'); // 自動再甩一竿
        }
        break;
      }
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
          THREE.MathUtils.lerp(this.tip.y, b.y + 0.06, u) - Math.sin(u * Math.PI) * sag,
          THREE.MathUtils.lerp(this.tip.z, b.z, u),
        );
      }
      pos.needsUpdate = true;
    }
  }
}
