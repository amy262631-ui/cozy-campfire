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
    this.nuzzleT = 0; // 蹭蹭臉頰：飛到臉旁邊靠一下
    this.sneezeT = 0; // 打噴嚏：身體一縮一彈
    this.nameT = 0; // 名字顯示幾秒（點它的時候）
    this.near = false; // 靠近時顯示名字
    this.name = '';
    this.tag = null;
  }
  /** 小精靈的名字（作者 11/11：靠近或點它才顯示；沒取名不顯示） */
  setName(nm) {
    nm = String(nm ?? '').slice(0, 8);
    if (nm === this.name) return;
    this.name = nm;
    if (this.tag) {
      this.scene.remove(this.tag);
      this.tag.material.map.dispose();
      this.tag.material.dispose();
      this.tag = null;
    }
    if (!nm) return;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.font = '700 30px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    const w = Math.min(244, g.measureText(nm).width + 28);
    g.fillStyle = 'rgba(30, 24, 40, 0.62)';
    g.beginPath();
    g.roundRect((256 - w) / 2, 10, w, 44, 22);
    g.fill();
    g.fillStyle = '#fff6dc';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(nm, 128, 33, 232);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    this.tag.scale.set(0.8, 0.2, 1);
    this.tag.renderOrder = 7;
    this.scene.add(this.tag);
  }
  /** 🤲 摸摸（作者 11/11：每次隨機一種反應）：shy 害羞、spin 開心轉圈、nuzzle 蹭蹭臉頰、sneeze 打小噴嚏。回傳選到的那種 */
  pet(kind) {
    kind ??= ['shy', 'spin', 'nuzzle', 'sneeze'][Math.floor(Math.random() * 4)];
    this.nameT = 3;
    if (kind === 'shy') {
      this.react('shy', 1.6);
      setTimeout(() => this.react('love', 2, { hop: true }), 1600);
    } else if (kind === 'spin') this.react('happy', 2, { hop: true, spin: true });
    else if (kind === 'nuzzle') {
      this.nuzzleT = 1.8;
      this.react('love', 2.4);
    } else {
      this.react('sleepy', 0.5);
      setTimeout(() => {
        this.sneezeT = 0.6;
        this.react('wow', 1.2, { hop: true });
      }, 500);
    }
    return kind;
  }
  /** 螢幕上的位置（點它用） */
  screenPos(camera, w, h) {
    if (!this.obj) return null;
    const v = this.obj.position.clone().project(camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  }
  setCode(code) {
    code = String(code ?? '');
    if (code === this.code) return;
    this.code = code;
    if (this.obj) this.scene.remove(this.obj);
    this.obj = null;
    const p = parseSpirit(code);
    if (!p) return;
    this.obj = buildSpirit(p.type, p.stage, this.face, undefined, p.acc);
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
    if (!this.obj) {
      if (this.tag) this.tag.visible = false;
      return;
    }
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
    let ty = (host.y ?? 0) + UP * s * low;
    let nx = tx;
    let nz = tz;
    if (this.hideAt) {
      // 🙈 躲貓貓：飛去躲在那裡，低低的
      nx = this.hideAt.x;
      nz = this.hideAt.z;
      ty = (this.hideAt.y ?? 0) + 0.45 * s;
    } else if (this.nuzzleT > 0) {
      // 蹭蹭：飛到臉頰旁邊（頭的右邊一點、往前一點）
      this.nuzzleT -= dt;
      const r = host.ry - Math.PI / 2;
      nx = host.x + (Math.sin(r) * 0.3 + Math.sin(host.ry) * 0.15) * s;
      nz = host.z + (Math.cos(r) * 0.3 + Math.cos(host.ry) * 0.15) * s;
      ty = (host.y ?? 0) + (host.state === 'sit' ? 0.75 : 1.0) * s + Math.sin(this.nuzzleT * 12) * 0.02;
    }
    if (!this.placed) {
      this.pos.set(tx, ty, tz);
      this.placed = true;
    }
    const k = 1 - Math.exp(-(this.nuzzleT > 0 ? 6 : moving ? 3.2 : 2) * dt);
    this.pos.x += (nx - this.pos.x) * k;
    this.pos.y += (ty - this.pos.y) * k;
    this.pos.z += (nz - this.pos.z) * k;
    // 離太遠（傳送、換房間）就直接跟上（躲貓貓時不算）
    if (!this.hideAt && Math.hypot(tx - this.pos.x, tz - this.pos.z) > 12) this.pos.set(tx, ty, tz);
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
    if (this.sneezeT > 0) {
      // 哈啾：先縮一下再彈開
      this.sneezeT = Math.max(0, this.sneezeT - dt);
      const q = 1 - this.sneezeT / 0.6;
      const sq = q < 0.3 ? 1 - q * 1.2 : 1 + Math.sin((q - 0.3) * Math.PI * 3) * 0.18 * (1 - q);
      this.obj.scale.y *= sq;
      this.obj.scale.x *= 2 - sq;
    }
    // 名字：靠近或剛被點時淡淡出現
    if (this.tag) {
      if (this.nameT > 0) this.nameT -= dt;
      const want = this.nameT > 0 || this.near ? 1 : 0;
      const m = this.tag.material;
      m.opacity += (want - m.opacity) * Math.min(1, dt * 6);
      this.tag.visible = m.opacity > 0.02;
      this.tag.position.set(this.obj.position.x, this.obj.position.y + 0.26 * s, this.obj.position.z);
    }
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
    this.setName('');
    if (this.obj) this.scene.remove(this.obj);
    this.obj = null;
    this.code = '';
  }
}
