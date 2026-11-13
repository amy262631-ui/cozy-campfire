import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeResolver, makeSign, lowpoly } from './shared.js';
import { FOG_COLOR } from '../scene/World.js';
import { seededRandom, makeRadialTexture } from '../scene/textures.js';
import { buildTentShell, shapeOf, TREEHOUSE_SPOTS } from '../game/tentShapes.js';
import { styleOf, tentTexture } from '../game/tentStyles.js';
import { t } from '../i18n/i18n.js';
import { LAYOUT, CAMP_SIZE, ENTRY_Z, BOUNDS, LOOP_CENTER, plotSpots, frame, zoneName } from './campLayout.js';
import { buildSoil, buildCrop } from './gardenModels.js';
import { slotLocal } from '../game/garden.js';
import { createTrashLayer } from './trashLayer.js';
import { buildYard, yardRadius } from './yardModels.js';
import { buildSign } from './signModels.js';
import { YARD_USES, YARD_BY_ID } from '../game/yardCatalog.js';
const YARD_ICON = Object.fromEntries(Object.entries(YARD_BY_ID).map(([k, v]) => [k, v.icon]));
const YARD_NAME = Object.fromEntries(Object.entries(YARD_BY_ID).map(([k, v]) => [k, v.zh]));

/**
 * 🏕️ 帳篷營地：一條彎彎曲曲的環形小路繞著中央的小營火，
 * 大家的帳篷沿著小路兩側錯落排列，門口旁邊各留一塊小菜園空地（之後種菜用）。
 * 帳篷清單由伺服器給（setTents），最多 32 頂；沒人住的空地插一支小木牌。
 */
const SCALE = 0.55; // 營地裡的帳篷縮小一點，才排得下
// 門口擺設的大小：椅子、吊床、腳踏車這些要能坐，跟角色比例要對（0.8）；露營車、拖車屋太大會擋住帳篷，小一點
const YARD_SCALE_OF = { camper: 0.6, airstream: 0.6, jeep: 0.7 };
const yardScale = (id) => YARD_SCALE_OF[id] ?? 0.8;
// 🪑 門口桌椅那一格的位置（帳篷自己的座標；x 跟著菜園的另一邊）
/**
 * 🚙 門口擺設的位置（帳篷座標：+z＝朝小路，x 依菜園在哪一邊左右相反；11/07 作者確認的配置）
 *   大型：帳篷旁邊（菜園的另一邊）、車頭朝小路
 *   小型 ①②③：門口前院；門口到小路的走道保持空的
 */
const BIG_SPOT = { x: -3.6, z: -0.5 };
const SMALL_SPOTS = [
  { x: -1.45, z: 4.45, ry: 0 },
  { x: -3.3, z: 4.25, ry: 0.2 },
  { x: -2.65, z: 2.6, ry: 0.5 },
];
export const CAMP_PLOTS = CAMP_SIZE;
const PLOTS = LAYOUT.plots;

/** 每種花色共用一組外觀材質 */
const matCache = new Map();
function tentMats(styleId) {
  if (matCache.has(styleId)) return matCache.get(styleId);
  const st = styleOf(styleId);
  const tex = tentTexture(st);
  const m = {
    canvas: new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : st.canvas, map: tex, roughness: 1, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, flatShading: true }),
    accentDouble: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, side: THREE.DoubleSide }),
    wood: lowpoly(0x7a5236),
    trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.DoubleSide }),
    gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, metalness: 0.3 }),
    window: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
  };
  matCache.set(styleId, m);
  return m;
}

/** 帳篷外殼：同材質的零件合併成一塊，32 頂帳篷也不會拖慢手機 */
const shellCache = new Map();
function tentShell(shape, style, frame = 'gold') {
  const key = `${shape}|${style}|${shape === 'stardome' ? frame : ''}`;
  if (!shellCache.has(key)) {
    const shell = buildTentShell(shape, tentMats(style), { outside: true, frame, noSwing: true }); // 🌳 樹屋的鞦韆另外做（會盪）
    shell.updateMatrixWorld(true);
    const byMat = new Map();
    let ok = true;
    shell.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv || !g.attributes.normal) ok = false;
      g.applyMatrix4(o.matrixWorld);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    let parts = null;
    if (ok) {
      try {
        parts = [...byMat].map(([mat, list]) => [mergeGeometries(list), mat]);
        if (parts.some(([g]) => !g)) parts = null;
      } catch {
        parts = null;
      }
    }
    shellCache.set(key, parts ? { parts } : { shell });
  }
  const c = shellCache.get(key);
  if (c.shell) return c.shell.clone();
  const g = new THREE.Group();
  for (const [geo, mat] of c.parts) g.add(new THREE.Mesh(geo, mat));
  return g;
}

const glowTex = () =>
  makeRadialTexture([
    [0, 'rgba(255,214,150,1)'],
    [0.25, 'rgba(255,180,100,0.55)'],
    [1, 'rgba(255,160,80,0)'],
  ]);

/** 一堆同樣形狀的小東西用 InstancedMesh 一次畫 */
function instanced(geo, mat, items, colorOf) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  m.count = items.length;
  const o = new THREE.Object3D();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    o.position.set(it.x, it.y ?? 0, it.z);
    o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    const s = it.s ?? 1;
    o.scale.set(it.sx ?? s, it.sy ?? s, it.sz ?? s);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (colorOf) m.setColorAt(i, col.set(colorOf(it, i)));
  });
  m.instanceMatrix.needsUpdate = true;
  return m;
}

/** 沿著小路中線長出一條帶狀路面（寬度微微起伏） */
function ribbon(pts, width, closed, rand) {
  const pos = [];
  const idx = [];
  const list = closed ? [...pts, pts[0]] : pts;
  list.forEach((p, i) => {
    const w = (width / 2) * (0.85 + 0.3 * Math.sin(i * 0.37) * Math.sin(i * 0.11 + 1)) + rand() * 0.05;
    const nx = -p.tz;
    const nz = p.tx;
    pos.push(p.x + nx * w, 0, p.z + nz * w, p.x - nx * w, 0, p.z - nz * w);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createCampgroundRoom() {
  const group = new THREE.Group();
  group.name = 'campground';
  const rand = seededRandom(77);
  const path = [...LAYOUT.loop, ...LAYOUT.entry];
  const pathDist = (x, z) => {
    let d = Infinity;
    for (let i = 0; i < path.length; i += 2) d = Math.min(d, Math.hypot(path[i].x - x, path[i].z - z));
    return d;
  };
  const nearestPath = (x, z) => {
    let best = path[0];
    let bd = Infinity;
    for (const p of path) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };
  const AVG_FRONT = 2.1;
  const spots = PLOTS.map((p) => plotSpots(p, AVG_FRONT));
  const cx = LOOP_CENTER.x;
  const cz = LOOP_CENTER.z;

  // ---- 地面：草地，帶一點深淺不一的色塊 ----
  const W = BOUNDS.maxX - BOUNDS.minX + 26;
  const D = BOUNDS.maxZ - BOUNDS.minZ + 26;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lowpoly(0x3d5a32));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, (BOUNDS.maxZ + BOUNDS.minZ) / 2);
  ground.receiveShadow = true;
  group.add(ground);
  const patches = [];
  for (let i = 0; i < 46; i++) {
    patches.push({ x: BOUNDS.minX + rand() * (W - 26), z: BOUNDS.minZ + rand() * (D - 26), y: 0.003 + i * 0.00005, rx: -Math.PI / 2, s: 2 + rand() * 4 });
  }
  const patchMesh = instanced(new THREE.CircleGeometry(1, 12), lowpoly(0xffffff), patches, (_, i) => [0x45653a, 0x375230, 0x4a6a3c, 0x3a5a36][i % 4]);
  patchMesh.receiveShadow = true;
  group.add(patchMesh);

  // ---- 彎彎曲曲的小路 ----
  const dirt = lowpoly(0x8a7052);
  const loopMesh = new THREE.Mesh(ribbon(LAYOUT.loop, 2.3, true, rand), dirt);
  loopMesh.position.y = 0.012;
  group.add(loopMesh);
  const entryMesh = new THREE.Mesh(ribbon(LAYOUT.entry, 2.6, false, rand), dirt);
  entryMesh.position.y = 0.013;
  group.add(entryMesh);
  // 中央草原的小圓廣場
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), lowpoly(0x7a6247));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(cx, 0.011, cz);
  group.add(plaza);

  // ---- 小石頭：路邊、踏腳石、菜園邊 ----
  const pebbles = [];
  for (let i = 0; i < path.length; i += 3) {
    if (rand() < 0.45) continue;
    const p = path[i];
    const side = rand() < 0.5 ? -1 : 1;
    const off = 1.25 + rand() * 0.35;
    const sz = 0.08 + rand() * 0.1;
    pebbles.push({ x: p.x - p.tz * side * off, z: p.z + p.tx * side * off, y: 0.02, s: sz, sy: sz * 0.45, ry: rand() * 6 });
  }
  const stones = [];
  spots.forEach((s) => {
    const np = nearestPath(s.door.x, s.door.z);
    for (let k = 0; k < 3; k++) {
      const u = (k + 0.6) / 3.4;
      stones.push({ x: s.door.x + (np.x - s.door.x) * u, z: s.door.z + (np.z - s.door.z) * u, y: 0.01, s: 0.26 + rand() * 0.06, sy: 0.05, ry: rand() * 6 });
    }
  });
  const rockMat = lowpoly(0x8d8a80);
  group.add(instanced(new THREE.DodecahedronGeometry(1, 0), rockMat, [...pebbles, ...stones], (_, i) => [0x8d8a80, 0x9b958a, 0x7c7a72][i % 3]));

  // ---- 每頂帳篷前的小菜園空地（先是一塊修剪過的小草坪，邊上幾顆小石頭） ----
  const shape = new THREE.Shape();
  const gw = 0.85;
  const gd = 0.65;
  const rr = 0.3;
  shape.moveTo(-gw + rr, -gd);
  shape.lineTo(gw - rr, -gd);
  shape.quadraticCurveTo(gw, -gd, gw, -gd + rr);
  shape.lineTo(gw, gd - rr);
  shape.quadraticCurveTo(gw, gd, gw - rr, gd);
  shape.lineTo(-gw + rr, gd);
  shape.quadraticCurveTo(-gw, gd, -gw, gd - rr);
  shape.lineTo(-gw, -gd + rr);
  shape.quadraticCurveTo(-gw, -gd, -gw + rr, -gd);
  const gardenGeo = new THREE.ShapeGeometry(shape, 3);
  gardenGeo.rotateX(-Math.PI / 2);
  group.add(instanced(gardenGeo, lowpoly(0x58773f), spots.map((s) => ({ x: s.garden.x, z: s.garden.z, y: 0.009, ry: s.garden.ry }))));
  const edge = [];
  spots.forEach((s) => {
    const f = { fx: Math.sin(s.garden.ry), fz: Math.cos(s.garden.ry) };
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1.08], [0, -1.08]]) {
      const lx = a * (gw + 0.1);
      const lz = b * (gd + 0.08);
      const es = 0.08 + rand() * 0.05;
      edge.push({ x: s.garden.x + f.fz * lx + f.fx * lz, z: s.garden.z - f.fx * lx + f.fz * lz, y: 0.02, s: es, sy: es * 0.55, ry: rand() * 6 });
    }
  });
  group.add(instanced(new THREE.DodecahedronGeometry(1, 0), lowpoly(0xb3ab98), edge));

  // ---- 放東西時要避開的地方 ----
  const keepOut = (x, z, r = 0) => {
    if (pathDist(x, z) < 1.6 + r) return true;
    if (Math.hypot(x - cx, z - cz) < 4.8 + r) return true;
    if (Math.abs(x) < 4 && z > ENTRY_Z - 4) return true;
    for (let i = 0; i < PLOTS.length; i++) {
      const p = PLOTS[i];
      const s = spots[i];
      if (Math.hypot(x - p.x, z - p.z) < 2.9 + r) return true;
      if (Math.hypot(x - s.garden.x, z - s.garden.z) < 1.5 + r) return true;
      if (Math.hypot(x - s.out.x, z - s.out.z) < 1 + r) return true;
      if (Math.hypot(x - s.lantern.x, z - s.lantern.z) < 0.5 + r) return true;
      const np = nearestPath(s.door.x, s.door.z);
      // 門口到小路的踏腳石
      const vx = np.x - s.door.x;
      const vz = np.z - s.door.z;
      const L = Math.hypot(vx, vz) || 1;
      const u = Math.max(0, Math.min(1, ((x - s.door.x) * vx + (z - s.door.z) * vz) / (L * L)));
      if (Math.hypot(x - s.door.x - vx * u, z - s.door.z - vz * u) < 0.7 + r) return true;
    }
    return false;
  };
  const scatter = (n, r, tries = 30) => {
    const out = [];
    for (let i = 0; i < n * tries && out.length < n; i++) {
      const x = BOUNDS.minX + 1 + rand() * (BOUNDS.maxX - BOUNDS.minX - 2);
      const z = BOUNDS.minZ + 1 + rand() * (BOUNDS.maxZ - BOUNDS.minZ - 2);
      if (!keepOut(x, z, r)) out.push({ x, z });
    }
    return out;
  };

  const colliders = [];

  // ---- 樹：四周一圈，營地裡也零星長幾棵 ----
  const trees = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + rand() * 0.05;
    const ex = (BOUNDS.maxX + 2 + rand() * 6) * Math.sin(a);
    const ez = (BOUNDS.maxZ - BOUNDS.minZ) / 2 + 2 + rand() * 6;
    const x = ex;
    const z = (BOUNDS.maxZ + BOUNDS.minZ) / 2 + ez * Math.cos(a);
    if (Math.abs(x) < 5 && z > ENTRY_Z - 2) continue; // 入口留空
    trees.push({ x, z, h: 3.5 + rand() * 3.5 });
  }
  for (const p of scatter(18, 2.2)) {
    trees.push({ ...p, h: 3 + rand() * 2.5 });
    colliders.push({ x: p.x, z: p.z, r: 0.35 });
  }
  group.add(instanced(new THREE.CylinderGeometry(0.15, 0.22, 1, 6), lowpoly(0x4a3322), trees.map((tr) => ({ x: tr.x, z: tr.z, y: 0.5 }))));
  group.add(
    instanced(
      new THREE.ConeGeometry(1, 1, 7),
      lowpoly(0xffffff),
      trees.map((tr) => ({ x: tr.x, z: tr.z, y: 1 + tr.h / 2, sx: 1 + tr.h * 0.16, sz: 1 + tr.h * 0.16, sy: tr.h, ry: tr.h })),
      (_, i) => [0x1f3a2a, 0x23402c, 0x1b3326][i % 3],
    ),
  );

  // ---- 矮樹叢 ----
  const bush = (p, s) => ({ ...p, y: s * 0.45, s, sy: s * 0.72, ry: rand() * 6 });
  const bushes = scatter(70, 0.5).map((p) => bush(p, 0.45 + rand() * 0.4));
  // 帳篷後面、旁邊多種幾叢，比較有家的感覺
  PLOTS.forEach((p, i) => {
    const f = { fx: Math.sin(p.ry), fz: Math.cos(p.ry) };
    for (const side of [-1, 1]) {
      if (rand() < 0.35) continue;
      const back = -1.2 - rand() * 1.2;
      const lat = side * (2.5 + rand() * 0.4);
      const x = p.x + f.fx * back + f.fz * lat;
      const z = p.z + f.fz * back - f.fx * lat;
      if (Math.hypot(x - spots[i].garden.x, z - spots[i].garden.z) < 1.4 || pathDist(x, z) < 1.6) continue;
      bushes.push(bush({ x, z }, 0.5 + rand() * 0.35));
    }
  });
  group.add(instanced(new THREE.IcosahedronGeometry(1, 0), lowpoly(0xffffff), bushes, (_, i) => [0x2f5a2c, 0x3a6a34, 0x2a4f2a, 0x456f38][i % 4]));

  // ---- 野花：一叢一叢 ----
  const FLOWER = [0xf6a6c1, 0xfff1a8, 0xffffff, 0xc8a8f0, 0xffb38a, 0xa8d8ff];
  const flowers = [];
  for (const c of scatter(55, 0.4)) {
    const col = FLOWER[Math.floor(rand() * FLOWER.length)];
    const n = 4 + Math.floor(rand() * 6);
    for (let k = 0; k < n; k++) {
      const x = c.x + (rand() - 0.5) * 1.3;
      const z = c.z + (rand() - 0.5) * 1.3;
      if (keepOut(x, z)) continue;
      flowers.push({ x, z, h: 0.16 + rand() * 0.18, col });
    }
  }
  group.add(instanced(new THREE.CylinderGeometry(0.012, 0.012, 1, 3), lowpoly(0x4f7a3a), flowers.map((f) => ({ x: f.x, z: f.z, y: f.h / 2, sy: f.h }))));
  group.add(
    instanced(
      new THREE.IcosahedronGeometry(0.075, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.9, emissive: 0x3a2a30, flatShading: true }),
      flowers.map((f) => ({ x: f.x, z: f.z, y: f.h, sy: 0.6, ry: f.h * 30 })),
      (f) => f.col,
    ),
  );

  // ---- 蘑菇 ----
  const shrooms = [];
  for (const c of scatter(16, 0.3)) {
    const n = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const x = c.x + (rand() - 0.5) * 0.9;
      const z = c.z + (rand() - 0.5) * 0.9;
      shrooms.push({ x, z, s: 0.6 + rand() * 0.7, red: rand() < 0.55 });
    }
  }
  group.add(instanced(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 6), lowpoly(0xf1e6d0), shrooms.map((m) => ({ x: m.x, z: m.z, y: 0.08 * m.s, s: m.s }))));
  group.add(
    instanced(
      new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      lowpoly(0xffffff),
      shrooms.map((m) => ({ x: m.x, z: m.z, y: 0.15 * m.s, s: m.s, sy: m.s * 0.7 })),
      (m) => (m.red ? 0xd9534a : 0xd8b48a),
    ),
  );

  // ---- 大石頭 ----
  const rocks = scatter(30, 0.4).map((p) => {
    const rs = 0.25 + rand() * 0.4;
    return { ...p, y: rs * 0.15, s: rs, sy: rs * 0.6, ry: rand() * 6, rx: rand() * 0.4 };
  });
  group.add(instanced(new THREE.DodecahedronGeometry(1, 0), rockMat, rocks, (_, i) => [0xa09a8e, 0xb0a99c, 0x938e84][i % 3]));
  rocks.filter((r) => r.s > 0.45).forEach((r) => colliders.push({ x: r.x, z: r.z, r: r.s * 0.9 }));

  // ---- 光：月光＋天光，暖光交給營火小爐 ----
  group.add(new THREE.HemisphereLight(0xb8c6e8, 0x2a3a22, 1.2));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 0.85);
  moon.position.set(-8, 14, 6);
  group.add(moon);

  const glowMap = glowTex();
  const halo = (size, opacity = 1) =>
    new THREE.PointsMaterial({ map: glowMap, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const haloPoints = (list, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap((p) => [p.x, p.y, p.z]), 3));
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    return pts;
  };

  // ---- 串燈：沿著小路，一段一段掛在木柱之間 ----
  const posts = [];
  const STEP = 16; // 每 8 公尺一根柱子（取樣 0.5 公尺一點）
  const postAt = (pts, i, side) => {
    const p = pts[i];
    return { x: p.x - p.tz * side * 1.45, z: p.z + p.tx * side * 1.45 };
  };
  const strands = [];
  const addStrands = (pts, closed) => {
    const list = [];
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i += STEP) list.push(postAt(pts, i, (list.length % 2) * 2 - 1));
    if (!closed) list.push(postAt(pts, pts.length - 1, (list.length % 2) * 2 - 1));
    posts.push(...list);
    for (let i = 0; i < list.length - (closed ? 0 : 1); i++) strands.push([list[i], list[(i + 1) % list.length]]);
  };
  addStrands(LAYOUT.loop, true);
  addStrands(LAYOUT.entry.slice(0, LAYOUT.entry.length - 6), false);
  const POST_H = 2.5;
  group.add(instanced(new THREE.CylinderGeometry(0.05, 0.07, POST_H, 6), lowpoly(0x5a3c26), posts.map((p) => ({ ...p, y: POST_H / 2 }))));
  posts.forEach((p) => colliders.push({ x: p.x, z: p.z, r: 0.15 }));
  const wire = [];
  const bulbs = [];
  const BULB = [0xffd38a, 0xffb98a, 0xfff0b8, 0xffc0c8, 0xffe08a];
  for (const [a, b] of strands) {
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(4, Math.round(L / 0.55));
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const pt = { x: a.x + (b.x - a.x) * u, y: POST_H - 0.05 - Math.sin(u * Math.PI) * 0.55, z: a.z + (b.z - a.z) * u };
      if (prev) wire.push(prev.x, prev.y, prev.z, pt.x, pt.y, pt.z);
      prev = pt;
      if (k > 0 && k < n) bulbs.push({ ...pt, y: pt.y - 0.07 });
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  group.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x2a2018 })));
  group.add(instanced(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs, (_, i) => BULB[i % BULB.length]));
  const bulbHalo = halo(0.75, 0.55);
  group.add(haloPoints(bulbs, bulbHalo));

  // ---- 每塊地旁邊一盞小燈籠 ----
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffcf86 });
  const lanterns = spots.map((s) => s.lantern);
  group.add(instanced(new THREE.CylinderGeometry(0.035, 0.045, 1.1, 5), lowpoly(0x5a3c26), lanterns.map((l) => ({ ...l, y: 0.55 }))));
  group.add(instanced(new THREE.BoxGeometry(0.17, 0.22, 0.17), lanternMat, lanterns.map((l) => ({ ...l, y: 1.2, ry: 0.4 }))));
  group.add(instanced(new THREE.ConeGeometry(0.15, 0.12, 4), lowpoly(0x3a2a1c), lanterns.map((l) => ({ ...l, y: 1.37, ry: 0.4 + Math.PI / 4 }))));
  lanterns.forEach((l) => colliders.push({ x: l.x, z: l.z, r: 0.12 }));
  const lanternHalo = halo(1.7, 0.7);
  group.add(haloPoints(lanterns.map((l) => ({ ...l, y: 1.2 })), lanternHalo));

  // ---- 營火小爐：中央一座大的，小路邊再放幾座小的 ----
  const flames = [];
  const fireLights = [];
  const logMat = lowpoly(0x5a3a24);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9 });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  function firePit(x, z, size, light) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const n = Math.round(8 * size + 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17 * size + 0.05, 0), rockMat);
      st.position.set(Math.sin(a) * 0.62 * size, 0.08, Math.cos(a) * 0.62 * size);
      st.scale.y = 0.7;
      g.add(st);
    }
    for (let i = 0; i < 3; i++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * size, 0.07 * size, 0.8 * size, 6), logMat);
      lg.rotation.z = Math.PI / 2.4;
      lg.rotation.y = (i / 3) * Math.PI * 2;
      lg.position.y = 0.16 * size;
      g.add(lg);
    }
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.28 * size, 0.75 * size, 7), flameMat);
    f1.position.y = 0.45 * size;
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.14 * size, 0.45 * size, 6), flameCore);
    f2.position.y = 0.36 * size;
    g.add(f1, f2);
    flames.push({ f1, f2, seed: rand() * 10, size });
    const pl = new THREE.PointLight(0xff9a4a, light, 9 + size * 5, 1.6);
    pl.position.y = 0.9;
    g.add(pl);
    fireLights.push({ pl, base: light, seed: rand() * 10 });
    group.add(g);
    colliders.push({ x, z, r: 0.75 * size + 0.1 });
    return g;
  }
  firePit(cx, cz, 1.25, 9);
  // 圍著中央營火的木頭長椅
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.7, 7), logMat);
    lg.rotation.z = Math.PI / 2;
    lg.rotation.y = a;
    const x = cx + Math.sin(a) * 2.6;
    const z = cz + Math.cos(a) * 2.6;
    lg.position.set(x, 0.2, z);
    group.add(lg);
    colliders.push({ x, z, r: 0.45 });
  }
  // 小路邊的小火爐：挑離帳篷遠一點的地方
  const braziers = [];
  for (let i = 0; i < LAYOUT.loop.length && braziers.length < 3; i += 7) {
    const p = LAYOUT.loop[(i + 40) % LAYOUT.loop.length];
    for (const side of [1, -1]) {
      const x = p.x - p.tz * side * 2.1;
      const z = p.z + p.tx * side * 2.1;
      const farTents = PLOTS.every((q, k) => Math.hypot(q.x - x, q.z - z) > 4.2 && Math.hypot(spots[k].garden.x - x, spots[k].garden.z - z) > 2.2);
      const farOthers = braziers.every((b) => Math.hypot(b.x - x, b.z - z) > 22) && posts.every((q) => Math.hypot(q.x - x, q.z - z) > 1.2);
      if (farTents && farOthers) {
        braziers.push({ x, z });
        break;
      }
    }
  }
  braziers.forEach((b) => firePit(b.x, b.z, 0.6, 3.2));

  // ---- 螢火蟲 ----
  const FLY = 70;
  const flyBase = [];
  for (let i = 0; i < FLY; i++) {
    const a = rand() * Math.PI * 2;
    const r = 3 + rand() * 26;
    flyBase.push({ x: cx + Math.sin(a) * r, y: 0.5 + rand() * 1.8, z: cz + Math.cos(a) * r, s: rand() * 10 });
  }
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(FLY * 3);
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = new THREE.PointsMaterial({ color: 0xd8ff9a, map: glowMap, size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const flies = new THREE.Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  group.add(flies);

  // ---- 入口招牌 ----
  const archMat = lowpoly(0x6a4630);
  for (const x of [-2.2, 2.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6), archMat);
    post.position.set(x, 1.6, ENTRY_Z - 1.2);
    group.add(post);
    colliders.push({ x, z: ENTRY_Z - 1.2, r: 0.2 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5, 0.22, 0.22), archMat);
  beam.position.set(0, 3.15, ENTRY_Z - 1.2);
  group.add(beam);
  const gate = makeSign(t('🏕️ 帳篷營地'), { height: 0.42 });
  gate.position.set(0, 3.6, ENTRY_Z - 1.2);
  group.add(gate);
  // 🚲 公用腳踏車（作者 11/11）：每區入口停一台，大家都能騎（同時騎、不用排隊），按 E 騎、再按 E 下車
  const PUB_BIKE = { x: 3.3, z: ENTRY_Z - 2.4 };
  {
    const bk = buildYard('bike');
    bk.position.set(PUB_BIKE.x, 0, PUB_BIKE.z);
    bk.rotation.y = -0.5;
    group.add(bk);
    const tag = makeSign(t('🚲 公用腳踏車・大家都能騎'), { height: 0.26 });
    tag.position.set(PUB_BIKE.x, 1.55, PUB_BIKE.z);
    group.add(tag);
  }
  const nearPubBike = (pos) => Math.hypot(pos.x - PUB_BIKE.x, pos.z - PUB_BIKE.z) < 1.5;
  // 🗺️ 營地地圖看板（作者 11/13）：入口、腳踏車的另一邊。按 E 打開這一區的地圖，點帳篷可以傳送到家門口
  const MAP_BOARD = { x: -3.3, z: ENTRY_Z - 2.4 };
  {
    const mb = new THREE.Group();
    const wood = lowpoly(0x7a5236);
    for (const sx of [-0.62, 0.62]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), wood);
      post.position.set(sx, 0.85, 0);
      mb.add(post);
    }
    const frameM = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.0, 0.08), wood);
    frameM.position.y = 1.25;
    mb.add(frameM);
    // 看板上的小地圖：草地、彎彎的路、幾頂小帳篷（畫在 canvas 上）
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 176;
    const g = c.getContext('2d');
    g.fillStyle = '#bfe3a4';
    g.fillRect(0, 0, 256, 176);
    g.strokeStyle = '#d9b98a';
    g.lineWidth = 14;
    g.beginPath();
    g.ellipse(128, 80, 82, 52, 0, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(128, 132);
    g.lineTo(128, 176);
    g.stroke();
    const tents = [[60, 40], [110, 22], [170, 28], [205, 70], [190, 120], [70, 118], [40, 80], [150, 130]];
    tents.forEach(([x, y], i) => {
      g.fillStyle = ['#f2a65a', '#8fc2a4', '#e58b6b', '#9fb3d8'][i % 4];
      g.beginPath();
      g.moveTo(x - 9, y + 7);
      g.lineTo(x, y - 9);
      g.lineTo(x + 9, y + 7);
      g.closePath();
      g.fill();
    });
    g.fillStyle = '#e8553e';
    g.beginPath();
    g.arc(128, 160, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 13px sans-serif';
    g.textAlign = 'center';
    g.fillText('YOU', 128, 165);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.88), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    face.position.set(0, 1.25, 0.045);
    mb.add(face);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.3), lowpoly(0x5a3c26));
    roof.position.y = 1.8;
    mb.add(roof);
    mb.position.set(MAP_BOARD.x, 0, MAP_BOARD.z);
    mb.rotation.y = 0.5;
    group.add(mb);
    colliders.push({ x: MAP_BOARD.x, z: MAP_BOARD.z, r: 0.45 });
    const tag = makeSign(t('🗺️ 營地地圖・點帳篷就能過去'), { height: 0.26 });
    tag.position.set(MAP_BOARD.x, 2.15, MAP_BOARD.z);
    group.add(tag);
  }
  const nearMapBoard = (pos) => Math.hypot(pos.x - MAP_BOARD.x, pos.z - MAP_BOARD.z) < 1.6;
  const back = makeSign(t('回到營火'), { height: 0.3 });
  back.position.set(0, 2.1, ENTRY_Z + 0.3);
  group.add(back);

  // ---- 帳篷們 ----
  const plotsGroup = new THREE.Group();
  group.add(plotsGroup);
  const signs = []; // 名牌：鏡頭太近時淡出
  const wp = new THREE.Vector3();
  const staticColliders = [...colliders];
  const poleMat = lowpoly(0x5a3c26);
  const tentGlow = new THREE.SpriteMaterial({ map: glowMap, color: 0xffc27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const tentGlowDim = tentGlow.clone();
  tentGlowDim.opacity = 0.35;
  const patchMine = lowpoly(0x4a5c33);
  const patchOther = lowpoly(0x3a5230);
  let plots = PLOTS.map((p, i) => ({ ...p, i, door: spots[i].door, out: spots[i].out, garden: spots[i].garden, tent: null, key: null, g: null, collider: null }));

  let zoneNow = 0; // 🏕️ 現在顯示哪一區（門牌寫「A 區 7 號」用）
  const plotTitle = (i) => t('{z} 區 {n} 號', { z: zoneName(zoneNow), n: i + 1 });
  const tentKey = (tent) => (tent ? [zoneNow, tent.sign ?? '', tent.hid, tent.mine, tent.demo, tent.name, tent.shape, tent.style, tent.frame ?? '', tent.open, tent.likes, tent.n, tent.yard ?? '', (tent.sm ?? []).join(','), JSON.stringify(tent.garden ?? null)].join('|') : `empty:${zoneNow}`);
  const trash = createTrashLayer(group);
  const ridePicked = new Set(); // 騎車自動撿過的垃圾（避免同一件一直送）
  const _sw = new THREE.Vector3();
  const _sw2 = new THREE.Vector3();
  let clockNow = 0;
  const rockers = new Set(); // 會搖的門口擺設（鞦韆）
  const treeSwings = new Set(); // 🌳 樹屋的鞦韆：level 0 沒人、1～3 盪的力道
  const _rp = new THREE.Vector3();
  /** 🥕 小菜園的作物（世界座標，跟帳篷分開放） */
  const gardensGroup = new THREE.Group();
  group.add(gardensGroup);
  const spinners = [];

  /** 拆掉一格：名牌的貼圖、地面圓片要釋放（帳篷外殼和光暈是共用的，不能丟） */
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.userData.own) {
        o.material.map?.dispose();
        o.material.dispose();
      }
      if (o.userData.ownGeo) o.geometry.dispose();
    });
  }

  function buildPlot(p, tent) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.ry;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(3.0, 22), tent?.mine ? patchMine : patchOther);
    patch.rotation.x = -Math.PI / 2;
    patch.position.y = 0.006;
    patch.userData.ownGeo = true;
    g.add(patch);
    const doorAt = (front) => plotSpots(p, front);
    if (!tent) {
      // 空地：小木牌
      // 空營位：小木樁門牌「A 區 5 號・空地」（有帳篷的人走過來按 E 可以搬來這裡）
      const es = buildSign('empty', plotTitle(p.i), t('空地'));
      es.traverse((o) => o.isMesh && (o.userData.ownGeo = true));
      es.position.set(0, 0, 0.8);
      g.add(es);
      const sp = doorAt(0.7);
      return { g, door: sp.door, out: sp.out, collider: null, yards: [] };
    }
    const shell = tentShell(tent.shape, tent.style, tent.frame);
    shell.scale.setScalar(SCALE);
    g.add(shell);
    const sh = shapeOf(tent.shape);
    const front = (sh.kind === 'rect' ? sh.D : sh.R) * SCALE;
    // 帳篷門口透出的暖光（用光暈貼圖，不用真的燈，手機才跑得動）
    const glow = new THREE.Sprite(tent.open ? tentGlow : tentGlowDim);
    glow.position.set(0, 0.8, front + 0.1);
    glow.scale.setScalar(2.4);
    g.add(glow);
    const name = tent.mine ? t('⭐ 我的帳篷') : tent.demo ? tent.name : tent.name ? t('{name} 的帳篷', { name: tent.name }) : t('旅人的帳篷');
    const label = makeSign(name, { height: 0.3 });
    signs.push(label);
    // 名牌放在屋頂上方：依帳篷實際高度（雙層小木屋比較高，以前固定 3.3 會被屋頂蓋住）
    g.updateWorldMatrix(true, false);
    const top = new THREE.Box3().setFromObject(shell).max.y - new THREE.Vector3().setFromMatrixPosition(g.matrixWorld).y;
    const labelY = Math.max(3.3, top + 0.55);
    label.position.y = labelY;
    label.userData.own = true;
    g.add(label);
    const info = [tent.open ? t('🚪 開放參觀') : t('🔒 休息中'), `❤️ ${tent.likes}`];
    if (tent.n) info.push(t('👣 {n} 人在裡面', { n: tent.n }));
    const status = makeSign(info.join('　'), { height: 0.22, bg: 'rgba(30,20,14,0.5)' });
    status.position.y = labelY - 0.38;
    status.userData.own = true;
    g.add(status);
    signs.push(status);
    const sp = doorAt(front);
    // 🥕 帳篷前的小菜園：翻好的土＋三格作物
    const gg = new THREE.Group();
    gg.position.set(p.garden.x, 0, p.garden.z);
    gg.rotation.y = p.garden.ry;
    gg.add(buildSoil(tent.garden?.length ?? 3));
    gg.userData.crops = [];
    (tent.garden ?? []).forEach((slot, i) => {
      if (!slot) return;
      const crop = buildCrop(slot[0], slot[1]);
      gg.userData.crops[i] = crop;
      const sp = slotLocal(i);
      crop.position.set(sp.x, 0, sp.z);
      crop.scale.setScalar(1.2); // 營地鏡頭比較遠，作物放大一點才看得到
      gg.add(crop);
      crop.traverse((o) => o.userData.spin && spinners.push(o));
    });
    // 🪧 門牌：靠小路、菜園那一邊的前面，從路上一眼看得到（11/07）
    const sgn = buildSign(tent.sign ?? 'wood', plotTitle(p.i), tent.mine ? t('⭐ 我家') : tent.name || t('旅人'));
    sgn.traverse((o) => o.isMesh && (o.userData.ownGeo = true));
    sgn.position.set(0.85 * (p.gardenSide || 1), 0, 5.0);
    g.add(sgn);
    // 🚙 門口擺設：帳篷前面、菜園的另一邊
    //    🪑 門口桌椅另外一格：擺在大型擺設的前面一點（兩格可以同時有）
    const yards = [];
    const side = p.gardenSide || 1;
    const place = [];
    // 11/07 作者：遮陽棚、門那一側不要朝自己的房子；坐著的人要面向小路（不要背對步道）
    //   拖車屋：整台轉半圈（露台、躺椅朝小路，遮陽棚朝外）；露營車：門和遮陽棚翻到外側；天幕：椅子面向小路
    if (tent.yard) {
      const y0 = tent.yard;
      const ry = y0 === 'airstream' ? Math.PI / 2 : y0 === 'tarp' ? 0 : -Math.PI / 2;
      const mirror = y0 === 'tarp' ? false : y0 === 'camper' ? side !== 1 : side === 1;
      place.push([y0, BIG_SPOT.x * side, BIG_SPOT.z, ry, mirror]);
    }
    // 小型擺設：郵筒的門要朝小路（11/08 作者），模型的門在 +x，所以多轉 -90 度
    (tent.sm ?? []).slice(0, SMALL_SPOTS.length).forEach((id, i) => place.push([id, SMALL_SPOTS[i].x * side, SMALL_SPOTS[i].z, SMALL_SPOTS[i].ry * side + (id === 'mailbox' ? -Math.PI / 2 : 0), false]));
    for (const [id, lx, lz, ry, mirror] of place) {
      if (!id) continue;
      const y = buildYard(id);
      y.traverse((o) => o.isMesh && (o.userData.ownGeo = true));
      y.scale.setScalar(yardScale(id)); // 門口擺設比帳篷大一點：可以坐、躺，跟角色的比例才對
      // 大型擺設：車頭一律朝小路；門、遮陽棚那一側朝自己的帳篷（菜園在右邊時要鏡像，座位跟著一起翻）
      if (mirror) y.scale.z *= -1;
      if (y.userData.rocker) rockers.add(y); // 🪢 鞦韆：有人坐就會搖
      y.position.set(lx, 0, lz);
      y.rotation.y = ry;
      g.add(y);
      if (y.userData.glow) {
        // 🔥 小火爐：暖暖的光暈（貼圖，不用真的燈）
        const gl = new THREE.Sprite(tentGlow);
        const o = y.userData.glow;
        gl.position.set(o.x, o.y, o.z);
        gl.scale.setScalar(2.2);
        y.add(gl);
      }
      const f = frame(p.ry);
      yards.push({ id, obj: y, col: { x: p.x + f.fx * lz + f.rx * lx, z: p.z + f.fz * lz + f.rz * lx, r: yardRadius(id) * yardScale(id) } });
    }
    // 🌳 私人樹屋：樹枝下的鞦韆（會盪、可以坐，3 段力道）、陽台的小桌椅（可以坐）
    if (sh.id === 'treehouse') {
      const f = frame(p.ry);
      const toWorld = (lx, lz) => ({ x: p.x + f.fx * lz + f.rx * lx, z: p.z + f.fz * lz + f.rz * lx });
      const B = TREEHOUSE_SPOTS.branch;
      const pivot = new THREE.Group();
      pivot.position.set(B.x * SCALE, B.y * SCALE, B.z * SCALE);
      const L = B.y * SCALE - 0.42; // 繩子長度：座板離地 0.42
      const rope = lowpoly(0xc9a46a);
      for (const dx of [-0.3, 0.3]) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 4), rope);
        r.position.set(dx, -L / 2, 0);
        pivot.add(r);
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.32), lowpoly(0x9a6a40));
      seat.position.y = -L;
      pivot.add(seat);
      const anchor = new THREE.Object3D(); // 坐的位置（跟著鞦韆一起盪）
      anchor.position.set(0, -L + 0.06, 0);
      pivot.add(anchor);
      pivot.traverse((o) => o.isMesh && (o.userData.ownGeo = true));
      g.add(pivot);
      pivot.userData.level = 0;
      treeSwings.add(pivot);
      const sw = toWorld(B.x * SCALE, B.z * SCALE);
      pivot.userData.rest = sw; // 坐的位置（不盪的時候）：認出別人是不是坐在這個鞦韆上
      yards.push({ id: 'th_swing', icon: '🪢', name: t('樹屋鞦韆'), obj: pivot, treeSwing: pivot, seats: [{ x: 0, y: -L + 0.06, z: 0, face: 0, swing: true, anchor }], col: { x: sw.x, z: sw.z, r: 0.35 } });
      const T = TREEHOUSE_SPOTS.table;
      const tw = toWorld(T.x * SCALE, T.z * SCALE);
      const balc = new THREE.Object3D();
      balc.scale.setScalar(SCALE);
      g.add(balc);
      yards.push({ id: 'th_table', icon: '☕', name: t('樹屋陽台的小桌椅'), obj: balc, seats: TREEHOUSE_SPOTS.chairs, col: { x: tw.x, z: tw.z, r: 0.45 } });
    }
    return { g, gg, door: sp.door, out: sp.out, collider: { x: p.x, z: p.z, r: front * 0.92 }, yards };
  }

  function setTents(list = []) {
    let changed = false;
    plots = plots.map((p, i) => {
      const tent = list[i] ?? null;
      const key = tentKey(tent);
      if (key === p.key) return { ...p, tent };
      changed = true;
      if (p.g) {
        for (const s of p.g.children) {
          const k = signs.indexOf(s);
          if (k >= 0) signs.splice(k, 1);
        }
        disposeGroup(p.g);
        plotsGroup.remove(p.g);
      }
      if (p.gg) {
        gardensGroup.remove(p.gg);
        p.gg.traverse((o) => {
          o.geometry?.dispose();
          const k = spinners.indexOf(o);
          if (k >= 0) spinners.splice(k, 1);
        });
        p.gg = null;
      }
      const built = buildPlot(p, tent);
      plotsGroup.add(built.g);
      if (built.gg) gardensGroup.add(built.gg);
      return { ...p, tent, key, ...built };
    });
    if (!changed) return;
    colliders.length = 0;
    colliders.push(...staticColliders, ...plots.flatMap((p) => [p.collider, ...(p.yards ?? []).map((y) => y.col)]).filter(Boolean));
  }
  setTents([]);

  const baseResolve = makeResolver(colliders, { type: 'rect', ...BOUNDS });
  // ---------- 🚙 門口擺設：可以坐、躺的位置（世界座標） ----------
  const UP = new THREE.Vector3();
  /** 某一格門口擺設的座位（世界座標＋面向） */
  function yardSeats(p, y) {
    const list = y?.seats ?? (y && YARD_USES[y.id]?.seats);
    if (!list || !y.obj) return [];
    y.obj.updateMatrixWorld(true);
    return list.map((st, i) => {
      const w = y.obj.localToWorld(new THREE.Vector3(st.x, st.y, st.z));
      const dir = UP.set(Math.sin(st.face), 0, Math.cos(st.face)).transformDirection(y.obj.matrixWorld);
      return { i, x: w.x, y: w.y, z: w.z, face: Math.atan2(dir.x, dir.z), sleep: !!st.sleep, driver: !!st.driver, inside: !!st.inside, swing: !!st.swing, hid: p.tent.hid, item: y.id, anchor: st.anchor ?? null, treeSwing: y.treeSwing ?? null };
    });
  }
  /** 站在哪一格的門口擺設旁邊 */
  function yardAt(pos) {
    let best = null;
    let bd = Infinity;
    let by = null;
    for (const p of plots) {
      if (!p.yards?.length || p.tent?.demo) continue;
      for (const y of p.yards) {
        const d = Math.hypot(pos.x - y.col.x, pos.z - y.col.z) - y.col.r;
        if (d < 1.0 && d < bd) [best, by, bd] = [p, y, d];
      }
    }
    return best ? { plot: best, yard: by, d: bd } : null;
  }
  /** 按 E 會用到門口擺設嗎（擺設比門口、菜園近才算） */
  function pickYard(pos) {
    const yd = yardAt(pos);
    if (!yd) return null;
    const tg = targetAt(pos);
    const dT = tg?.door ? Math.hypot(pos.x - tg.door.door.x, pos.z - tg.door.door.z) : tg?.garden ? Math.hypot(pos.x - tg.garden.garden.x, pos.z - tg.garden.garden.z) : Infinity;
    return yd.d + 0.6 < dT ? yd : null;
  }
  let lastActions = null;
  const seatedOn = () => {
    const a = lastActions;
    return a?.seat?.yard && (a.state === 'sofa' || a.state === 'sleep') ? a.seat : null;
  };
  function resolveCollision(pos, r) {
    const st = seatedOn();
    if (st) {
      if (st.anchor) {
        // 🪢 樹屋鞦韆：人跟著鞦韆一起盪
        st.anchor.getWorldPosition(_sw);
        pos.copy(_sw);
        return;
      }
      pos.set(st.x, st.y, st.z);
      return;
    }
    baseResolve(pos, r);
    pos.y = 0;
  }
  /** 其他玩家坐在門口擺設上的高度（遠端角色用；坐、躺本身會再加一點） */
  function heightAt(x, z) {
    for (const p of plots) for (const y of p.yards ?? []) {
      if (!(y.seats ?? YARD_USES[y.id]?.seats)) continue;
      if (Math.hypot(x - y.col.x, z - y.col.z) > y.col.r + 0.5) continue;
      for (const st of yardSeats(p, y)) if (Math.hypot(x - st.x, z - st.z) < 0.15) return Math.max(0, st.y - (st.sleep ? 0.26 : 0.2));
    }
    return 0;
  }

  /** 站在哪一格的門口（1.6 公尺內） */
  function plotAt(pos) {
    let best = null;
    let bd = 1.6;
    for (const p of plots) {
      const d = Math.hypot(pos.x - p.door.x, pos.z - p.door.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  /** 站在哪一塊菜園旁邊（有帳篷的才有菜園） */
  function gardenAt(pos) {
    let best = null;
    let bd = 1.5;
    for (const p of plots) {
      if (!p.tent || p.tent.demo) continue;
      const d = Math.hypot(pos.x - p.garden.x, pos.z - p.garden.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  /** 門口和菜園都在旁邊：比較近的那個 */
  function targetAt(pos) {
    const door = plotAt(pos);
    const gd = gardenAt(pos);
    if (door && gd) {
      return Math.hypot(pos.x - door.door.x, pos.z - door.door.z) <= Math.hypot(pos.x - gd.garden.x, pos.z - gd.garden.z) ? { door } : { garden: gd };
    }
    return door ? { door } : gd ? { garden: gd } : null;
  }

  // ---------- 菜園的小特效：挖土的土粒、澆水的水花＋菜葉抖抖、收成時菜被拔起來 ----------
  const fx = [];
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 1 });
  const splashMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const slotWorld = (p, i) => {
    const sp = slotLocal(i);
    return p.gg.localToWorld(new THREE.Vector3(sp.x, 0.1, sp.z));
  };
  /**
   * @param {string} hid 哪一頂帳篷的菜園
   * @param {number} i 第幾格
   * @param {'dirt'|'water'|'pull'} kind
   * @param {THREE.Vector3} [to] 收成時菜飛去哪裡（玩家）
   */
  function gardenFx(hid, i, kind, to) {
    const p = plots.find((x) => x.tent?.hid === hid || (hid === 'me' && x.tent?.mine));
    if (!p?.gg) return;
    p.gg.updateMatrixWorld(true);
    const at = slotWorld(p, i);
    if (kind === 'dirt') {
      for (let k = 0; k < 10; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 6, 4), dirtMat);
        m.position.copy(at);
        group.add(m);
        const a = Math.random() * Math.PI * 2;
        fx.push({ m, t: -Math.random() * 0.8, life: 0.6, v: new THREE.Vector3(Math.sin(a) * 0.6, 1.4 + Math.random(), Math.cos(a) * 0.6), from: at.clone(), kind });
      }
    } else if (kind === 'water') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 20), splashMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(at).setY(0.12);
      group.add(ring);
      fx.push({ m: ring, t: -0.4, life: 1.2, kind });
      const crop = p.gg.userData.crops?.[i];
      if (crop) fx.push({ crop, t: -0.3, life: 1.2, kind: 'shake' });
    } else if (kind === 'pull') {
      const crop = p.gg.userData.crops?.[i];
      if (!crop) return;
      // 從菜園拿出來放到世界座標，才能飛向玩家
      const wp = crop.getWorldPosition(new THREE.Vector3());
      const sc = crop.getWorldScale(new THREE.Vector3()).x;
      crop.parent.remove(crop);
      crop.position.copy(wp);
      crop.scale.setScalar(sc);
      crop.rotation.y = p.garden.ry;
      group.add(crop);
      p.gg.userData.crops[i] = null;
      fx.push({ crop, t: -0.4, life: 1.1, kind, from: wp.clone(), sc, to });
    }
  }
  function updateFx(dt) {
    for (let k = fx.length - 1; k >= 0; k--) {
      const f = fx[k];
      f.t += dt;
      if (f.t < 0) {
        if (f.kind === 'pull') f.crop.rotation.z = Math.sin(f.t * 45) * 0.08; // 抓住、抖一抖
        if (f.m && f.kind === 'dirt') f.m.visible = false;
        continue;
      }
      const u = f.t / f.life;
      if (u >= 1) {
        if (f.m) {
          group.remove(f.m);
          f.m.geometry.dispose();
          if (f.kind === 'water') f.m.material.dispose();
        }
        if (f.kind === 'shake') f.crop.rotation.z = 0;
        if (f.kind === 'pull') group.remove(f.crop);
        fx.splice(k, 1);
        continue;
      }
      if (f.kind === 'dirt') {
        f.m.visible = true;
        f.m.position.set(f.from.x + f.v.x * f.t, f.from.y + f.v.y * f.t - 4.9 * f.t * f.t, f.from.z + f.v.z * f.t);
        if (f.m.position.y < 0.05) f.m.position.y = 0.05;
      } else if (f.kind === 'water') {
        f.m.scale.setScalar(1 + u * 4);
        f.m.material.opacity = 0.7 * (1 - u);
      } else if (f.kind === 'shake') {
        f.crop.rotation.z = Math.sin(f.t * 30) * 0.18 * (1 - u);
      } else if (f.kind === 'pull') {
        f.crop.rotation.z = 0;
        if (u < 0.35) {
          // 啵！拔出來往上彈
          const k2 = u / 0.35;
          f.crop.position.set(f.from.x, f.from.y + Math.sin(k2 * Math.PI * 0.5) * 0.55, f.from.z);
          f.crop.scale.setScalar(f.sc * (1 + Math.sin(k2 * Math.PI) * 0.3));
        } else {
          const k2 = (u - 0.35) / 0.65;
          const to = f.to ?? f.from;
          f.crop.position.set(f.from.x + (to.x - f.from.x) * k2, f.from.y + 0.55 + k2 * 0.3, f.from.z + (to.z - f.from.z) * k2);
          f.crop.scale.setScalar(f.sc * Math.max(0.01, 1 - k2));
        }
      }
    }
  }

  const returnSpawn = {};
  // 站在門口、面朝外；鏡頭在前面看著自己和身後的帳篷（不然會卡進帳篷裡）
  const outSpot = (p) => (p ? { x: p.out.x, z: p.out.z, ry: p.out.ry, camYaw: Math.PI, camPitch: 0.42 } : undefined);
  // 🏕️ 區與區之間的路口（11/07）：中央草原上兩座小木拱門「往 B 區 →」「← 往 A 區」，走進去就換區
  //    每一區都有營地大門回中央營火（同一張地圖）
  const MAIN_GATE = { to: 'forest_main', x: 0, z: ENTRY_Z + 0.4, r: 0.9, label: t('回到營火') };
  const entrances = [MAIN_GATE];
  const GATE_NEXT = { x: cx + 3.9, z: cz + 0.6 };
  const GATE_PREV = { x: cx - 3.9, z: cz + 0.6 };
  const gatesGroup = new THREE.Group();
  group.add(gatesGroup);
  function buildZoneGate(text) {
    const g = new THREE.Group();
    for (const sx of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), poleMat);
      post.position.set(sx, 1.1, 0);
      post.userData.ownGeo = true;
      g.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.18), poleMat);
    bar.position.y = 2.2;
    bar.userData.ownGeo = true;
    g.add(bar);
    const sg = makeSign(text, { height: 0.34 });
    sg.position.y = 2.65;
    sg.userData.own = true;
    g.add(sg);
    const gl = new THREE.Sprite(tentGlow);
    gl.position.y = 2.2;
    gl.scale.setScalar(1.6);
    g.add(gl);
    return g;
  }
  function setGates(z) {
    for (const c of [...gatesGroup.children]) {
      disposeGroup(c);
      gatesGroup.remove(c);
    }
    entrances.length = 0;
    entrances.push(MAIN_GATE);
    const L = (k) => zoneName(k);
    const add = (pos, to, text) => {
      const g = buildZoneGate(text);
      g.position.set(pos.x, 0, pos.z);
      g.rotation.y = Math.PI / 2; // 拱門面向左右，從草原中間走進去
      gatesGroup.add(g);
      entrances.push({ to, x: pos.x, z: pos.z, r: 0.75, label: text });
    };
    add(GATE_NEXT, `zone:${z + 1}`, t('往 {z} 區 →', { z: L(z + 1) }));
    if (z > 0) add(GATE_PREV, `zone:${z - 1}`, t('← 往 {z} 區', { z: L(z - 1) }));
  }
  setGates(0);
  return {
    id: 'campground',
    label: t('🏕️ 帳篷營地'),
    group,
    fog: new THREE.FogExp2(FOG_COLOR, 0.016),
    background: new THREE.Color(FOG_COLOR),
    outdoor: true,
    occluders: [],
    entrances,
    spawn: { x: 0, z: ENTRY_Z - 2.6, ry: Math.PI },
    returnSpawn,
    cameraDistance: 8,
    audio: { fire: 0.15, wind: 0.9, ambient: 1, water: 0, music: 0.5, song: 0 },
    resolveCollision,
    heightAt,
    /** 🪢 別人坐在樹屋鞦韆上：回傳他現在該在的位置（跟著鞦韆盪）；d＝他選的段數 ÷ 2 */
    remoteSpot(x, z, d) {
      for (const sw of treeSwings) {
        const r = sw.userData.rest;
        if (!r || Math.hypot(x - r.x, z - r.z) > 0.8) continue;
        sw.userData.remoteLevel = Math.min(3, Math.max(1, Math.round((d || 0.5) * 2)));
        sw.userData.remoteAt = clockNow;
        const a = sw.children.find((o) => !o.isMesh);
        if (!a) return null;
        a.getWorldPosition(_sw2);
        return _sw2;
      }
      return null;
    },
    yardSeats,
    /** 目前的營位（除錯、測試用） */
    get plots() {
      return plots;
    },
    setTents,
    plotAt,
    trash,
    gardenFx,
    /** 菜園第幾格在世界上的位置（角色面向用） */
    gardenSlotPos(hid, i) {
      const p = plots.find((x) => x.tent?.hid === hid || (hid === 'me' && x.tent?.mine));
      if (!p?.gg) return null;
      p.gg.updateMatrixWorld(true);
      return slotWorld(p, i);
    },
    /** 從某頂帳篷出來時，站回那頂帳篷的門口 */
    /** 🏕️ 現在顯示哪一區（換區時先呼叫，再 setTents） */
    setZone(z) {
      if ((z | 0) !== zoneNow || !gatesGroup.children.length) setGates(z | 0);
      zoneNow = z | 0;
    },
    /** 換區後站在哪：從「往下一區」走進來→站在新區的「往上一區」拱門旁，反過來也一樣 */
    zoneSpawn(from) {
      return from === 'next' ? { x: GATE_PREV.x + 1.5, z: GATE_PREV.z, ry: Math.PI / 2 } : from === 'prev' ? { x: GATE_NEXT.x - 1.5, z: GATE_NEXT.z, ry: -Math.PI / 2 } : { x: 0, z: ENTRY_Z - 2.6, ry: Math.PI };
    },
    setReturnFrom(plot) {
      returnSpawn.home = outSpot(plot);
    },
    /**
     * 從自己的帳篷出來：站到營地裡自己帳篷的門口。
     * 伺服器一定把自己的帳篷排在第 0 格；還沒拿到清單時，就用自己帳篷的造型先算門口。
     */
    setReturnToMine(shape, plot) {
      // 🏕️ 固定營位：自己帳篷在第 n 號（n−1 格）；還沒拿到清單時用造型先算門口
      const idx = plot?.n ? plot.n - 1 : 0;
      const mine = plots.find((p) => p.tent?.mine);
      if (mine) return (returnSpawn.home = outSpot(mine));
      const sh = shapeOf(shape);
      const front = (sh.kind === 'rect' ? sh.D : sh.R) * SCALE;
      returnSpawn.home = outSpot(plotSpots(PLOTS[Math.min(idx, PLOTS.length - 1)], front));
    },
    update(dt, time, camera) {
      clockNow = time;
      // 🌳 樹屋鞦韆：自己坐著照選的力道盪（1 輕輕、2 高一點、3 用力）；別人坐著輕輕盪；沒人慢慢停
      const me = seatedOn();
      for (const sw of treeSwings) {
        if (!sw.parent) {
          treeSwings.delete(sw);
          continue;
        }
        let want = 0;
        if (me?.treeSwing === sw) want = [0, 0.22, 0.4, 0.58][sw.userData.level || 1];
        else {
          // 別人坐著：照他選的段數盪（remoteSpot 收到的）；超過 1 秒沒收到就當沒人
          if (time - (sw.userData.remoteAt ?? -9) < 1) want = [0, 0.22, 0.4, 0.58][sw.userData.remoteLevel || 1];
          sw.userData.level = 0;
        }
        sw.userData.amp = (sw.userData.amp ?? 0) + (want - (sw.userData.amp ?? 0)) * Math.min(1, dt * 1.2);
        sw.rotation.x = Math.sin(time * 2.1) * sw.userData.amp;
      }
      // 🪢 鞦韆：附近有人坐著就前後輕輕搖，沒人就慢慢停下來
      for (const y of rockers) {
        if (!y.parent) {
          rockers.delete(y);
          continue;
        }
        y.getWorldPosition(_rp);
        const r = y.userData.rocker;
        const want = this.occupied?.(_rp.x, _rp.z, 1.2) ? 0.16 : 0;
        r.userData.amp = (r.userData.amp ?? 0) + (want - (r.userData.amp ?? 0)) * Math.min(1, dt * 1.5);
        r.rotation.x = Math.sin(time * 1.9) * r.userData.amp;
      }
      // 🚲 騎車經過垃圾：自動撿起來，不用停下來（同一件只送一次，等伺服器回覆）
      const ra = lastActions;
      if (ra?.state === 'ride') {
        const tb = trash.near(ra.player.position);
        if (tb && !ridePicked.has(tb.k)) {
          ridePicked.add(tb.k);
          if (ridePicked.size > 50) ridePicked.delete(ridePicked.values().next().value);
          ra.onTrash?.(tb);
        }
      }
      for (const sg of signs) {
        sg.getWorldPosition(wp);
        sg.material.opacity = Math.min(1, Math.max(0, (camera.position.distanceTo(wp) - 2.5) / 3));
      }
      for (const f of flames) {
        const k = 1 + Math.sin(time * 9 + f.seed) * 0.08 + Math.sin(time * 15.3 + f.seed * 2) * 0.05;
        f.f1.scale.set(1 / k, k, 1 / k);
        f.f2.scale.set(1, 2 - k, 1);
        f.f1.rotation.y = time * 0.8 + f.seed;
      }
      for (const l of fireLights) l.pl.intensity = l.base * (0.88 + Math.sin(time * 7 + l.seed) * 0.07 + Math.sin(time * 13 + l.seed) * 0.05);
      for (let i = 0; i < FLY; i++) {
        const b = flyBase[i];
        flyPos[i * 3] = b.x + Math.sin(time * 0.3 + b.s) * 1.4;
        flyPos[i * 3 + 1] = b.y + Math.sin(time * 0.7 + b.s * 2) * 0.35;
        flyPos[i * 3 + 2] = b.z + Math.cos(time * 0.25 + b.s * 1.3) * 1.4;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyMat.opacity = 0.55 + Math.sin(time * 1.7) * 0.3;
      lanternHalo.opacity = 0.62 + Math.sin(time * 1.3) * 0.06;
      updateFx(dt);
      for (const o of spinners) {
        o.rotation.y = time * 2;
        o.position.y = 0.62 + Math.sin(time * 3) * 0.03;
      }
    },
    onAction(name, actions) {
      lastActions = actions;
      // 坐在門口擺設上：E 起身
      if (name === 'interact' && seatedOn()) {
        actions.stop();
        return true;
      }
      // 🚲 騎腳踏車中：旁邊有垃圾就直接撿（不用下車），不然 E＝下車
      if (name === 'interact' && actions.state === 'ride') {
        const tb = trash.near(actions.player.position);
        if (tb) actions.onTrash?.(tb);
        else actions.stop();
        return true;
      }
      if (name !== 'interact' || actions.state !== 'free') return false;
      const tb = trash.near(actions.player.position);
      if (tb) {
        actions.onTrash?.(tb);
        return true;
      }
      if (nearPubBike(actions.player.position)) {
        actions.ride();
        return true;
      }
      if (nearMapBoard(actions.player.position)) {
        actions.onCampMap?.();
        return true;
      }
      const tg = targetAt(actions.player.position);
      // 🚙 門口擺設比門口、菜園近的話：打開擺設的選單
      const yd = pickYard(actions.player.position);
      if (yd) {
        actions.onYard?.(yd.plot, yardSeats(yd.plot, yd.yard), yd.yard);
        return true;
      }
      if (!tg) return false;
      if (tg.garden) actions.onGarden?.(tg.garden);
      else actions.onVisit?.(tg.door);
      return true;
    },
    prompt(actions) {
      lastActions = actions;
      if (trash.near(actions.player.position)) return t('<kbd>E</kbd> ♻️ 撿起垃圾');
      if (actions.state === 'free' && nearPubBike(actions.player.position)) return t('<kbd>E</kbd> 🚲 騎公用腳踏車（再按 E 下車）');
      if (actions.state === 'free' && nearMapBoard(actions.player.position)) return t('<kbd>E</kbd> 🗺️ 看營地地圖（點帳篷就能過去）');
      const tg = targetAt(actions.player.position);
      const yd = pickYard(actions.player.position);
      if (yd) return t('<kbd>E</kbd> {icon} {name}', { icon: yd.yard.icon ?? YARD_ICON[yd.yard.id] ?? '🚙', name: yd.yard.name ?? t(YARD_NAME[yd.yard.id] ?? '') });
      if (tg?.garden) return tg.garden.tent.mine ? t('<kbd>E</kbd> 🥕 我的小菜園') : t('<kbd>E</kbd> 💧 看看「{name}」的菜園', { name: tg.garden.tent.name || t('旅人') });
      const p = tg?.door;
      if (!p) return null;
      if (!p.tent) return t('<kbd>E</kbd> 空地・到營火旁的小舖買帳篷就能住進來');
      if (p.tent.mine) return t('<kbd>E</kbd> 回我的帳篷');
      if (!p.tent.open) return t('🔒 這頂帳篷休息中');
      return t('<kbd>E</kbd> 拜訪「{name}」', { name: p.tent.name || t('旅人的帳篷') });
    },
    interactHint(actions) {
      lastActions = actions;
      if (actions.state === 'ride' && trash.near(actions.player.position)) return ['♻️', t('撿起來')];
      if (seatedOn() || actions.state === 'ride') return ['🧍', t('起身')];
      if (trash.near(actions.player.position)) return ['♻️', t('撿起來')];
      if (nearPubBike(actions.player.position)) return ['🚲', t('騎車')];
      if (nearMapBoard(actions.player.position)) return ['🗺️', t('地圖')];
      const yd0 = pickYard(actions.player.position);
      if (yd0) return [yd0.yard.icon ?? YARD_ICON[yd0.yard.id] ?? '🚙', t('使用')];
      const tg = targetAt(actions.player.position);
      if (tg?.garden) return ['🥕', t('菜園')];
      return tg ? ['🚪', t('拜訪')] : null;
    },
  };
}
