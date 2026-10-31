import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeSign, lowpoly, shadowAll } from './shared.js';
import { ORNAMENTS, ORNAMENT_BY_ID } from '../game/ornaments.js';
import { t } from '../i18n/i18n.js';

/**
 * 心願大樹：營火附近一棵大樹，大家用松果換裝飾掛上去。
 * 所有分流共用同一棵；裝飾越多，樹越亮、越熱鬧。
 */
export const TREE_SLOTS = 140; // 與伺服器相同

const polar = (angle, r) => ({ x: Math.sin(angle) * r, z: Math.cos(angle) * r });
const POS = polar(0.5, 8.4);
const NEAR = 3.0;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 樹冠：幾團圓圓的低多邊形葉子 */
const LOBES = [
  { x: 0, y: 3.3, z: 0, r: 2.0 },
  { x: -1.2, y: 2.7, z: 0.4, r: 1.35 },
  { x: 1.25, y: 2.8, z: -0.2, r: 1.4 },
  { x: 0.3, y: 2.6, z: 1.2, r: 1.3 },
  { x: -0.2, y: 2.75, z: -1.2, r: 1.3 },
  { x: 0.1, y: 4.6, z: 0.1, r: 1.25 },
];

/** 每個掛裝飾的位置（固定的，所以每個人看到的位置都一樣） */
function makeSlots() {
  const r = rng(20261031);
  const slots = [];
  const total = LOBES.reduce((s, l) => s + l.r * l.r, 0);
  while (slots.length < TREE_SLOTS) {
    // 依葉團大小挑一團
    let k = r() * total;
    const lobe = LOBES.find((l) => (k -= l.r * l.r) <= 0) ?? LOBES[0];
    const a = r() * Math.PI * 2;
    const y = -0.75 + r() * 1.2; // 多掛在下半部和側面，比較看得到
    const h = Math.sqrt(1 - y * y);
    const p = new THREE.Vector3(lobe.x + Math.cos(a) * h * lobe.r * 0.98, lobe.y + y * lobe.r * 0.9, lobe.z + Math.sin(a) * h * lobe.r * 0.98);
    // 不要掛在別的葉團裡面
    const inside = LOBES.some((l) => l !== lobe && p.distanceTo(new THREE.Vector3(l.x, l.y, l.z)) < l.r * 0.92);
    if (inside || p.y < 1.4) continue;
    slots.push(p);
  }
  return slots;
}

const GEO = {
  sphere: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  oct: new THREE.OctahedronGeometry(1, 0),
  moon: new THREE.TorusGeometry(0.7, 0.28, 6, 14, Math.PI * 1.25),
};

/**
 * 一種裝飾的模型：把幾個小零件合併成一個幾何（含頂點顏色），
 * 這樣整棵樹每種裝飾只要畫一次（InstancedMesh），手機也跑得動。
 */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
export function buildOrnamentGeometry(id) {
  const def = ORNAMENT_BY_ID[id];
  const parts = [];
  const add = (geo, sx, sy, sz, x = 0, y = 0, z = 0, rz = 0, color = def.color) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(0, 0, rz)), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(_m);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    parts.push(g);
  };
  switch (id) {
    case 'ribbon':
      add(GEO.cone, 0.06, 0.11, 0.06, -0.06, 0, 0, Math.PI / 2);
      add(GEO.cone, 0.06, 0.11, 0.06, 0.06, 0, 0, -Math.PI / 2);
      add(GEO.sphere, 0.035, 0.035, 0.035);
      add(GEO.cone, 0.025, 0.12, 0.02, -0.03, -0.09, 0, 0.3);
      add(GEO.cone, 0.025, 0.12, 0.02, 0.03, -0.09, 0, -0.3);
      break;
    case 'heart':
      add(GEO.sphere, 0.055, 0.055, 0.045, -0.04, 0.02);
      add(GEO.sphere, 0.055, 0.055, 0.045, 0.04, 0.02);
      add(GEO.cone, 0.085, 0.11, 0.045, 0, -0.06, 0, Math.PI);
      break;
    case 'lantern':
      add(GEO.cyl, 0.07, 0.13, 0.07);
      add(GEO.cyl, 0.045, 0.025, 0.045, 0, 0.075, 0, 0, 0x3a2214);
      add(GEO.cyl, 0.045, 0.025, 0.045, 0, -0.075, 0, 0, 0x3a2214);
      break;
    case 'fish':
      add(GEO.sphere, 0.1, 0.05, 0.04);
      add(GEO.cone, 0.05, 0.07, 0.02, -0.12, 0, 0, Math.PI / 2);
      break;
    case 'star':
      add(GEO.oct, 0.1, 0.1, 0.035);
      add(GEO.oct, 0.1, 0.1, 0.035, 0, 0, 0, Math.PI / 4);
      break;
    case 'bell':
      add(GEO.cone, 0.07, 0.12, 0.07);
      add(GEO.sphere, 0.022, 0.022, 0.022, 0, -0.07, 0, 0, 0x9ab8d0);
      add(GEO.cyl, 0.004, 0.12, 0.002, 0, -0.14, 0, 0, 0xffffff);
      break;
    case 'moon':
      add(GEO.moon, 0.13, 0.13, 0.13, 0, 0, 0, 0.6);
      break;
    case 'firefly':
      add(GEO.sphere, 0.06, 0.06, 0.06);
      break;
  }
  add(GEO.cyl, 0.004, 0.14, 0.004, 0, 0.13, 0, 0, 0xf2e6cc); // 掛繩
  return mergeGeometries(parts);
}

export function buildWishTree(world) {
  const group = new THREE.Group();
  group.position.set(POS.x, 0, POS.z);

  // ---- 樹幹與樹枝 ----
  const bark = lowpoly(0x5b3a24);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 3.2, 9), bark);
  trunk.position.y = 1.6;
  group.add(trunk);
  for (const [rz, ry, len] of [[0.9, 0, 1.4], [-0.85, 0.6, 1.3], [0.8, 2.2, 1.2], [-0.8, -2.4, 1.2]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, len, 6), bark);
    b.position.set(0, 2.5, 0);
    b.rotation.set(0, ry, rz);
    b.translateY(len / 2);
    group.add(b);
  }
  // 樹根
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 5), bark);
    root.position.set(Math.cos(a) * 0.45, 0.15, Math.sin(a) * 0.45);
    root.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    group.add(root);
  }

  // ---- 樹冠 ----
  const leafColors = [0x3f7a4b, 0x468553, 0x3a7046, 0x4c8c58, 0x417c4d, 0x52935e];
  LOBES.forEach((l, i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(l.r, 1), lowpoly(leafColors[i % leafColors.length]));
    m.position.set(l.x, l.y, l.z);
    m.rotation.set(i, i * 2, 0);
    group.add(m);
  });

  // 樹下的小石圈與草地
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.35, 20), new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 1 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  group.add(ring);

  shadowAll(group);

  // 裝飾越多、發光的越多，樹越亮
  const glowLight = new THREE.PointLight(0xffc98a, 0, 9, 1.6);
  glowLight.position.set(0, 3.0, 0);
  group.add(glowLight);

  const sign = makeSign(t('🌳 心願大樹'), { height: 0.26 });
  sign.position.set(0, 6.1, 0);
  group.add(sign);

  world.colliders.push({ x: POS.x, z: POS.z, r: 0.75 });

  const slots = makeSlots();
  // 每種裝飾一個 InstancedMesh（發光的用不受光照的材質，晚上看起來會亮）
  const kinds = {};
  for (const o of ORNAMENTS) {
    const material = o.glow
      ? new THREE.MeshBasicMaterial({ vertexColors: true })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true });
    const mesh = new THREE.InstancedMesh(buildOrnamentGeometry(o.id), material, TREE_SLOTS);
    mesh.count = 0;
    mesh.frustumCulled = false;
    group.add(mesh);
    kinds[o.id] = { mesh, list: [] };
  }
  /** slot → 掛在那裡的裝飾 */
  const hung = new Map();
  let items = [];
  const dummy = new THREE.Object3D();

  function place(item, pop = false) {
    if (!kinds[item.o] || !slots[item.slot]) return;
    const old = hung.get(item.slot);
    if (old) kinds[old.item.o].list = kinds[old.item.o].list.filter((h) => h !== old);
    const h = { item, p: slots[item.slot], phase: item.slot * 1.7, pop: pop ? 0 : 1 };
    hung.set(item.slot, h);
    kinds[item.o].list.push(h);
  }

  function refreshGlow() {
    let glow = 0;
    for (const h of hung.values()) if (ORNAMENT_BY_ID[h.item.o]?.glow) glow++;
    glowLight.intensity = 0.6 + Math.min(3.2, glow * 0.12);
  }

  return {
    group,
    pos: POS,

    setAll(list) {
      hung.clear();
      for (const k of Object.values(kinds)) k.list = [];
      items = (list ?? []).slice();
      for (const it of items) place(it);
      refreshGlow();
    },

    /** 有人掛上新裝飾（從天上輕輕落下、彈一下） */
    add(item) {
      items = items.filter((x) => x.slot !== item.slot);
      items.push(item);
      place(item, true);
      refreshGlow();
    },

    get items() {
      return items;
    },

    near(pos) {
      return Math.hypot(pos.x - POS.x, pos.z - POS.z) < NEAR;
    },

    update(dt, time) {
      // 每個裝飾輕輕晃；剛掛上的彈一下
      for (const k of Object.values(kinds)) {
        k.list.forEach((h, i) => {
          if (h.pop < 1) h.pop = Math.min(1, h.pop + dt * 1.6);
          const s = h.pop < 0.7 ? (h.pop / 0.7) * 1.5 : 1.5 - ((h.pop - 0.7) / 0.3) * 0.5;
          dummy.position.set(h.p.x, h.p.y - 0.14, h.p.z);
          dummy.rotation.set(0, Math.atan2(h.p.x, h.p.z), Math.sin(time * 1.3 + h.phase) * 0.12);
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          k.mesh.setMatrixAt(i, dummy.matrix);
        });
        k.mesh.count = k.list.length;
        k.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/** 給新手指引用：大樹的位置 */
export const WISH_TREE_POS = POS;
export const WISH_TREE_CLEARING = { ...POS, r: 3.4 };
