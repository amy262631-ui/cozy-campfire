import * as THREE from 'three';
import { buildSpirit } from './spirit.js';
import { parseSpirit } from '../game/spiritRules.js';

/**
 * ✨ 跟在玩家肩膀旁邊飄的小精靈（自己的、別人的都用這個）。
 * 走路時慢半拍跟上來；停下來在旁邊慢慢繞；睡覺、晚上打瞌睡；有事情時換表情、跳一下。
 */
const SIDE = 0.8; // 離身體遠一點，不要擋到角色（作者 11/11）
const UP = 1.2;
const SIZE = 0.72; // 小一點點（作者 11/11）
export class SpiritFollower {
  constructor(scene) {
    this.scene = scene;
    this.code = '';
    this.obj = null;
    this.pos = new THREE.Vector3();
    this.placed = false;
    this.face = 'happy';
    this.reactFace = null;
    this.reactT = 0;
    this.hop = 0;
    this.spin = 0;
    this.t = Math.random() * 10;
    this.hungry = false; // 今天還沒餵（只有自己的會用）
    this._hungryT = 20 + Math.random() * 20;
  }
  setCode(code) {
    code = String(code ?? '');
    if (code === this.code) return;
    this.code = code;
    if (this.obj) this.scene.remove(this.obj);
    this.obj = null;
    const p = parseSpirit(code);
    if (!p) return;
    this.obj = buildSpirit(p.type, p.stage, this.face);
    this.size = p.stage === 0 ? 1 : SIZE; // 小光點本來就很小，不用再縮
    this.obj.position.copy(this.pos);
    this.scene.add(this.obj);
  }
  /** 換表情幾秒；hop：跳一下；spin：轉圈（跳舞） */
  react(face, sec = 2.5, { hop = false, spin = false } = {}) {
    this.reactFace = face;
    this.reactT = sec;
    if (hop) this.hop = 1;
    if (spin) this.spin = Math.PI * 2;
  }
  /** 好幾天沒來：從遠遠的地方衝過來 */
  rushFrom(x, z) {
    this.pos.set(x, UP + 1.5, z);
    this.placed = true;
    this.react('love', 4, { hop: true });
  }
  #setFace(f) {
    if (f === this.face) return;
    this.face = f;
    this.obj?.userData.setFace(f);
  }
  /**
   * host：{ x, y, z, ry, scale, state, speed, night, party }
   *   state：'sleep' 睡覺／'sit' 坐著／'move' 走路／'idle'
   */
  update(dt, host) {
    if (!this.obj) return;
    this.t += dt;
    const s = host.scale ?? 1;
    const moving = host.speed > 0.3;
    // 停下來：在肩膀旁邊慢慢繞小圈；走路：固定在肩膀斜後方
    const orbit = moving ? 0 : Math.sin(this.t * 0.35) * 0.9;
    const a = host.ry - Math.PI / 2 + orbit; // 右肩
    const back = moving ? 0.25 : 0;
    const tx = host.x + (Math.sin(a) * SIDE - Math.sin(host.ry) * back) * s;
    const tz = host.z + (Math.cos(a) * SIDE - Math.cos(host.ry) * back) * s;
    const low = host.state === 'sleep' ? 0.55 : host.state === 'sit' ? 0.75 : 1;
    const ty = (host.y ?? 0) + UP * s * low;
    if (!this.placed) {
      this.pos.set(tx, ty, tz);
      this.placed = true;
    }
    const k = 1 - Math.exp(-(moving ? 3.2 : 2) * dt);
    this.pos.x += (tx - this.pos.x) * k;
    this.pos.y += (ty - this.pos.y) * k;
    this.pos.z += (tz - this.pos.z) * k;
    // 離太遠（傳送、換房間）就直接跟上
    if (Math.hypot(tx - this.pos.x, tz - this.pos.z) > 8) this.pos.set(tx, ty, tz);
    // 跳一下、轉圈
    let hopY = 0;
    if (this.hop > 0) {
      this.hop = Math.max(0, this.hop - dt * 1.8);
      hopY = Math.sin((1 - this.hop) * Math.PI) * 0.25 * s;
    }
    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 7);
    this.obj.position.set(this.pos.x, this.pos.y + hopY, this.pos.z);
    this.obj.userData.body.rotation.y = this.spin;
    this.obj.scale.setScalar(s * (this.size ?? SIZE));
    // 營火時間在營火旁：一直開心地跳舞
    if (host.party && !moving && host.state !== 'sleep' && this.reactT <= 0 && this.spin <= 0 && Math.random() < dt * 0.25) this.react('happy', 1.5, { hop: true, spin: true });
    // 表情
    if (this.reactT > 0) this.reactT -= dt;
    let f = 'happy';
    if (this.reactT > 0) f = this.reactFace;
    else if (host.state === 'sleep' || (host.night && !moving)) f = 'sleepy';
    else if (this.hungry) {
      this._hungryT -= dt;
      if (this._hungryT < 0) {
        this.react('hungry', 3);
        this._hungryT = 40 + Math.random() * 30;
      }
    }
    this.#setFace(f);
    this.obj.userData.update(dt, this.t, host.cam);
  }
  dispose() {
    if (this.obj) this.scene.remove(this.obj);
    this.obj = null;
    this.code = '';
  }
}
