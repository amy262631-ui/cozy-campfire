import * as THREE from 'three';

/**
 * 🚙 門口擺設的 3D 模型（原尺寸；營地裡會跟帳篷一起縮小）。
 * 中心在原點、底部貼地，長的一邊沿著 x。
 */
const cache = new Map();
const mat = (color, extra) => {
  const key = extra ? `${color}|${JSON.stringify(extra)}` : color;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra }));
  return cache.get(key);
};
const glowMat = (color) => {
  const key = `g${color}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color }));
  return cache.get(key);
};

export function buildYard(id) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const box = (w, h, d, m, x = 0, y = h / 2, z = 0) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (r, h, m, x = 0, y = h / 2, z = 0, seg = 10) => add(new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z);
  const wheel = (x, z, r = 0.32) => {
    const w = add(new THREE.CylinderGeometry(r, r, 0.22, 14), mat(0x2a2522), x, r, z);
    w.rotation.x = Math.PI / 2;
    const hub = add(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.24, 10), mat(0xd8d2c8), x, r, z);
    hub.rotation.x = Math.PI / 2;
  };
  const win = (w, h, x, y, z, ry = 0) => {
    const m = add(new THREE.PlaneGeometry(w, h), glowMat(0xffd98a), x, y, z);
    m.rotation.y = ry;
    return m;
  };
  const wood = mat(0x9a6a40);
  const dark = mat(0x5a3c26);

  switch (id) {
    case 'mailbox':
      cyl(0.06, 1.0, dark, 0, 0.5);
      box(0.5, 0.36, 0.34, mat(0xd2453c), 0, 1.15);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 12, 1, false, 0, Math.PI), mat(0xd2453c), 0, 1.33, 0).rotation.z = Math.PI / 2;
      box(0.04, 0.24, 0.1, mat(0xf2c14e), 0.27, 1.32, 0.12);
      break;
    case 'picnic': {
      box(1.8, 0.08, 0.8, wood, 0, 0.75);
      box(1.82, 0.02, 0.82, mat(0xd2453c), 0, 0.8); // 格子布
      for (let i = -3; i <= 3; i++) box(0.06, 0.021, 0.83, mat(0xfff3e2), i * 0.26, 0.805);
      for (const z of [-0.65, 0.65]) box(1.8, 0.06, 0.3, wood, 0, 0.42, z);
      for (const x of [-0.7, 0.7]) for (const s of [-1, 1]) {
        const leg = box(0.08, 0.85, 0.08, dark, x, 0.42, s * 0.3);
        leg.rotation.x = s * 0.45;
      }
      box(0.36, 0.22, 0.26, mat(0xc8a477), 0.3, 0.92); // 野餐籃
      add(new THREE.TorusGeometry(0.14, 0.02, 6, 12, Math.PI), dark, 0.3, 1.03, 0);
      break;
    }
    case 'bbq': {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const leg = cyl(0.03, 0.75, dark, Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22, 6);
        leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
      }
      add(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x2a2522), 0, 0.85, 0);
      const lid = add(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3a3330), 0, 0.88, 0);
      lid.scale.y = 0.7;
      cyl(0.04, 0.08, mat(0xb0a898), 0, 1.18, 0, 8);
      for (let k = 0; k < 3; k++) {
        const puff = add(new THREE.IcosahedronGeometry(0.08 + k * 0.03, 0), mat(0xe8e4dc, { transparent: true, opacity: 0.5 }), 0.05 * k, 1.32 + k * 0.18, 0);
        puff.userData.smoke = k;
      }
      break;
    }
    case 'bike': {
      const frame = mat(0x9ed8c2);
      for (const x of [-0.5, 0.5]) {
        const tire = add(new THREE.TorusGeometry(0.33, 0.04, 6, 20), mat(0x2a2522), x, 0.37, 0);
        tire.rotation.y = 0;
        cyl(0.02, 0.06, mat(0xb0a898), x, 0.37, 0, 6).rotation.x = Math.PI / 2;
      }
      const bar = (x0, y0, x1, y1) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const b = box(len, 0.05, 0.05, frame, (x0 + x1) / 2, (y0 + y1) / 2, 0);
        b.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      };
      bar(-0.5, 0.37, -0.05, 0.4);
      bar(-0.05, 0.4, 0.38, 0.75);
      bar(-0.5, 0.37, -0.12, 0.75);
      bar(-0.12, 0.75, 0.38, 0.75);
      bar(0.38, 0.75, 0.5, 0.37);
      box(0.24, 0.06, 0.12, mat(0x5a3c26), -0.14, 0.82, 0); // 座椅
      box(0.06, 0.06, 0.5, mat(0xb0a898), 0.4, 0.92, 0); // 把手
      box(0.3, 0.2, 0.32, mat(0xc8a477), 0.62, 0.86, 0); // 菜籃
      for (const [c, z] of [[0xffb46b, -0.05], [0xf3a6c0, 0.07]]) add(new THREE.IcosahedronGeometry(0.06, 0), mat(c), 0.62, 1.0, z);
      break;
    }
    case 'hammock': {
      for (const x of [-1.3, 1.3]) {
        cyl(0.1, 1.6, wood, x, 0.8, 0, 8);
        cyl(0.13, 0.1, dark, x, 1.62, 0, 8);
      }
      const bed = add(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 14, 1, true, Math.PI * 0.6, Math.PI * 0.8), mat(0xf4ead8, { side: THREE.DoubleSide }), 0, 1.15, 0);
      bed.rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const s = add(new THREE.CylinderGeometry(0.451, 0.451, 0.14, 14, 1, true, Math.PI * 0.6, Math.PI * 0.8), mat(0xc9483c, { side: THREE.DoubleSide }), -0.75 + i * 0.5, 1.15, 0);
        s.rotation.z = Math.PI / 2;
      }
      for (const s of [-1, 1]) {
        const rope = box(0.3, 0.02, 0.02, dark, s * 1.15, 1.35, 0);
        rope.rotation.z = s * -0.6;
      }
      add(new THREE.IcosahedronGeometry(0.16, 1), mat(0xffe08a), -0.6, 0.95, 0).scale.set(1.4, 0.6, 1); // 小枕頭
      break;
    }
    case 'canoe': {
      for (const x of [-0.9, 0.9]) {
        for (const s of [-1, 1]) {
          const leg = box(0.07, 1.0, 0.07, dark, x, 0.48, s * 0.25);
          leg.rotation.x = s * 0.3;
        }
        box(0.1, 0.07, 0.7, wood, x, 0.9, 0);
      }
      const hull = add(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xc8763a), 0, 1.1, 0);
      hull.scale.set(4.2, 0.9, 1);
      const rim = add(new THREE.TorusGeometry(0.4, 0.035, 6, 24), mat(0x8a4a22), 0, 1.1, 0);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(4.2, 1, 1);
      const pad = box(1.6, 0.04, 0.06, mat(0xe8c77e), 0.5, 0.25, 0.45);
      pad.rotation.z = 0.35;
      box(0.12, 0.04, 0.3, mat(0xe8c77e), 1.25, 0.52, 0.45).rotation.z = 0.35;
      break;
    }
    case 'tarp': {
      for (const [x, z] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) cyl(0.04, 1.9, dark, x, 0.95, z, 6);
      const top = add(new THREE.PlaneGeometry(2.9, 2.4), mat(0xe0a83a, { side: THREE.DoubleSide }), 0, 1.95, 0);
      top.rotation.x = -Math.PI / 2 + 0.12;
      const chair = (x) => {
        box(0.5, 0.05, 0.45, mat(0x5f8a5a), x, 0.42, 0.2);
        const back = box(0.5, 0.5, 0.05, mat(0x5f8a5a), x, 0.68, -0.02);
        back.rotation.x = -0.2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.02, 0.42, mat(0x2a2522), x + sx * 0.22, 0.21, 0.2 + sz * 0.2, 5);
      };
      chair(-0.45);
      chair(0.45);
      cyl(0.08, 0.22, mat(0xc9483c), 0, 0.11, 0.6, 8); // 小保溫壺
      break;
    }
    case 'jeep': {
      const body = mat(0x4e6b40);
      box(3.0, 0.7, 1.5, body, 0, 0.75);
      box(1.7, 0.65, 1.4, body, -0.35, 1.42);
      win(1.4, 0.45, -0.35, 1.45, 0.705);
      win(1.4, 0.45, -0.35, 1.45, -0.705, Math.PI);
      win(1.2, 0.45, 0.51, 1.45, 0, Math.PI / 2).material = glowMat(0xbfe0ff);
      box(0.06, 0.25, 1.3, mat(0x2a2522), 1.53, 0.75); // 水箱罩
      for (const z of [-0.45, 0.45]) add(new THREE.CircleGeometry(0.11, 10), glowMat(0xfff3c8), 1.535, 0.88, z).rotation.y = Math.PI / 2;
      for (const [x, z] of [[-1.0, 0.72], [1.0, 0.72], [-1.0, -0.72], [1.0, -0.72]]) wheel(x, z, 0.38);
      // 車頂行李
      box(1.5, 0.05, 1.3, dark, -0.35, 1.78);
      box(0.6, 0.3, 0.5, mat(0xc9483c), -0.65, 1.95, 0.2);
      box(0.5, 0.25, 0.45, mat(0xe0a83a), -0.05, 1.93, -0.25);
      cyl(0.32, 0.18, mat(0x2a2522), -1.62, 1.0, 0, 14).rotation.z = Math.PI / 2; // 備胎
      break;
    }
    case 'camper': {
      const cream = mat(0xf4ead8);
      const red = mat(0xc9483c);
      box(4.0, 1.9, 1.8, cream, 0, 1.25);
      box(4.02, 0.5, 1.82, red, 0, 0.55);
      add(new THREE.CylinderGeometry(0.9, 0.9, 4.0, 16, 1, false, 0, Math.PI), cream, 0, 2.2, 0).rotation.z = Math.PI / 2;
      // 車頭
      box(0.9, 1.0, 1.7, cream, 2.35, 0.9);
      win(0.8, 0.6, 2.81, 1.15, 0, Math.PI / 2).material = glowMat(0xbfe0ff);
      for (const x of [-1.2, 0.2]) {
        win(0.9, 0.6, x, 1.6, 0.905);
        win(0.9, 0.6, x, 1.6, -0.905, Math.PI);
      }
      box(0.7, 1.4, 0.04, mat(0x8a5a3a), 1.2, 1.15, 0.91); // 門
      for (const [x, z] of [[-1.2, 0.88], [1.6, 0.88], [-1.2, -0.88], [1.6, -0.88]]) wheel(x, z, 0.36);
      // 遮陽棚
      const awn = box(2.4, 0.04, 0.9, mat(0xe0a83a), -0.4, 2.2, 1.35);
      awn.rotation.x = 0.15;
      for (let i = 0; i < 6; i++) box(0.2, 0.05, 0.92, mat(0xfff3e2), -1.5 + i * 0.44, 2.21, 1.35).rotation.x = 0.15;
      for (const x of [-1.5, 0.7]) cyl(0.03, 2.1, dark, x, 1.05, 1.75, 6);
      break;
    }
    case 'airstream': {
      const silver = mat(0xd8dde4, { metalness: 0.6, roughness: 0.3 });
      const shell = add(new THREE.CapsuleGeometry(1.05, 2.8, 6, 16), silver, 0, 1.45, 0);
      shell.rotation.z = Math.PI / 2;
      shell.scale.set(1, 1, 0.85);
      box(4.6, 0.25, 1.6, mat(0x5a5a5a), 0, 0.5);
      for (const x of [-1.2, 0, 1.2]) {
        const w = add(new THREE.CircleGeometry(0.28, 14), glowMat(0xffd98a), x, 1.75, 0.9);
        w.scale.set(1.4, 1, 1);
      }
      box(0.7, 1.45, 0.05, mat(0xe8eef4), 0.6, 1.2, 0.86);
      for (const z of [0.7, -0.7]) wheel(0, z, 0.38);
      box(0.9, 0.08, 0.08, mat(0x3a3a3a), 2.75, 0.55); // 拖桿
      // 燈串
      for (let i = 0; i < 9; i++) {
        const x = -2 + i * 0.5;
        add(new THREE.IcosahedronGeometry(0.06, 0), glowMat([0xffd98a, 0xff9a8a, 0x9ad8ff][i % 3]), x, 2.4 - Math.sin((i / 8) * Math.PI) * 0.25, 1.05);
      }
      break;
    }
    default:
      box(0.5, 0.5, 0.5, mat(0xffffff), 0, 0.25);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/** 擺設佔多大（營地裡擋路用，原尺寸的半徑） */
export const yardRadius = (id) => ({ jeep: 1.6, camper: 2.2, airstream: 2.4, tarp: 1.6, hammock: 1.4, canoe: 1.3, picnic: 1.0 })[id] ?? 0.6;
