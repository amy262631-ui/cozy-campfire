import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
      // 11/08：信箱門在 +x 那一頭（擺的時候轉成朝小路），小旗子插在側面
      box(0.02, 0.3, 0.3, mat(0xb83a32), 0.255, 1.18, 0);
      box(0.03, 0.04, 0.08, mat(0xe8d6a8), 0.27, 1.26, 0);
      box(0.1, 0.04, 0.03, mat(0xf2c14e), -0.02, 1.3, 0.185);
      box(0.04, 0.18, 0.03, mat(0xf2c14e), -0.07, 1.39, 0.185);
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
      chair(-0.62); // 11/07：兩張椅子拉開一點，兩個人坐才不會撞在一起
      chair(0.62);
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
      // 11/07 重新設計：圓角的復古小巴（紅色下半身＋奶油色上半身＋可愛的圓燈），原本是方盒子加半圓柱，作者覺得醜
      const cream = mat(0xf6ecd8);
      const red = mat(0x8a5a3c); // 11/07 作者：下半身改咖啡色
      const teal = mat(0xd9b07a); // 車頂掀頂：奶茶色，跟咖啡色比較搭
      const rbox = (w, h, d, r, m, x, y, z = 0) => add(new RoundedBoxGeometry(w, h, d, 3, r), m, x, y, z);
      rbox(4.3, 0.95, 1.9, 0.28, red, 0, 0.82); // 下半身
      rbox(4.3, 1.25, 1.88, 0.42, cream, 0, 1.78); // 上半身（圓圓的車頂）
      rbox(4.34, 0.12, 1.92, 0.05, mat(0xfff8ec), 0, 1.25); // 中間的白色腰線
      rbox(2.6, 0.22, 1.7, 0.1, teal, -0.35, 2.47); // 車頂的掀頂
      // 車頭（+x）：大擋風玻璃、兩顆圓燈、小保險桿
      rbox(0.04, 0.6, 1.45, 0.02, glowMat(0xbfe6ff), 2.155, 1.82); // 擋風玻璃（貼在車頭上）
      for (const z of [-0.6, 0.6]) {
        add(new THREE.CircleGeometry(0.15, 16), glowMat(0xfff3c8), 2.161, 0.9, z).rotation.y = Math.PI / 2;
        add(new THREE.TorusGeometry(0.15, 0.025, 6, 16), mat(0xe8e2d6), 2.165, 0.9, z).rotation.y = Math.PI / 2;
      }
      add(new THREE.CircleGeometry(0.2, 3), mat(0xfff8ec), 2.162, 1.25, 0).rotation.y = Math.PI / 2; // 車頭的小 V 標
      rbox(0.18, 0.16, 1.95, 0.06, mat(0xe8e2d6), 2.2, 0.42);
      rbox(0.18, 0.16, 1.95, 0.06, mat(0xe8e2d6), -2.2, 0.42);
      // 側面：圓角小窗（亮著暖暖的燈）、門（門上一個圓窗）
      for (const sz of [1, -1]) {
        for (const x of [-1.5, -0.55]) {
          const w = rbox(0.75, 0.55, 0.04, 0.12, glowMat(0xffd98a), x, 1.85, sz * 0.95);
          w.scale.z = 1;
        }
      }
      rbox(0.75, 1.5, 0.05, 0.12, mat(0xe9dcc4), 1.2, 1.25, 0.955); // 門
      add(new THREE.CircleGeometry(0.17, 16), glowMat(0xffd98a), 1.2, 1.72, 0.985);
      for (const [x, z] of [[-1.35, 0.9], [1.35, 0.9], [-1.35, -0.9], [1.35, -0.9]]) wheel(x, z, 0.36);
      // 條紋遮陽棚（門那一側）＋兩根細柱＋小燈串
      // 短短的條紋遮陽棚（不會伸到隔壁帳篷）＋小燈串
      for (let i = 0; i < 6; i++) {
        const st = box(0.42, 0.04, 0.6, mat(i % 2 ? 0xfff3e2 : 0xe0a83a), -1.3 + i * 0.42, 2.32, 1.22);
        st.rotation.x = 0.22;
      }
      for (let i = 0; i < 7; i++) add(new THREE.IcosahedronGeometry(0.055, 0), glowMat([0xffd98a, 0xff9a8a, 0x9ad8ff][i % 3]), -1.4 + i * 0.37, 2.16 - Math.sin((i / 6) * Math.PI) * 0.16, 1.5);
      break;
    }
    case 'airstream': {
      // 11/07 改版（最貴的擺設，要看起來高級）：拋光鋁殼＋一圈圈鉚釘接縫、車頭環繞式車窗、
      // 薄荷色細腰線、輪罩、扇形邊遮陽棚＋燈串、車尾木頭露台（兩張躺椅、小桌燈、盆栽）
      const silver = mat(0xe8ecf0, { metalness: 0.22, roughness: 0.3 });
      const seam = mat(0xb8c0c8, { metalness: 0.3, roughness: 0.35 });
      const shell = add(new THREE.CapsuleGeometry(1.05, 2.8, 10, 24), silver, 0, 1.45, 0);
      shell.rotation.z = Math.PI / 2;
      shell.scale.set(1, 1, 0.85);
      // 鉚釘接縫（直的一圈一圈）
      for (const x of [-1.05, -0.35, 0.35, 1.05]) {
        const ring = add(new THREE.TorusGeometry(1.055, 0.012, 4, 32), seam, x, 1.45, 0);
        ring.rotation.y = Math.PI / 2;
        ring.scale.set(0.85, 1, 1);
      }
      // 薄荷色細腰線（左右兩側）
      for (const sz of [1, -1]) box(3.6, 0.07, 0.02, mat(0x6fc2b0), 0, 1.08, sz * 0.9);
      // 車頭環繞式車窗（深色玻璃帶）
      const wrap = add(new THREE.SphereGeometry(1.06, 24, 8, -Math.PI / 2.6, Math.PI / 1.3, 1.15, 0.38), glowMat(0x9fc4d8), 1.4, 1.45, 0);
      wrap.scale.set(1, 1, 0.86);
      // 側窗：圓角、有鉻框
      for (const sz of [1, -1]) {
        for (const x of [-1.15, -0.2]) {
          add(new RoundedBoxGeometry(0.62, 0.42, 0.05, 2, 0.12), seam, x, 1.75, sz * 0.875);
          add(new RoundedBoxGeometry(0.54, 0.34, 0.06, 2, 0.1), glowMat(0xffd98a), x, 1.75, sz * 0.88);
        }
      }
      // 門：鉻框＋圓窗
      add(new RoundedBoxGeometry(0.72, 1.5, 0.06, 2, 0.14), seam, 0.75, 1.2, 0.87);
      add(new RoundedBoxGeometry(0.62, 1.4, 0.07, 2, 0.12), mat(0xdfe5ea, { metalness: 0.2, roughness: 0.3 }), 0.75, 1.2, 0.875);
      add(new THREE.CircleGeometry(0.13, 16), glowMat(0xffd98a), 0.75, 1.62, 0.912);
      // 底盤、輪罩（輪子半藏起來比較有質感）
      box(4.2, 0.22, 1.5, mat(0x5a5f66), 0, 0.48);
      for (const z of [0.72, -0.72]) {
        wheel(-0.15, z, 0.36);
        // 輪罩：側面半圓的鋁板蓋住輪子上半部
        add(new THREE.CircleGeometry(0.44, 16, 0, Math.PI), mat(0xe8ecf0, { metalness: 0.22, roughness: 0.3, side: THREE.DoubleSide }), -0.15, 0.5, z * 1.24);
      }
      box(0.9, 0.08, 0.08, mat(0x3a3a3a), 2.75, 0.55); // 拖桿
      // 扇形邊遮陽棚（門那一側，短短的，不會伸到隔壁）＋燈串
      for (let i = 0; i < 7; i++) {
        const c = i % 2 ? 0xfff6ea : 0x6fc2b0;
        const st = box(0.42, 0.04, 0.55, mat(c), -1.0 + i * 0.42, 2.25, 1.15);
        st.rotation.x = 0.25;
        const sc = add(new THREE.CircleGeometry(0.21, 10, Math.PI, Math.PI), mat(c, { side: THREE.DoubleSide }), -1.0 + i * 0.42, 2.17, 1.42);
        sc.rotation.x = -0.1;
      }
      for (let i = 0; i < 9; i++) add(new THREE.IcosahedronGeometry(0.055, 0), glowMat([0xffd98a, 0xff9a8a, 0x9ad8ff][i % 3]), -1.0 + i * 0.32, 2.0 - Math.sin((i / 8) * Math.PI) * 0.18, 1.45);
      // 🪵 車尾木頭露台：兩張躺椅（兩個人坐也不擠）、小桌＋燈、盆栽
      box(1.5, 0.12, 2.5, wood, -2.75, 0.06, 0.15);
      for (let i = 0; i < 6; i++) box(0.02, 0.005, 2.5, dark, -3.45 + i * 0.28, 0.123, 0.15);
      // 躺椅並排、背靠拖車、面向車尾外面（兩張中間隔 1.4，兩個人坐不會撞）
      const lounge = (z) => {
        box(0.75, 0.1, 0.5, mat(0xf3ead8), -2.85, 0.35, z);
        const back = box(0.08, 0.5, 0.5, mat(0xf3ead8), -2.47, 0.6, z);
        back.rotation.z = -0.35;
        box(0.7, 0.06, 0.52, wood, -2.85, 0.27, z);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.025, 0.2, dark, -2.85 + sx * 0.3, 0.2, z + sz * 0.2, 5);
      };
      lounge(-0.55);
      lounge(0.85);
      cyl(0.17, 0.04, wood, -2.95, 0.5, 0.15, 12); // 兩張中間的小圓桌
      cyl(0.03, 0.36, dark, -2.95, 0.3, 0.15, 6);
      add(new THREE.SphereGeometry(0.07, 10, 8), glowMat(0xffe0a0), -2.95, 0.6, 0.15); // 桌燈
      g.userData.glow = { x: -2.95, y: 0.7, z: 0.15, color: 0xffd090 };
      for (const z of [-1.0, 1.3]) {
        cyl(0.13, 0.22, mat(0xc98a5a), -3.35, 0.23, z, 10);
        add(new THREE.IcosahedronGeometry(0.2, 0), mat(0x5f9a4f), -3.35, 0.48, z);
      }
      break;
    }
    // ---- 🪑 門口桌椅 ----
    case 'bench': {
      // 剖半的圓木：圓的那面朝下、切面朝上
      // 11/07：加長，兩個人坐才不會擠（座位 ±0.55）
      const log = add(new THREE.CylinderGeometry(0.22, 0.22, 1.75, 12, 1, false, Math.PI, Math.PI), wood, 0, 0.4, 0);
      log.rotation.z = Math.PI / 2;
      box(1.75, 0.02, 0.44, mat(0xd8b48a), 0, 0.4, 0); // 切面
      for (const x of [-0.7, 0.7]) cyl(0.12, 0.22, dark, x, 0.11, 0, 8);
      break;
    }
    case 'bistro': {
      const white = mat(0xf4f0e8);
      cyl(0.36, 0.04, white, 0, 0.74, 0, 16);
      cyl(0.04, 0.72, mat(0x3a3a3a), 0, 0.36, 0, 6);
      cyl(0.2, 0.03, mat(0x3a3a3a), 0, 0.015, 0, 10);
      cyl(0.06, 0.1, mat(0xc9483c), 0.1, 0.81, 0.05, 8); // 茶杯
      cyl(0.06, 0.1, mat(0x5f8a5a), -0.12, 0.81, -0.06, 8);
      for (const s of [-1, 1]) {
        const x = s * 0.6;
        box(0.42, 0.04, 0.42, white, x, 0.44, 0);
        box(0.04, 0.42, 0.42, white, x + s * 0.2, 0.66, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.018, 0.44, mat(0x3a3a3a), x + sx * 0.18, 0.22, sz * 0.18, 5);
      }
      break;
    }
    case 'firestool': {
      const iron = mat(0x3a3330);
      add(new THREE.CylinderGeometry(0.28, 0.2, 0.32, 12, 1, true), iron, 0, 0.36, 0).material.side = THREE.DoubleSide;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        cyl(0.025, 0.22, iron, Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17, 5);
      }
      const fire = add(new THREE.ConeGeometry(0.13, 0.3, 7), glowMat(0xffa040), 0, 0.6, 0);
      fire.name = 'flame';
      add(new THREE.ConeGeometry(0.07, 0.2, 6), glowMat(0xffe08a), 0, 0.58, 0);
      for (const s of [-1, 1]) {
        cyl(0.2, 0.34, wood, s * 0.6, 0.17, 0.1, 12);
        cyl(0.17, 0.01, mat(0xd8b48a), s * 0.6, 0.345, 0.1, 12);
      }
      g.userData.glow = { x: 0, y: 0.7, z: 0, color: 0xffa050 };
      break;
    }
    case 'swing': {
      // 11/07：加寬，兩個人並排坐才不會擠在一起（座位 ±0.55）
      for (const s of [-1, 1]) {
        for (const z of [-0.4, 0.4]) {
          const post = cyl(0.05, 1.9, dark, s * 1.15, 0.92, z * 0.7, 6);
          post.rotation.x = z > 0 ? -0.2 : 0.2;
        }
      }
      cyl(0.05, 2.4, dark, 0, 1.82, 0, 6).rotation.z = Math.PI / 2;
      // 會搖的部分（繩子＋座板＋椅背＋軟墊）放進一個以橫桿為軸的小組，有人坐時前後輕輕搖（11/07）
      const from = g.children.length;
      for (const x of [-0.85, 0.85]) cyl(0.012, 1.3, mat(0xe8dcc0), x, 1.17, 0, 4);
      box(1.8, 0.06, 0.45, wood, 0, 0.5, 0);
      box(1.8, 0.4, 0.05, wood, 0, 0.72, -0.22).rotation.x = -0.15;
      box(1.7, 0.06, 0.4, mat(0xe0a83a), 0, 0.55, 0.02); // 軟墊
      const rocker = new THREE.Group();
      rocker.position.y = 1.82;
      for (const c of g.children.slice(from)) {
        c.position.y -= 1.82;
        rocker.add(c);
      }
      g.add(rocker);
      g.userData.rocker = rocker;
      break;
    }
    default:
      box(0.5, 0.5, 0.5, mat(0xffffff), 0, 0.25);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/** 擺設佔多大（營地裡擋路用，原尺寸的半徑） */
export const yardRadius = (id) => ({ jeep: 1.6, camper: 2.2, airstream: 2.4, tarp: 1.6, hammock: 1.4, canoe: 1.3, picnic: 1.0, bench: 0.95, bistro: 1.0, firestool: 0.9, swing: 1.35 })[id] ?? 0.6;
