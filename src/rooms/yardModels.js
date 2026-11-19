import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildFurniture } from '../game/furniture.js';

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
      const bed = add(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 14, 1, true, Math.PI * 1.1, Math.PI * 0.8), mat(0xf4ead8, { side: THREE.DoubleSide }), 0, 1.15, 0);
      bed.rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        for (const r of [0.44, 0.46]) { // 裡面、外面都看得到條紋
          const s = add(new THREE.CylinderGeometry(r, r, 0.14, 14, 1, true, Math.PI * 1.1, Math.PI * 0.8), mat(0xc9483c, { side: THREE.DoubleSide }), -0.75 + i * 0.5, 1.15, 0);
          s.rotation.z = Math.PI / 2;
        }
      }
      for (const s of [-1, 1]) {
        const rope = box(0.3, 0.02, 0.02, dark, s * 1.15, 1.35, 0);
        rope.rotation.z = s * -0.6;
      }
      add(new THREE.IcosahedronGeometry(0.16, 1), mat(0xffe08a), -0.6, 0.84, 0).scale.set(1.4, 0.6, 1); // 小枕頭
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
    // ---- 🏮 日系風門口（作者 11/19） ----
    case 'jp_lantern': {
      // 石燈籠：一層一層的石頭，中間的火袋亮著
      const st = mat(0x9a968c);
      const st2 = mat(0x8a867c);
      box(0.5, 0.12, 0.5, st2, 0, 0.06);
      cyl(0.09, 0.55, st, 0, 0.395, 0, 8);
      box(0.42, 0.1, 0.42, st2, 0, 0.72);
      box(0.3, 0.28, 0.3, st, 0, 0.91);
      for (const [x, z] of [[0, 0.151], [0, -0.151]]) box(0.16, 0.16, 0.01, glowMat(0xffd98a), x, 0.92, z);
      for (const [x, z] of [[0.151, 0], [-0.151, 0]]) box(0.01, 0.16, 0.16, glowMat(0xffd98a), x, 0.92, z);
      add(new THREE.ConeGeometry(0.4, 0.22, 4), st2, 0, 1.16, 0).rotation.y = Math.PI / 4;
      add(new THREE.SphereGeometry(0.07, 8, 6), st, 0, 1.3, 0);
      g.userData.glow = { x: 0, y: 0.92, z: 0, color: 0xffc070 };
      break;
    }
    case 'jp_fence': {
      // 竹籬笆：一排竹子，用麻繩綁著
      const bam = mat(0xb8a868);
      const bam2 = mat(0x9a8a4e);
      for (let k = 0; k < 14; k++) cyl(0.035, 0.9 + (k % 3) * 0.04, k % 2 ? bam : bam2, -0.78 + k * 0.12, 0.45 + (k % 3) * 0.02, 0, 7);
      for (const y of [0.3, 0.7]) {
        const bar = cyl(0.03, 1.72, bam2, 0, y, 0.05, 7);
        bar.rotation.z = Math.PI / 2;
        for (let k = 0; k < 4; k++) box(0.05, 0.06, 0.09, mat(0x4a3a2a), -0.6 + k * 0.4, y, 0.05);
      }
      break;
    }
    case 'jp_garden': {
      // 枯山水小庭園：白砂耙出波紋、三塊石頭、一點青苔、小松樹
      const fr = mat(0x7a5a3a);
      box(2.2, 0.06, 1.5, mat(0xeae6da), 0, 0.03);
      for (const [w, d, x, z] of [[2.3, 0.1, 0, 0.8], [2.3, 0.1, 0, -0.8], [0.1, 1.6, 1.15, 0], [0.1, 1.6, -1.15, 0]]) box(w, 0.12, d, fr, x, 0.06, z);
      const ripple = mat(0xd4cfbf);
      for (let k = -5; k <= 5; k++) box(2.1, 0.012, 0.025, ripple, 0, 0.066, k * 0.13);
      for (const [x, z, r] of [[-0.55, -0.2, 0.32], [0.45, 0.15, 0.36]]) {
        for (let k = 1; k <= 3; k++) {
          const ring = add(new THREE.TorusGeometry(r + k * 0.1, 0.012, 4, 24), mat(0xd4cfbf), x, 0.07, z);
          ring.rotation.x = Math.PI / 2;
        }
        add(new THREE.CircleGeometry(r + 0.32, 20), mat(0xeae6da), x, 0.064, z).rotation.x = -Math.PI / 2;
      }
      const rock = mat(0x6a6660);
      add(new THREE.DodecahedronGeometry(0.28, 0), rock, -0.55, 0.18, -0.2).scale.set(1.2, 0.9, 1);
      add(new THREE.DodecahedronGeometry(0.2, 0), rock, -0.3, 0.12, -0.05);
      add(new THREE.DodecahedronGeometry(0.32, 0), mat(0x5a5650), 0.45, 0.2, 0.15).scale.set(1, 1.2, 0.9);
      add(new THREE.SphereGeometry(0.18, 8, 5), mat(0x5a8a4a), -0.55, 0.1, 0.05).scale.set(1.4, 0.35, 1);
      add(new THREE.SphereGeometry(0.16, 8, 5), mat(0x5a8a4a), 0.62, 0.08, 0.35).scale.set(1.3, 0.35, 1.1);
      // 角落小松樹
      const pt = cyl(0.05, 0.6, mat(0x6a4a30), 0.85, 0.36, -0.5, 6);
      pt.rotation.z = -0.25;
      for (const [x, y, r] of [[0.95, 0.72, 0.2], [0.75, 0.62, 0.16], [1.0, 0.55, 0.14]]) add(new THREE.SphereGeometry(r, 8, 5), mat(0x3f6a3a), x, y, -0.5).scale.set(1.5, 0.5, 1.1);
      break;
    }
    case 'jp_torii': {
      // ⛩️ 小鳥居（月票）：朱紅色，可以從中間走過去
      const red = mat(0xd2452c);
      const blk = mat(0x2a2522);
      for (const x of [-0.8, 0.8]) {
        cyl(0.09, 2.1, red, x, 1.05, 0, 12);
        cyl(0.12, 0.2, blk, x, 0.1, 0, 12);
      }
      box(2.0, 0.14, 0.18, red, 0, 1.75);
      const top = box(2.5, 0.12, 0.26, blk, 0, 2.18);
      top.scale.set(1, 1, 1);
      box(2.3, 0.14, 0.24, red, 0, 2.06);
      for (const s of [-1, 1]) box(0.24, 0.1, 0.26, blk, s * 1.25, 2.24).rotation.z = s * 0.25;
      box(0.12, 0.32, 0.14, red, 0, 1.9);
      box(0.3, 0.2, 0.04, mat(0x2a2522), 0, 1.92, 0.08);
      box(0.24, 0.14, 0.01, mat(0xe8c25a), 0, 1.92, 0.105);
      break;
    }
    // ---- 🏰 歐風門口（作者 11/19） ----
    case 'eu_lamp': {
      const iron = mat(0x2a2522);
      box(0.3, 0.08, 0.3, iron, 0, 0.04);
      cyl(0.04, 1.8, iron, 0, 0.94, 0, 8);
      box(0.24, 0.04, 0.24, iron, 0, 1.86);
      box(0.18, 0.26, 0.18, glowMat(0xffe0a0), 0, 2.0);
      for (const [x, z] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) box(0.02, 0.3, 0.02, iron, x, 2.0, z);
      add(new THREE.ConeGeometry(0.17, 0.16, 4), iron, 0, 2.21, 0).rotation.y = Math.PI / 4;
      add(new THREE.SphereGeometry(0.035, 6, 4), iron, 0, 2.31, 0);
      g.userData.glow = { x: 0, y: 2.0, z: 0, color: 0xffd080 };
      break;
    }
    case 'eu_planter': {
      // 鐵藝花架：三層小盆花
      const iron = mat(0x2a2522);
      for (const [x, z] of [[-0.3, -0.12], [0.3, -0.12], [-0.3, 0.12], [0.3, 0.12]]) cyl(0.015, 0.9, iron, x, 0.45, z, 5);
      const cols = [0xd2453c, 0xf2a0c0, 0xf6e070, 0xb07ad8];
      [0.3, 0.6, 0.9].forEach((y, i) => {
        box(0.66, 0.025, 0.28, iron, 0, y);
        for (let k = 0; k < 3; k++) {
          const x = -0.2 + k * 0.2;
          cyl(0.06, 0.1, mat(0xc8704a), x, y + 0.06, 0, 8);
          add(new THREE.SphereGeometry(0.07, 7, 5), mat(0x4a7a3a), x, y + 0.14, 0).scale.y = 0.7;
          add(new THREE.SphereGeometry(0.035, 6, 4), mat(cols[(k + i) % 4]), x, y + 0.19, 0.02);
        }
      });
      break;
    }
    case 'eu_rosearch': {
      // 玫瑰花拱門：白色拱門爬滿玫瑰，中間可以走過去
      const w = mat(0xf6f2ea);
      for (const x of [-0.8, 0.8]) for (const z of [-0.2, 0.2]) cyl(0.04, 1.6, w, x, 0.8, z, 6);
      for (const z of [-0.2, 0.2]) {
        const arc = add(new THREE.TorusGeometry(0.8, 0.04, 6, 20, Math.PI), w, 0, 1.6, z);
        arc.scale.y = 0.55;
      }
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * Math.PI;
        box(0.03, 0.03, 0.44, w, Math.cos(a) * 0.8, 1.6 + Math.sin(a) * 0.44, 0);
      }
      const leaf = mat(0x4a7a3a);
      const rose = [mat(0xd2453c), mat(0xf2a0b0), mat(0xffffff)];
      for (let k = 0; k < 34; k++) {
        const t = k / 33;
        const a = t * Math.PI;
        const onArc = k % 3 !== 0;
        const x = onArc ? Math.cos(a) * 0.8 : (k % 2 ? -0.8 : 0.8);
        const y = onArc ? 1.6 + Math.sin(a) * 0.44 : 0.3 + (k % 11) * 0.12;
        add(new THREE.SphereGeometry(0.09, 6, 4), leaf, x, y, (k % 2 ? 0.22 : -0.22)).scale.set(1.3, 0.8, 1);
        add(new THREE.SphereGeometry(0.055, 6, 4), rose[k % 3], x + 0.04, y + 0.03, (k % 2 ? 0.27 : -0.27));
      }
      break;
    }
    case 'eu_fountain': {
      // ⛲ 小噴水池（月票）：水會一直往上噴、落下來
      const st = mat(0xd8d2c4);
      add(new THREE.CylinderGeometry(1.0, 1.05, 0.4, 20), st, 0, 0.2, 0);
      add(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 20), mat(0x6ab0d8, { transparent: true, opacity: 0.8 }), 0, 0.38, 0);
      cyl(0.12, 0.7, st, 0, 0.6, 0, 10);
      add(new THREE.CylinderGeometry(0.42, 0.2, 0.14, 16), st, 0, 0.98, 0);
      add(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 16), mat(0x6ab0d8, { transparent: true, opacity: 0.8 }), 0, 1.04, 0);
      cyl(0.06, 0.3, st, 0, 1.18, 0, 8);
      add(new THREE.SphereGeometry(0.1, 8, 6), st, 0, 1.36, 0);
      const drops = [];
      const dm = mat(0xbfe6ff, { transparent: true, opacity: 0.85 });
      for (let k = 0; k < 24; k++) {
        const d = add(new THREE.SphereGeometry(0.025, 5, 4), dm, 0, 1.4, 0);
        d.userData.a = (k / 24) * Math.PI * 2;
        d.userData.ph = (k * 0.37) % 1;
        drops.push(d);
      }
      g.userData.tick = (_dt, t) => {
        for (const d of drops) {
          const f = (t * 0.7 + d.userData.ph) % 1;
          const r = 0.1 + f * 0.32;
          d.position.set(Math.cos(d.userData.a) * r, 1.42 + Math.sin(f * Math.PI) * 0.35 - f * 0.4, Math.sin(d.userData.a) * r);
        }
      };
      break;
    }
    // ---- 🐉 古風門口（作者 11/19） ----
    case 'cn_redlanterns': {
      // 一對紅燈籠：木架掛兩顆，下面有金色穗子
      const wd = mat(0x5a2418);
      for (const x of [-0.55, 0.55]) cyl(0.05, 1.9, wd, x, 0.95, 0, 8);
      box(1.3, 0.07, 0.07, wd, 0, 1.88);
      for (const x of [-0.28, 0.28]) {
        box(0.01, 0.16, 0.01, mat(0x2a2a2a), x, 1.77);
        const l = add(new THREE.SphereGeometry(0.2, 12, 8), glowMat(0xe8402a), x, 1.48, 0);
        l.scale.y = 0.85;
        for (const y of [1.66, 1.3]) cyl(0.09, 0.04, mat(0xe8c25a), x, y, 0, 10);
        add(new THREE.ConeGeometry(0.035, 0.18, 6), mat(0xe8c25a), x, 1.17, 0).rotation.x = Math.PI;
      }
      g.userData.glow = { x: 0, y: 1.48, z: 0, color: 0xff7050 };
      break;
    }
    case 'cn_lions': {
      // 一對石獅子：坐在方形台座上
      const st = mat(0xa8a49a);
      const st2 = mat(0x8a867c);
      for (const s of [-1, 1]) {
        const x = s * 0.55;
        box(0.42, 0.3, 0.42, st2, x, 0.15);
        add(new THREE.SphereGeometry(0.17, 8, 6), st, x, 0.48, 0).scale.set(1, 1.1, 1.2);
        add(new THREE.SphereGeometry(0.15, 8, 6), st, x, 0.74, 0.06);
        add(new THREE.SphereGeometry(0.17, 8, 6), mat(0x9a968c), x, 0.76, 0.0).scale.set(1.15, 1.05, 0.8);
        for (const e of [-1, 1]) add(new THREE.SphereGeometry(0.03, 6, 4), mat(0x3a3a3a), x + e * 0.06, 0.78, 0.2);
        add(new THREE.SphereGeometry(0.05, 6, 4), st, x, 0.72, 0.21).scale.set(1.3, 0.8, 0.8);
        for (const e of [-1, 1]) cyl(0.04, 0.22, st, x + e * 0.08, 0.41, 0.12, 6);
        add(new THREE.SphereGeometry(0.08, 6, 4), st, x - s * 0.12, 0.33, 0.12);
      }
      break;
    }
    case 'cn_bamboo': {
      // 竹林小景：一叢竹子＋石頭
      const bam = mat(0x6a9a4a);
      const bam2 = mat(0x5a8a3a);
      for (let k = 0; k < 9; k++) {
        const x = Math.sin(k * 2.3) * 0.45;
        const z = Math.cos(k * 1.7) * 0.3;
        const h = 1.6 + (k % 3) * 0.35;
        const c = cyl(0.04, h, k % 2 ? bam : bam2, x, h / 2, z, 6);
        c.rotation.z = Math.sin(k) * 0.06;
        for (let j = 1; j < 4; j++) box(0.09, 0.02, 0.09, mat(0x4a7a2a), x, (h / 4) * j, z);
        for (let j = 0; j < 3; j++) {
          const lf = add(new THREE.ConeGeometry(0.05, 0.32, 3), mat(0x4a8a3a), x + (j - 1) * 0.12, h - 0.1 - j * 0.15, z);
          lf.rotation.z = (j - 1) * 1.2;
          lf.scale.z = 0.3;
        }
      }
      add(new THREE.DodecahedronGeometry(0.26, 0), mat(0x7a766c), 0.6, 0.16, 0.3).scale.set(1.3, 0.7, 1);
      add(new THREE.DodecahedronGeometry(0.16, 0), mat(0x8a867c), 0.85, 0.1, 0.05);
      break;
    }
    case 'cn_pavilion': {
      // 🏯 小涼亭（月票）：紅柱、黑瓦屋頂（四個角翹起來），裡面石桌、兩張石凳可以坐
      const red = mat(0xb8382a);
      const tile = mat(0x2e2a28);
      const st = mat(0xa8a49a);
      box(2.2, 0.12, 2.2, mat(0x8a867c), 0, 0.06);
      for (const x of [-0.85, 0.85]) for (const z of [-0.85, 0.85]) cyl(0.07, 1.9, red, x, 1.07, z, 10);
      for (const z of [-0.85, 0.85]) box(1.84, 0.1, 0.1, red, 0, 1.95, z);
      for (const x of [-0.85, 0.85]) box(0.1, 0.1, 1.84, red, x, 1.95, 0);
      for (const z of [-0.85, 0.85]) box(1.6, 0.16, 0.04, mat(0x2a6a5a), 0, 1.82, z);
      const roof = add(new THREE.ConeGeometry(1.75, 0.8, 4), tile, 0, 2.38, 0);
      roof.rotation.y = Math.PI / 4;
      box(2.3, 0.08, 2.3, tile, 0, 2.02);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const tip = box(0.08, 0.08, 0.45, tile, x * 1.18, 2.12, z * 1.18);
        tip.rotation.y = Math.atan2(x, z);
        tip.rotation.x = -0.6;
      }
      add(new THREE.SphereGeometry(0.1, 8, 6), mat(0xc8a050), 0, 2.84, 0);
      // 石桌、石凳
      cyl(0.12, 0.6, st, 0, 0.42, 0, 10);
      cyl(0.34, 0.07, st, 0, 0.74, 0, 14);
      for (const x of [-0.6, 0.6]) {
        cyl(0.16, 0.34, st, x, 0.29, 0, 10);
        cyl(0.18, 0.04, mat(0xb8b4aa), x, 0.47, 0, 10);
      }
      cyl(0.05, 0.06, mat(0x5a8aa8), 0.08, 0.8, 0.04, 8); // 茶壺
      for (const [x, z] of [[-0.1, 0.1], [-0.05, -0.12]]) cyl(0.025, 0.035, mat(0xf3eee2), x, 0.795, z, 8);
      break;
    }
    case 'xm_doorarch': {
      // 💡 門口燈串拱門：跟屋內的燈串拱門同一個樣子（營地裡放大，立在進家門的小路上）
      const a = buildFurniture('xm_arch');
      g.add(a);
      g.userData.tick = a.userData.tick;
      break;
    }
    case 'xm_doorwreath': {
      // 💚 門上聖誕花圈：直立的一圈綠葉＋紅莓果＋下面的紅蝴蝶結（面向 +z，掛在門上）
      const leaves = [0x2f7a45, 0x3d9658, 0x267040];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const l = add(new THREE.IcosahedronGeometry(0.055, 0), mat(leaves[i % 3]), Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0);
        l.scale.set(1, 1, 0.6);
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        add(new THREE.SphereGeometry(0.022, 8, 6), mat(0xd8433a), Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0.04);
      }
      for (const s of [-1, 1]) {
        const lobe = add(new THREE.ConeGeometry(0.06, 0.12, 10), mat(0xd8433a), s * 0.06, -0.17, 0.05);
        lobe.rotation.z = (s * Math.PI) / 2;
        const tail = add(new THREE.BoxGeometry(0.03, 0.1, 0.01), mat(0xd8433a), s * 0.03, -0.24, 0.05);
        tail.rotation.z = s * 0.3;
      }
      add(new THREE.SphereGeometry(0.03, 8, 6), mat(0xb02a24), 0, -0.17, 0.06);
      break;
    }
    default:
      box(0.5, 0.5, 0.5, mat(0xffffff), 0, 0.25);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/** 擺設佔多大（營地裡擋路用，原尺寸的半徑） */
export const yardRadius = (id) => ({ jeep: 1.6, camper: 2.2, airstream: 2.4, tarp: 1.6, hammock: 1.4, canoe: 1.3, picnic: 1.0, bench: 0.95, bistro: 1.0, firestool: 0.9, swing: 1.35, jp_garden: 1.25, jp_fence: 0.9, jp_lantern: 0.4, jp_torii: 0.05, eu_lamp: 0.25, eu_planter: 0.45, eu_rosearch: 0.05, eu_fountain: 1.1, cn_redlanterns: 0.1, cn_lions: 0.8, cn_bamboo: 0.7, cn_pavilion: 1.15 })[id] ?? 0.6; // ⛩️ 小鳥居中間走得過去
