import * as THREE from 'three';
import { buildOutfit } from '../player/outfit3d.js';
import { OUTFIT_BY_ID } from './outfits.js';
import { t } from '../i18n/i18n.js';
import { FURNITURE_CATALOG, FURNITURE_CATS, FURNITURE_COLORS, PASS_COLORS } from './furnitureCatalog.js';
import { FISH } from '../fishing/fishData.js';

/**
 * 家具：資料（價格、分類、疊放規則）在 furnitureCatalog.js，前端、伺服器共用。
 * 這裡加上翻譯後的名稱和 3D 模型。每樣家具佔帳篷地板的一格（0.8 公尺見方）。
 */
export const TENT_PRICE = 30;
const withName = (f) => ({ ...f, name: t(f.zh) });
/** 小舖賣的家具 */
export const FURNITURE = FURNITURE_CATALOG.filter((f) => !f.gift && !f.craft).map(withName);
/** 🔨 手作家具 */
export const CRAFT_FURNITURE = FURNITURE_CATALOG.filter((f) => f.craft).map(withName);
/**
 * 🎁 分享禮物：小舖買不到，只能靠分享、邀朋友拿到
 *   how：拿到的方式（顯示用）
 */
export const GIFT_FURNITURE = FURNITURE_CATALOG.filter((f) => f.gift).map((f) => ({ ...withName(f), how: f.gift }));
/** 布置時背包會列出的所有家具（買的＋送的） */
export const ALL_FURNITURE = [...FURNITURE, ...GIFT_FURNITURE, ...CRAFT_FURNITURE];
export const FURNITURE_BY_ID = Object.fromEntries(ALL_FURNITURE.map((f) => [f.id, f]));
export const CATS = FURNITURE_CATS.map(withName);

// 同一種顏色的材質共用一份（家具一多，材質數量差很多）
const matCache = new Map();
const mat = (color, extra) => {
  const key = extra ? `${color}|${JSON.stringify(extra)}` : color;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra }));
  return matCache.get(key);
};
const glow = (color) => {
  const key = `g${color}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color }));
  return matCache.get(key);
};
const glass = (color, opacity = 0.35) => mat(color, { transparent: true, opacity, roughness: 0.2, flatShading: false, depthWrite: false });

/** 做一件家具的模型（中心在格子正中央、底部貼地） */
export function buildFurniture(id, opts = {}) {
  const g = new THREE.Group();
  const box = (w, h, d, m, x = 0, y = h / 2, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const cyl = (rt, rb, h, m, x = 0, y = h / 2, z = 0, seg = 10) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const ball = (r, m, x = 0, y = r, z = 0, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    return mesh;
  };

  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const cone = (r, h, m, x = 0, y = h / 2, z = 0, seg = 8) => add(new THREE.ConeGeometry(r, h, seg), m, x, y, z);
  const torus = (R, r, m, x = 0, y = 0, z = 0, arc = Math.PI * 2, seg = 16) => add(new THREE.TorusGeometry(R, r, 6, seg, arc), m, x, y, z);
  /** 半球（圓頂朝上） */
  const dome = (r, m, x = 0, y = 0, z = 0, sy = 1) => {
    const d = add(new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), m, x, y, z);
    d.scale.y = sy;
    return d;
  };
  /** 平面形狀加厚（躺在地上，y 從 0 到 depth） */
  const flat = (shape, depth, m, x = 0, y = 0, z = 0) => {
    const mesh = add(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), m, x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };
  /** 立著的平面形狀（面向 +z） */
  const stand = (shape, depth, m, x = 0, y = 0, z = 0) => add(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), m, x, y, z - depth / 2);
  /** 可愛的臉：在球形的頭（中心 cx,cy,cz、半徑 R）正面貼上眼睛和腮紅 */
  const face = (cx, cy, cz, R, { blush = true, eye = 0x2a1a14, spread = 0.36, flatFace = false } = {}) => {
    // flatFace：平面的東西（星星燈），五官直接貼在 z = cz
    const on = (dx, dy) => (flatFace ? cz + R * 0.06 : cz + Math.sqrt(Math.max(0, R * R - dx * dx - dy * dy)));
    for (const s of [-1, 1]) {
      const ex = s * R * spread;
      const ey = R * 0.12;
      ball(R * 0.13, mat(eye), cx + ex, cy + ey, on(ex, ey) - R * 0.04);
      if (blush) {
        const bx = s * R * 0.62;
        const by = -R * 0.14;
        ball(R * 0.15, mat(0xffa3ad), cx + bx, cy + by, on(bx, by) - R * 0.06, 1, 0.6, 0.45);
      }
    }
  };
  const heart = (sz) => {
    const s = new THREE.Shape();
    s.moveTo(0, -sz);
    s.bezierCurveTo(sz * 0.2, -sz * 0.75, sz * 1.2, -sz * 0.15, sz * 1.2, sz * 0.35);
    s.bezierCurveTo(sz * 1.2, sz * 0.95, sz * 0.4, sz * 1.15, 0, sz * 0.6);
    s.bezierCurveTo(-sz * 0.4, sz * 1.15, -sz * 1.2, sz * 0.95, -sz * 1.2, sz * 0.35);
    s.bezierCurveTo(-sz * 1.2, -sz * 0.15, -sz * 0.2, -sz * 0.75, 0, -sz);
    return s;
  };
  const star = (ro, ri = ro * 0.45) => {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? ri : ro;
      if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
  };
  /** 陶土小花盆（回傳盆口高度） */
  const pot = (r, h, color = 0xd98a5a) => {
    cyl(r, r * 0.78, h, mat(color));
    cyl(r * 1.08, r * 1.08, h * 0.22, mat(color), 0, h - h * 0.11);
    cyl(r * 0.92, r * 0.92, 0.01, mat(0x5a3c26), 0, h + 0.002);
    return h;
  };
  const DARK = 0x2a1a14;

  switch (id) {
    // ---------- 🔨 手作家具 ----------
    case 'shellchime': {
      // 漂流木橫桿上掛著一串串小貝殼
      const wood = mat(0xb8a088);
      cyl(0.03, 0.035, 1.1, wood, -0.28, 0.55);
      cyl(0.03, 0.035, 1.1, wood, 0.28, 0.55);
      const bar = cyl(0.03, 0.03, 0.66, wood, 0, 1.08);
      bar.rotation.z = Math.PI / 2;
      const shellC = [0xf3d8c8, 0xf3b0c0, 0xe8c8a8, 0xffffff];
      for (let k = 0; k < 4; k++) {
        const x = -0.2 + k * 0.135;
        cyl(0.004, 0.004, 0.3, mat(0xcfc8b8), x, 0.92, 0, 4);
        for (let j = 0; j < 3; j++) ball(0.03, mat(shellC[(k + j) % 4]), x, 0.74 + j * 0.09, 0, 1, 0.7, 0.4);
      }
      break;
    }
    case 'stonetower': {
      let y = 0;
      const cs = [0x8a8a84, 0xa89a8a, 0x6a7a6a, 0xd8d8d0, 0xc98a7a];
      for (let k = 0; k < 5; k++) {
        const r = 0.13 - k * 0.02;
        ball(r, mat(cs[k]), (k % 2 ? 0.01 : -0.01), y + r * 0.55, 0, 1, 0.55, 1);
        y += r * 1.05;
      }
      break;
    }
    case 'wreath': {
      const ring = torus(0.15, 0.035, mat(0x5f8a4a), 0, 0.2, 0);
      ring.rotation.x = -0.3;
      const fc = [0xffd84a, 0xf3a6c0, 0xffffff, 0x8a5ac9, 0x7ab8f2];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        ball(0.035, mat(fc[k % 5]), Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15 * Math.cos(0.3), Math.sin(a) * 0.15 * Math.sin(0.3) + 0.03);
      }
      cyl(0.012, 0.012, 0.12, mat(0x7a5236), 0, 0.06, -0.03, 4);
      break;
    }
    case 'jam': {
      const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.15 });
      cyl(0.08, 0.08, 0.16, mat(0xa8223a), 0, 0.075);
      cyl(0.085, 0.085, 0.17, glass, 0, 0.085);
      cyl(0.09, 0.09, 0.03, mat(0xf3e0c8), 0, 0.185);
      cyl(0.11, 0.11, 0.01, mat(0xd2453c), 0, 0.2);
      break;
    }
    case 'terrarium': {
      const glass = new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.28, roughness: 0.1 });
      cyl(0.13, 0.13, 0.04, mat(0x5a4030), 0, 0.02);
      cyl(0.12, 0.12, 0.04, mat(0x4a7a3a), 0, 0.05);
      for (const [x, z, c, sc] of [[-0.04, 0, 0xd2453c, 1], [0.05, 0.03, 0xf0a83a, 0.7], [0.01, -0.05, 0xf3ecdf, 0.6]]) {
        cyl(0.012 * sc, 0.015 * sc, 0.08 * sc, mat(0xf3ecdf), x, 0.07 + 0.04 * sc, z, 6);
        dome(0.04 * sc, mat(c), x, 0.07 + 0.08 * sc, z, 0.7);
      }
      add(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 0.07, 0).scale.y = 1.2;
      break;
    }
    case 'pumpkinlamp': {
      const glow = new THREE.MeshStandardMaterial({ color: 0xe0782a, emissive: 0xff8a20, emissiveIntensity: 0.55, roughness: 0.7 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ball(0.09, glow, Math.cos(a) * 0.06, 0.12, Math.sin(a) * 0.06, 0.8, 1, 0.8);
      }
      cyl(0.015, 0.02, 0.07, mat(0x4a6a2a), 0, 0.25);
      for (const s2 of [-1, 1]) ball(0.022, mat(0xffe08a, { emissive: 0xffd060, emissiveIntensity: 1 }), s2 * 0.045, 0.15, 0.15);
      break;
    }
    case 'cornhang': {
      const wood = mat(0x7a5236);
      cyl(0.03, 0.035, 1.2, wood, 0, 0.6);
      cyl(0.16, 0.18, 0.04, wood, 0, 0.02);
      for (let k = 0; k < 3; k++) {
        const a = -0.4 + k * 0.4;
        const corn = ball(0.05, mat(0xf2c94e), Math.sin(a) * 0.09, 0.82, 0.07 + Math.cos(a) * 0.02, 1, 2.6, 1);
        corn.rotation.z = a * 0.6;
        const husk = cone(0.05, 0.14, mat(0xc8b070), Math.sin(a) * 0.08, 1.02, 0.07);
        husk.rotation.x = Math.PI;
      }
      break;
    }
    case 'vegbasket': {
      cyl(0.17, 0.13, 0.13, mat(0xb08a5a), 0, 0.065, 0, 14);
      torus(0.17, 0.015, mat(0x8a6a3a), 0, 0.13, 0).rotation.x = Math.PI / 2;
      ball(0.05, mat(0xe0443c), -0.06, 0.15, 0.03);
      ball(0.06, mat(0x8ac96a), 0.06, 0.15, -0.02);
      const ca = cone(0.025, 0.14, mat(0xf08a3c), 0, 0.17, 0.06);
      ca.rotation.x = 1.2;
      ball(0.045, mat(0xc8a06a), 0.02, 0.15, -0.08);
      break;
    }
    case 'driftshelf': {
      const wood = mat(0xb8a088);
      for (const x of [-0.3, 0.3]) cyl(0.04, 0.05, 0.5, wood, x, 0.25);
      box(0.72, 0.05, 0.3, wood, 0, 0.475);
      box(0.66, 0.04, 0.26, wood, 0, 0.2);
      ball(0.05, mat(0x9a9a94), -0.18, 0.25, 0, 1, 0.6, 1);
      ball(0.04, mat(0xf3b0c0), 0.15, 0.24, 0.02, 1, 0.5, 0.8);
      break;
    }
    // ---------- 🔨 11/07 擴充：♻️ 回收手作 ----------
    case 'bottle_lamp': {
      // 寶特瓶小燈：兩個瓶子裡關著發光的螢火蟲
      const pet = glass(0x9fd8ff, 0.4);
      for (const x of [-0.06, 0.06]) {
        cyl(0.045, 0.045, 0.16, pet, x, 0.08, 0, 10);
        cyl(0.02, 0.035, 0.04, pet, x, 0.18, 0, 8);
        cyl(0.022, 0.022, 0.02, mat(0x4a74b5), x, 0.21, 0, 8);
        for (let k = 0; k < 3; k++) ball(0.012, glow(0xd8ff7a), x + (k - 1) * 0.015, 0.05 + k * 0.035, 0.01 * k);
      }
      break;
    }
    case 'tire_swing': {
      // 輪胎鞦韆：木架吊著一個舊輪胎（可以坐）
      const wood = mat(0xb8a088);
      for (const x of [-0.36, 0.36]) {
        const leg = cyl(0.035, 0.045, 1.5, wood, x, 0.72, 0);
        leg.rotation.z = x > 0 ? 0.08 : -0.08;
      }
      const bar = cyl(0.035, 0.035, 0.84, wood, 0, 1.45, 0);
      bar.rotation.z = Math.PI / 2;
      for (const x of [-0.12, 0.12]) cyl(0.008, 0.008, 1.0, mat(0xd8c8a0), x, 0.95, 0, 4);
      const tire = torus(0.2, 0.07, mat(0x2a2a2a), 0, 0.42, 0, Math.PI * 2, 14);
      tire.rotation.x = Math.PI / 2;
      break;
    }
    case 'bottle_charm': {
      // 漂流瓶吊飾：漂流木架上掛著一個裝了小貝殼的玻璃瓶
      const wood = mat(0xb8a088);
      cyl(0.03, 0.04, 1.0, wood, 0, 0.5);
      cyl(0.14, 0.16, 0.04, wood, 0, 0.02);
      const arm = cyl(0.02, 0.02, 0.3, wood, 0.12, 0.98);
      arm.rotation.z = Math.PI / 2;
      cyl(0.004, 0.004, 0.16, mat(0xcfc8b8), 0.24, 0.9, 0, 4);
      cyl(0.05, 0.05, 0.14, glass(0x5a9a5a, 0.45), 0.24, 0.73, 0, 10);
      cyl(0.02, 0.03, 0.05, glass(0x5a9a5a, 0.45), 0.24, 0.825, 0, 8);
      ball(0.025, mat(0xf3b0c0), 0.24, 0.69, 0, 1, 0.6, 0.5);
      break;
    }
    case 'can_planter': {
      // 鋁罐小盆栽：兩個紅色鋁罐種小野花
      for (const [x, c] of [[-0.05, 0xd2453c], [0.06, 0x4a74b5]]) {
        cyl(0.04, 0.04, 0.12, mat(c), x, 0.06, 0, 10);
        cyl(0.036, 0.036, 0.01, mat(0x5a4030), x, 0.12, 0, 10);
        cyl(0.004, 0.004, 0.08, mat(0x4f8a4a), x, 0.16, 0, 4);
        ball(0.022, mat(x < 0 ? 0xffd84a : 0xf3a6c0), x, 0.205, 0);
      }
      break;
    }
    case 'net_basket': {
      // 漁網吊籃：立架上吊著漁網做的籃子，裡面放了貝殼
      const wood = mat(0xb8a088);
      cyl(0.03, 0.04, 1.2, wood, -0.2, 0.6);
      cyl(0.14, 0.16, 0.04, wood, -0.2, 0.02);
      const arm = cyl(0.02, 0.02, 0.36, wood, -0.04, 1.18);
      arm.rotation.z = Math.PI / 2;
      cyl(0.004, 0.004, 0.3, mat(0x6a9a7a), 0.1, 1.03, 0, 4);
      add(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x6a9a7a, { wireframe: true }), 0.1, 0.86, 0);
      torus(0.15, 0.012, mat(0x6a9a7a), 0.1, 0.86, 0).rotation.x = Math.PI / 2;
      ball(0.04, mat(0xf3d8c8), 0.08, 0.76, 0.02, 1, 0.6, 0.8);
      ball(0.035, mat(0xf3b0c0), 0.14, 0.77, -0.03, 1, 0.6, 0.8);
      break;
    }
    case 'umbrella_lamp': {
      // 雨傘吊燈：倒過來的舊雨傘變成燈罩
      cyl(0.025, 0.03, 1.3, mat(0x3a3a3a), 0, 0.65);
      cyl(0.16, 0.18, 0.04, mat(0x3a3a3a), 0, 0.02);
      const shade = add(new THREE.ConeGeometry(0.3, 0.2, 8, 1, true), mat(0x3a3a5a, { side: THREE.DoubleSide }), 0, 1.3, 0);
      shade.rotation.x = 0;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        cyl(0.004, 0.004, 0.32, mat(0x8a8a8a), Math.cos(a) * 0.15, 1.25, Math.sin(a) * 0.15, 3).rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      }
      ball(0.06, glow(0xffe08a), 0, 1.18, 0);
      break;
    }
    case 'slipper_pot': {
      // 拖鞋花盆：單隻藍色拖鞋裡長出小花
      box(0.12, 0.03, 0.26, mat(0x4a74b5), 0, 0.015, 0);
      box(0.1, 0.04, 0.1, mat(0x4a74b5), 0, 0.05, 0.05);
      box(0.08, 0.03, 0.12, mat(0x5a4030), 0, 0.045, -0.05);
      for (const [x, z, c] of [[-0.02, -0.05, 0xffd84a], [0.025, -0.08, 0xffffff], [0.01, -0.02, 0xf3a6c0]]) {
        cyl(0.004, 0.004, 0.1, mat(0x4f8a4a), x, 0.1, z, 4);
        ball(0.022, mat(c), x, 0.15, z);
      }
      break;
    }
    case 'float_chime': {
      // 浮標風鈴：漂流木橫桿掛著橘色的舊浮標和貝殼
      const wood = mat(0xb8a088);
      for (const x of [-0.26, 0.26]) cyl(0.03, 0.035, 1.1, wood, x, 0.55);
      const bar = cyl(0.03, 0.03, 0.6, wood, 0, 1.08);
      bar.rotation.z = Math.PI / 2;
      for (const [x, c] of [[-0.12, 0xf08a3c], [0.12, 0xffffff]]) {
        cyl(0.004, 0.004, 0.25, mat(0xcfc8b8), x, 0.94, 0, 4);
        ball(0.06, mat(c), x, 0.76, 0);
        ball(0.03, mat(0xd2453c), x, 0.82, 0, 1, 0.5, 1);
      }
      ball(0.03, mat(0xf3d8c8), 0, 0.84, 0, 1, 0.7, 0.4);
      cyl(0.004, 0.004, 0.2, mat(0xcfc8b8), 0, 0.96, 0, 4);
      break;
    }
    // ---------- 🌿 自然手作 ----------
    case 'log_bench': {
      // 原木長凳：剖半的漂流木＋兩塊石頭腳（可以坐）
      const wood = mat(0xa88a6a);
      const top = cyl(0.12, 0.12, 0.74, wood, 0, 0.26, 0, 10);
      top.rotation.z = Math.PI / 2;
      top.scale.set(1, 1, 0.75);
      for (const x of [-0.26, 0.26]) ball(0.11, mat(0x8a8a84), x, 0.1, 0, 1.2, 0.9, 1);
      cyl(0.1, 0.1, 0.01, mat(0xd8c0a0), -0.37, 0.26, 0, 10).rotation.z = Math.PI / 2;
      break;
    }
    case 'glowmush_lamp': {
      // 發光蘑菇燈：月光小菇放在小木墩上，晚上淡淡發光
      cyl(0.1, 0.11, 0.06, mat(0x7a5236), 0, 0.03);
      for (const [x, z, sc] of [[0, 0, 1], [0.06, 0.04, 0.6], [-0.05, 0.04, 0.5]]) {
        cyl(0.015 * sc, 0.02 * sc, 0.12 * sc, mat(0xe8f8f0), x, 0.06 + 0.06 * sc, z, 6);
        dome(0.06 * sc, glow(0x9ff0e0), x, 0.06 + 0.12 * sc, z, 0.6);
      }
      break;
    }
    case 'bug_frame': {
      // 昆蟲標本框：木框裡一隻蝴蝶、一隻甲蟲
      box(0.3, 0.24, 0.03, mat(0x7a5236), 0, 0.14);
      box(0.25, 0.19, 0.032, mat(0xf3ead8), 0, 0.14);
      for (const s2 of [-1, 1]) ball(0.035, mat(0xc8f0d8), -0.06 + s2 * 0.03, 0.16, 0.02, 1, 1.3, 0.3);
      cyl(0.006, 0.006, 0.06, mat(0x3a2a1a), -0.06, 0.16, 0.02, 4);
      ball(0.03, mat(0x3f9a6a), 0.06, 0.13, 0.02, 0.8, 1.2, 0.5);
      box(0.12, 0.012, 0.012, mat(0x7a5236), 0, 0.03, -0.05).rotation.x = 0.4;
      break;
    }
    case 'pressed_flower': {
      // 押花畫：漂流木框＋壓平的野花
      box(0.28, 0.34, 0.03, mat(0xb8a088), 0, 0.18);
      box(0.22, 0.28, 0.032, mat(0xfaf3e6), 0, 0.18);
      for (const [x, y, c] of [[-0.05, 0.24, 0xf3a6c0], [0.05, 0.2, 0xffd84a], [-0.02, 0.13, 0x8a5ac9], [0.06, 0.1, 0xffffff]]) {
        ball(0.022, mat(c), x, y, 0.02, 1, 1, 0.2);
        box(0.004, 0.08, 0.004, mat(0x4f8a4a), x, y - 0.05, 0.019);
      }
      box(0.12, 0.012, 0.012, mat(0xb8a088), 0, 0.03, -0.05).rotation.x = 0.4;
      break;
    }
    case 'crystal_sun': {
      // 水晶窗飾：立架上吊著白石英和湖玻璃，會反光
      const wood = mat(0x7a5236);
      cyl(0.025, 0.03, 1.3, wood, 0, 0.65);
      cyl(0.14, 0.16, 0.04, wood, 0, 0.02);
      const ring = torus(0.18, 0.012, mat(0xd8c890), 0, 1.1, 0);
      ring.rotation.y = 0;
      for (const [x, y, c] of [[0, 0.98, 0xf3f3f3], [-0.1, 1.02, 0x8ad0c8], [0.1, 1.02, 0x8ad0c8]]) {
        cyl(0.003, 0.003, 0.08, mat(0xcfc8b8), x, y + 0.06, 0, 3);
        add(new THREE.OctahedronGeometry(0.04, 0), mat(c, { emissive: c, emissiveIntensity: 0.25, roughness: 0.1 }), x, y, 0).scale.y = 1.5;
      }
      break;
    }
    case 'pearl_lamp': {
      // 珍珠貝殼燈：打開的大貝殼裡放一顆發光的珍珠
      dome(0.14, mat(0xf6f0e8), 0, 0.02, 0, 0.4);
      const lid = dome(0.14, mat(0xf3d8c8), 0, 0.06, -0.08, 0.4);
      lid.rotation.x = -1.1;
      ball(0.045, glow(0xfff6e8), 0, 0.07, 0.02);
      break;
    }
    case 'meteor_lamp': {
      // 流星吊燈：立架上吊著流星碎片，旁邊繞著螢光水晶
      cyl(0.025, 0.03, 1.4, mat(0x3a3a4a), 0, 0.7);
      cyl(0.16, 0.18, 0.04, mat(0x3a3a4a), 0, 0.02);
      const arm = cyl(0.018, 0.018, 0.34, mat(0x3a3a4a), 0.15, 1.38);
      arm.rotation.z = Math.PI / 2;
      cyl(0.004, 0.004, 0.2, mat(0xcfc8b8), 0.3, 1.28, 0, 3);
      add(new THREE.DodecahedronGeometry(0.08, 0), glow(0xbfe0ff), 0.3, 1.13, 0);
      const tail = cone(0.05, 0.22, glass(0xbfe0ff, 0.4), 0.38, 1.2, 0);
      tail.rotation.z = 2.2;
      add(new THREE.OctahedronGeometry(0.035, 0), glow(0x9ff0e0), 0.2, 1.05, 0.06);
      break;
    }
    case 'shellframe': {
      box(0.26, 0.32, 0.03, mat(0xe8dcc8), 0, 0.17);
      box(0.18, 0.24, 0.032, mat(0x8ac0d8), 0, 0.17);
      const sc = [0xf3b0c0, 0xf3d8c8, 0xffffff, 0xe8c8a8];
      for (let k = 0; k < 10; k++) {
        const top = k < 5;
        const x = -0.1 + (k % 5) * 0.05;
        ball(0.018, mat(sc[k % 4]), x, top ? 0.31 : 0.03, 0.02, 1, 0.8, 0.5);
      }
      ball(0.03, mat(0xffd84a), 0.06, 0.2, 0.02, 1, 1, 0.4);
      cyl(0.006, 0.006, 0.08, mat(0x4f8a4a), 0.06, 0.15, 0.02, 4);
      break;
    }
    case 'hatrack': {
      // 衣帽架：木頭直立桿＋三根掛鉤，掛著主人收集到的造型（帽子、背包、圍巾）
      const wood = mat(0x7a5236);
      cyl(0.2, 0.24, 0.05, wood, 0, 0.025);
      cyl(0.025, 0.03, 1.15, wood, 0, 0.6);
      ball(0.045, wood, 0, 1.2);
      for (const [a, y] of [[0, 1.05], [2.1, 0.85], [-2.1, 0.68]]) {
        const hook = cyl(0.012, 0.012, 0.16, wood, Math.sin(a) * 0.07, y, Math.cos(a) * 0.07, 6);
        hook.rotation.set(Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1);
      }
      const rack = Array.isArray(opts.rack) ? opts.rack : [];
      const spots = { head: [0, 1.08, 0.12, 0.42], back: [0.16, 0.42, -0.08, 0.5], neck: [-0.13, 0.42, 0.06, 0.55] };
      for (const id of rack) {
        const o = buildOutfit(id);
        const slot = OUTFIT_BY_ID[id]?.slot;
        if (!o || !spots[slot]) continue;
        const [x, y, z, sc] = spots[slot];
        o.scale.setScalar(sc);
        // 模型原本是戴在身上的座標：往回移到掛鉤上
        if (slot === 'head') o.position.set(x, y - 0.12 * sc, z);
        else if (slot === 'back') o.position.set(x, y - 0.42 * sc, z + 0.38 * sc);
        else o.position.set(x, y - 0.6 * sc, z - 0.02 * sc);
        g.add(o);
      }
      break;
    }
    case 'rug':
      box(0.76, 0.02, 0.76, mat(0xb5553f), 0, 0.01);
      box(0.6, 0.022, 0.6, mat(0xe8c48a), 0, 0.012);
      box(0.4, 0.024, 0.4, mat(0x7a9a6a), 0, 0.013);
      break;
    case 'cushion':
      cyl(0.27, 0.29, 0.12, mat(0xe39a4f), 0, 0.06, 0, 12);
      ball(0.06, mat(0xc77a35), 0, 0.12, 0, 1, 0.4, 1);
      break;
    case 'table': {
      const wood = mat(0x8a5a36);
      box(0.6, 0.05, 0.46, wood, 0, 0.3);
      for (const [x, z] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]]) box(0.05, 0.28, 0.05, wood, x, 0.14, z);
      cyl(0.05, 0.04, 0.08, mat(0xf2e6cc), 0.21, 0.365, 0.14); // 馬克杯（放角落，中間留給檯燈、盆栽）
      break;
    }
    case 'jar':
      cyl(0.12, 0.12, 0.28, glass(0xcfe8ff), 0, 0.14);
      cyl(0.13, 0.13, 0.04, mat(0x8a5a36), 0, 0.3);
      for (let i = 0; i < 6; i++) ball(0.025, glow(0xd4ff8a), Math.cos(i * 2.1) * 0.06, 0.06 + i * 0.035, Math.sin(i * 2.1) * 0.06);
      break;
    case 'bookshelf': {
      const wood = mat(0x7a5236);
      box(0.66, 0.9, 0.04, wood, 0, 0.45, -0.17);
      box(0.04, 0.9, 0.36, wood, -0.31, 0.45);
      box(0.04, 0.9, 0.36, wood, 0.31, 0.45);
      for (const y of [0.02, 0.32, 0.62, 0.9]) box(0.62, 0.03, 0.36, wood, 0, y);
      const colors = [0xd85a5a, 0x5a8ad8, 0xe8c45a, 0x6ab07a, 0xb07ad8, 0xe08a4a];
      for (let shelf = 0; shelf < 2; shelf++) {
        for (let i = 0; i < 7; i++) {
          const h = 0.18 + ((i * 7 + shelf * 3) % 5) * 0.015;
          box(0.06, h, 0.24, mat(colors[(i + shelf * 2) % colors.length]), -0.24 + i * 0.075, 0.035 + shelf * 0.3 + h / 2, 0);
        }
      }
      break;
    }
    case 'stove':
      cyl(0.2, 0.22, 0.42, mat(0x3a3a40), 0, 0.25);
      box(0.18, 0.14, 0.02, glow(0xff9a3c), 0, 0.26, 0.2);
      cyl(0.05, 0.05, 0.4, mat(0x3a3a40), 0.08, 0.66, -0.06);
      for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) box(0.04, 0.06, 0.04, mat(0x2a2a30), x, 0.03, z);
      break;
    case 'showcase': {
      // 三層開放式展示櫃（東西擺在架子上，由 homeRoom 排位置）
      const w = mat(0xb08a5e);
      const d = mat(0x8a6644);
      box(0.76, 0.06, 0.4, d, 0, 0.03, 0);
      for (const y of [0.52, 0.97]) box(0.72, 0.035, 0.38, w, 0, y, 0);
      box(0.76, 0.05, 0.42, d, 0, 1.43, 0);
      for (const sx of [-1, 1]) box(0.04, 1.45, 0.4, d, sx * 0.37, 0.725, 0);
      box(0.76, 1.45, 0.03, w, 0, 0.725, -0.19);
      break;
    }
    case 'fridge':
      box(0.46, 0.66, 0.42, mat(0xf2f0e8), 0, 0.33);
      box(0.44, 0.012, 0.01, mat(0xc8c4b8), 0, 0.42, 0.215);
      box(0.03, 0.12, 0.03, mat(0x9a968a), 0.17, 0.52, 0.225);
      box(0.03, 0.08, 0.03, mat(0x9a968a), 0.17, 0.3, 0.225);
      ball(0.035, mat(0xe85a5a), -0.1, 0.55, 0.22); // 冰箱貼
      break;
    case 'bed': {
      // 長一點的床（往後多佔半格），躺得下一整隻動物
      const z0 = -0.3;
      box(0.78, 0.12, 1.4, mat(0x8a6a4a), 0, 0.06, z0);
      box(0.74, 0.08, 1.34, mat(0xf2ead8), 0, 0.16, z0);
      box(0.74, 0.05, 0.8, mat(0x6a8ac8), 0, 0.21, 0.04);
      ball(0.14, mat(0xffffff), 0, 0.25, -0.82, 1.9, 0.6, 1.1);
      box(0.8, 0.5, 0.08, mat(0x7a5236), 0, 0.25, -1.0); // 床頭板
      break;
    }
    case 'postcard': {
      // 木框軟木板，上面釘滿營火明信片
      const wood = mat(0x7a5236);
      box(0.7, 0.62, 0.05, mat(0xc9a06a), 0, 0.55, -0.2);
      for (const [x, y, w, h] of [[0, 0.88, 0.74, 0.04], [0, 0.22, 0.74, 0.04], [-0.37, 0.55, 0.04, 0.7], [0.37, 0.55, 0.04, 0.7]]) box(w, h, 0.07, wood, x, y, -0.2);
      const cards = [0xffe9c8, 0xffd0d8, 0xd8ecff, 0xfff3a8, 0xd8f5d0, 0xffe0b8];
      cards.forEach((c, i) => {
        const card = box(0.17, 0.12, 0.012, mat(c), -0.2 + (i % 3) * 0.2, 0.68 - Math.floor(i / 3) * 0.24, -0.17);
        card.rotation.z = ((i * 37) % 9 - 4) * 0.04;
        box(0.06, 0.03, 0.014, glow(i % 2 ? 0xff9a3c : 0xffc86b), card.position.x, card.position.y - 0.02, -0.165); // 小小的營火圖
        ball(0.012, mat(0xd84a4a), card.position.x, card.position.y + 0.05, -0.16); // 圖釘
      });
      box(0.05, 0.3, 0.05, wood, -0.3, 0.15, -0.2);
      box(0.05, 0.3, 0.05, wood, 0.3, 0.15, -0.2);
      break;
    }
    case 'foxlamp': {
      // 小狐狸提著一盞燈籠
      const fur = mat(0xe07a3a);
      const white = mat(0xfff3e3);
      ball(0.13, fur, 0, 0.14, 0, 1, 1.05, 0.9); // 身體
      ball(0.11, fur, 0, 0.34, 0.03); // 頭
      ball(0.05, white, 0, 0.31, 0.12, 1.2, 0.7, 0.8); // 嘴
      ball(0.015, mat(0x2a1a14), 0, 0.33, 0.165);
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), fur);
        ear.position.set(s * 0.06, 0.46, 0.02);
        g.add(ear);
        ball(0.014, mat(0x2a1a14), s * 0.04, 0.37, 0.1);
      }
      ball(0.08, fur, 0.13, 0.1, -0.12, 0.7, 0.7, 1.6); // 尾巴
      ball(0.04, white, 0.16, 0.12, -0.24);
      cyl(0.008, 0.008, 0.2, mat(0x5a3c26), 0.15, 0.28, 0.08, 4); // 提把
      cyl(0.06, 0.06, 0.11, glow(0xffc46b), 0.15, 0.14, 0.08, 10); // 燈籠
      const l = new THREE.PointLight(0xffb45a, 1.4, 2.4, 1.6);
      l.position.set(0.15, 0.18, 0.1);
      g.add(l);
      break;
    }
    case 'telescope': {
      const brass = mat(0xd8a84a, { metalness: 0.4, roughness: 0.4 });
      for (const a of [0, 2.1, 4.2]) {
        const leg = cyl(0.015, 0.015, 0.62, mat(0x6a4a30), Math.sin(a) * 0.12, 0.29, Math.cos(a) * 0.12, 5);
        leg.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
      }
      const tube = cyl(0.045, 0.06, 0.55, mat(0x2c3a6b), 0, 0.68, 0, 12);
      tube.rotation.x = -0.9;
      const lens = cyl(0.065, 0.065, 0.05, brass, 0, 0.88, -0.2, 12);
      lens.rotation.x = -0.9;
      ball(0.03, brass, 0, 0.6, 0.0);
      // 鏡頭前一小撮星光
      for (let i = 0; i < 5; i++) ball(0.012, glow(0xfff2b0), Math.sin(i * 1.9) * 0.12, 1.02 + (i % 3) * 0.05, -0.32 - (i % 2) * 0.05);
      break;
    }
    // ======== 地墊 ========
    case 'roundrug': {
      cyl(0.37, 0.37, 0.02, mat(0xf4b8c8), 0, 0.01, 0, 24);
      cyl(0.3, 0.3, 0.021, mat(0xfbe3ea), 0, 0.011, 0, 24);
      const dot = mat(0xf4b8c8);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        cyl(0.04, 0.04, 0.022, dot, Math.cos(a) * 0.19, 0.012, Math.sin(a) * 0.19, 10);
      }
      cyl(0.06, 0.06, 0.022, dot, 0, 0.012, 0, 12);
      break;
    }
    case 'grassmat': {
      box(0.74, 0.03, 0.74, mat(0x86c06e), 0, 0.015);
      const cols = [0xffffff, 0xffe066, 0xffa8c8, 0xc8b0ff];
      for (let k = 0; k < 9; k++) {
        const x = ((k * 37) % 7) / 7 - 0.43;
        const z = ((k * 53) % 9) / 9 - 0.42;
        ball(0.028, mat(cols[k % 4]), x * 0.82, 0.04, z * 0.82, 1, 0.5, 1);
        ball(0.012, mat(0xffd23a), x * 0.82, 0.05, z * 0.82);
      }
      for (let k = 0; k < 10; k++) cone(0.012, 0.06, mat(0x5a9a4a), ((k * 29) % 11) / 11 * 0.64 - 0.32, 0.06, ((k * 17) % 13) / 13 * 0.64 - 0.32, 4);
      break;
    }
    case 'heartrug':
      flat(heart(0.3), 0.02, mat(0xf58aa8), 0, 0, 0.02);
      flat(heart(0.21), 0.022, mat(0xffd0dc), 0, 0, 0.012);
      break;
    case 'pawrug': {
      cyl(0.36, 0.36, 0.02, mat(0xf3e2c8), 0, 0.01, 0, 22);
      const pad = mat(0xe0a090);
      for (const [px, pz, rot] of [[-0.12, 0.09, 0.3], [0.13, -0.1, -0.4]]) {
        cyl(0.065, 0.075, 0.022, pad, px, 0.012, pz, 10);
        for (let k = 0; k < 4; k++) {
          const a = rot - 0.85 + k * 0.57;
          cyl(0.028, 0.028, 0.022, pad, px + Math.sin(a) * 0.105, 0.012, pz - Math.cos(a) * 0.105, 8);
        }
      }
      break;
    }
    // ======== 坐臥 ========
    case 'pouf': {
      const d = torus(0.19, 0.1, mat(0xf2c48a), 0, 0.1, 0, Math.PI * 2, 18);
      d.rotation.x = Math.PI / 2;
      const ice = torus(0.19, 0.085, mat(0xf79ab8), 0, 0.135, 0, Math.PI * 2, 18);
      ice.rotation.x = Math.PI / 2;
      ice.scale.z = 0.7;
      const cols = [0xffffff, 0x8ad0ff, 0xffe066, 0x9ae08a];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const s = box(0.04, 0.012, 0.012, mat(cols[k % 4]), Math.cos(a) * 0.19, 0.2, Math.sin(a) * 0.19);
        s.rotation.y = a * 3;
      }
      break;
    }
    case 'stool': {
      cyl(0.08, 0.1, 0.22, mat(0xfff0dc), 0, 0.11);
      cyl(0.215, 0.215, 0.02, mat(0xffe6c8), 0, 0.21, 0, 14);
      dome(0.22, mat(0xe0574a), 0, 0.2, 0, 0.55);
      for (const [x, z] of [[0, 0], [0.12, 0.06], [-0.1, 0.09], [-0.04, -0.13], [0.1, -0.1]]) ball(0.03, mat(0xffffff), x, 0.3 - Math.hypot(x, z) * 0.35, z, 1, 0.4, 1);
      break;
    }
    case 'beanbag': {
      const c = mat(0x9ad0c2);
      ball(0.32, c, 0, 0.19, 0.02, 1, 0.6, 1);
      ball(0.24, c, 0, 0.34, -0.14, 1, 0.75, 0.6);
      ball(0.05, mat(0x7ab8a8), 0, 0.3, 0.1, 1.6, 0.3, 1);
      break;
    }
    case 'catbed': {
      cyl(0.3, 0.27, 0.15, mat(0xc89a5a), 0, 0.075, 0, 14);
      torus(0.29, 0.04, mat(0xb08048), 0, 0.15, 0, Math.PI * 2, 18).rotation.x = Math.PI / 2;
      cyl(0.25, 0.25, 0.04, mat(0xf8d6e2), 0, 0.15, 0, 14);
      const fur = mat(0xf2a860);
      ball(0.15, fur, -0.03, 0.22, -0.02, 1.3, 0.6, 1);
      ball(0.1, fur, 0.13, 0.24, 0.07);
      for (const s of [-1, 1]) cone(0.035, 0.07, fur, 0.13 + s * 0.055, 0.34, 0.06, 4);
      for (const s of [-1, 1]) box(0.03, 0.008, 0.01, mat(DARK), 0.13 + s * 0.035, 0.25, 0.166);
      ball(0.012, mat(0xff8a9a), 0.13, 0.225, 0.17);
      const tail = torus(0.11, 0.03, fur, -0.06, 0.2, 0.08, Math.PI * 1.2, 10);
      tail.rotation.x = Math.PI / 2;
      for (const k of [0, 1, 2]) box(0.05, 0.012, 0.02, mat(0xd8884a), -0.1 + k * 0.06, 0.31, -0.02);
      break;
    }
    case 'rocking': {
      const wood = mat(0xc08a5a);
      for (const s of [-1, 1]) {
        const rk = torus(0.7, 0.022, wood, s * 0.2, 0.72, 0, 0.9, 8);
        rk.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
        for (const z of [-0.15, 0.15]) box(0.04, 0.26, 0.04, wood, s * 0.2, 0.17, z);
        box(0.04, 0.04, 0.38, wood, s * 0.22, 0.45, 0.02);
        box(0.04, 0.16, 0.04, wood, s * 0.22, 0.37, 0.18);
      }
      box(0.44, 0.04, 0.4, wood, 0, 0.3, 0);
      const back = box(0.44, 0.48, 0.04, wood, 0, 0.56, -0.2);
      back.rotation.x = -0.15;
      box(0.38, 0.05, 0.34, mat(0xf4a6b6), 0, 0.345, 0.01);
      const pil = box(0.34, 0.24, 0.06, mat(0xfbe0e6), 0, 0.54, -0.16);
      pil.rotation.x = -0.15;
      break;
    }
    case 'sofa': {
      const c = mat(0xf0a6ae);
      const c2 = mat(0xfbd3d6);
      // 11/07：佔兩格（往右多一格），兩個坐墊各在一格中間，兩個人坐才不會疊在一起
      const cx = 0.4; // 整張沙發的中心在兩格中間
      box(1.52, 0.2, 0.42, c, cx, 0.14);
      for (const x of [0, 0.8]) box(0.66, 0.08, 0.34, c2, x, 0.28, 0.03);
      for (const s of [-1, 1]) {
        box(0.1, 0.32, 0.44, c, cx + s * 0.73, 0.24, 0);
        cyl(0.03, 0.025, 0.05, mat(0x8a5a36), cx + s * 0.7, 0.025, 0.17);
        cyl(0.03, 0.025, 0.05, mat(0x8a5a36), cx + s * 0.7, 0.025, -0.17);
      }
      const back = box(1.52, 0.36, 0.12, c, cx, 0.4, -0.16);
      back.rotation.x = -0.08;
      for (const x of [0.12, 0.92]) {
        const p = ball(0.09, mat(0xfff3c8), x, 0.4, -0.06, 1, 1, 0.45);
        p.rotation.z = 0.3;
      }
      flat(heart(0.035), 0.01, mat(0xf58aa8), 0.12, 0.4, -0.02).rotation.set(0, 0, 0.3);
      break;
    }
    // ======== 桌櫃 ========
    case 'crate': {
      const w = mat(0xc89668);
      const d = mat(0x9a6a40);
      box(0.5, 0.36, 0.5, w, 0, 0.18);
      for (const y of [0.03, 0.33]) for (const [x, z, a, b] of [[0, 0.252, 0.5, 0.01], [0, -0.252, 0.5, 0.01], [0.252, 0, 0.01, 0.5], [-0.252, 0, 0.01, 0.5]]) box(a, 0.05, b, d, x, y, z);
      box(0.36, 0.01, 0.01, d, 0, 0.18, 0.256).rotation.z = 0.7;
      box(0.36, 0.01, 0.01, d, 0, 0.18, -0.256).rotation.z = -0.7;
      break;
    }
    case 'stump': {
      cyl(0.25, 0.29, 0.32, mat(0x8a5a36), 0, 0.16, 0, 12);
      cyl(0.245, 0.245, 0.012, mat(0xf0d4a4), 0, 0.324, 0, 14);
      torus(0.15, 0.006, mat(0xc89a6a), 0, 0.331, 0, Math.PI * 2, 18).rotation.x = Math.PI / 2;
      torus(0.07, 0.006, mat(0xc89a6a), 0, 0.331, 0, Math.PI * 2, 14).rotation.x = Math.PI / 2;
      cyl(0.015, 0.018, 0.06, mat(0xfff0dc), 0.25, 0.08, 0.12, 6);
      dome(0.04, mat(0xe0574a), 0.25, 0.11, 0.12, 0.6);
      ball(0.06, mat(0x6aa85a), -0.22, 0.03, 0.16, 1, 0.5, 1);
      break;
    }
    case 'roundtable': {
      cyl(0.3, 0.3, 0.04, mat(0x9fd6c4), 0, 0.38, 0, 20);
      cyl(0.31, 0.31, 0.015, mat(0xffffff), 0, 0.36, 0, 20);
      cyl(0.035, 0.035, 0.36, mat(0xfff6e8), 0, 0.18);
      cyl(0.15, 0.17, 0.03, mat(0x9fd6c4), 0, 0.015, 0, 14);
      break;
    }
    case 'drawer': {
      const body = mat(0xf7c6d2);
      box(0.56, 0.5, 0.38, body, 0, 0.29);
      box(0.6, 0.03, 0.42, mat(0xffffff), 0, 0.525);
      for (const y of [0.18, 0.38]) {
        box(0.48, 0.16, 0.01, mat(0xfbe0e8), 0, y, 0.195);
        ball(0.025, mat(0xf2c14e), 0, y, 0.21);
      }
      for (const [x, z] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]]) cyl(0.025, 0.02, 0.04, mat(0xffffff), x, 0.02, z);
      break;
    }
    case 'desk': {
      const w = mat(0xe0bc8e);
      box(0.68, 0.04, 0.44, w, 0, 0.54);
      for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) box(0.04, 0.52, 0.04, w, x, 0.26, z);
      box(0.26, 0.12, 0.4, mat(0xf4e2c4), 0.17, 0.46, 0);
      ball(0.02, mat(0x9a6a40), 0.17, 0.46, 0.205);
      box(0.6, 0.03, 0.03, w, 0, 0.12, -0.18);
      // 桌上一本筆記本＋鉛筆
      box(0.16, 0.012, 0.12, mat(0x8ab8e8), -0.2, 0.566, 0.08).rotation.y = 0.2;
      const pen = cyl(0.008, 0.008, 0.14, mat(0xffd23a), -0.05, 0.57, 0.12, 6);
      pen.rotation.set(0, 0, Math.PI / 2);
      break;
    }
    // ======== 燈光 ========
    case 'candles': {
      cyl(0.16, 0.16, 0.015, mat(0xd8a84a, { metalness: 0.3, roughness: 0.5 }), 0, 0.0075, 0, 14);
      for (const [x, z, h] of [[-0.07, 0.03, 0.16], [0.06, 0.05, 0.11], [0, -0.07, 0.2]]) {
        cyl(0.035, 0.035, h, mat(0xfff0dc), x, 0.015 + h / 2, z);
        ball(0.02, glow(0xffc86b), x, 0.03 + h, z, 1, 1.6, 1);
      }
      break;
    }
    case 'oillamp': {
      const brass = mat(0xc89a4a, { metalness: 0.4, roughness: 0.45 });
      cyl(0.09, 0.11, 0.08, brass, 0, 0.04);
      ball(0.035, glow(0xffc46b), 0, 0.14, 0, 1, 1.5, 1);
      cyl(0.065, 0.075, 0.16, glass(0xfff0c8, 0.3), 0, 0.16);
      cyl(0.05, 0.065, 0.03, brass, 0, 0.255);
      const h = torus(0.06, 0.008, brass, 0, 0.27, 0, Math.PI, 10);
      h.rotation.z = 0;
      break;
    }
    case 'lamp':
      cyl(0.12, 0.14, 0.04, mat(0x5a4636));
      cyl(0.015, 0.015, 0.5, mat(0x5a4636), 0, 0.27);
      cyl(0.09, 0.17, 0.18, glow(0xffd28a), 0, 0.58);
      break;
    case 'mushlamp': {
      cyl(0.045, 0.065, 0.16, mat(0xfff3e0), 0, 0.08);
      dome(0.15, glow(0xffa8c8), 0, 0.15, 0, 0.7);
      for (const [x, z] of [[0, 0], [0.08, 0.05], [-0.07, 0.06], [0, -0.09]]) ball(0.02, glow(0xffffff), x, 0.255 - Math.hypot(x, z) * 0.5, z, 1, 0.5, 1);
      face(0, 0.07, 0.0, 0.055, { blush: true });
      break;
    }
    case 'starlamp': {
      cyl(0.1, 0.12, 0.04, mat(0x8a5a36), 0, 0.02);
      cyl(0.012, 0.012, 0.12, mat(0xd8a84a), 0, 0.1);
      stand(star(0.15), 0.06, glow(0xffe070), 0, 0.3, 0);
      face(0, 0.29, 0.03, 0.07, { flatFace: true });
      break;
    }
    case 'moonlamp': {
      cyl(0.1, 0.12, 0.04, mat(0xf0e6d6), 0, 0.02);
      cyl(0.012, 0.012, 0.1, mat(0xd8a84a), 0, 0.09);
      const moon = new THREE.Shape();
      moon.absarc(0, 0, 0.15, Math.PI * 0.35, Math.PI * 1.65, false);
      moon.absarc(0.07, 0, 0.11, Math.PI * 1.45, Math.PI * 0.55, true);
      stand(moon, 0.06, glow(0xfff0a0), 0, 0.3, 0);
      ball(0.02, glow(0xfff6c8), 0.12, 0.42, 0);
      ball(0.014, glow(0xfff6c8), 0.16, 0.34, 0);
      break;
    }
    // ======== 植物 ========
    case 'succulent': {
      const top = pot(0.1, 0.1, 0xa8d0e8);
      const leaf = mat(0x8fc49a);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const l = ball(0.045, leaf, Math.cos(a) * 0.055, top + 0.03, Math.sin(a) * 0.055, 1, 0.6, 1.8);
        l.rotation.y = -a + Math.PI / 2;
      }
      ball(0.04, mat(0xa8d8a8), 0, top + 0.05);
      ball(0.015, mat(0xffa8c8), 0, top + 0.09);
      break;
    }
    case 'cactus': {
      const top = pot(0.12, 0.15);
      const gr = mat(0x6ab06a);
      cyl(0.08, 0.085, 0.24, gr, 0, top + 0.12);
      ball(0.08, gr, 0, top + 0.24);
      for (const s of [-1, 1]) {
        cyl(0.03, 0.03, 0.08, gr, s * 0.1, top + 0.17 + (s > 0 ? 0.03 : 0), 0);
        ball(0.03, gr, s * 0.1, top + 0.21 + (s > 0 ? 0.03 : 0), 0);
        box(0.04, 0.025, 0.025, gr, s * 0.08, top + 0.13 + (s > 0 ? 0.03 : 0), 0);
      }
      face(0, top + 0.16, 0, 0.085);
      ball(0.03, mat(0xff8ab0), 0, top + 0.33);
      break;
    }
    case 'plant': {
      cyl(0.16, 0.12, 0.26, mat(0xb8653f));
      const leaf = mat(0x4f9a5a);
      ball(0.2, leaf, 0, 0.42);
      ball(0.13, leaf, 0.1, 0.55, 0.04);
      ball(0.12, leaf, -0.09, 0.52, -0.05);
      break;
    }
    case 'tulips': {
      const top = pot(0.12, 0.14, 0xf4f0f8);
      const cols = [0xf0506a, 0xffc040, 0xf8a0c8];
      [[-0.05, 0.02, 0.26], [0.05, -0.02, 0.3], [0, 0.06, 0.22]].forEach(([x, z, h], k) => {
        const st = cyl(0.008, 0.008, h, mat(0x5a9a4a), x, top + h / 2, z, 5);
        st.rotation.z = x * 1.2;
        const hx = x + x * 0.3;
        cyl(0.045, 0.03, 0.08, mat(cols[k]), hx, top + h + 0.02, z, 6);
        for (const a of [0, 2.1, 4.2]) cone(0.022, 0.05, mat(cols[k]), hx + Math.cos(a) * 0.022, top + h + 0.075, z + Math.sin(a) * 0.022, 4);
      });
      ball(0.05, mat(0x6ab06a), 0.07, top + 0.06, 0.03, 0.5, 1.6, 0.3).rotation.z = -0.4;
      ball(0.05, mat(0x6ab06a), -0.07, top + 0.06, -0.02, 0.5, 1.6, 0.3).rotation.z = 0.4;
      break;
    }
    case 'sunflower': {
      const top = pot(0.11, 0.13);
      cyl(0.012, 0.014, 0.4, mat(0x5a9a4a), 0, top + 0.2, 0, 6);
      for (const s of [-1, 1]) ball(0.05, mat(0x6ab06a), s * 0.05, top + 0.16 + (s > 0 ? 0.06 : 0), 0, 1.4, 0.3, 0.8).rotation.z = -s * 0.5;
      const head = new THREE.Group();
      head.position.set(0, top + 0.43, 0.02);
      head.rotation.x = -0.25;
      g.add(head);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), mat(0x7a4a26));
      c.rotation.x = Math.PI / 2;
      head.add(c);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 1), mat(0xffd23a));
        p.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.005);
        p.scale.set(1.5, 0.7, 0.4);
        p.rotation.z = a;
        head.add(p);
      }
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.IcosahedronGeometry(0.01, 1), mat(DARK));
        e.position.set(s * 0.022, 0.01, 0.017);
        head.add(e);
      }
      break;
    }
    case 'bonsai': {
      box(0.36, 0.08, 0.24, mat(0x5a7a9a), 0, 0.04);
      box(0.32, 0.01, 0.2, mat(0x5a3c26), 0, 0.082);
      const bark = mat(0x7a5236);
      cyl(0.025, 0.035, 0.18, bark, -0.02, 0.17, 0, 6).rotation.z = 0.35;
      cyl(0.018, 0.025, 0.14, bark, -0.02, 0.3, 0, 6).rotation.z = -0.6;
      const leaf = mat(0x3f7a4a);
      ball(0.1, leaf, 0.06, 0.37, 0, 1.3, 0.55, 1);
      ball(0.07, leaf, -0.1, 0.3, 0.02, 1.3, 0.55, 1);
      ball(0.06, leaf, 0.0, 0.44, -0.02, 1.3, 0.6, 1);
      ball(0.025, mat(0xa8a8a0), 0.1, 0.1, 0.04, 1, 0.6, 1);
      break;
    }
    case 'monstera': {
      const top = pot(0.2, 0.3, 0xece4d6);
      const leaf = mat(0x3f9a5a);
      const stem = mat(0x5a9a4a);
      for (let k = 0; k < 7; k++) {
        const a = k * 2.4;
        const h = 0.25 + (k % 3) * 0.17;
        const r = 0.12 + (k % 2) * 0.08;
        const st = cyl(0.01, 0.012, h, stem, Math.cos(a) * r * 0.5, top + h / 2, Math.sin(a) * r * 0.5, 5);
        st.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
        const l = ball(0.13, leaf, Math.cos(a) * r, top + h + 0.02, Math.sin(a) * r, 1, 0.12, 0.7);
        l.rotation.set(0, -a, 0.4);
      }
      break;
    }
    // ======== 玩偶 ========
    case 'chick': {
      const y = mat(0xffd84a);
      ball(0.15, y, 0, 0.14, 0, 1, 0.95, 1);
      face(0, 0.17, 0, 0.14);
      cone(0.03, 0.05, mat(0xf08a3a), 0, 0.15, 0.155, 4).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) ball(0.05, y, s * 0.14, 0.13, -0.01, 0.5, 0.8, 1).rotation.z = s * 0.4;
      cone(0.02, 0.06, y, 0, 0.31, 0, 4);
      cone(0.02, 0.05, y, 0.025, 0.3, 0, 4).rotation.z = -0.5;
      for (const s of [-1, 1]) ball(0.035, mat(0xf08a3a), s * 0.06, 0.01, 0.07, 1, 0.3, 1.4);
      break;
    }
    case 'frog': {
      const gr = mat(0x7cc46a);
      ball(0.16, gr, 0, 0.13, 0, 1.15, 0.8, 1);
      ball(0.1, mat(0xd8f0b0), 0, 0.1, 0.07, 1.1, 0.9, 0.8);
      for (const s of [-1, 1]) {
        ball(0.055, gr, s * 0.08, 0.24, 0.04);
        ball(0.035, mat(0xffffff), s * 0.08, 0.255, 0.075);
        ball(0.018, mat(DARK), s * 0.08, 0.26, 0.105);
        ball(0.025, mat(0xffa3ad), s * 0.13, 0.15, 0.115, 1, 0.6, 0.5);
        ball(0.04, gr, s * 0.15, 0.03, 0.08, 1.2, 0.5, 1.4);
      }
      const m = torus(0.035, 0.006, mat(0xd8505a), 0, 0.17, 0.142, Math.PI, 8);
      m.rotation.z = Math.PI;
      break;
    }
    case 'whale': {
      const bl = mat(0x7ab0e0);
      ball(0.18, bl, 0, 0.15, 0, 1.4, 0.8, 1);
      ball(0.14, mat(0xe8f4ff), 0.03, 0.1, 0.04, 1.3, 0.5, 0.9);
      for (const s of [-1, 1]) ball(0.06, bl, -0.3, 0.2, s * 0.06, 0.6, 0.25, 1.3).rotation.x = s * 0.5;
      for (const s of [-1, 1]) {
        ball(0.016, mat(DARK), 0.16, 0.19, s * 0.15);
        ball(0.022, mat(0xffa3ad), 0.18, 0.15, s * 0.15, 1, 0.6, 0.5);
      }
      for (const [x, y] of [[0.05, 0.32], [0.02, 0.37], [0.08, 0.38]]) ball(0.02, glow(0xbfe6ff), x, y, 0);
      break;
    }
    case 'teddy': {
      const fur = mat(0xc08a5a);
      ball(0.17, fur, 0, 0.17, 0, 1, 0.95, 0.9);
      ball(0.13, fur, 0, 0.42);
      ball(0.05, fur, -0.1, 0.53);
      ball(0.05, fur, 0.1, 0.53);
      ball(0.04, mat(0xf2d6b8), 0, 0.4, 0.11);
      break;
    }
    case 'bunny': {
      const w = mat(0xfff4f4);
      ball(0.15, w, 0, 0.14, 0, 1, 0.95, 0.95);
      ball(0.12, w, 0, 0.34, 0.01);
      face(0, 0.34, 0.01, 0.12);
      ball(0.012, mat(0xff8a9a), 0, 0.33, 0.13);
      for (const s of [-1, 1]) {
        const e = ball(0.04, w, s * 0.05, 0.53, -0.01, 1, 2.6, 0.6);
        e.rotation.z = -s * 0.15;
        const inner = ball(0.022, mat(0xffc0cc), s * 0.05, 0.53, 0.01, 1, 2.6, 0.4);
        inner.rotation.z = -s * 0.15;
        ball(0.04, w, s * 0.08, 0.03, 0.09, 1, 0.6, 1.3);
      }
      ball(0.04, w, 0, 0.12, -0.15);
      break;
    }
    case 'penguin': {
      const nv = mat(0x2c3a5a);
      ball(0.15, nv, 0, 0.17, 0, 1, 1.15, 0.95);
      ball(0.11, mat(0xffffff), 0, 0.15, 0.06, 1, 1.15, 0.8);
      face(0, 0.285, 0.0, 0.115, { eye: 0x10141f });
      cone(0.025, 0.05, mat(0xf0a03a), 0, 0.27, 0.125, 4).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) {
        ball(0.05, nv, s * 0.15, 0.15, 0, 0.35, 1, 0.8).rotation.z = s * 0.3;
        ball(0.035, mat(0xf0a03a), s * 0.06, 0.01, 0.08, 1, 0.3, 1.4);
      }
      // 圍巾：圍在脖子（身體上半段）
      const sc = torus(0.148, 0.022, mat(0xe85a5a), 0, 0.2, 0, Math.PI * 2, 16);
      sc.rotation.x = Math.PI / 2;
      box(0.04, 0.09, 0.02, mat(0xe85a5a), 0.07, 0.15, 0.14).rotation.z = 0.2;
      break;
    }
    case 'dino': {
      const gr = mat(0x9ad08a);
      ball(0.14, gr, 0, 0.15, -0.02, 1, 1, 1.2);
      ball(0.1, mat(0xe8f6c8), 0, 0.13, 0.08, 0.9, 1, 0.6);
      ball(0.1, gr, 0, 0.33, 0.08);
      face(0, 0.33, 0.08, 0.1);
      const tail = cone(0.07, 0.24, gr, 0, 0.1, -0.22, 8);
      tail.rotation.x = -Math.PI / 2 - 0.3;
      for (let k = 0; k < 4; k++) cone(0.025, 0.05, mat(0xffa860), 0, 0.42 - k * 0.09, 0.04 - k * 0.09, 4).rotation.x = -0.6 - k * 0.3;
      for (const s of [-1, 1]) ball(0.045, gr, s * 0.08, 0.04, 0.05, 1, 0.8, 1.2);
      break;
    }
    case 'bigbear': {
      const fur = mat(0xe0b088);
      const light = mat(0xf8e0c8);
      ball(0.27, fur, 0, 0.26, -0.03, 1, 0.95, 0.9);
      ball(0.17, light, 0, 0.24, 0.12, 1, 1, 0.6);
      ball(0.19, fur, 0, 0.63, 0);
      face(0, 0.63, 0, 0.19);
      ball(0.07, light, 0, 0.6, 0.15, 1.2, 0.85, 0.8);
      ball(0.022, mat(DARK), 0, 0.62, 0.21);
      for (const s of [-1, 1]) {
        ball(0.07, fur, s * 0.15, 0.8, -0.02);
        ball(0.04, light, s * 0.15, 0.8, 0.02, 1, 1, 0.5);
        ball(0.08, fur, s * 0.24, 0.32, 0.08, 0.8, 1.3, 0.8).rotation.z = s * 0.5;
        ball(0.09, fur, s * 0.14, 0.06, 0.18, 1, 0.8, 1.3);
      }
      const bow = mat(0xf06a8a);
      for (const s of [-1, 1]) cone(0.05, 0.09, bow, s * 0.045, 0.47, 0.15, 4).rotation.z = s * Math.PI / 2;
      ball(0.025, bow, 0, 0.47, 0.16);
      break;
    }
    // ======== 小物 ========
    case 'mug': {
      cyl(0.055, 0.05, 0.1, mat(0xffb8c8), 0, 0.05, 0, 12);
      cyl(0.048, 0.048, 0.005, mat(0x7a4a2a), 0, 0.095, 0, 12);
      torus(0.03, 0.01, mat(0xffb8c8), 0.065, 0.05, 0, Math.PI * 2, 10);
      stand(heart(0.018), 0.004, mat(0xffffff), 0, 0.055, 0.054);
      break;
    }
    case 'books': {
      const cols = [0x5a8ad8, 0xe8c45a, 0xd85a5a, 0x6ab07a];
      let y = 0;
      [[0.26, 0.05, 0.18, 0.1], [0.22, 0.04, 0.16, -0.15], [0.24, 0.045, 0.17, 0.3], [0.18, 0.035, 0.13, -0.05]].forEach(([w, h, d, r], k) => {
        box(w, h, d, mat(cols[k]), 0, y + h / 2, 0).rotation.y = r;
        box(w - 0.02, h - 0.012, d + 0.004, mat(0xfff8e8), 0.01, y + h / 2, 0).rotation.y = r;
        y += h;
      });
      ball(0.02, mat(0xffd23a), 0.03, y + 0.02, 0);
      break;
    }
    case 'honey': {
      cyl(0.075, 0.07, 0.12, mat(0xf0a830, { transparent: true, opacity: 0.85, roughness: 0.3 }), 0, 0.06, 0, 12);
      cyl(0.085, 0.085, 0.025, mat(0xd8584a), 0, 0.13, 0, 12);
      for (let k = 0; k < 4; k++) box(0.02, 0.02, 0.02, mat(0xffffff), Math.cos(k * 1.57) * 0.075, 0.131, Math.sin(k * 1.57) * 0.075);
      ball(0.02, mat(0xf0a830), 0.07, 0.1, 0.03, 1, 1.6, 1);
      ball(0.03, mat(0xffd23a), 0.06, 0.2, 0.04, 1.2, 1, 1);
      box(0.012, 0.035, 0.035, mat(DARK), 0.06, 0.2, 0.04);
      for (const s of [-1, 1]) ball(0.02, glass(0xffffff, 0.7), 0.06, 0.23, 0.04 + s * 0.025, 1, 0.5, 1);
      break;
    }
    case 'pumpkin': {
      const o = mat(0xf0903a);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ball(0.09, o, Math.cos(a) * 0.065, 0.1, Math.sin(a) * 0.065, 0.8, 1, 0.8);
      }
      ball(0.1, o, 0, 0.1, 0);
      cyl(0.015, 0.02, 0.06, mat(0x6a8a3a), 0, 0.21, 0, 5).rotation.z = 0.2;
      ball(0.035, mat(0x6ab06a), 0.04, 0.21, 0, 1.4, 0.25, 0.9);
      face(0, 0.1, 0.02, 0.12);
      break;
    }
    case 'basket': {
      const w = mat(0xc8995a);
      cyl(0.17, 0.14, 0.14, w, 0, 0.07, 0, 10);
      for (const s of [-1, 1]) {
        const c = box(0.18, 0.06, 0.05, mat(s > 0 ? 0xe85a5a : 0xffffff), s * 0.04, 0.16, 0.03);
        c.rotation.set(0.3, s * 0.4, 0);
      }
      ball(0.04, mat(0xe85a5a), -0.07, 0.16, -0.05);
      ball(0.035, mat(0x9ad06a), 0.06, 0.16, -0.06);
      const hd = torus(0.13, 0.012, w, 0, 0.14, 0, Math.PI, 10);
      hd.rotation.y = Math.PI / 2;
      break;
    }
    case 'clock': {
      const red = mat(0xe8645a);
      const body = cyl(0.11, 0.11, 0.07, red, 0, 0.14, 0, 16);
      body.rotation.x = Math.PI / 2;
      const f = cyl(0.09, 0.09, 0.01, mat(0xffffff), 0, 0.14, 0.036, 16);
      f.rotation.x = Math.PI / 2;
      box(0.008, 0.06, 0.005, mat(DARK), 0, 0.165, 0.043);
      box(0.045, 0.008, 0.005, mat(DARK), 0.02, 0.14, 0.043);
      for (const s of [-1, 1]) {
        dome(0.045, mat(0xf2c14e), s * 0.07, 0.235, 0).rotation.z = -s * 0.5;
        cyl(0.012, 0.008, 0.05, red, s * 0.07, 0.025, 0, 5).rotation.z = s * 0.4;
      }
      ball(0.012, mat(0xf2c14e), 0, 0.26, 0);
      break;
    }
    case 'cake': {
      cyl(0.16, 0.16, 0.015, mat(0xffffff), 0, 0.0075, 0, 16);
      cyl(0.11, 0.11, 0.1, mat(0xfff0e0), 0, 0.065, 0, 16);
      cyl(0.115, 0.115, 0.03, mat(0xffc0d0), 0, 0.125, 0, 16);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ball(0.02, mat(0xffffff), Math.cos(a) * 0.09, 0.145, Math.sin(a) * 0.09);
      }
      for (const [x, z] of [[0, 0], [0.05, 0.04], [-0.05, 0.03], [0.01, -0.06]]) {
        cone(0.025, 0.045, mat(0xe8304a), x, 0.16, z, 6).rotation.x = Math.PI;
        cone(0.014, 0.012, mat(0x5aa04a), x, 0.186, z, 5);
      }
      break;
    }
    case 'teapot': {
      const m = mat(0xa8d8c8);
      ball(0.1, m, 0, 0.09, 0, 1, 0.85, 1);
      cyl(0.05, 0.06, 0.02, m, 0, 0.17);
      ball(0.018, mat(0xffffff), 0, 0.19);
      const sp = cyl(0.015, 0.025, 0.1, m, 0.11, 0.11, 0, 6);
      sp.rotation.z = -0.9;
      torus(0.045, 0.012, m, -0.1, 0.1, 0, Math.PI * 2, 10);
      stand(heart(0.025), 0.004, mat(0xffffff), 0, 0.1, 0.1);
      for (const [x, z] of [[0.05, 0.15], [-0.08, 0.14]]) {
        cyl(0.035, 0.025, 0.05, mat(0xffffff), x, 0.025, z, 10);
        cyl(0.03, 0.03, 0.004, mat(0xc8884a), x, 0.048, z, 10);
      }
      break;
    }
    case 'globe': {
      cyl(0.08, 0.1, 0.03, mat(0x8a5a36), 0, 0.015);
      cyl(0.012, 0.012, 0.08, mat(0xd8a84a), 0, 0.06);
      const ring = torus(0.135, 0.01, mat(0xd8a84a, { metalness: 0.4, roughness: 0.4 }), 0, 0.23, 0, Math.PI * 1.3, 16);
      ring.rotation.set(0, Math.PI / 2, 0.75);
      ball(0.12, mat(0x6ab0e8), 0, 0.23, 0);
      const land = mat(0x8ad06a);
      for (const [a, b, s] of [[0.3, 0.4, 1], [2.0, -0.2, 0.8], [3.8, 0.6, 0.9], [5.0, -0.5, 0.7]]) {
        const p = ball(0.045 * s, land, Math.cos(a) * Math.cos(b) * 0.112, 0.23 + Math.sin(b) * 0.112, Math.sin(a) * Math.cos(b) * 0.112, 1.3, 1, 0.5);
        p.lookAt(0, 0.23, 0);
      }
      break;
    }
    case 'radio': {
      const y = mat(0xf2c870);
      box(0.3, 0.19, 0.12, y, 0, 0.1);
      const sp = cyl(0.06, 0.06, 0.01, mat(0x8a5a36), -0.06, 0.1, 0.062, 14);
      sp.rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) box(0.08, 0.008, 0.004, mat(0xd8a050), -0.06, 0.08 + k * 0.02, 0.068);
      box(0.1, 0.04, 0.005, mat(0xfff6e0), 0.08, 0.14, 0.062);
      for (const x of [0.05, 0.11]) {
        const k = cyl(0.018, 0.018, 0.02, mat(0xe85a5a), x, 0.07, 0.065, 8);
        k.rotation.x = Math.PI / 2;
      }
      const ant = cyl(0.005, 0.005, 0.22, mat(0xc8c8c8), 0.1, 0.28, -0.03, 4);
      ant.rotation.z = -0.4;
      ball(0.012, mat(0xe85a5a), 0.145, 0.38, -0.03);
      const hd = torus(0.08, 0.012, mat(0x8a5a36), 0, 0.19, 0, Math.PI, 10);
      hd.rotation.y = 0;
      break;
    }
    case 'frame': {
      const wood = mat(0x6b4a2e);
      box(0.04, 0.6, 0.04, wood, -0.12, 0.3, -0.05).rotation.x = -0.15;
      box(0.04, 0.6, 0.04, wood, 0.12, 0.3, -0.05).rotation.x = -0.15;
      const f = box(0.42, 0.34, 0.03, wood, 0, 0.5, 0.02);
      f.rotation.x = -0.15;
      const pic = box(0.34, 0.26, 0.01, glow(0x8fb8d8), 0, 0.5, 0.04);
      pic.rotation.x = -0.15;
      const hill = box(0.34, 0.1, 0.012, glow(0x7aa86a), 0, 0.44, 0.045);
      hill.rotation.x = -0.15;
      break;
    }
    case 'fishbowl': {
      cyl(0.11, 0.11, 0.02, mat(0xe8dcc0), 0, 0.03, 0, 12);
      for (let k = 0; k < 6; k++) ball(0.022, mat([0xffa8c8, 0xa8d8ff, 0xfff0a0][k % 3]), Math.cos(k) * 0.06, 0.045, Math.sin(k) * 0.06);
      cone(0.012, 0.09, mat(0x5aa04a), -0.04, 0.09, -0.03, 4);
      cone(0.012, 0.07, mat(0x5aa04a), -0.02, 0.08, -0.05, 4);
      ball(0.035, mat(0xff8a3a), 0.02, 0.15, 0.02, 1.3, 1, 0.8);
      cone(0.025, 0.04, mat(0xff8a3a), -0.03, 0.15, 0.02, 4).rotation.z = Math.PI / 2;
      ball(0.008, mat(DARK), 0.055, 0.16, 0.035);
      add(new THREE.SphereGeometry(0.16, 18, 12, 0, Math.PI * 2, 0.35, Math.PI - 0.35), glass(0xcfeeff, 0.28), 0, 0.15, 0);
      torus(0.055, 0.012, glass(0xe8f8ff, 0.5), 0, 0.3, 0, Math.PI * 2, 14).rotation.x = Math.PI / 2;
      break;
    }
    case 'crystal': {
      cyl(0.08, 0.1, 0.05, mat(0x6a4a8a), 0, 0.025, 0, 10);
      cyl(0.09, 0.09, 0.012, mat(0xd8a84a, { metalness: 0.4, roughness: 0.4 }), 0, 0.055, 0, 12);
      ball(0.035, glow(0xff9ad8), 0, 0.16, 0);
      for (let k = 0; k < 5; k++) ball(0.01, glow(0xfff2b0), Math.cos(k * 1.3) * 0.06, 0.12 + (k % 3) * 0.04, Math.sin(k * 1.3) * 0.06);
      add(new THREE.SphereGeometry(0.11, 16, 12), glass(0xd8c8ff, 0.4), 0, 0.165, 0);
      break;
    }
    case 'chime': {
      const wood = mat(0x8a5a36);
      cyl(0.12, 0.14, 0.04, wood, 0, 0.02);
      cyl(0.018, 0.018, 0.9, wood, 0, 0.47, 0, 6);
      box(0.36, 0.03, 0.03, wood, 0.15, 0.9, 0);
      for (const [x, c] of [[0.12, 0xa8d8ff], [0.28, 0xffc0d8]]) {
        cyl(0.003, 0.003, 0.1, mat(0xffffff), x, 0.84, 0, 4);
        dome(0.05, glass(c, 0.6), x, 0.74, 0, 1.1);
        ball(0.01, mat(0xd8584a), x, 0.735, 0);
        box(0.04, 0.12, 0.004, mat(c), x, 0.66, 0).rotation.z = 0.1;
      }
      break;
    }
    case 'easel': {
      const wood = mat(0xc08a5a);
      for (const s of [-1, 1]) {
        const l = box(0.03, 0.9, 0.03, wood, s * 0.17, 0.44, 0.0);
        l.rotation.set(0.12, 0, s * 0.16);
      }
      const back = box(0.03, 0.88, 0.03, wood, 0, 0.42, -0.14);
      back.rotation.x = -0.3;
      box(0.4, 0.03, 0.08, wood, 0, 0.3, 0.08);
      const cv = box(0.4, 0.32, 0.02, mat(0xffffff), 0, 0.5, 0.06);
      cv.rotation.x = -0.12;
      const paint = [[0xff9ab0, -0.08, 0.55], [0xffd86b, 0.07, 0.6], [0x8ad0ff, 0.06, 0.45], [0x9ae08a, -0.09, 0.43]];
      for (const [c, x, y] of paint) {
        const p = ball(0.05, mat(c), x, y, 0.075 + (0.5 - y) * 0.12, 1, 1, 0.12);
        p.rotation.x = -0.12;
      }
      stand(heart(0.04), 0.01, mat(0xf0506a), 0, 0.5, 0.08).rotation.x = -0.12;
      box(0.1, 0.012, 0.06, mat(0xfff0d8), -0.1, 0.32, 0.08);
      break;
    }
    case 'guitar': {
      const wood = mat(0xe0954a);
      const gt = new THREE.Group();
      gt.position.set(0, 0.02, -0.04);
      gt.rotation.x = -0.22;
      g.add(gt);
      const put = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        gt.add(mesh);
        return mesh;
      };
      put(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), wood, 0, 0.2, 0).rotation.x = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), wood, 0, 0.4, 0).rotation.x = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12), mat(0x3a2414), 0, 0.33, 0.041).rotation.x = Math.PI / 2;
      put(new THREE.BoxGeometry(0.05, 0.42, 0.03), mat(0x7a4a26), 0, 0.72, 0);
      put(new THREE.BoxGeometry(0.08, 0.12, 0.035), mat(0x7a4a26), 0, 0.98, 0);
      put(new THREE.BoxGeometry(0.1, 0.02, 0.02), mat(0x3a2414), 0, 0.15, 0.045);
      for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.003, 0.82, 0.003), mat(0xf0f0f0), -0.012 + k * 0.012, 0.57, 0.045);
      // 小小的架子
      box(0.3, 0.03, 0.06, mat(0x5a3c26), 0, 0.015, 0.02);
      box(0.03, 0.42, 0.03, mat(0x5a3c26), 0, 0.2, -0.16).rotation.x = -0.22;
      break;
    }
    // ---- 🧱 隔間牆：貼在格子後面那一邊（轉方向就換邊） ----
    case 'wall_log': {
      const E = -0.37;
      for (let k = 0; k < 7; k++) {
        const log = cyl(0.085, 0.085, 0.82, mat(k % 2 ? 0x9a6a40 : 0x8a5c36), 0, 0.09 + k * 0.165, E, 8);
        log.rotation.z = Math.PI / 2;
      }
      break;
    }
    case 'wall_plank': {
      const E = -0.37;
      box(0.8, 1.9, 0.07, mat(0xf3ead8), 0, 0.95, E);
      for (let k = 1; k < 5; k++) box(0.012, 1.9, 0.075, mat(0xd8cbb2), -0.4 + k * 0.16, 0.95, E);
      box(0.82, 0.08, 0.09, mat(0xd8cbb2), 0, 1.9, E);
      break;
    }
    case 'wall_low': {
      const E = -0.37;
      box(0.8, 0.85, 0.1, mat(0xc9a874), 0, 0.425, E);
      box(0.84, 0.06, 0.16, mat(0x8a5e3a), 0, 0.88, E);
      break;
    }
    case 'wall_door': {
      const E = -0.37;
      const w = mat(0xb08a5e);
      box(0.13, 1.9, 0.08, w, -0.335, 0.95, E);
      box(0.13, 1.9, 0.08, w, 0.335, 0.95, E);
      box(0.8, 0.3, 0.08, w, 0, 1.75, E);
      box(0.56, 0.05, 0.1, mat(0x7a5236), 0, 1.6, E);
      break;
    }
    case 'wall_glass': {
      const E = -0.37;
      const fr = mat(0x7a5236);
      box(0.8, 0.5, 0.08, fr, 0, 0.25, E);
      box(0.8, 0.08, 0.08, fr, 0, 1.86, E);
      for (const x of [-0.37, 0, 0.37]) box(0.06, 1.4, 0.08, fr, x, 1.2, E);
      box(0.8, 0.05, 0.08, fr, 0, 1.2, E);
      box(0.76, 1.36, 0.02, glass(0xcfeeff, 0.3), 0, 1.18, E);
      break;
    }
    // ---- 🐠 大魚缸：放進一條自己釣過的魚 ----
    case 'aquarium': {
      box(0.72, 0.36, 0.48, mat(0x7a5236), 0, 0.18, 0);
      box(0.74, 0.03, 0.5, mat(0x5a3c26), 0, 0.375, 0);
      box(0.68, 0.05, 0.44, mat(0xe8d6a8), 0, 0.415, 0); // 沙
      box(0.68, 0.42, 0.44, glass(0x6ab8e8, 0.28), 0, 0.6, 0); // 水
      for (const [x, h] of [[-0.24, 0.26], [-0.18, 0.18], [0.25, 0.22]]) cone(0.03, h, mat(0x4f9a4a), x, 0.44 + h / 2, -0.12, 5);
      ball(0.04, mat(0xb0a898), 0.15, 0.45, 0.1);
      box(0.72, 0.03, 0.48, mat(0x5a3c26), 0, 0.825, 0);
      const fish = tankFish(opts.fish, 0.62, 0.16, 1, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_s': {
      // 小魚缸（放桌上）：只放得下 1～2 星的小魚
      box(0.34, 0.03, 0.22, mat(0x5a3c26), 0, 0.015, 0);
      box(0.32, 0.03, 0.2, mat(0xe8d6a8), 0, 0.045, 0);
      box(0.32, 0.24, 0.2, glass(0x8ac8f0, 0.3), 0, 0.15, 0);
      cone(0.015, 0.1, mat(0x4f9a4a), -0.1, 0.1, -0.05, 4);
      const fish = tankFish(opts.fish, 0.15, 0.07, 0.55, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_round': {
      // 圓形魚缸：最多放 3 星的魚
      cyl(0.26, 0.3, 0.32, mat(0x7a5236), 0, 0.16, 0, 14);
      add(new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0.3, Math.PI - 0.3), glass(0x7ac0ea, 0.3), 0, 0.62, 0);
      cyl(0.2, 0.2, 0.03, mat(0xe8d6a8), 0, 0.37, 0, 14);
      cone(0.02, 0.18, mat(0x4f9a4a), 0.1, 0.46, -0.06, 4);
      torus(0.12, 0.02, glass(0xe8f8ff, 0.5), 0, 0.9, 0, Math.PI * 2, 14).rotation.x = Math.PI / 2;
      const fish = tankFish(opts.fish, 0.62, 0.1, 0.85, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_l': {
      // 巨型水族箱：什麼魚都放得下，魚王也行（可以往上疊）
      box(0.78, 0.3, 0.6, mat(0x3a2a1a), 0, 0.15, 0);
      box(0.76, 0.06, 0.58, mat(0xe8d6a8), 0, 0.33, 0);
      box(0.76, 0.9, 0.58, glass(0x4a9ad8, 0.3), 0, 0.81, 0);
      for (const [x, h] of [[-0.3, 0.6], [-0.22, 0.42], [0.3, 0.5], [0.22, 0.32]]) cone(0.04, h, mat(0x3f8a4a), x, 0.36 + h / 2, -0.2, 5);
      for (const [x, z] of [[0.1, 0.15], [-0.12, 0.18]]) ball(0.06, mat(0xb0a898), x, 0.38, z);
      box(0.8, 0.04, 0.62, mat(0x3a2a1a), 0, 1.28, 0);
      box(0.6, 0.02, 0.4, glow(0xbfe8ff), 0, 1.255, 0); // 水族燈
      const fish = tankFish(opts.fish, 0.82, 0.2, 1.5, DARK);
      if (fish) g.add(fish);
      break;
    }
    // ---- 🐟 11/07 新魚缸 ----
    case 'tank_jar': {
      // 玻璃罐小魚缸（放桌上）：1 星小魚
      cyl(0.11, 0.1, 0.02, mat(0x8a6a48), 0, 0.01, 0, 12);
      cyl(0.1, 0.1, 0.02, mat(0xe8d6a8), 0, 0.03, 0, 12);
      cyl(0.105, 0.1, 0.2, glass(0x9ad4f2, 0.3), 0, 0.12, 0, 14);
      cyl(0.07, 0.08, 0.04, mat(0xc89a62), 0, 0.24, 0, 10); // 軟木塞
      cone(0.012, 0.08, mat(0x4f9a4a), 0.05, 0.08, -0.03, 4);
      const fish = tankFish(opts.fish, 0.12, 0.03, 0.42, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_cube': {
      // 方形桌上缸：2 星
      box(0.3, 0.03, 0.3, mat(0x3a2a1a), 0, 0.015, 0);
      box(0.28, 0.03, 0.28, mat(0xe8d6a8), 0, 0.045, 0);
      box(0.28, 0.26, 0.28, glass(0x7ec4ee, 0.28), 0, 0.17, 0);
      for (const [x, z, c] of [[-0.08, 0.06, 0xb0a898], [0.07, -0.05, 0x8f8778]]) ball(0.03, mat(c), x, 0.07, z);
      cone(0.015, 0.14, mat(0x4f9a4a), -0.09, 0.13, -0.08, 4);
      const fish = tankFish(opts.fish, 0.18, 0.06, 0.5, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_wood': {
      // 木框復古缸：4 隻腳的木架＋木框
      const wd = mat(0x8a5a32);
      for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) box(0.05, 0.42, 0.05, wd, x, 0.21, z);
      box(0.66, 0.04, 0.46, wd, 0, 0.42, 0);
      box(0.6, 0.04, 0.4, mat(0xe8d6a8), 0, 0.46, 0);
      box(0.6, 0.4, 0.4, glass(0x6ab8e8, 0.28), 0, 0.68, 0);
      for (const [x, z] of [[-0.31, -0.21], [0.31, -0.21], [-0.31, 0.21], [0.31, 0.21]]) box(0.04, 0.44, 0.04, wd, x, 0.66, z);
      box(0.66, 0.04, 0.46, wd, 0, 0.9, 0);
      cone(0.03, 0.22, mat(0x4f9a4a), -0.2, 0.59, -0.12, 5);
      ball(0.05, mat(0xb0a898), 0.18, 0.5, 0.1);
      const fish = tankFish(opts.fish, 0.68, 0.15, 0.9, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_plant': {
      // 水草造景缸：低櫃＋滿滿的水草和石頭
      box(0.78, 0.36, 0.44, mat(0x2f3a2a), 0, 0.18, 0);
      box(0.76, 0.05, 0.42, mat(0x5a4a32), 0, 0.385, 0);
      box(0.76, 0.42, 0.42, glass(0x5fc0b0, 0.26), 0, 0.62, 0);
      const greens = [0x3f8a4a, 0x5aa84a, 0x2e7a50, 0x7cbc5a];
      [[-0.32, 0.3], [-0.25, 0.22], [-0.17, 0.34], [-0.06, 0.16], [0.14, 0.2], [0.24, 0.36], [0.31, 0.26]].forEach(([x, h], i) => cone(0.035, h, mat(greens[i % 4]), x, 0.41 + h / 2, -0.12 + (i % 3) * 0.04, 5));
      for (const [x, z, r] of [[0.02, 0.05, 0.07], [-0.12, 0.1, 0.045], [0.2, 0.08, 0.05]]) ball(r, mat(0x8f8778), x, 0.41 + r * 0.6, z, 1.3, 0.8, 1);
      box(0.8, 0.04, 0.44, mat(0x2f3a2a), 0, 0.85, 0);
      box(0.6, 0.02, 0.3, glow(0xd8ffe8), 0, 0.825, 0);
      const fish = tankFish(opts.fish, 0.66, 0.18, 1, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'tank_tube': {
      // 圓柱水族箱：高高的玻璃圓柱，氣泡往上冒
      cyl(0.3, 0.32, 0.28, mat(0x3a2a1a), 0, 0.14, 0, 18);
      cyl(0.27, 0.27, 0.04, mat(0xe8d6a8), 0, 0.3, 0, 18);
      cyl(0.27, 0.27, 1.1, glass(0x5aaee6, 0.26), 0, 0.85, 0, 20);
      cyl(0.3, 0.3, 0.06, mat(0x3a2a1a), 0, 1.43, 0, 18);
      torus(0.24, 0.015, glow(0xbfe8ff), 0, 1.39, 0).rotation.x = Math.PI / 2;
      cone(0.04, 0.5, mat(0x3f8a4a), -0.12, 0.57, -0.08, 5);
      cone(0.03, 0.34, mat(0x5aa84a), 0.1, 0.49, -0.1, 5);
      for (let i = 0; i < 6; i++) ball(0.018, glass(0xe8f8ff, 0.55), 0.14, 0.45 + i * 0.16, 0.08);
      const fish = tankFish(opts.fish, 0.9, 0.12, 1.1, DARK);
      if (fish) g.add(fish);
      break;
    }
    case 'koi_pond': {
      // 室內錦鯉池：地上的小池子，佔 2×2 格（往右、往後各多一格）
      const pond = new THREE.Group();
      pond.position.set(0.4, 0, -0.4);
      g.add(pond);
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), glass(0x4a9ad8, 0.45));
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.1;
      pond.add(water);
      const bed = new THREE.Mesh(new THREE.CircleGeometry(0.64, 24), mat(0x3d5a4a));
      bed.rotation.x = -Math.PI / 2;
      bed.position.y = 0.02;
      pond.add(bed);
      const stones = [0x9a9286, 0xb0a898, 0x8f8778];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = 0.08 + ((i * 7) % 3) * 0.012;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(stones[i % 3]));
        st.position.set(Math.cos(a) * 0.68, r * 0.7, Math.sin(a) * 0.68);
        st.scale.set(1.3, 0.8, 1);
        st.rotation.y = a;
        pond.add(st);
      }
      for (const [x, z] of [[-0.25, 0.2], [0.28, -0.15], [0.05, 0.32]]) {
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10, 0.3, Math.PI * 2 - 0.6), mat(0x5aa84a));
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(x, 0.105, z);
        pond.add(pad);
      }
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 6), mat(0xf5a8c8));
      lotus.position.set(-0.25, 0.14, 0.2);
      pond.add(lotus);
      const fish = tankFish(opts.fish, 0.08, 0.36, 1.2, DARK);
      if (fish) {
        fish.userData.swim.zk = 1; // 圓圓的池子：繞圈游
        pond.add(fish);
      }
      break;
    }
    case 'tank_wall': {
      // 整面牆水族箱：兩格寬、靠牆的大水族箱（往右多一格）
      const wall = new THREE.Group();
      wall.position.set(0.4, 0, -0.18);
      g.add(wall);
      const add2 = (geo, m, x, y, z) => {
        const o = new THREE.Mesh(geo, m);
        o.position.set(x, y, z);
        wall.add(o);
        return o;
      };
      const dark = mat(0x2a2420);
      add2(new THREE.BoxGeometry(1.5, 0.3, 0.42), dark, 0, 0.15, 0);
      add2(new THREE.BoxGeometry(1.46, 0.06, 0.4), mat(0xe8d6a8), 0, 0.33, 0);
      add2(new THREE.BoxGeometry(1.46, 1.2, 0.4), glass(0x3f8fd0, 0.3), 0, 0.96, 0);
      add2(new THREE.BoxGeometry(1.5, 0.06, 0.42), dark, 0, 1.59, 0);
      add2(new THREE.BoxGeometry(1.2, 0.02, 0.26), glow(0xbfe8ff), 0, 1.555, 0);
      const greens = [0x3f8a4a, 0x5aa84a, 0x2e7a50];
      [[-0.62, 0.7], [-0.5, 0.45], [-0.3, 0.3], [0.35, 0.55], [0.52, 0.8], [0.64, 0.4]].forEach(([x, h], i) => add2(new THREE.ConeGeometry(0.045, h, 5), mat(greens[i % 3]), x, 0.36 + h / 2, -0.1));
      for (const [x, r] of [[-0.1, 0.09], [0.12, 0.06], [0.45, 0.07]]) add2(new THREE.DodecahedronGeometry(r, 0), mat(0x8f8778), x, 0.38, 0.05);
      const fish = tankFish(opts.fish, 1.0, 0.5, 1.6, DARK);
      if (fish) {
        fish.userData.swim.zk = 0.2; // 水族箱很窄：前後少游一點
        wall.add(fish);
      }
      break;
    }
    // ---------- 🎫 月票家具（11/09 構圖，還沒上架） ----------
    case 'pass_eggchair': {
      // 🪺 吊籃椅：C 字形支架吊著一顆藤編蛋形籃（開口朝前），裡面一顆軟墊
      const metal = mat(0x3a3430, { metalness: 0.4, roughness: 0.5 });
      cyl(0.26, 0.3, 0.05, metal, 0.05, 0.025, -0.18, 16);
      const arc = torus(0.75, 0.035, metal, -0.2, 0.77, -0.18, Math.PI * 0.95, 20);
      arc.rotation.z = -Math.PI * 0.42;
      cyl(0.012, 0.012, 0.3, metal, 0.12, 1.42, -0.18);
      const n0 = g.children.length; // 從這裡開始是吊著的籃子（會輕輕晃）
      const rattan = mat(0xc9a46a, { side: THREE.DoubleSide });
      const egg = add(new THREE.SphereGeometry(0.4, 20, 14, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0.12, Math.PI * 0.84), rattan, 0.12, 0.85, -0.18);
      egg.scale.set(1, 1.25, 1);
      // 藤編的直條紋
      for (let k = 0; k < 10; k++) {
        const a = Math.PI / 2 + 0.85 + (k / 9) * (Math.PI * 2 - 1.7);
        const rib = torus(0.405, 0.008, mat(0x9a7444), 0.12, 0.85, -0.18, Math.PI * 0.84, 14);
        rib.scale.set(1, 1.25, 1);
        rib.rotation.set(0, -a, Math.PI / 2 - Math.PI * 0.42);
      }
      // 開口的圓邊
      const rim = torus(0.33, 0.025, mat(0x9a7444), 0.12, 0.83, 0.05, Math.PI * 2, 24);
      rim.scale.set(0.95, 1.35, 1);
      ball(0.3, mat(0xf3e2c8), 0.12, 0.6, -0.16, 1, 0.38, 1);
      ball(0.13, mat(0xe8a0a8), 0.04, 0.88, -0.4, 1.4, 0.9, 0.6);
      // 籃子掛在支架頂端的鉤子上：包成一組，homeRoom 讓它繞鉤子輕輕晃
      const sw = new THREE.Group();
      sw.position.set(0.12, 1.3, -0.18);
      sw.userData.sway = true;
      for (const o of g.children.slice(n0)) {
        o.position.sub(sw.position);
        sw.add(o);
      }
      g.add(sw);
      break;
    }
    case 'pass_cloudrug': {
      // ☁️ 雲朵地毯（作者 11/09：星空地毯換成這個）：奶油白、邊緣圓鼓鼓的雲朵形，軟軟的厚一點
      const cloudShape = (sx, sz) => {
        const sh = new THREE.Shape();
        for (let k = 0; k <= 140; k++) {
          const tt = (k / 140) * Math.PI * 2;
          const f = 1 + 0.16 * Math.abs(Math.sin(3.5 * tt)); // 7 個圓鼓鼓的邊
          const x = Math.cos(tt) * sx * f;
          let z = Math.sin(tt) * sz * f;
          if (z < 0) z *= 0.8; // 底邊平一點
          if (k) sh.lineTo(x, z);
          else sh.moveTo(x, z);
        }
        return sh;
      };
      const soft = { depth: 0.015, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 4, curveSegments: 12 };
      const base = add(new THREE.ExtrudeGeometry(cloudShape(0.6, 0.4), soft), mat(0xf3e6cc, { flatShading: false, roughness: 1 }), 0, 0.02, 0.02);
      base.rotation.x = -Math.PI / 2;
      // 上面再鋪一層小一點、更白的雲（像軟墊縫起來的樣子）
      const top = add(new THREE.ExtrudeGeometry(cloudShape(0.44, 0.28), soft), mat(0xfaf3e4, { flatShading: false, roughness: 1 }), 0.02, 0.045, 0.02);
      top.rotation.x = -Math.PI / 2;
      break;
    }
    case 'pass_glowtree': {
      // 🌳 發光室內小樹：陶盆＋彎彎的樹幹，樹冠裡掛滿會亮的小燈球（按 E 換顏色）
      const h = pot(0.2, 0.26, 0xe8dccb);
      const bark = mat(0x6a4a30);
      const t1 = cyl(0.04, 0.06, 0.6, bark, 0.02, h + 0.3);
      t1.rotation.z = -0.12;
      const t2 = cyl(0.025, 0.035, 0.35, bark, -0.1, h + 0.62);
      t2.rotation.z = 0.6;
      const tones = [0xb8d8a8, 0xa8cfa0, 0xc8e4b4];
      const crowns = [[0.06, 1.05, 0, 0.3], [-0.2, 0.95, 0.05, 0.22], [0.24, 0.92, -0.05, 0.2], [0, 1.25, -0.05, 0.2]];
      crowns.forEach(([x, y, z, r], i) => {
        const b = ball(r, mat(tones[i % 3], { emissive: 0xfff0c0, emissiveIntensity: 0.18 }), x, y, z);
        b.scale.y = 0.85;
      });
      // 小燈球貼在樹冠表面，四面八方都有
      const bulbs = [0xffd27a, 0xffb8e0, 0xb8e4ff, 0xfff1a8];
      for (let i = 0; i < 24; i++) {
        const v = -0.55 + (((i * 37) % 100) / 100) * 1.45; // 高低
        const ang = i * 2.39996;
        const h = Math.sqrt(Math.max(0, 1 - v * v));
        ball(0.032, glow(bulbs[i % 4]), 0.03 + Math.cos(ang) * h * 0.46, 1.04 + v * 0.36, Math.sin(ang) * h * 0.34).userData.bulb = i % 4; // 按 E 換顏色用
      }
      break;
    }
    case 'pass_gramophone': {
      // 📀 唱片機：木頭小櫃子上一台黑膠轉盤＋金色大喇叭（按 E 播音樂）
      const wood = mat(0x7a4a2a);
      box(0.56, 0.42, 0.42, wood, 0, 0.21, 0);
      box(0.6, 0.04, 0.46, mat(0x5a3420), 0, 0.44, 0);
      for (const sx of [-1, 1]) box(0.2, 0.2, 0.01, mat(0x5a3420), sx * 0.13, 0.22, 0.215);
      for (const sx of [-1, 1]) ball(0.018, mat(0xd9a84a, { metalness: 0.6, roughness: 0.3 }), sx * 0.05, 0.22, 0.225);
      box(0.4, 0.06, 0.34, mat(0x3a2418), -0.04, 0.49, 0);
      cyl(0.15, 0.15, 0.012, mat(0x141414), -0.06, 0.528, 0.01, 24);
      cyl(0.045, 0.045, 0.014, mat(0xd84a4a), -0.06, 0.53, 0.01, 12);
      const arm = box(0.02, 0.015, 0.18, mat(0xc0c0c0, { metalness: 0.6 }), 0.1, 0.545, 0.0);
      arm.rotation.y = 0.5;
      const gold = mat(0xd9a84a, { metalness: 0.6, roughness: 0.3 });
      const neck = cyl(0.018, 0.022, 0.32, gold, 0.17, 0.66, -0.1);
      neck.rotation.x = 0.25;
      // 大喇叭：開口朝前上方
      const horn = add(new THREE.CylinderGeometry(0.22, 0.02, 0.42, 20, 1, true), mat(0xd9a84a, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), 0.15, 0.93, 0.02);
      horn.rotation.x = 0.85;
      horn.rotation.z = -0.15;
      const lip = add(new THREE.TorusGeometry(0.22, 0.012, 6, 20), gold, 0.15 + 0.03, 0.93 + 0.14, 0.02 + 0.16);
      lip.rotation.x = 0.85 - Math.PI / 2;
      lip.rotation.z = -0.15;
      break;
    }
    case 'pass_chandelier': {
      // 💎 水晶吊燈：金色圓環＋垂下來的水晶，鏈子吊在半空（按 E 開關）
      const gold = mat(0xd9a84a, { metalness: 0.6, roughness: 0.3 });
      const Y = 1.85;
      cyl(0.01, 0.01, 0.7, gold, 0, Y + 0.45);
      const ring = torus(0.32, 0.025, gold, 0, Y, 0, Math.PI * 2, 24);
      ring.rotation.x = Math.PI / 2;
      const ring2 = torus(0.18, 0.02, gold, 0, Y + 0.16, 0, Math.PI * 2, 20);
      ring2.rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const arm = cyl(0.012, 0.012, 0.36, gold, Math.cos(a) * 0.16, Y + 0.08, Math.sin(a) * 0.16);
        arm.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        cyl(0.03, 0.03, 0.06, mat(0xf3ead8), Math.cos(a) * 0.32, Y + 0.05, Math.sin(a) * 0.32);
        ball(0.035, glow(0xffe6a0), Math.cos(a) * 0.32, Y + 0.1, Math.sin(a) * 0.32);
      }
      const crystal = glass(0xdff2ff, 0.65);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.26;
        const r = i % 2 ? 0.3 : 0.2;
        const len = i % 2 ? 0.16 : 0.24;
        cyl(0.003, 0.003, len, gold, Math.cos(a) * r, Y - len / 2, Math.sin(a) * r, 4);
        const c = add(new THREE.OctahedronGeometry(0.035, 0), crystal, Math.cos(a) * r, Y - len - 0.03, Math.sin(a) * r);
        c.scale.y = 1.7;
      }
      add(new THREE.OctahedronGeometry(0.06, 0), crystal, 0, Y - 0.32, 0).scale.y = 1.8;
      break;
    }
    case 'pass_canopybed': {
      // 🛏️ 四柱紗帳床：比睡鋪大一點，四根木柱上掛著半透明的紗帳
      const z0 = -0.3;
      const wood = mat(0xe8dccb);
      box(0.86, 0.16, 1.46, wood, 0, 0.12, z0);
      box(0.82, 0.12, 1.4, mat(0xfaf3e6), 0, 0.26, z0);
      box(0.84, 0.06, 0.82, mat(0xb8a0d8), 0, 0.33, 0.02);
      ball(0.13, mat(0xffffff), -0.18, 0.37, -0.82, 1.4, 0.6, 1);
      ball(0.13, mat(0xffffff), 0.18, 0.37, -0.82, 1.4, 0.6, 1);
      box(0.9, 0.7, 0.08, wood, 0, 0.45, -1.02);
      const H = 1.85;
      const posts = [[-0.43, 0.42], [0.43, 0.42], [-0.43, -1.02], [0.43, -1.02]];
      for (const [x, z] of posts) {
        cyl(0.03, 0.035, H, wood, x, H / 2, z, 8);
        ball(0.045, wood, x, H + 0.02, z);
      }
      for (const z of [0.42, -1.02]) box(0.9, 0.05, 0.05, wood, 0, H - 0.02, z);
      for (const x of [-0.43, 0.43]) box(0.05, 0.05, 1.48, wood, x, H - 0.02, z0 + 0.0);
      // 紗帳：頂上一片＋四個角綁起來的布
      const veil = mat(0xffffff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, flatShading: false });
      box(0.9, 0.01, 1.48, veil, 0, H - 0.04, z0 + 0.0);
      for (const [x, z] of posts) {
        const curtain = add(new THREE.CylinderGeometry(0.07, 0.07, H - 0.25, 10, 1, true), veil, x * 0.94, (H - 0.25) / 2 + 0.2, z + (z > 0 ? -0.04 : 0.04));
        curtain.scale.z = 0.7;
        add(new THREE.ConeGeometry(0.12, 0.25, 10, 1, true), veil, x * 0.94, 0.3, z + (z > 0 ? -0.04 : 0.04));
        torus(0.06, 0.012, mat(0xd9a84a), x * 0.94, 0.95, z + (z > 0 ? -0.04 : 0.04)).rotation.x = Math.PI / 2;
      }
      break;
    }
    // ---------- 🌅 早安卡限定小家具（11/09） ----------
    case 'login_lantern': {
      // 🏮 星星紙燈籠：圓圓的米色紙燈籠，表面挖了小星星，裡面透出暖光，掛在小木架上
      const wood = mat(0x7a5236);
      box(0.05, 0.62, 0.05, wood, -0.16, 0.31, 0);
      box(0.24, 0.04, 0.05, wood, -0.06, 0.6, 0);
      cyl(0.006, 0.006, 0.1, mat(0x5a3c26), 0.05, 0.53, 0);
      const paper = mat(0xf6e4c0, { emissive: 0xffb860, emissiveIntensity: 0.55, flatShading: false });
      const l = ball(0.13, paper, 0.05, 0.36, 0);
      l.scale.y = 1.12;
      for (const y of [0.22, 0.5]) torus(0.07, 0.012, mat(0xc9533c), 0.05, y, 0).rotation.x = Math.PI / 2;
      for (const [a, y] of [[0.3, 0.38], [1.6, 0.32], [2.6, 0.42], [-0.9, 0.3], [-2.0, 0.4]]) {
        const st = add(new THREE.ExtrudeGeometry(star(0.028), { depth: 0.004, bevelEnabled: false }), glow(0xfff1b8), 0.05 + Math.sin(a) * 0.131, y, Math.cos(a) * 0.131);
        st.rotation.y = a;
      }
      cyl(0.022, 0.022, 0.04, mat(0xc9533c), 0.05, 0.505, 0);
      break;
    }
    case 'login_terrarium': {
      // 🪴 玻璃小花園：木底座＋玻璃圓罩，裡面有青苔、小蘑菇、小石頭
      cyl(0.17, 0.19, 0.06, mat(0x8a5e3a), 0, 0.03, 0, 18);
      cyl(0.15, 0.15, 0.03, mat(0x4f8a3c, { flatShading: false }), 0, 0.075, 0, 18);
      ball(0.05, mat(0x6aa84f), -0.06, 0.08, 0.03, 1, 0.5, 1);
      ball(0.04, mat(0x5a9a45), 0.05, 0.08, -0.05, 1, 0.5, 1);
      for (const [x, z, h, c] of [[0.04, 0.05, 0.08, 0xe8584a], [-0.03, -0.05, 0.06, 0xf3ecdf], [0.08, -0.01, 0.05, 0xe8584a]]) {
        cyl(0.008, 0.01, h, mat(0xf3ead8), x, 0.09 + h / 2, z, 6);
        dome(0.028, mat(c), x, 0.09 + h, z, 0.7);
      }
      add(new THREE.DodecahedronGeometry(0.03, 0), mat(0x9a9488), -0.08, 0.1, -0.02);
      const dm = add(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass(0xdff2ff, 0.25), 0, 0.09, 0);
      dm.scale.y = 1.35;
      ball(0.02, mat(0x8a5e3a), 0, 0.31, 0);
      break;
    }
    case 'login_candle': {
      // 🕯️ 香氛蠟燭罐：玻璃罐裡一根奶油色蠟燭，小火苗＋木蓋放旁邊、乾燥花一小束
      add(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 18, 1, true), glass(0xf3d9b0, 0.4), 0, 0.065, 0);
      cyl(0.075, 0.075, 0.01, glass(0xf3d9b0, 0.5), 0, 0.005, 0, 18);
      cyl(0.068, 0.068, 0.08, mat(0xf6ead2, { flatShading: false }), 0, 0.045, 0, 18);
      cyl(0.003, 0.003, 0.025, mat(0x2a1a14), 0, 0.1, 0, 4);
      const fl = add(new THREE.ConeGeometry(0.012, 0.04, 8), glow(0xffc46b), 0, 0.13, 0);
      fl.scale.set(1, 1, 1);
      cyl(0.08, 0.08, 0.02, mat(0x8a5e3a), 0.13, 0.01, 0.05, 18);
      for (const [x, z, c] of [[-0.11, 0.04, 0xb8a0d8], [-0.12, 0.0, 0xe8b0c0], [-0.1, -0.03, 0xf3ecdf]]) {
        const st = cyl(0.003, 0.003, 0.14, mat(0x6a8a4a), x, 0.07, z, 4);
        st.rotation.z = 0.25;
        ball(0.015, mat(c), x - 0.018, 0.14, z);
      }
      break;
    }
    case 'login_foxpillow': {
      // 🦊 狐狸抱枕：橘色圓圓的狐狸臉抱枕，白色臉頰、三角耳朵
      const orange = mat(0xf08a3c);
      const white = mat(0xfaf3e6);
      const head = ball(0.24, orange, 0, 0.22, 0, 1, 0.9, 0.55);
      head.rotation.x = -0.15;
      for (const sx of [-1, 1]) {
        const ear = cone(0.08, 0.16, orange, sx * 0.15, 0.43, -0.01, 4);
        ear.rotation.z = -sx * 0.35;
        const ein = cone(0.045, 0.09, mat(0x2a1a14), sx * 0.15, 0.42, 0.03, 4);
        ein.rotation.z = -sx * 0.35;
        ball(0.1, white, sx * 0.1, 0.15, 0.08, 1.2, 0.8, 0.5);
      }
      for (const sx of [-1, 1]) {
        ball(0.022, mat(0x2a1a14), sx * 0.08, 0.25, 0.125);
        ball(0.025, mat(0xffa3ad), sx * 0.13, 0.19, 0.115, 1, 0.6, 0.4);
      }
      ball(0.022, mat(0x2a1a14), 0, 0.19, 0.135);
      break;
    }
    default:
      box(0.3, 0.3, 0.3, mat(0xffffff));
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  if (opts.color) tint(g, FURNITURE_COLORS[opts.color] ?? PASS_COLORS.find((c) => c.id === opts.color));
  return g;
}

/** 🐠 魚缸裡的魚（y：游的高度、range：左右游多遠、k：大小） */
function tankFish(index, y, range, k0, DARK) {
  const f = FISH[index];
  if (!f || f.junk) return null;
  const fish = new THREE.Group();
  const k = k0 * (f.legend ? 1.5 : f.rarity >= 5 ? 1.3 : f.rarity >= 4 ? 1.15 : 1);
  const body = f.glow ? mat(f.color, { emissive: f.glow, emissiveIntensity: 0.6 }) : mat(f.color);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), body);
  b.scale.set(1.6, 1, 0.7);
  fish.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), body);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.12;
  fish.add(tail);
  const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.011, 0), mat(DARK));
  eye.position.set(0.07, 0.015, 0.035);
  fish.add(eye);
  fish.scale.setScalar(k);
  fish.position.set(0, y, 0);
  fish.userData.swim = { y, range }; // homeRoom 會讓牠游來游去
  return fish;
}

/** 🎨 換家具的配色：有顏色的部分換成這一組的色調（木頭、白色、黑色保留） */
const tintCache = new Map();
function tint(g, cv) {
  if (!cv?.hue && cv?.hue !== 0) return;
  const hsl = {};
  // 🎫 跳色：這件家具「面積最大」的顏色用主色，其他有顏色的小部分（坐墊、抽屜、床墊）用第二個顏色
  let mainMat = null;
  if (cv.duo) {
    const area = new Map();
    g.traverse((o) => {
      if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
      o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
      area.set(o.material, (area.get(o.material) ?? 0) + r * r);
    });
    let best = -1;
    for (const [m, a] of area) {
      m.color.getHSL(hsl);
      const wood = hsl.h > 0.03 && hsl.h < 0.13 && hsl.l < 0.42;
      if (hsl.s < 0.15 || wood || m.transparent) continue;
      if (a > best) [best, mainMat] = [a, m];
    }
  }
  g.traverse((o) => {
    if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
    const m = o.material;
    const role = cv.duo ? (m === mainMat ? 'p' : 'g') : '';
    const key = `${m.uuid}|${cv.id}|${role}`;
    if (!tintCache.has(key)) {
      m.color.getHSL(hsl);
      const wood = hsl.h > 0.03 && hsl.h < 0.13 && hsl.l < 0.42;
      if (hsl.s < 0.15 || wood || m.transparent) tintCache.set(key, m);
      else {
        const c = m.clone();
        c.color.setHSL(cv.hue, Math.max(cv.sat, hsl.s * 0.7), Math.min(0.85, Math.max(0.15, hsl.l + cv.light)));
        // 🎫 月票跳色：固定的顏色（保留一點原本的深淺，看得出立體）
        const shade = (h, sa, l) => c.color.setHSL(h, sa, Math.min(0.94, Math.max(0.2, l + (hsl.l - 0.6) * 0.35)));
        if (cv.l != null) shade(cv.hue, cv.sat, cv.l);
        if (cv.duo && role === 'g') shade(cv.duo.hue, cv.duo.sat, cv.duo.l);
        tintCache.set(key, c);
      }
    }
    o.material = tintCache.get(key);
  });
}

