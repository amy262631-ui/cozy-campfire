import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

/**
 * 帳篷造型：鐘形帳（買帳篷就有）以外，其他用松果解鎖，解鎖後可以隨時換。
 * 伺服器 server/homes.js 的 TENT_SHAPES 價格要跟這裡一致。
 *   style：剛買下時自動換上的花色（之後可以自己改）
 *   kind：'round' 圓形地板／'rect' 方形地板
 */
export const TENT_SHAPES = [
  { id: 'bell', icon: '⛺', name: t('鐘形帳'), price: 0, kind: 'round', R: 3.8, light: 3.0 },
  { id: 'aframe', icon: '🏕️', name: t('野營三角帳'), price: 15, kind: 'rect', W: 3.3, D: 3.4, light: 2.6, style: 'forest' },
  { id: 'dome', icon: '🥾', name: t('登山圓頂帳'), price: 20, kind: 'round', R: 3.9, light: 2.3, style: 'night' },
  { id: 'yurt', icon: '🛖', name: t('蒙古包'), price: 25, kind: 'round', R: 3.9, light: 2.4, style: 'classic' },
  { id: 'circus', icon: '🎪', name: t('馬戲團大帳'), price: 35, kind: 'round', R: 3.8, light: 3.3, style: 'stripe' },
  { id: 'mushroom', icon: '🍄', name: t('蘑菇小屋'), price: 40, kind: 'round', R: 3.6, light: 2.6, style: 'redspot' },
];
export const TENT_SHAPE_BY_ID = Object.fromEntries(TENT_SHAPES.map((s) => [s.id, s]));
export const shapeOf = (id) => TENT_SHAPE_BY_ID[id] ?? TENT_SHAPES[0];

const GAP = 0.3; // 門口開口（弧度的一半）

/**
 * 蓋出帳篷本體（不含地板）。門口一律朝 +z。
 *   mats.canvas 帆布、mats.accent 收邊／門簾、mats.wood 木頭、mats.trim 第二配色（菇柄、內裡）
 *   outside：true＝從外面看的版本（多了旗子、彩旗、窗戶、營釘這些外部裝飾）
 *   noPole：不要中柱
 */
export function buildTentShell(shapeId, mats, { outside = false, noPole = false } = {}) {
  const sh = shapeOf(shapeId);
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const openCyl = (r, h, y, mat, segs = 32) =>
    add(new THREE.CylinderGeometry(r, r, h, segs, 1, true, GAP, Math.PI * 2 - GAP * 2), mat, 0, y + h / 2, 0);
  const flaps = (x, h, z, mat = mats.accent) => {
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.08, 0.08, h, 8), mat, s * x, h / 2, z);
  };
  // noPole：擴建成奇數格時中間那格要能擺家具，就不放中柱
  const pole = (h) => !noPole && add(new THREE.CylinderGeometry(0.06, 0.07, h, 8), mats.wood, 0, h / 2, 0);

  if (sh.id === 'bell') {
    const R = sh.R;
    openCyl(R, 1.6, 0, mats.canvas);
    add(new THREE.ConeGeometry(R + 0.05, 2.3, 32, 1, true), mats.canvas, 0, 1.6 + 1.15, 0);
    flaps(1.05, 1.6, R - 0.12);
    pole(3.9);
    if (outside) add(new THREE.SphereGeometry(0.1, 8, 6), mats.accent, 0, 3.95, 0);
  } else if (sh.id === 'circus') {
    const R = sh.R;
    openCyl(R, 1.9, 0, mats.canvas);
    add(new THREE.ConeGeometry(R + 0.1, 2.8, 32, 1, true), mats.canvas, 0, 1.9 + 1.4, 0);
    // 屋簷下一圈波浪布邊
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < GAP && !outside) continue;
      const sc = add(new THREE.CircleGeometry(0.42, 10, Math.PI, Math.PI), mats.accent, Math.sin(a) * (R + 0.11), 1.92, Math.cos(a) * (R + 0.11));
      sc.rotation.y = a;
      sc.material = mats.accentDouble ?? mats.accent;
    }
    flaps(1.1, 1.9, R - 0.12);
    pole(4.9);
    if (outside) {
      add(new THREE.SphereGeometry(0.12, 8, 6), mats.gold ?? mats.accent, 0, 4.75, 0);
      const flag = add(new THREE.ConeGeometry(0.28, 0.7, 3), mats.accent, 0.32, 5.05, 0);
      flag.rotation.z = -Math.PI / 2;
      add(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), mats.wood, 0, 5.05, 0);
    }
  } else if (sh.id === 'yurt') {
    const R = sh.R;
    openCyl(R, 1.6, 0, mats.canvas);
    add(new THREE.ConeGeometry(R + 0.25, 1.3, 32, 1, true), mats.canvas, 0, 1.6 + 0.65, 0);
    // 牆上的木格（菱格）與屋頂的天窗圈
    for (const y of [0.25, 1.45]) {
      const band = add(new THREE.TorusGeometry(R + (outside ? 0.03 : -0.03), 0.04, 6, 40, Math.PI * 2 - GAP * 2), mats.accent, 0, y, 0);
      band.rotation.x = Math.PI / 2;
      band.rotation.z = Math.PI / 2 + GAP;
    }
    const crown = add(new THREE.TorusGeometry(0.45, 0.07, 8, 20), mats.wood, 0, 2.88, 0);
    crown.rotation.x = Math.PI / 2;
    // 木門框
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.12, 1.6, 0.12), mats.wood, s * 1.15, 0.8, R * Math.cos(GAP) - 0.02);
    add(new THREE.BoxGeometry(2.42, 0.14, 0.14), mats.wood, 0, 1.6, R * Math.cos(GAP) - 0.02);
  } else if (sh.id === 'dome') {
    const R = sh.R;
    const dome = add(new THREE.SphereGeometry(R, 32, 12, Math.PI / 2 + GAP, Math.PI * 2 - GAP * 2, 0, Math.PI / 2), mats.canvas);
    dome.scale.y = 0.72;
    // 兩根交叉的帳篷桿
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      const arc = add(new THREE.TorusGeometry(R + (outside ? 0.04 : -0.04), 0.05, 6, 32, Math.PI), mats.accent);
      arc.scale.y = 0.72;
      arc.rotation.y = rot;
    }
    flaps(0.95, 1.5, R * 0.93);
  } else if (sh.id === 'aframe') {
    const { W, D } = sh;
    const K = 0.9; // 兩側矮牆高度
    const H = 3.3; // 屋脊高度
    // 四個角點組成一片（法線朝外）
    const quad = (a, b, c, d, mat) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 4, 0, 4, 1, 0, 0, 4, 1, 0, 1], 2));
      geo.computeVertexNormals();
      return add(geo, mat);
    };
    quad([W, 0, D], [W, 0, -D], [W, K, -D], [W, K, D], mats.canvas);
    quad([-W, 0, -D], [-W, 0, D], [-W, K, D], [-W, K, -D], mats.canvas);
    quad([W, K, D], [W, K, -D], [0, H, -D], [0, H, D], mats.canvas);
    quad([-W, K, -D], [-W, K, D], [0, H, D], [0, H, -D], mats.canvas);
    // 山牆：後面一整片，前面左右兩片（中間是門）
    const yAt = (x) => K + (H - K) * (1 - Math.abs(x) / W);
    const gable = (x0, x1, z, back) => {
      const shp = new THREE.Shape();
      shp.moveTo(x0, 0);
      shp.lineTo(x1, 0);
      shp.lineTo(x1, yAt(x1));
      if (x0 < 0 && x1 > 0) shp.lineTo(0, H);
      shp.lineTo(x0, yAt(x0));
      shp.closePath();
      const m = add(new THREE.ShapeGeometry(shp), mats.canvas, 0, 0, z);
      if (back) m.rotation.y = Math.PI;
      return m;
    };
    gable(-W, W, -D, true);
    gable(-W, -0.95, D, false);
    gable(0.95, W, D, false);
    // 門上方的三角
    const top = new THREE.Shape();
    top.moveTo(-0.95, 2.3);
    top.lineTo(0.95, 2.3);
    top.lineTo(0.95, yAt(0.95));
    top.lineTo(0, H);
    top.lineTo(-0.95, yAt(0.95));
    top.closePath();
    add(new THREE.ShapeGeometry(top), mats.canvas, 0, 0, D);
    flaps(0.95, 2.3, D - 0.05);
    const ridge = add(new THREE.CylinderGeometry(0.06, 0.06, D * 2 + 0.4, 8), mats.wood, 0, H, 0);
    ridge.rotation.x = Math.PI / 2;
    if (outside) {
      // 營繩
      for (const sx of [-1, 1])
        for (const z of [-D, D]) {
          const rope = add(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4), mats.wood, sx * (W + 0.5), K / 2 + 0.05, z);
          rope.rotation.z = sx * 0.95;
        }
    }
  } else if (sh.id === 'mushroom') {
    const R = sh.R;
    openCyl(R, 1.9, 0, mats.trim ?? mats.canvas);
    const cap = add(new THREE.SphereGeometry(R + 0.9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.canvas, 0, 1.85, 0);
    cap.scale.y = 0.6;
    // 菇傘下面的一圈菌褶（只從下面看得到，布置時不會擋住鏡頭）
    const gills = add(new THREE.RingGeometry(R, R + 0.9, 32), mats.gills ?? mats.accent, 0, 1.86, 0);
    gills.rotation.x = Math.PI / 2;
    // 圓弧門框
    const dz = R * Math.cos(GAP) + 0.02;
    add(new THREE.TorusGeometry(1.0, 0.08, 6, 16, Math.PI), mats.wood, 0, 1.0, dz);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.14, 1.0, 0.14), mats.wood, sx * 1.0, 0.5, dz);
    if (outside) {
      for (const a of [0.9, -0.9, 2.3, -2.3]) {
        const win = add(new THREE.CircleGeometry(0.28, 14), mats.window ?? mats.accent, Math.sin(a) * (R + 0.02), 1.15, Math.cos(a) * (R + 0.02));
        win.rotation.y = a;
      }
    }
  }
  return g;
}

/** 地板形狀 */
export function buildTentFloor(shapeId, mat) {
  const sh = shapeOf(shapeId);
  const geo = sh.kind === 'rect' ? new THREE.PlaneGeometry(sh.W * 2, sh.D * 2) : new THREE.CircleGeometry(sh.R, 32);
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}

/** 走動範圍（給碰撞用） */
export function tentBounds(shapeId) {
  const sh = shapeOf(shapeId);
  if (sh.kind === 'rect') return { type: 'rect', minX: -sh.W + 0.3, maxX: sh.W - 0.3, minZ: -sh.D + 0.3, maxZ: sh.D + 0.2 };
  return { type: 'circle', r: sh.R - 0.35 };
}

/** 門口位置（z） */
export const tentDoorZ = (shapeId) => {
  const sh = shapeOf(shapeId);
  return sh.kind === 'rect' ? sh.D - 0.05 : sh.R - 0.05;
};
