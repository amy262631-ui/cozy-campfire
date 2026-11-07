import * as THREE from 'three';

/**
 * 🪧 營位門牌的 3D 模型：寫「A 區 7 號」＋主人名字。
 * 中心在原點、底部貼地，牌面朝 +z（對著小路）。
 * glow：晚上會亮的部分（燈籠、星星）用 MeshBasicMaterial，不用真的燈。
 */
const cache = new Map();
const mat = (color, extra) => {
  const key = extra ? `${color}|${JSON.stringify(extra)}` : color;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra }));
  return cache.get(key);
};
const glow = (color) => {
  const key = `g${color}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color }));
  return cache.get(key);
};

/** 牌面的字：第一行營位（大）、第二行主人名字（小） */
function plateTexture(title, name, { bg, fg, sub, w = 256, h = 128, round = 18, border }) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, round);
    g.fill();
  }
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = 5;
    g.stroke();
  }
  const font = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = fg;
  g.font = `900 46px ${font}`;
  g.fillText(title, w / 2, name ? h * 0.38 : h / 2, w - 24);
  if (name) {
    g.fillStyle = sub ?? fg;
    g.font = `700 32px ${font}`;
    g.fillText(name, w / 2, h * 0.74, w - 24);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * @param {string} style 門牌造型 id（signCatalog.js）
 * @param {string} title 例：「A 區 7 號」
 * @param {string} name 主人名字（空的＝空營位）
 */
export function buildSign(style, title, name = '') {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const box = (w, h, d, m, x = 0, y = h / 2, z = 0) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (r, h, m, x = 0, y = h / 2, z = 0, seg = 8) => add(new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z);
  const plate = (w, h, y, z, tex, extra = {}) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, ...extra });
    const p = add(new THREE.PlaneGeometry(w, h), m, 0, y, z);
    p.userData.ownMat = true;
    return p;
  };
  const wood = mat(0x9a6a40);
  const dark = mat(0x5a3c26);

  switch (style) {
    case 'stone': {
      // 🪨 刻字石頭：一顆扁扁的大石頭，字刻在正面
      const rock = add(new THREE.DodecahedronGeometry(0.42, 0), mat(0x8e8a84), 0, 0.3, 0);
      rock.scale.set(1.25, 0.75, 0.55);
      add(new THREE.DodecahedronGeometry(0.16, 0), mat(0x7a766f), 0.42, 0.08, 0.1);
      add(new THREE.DodecahedronGeometry(0.11, 0), mat(0x9a968f), -0.45, 0.06, 0.12);
      plate(0.66, 0.33, 0.32, 0.235, plateTexture(title, name, { fg: '#26201c', sub: '#2e2824', bg: 'rgba(240, 236, 228, 0.35)', round: 30 }));
      break;
    }
    case 'mailbox': {
      // 📮 復古信箱門牌：木柱＋紅色信箱，下面掛一塊小牌子
      cyl(0.045, 1.0, dark, 0, 0.5);
      box(0.42, 0.26, 0.3, mat(0xc9483c), 0, 1.08);
      add(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 10, 1, false, 0, Math.PI), mat(0xc9483c), 0, 1.21, 0).rotation.z = Math.PI / 2;
      box(0.03, 0.18, 0.08, mat(0xf2c14e), 0.22, 1.2, 0.09);
      box(0.64, 0.32, 0.04, mat(0xf4ead8), 0, 0.62, 0.05);
      plate(0.6, 0.3, 0.62, 0.075, plateTexture(title, name, { fg: '#7a2a22', sub: '#5a3c26' }));
      break;
    }
    case 'lantern': {
      // 🏮 燈籠門牌：木柱上掛一盞燈籠，晚上會亮
      cyl(0.045, 1.25, dark, -0.34, 0.62);
      box(0.4, 0.04, 0.04, dark, -0.18, 1.22);
      box(0.66, 0.34, 0.05, wood, 0.05, 0.75, 0);
      plate(0.6, 0.3, 0.75, 0.03, plateTexture(title, name, { fg: '#fff3dc', sub: '#ffe0b0' }));
      cyl(0.004, 0.1, dark, 0, 1.16);
      const lan = add(new THREE.SphereGeometry(0.11, 10, 8), glow(0xff8a4c), 0, 1.02, 0);
      lan.scale.y = 1.25;
      lan.userData.night = true;
      box(0.12, 0.03, 0.12, dark, 0, 1.15);
      box(0.1, 0.03, 0.1, dark, 0, 0.88);
      g.userData.glow = { x: 0, y: 1.02, z: 0, color: 0xff9a50 };
      break;
    }
    case 'wreath': {
      // 🌸 花圈門牌：白色木牌，四周一圈小花
      cyl(0.04, 0.6, dark, -0.28, 0.3);
      cyl(0.04, 0.6, dark, 0.28, 0.3);
      box(0.78, 0.42, 0.05, mat(0xf6f0e6), 0, 0.78, 0);
      plate(0.66, 0.33, 0.78, 0.03, plateTexture(title, name, { fg: '#4a2e22', sub: '#6a4434' }));
      const cols = [0xf4a8b8, 0xffd36a, 0xc8a8f0, 0xffffff, 0xf08a8a];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const f = add(new THREE.IcosahedronGeometry(0.045, 0), mat(cols[i % cols.length]), Math.cos(a) * 0.44, 0.78 + Math.sin(a) * 0.27, 0.04);
        f.scale.z = 0.5;
      }
      for (let i = 0; i < 18; i++) {
        const a = ((i + 0.5) / 18) * Math.PI * 2;
        add(new THREE.IcosahedronGeometry(0.03, 0), mat(0x6aa85a), Math.cos(a) * 0.45, 0.78 + Math.sin(a) * 0.28, 0.02);
      }
      break;
    }
    case 'star': {
      // ✨ 星星吊牌：L 形木架上掛一塊吊牌，旁邊一顆星星（晚上會閃）
      cyl(0.045, 1.35, dark, -0.42, 0.67);
      box(0.62, 0.05, 0.05, dark, -0.13, 1.32);
      for (const x of [-0.24, 0.2]) cyl(0.006, 0.18, mat(0xd8d0c0), x, 1.21);
      box(0.6, 0.3, 0.04, mat(0x34466e), -0.02, 0.97);
      plate(0.56, 0.28, 0.97, 0.025, plateTexture(title, name, { fg: '#ffe9a8', sub: '#d8e4ff' }));
      const star = add(new THREE.OctahedronGeometry(0.09, 0), glow(0xffe06a), 0.15, 1.42, 0);
      star.scale.set(1, 1.2, 0.4);
      star.userData.twinkle = true;
      for (const [x, y] of [[-0.3, 1.15], [0.24, 1.12], [0.3, 0.8]]) add(new THREE.OctahedronGeometry(0.025, 0), glow(0xfff2b0), x, y, 0.03).userData.twinkle = true;
      g.userData.glow = { x: 0.15, y: 1.42, z: 0, color: 0xffe08a };
      break;
    }
    case 'galaxy': {
      // 🌌 星空門牌（星空月票限定）：深藍色圓弧牌，上面一閃一閃的星星
      cyl(0.04, 0.55, mat(0x2a2a3a, { metalness: 0.4, roughness: 0.5 }), -0.3, 0.27);
      cyl(0.04, 0.55, mat(0x2a2a3a, { metalness: 0.4, roughness: 0.5 }), 0.3, 0.27);
      const arch = add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20, 1, false, Math.PI / 2, Math.PI), mat(0x1c2450), 0, 0.72, 0);
      arch.rotation.x = Math.PI / 2;
      box(0.84, 0.3, 0.05, mat(0x1c2450), 0, 0.6, 0);
      plate(0.7, 0.35, 0.72, 0.03, plateTexture(title, name, { fg: '#fff6c8', sub: '#bfd4ff' }));
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.08 + (i / 8) * 0.84);
        add(new THREE.OctahedronGeometry(0.022 + (i % 3) * 0.008, 0), glow(i % 2 ? 0xbfe0ff : 0xfff2b0), Math.cos(a) * 0.38, 0.75 + Math.sin(a) * 0.36, 0.035).userData.twinkle = true;
      }
      g.userData.glow = { x: 0, y: 0.9, z: 0.05, color: 0x9ab8ff };
      break;
    }
    case 'empty': {
      // 空營位：一支小木樁＋「空地」小牌
      cyl(0.035, 0.7, dark, 0, 0.35);
      box(0.5, 0.24, 0.04, mat(0xc8a477), 0, 0.62, 0.03);
      plate(0.46, 0.22, 0.62, 0.055, plateTexture(title, name, { fg: '#5a3c26', sub: '#7a5a3c', h: 112 }));
      break;
    }
    default: {
      // 🪵 木頭小立牌（免費、預設）
      cyl(0.045, 0.85, dark, 0, 0.42);
      box(0.68, 0.34, 0.05, wood, 0, 0.72, 0.02);
      box(0.72, 0.04, 0.07, dark, 0, 0.9, 0.02);
      plate(0.62, 0.31, 0.72, 0.05, plateTexture(title, name, { fg: '#fff3dc', sub: '#ffe0b0' }));
    }
  }
  g.traverse((o) => o.isMesh && !o.userData.ownMat && (o.castShadow = true));
  return g;
}
