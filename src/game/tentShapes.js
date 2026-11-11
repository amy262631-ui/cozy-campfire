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
/**
 * 🎫 月票小屋（11/11 上架：小舖「🎫 月票」分頁；伺服器 server/homes.js 的 TENT_SHAPES 也有）
 *   🔭 玻璃星空圓頂屋 300（兩種月票都能買）、🌳 私人樹屋 500（星空月票，有二樓）
 *   pass：需要的月票等級（1 小營火以上、2 星空）；買了永久保留，月票到期也能繼續用
 */
export const PASS_SHAPES = [
  { id: 'stardome', icon: '🔭', name: t('玻璃星空圓頂屋'), price: 300, pass: 1, kind: 'round', R: 3.8, light: 2.4, style: 'log' },
  { id: 'treehouse', icon: '🌳', name: t('私人樹屋'), price: 500, pass: 2, kind: 'rect', W: 3.4, D: 3.4, light: 3.6, style: 'log', loft: true },
];
export const TENT_SHAPE_BY_ID = Object.fromEntries([...TENT_SHAPES, ...PASS_SHAPES].map((s) => [s.id, s]));
export const shapeOf = (id) => TENT_SHAPE_BY_ID[id] ?? TENT_SHAPES[0];

const GAP = 0.3; // 門口開口（弧度的一半）

/**
 * 蓋出帳篷本體（不含地板）。門口一律朝 +z。
 *   mats.canvas 帆布、mats.accent 收邊／門簾、mats.wood 木頭、mats.trim 第二配色（菇柄、內裡）
 *   outside：true＝從外面看的版本（多了旗子、彩旗、窗戶、營釘這些外部裝飾）
 *   noPole：不要中柱
 */
export function buildTentShell(shapeId, mats, { outside = false, noPole = false, frame = 'gold', noSwing = false } = {}) {
  const sh = shapeOf(shapeId);
  frameNow = frame;
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
  if (sh.id === 'stardome') buildStarDome(sh, mats, add, outside, g);
  if (sh.id === 'treehouse') {
    if (outside) buildTreeHouseOutside(mats, add, noSwing);
    else buildTreeHouseInside(sh, mats, add, g);
  }
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

// ───────────── 🎫 月票小屋 ─────────────
const passMat = {};
const pm = (k, make) => (passMat[k] ??= make());
const glassMat = () =>
  pm('glass', () => new THREE.MeshStandardMaterial({ color: 0xbfe2ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
const frostMat = () =>
  pm('frost', () => new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
/** 🔭 星空圓頂屋的骨架顏色（玩家可以換；h.frame） */
export const FRAME_COLORS = [
  { id: 'gold', icon: '🟡', zh: '金色', color: 0xd9a84a, metal: 0.6 },
  { id: 'silver', icon: '⚪', zh: '銀色', color: 0xd4d9e0, metal: 0.7 },
  { id: 'white', icon: '🤍', zh: '奶油白', color: 0xf3ede2, metal: 0.1 },
  { id: 'black', icon: '⚫', zh: '黑色', color: 0x34302e, metal: 0.4 },
  { id: 'copper', icon: '🟠', zh: '紅銅', color: 0xc0703f, metal: 0.6 },
];
export const FRAME_BY_ID = Object.fromEntries(FRAME_COLORS.map((f) => [f.id, f]));
let frameNow = 'gold'; // 蓋殼的時候用哪個骨架顏色（buildTentShell 設定）
const brassMat = () => {
  const f = FRAME_BY_ID[frameNow] ?? FRAME_COLORS[0];
  return pm(`brass-${f.id}`, () => new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.35, metalness: f.metal, flatShading: true }));
};
const glowMat = (c = 0xffd98a) => pm(`glow${c}`, () => new THREE.MeshBasicMaterial({ color: c }));
const leafMat = (i) => pm(`leaf${i}`, () => new THREE.MeshStandardMaterial({ color: [0x4f8a3c, 0x5f9c45, 0x3f7533, 0x6aa84f][i % 4], roughness: 1, flatShading: true }));
const barkMat = () => pm('bark', () => new THREE.MeshStandardMaterial({ color: 0x5e4029, roughness: 1, flatShading: true }));
const ropeMat = () => pm('rope', () => new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 1 }));

/** 圓圓、邊緣柔柔的光點貼圖（星星用，不要方塊） */
function dotTexture() {
  return pm('dotTex', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  });
}
/** 夜空底色：頭頂深藍、地平線帶一點紫，中間斜斜一條淡淡的銀河 */
function skyTexture() {
  return pm('skyTex', () => {
    const W = 512;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04071c');
    g.addColorStop(0.55, '#0c1236');
    g.addColorStop(1, '#2a2052');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // 銀河：沿著一條斜線灑很多半透明的霧點
    for (let i = 0; i < 900; i++) {
      const u = rnd();
      const off = (rnd() - 0.5) * (rnd() * 70);
      const px = u * W;
      const py = H * 0.25 + Math.sin(u * Math.PI * 2) * 40 + off;
      const r = 6 + rnd() * 18;
      const gg = x.createRadialGradient(px, py, 0, px, py, r);
      const tint = rnd() < 0.5 ? '180,190,255' : '230,200,255';
      gg.addColorStop(0, `rgba(${tint},0.08)`);
      gg.addColorStop(1, `rgba(${tint},0)`);
      x.fillStyle = gg;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}
/** 一片星空：漸層夜空＋銀河＋大中小三種圓星星（有的偏暖、有的偏藍）。圓頂屋裡抬頭看得到 */
function starField(r = 16) {
  const grp = new THREE.Group();
  grp.name = 'stars';
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(r + 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    pm('skyMat', () => new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })),
  );
  sky.renderOrder = -1;
  grp.add(sky);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [n, size, op] of [[520, 0.22, 0.75], [140, 0.42, 0.9], [26, 0.75, 1]]) {
    const pos = [];
    const col = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const y = 0.12 + Math.pow(rnd(), 0.8) * 0.88;
      const h = Math.sqrt(1 - y * y);
      pos.push(Math.cos(a) * h * r, y * r, Math.sin(a) * h * r);
      const k = rnd();
      const c = k < 0.18 ? [1, 0.9, 0.7] : k < 0.36 ? [0.75, 0.85, 1] : [1, 1, 1];
      col.push(...c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = pm(`stars${size}`, () => new THREE.PointsMaterial({ size, map: dotTexture(), vertexColors: true, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true, fog: false }));
    grp.add(new THREE.Points(geo, m));
  }
  return grp;
}

/** 🔭 玻璃星空圓頂屋：矮矮的原木圍牆＋透明玻璃圓頂（黃銅骨架），晚上躺著看得到星星 */
function buildStarDome(sh, mats, add, outside, g) {
  const R = sh.R;
  const BASE = 0.75; // 原木圍牆高度
  const SY = 0.82; // 圓頂壓扁一點
  // 原木圍牆（門口留空）
  add(new THREE.CylinderGeometry(R, R, BASE, 40, 1, true, GAP, Math.PI * 2 - GAP * 2), mats.canvas, 0, BASE / 2, 0);
  const cap = add(new THREE.TorusGeometry(R, 0.09, 6, 40, Math.PI * 2 - GAP * 2), mats.wood, 0, BASE, 0);
  cap.rotation.x = Math.PI / 2;
  cap.rotation.z = Math.PI / 2 + GAP;
  // 玻璃圓頂
  const glass = add(new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat(), 0, BASE, 0);
  glass.scale.y = SY;
  glass.renderOrder = 2;
  // 黃銅骨架：8 條經線＋2 圈緯線＋頂端小圓環
  for (let i = 0; i < 8; i++) {
    const rib = add(new THREE.TorusGeometry(R + 0.01, 0.04, 5, 24, Math.PI / 2), brassMat(), 0, BASE, 0);
    rib.scale.y = SY;
    rib.rotation.y = (i / 8) * Math.PI * 2 + Math.PI / 8; // 1/4 圓：從地面彎到頂
  }
  for (const k of [0.45, 0.8]) {
    const ring = add(new THREE.TorusGeometry(R * Math.sqrt(1 - k * k) + 0.01, 0.035, 5, 40), brassMat(), 0, BASE + R * k * SY, 0);
    ring.rotation.x = Math.PI / 2;
  }
  const top = add(new THREE.TorusGeometry(0.35, 0.07, 6, 16), brassMat(), 0, BASE + R * SY, 0);
  top.rotation.x = Math.PI / 2;
  // 圓拱木門框（從圍牆往上，穿過玻璃）
  const dz = R * Math.cos(GAP) - 0.02;
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.14, 1.9, 0.16), mats.wood, sx * 1.05, 0.95, dz);
  const arch = add(new THREE.TorusGeometry(1.05, 0.08, 6, 16, Math.PI), mats.wood, 0, 1.9, dz);
  arch.rotation.z = 0;
  if (outside) {
    // 作者 11/09：外面看進去不顯示真正的家具 → 玻璃下半霧面＋屋裡暖暖的燈光（看得出有人住）
    const frost = add(new THREE.SphereGeometry(R + 0.02, 40, 6, 0, Math.PI * 2, Math.PI / 2 - 0.62, 0.62), frostMat(), 0, BASE, 0);
    frost.scale.y = SY;
    frost.renderOrder = 3;
    const warm = add(new THREE.CircleGeometry(R - 0.1, 32), glowMat(0xe9bf86), 0, BASE + 0.02, 0);
    warm.rotation.x = -Math.PI / 2;
    // 門前的小木平台
    add(new THREE.BoxGeometry(2.6, 0.12, 1.0), mats.wood, 0, 0.06, R + 0.35);
    // 門邊的望遠鏡（三腳架）
    const tx = 2.3;
    const tz = R + 0.5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = add(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), mats.wood, tx + Math.cos(a) * 0.22, 0.58, tz + Math.sin(a) * 0.22);
      leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    }
    const tube = add(new THREE.CylinderGeometry(0.07, 0.11, 1.0, 10), brassMat(), tx, 1.3, tz);
    tube.rotation.x = -0.9;
    tube.rotation.z = 0.3;
    // 圍牆上一圈小星星燈
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < GAP + 0.1) continue;
      add(new THREE.OctahedronGeometry(0.07, 0), glowMat(0xfff1b8), Math.sin(a) * (R + 0.05), BASE + 0.12, Math.cos(a) * (R + 0.05));
    }
  } else {
    // 屋裡：抬頭就是星空（只在玻璃後面看得到）
    g.add(starField());
    // 一顆小月亮
    add(new THREE.SphereGeometry(0.7, 16, 12), glowMat(0xfff4d6), -6, 11, -7);
    const halo = new THREE.Sprite(pm('halo', () => new THREE.SpriteMaterial({ map: dotTexture(), color: 0xfff0c8, transparent: true, opacity: 0.35, depthWrite: false, fog: false })));
    halo.position.set(-6, 11, -7);
    halo.scale.setScalar(4.5);
    g.add(halo);
  }
}

/** 一團葉子 */
/** 樹冠的一團葉子（11/11 試過圓滑版，作者覺得原本的多角形比較好看，改回來） */
function leafBall(add, x, y, z, r, i) {
  const m = add(new THREE.IcosahedronGeometry(r, 0), leafMat(i), x, y, z);
  m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  m.scale.y = 0.75;
  return m;
}

/** 🌳 私人樹屋（外面）：大樹幹撐著一間小木屋，樹冠蓋在屋頂上，繩梯爬上門口，旁邊有鞦韆 */
/** 🌳 樹屋外面的鞦韆和陽台座位位置（營地用：鞦韆另外做成會盪的、陽台椅子可以坐） */
export const TREEHOUSE_SPOTS = { branch: { x: -5.8, y: 4.0, z: 2.2 }, table: { x: 2.0, y: 1.6, z: 2.95 }, chairs: [{ x: 1.38, y: 2.0, z: 2.95, face: Math.PI / 2 }, { x: 2.62, y: 2.0, z: 2.95, face: -Math.PI / 2 }] };
function buildTreeHouseOutside(mats, add, noSwing = false) {
  const P = 1.6; // 平台高度
  const W = 2.7;
  const D = 2.4;
  const WALL = 2.6;
  const RH = 1.4;
  // 樹幹＋樹根
  // 樹幹在屋子左後角，從地上一路穿過屋簷長到樹冠裡
  const TX = -3.5;
  const TZ = 1.6;
  const TH = P + WALL + RH + 1.4;
  add(new THREE.CylinderGeometry(0.55, 0.9, TH, 9), barkMat(), TX, TH / 2, TZ);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const root = add(new THREE.ConeGeometry(0.38, 1.5, 5), barkMat(), TX + Math.cos(a) * 0.9, 0.3, TZ + Math.sin(a) * 0.9);
    root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
  }
  // 平台＋斜撐
  add(new THREE.BoxGeometry(W * 2 + 0.6, 0.22, D * 2 + 1.4), mats.wood, 0, P, 0.35);
  for (const [x, z] of [[W, D + 1.0], [-W, D + 1.0], [W, -D], [-W, -D]]) add(new THREE.CylinderGeometry(0.12, 0.14, P, 6), barkMat(), x, P / 2, z);
  // 牆（木板）
  const box = (w, h, d, x, y, z, m = mats.canvas) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  box(W * 2, WALL, 0.12, 0, P + WALL / 2, -D);
  box(0.12, WALL, D * 2, W, P + WALL / 2, 0);
  box(0.12, WALL, D * 2, -W, P + WALL / 2, 0);
  box(W - 0.6, WALL, 0.12, -(W + 0.6) / 2, P + WALL / 2, D);
  box(W - 0.6, WALL, 0.12, (W + 0.6) / 2, P + WALL / 2, D);
  box(1.2, WALL - 1.9, 0.12, 0, P + 1.9 + (WALL - 1.9) / 2, D);
  // 山牆
  const tri = new THREE.Shape();
  tri.moveTo(-W, 0);
  tri.lineTo(W, 0);
  tri.lineTo(0, RH);
  tri.closePath();
  for (const z of [D + 0.06, -D - 0.06]) add(new THREE.ShapeGeometry(tri), mats.accentDouble ?? mats.canvas, 0, P + WALL, z);
  // 斜屋頂
  const slope = Math.atan2(RH, W);
  const len = Math.hypot(W + 0.5, RH + 0.35);
  for (const sx of [-1, 1]) {
    const r = add(new THREE.BoxGeometry(len, 0.14, D * 2 + 0.9), mats.accentDouble ?? mats.accent, (sx * (W + 0.5)) / 2 - sx * 0.05, P + WALL + RH / 2 - 0.1, 0);
    r.rotation.z = -sx * slope;
  }
  // 門
  box(1.1, 1.85, 0.08, 0, P + 0.93, D + 0.02, mats.wood);
  add(new THREE.SphereGeometry(0.06, 8, 6), mats.gold ?? brassMat(), 0.38, P + 0.95, D + 0.09);
  // 圓窗（亮著）
  const round = (x, y, z, ry, r = 0.36) => {
    const w = add(new THREE.CircleGeometry(r, 16), mats.window ?? glowMat(), x, y, z);
    w.rotation.y = ry;
    const fr = add(new THREE.TorusGeometry(r, 0.06, 6, 16), mats.wood, x, y, z);
    fr.rotation.y = ry;
  };
  round(-1.75, P + 1.45, D + 0.07, 0);
  round(1.75, P + 1.45, D + 0.07, 0);
  round(W + 0.07, P + 1.5, 0.6, Math.PI / 2);
  round(-W - 0.07, P + 1.5, 0.6, -Math.PI / 2);
  round(0, P + WALL + 0.55, D + 0.08, 0, 0.28);
  // 門口小陽台欄杆（前面中間留給繩梯）
  const fz = D + 1.0;
  for (const sx of [-1, 1]) {
    for (let x = 0.8; x <= W + 0.25; x += 0.42) box(0.06, 0.7, 0.06, sx * x, P + 0.45, fz, mats.wood);
    box(W - 0.5, 0.07, 0.07, (sx * (W + 0.3 + 0.8)) / 2, P + 0.82, fz, mats.wood);
  }
  // 繩梯：從陽台垂到地上
  for (const sx of [-1, 1]) {
    const rope = add(new THREE.CylinderGeometry(0.025, 0.025, P + 0.1, 5), ropeMat(), sx * 0.32, P / 2, fz + 0.25);
    rope.rotation.x = 0.12;
  }
  for (let i = 0; i < 6; i++) {
    const y = 0.2 + i * (P / 6.2);
    box(0.72, 0.06, 0.1, 0, y, fz + 0.25 + (P / 2 - y) * 0.12, mats.wood);
  }
  // 陽台的小桌子＋兩張椅子（作者 11/09：可以坐）
  const tbx = 2.0;
  const tbz = D + 0.55;
  add(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), mats.wood, tbx, P + 0.62, tbz);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mats.wood, tbx, P + 0.36, tbz);
  for (const sx of [-1, 1]) {
    const cx = tbx + sx * 0.62;
    box(0.36, 0.06, 0.36, cx, P + 0.4, tbz, mats.wood);
    box(0.06, 0.4, 0.36, cx + sx * 0.18, P + 0.6, tbz, mats.wood);
    for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) box(0.04, 0.3, 0.04, cx + dx, P + 0.25, tbz + dz, mats.wood);
  }
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), mats.accent, tbx, P + 0.71, tbz);
  // 陽台掛的小燈籠
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), ropeMat(), -1.0, P + WALL - 0.25, D + 0.5);
  add(new THREE.SphereGeometry(0.13, 10, 8), glowMat(0xffc46b), -1.0, P + WALL - 0.55, D + 0.5);
  // 樹冠：屋頂上面一大團、四周幾團
  const top = P + WALL + RH;
  const balls = [
    [-1.6, top + 1.5, -1.2, 2.0], [0.4, top + 1.2, -1.0, 1.6], [-0.4, top + 2.6, -0.8, 1.5], [1.9, top + 0.6, -0.8, 1.3],
    [-3.3, top + 0.9, 1.2, 1.4], [-2.8, top - 0.6, 0.9, 1.0], [-3.0, top + 1.6, -1.9, 1.3], [0.8, top + 2.3, 0.6, 1.1],
    [-1.4, top + 0.9, 1.2, 1.0], [2.9, top - 0.5, 0.3, 0.9], [-2.2, top - 0.4, 2.0, 0.75], [1.6, top + 1.6, -2.0, 1.2],
  ];
  balls.forEach(([x, y, z, r], i) => leafBall(add, x, y, z, r, i));
  // 樹幹往左伸一根粗樹枝，掛一個木板鞦韆
  const bx = TX - 2.3;
  const by = P + WALL - 0.2;
  const branch = add(new THREE.CylinderGeometry(0.1, 0.2, 2.8, 6), barkMat(), (TX + bx) / 2 - 0.2, by + 0.25, TZ + 0.6);
  branch.rotation.z = Math.PI / 2 + 0.2;
  leafBall(add, bx - 0.5, by + 0.4, TZ + 0.6, 0.85, 3);
  if (noSwing) return; // 營地裡：鞦韆另外做（會盪、可以坐）
  for (const dz of [-0.28, 0.28]) add(new THREE.CylinderGeometry(0.015, 0.015, by - 0.5, 4), ropeMat(), bx, (by + 0.5) / 2, TZ + 0.6 + dz);
  box(0.4, 0.06, 0.7, bx, 0.5, TZ + 0.6, mats.wood);
}

/** 🌳 私人樹屋（屋裡）：跟小木屋一樣有二樓（同一套樓梯和閣樓），多了一根穿過屋子的大樹幹、看得到樹葉的窗、垂下來的藤蔓小燈 */
function buildTreeHouseInside(sh, mats, add, g) {
  const winGreen = pm('leafWin', () => new THREE.MeshBasicMaterial({ color: 0x6fae5a }));
  buildCabin(sh, { ...mats, windowIn: winGreen }, add, false);
  // 穿過屋子的樹幹（左後角，碰不到樓梯）
  const H = CABIN.wall + CABIN.roof;
  add(new THREE.CylinderGeometry(0.42, 0.55, H, 9), barkMat(), -sh.W + 0.75, H / 2, -sh.D + 0.75);
  // 牆上的圓窗：外面是樹葉
  for (const [x, y, z, ry] of [[sh.W - 0.03, 1.4, -0.6, -Math.PI / 2], [-sh.W + 0.03, 1.4, 1.2, Math.PI / 2], [sh.W - 0.03, CABIN.loftY + 1.2, -2.2, -Math.PI / 2]]) {
    const w = add(new THREE.CircleGeometry(0.42, 16), winGreen, x, y, z);
    w.rotation.y = ry;
    const fr = add(new THREE.TorusGeometry(0.42, 0.06, 6, 16), mats.wood, x, y, z);
    fr.rotation.y = ry;
    for (const [dx, dy] of [[0.12, 0.08], [-0.15, -0.1], [0.05, -0.2]]) {
      const lf = add(new THREE.CircleGeometry(0.11, 5), leafMat(1), x + (ry < 0 ? -0.01 : 0.01), y + dy, z + dx);
      lf.rotation.y = ry;
    }
  }
  // 藤蔓（作者 11/09：不要垂直站著，要從屋頂自然纏繞，也不能擋到擺設）
  // ①沿著樹幹螺旋往上爬 ②從樹幹頂沿屋脊、屋頂斜面爬開 ③沿著四面牆的最上緣一圈，偶爾垂下短短一小段；中間夾著小燈泡
  const TRX = -sh.W + 0.75;
  const TRZ = -sh.D + 0.75;
  const W = sh.W;
  const D = sh.D;
  const top = CABIN.wall;
  const ridge = CABIN.wall + CABIN.roof;
  const vine = (pts, leafEvery = 0.42, bulbEvery = 0) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const len = curve.getLength();
    add(new THREE.TubeGeometry(curve, Math.max(8, Math.round(len * 6)), 0.022, 4, false), pm('vineStem', () => new THREE.MeshStandardMaterial({ color: 0x5a5a2e, roughness: 1 })));
    const n = Math.floor(len / leafEvery);
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const p = curve.getPointAt(u);
      const tg = curve.getTangentAt(u);
      const side = i % 2 ? 1 : -1;
      const lf = add(new THREE.OctahedronGeometry(0.085, 0), leafMat(i % 4), p.x + tg.z * 0.06 * side, p.y - 0.03, p.z - tg.x * 0.06 * side);
      lf.scale.set(1.5, 0.45, 1);
      lf.rotation.y = Math.atan2(tg.x, tg.z) + side * 0.6;
    }
    if (bulbEvery) {
      const m = Math.floor(len / bulbEvery);
      for (let i = 1; i <= m; i++) {
        const p = curve.getPointAt((i - 0.5) / m);
        add(new THREE.SphereGeometry(0.05, 8, 6), glowMat(0xffe6a0), p.x, p.y - 0.07, p.z);
      }
    }
    return curve;
  };
  // ① 繞著樹幹爬上去（從腰的高度開始，不擋地上的家具）
  const helix = [];
  for (let i = 0; i <= 28; i++) {
    const a = i * 0.55;
    const y = 0.9 + (i / 28) * (ridge - 1.1);
    const r = 0.5 - (i / 28) * 0.08;
    helix.push([TRX + Math.cos(a) * r, y, TRZ + Math.sin(a) * r]);
  }
  vine(helix, 0.38);
  // ② 從樹幹頂沿著屋脊往前爬，兩條分支沿屋頂斜面往下
  const yRoof = (x) => top + CABIN.roof * (1 - Math.abs(x) / W) - 0.12;
  vine([[TRX + 0.3, yRoof(TRX + 0.3), TRZ], [-0.6, yRoof(-0.6), -D + 0.6], [0, yRoof(0), -0.6], [0.15, yRoof(0.15), 0.8], [-0.1, yRoof(-0.1), D - 0.3]], 0.45, 0.75);
  vine([[0, yRoof(0), -0.6], [1.0, yRoof(1.0), -0.2], [2.0, yRoof(2.0), 0.3], [W - 0.2, yRoof(W - 0.2), 0.1]], 0.45, 0.7);
  vine([[0.15, yRoof(0.15), 0.8], [-1.0, yRoof(-1.0), 1.3], [-2.2, yRoof(-2.2), 1.9], [-W + 0.2, yRoof(-W + 0.2), 2.2]], 0.45, 0.7);
  // ③ 牆的最上緣一圈（微微下垂成弧）
  const sag = (a, b, n = 4) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([a[0] + (b[0] - a[0]) * u, top - 0.12 - Math.sin(u * Math.PI) * 0.18, a[1] + (b[1] - a[1]) * u]);
    }
    return pts;
  };
  const e = 0.12;
  vine(sag([-W + e, -D + 1.4], [W - e, -D + e]), 0.5, 0.9);
  vine(sag([W - e, -D + e], [W - e, D - e]), 0.5, 0.9);
  vine(sag([-W + e, D - e], [-W + e, -D + 1.4]), 0.5, 0.9);
  // 偶爾垂下一小段（靠牆，不超過 40 公分）
  for (const [x, z] of [[W - 0.15, -1.6], [W - 0.15, 1.4], [-W + 0.15, 0.4], [0.8, -D + 0.15], [-1.4, -D + 0.15]]) {
    vine([[x, top - 0.2, z], [x + 0.03, top - 0.38, z], [x - 0.02, top - 0.58, z]], 0.25);
  }
}
