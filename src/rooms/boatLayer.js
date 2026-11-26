/**
 * ⛵ 湖上的船（作者 11/19，11/27 開）：畫船、算座位、自己划船時的碰撞
 *   伺服器 'boats' 給完整名單、'boatPos' 給船主送來的位置；自己是船主時船跟著自己走
 */
import * as THREE from 'three';
import { buildCanoe, buildRowboat, buildSwanBoat } from './boatModels.js';
import { BOATS, keepOnLake, seatAt, centerFromSeat } from '../game/boats.js';
import { mergeStatic } from '../scene/mergeStatic.js';

const BUILD = { canoe: buildCanoe, row: buildRowboat, swan: buildSwanBoat };

export function createBoatLayer(group, waterY) {
  /** id → { d 伺服器資料, mesh, x, z, ry（畫面上平滑後的） } */
  const boats = new Map();
  let selfId = null;

  const add = (d) => {
    const k = BOATS[d.k] ?? BOATS.row;
    const mesh = mergeStatic((BUILD[d.k] ?? buildRowboat)(), (o) => !!o.userData.canopyPart); // ⚡ 船的小零件合成幾塊（天鵝船原本 60 多塊）；頂棚另外一塊（會變透明）
    mesh.scale.setScalar(k.scale);
    mesh.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    group.add(mesh);
    // 🦢 頂棚：每艘船自己一份材質，才能各自變透明
    const canopy = [];
    mesh.traverse((o) => {
      if (!o.userData.canopyPart) return;
      o.material = o.material.clone();
      o.material.opacity = 0.6;
      o.material.depthWrite = false;
      canopy.push(o);
    });
    const b = { d, mesh, x: d.x, z: d.z, ry: d.ry, bob: Math.random() * 6, canopy };
    boats.set(d.id, b);
    return b;
  };
  const remove = (id) => {
    const b = boats.get(id);
    if (!b) return;
    group.remove(b.mesh);
    b.mesh.traverse((o) => o.geometry?.dispose?.());
    boats.delete(id);
  };
  const boatY = (b, t) => waterY - 0.12 + Math.sin(t * 1.6 + b.bob) * 0.025;

  let showFn = null;
  return {
    /** fn(riders)：這艘船上有沒有人正在舉魚 */
    setShowFn(fn) {
      showFn = fn;
    },
    setSelf(id) {
      selfId = id;
    },
    /** 伺服器的完整名單 */
    set(list = []) {
      const keep = new Set(list.map((d) => d.id));
      for (const id of [...boats.keys()]) if (!keep.has(id)) remove(id);
      for (const d of list) {
        const b = boats.get(d.id) ?? add(d);
        b.d = d;
        if (d.o !== selfId) [b.tx, b.tz, b.tr] = [d.x, d.z, d.ry];
      }
    },
    /** 船主送來的位置 */
    move(id, x, z, ry) {
      const b = boats.get(id);
      if (b && b.d.o !== selfId) [b.tx, b.tz, b.tr] = [x, z, ry];
    },
    clear() {
      for (const id of [...boats.keys()]) remove(id);
    },
    get(id) {
      return boats.get(id)?.d ?? null;
    },
    /** 我在哪艘船、第幾個座位 */
    mine() {
      if (!selfId) return null;
      for (const b of boats.values()) {
        const i = b.d.r.indexOf(selfId);
        if (i >= 0) return { id: b.d.id, d: b.d, seat: i, owner: b.d.o === selfId };
      }
      return null;
    },
    /** 某個人在船上的話，他該坐的位置（給別人的角色用）：{ x, y, z, ry } */
    seatOf(sid, t = performance.now() / 1000) {
      for (const b of boats.values()) {
        const i = b.d.r.indexOf(sid);
        if (i < 0) continue;
        const s = seatAt({ k: b.d.k, x: b.x, z: b.z, ry: b.ry }, i);
        return { x: s.x, y: boatY(b, t) + 0.12 + (BOATS[b.d.k]?.y ?? 0.1), z: s.z, ry: b.ry };
      }
      return null;
    },
    /** 自己是船主：用自己的位置（座位 0）反推船的中心，碰到湖邊、碼頭、別的船就推開 */
    steer(pos, ry) {
      const m = this.mine();
      if (!m?.owner) return null;
      const b = boats.get(m.id);
      const k = BOATS[b.d.k];
      const c = centerFromSeat(b.d.k, pos.x, pos.z, ry, 0);
      keepOnLake(c, k.r * 0.6);
      for (const o of boats.values()) {
        if (o === b) continue;
        const rr = (BOATS[o.d.k]?.r ?? 1) * 0.75 + k.r * 0.75;
        const dx = c.x - o.x;
        const dz = c.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d < rr && d > 1e-4) {
          c.x = o.x + (dx / d) * rr;
          c.z = o.z + (dz / d) * rr;
        }
      }
      keepOnLake(c, k.r * 0.6);
      [b.x, b.z, b.ry] = [c.x, c.z, ry];
      const s = seatAt({ k: b.d.k, x: b.x, z: b.z, ry: b.ry }, 0);
      pos.x = s.x;
      pos.z = s.z;
      return b;
    },
    /** 附近有空位、可以上去的船（自己不在船上時） */
    boardable(pos) {
      let best = null;
      let bd = 3.2;
      for (const b of boats.values()) {
        if (!b.d.r.includes(null) || b.d.r.includes(selfId)) continue;
        const d = Math.hypot(pos.x - b.x, pos.z - b.z);
        if (d < bd) [best, bd] = [b.d, d];
      }
      return best;
    },
    /** 船的中心（給鏡頭、雲鯨用） */
    center(id) {
      const b = boats.get(id);
      return b ? { x: b.x, z: b.z, ry: b.ry } : null;
    },
    update(dt, t) {
      const k = 1 - Math.exp(-8 * dt);
      for (const b of boats.values()) {
        if (b.d.o !== selfId && b.tx != null) {
          b.x += (b.tx - b.x) * k;
          b.z += (b.tz - b.z) * k;
          let dr = b.tr - b.ry;
          dr = Math.atan2(Math.sin(dr), Math.cos(dr));
          b.ry += dr * k;
        }
        // 🦢 船上有人舉魚炫耀：頂棚變淡（作者 11/27：大白鯊這種大魚舉起來會穿出頂棚）
        if (b.canopy.length) {
          const want = showFn?.(b.d.r ?? []) ? 0.15 : 0.6; // 平常半透明（作者 11/27），有人舉魚更淡
          for (const o of b.canopy) {
            o.material.opacity += (want - o.material.opacity) * k;
            o.material.depthWrite = false;
          }
        }
        b.mesh.position.set(b.x, boatY(b, t), b.z);
        b.mesh.rotation.y = b.ry;
        b.mesh.rotation.z = Math.sin(t * 1.3 + b.bob) * 0.02;
      }
    },
    seatY(id, t = performance.now() / 1000) {
      const b = boats.get(id);
      return b ? boatY(b, t) + 0.12 + (BOATS[b.d.k]?.y ?? 0.1) : 0;
    },
    get list() {
      return [...boats.values()].map((b) => b.d);
    },
  };
}

