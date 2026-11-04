import * as THREE from 'three';
import { CROP_BY_ID } from '../game/garden.js';

/** 小菜園的 3D：一格土＋依生長階段變化的作物（1 剛發芽、2 長大中、3 可以收成） */
const mats = new Map();
const m = (c, extra) => {
  const k = `${c}|${extra ? JSON.stringify(extra) : ''}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra }));
  return mats.get(k);
};
const LEAF = 0x5fae4a;

function leaves(g, n, size, h) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 6), m(LEAF));
    l.position.set(Math.sin(a) * size * 0.8, h, Math.cos(a) * size * 0.8);
    l.scale.set(0.55, 0.25, 1.2);
    l.rotation.set(0.5, a, 0);
    g.add(l);
  }
}

export function buildSoil() {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.0), m(0x6a4a32));
  soil.position.y = 0.03;
  g.add(soil);
  for (const x of [-0.5, 0, 0.5]) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.86), m(0x5a3c26));
    row.position.set(x, 0.07, 0);
    g.add(row);
  }
  return g;
}

/** 一株作物 */
export function buildCrop(id, stage) {
  const c = CROP_BY_ID[id];
  const g = new THREE.Group();
  if (!c || !stage) return g;
  if (stage === 1) {
    // 剛發芽：兩片小葉子
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.08, 5), m(LEAF));
    st.position.y = 0.12;
    g.add(st);
    leaves(g, 2, 0.04, 0.16);
    return g;
  }
  const ready = stage === 3;
  const veg = m(c.color, ready ? { emissive: c.color, emissiveIntensity: 0.12, roughness: 0.4 } : {});
  switch (id) {
    case 'pumpkin': {
      leaves(g, 4, 0.09, 0.1);
      const s = ready ? 0.15 : 0.07;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.SphereGeometry(s * 0.62, 12, 8), veg);
        p.position.set(Math.sin(a) * s * 0.45, 0.08 + s * 0.7, Math.cos(a) * s * 0.45);
        p.scale.y = 1.2;
        g.add(p);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 5), m(0x4a6a2a));
      stem.position.y = 0.08 + s * 1.5;
      g.add(stem);
      break;
    }
    case 'corn': {
      const h = ready ? 0.65 : 0.4;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, h, 6), m(LEAF));
      st.position.y = 0.06 + h / 2;
      g.add(st);
      for (let k = 0; k < 4; k++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 5), m(LEAF));
        l.position.set(0, 0.15 + k * h * 0.2, 0);
        l.scale.set(0.15, 0.05, 1);
        l.rotation.y = k * 1.6;
        l.rotation.x = 0.4;
        g.add(l);
      }
      if (ready) {
        const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 8), veg);
        cob.position.set(0.05, 0.42, 0.02);
        cob.rotation.z = -0.35;
        g.add(cob);
      }
      break;
    }
    case 'carrot':
    case 'sweetpotato':
    case 'potato': {
      leaves(g, 5, ready ? 0.07 : 0.05, ready ? 0.2 : 0.14);
      if (ready) {
        // 頂端從土裡露出一點點
        const top = new THREE.Mesh(id === 'carrot' ? new THREE.ConeGeometry(0.045, 0.08, 10) : new THREE.SphereGeometry(0.05, 10, 8), veg);
        top.position.y = 0.1;
        if (id === 'carrot') top.rotation.x = Math.PI;
        g.add(top);
      }
      break;
    }
    case 'cabbage': {
      const s = ready ? 0.11 : 0.07;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), veg);
      ball.position.y = 0.06 + s;
      g.add(ball);
      leaves(g, 5, s * 0.9, 0.09);
      break;
    }
    default: {
      // 番茄、甜椒：小支架上掛著果實
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 5), m(0x8a6a3a));
      st.position.y = 0.27;
      g.add(st);
      leaves(g, 4, 0.06, 0.22);
      leaves(g, 3, 0.05, 0.34);
      const n = ready ? 3 : 0;
      for (let k = 0; k < n; k++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), veg);
        f.position.set(Math.sin(k * 2.1) * 0.07, 0.18 + k * 0.08, Math.cos(k * 2.1) * 0.07);
        if (id === 'pepper') f.scale.set(0.8, 1.3, 0.8);
        g.add(f);
      }
    }
  }
  if (ready) {
    // 可以收成：上面一顆小星星閃閃
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    star.position.y = 0.62;
    star.userData.spin = true;
    g.add(star);
  }
  return g;
}
