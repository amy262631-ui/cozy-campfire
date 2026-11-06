import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { STONE_FLAG } from '../rooms/cairns.js';
import { ProceduralFox } from '../player/characters/ProceduralFox.js';
import { lerpAngle } from '../player/Player.js';
import { unpackFish } from '../fishing/fishData.js';
import { outfitOfCode } from '../game/outfits.js';

/** 線上同步的造型代號 [頭, 背, 脖子] → { head, back, neck } */
export const wearOfCodes = (ot) => {
  const w = {};
  for (const n of Array.isArray(ot) ? ot : []) {
    const o = outfitOfCode(n);
    if (o) w[o.slot] = o.id;
  }
  return w;
};

const POS_SMOOTH = 10; // 位置插值係數（越大越貼近最新位置，越小越平滑）
const ROT_SMOOTH = 10;
const SNAP_DIST = 4; // 一次跳太遠（例如重連）就直接瞬移

/** 遠端玩家的動作狀態 → 角色姿勢 */
const POSE_OF = {
  addWood: 'throw', roast: 'roast', eat: 'eat', blanket: 'blanket', stargaze: 'lookUp', fish: 'roast', reel: 'reel', showFish: 'showOff',
  wave: 'wave', salute: 'salute', bye: 'bye', pray: 'pray', // 表情動作
  pick: 'pick', catch: 'catch', plant: 'plant', water: 'water', // 採摘、揮網、種菜、澆水
  sofa: 'sit', sleep: 'sleep', // 🛋️ 坐沙發、躺床
};

function makeNameTag(name, npc = false) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 34px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(name).width) + 40;
  c.width = w;
  c.height = 56;
  g.font = font;
  g.fillStyle = npc ? 'rgba(40, 70, 45, 0.7)' : 'rgba(15, 18, 30, 0.55)';
  g.beginPath();
  g.roundRect(0, 4, w, 48, 24);
  g.fill();
  g.fillStyle = npc ? '#d8f5c8' : '#fff3e0';
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

/** 營地居民的名字（伺服器傳中文，這裡換成玩家選的語言） */
const NPC_NAMES = {
  撿柴的小橡: t('撿柴的小橡'),
  釣魚的阿樂: t('釣魚的阿樂'),
  愛睡的布丁: t('愛睡的布丁'),
  樹屋的咪咪: t('樹屋的咪咪'),
  看星星的露露: t('看星星的露露'),
  守林人阿松: t('守林人阿松'),
};
const npcName = (name) => {
  const raw = String(name).replace(/^🏕️\s*/, '');
  return `🏕️ ${NPC_NAMES[raw] ?? raw}`;
};

class RemotePlayer {
  constructor({ id, name, fur, sp = 0, tl = '', er = '', rw = 0, ot = null, pb = 0, s, npc = false }) {
    this.id = id;
    this.npc = npc; // 營地居民（電腦角色）
    this.name = name;
    this.character = new ProceduralFox({ fur, species: sp, tail: tl, ears: er });
    this.character.setOutfit(wearOfCodes(ot)); // 造型（帽子、背包、圍巾）
    this.character.setAccessory(rw); // 贊助者的小花
    this.group = new THREE.Group();
    this.group.add(this.character.root);

    // 🔥 營火月票的支持者：名字前面一個小營火
    this.tag = makeNameTag(npc ? npcName(name) : pb ? `🔥 ${name}` : name, npc);
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
    // 舉著魚：坐著炫耀（showFish），或舉著魚到處走（走路、站著時也帶著魚的代碼）
    const holdsFish = !!t.e && t.e !== STONE_FLAG;
    if (holdsFish) {
      const { index, size } = unpackFish(t.e);
      c.setHeldFish?.(index, size);
    }
    c.setProp('fish', holdsFish);
    c.setProp('stone', t.a !== 'showFish' && t.e === STONE_FLAG); // 頭上頂著石頭
    c.setProp('log', t.a === 'addWood' && this.stateTime < 0.95);
    if (t.a === 'roast') c.stick.setDoneness(t.d);
    if (t.a === 'eat' && this._eatD !== t.d) {
      this._eatD = t.d;
      c.setEat?.(t.d); // 🍡 依熟度的吃東西反應
    }
    if (t.a !== 'eat') this._eatD = null;
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
    // 🏡 小木屋的樓梯、二樓：用目前房間的高度規則算（伺服器只傳平面位置）
    if (heightFn) {
      this._y = heightFn(this.pos.x, this.pos.z, this._y ?? 0);
      this.group.position.y = this._y + (this.target?.a === 'sleep' ? 0.26 : this.target?.a === 'sofa' ? 0.2 : 0);
    } else this._y = 0;
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
/** 目前房間的地面高度（小木屋才有）；null＝平地 */
let heightFn = null;
export const setRemoteHeight = (fn) => {
  heightFn = fn;
};
/** 角色大小（帳篷裡縮小一點，家具比例才對） */
let charScale = 1;
export const setCharScale = (s, remotes) => {
  charScale = s;
  for (const p of remotes?.players?.values?.() ?? []) p.group.scale.setScalar(s);
};

export class RemotePlayers {
  constructor(scene, zzz) {
    this.scene = scene;
    this.zzz = zzz;
    /** @type {Map<string, RemotePlayer>} */
    this.players = new Map();
  }

  /** 真人玩家數（不含營地居民） */
  get count() {
    let n = 0;
    for (const p of this.players.values()) if (!p.npc) n++;
    return n;
  }

  isNpc(id) {
    return !!this.players.get(id)?.npc;
  }

  add(info) {
    if (this.players.has(info.id)) this.remove(info.id);
    const p = new RemotePlayer(info);
    p.group.scale.setScalar(charScale);
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

  /** 別人換了造型 */
  setOutfit(id, ot) {
    this.players.get(id)?.character.setOutfit(wearOfCodes(ot));
  }

  update(dt, elapsed) {
    for (const p of this.players.values()) p.update(dt, elapsed, this.zzz);
  }

  /** 讓本地玩家不會跟其他小動物重疊（輕微推開） */
  /** 某個位置附近有沒有其他玩家（營火圓木有沒有人坐） */
  anyNear(x, z, r) {
    for (const p of this.players.values()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r) return true;
    return false;
  }

  pushOut(pos, radius) {
    for (const p of this.players.values()) {
      if (p.npc) continue; // 營地居民會自己讓路，不推人
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
