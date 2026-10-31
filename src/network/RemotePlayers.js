import * as THREE from 'three';
import { STONE_FLAG } from '../rooms/cairns.js';
import { ProceduralFox } from '../player/characters/ProceduralFox.js';
import { lerpAngle } from '../player/Player.js';
import { unpackFish } from '../fishing/fishData.js';

const POS_SMOOTH = 10; // 位置插值係數（越大越貼近最新位置，越小越平滑）
const ROT_SMOOTH = 10;
const SNAP_DIST = 4; // 一次跳太遠（例如重連）就直接瞬移

/** 遠端玩家的動作狀態 → 角色姿勢 */
const POSE_OF = {
  addWood: 'throw', roast: 'roast', blanket: 'blanket', stargaze: 'lookUp', fish: 'roast', reel: 'reel', showFish: 'showOff',
  wave: 'wave', salute: 'salute', bye: 'bye', pray: 'pray', // 表情動作
};

function makeNameTag(name) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 34px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(name).width) + 40;
  c.width = w;
  c.height = 56;
  g.font = font;
  g.fillStyle = 'rgba(15, 18, 30, 0.55)';
  g.beginPath();
  g.roundRect(0, 4, w, 48, 24);
  g.fill();
  g.fillStyle = '#fff3e0';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, w / 2, 29);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }),
  );
  const h = 0.2;
  sprite.scale.set((h * w) / 56, h, 1);
  sprite.renderOrder = 10;
  return sprite;
}

class RemotePlayer {
  constructor({ id, name, fur, sp = 0, rw = 0, s }) {
    this.id = id;
    this.name = name;
    this.character = new ProceduralFox({ fur, species: sp });
    this.character.setAccessory(rw); // 贊助者的小花
    this.group = new THREE.Group();
    this.group.add(this.character.root);

    this.tag = makeNameTag(name);
    this.tag.position.y = 1.55;
    this.group.add(this.tag);

    this.target = { x: 0, z: 0, ry: 0, a: 'idle', d: 0, e: 0 };
    this.pos = new THREE.Vector3();
    this.ry = 0;
    this.speed = 0;
    this.state = 'idle';
    this.stateTime = 0;
    this._zzzTimer = 0.6;
    this.setState(s, true);
  }

  setState(s, snap = false) {
    if (!Array.isArray(s)) return;
    const [x, z, ry, a, d, e = 0] = s;
    const t = this.target;
    Object.assign(t, { x, z, ry, a, d, e });
    if (snap || Math.hypot(x - this.pos.x, z - this.pos.z) > SNAP_DIST) {
      this.pos.set(x, 0, z);
      this.ry = ry;
    }
  }

  update(dt, elapsed, zzz) {
    const t = this.target;
    const prevX = this.pos.x;
    const prevZ = this.pos.z;
    const k = 1 - Math.exp(-POS_SMOOTH * dt);
    this.pos.x += (t.x - this.pos.x) * k;
    this.pos.z += (t.z - this.pos.z) * k;
    this.ry = lerpAngle(this.ry, t.ry, 1 - Math.exp(-ROT_SMOOTH * dt));

    // 用實際位移估算速度，讓走路動畫的快慢自然
    const v = dt > 0 ? Math.hypot(this.pos.x - prevX, this.pos.z - prevZ) / dt : 0;
    this.speed += (v - this.speed) * (1 - Math.exp(-8 * dt));

    if (t.a !== this.state) {
      this.state = t.a;
      this.stateTime = 0;
    }
    this.stateTime += dt;

    const c = this.character;
    const locomotion = this.speed < 0.3 ? 'idle' : t.a === 'run' ? 'run' : 'walk';
    c.setPose(POSE_OF[t.a] ?? locomotion);
    c.setProp('stick', t.a === 'roast');
    c.setProp('blanket', t.a === 'blanket');
    c.setProp('rod', t.a === 'fish' || t.a === 'reel');
    if (t.a === 'showFish' && t.e) {
      const { index, size } = unpackFish(t.e);
      c.setHeldFish?.(index, size);
    }
    c.setProp('fish', t.a === 'showFish' && !!t.e);
    c.setProp('stone', t.a !== 'showFish' && t.e === STONE_FLAG); // 頭上頂著石頭
    c.setProp('log', t.a === 'addWood' && this.stateTime < 0.95);
    if (t.a === 'roast') c.stick.setDoneness(t.d);
    c.update(dt, elapsed, this.speed);

    if (t.a === 'blanket') {
      this._zzzTimer -= dt;
      if (this._zzzTimer <= 0) {
        this._zzzTimer = 1.1 + Math.random() * 0.4;
        zzz?.spawn(c.getHeadWorldPosition(new THREE.Vector3()));
      }
    } else {
      this._zzzTimer = 0.6;
    }

    // 裹毯時名牌稍微低一點
    this.tag.position.y += ((t.a === 'blanket' ? 1.45 : 1.55) - this.tag.position.y) * k;

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.ry;
  }

  dispose() {
    this.tag.material.map.dispose();
    this.tag.material.dispose();
    this.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
  }
}

/** 管理所有遠端玩家：加入、離開、狀態更新、碰撞資料 */
export class RemotePlayers {
  constructor(scene, zzz) {
    this.scene = scene;
    this.zzz = zzz;
    /** @type {Map<string, RemotePlayer>} */
    this.players = new Map();
  }

  get count() {
    return this.players.size;
  }

  add(info) {
    if (this.players.has(info.id)) this.remove(info.id);
    const p = new RemotePlayer(info);
    this.players.set(info.id, p);
    this.scene.add(p.group);
    return p;
  }

  remove(id) {
    const p = this.players.get(id);
    if (!p) return null;
    this.scene.remove(p.group);
    p.dispose();
    this.players.delete(id);
    return p;
  }

  /** 斷線重連後用伺服器給的完整名單重建 */
  reset(list) {
    for (const id of [...this.players.keys()]) this.remove(id);
    for (const info of list) this.add(info);
  }

  applyStates(batch, selfId) {
    for (const [id, s] of Object.entries(batch)) {
      if (id === selfId) continue;
      this.players.get(id)?.setState(s);
    }
  }

  get(id) {
    return this.players.get(id);
  }

  update(dt, elapsed) {
    for (const p of this.players.values()) p.update(dt, elapsed, this.zzz);
  }

  /** 讓本地玩家不會跟其他小動物重疊（輕微推開） */
  pushOut(pos, radius) {
    for (const p of this.players.values()) {
      const dx = pos.x - p.pos.x;
      const dz = pos.z - p.pos.z;
      const min = radius + 0.3;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.0001 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }
}
