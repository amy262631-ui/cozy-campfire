import * as THREE from 'three';
import { OUTFIT_BY_ID } from '../game/outfits.js';

/**
 * 造型的 3D 模型（簡單幾何組合，跟角色一樣霧面可愛風）。
 * 座標：
 *   head：頭的中心（頭半徑約 0.37，頭頂 y ≈ 0.35）
 *   neck：身體座標，脖子前面（頭的中心在 y 0.82）
 *   back：身體座標，背後（背面 z ≈ -0.32）
 * 回傳 Group；userData.hatTop＝帽子頂端高度（讓贊助小花插在帽子上，不被蓋掉）
 */
const mats = new Map();
function mat(color, glow = false) {
  const k = `${color}:${glow}`;
  if (!mats.has(k)) {
    mats.set(
      k,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        ...(glow ? { emissive: color, emissiveIntensity: 0.55 } : {}),
      }),
    );
  }
  return mats.get(k);
}

export function buildOutfit(id) {
  const o = OUTFIT_BY_ID[id];
  if (!o) return null;
  const g = new THREE.Group();
  g.userData.hatTop = 0;
  const m1 = mat(o.c1, !!o.glow);
  const m2 = mat(o.c2, !!o.glow);
  const add = (geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const sphere = (r, m, x, y, z, sx, sy, sz) => add(new THREE.SphereGeometry(r, 16, 12), m, x, y, z, sx, sy, sz);
  const dome = (r, m, y, sy = 1, sx = 1) => add(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, y, 0, sx, sy, sx);
  const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 18) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const torus = (R, r, m, y, sy = 1) => {
    const t = add(new THREE.TorusGeometry(R, r, 8, 24), m, 0, y, 0);
    t.rotation.x = Math.PI / 2;
    t.scale.set(1, sy, 1);
    return t;
  };

  switch (o.kind) {
    // ---------------- 頭 ----------------
    case 'beanie': {
      dome(0.36, m1, 0.12, 0.85, 1.12);
      torus(0.37, 0.05, m2, 0.13, 1).scale.set(1.12, 1, 1);
      sphere(0.075, m2, 0, 0.45, 0);
      g.userData.hatTop = 0.5;
      break;
    }
    case 'straw': {
      cyl(0.62, 0.62, 0.025, m1, 0, 0.24);
      dome(0.27, m1, 0.24, 0.8, 1.05);
      cyl(0.285, 0.285, 0.06, m2, 0, 0.28).scale.set(1.05, 1, 1.05);
      g.userData.hatTop = 0.46;
      break;
    }
    case 'beret': {
      const b = sphere(0.33, m1, -0.05, 0.3, 0, 1.2, 0.35, 1.15);
      b.rotation.z = 0.2;
      cyl(0.015, 0.025, 0.06, m1, -0.05, 0.42, 0);
      g.userData.hatTop = 0.44;
      break;
    }
    case 'cap': {
      dome(0.36, m1, 0.13, 0.75, 1.1);
      const brim = cyl(0.24, 0.24, 0.025, m1, 0, 0.17, 0.36);
      brim.scale.set(1.2, 1, 0.8);
      sphere(0.04, m2, 0, 0.4, 0);
      cyl(0.05, 0.05, 0.03, m2, 0, 0.3, 0.33).rotation.x = 0.3;
      g.userData.hatTop = 0.42;
      break;
    }
    case 'mushroom': {
      dome(0.46, m1, 0.18, 0.6, 1.05);
      for (const [x, z, r] of [[0, 0.25, 0.06], [0.24, 0.1, 0.05], [-0.22, 0.12, 0.055], [0.12, -0.24, 0.05], [-0.14, -0.22, 0.045], [0, 0, 0.06]]) {
        const y = 0.18 + Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (0.46 * 0.46))) * 0.46 * 0.6;
        sphere(r, m2, x, y, z, 1, 0.35, 1);
      }
      g.userData.hatTop = 0.47;
      break;
    }
    case 'acorn': {
      dome(0.36, m1, 0.16, 0.6, 1.1);
      for (let i = 0; i < 3; i++) torus(0.3 - i * 0.08, 0.02, m2, 0.22 + i * 0.06);
      cyl(0.02, 0.03, 0.12, m2, 0, 0.42, 0);
      g.userData.hatTop = 0.48;
      break;
    }
    case 'earmuff': {
      const band = add(new THREE.TorusGeometry(0.38, 0.025, 8, 24, Math.PI), m2, 0, 0.02, 0);
      band.scale.set(1.12, 1, 1);
      for (const s of [-1, 1]) sphere(0.12, m1, s * 0.42, 0.02, 0, 0.6, 1, 1);
      g.userData.hatTop = 0.42;
      break;
    }
    case 'crown': {
      torus(0.3, 0.035, m2, 0.27);
      const colors = [o.c1, 0xffffff, o.c1, 0xffe08a];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        sphere(0.06, mat(colors[i % colors.length]), Math.sin(a) * 0.3, 0.3, Math.cos(a) * 0.3, 1, 0.7, 1);
      }
      g.userData.hatTop = 0.36;
      break;
    }
    case 'witch': {
      cyl(0.5, 0.5, 0.025, m2, 0, 0.24);
      const c = add(new THREE.ConeGeometry(0.26, 0.5, 16), m1, 0, 0.5, -0.02);
      c.rotation.x = -0.18;
      cyl(0.27, 0.27, 0.06, m2, 0, 0.29).scale.set(1, 1, 1);
      g.userData.hatTop = 0.62;
      break;
    }
    case 'marsh': {
      cyl(0.26, 0.28, 0.3, m1, 0, 0.42);
      cyl(0.27, 0.27, 0.06, m2, 0, 0.58);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), mat(0x8a5a32), 0.12, 0.7, 0).rotation.z = -0.5;
      g.userData.hatTop = 0.62;
      break;
    }

    // ---------------- 脖子 ----------------
    case 'scarf': {
      const ring = add(new THREE.TorusGeometry(0.22, 0.065, 10, 24), m1, 0, 0.6, 0.02);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1.15, 1, 1);
      if (o.stripe) {
        for (const dx of [-0.12, 0, 0.12]) {
          const s = add(new THREE.BoxGeometry(0.03, 0.14, 0.03), m2, dx, 0.6, 0.27);
          s.rotation.x = 0.1;
        }
      }
      const tail = add(new THREE.BoxGeometry(0.11, 0.26, 0.05), m1, 0.12, 0.47, 0.25);
      tail.rotation.set(0.25, 0, 0.12);
      add(new THREE.BoxGeometry(0.12, 0.03, 0.055), m2, 0.135, 0.35, 0.28).rotation.z = 0.12;
      break;
    }
    case 'bowtie': {
      for (const s of [-1, 1]) {
        const w = add(new THREE.ConeGeometry(0.07, 0.13, 4), m1, s * 0.07, 0.6, 0.27);
        w.rotation.z = (s * Math.PI) / 2;
      }
      sphere(0.035, m2, 0, 0.6, 0.29);
      break;
    }
    case 'beads': {
      const cs = [o.c1, o.c2, 0xfff3b0];
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI * 0.62 + (i / 12) * Math.PI * 1.24;
        const y = 0.58 - Math.cos(a * 0.8) * 0.06;
        sphere(0.032, mat(cs[i % 3]), Math.sin(a) * 0.24, y, Math.cos(a) * 0.22 + 0.03);
      }
      break;
    }
    case 'bandana': {
      const ring = add(new THREE.TorusGeometry(0.22, 0.03, 8, 24), m1, 0, 0.6, 0.02);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1.15, 1, 1);
      const tri = add(new THREE.ConeGeometry(0.14, 0.2, 3), m1, 0, 0.5, 0.25);
      tri.rotation.set(Math.PI + 0.25, Math.PI / 6, 0);
      tri.scale.set(1, 1, 0.3);
      sphere(0.02, m2, -0.04, 0.53, 0.29);
      sphere(0.02, m2, 0.04, 0.49, 0.29);
      break;
    }
    case 'bell': {
      const ring = add(new THREE.TorusGeometry(0.22, 0.025, 8, 24), m1, 0, 0.6, 0.02);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1.15, 1, 1);
      add(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: o.c2, metalness: 0.6, roughness: 0.35 }), 0, 0.52, 0.27);
      break;
    }
    case 'pendant': {
      const cord = add(new THREE.TorusGeometry(0.22, 0.008, 6, 24), m2, 0, 0.6, 0.02);
      cord.rotation.x = Math.PI / 2 - 0.25;
      sphere(0.05, m1, 0, 0.48, 0.27, 1, 1.2, 1);
      dome(0.05, m2, 0.5).position.set(0, 0.51, 0.27);
      break;
    }
    case 'jar': {
      const cord = add(new THREE.TorusGeometry(0.22, 0.008, 6, 24), mat(0x8a6a4a), 0, 0.6, 0.02);
      cord.rotation.x = Math.PI / 2 - 0.25;
      const glass = new THREE.MeshStandardMaterial({ color: o.c1, transparent: true, opacity: 0.45, roughness: 0.2 });
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 12), glass, 0, 0.47, 0.28);
      cyl(0.04, 0.04, 0.025, mat(0x8a6a4a), 0, 0.535, 0.28);
      add(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: o.c2 }), 0, 0.46, 0.28);
      break;
    }

    // ---------------- 背 ----------------
    case 'backpack': {
      add(new THREE.BoxGeometry(0.32, 0.34, 0.16), m1, 0, 0.42, -0.36);
      dome(0.16, m1, 0.59).position.set(0, 0.585, -0.36);
      add(new THREE.BoxGeometry(0.22, 0.12, 0.05), m2, 0, 0.36, -0.45);
      for (const s of [-1, 1]) {
        const strap = add(new THREE.BoxGeometry(0.04, 0.42, 0.03), m2, s * 0.12, 0.45, -0.28);
        strap.rotation.x = 0.1;
      }
      break;
    }
    case 'bedroll': {
      const roll = add(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 16), m1, 0, 0.62, -0.32);
      roll.rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) {
        const band = add(new THREE.TorusGeometry(0.115, 0.012, 6, 16), m2, s * 0.14, 0.62, -0.32);
        band.rotation.y = Math.PI / 2;
      }
      break;
    }
    case 'cape': {
      const shape = new THREE.Shape();
      shape.moveTo(-0.18, 0);
      shape.quadraticCurveTo(-0.34, -0.3, -0.12, -0.5);
      shape.lineTo(0, -0.42);
      shape.lineTo(0.12, -0.5);
      shape.quadraticCurveTo(0.34, -0.3, 0.18, 0);
      shape.closePath();
      const cape = add(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), m1, 0, 0.7, -0.34);
      cape.rotation.x = 0.18;
      const vein = add(new THREE.BoxGeometry(0.015, 0.42, 0.01), m2, 0, 0.47, -0.37);
      vein.rotation.x = 0.18;
      break;
    }
    case 'wings': {
      for (const s of [-1, 1]) {
        const up = sphere(0.16, m1, s * 0.2, 0.62, -0.36, 1, 1.3, 0.12);
        up.rotation.z = s * -0.5;
        const low = sphere(0.1, m2, s * 0.16, 0.42, -0.36, 1, 1.2, 0.12);
        low.rotation.z = s * 0.4;
        g.userData[s < 0 ? 'wingL' : 'wingR'] = [up, low];
      }
      g.userData.flap = true;
      break;
    }
    case 'lanternpack': {
      const frame = mat(o.c1);
      cyl(0.02, 0.02, 0.62, frame, 0.12, 0.62, -0.34, 6);
      const arm = add(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6), frame, 0.12, 0.92, -0.45);
      arm.rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(0.26, 0.28, 0.1), frame, 0, 0.45, -0.36);
      const lamp = add(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: o.c2 }), 0.12, 0.8, -0.56, 1, 1.25, 1);
      g.userData.lamp = lamp;
      break;
    }
    case 'shell': {
      const shell = add(new THREE.TorusGeometry(0.13, 0.08, 10, 20), m1, 0, 0.5, -0.38);
      shell.rotation.y = Math.PI / 2;
      sphere(0.09, m2, 0, 0.5, -0.38, 0.9, 1, 1);
      break;
    }
    case 'pinepack': {
      const body = sphere(0.18, m1, 0, 0.47, -0.38, 0.95, 1.2, 0.8);
      body.rotation.x = 0.1;
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 5; i++) {
          const a = -0.9 + (i / 4) * 1.8;
          const sc = add(new THREE.ConeGeometry(0.04, 0.06, 4), m2, Math.sin(a) * 0.15, 0.33 + r * 0.09, -0.44 - Math.cos(a) * 0.08);
          sc.rotation.x = -1.2;
        }
      }
      break;
    }
    case 'cloud': {
      for (const [x, y, r] of [[0, 0.5, 0.15], [-0.14, 0.44, 0.11], [0.14, 0.45, 0.12], [0.06, 0.6, 0.11], [-0.07, 0.58, 0.1]]) {
        sphere(r, x === 0 && y === 0.5 ? m1 : m2, x, y, -0.38, 1, 1, 0.75);
      }
      break;
    }
    default:
      return null;
  }
  return g;
}

/** 翅膀拍動、燈籠閃爍（每幀呼叫） */
export function animateOutfit(g, t) {
  if (!g) return;
  if (g.userData.flap) {
    const a = Math.sin(t * 3) * 0.25;
    for (const m of g.userData.wingL ?? []) m.rotation.y = a;
    for (const m of g.userData.wingR ?? []) m.rotation.y = -a;
  }
}
