import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { LOFT_FRONT } from './furnitureCatalog.js';

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
  // 🏡 雙層小木屋：有樓梯可以走上二樓的閣樓（要存很久的松果）
  { id: 'cabin', icon: '🏡', name: t('雙層小木屋'), price: 500, kind: 'rect', W: 3.4, D: 3.4, light: 3.6, style: 'log', loft: true },
];

/** 小木屋二樓（閣樓）的尺寸：沒放大前的座標，跟著擴建一起放大 */
export const CABIN = {
  wall: 4.4, // 牆高（兩層樓）
  roof: 1.9, // 屋頂再高多少
  loftY: 2.2, // 二樓地板高度
  loftFront: LOFT_FRONT, // 二樓前緣（z 比這個小就是二樓）
  stairX0: 2.3, // 樓梯（靠右牆）
  stairX1: 3.1,
  stairBottom: 2.8, // 樓梯最下面一階（z）
};
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
  if (sh.id === 'cabin') buildCabin(sh, mats, add, outside);
  return g;
}

/** 🏡 雙層小木屋：原木牆、斜屋頂；裡面有樓梯和二樓閣樓（外面看得到上下兩排窗戶、小陽台、煙囪） */
function buildCabin(sh, mats, add, outside) {
  const { W, D } = sh;
  const { wall: WALL, roof: RH, loftY, loftFront, stairX0, stairX1, stairBottom } = CABIN;
  // 一片牆：底邊兩點 (x0,z0)→(x1,z1)，從 y0 到 y1；uv 用公尺算，原木紋才不會被拉長
  const wallQuad = (x0, z0, x1, z1, y0, y1, mat = mats.canvas) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.BufferGeometry();
    const a = [x0, y0, z0];
    const b = [x1, y0, z1];
    const c = [x1, y1, z1];
    const d = [x0, y1, z0];
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    const u = len / 2;
    const v0 = y0 / 1.2;
    const v1 = y1 / 1.2;
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, u, v0, u, v1, 0, v0, u, v1, 0, v1], 2));
    geo.computeVertexNormals();
    return add(geo, mat);
  };
  const DOOR = 0.75;
  const DOOR_H = 2.0;
  wallQuad(W, D, W, -D, 0, WALL); // 右
  wallQuad(W, -D, -W, -D, 0, WALL); // 後
  wallQuad(-W, -D, -W, D, 0, WALL); // 左
  wallQuad(-W, D, -DOOR, D, 0, WALL); // 前（門的左右兩邊、門上方）
  wallQuad(DOOR, D, W, D, 0, WALL);
  wallQuad(-DOOR, D, DOOR, D, DOOR_H, WALL);
  // 山牆（前後兩片三角形）
  const tri = new THREE.Shape();
  tri.moveTo(-W, 0);
  tri.lineTo(W, 0);
  tri.lineTo(0, RH);
  tri.closePath();
  add(new THREE.ShapeGeometry(tri), mats.canvas, 0, WALL, D);
  add(new THREE.ShapeGeometry(tri), mats.canvas, 0, WALL, -D).rotation.y = Math.PI;
  // 屋頂：外面看用深色（收邊色），裡面用牆的材質（只畫內側，鏡頭在外面也看得到屋裡）
  const roofMat = outside ? mats.accentDouble ?? mats.accent : mats.canvas;
  const O = 0.4; // 屋簷伸出去多少
  // 兩片斜屋頂（手動排點，法線朝外）
  const roofPiece = (sx) => {
    const geo = new THREE.BufferGeometry();
    const xe = sx * (W + O);
    const ye = WALL - (O * RH) / W;
    const p = sx > 0
      ? [[xe, ye, D + O], [xe, ye, -D - O], [0, WALL + RH, -D - O], [0, WALL + RH, D + O]]
      : [[xe, ye, -D - O], [xe, ye, D + O], [0, WALL + RH, D + O], [0, WALL + RH, -D - O]];
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 4, 0, 4, 2, 0, 0, 4, 2, 0, 2], 2));
    geo.computeVertexNormals();
    return add(geo, roofMat);
  };
  roofPiece(1);
  roofPiece(-1);
  // 四個角的粗原木柱
  for (const [x, z] of [[W, D], [-W, D], [W, -D], [-W, -D]]) add(new THREE.CylinderGeometry(0.16, 0.16, WALL, 8), mats.wood, x, WALL / 2, z);
  // 門框
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.14, DOOR_H, 0.16), mats.wood, sx * DOOR, DOOR_H / 2, D);
  add(new THREE.BoxGeometry(DOOR * 2 + 0.14, 0.16, 0.16), mats.wood, 0, DOOR_H, D);
  // 二樓中間的一圈橫樑（外面看得出是兩層樓）
  for (const [x0, z0, x1, z1] of [[W, D, -W, D], [W, -D, -W, -D]]) add(new THREE.BoxGeometry(Math.abs(x1 - x0), 0.16, 0.18), mats.wood, (x0 + x1) / 2, loftY, z0);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.18, 0.16, D * 2), mats.wood, sx * W, loftY, 0);
  const winMat = mats.window ?? mats.accent;
  if (outside) {
    // 窗戶：一樓前面兩扇、二樓前面一扇大的＋小陽台、左右兩側上下各一扇
    const win = (x, y, z, ry, w = 0.8, h = 0.75) => {
      const m = add(new THREE.PlaneGeometry(w, h), winMat, x, y, z);
      m.rotation.y = ry;
      const fr = add(new THREE.BoxGeometry(w + 0.16, 0.1, 0.1), mats.wood, x, y - h / 2 - 0.05, z);
      fr.rotation.y = ry;
      const cross = add(new THREE.BoxGeometry(0.06, h, 0.04), mats.wood, x, y, z);
      cross.rotation.y = ry;
      return m;
    };
    win(-2.05, 1.2, D + 0.02, 0);
    win(2.05, 1.2, D + 0.02, 0);
    win(0, 3.25, D + 0.02, 0, 1.3, 1.0);
    for (const sx of [-1, 1]) for (const [y, z] of [[1.2, 0.8], [3.25, -1.2]]) win(sx * (W + 0.02), y, z, (sx * Math.PI) / 2);
    win(0, WALL + 0.7, D + 0.03, 0, 0.55, 0.55); // 屋頂下的小閣樓窗
    // 二樓小陽台
    add(new THREE.BoxGeometry(2.4, 0.12, 0.9), mats.wood, 0, loftY + 0.1, D + 0.45);
    for (let i = 0; i <= 6; i++) add(new THREE.BoxGeometry(0.06, 0.7, 0.06), mats.wood, -1.15 + i * 0.383, loftY + 0.5, D + 0.86);
    add(new THREE.BoxGeometry(2.4, 0.08, 0.08), mats.wood, 0, loftY + 0.86, D + 0.86);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.08, 0.9), mats.wood, sx * 1.2, loftY + 0.86, D + 0.45);
    // 木門
    add(new THREE.BoxGeometry(DOOR * 2 - 0.1, DOOR_H - 0.06, 0.08), mats.wood, 0, DOOR_H / 2, D - 0.02);
    add(new THREE.SphereGeometry(0.06, 8, 6), mats.gold ?? mats.accent, 0.5, 1.0, D + 0.05);
    // 煙囪
    add(new THREE.BoxGeometry(0.6, 1.6, 0.6), mats.trim ?? mats.wood, 1.5, WALL + 1.1, -1.2);
    // 門前的木頭小平台
    add(new THREE.BoxGeometry(2.6, 0.14, 0.9), mats.wood, 0, 0.07, D + 0.5);
    return;
  }
  // ---- 屋裡：樓梯、二樓閣樓 ----
  const loft = add(new THREE.BoxGeometry(W * 2 - 0.02, 0.16, -loftFront + D), mats.loft ?? mats.wood, 0, loftY - 0.08, (loftFront - D) / 2);
  loft.userData.loft = true;
  loft.name = 'loft';
  // 閣樓前緣的欄杆（樓梯那邊留開口）
  const railEnd = stairX0 - 0.05;
  const railLen = railEnd + W;
  add(new THREE.BoxGeometry(railLen, 0.07, 0.07), mats.wood, (railEnd - W) / 2, loftY + 0.8, loftFront);
  for (let x = -W + 0.2; x < railEnd; x += 0.45) add(new THREE.BoxGeometry(0.06, 0.8, 0.06), mats.wood, x, loftY + 0.4, loftFront);
  // 樓梯：一階一階（靠右牆，從前面往後面爬）
  const steps = 14;
  const run = (stairBottom - loftFront) / steps;
  for (let i = 0; i < steps; i++) {
    const y = ((i + 1) / steps) * loftY;
    const z = stairBottom - (i + 0.5) * run;
    add(new THREE.BoxGeometry(stairX1 - stairX0, 0.1, run + 0.02), mats.wood, (stairX0 + stairX1) / 2, y - 0.05, z);
  }
  // 樓梯扶手（靠屋裡那一側）
  const len = Math.hypot(stairBottom - loftFront, loftY);
  const hand = add(new THREE.BoxGeometry(0.06, 0.06, len), mats.wood, stairX0, loftY / 2 + 0.8, (stairBottom + loftFront) / 2);
  hand.rotation.x = Math.atan2(loftY, stairBottom - loftFront);
  // 後牆的圓窗（二樓可以自己擺家具）
  const round = add(new THREE.CircleGeometry(0.42, 16), mats.windowIn ?? winMat, 0, loftY + 1.3, -D + 0.03);
  round.rotation.y = 0;
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
