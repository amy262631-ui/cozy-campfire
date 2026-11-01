import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

/**
 * 小超商賣的東西（價格與伺服器 server/homes.js 的 SHOP 相同）。
 * 每樣家具佔帳篷地板的一格（0.8 公尺見方）。
 */
export const TENT_PRICE = 30;
export const FURNITURE = [
  { id: 'rug', icon: '🟫', name: t('小地毯'), price: 5 },
  { id: 'cushion', icon: '🟠', name: t('坐墊'), price: 6 },
  { id: 'plant', icon: '🪴', name: t('盆栽'), price: 8 },
  { id: 'table', icon: '🪵', name: t('小矮桌'), price: 10 },
  { id: 'lamp', icon: '💡', name: t('檯燈'), price: 12 },
  { id: 'teddy', icon: '🧸', name: t('小熊玩偶'), price: 14 },
  { id: 'frame', icon: '🖼️', name: t('相框'), price: 15 },
  { id: 'jar', icon: '🫙', name: t('螢火蟲燈罐'), price: 18 },
  { id: 'bookshelf', icon: '📚', name: t('書架'), price: 20 },
  { id: 'stove', icon: '🔥', name: t('小暖爐'), price: 22 },
  { id: 'fridge', icon: '🧊', name: t('小冰箱'), price: 25 },
  { id: 'bed', icon: '🛏️', name: t('睡鋪'), price: 30 },
];
export const FURNITURE_BY_ID = Object.fromEntries(FURNITURE.map((f) => [f.id, f]));

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });

/** 做一件家具的模型（中心在格子正中央、底部貼地） */
export function buildFurniture(id) {
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

  switch (id) {
    case 'rug':
      box(0.76, 0.02, 0.76, mat(0xb5553f), 0, 0.01);
      box(0.6, 0.022, 0.6, mat(0xe8c48a), 0, 0.012);
      box(0.4, 0.024, 0.4, mat(0x7a9a6a), 0, 0.013);
      break;
    case 'cushion':
      cyl(0.27, 0.29, 0.12, mat(0xe39a4f), 0, 0.06, 0, 12);
      ball(0.06, mat(0xc77a35), 0, 0.12, 0, 1, 0.4, 1);
      break;
    case 'plant': {
      cyl(0.16, 0.12, 0.26, mat(0xb8653f));
      const leaf = mat(0x4f9a5a);
      ball(0.2, leaf, 0, 0.42);
      ball(0.13, leaf, 0.1, 0.55, 0.04);
      ball(0.12, leaf, -0.09, 0.52, -0.05);
      break;
    }
    case 'table': {
      const wood = mat(0x8a5a36);
      box(0.6, 0.05, 0.46, wood, 0, 0.3);
      for (const [x, z] of [[-0.25, -0.18], [0.25, -0.18], [-0.25, 0.18], [0.25, 0.18]]) box(0.05, 0.28, 0.05, wood, x, 0.14, z);
      cyl(0.05, 0.04, 0.08, mat(0xf2e6cc), 0.12, 0.37, 0.05); // 馬克杯
      break;
    }
    case 'lamp':
      cyl(0.12, 0.14, 0.04, mat(0x5a4636));
      cyl(0.015, 0.015, 0.5, mat(0x5a4636), 0, 0.27);
      cyl(0.09, 0.17, 0.18, glow(0xffd28a), 0, 0.58);
      break;
    case 'teddy': {
      const fur = mat(0xc08a5a);
      ball(0.17, fur, 0, 0.17, 0, 1, 0.95, 0.9);
      ball(0.13, fur, 0, 0.42);
      ball(0.05, fur, -0.1, 0.53);
      ball(0.05, fur, 0.1, 0.53);
      ball(0.04, mat(0xf2d6b8), 0, 0.4, 0.11);
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
    case 'jar':
      cyl(0.12, 0.12, 0.28, new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.2 }), 0, 0.14);
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
    case 'fridge':
      box(0.46, 0.66, 0.42, mat(0xf2f0e8), 0, 0.33);
      box(0.44, 0.012, 0.01, mat(0xc8c4b8), 0, 0.42, 0.215);
      box(0.03, 0.12, 0.03, mat(0x9a968a), 0.17, 0.52, 0.225);
      box(0.03, 0.08, 0.03, mat(0x9a968a), 0.17, 0.3, 0.225);
      ball(0.035, mat(0xe85a5a), -0.1, 0.55, 0.22); // 冰箱貼
      break;
    case 'bed':
      box(0.74, 0.12, 0.74, mat(0x8a6a4a), 0, 0.06);
      box(0.7, 0.08, 0.7, mat(0xf2ead8), 0, 0.16);
      box(0.7, 0.05, 0.42, mat(0x6a8ac8), 0, 0.21, 0.12);
      ball(0.13, mat(0xffffff), 0, 0.25, -0.22, 1.9, 0.6, 1.1);
      break;
    default:
      box(0.3, 0.3, 0.3, mat(0xffffff));
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
