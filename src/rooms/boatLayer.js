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
    mesh.rotation.order = 'YXZ'; // 先轉船頭方向，再前後、左右晃（碰撞搖晃用）
    // wob：碰撞搖晃（只有畫面，不動位置）；edge：上一張有沒有貼著湖邊／碼頭
    // 🚣 別人的比賽船：半透明（大家擠在一起出發時看得到自己的船）
    if (d.race && d.o !== selfId)
      mesh.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.5;
        o.material.depthWrite = false;
      });
    const b = { d, mesh, x: d.x, z: d.z, ry: d.ry, bob: Math.random() * 6, canopy, wob: null, edge: false, px: d.x, pz: d.z, spd: 0 };
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
  // 💥 作者 11/27「碰船能有點物理震動但不影響位移」：撞到別的船、湖邊、碼頭 → 船身晃一晃、往下沉一點點再浮起來
  //   每個人的畫面自己算（大家看到的都會晃），位置完全不變
  const WOB_T = 1.1; // 晃幾秒
  const wobY = (b) => {
    const w = b.wob;
    if (!w) return 0;
    return -0.05 * w.a * Math.exp(-4 * w.t) * Math.sin(Math.min(1, w.t * 6) * Math.PI);
  };
  const boatY = (b, t) => waterY - 0.12 + Math.sin(t * 1.6 + b.bob) * 0.025 + wobY(b);
  /** 撞到：nx, nz＝從撞的東西指向這艘船的方向（船往反方向晃） */
  const bump = (b, nx, nz, a) => {
    if (b.wob && b.wob.t < 0.35) return; // 剛撞過，不要一直重來
    const n = Math.hypot(nx, nz) || 1;
    nx /= n;
    nz /= n;
    // 撞的方向換成船自己的座標：前後（pitch）、左右（roll）
    const c = Math.cos(b.ry);
    const s = Math.sin(b.ry);
    const fwd = nx * s + nz * c; // 船頭方向（ry＝0 朝 +z）
    const side = nx * c - nz * s;
    b.wob = { t: 0, a: Math.min(1, a), px: -fwd, pz: side };
    onBump?.(b.d);
  };
  let onBump = null;
  const pairTouch = new Set();

  let showFn = null;
  return {
    /** fn(riders)：這艘船上有沒有人正在舉魚 */
    setShowFn(fn) {
      showFn = fn;
    },
    /** fn(d)：哪艘船被撞了（main.js：自己的船就震一下鏡頭、出聲音） */
    setBumpFn(fn) {
      onBump = fn;
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
      return !!b; // false＝這艘船我這邊沒有（名單漏收）
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
        if (o === b || b.d.race || o.d.race) continue; // 🚣 比賽船互相穿過、也不撞租的船
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
        // 速度（畫面上的，用來決定撞得多大力）
        const v = dt > 0 ? Math.hypot(b.x - b.px, b.z - b.pz) / dt : 0;
        b.spd += (v - b.spd) * k;
        b.px = b.x;
        b.pz = b.z;
        // 貼到湖邊、碼頭：用比較大一點的半徑試推，被推動＝碰到了
        const kk = BOATS[b.d.k] ?? BOATS.row;
        const c = { x: b.x, z: b.z };
        keepOnLake(c, kk.r * 0.6 + 0.04);
        const edge = Math.abs(c.x - b.x) + Math.abs(c.z - b.z) > 0.002;
        if (edge && !b.edge && b.spd > 0.4) bump(b, c.x - b.x, c.z - b.z, b.spd / 2.5);
        b.edge = edge;
      }
      // 船跟船：剛碰到的那一下兩艘都晃
      const list = [...boats.values()];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const o = list[j];
          if (a.d.race || o.d.race) continue; // 🚣 比賽船不晃
          const rr = (BOATS[a.d.k]?.r ?? 1) * 0.75 + (BOATS[o.d.k]?.r ?? 1) * 0.75 + 0.06;
          const dx = a.x - o.x;
          const dz = a.z - o.z;
          const d = Math.hypot(dx, dz);
          const key = a.d.id < o.d.id ? `${a.d.id}|${o.d.id}` : `${o.d.id}|${a.d.id}`;
          const touch = d < rr;
          if (touch && !pairTouch.has(key) && d > 1e-4) {
            const f = Math.max(0.35, (a.spd + o.spd) / 2.5);
            bump(a, dx / d, dz / d, f);
            bump(o, -dx / d, -dz / d, f);
          }
          if (touch) pairTouch.add(key);
          else if (d > rr + 0.15) pairTouch.delete(key);
        }
      }
      for (const b of boats.values()) {
        let px = 0;
        let pz = 0;
        if (b.wob) {
          const w = b.wob;
          w.t += dt;
          const e = Math.exp(-3.2 * w.t) * Math.sin(w.t * 13) * 0.09 * w.a; // 搖幾下、越來越小
          px = w.px * e;
          pz = w.pz * e;
          if (w.t > WOB_T) b.wob = null;
        }
        b.mesh.position.set(b.x, boatY(b, t), b.z);
        b.mesh.rotation.y = b.ry;
        b.mesh.rotation.x = px;
        b.mesh.rotation.z = Math.sin(t * 1.3 + b.bob) * 0.02 + pz;
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

