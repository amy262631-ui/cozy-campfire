import * as THREE from 'three';
import { makeSign, lowpoly, shadowAll } from './shared.js';
import { t } from '../i18n/i18n.js';

/**
 * 石塔祈願（像韓國寺廟步道旁的돌탑）：
 * 在祈福處的步道旁，有一堆小石頭和六座石塔。
 * 撿一顆石頭頂在頭上，走到石塔旁放上去、許個願。
 * 石頭是所有分流共用、永久保存的，每顆都記得是誰放的。
 */

/** 每座石塔最多幾顆（伺服器也用同一個數字） */
export const CAIRN_MAX = 99;
/** 網路上「頭上頂著石頭」的記號（放在狀態陣列的 extra 欄位） */
export const STONE_FLAG = 99999;

const polar = (angle, r) => ({ x: Math.sin(angle) * r, z: Math.cos(angle) * r });

/** 石塔與石頭堆的位置：在祈福處和交流帳篷之間、步道旁 */
const SPOTS = [
  polar(-0.42, 11.0),
  polar(-0.58, 11.3),
  polar(-0.74, 11.2),
  polar(-0.9, 11.0),
  polar(-0.5, 9.1),
  polar(-0.82, 9.1),
];
const PILE = polar(-0.66, 7.6);
const GARDEN = { ...polar(-0.66, 9.8), r: 3.8 };
const NEAR_CAIRN = 1.35;
const NEAR_PILE = 1.5;

/** 可重現亂數：同一顆石頭在每個人的畫面上長得一樣 */
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const STONE_COLORS = [0x8f8a80, 0x9c968b, 0x7d786f, 0xa8a196, 0x8a8174, 0x6f6b66, 0xb3ab9d, 0x948a7b];

/** 一顆石頭的大小、位置、顏色（越上面越小） */
function stoneShape(index, seed) {
  const r = rng(seed + index * 7);
  const taper = 1 - (index / CAIRN_MAX) * 0.55;
  const w = (0.22 + r() * 0.08) * taper;
  const h = w * (0.42 + r() * 0.18);
  return {
    w,
    d: w * (0.8 + r() * 0.25),
    h,
    jx: (r() - 0.5) * 0.05,
    jz: (r() - 0.5) * 0.05,
    rotY: r() * Math.PI * 2,
    tilt: (r() - 0.5) * 0.12,
    color: STONE_COLORS[Math.floor(r() * STONE_COLORS.length)],
  };
}

/** 頭上頂的那顆石頭（角色的道具） */
export function createCarriedStone() {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), lowpoly(0x9a9387));
  m.scale.set(0.18, 0.09, 0.16);
  m.castShadow = true;
  return m;
}

export function buildCairnGarden(world) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.95 });
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // ---- 地面：苔蘚小空地＋踏腳石 ----
  const moss = new THREE.Mesh(new THREE.CircleGeometry(GARDEN.r, 24), new THREE.MeshStandardMaterial({ color: 0x2f4a2b, roughness: 1 }));
  moss.rotation.x = -Math.PI / 2;
  moss.position.set(GARDEN.x, 0.012, GARDEN.z);
  moss.receiveShadow = true;
  group.add(moss);

  // ---- 石頭堆（撿石頭的地方） ----
  const pileRand = rng(42);
  for (let i = 0; i < 26; i++) {
    const a = pileRand() * Math.PI * 2;
    const rr = Math.sqrt(pileRand()) * 0.55;
    const s = 0.07 + pileRand() * 0.07;
    const m = new THREE.Mesh(geo, lowpoly(STONE_COLORS[i % STONE_COLORS.length]));
    m.scale.set(s, s * 0.6, s * 0.9);
    m.position.set(PILE.x + Math.cos(a) * rr, s * 0.5 + (0.55 - rr) * 0.25, PILE.z + Math.sin(a) * rr);
    m.rotation.set(pileRand(), pileRand() * 6, pileRand());
    group.add(m);
  }
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.62, 0.12, 12, 1, true), lowpoly(0x7a5a3a, { side: THREE.DoubleSide }));
  basket.position.set(PILE.x, 0.06, PILE.z);
  group.add(basket);

  const sign = makeSign(t('🪨 石塔祈願'), { height: 0.24 });
  sign.position.set(PILE.x, 1.35, PILE.z);
  group.add(sign);

  // ---- 石塔 ----
  const cairns = SPOTS.map((spot, i) => {
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    // 底座：一顆大扁石
    const base = new THREE.Mesh(geo, lowpoly(0x77736b));
    base.scale.set(0.42, 0.12, 0.38);
    base.position.y = 0.08;
    base.rotation.y = i;
    g.add(base);
    const mesh = new THREE.InstancedMesh(geo, mat, CAIRN_MAX);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    g.add(mesh);
    group.add(g);
    world.colliders.push({ x: spot.x, z: spot.z, r: 0.45 });
    // 疊滿之後：塔頂一顆發光的小星星
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    crown.visible = false;
    g.add(crown);
    const halo = new THREE.PointLight(0xffc870, 0, 5, 1.6);
    g.add(halo);
    return { group: g, mesh, stones: [], heights: [], drop: null, spot, crown, halo, done: false };
  });

  /** 把第 k 顆石頭放到正確位置（落下動畫 lift ＞ 0） */
  function place(c, k, lift = 0) {
    const s = c.stones[k];
    const sh = stoneShape(k, s.s);
    const y = 0.18 + (c.heights[k] ?? 0) + sh.h / 2 + lift;
    dummy.position.set(sh.jx, y, sh.jz);
    dummy.rotation.set(sh.tilt, sh.rotY, sh.tilt * 0.6);
    dummy.scale.set(sh.w, sh.h, sh.d);
    dummy.updateMatrix();
    c.mesh.setMatrixAt(k, dummy.matrix);
    c.mesh.setColorAt(k, color.setHex(sh.color));
  }

  /** 重新排整座石塔（加入或換房間回來時） */
  function rebuild(c) {
    let y = 0;
    c.heights = [];
    c.stones.forEach((s, k) => {
      c.heights[k] = y;
      y += stoneShape(k, s.s).h * 0.86; // 稍微嵌在一起
    });
    c.top = y;
    c.mesh.count = c.stones.length;
    c.stones.forEach((_, k) => place(c, k));
    c.mesh.instanceMatrix.needsUpdate = true;
    if (c.mesh.instanceColor) c.mesh.instanceColor.needsUpdate = true;
  }

  const api = {
    group,
    cairns,
    pile: PILE,
    garden: GARDEN,

    /** 全部石塔的資料（伺服器給的）：[[{ n, s, at }]] */
    setAll(list) {
      cairns.forEach((c, i) => {
        c.stones = (list?.[i] ?? []).slice(0, CAIRN_MAX);
        c.drop = null;
        rebuild(c);
      });
    },

    /** 哪幾座已經疊滿（完成，展示中） */
    setDone(flags) {
      cairns.forEach((c, i) => {
        c.done = !!flags?.[i];
        c.crown.visible = c.done;
        c.halo.intensity = c.done ? 1.4 : 0;
      });
    },

    /** 有人放上一顆新石頭：從上面輕輕落下 */
    add(i, stone) {
      const c = cairns[i];
      if (!c || c.stones.length >= CAIRN_MAX) return;
      c.stones.push(stone);
      const k = c.stones.length - 1;
      c.heights[k] = c.top ?? 0;
      c.top = (c.top ?? 0) + stoneShape(k, stone.s).h * 0.86;
      c.mesh.count = c.stones.length;
      c.drop = { k, t: 0 };
      place(c, k, 0.6);
      c.mesh.instanceMatrix.needsUpdate = true;
      if (c.mesh.instanceColor) c.mesh.instanceColor.needsUpdate = true;
    },

    /** 離哪座石塔最近（在範圍內才算），回傳索引或 -1 */
    nearCairn(pos) {
      let best = -1;
      let bestD = NEAR_CAIRN;
      cairns.forEach((c, i) => {
        const d = Math.hypot(pos.x - c.spot.x, pos.z - c.spot.z) - 0.35;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    },

    /** 最近一座還沒滿的石塔（新手指引用） */
    nearestCairn(pos) {
      let best = 0;
      let bestD = Infinity;
      cairns.forEach((c, i) => {
        if (c.stones.length >= CAIRN_MAX) return;
        const d = Math.hypot(pos.x - c.spot.x, pos.z - c.spot.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    },

    nearPile(pos) {
      return Math.hypot(pos.x - PILE.x, pos.z - PILE.z) < NEAR_PILE;
    },

    /** 某座石塔頂端的世界座標（放石頭時面向那裡） */
    topOf(i) {
      const c = cairns[i];
      return new THREE.Vector3(c.spot.x, 0.18 + (c.top ?? 0), c.spot.z);
    },

    update(dt, time) {
      for (const c of cairns) {
        // 越高的石塔，越會隨風輕輕晃
        const sway = Math.min(1, (c.top ?? 0) / 4) * 0.012;
        c.group.rotation.x = Math.sin(time * 0.9 + c.spot.x) * sway;
        c.group.rotation.z = Math.cos(time * 0.7 + c.spot.z) * sway;
        if (c.done) {
          const y = 0.18 + (c.top ?? 0) + 0.3 + Math.sin(time * 1.6) * 0.06;
          c.crown.position.y = y;
          c.crown.rotation.y = time * 0.8;
          c.halo.position.y = y;
        }
        if (c.drop) {
          c.drop.t += dt;
          const u = Math.min(1, c.drop.t / 0.35);
          place(c, c.drop.k, (1 - u * u) * 0.6);
          c.mesh.instanceMatrix.needsUpdate = true;
          if (u >= 1) c.drop = null;
        }
      }
    },
  };
  shadowAll(group);
  api.setAll([]);
  return api;
}

/** 石塔的紀錄：一起堆過的人、各放了幾顆 */
export function cairnStats(stones, myName) {
  const counts = new Map();
  for (const s of stones) counts.set(s.n, (counts.get(s.n) ?? 0) + 1);
  const people = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return { people, mine: counts.get(myName) ?? 0 };
}

export const CAIRN_GARDEN_CLEARING = GARDEN;
