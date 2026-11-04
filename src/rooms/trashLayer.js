import * as THREE from 'three';
import { TRASH_BY_ID } from '../game/trash.js';

/**
 * ♻️ 地上的垃圾（湖邊、帳篷營地路邊、中央營火區）：伺服器說哪裡有就畫在哪裡，走近按 E 撿起來。
 */
const mats = new Map();
const mat = (c, extra) => {
  const k = `${c}|${extra ? JSON.stringify(extra) : ''}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra }));
  return mats.get(k);
};

/** 垃圾的小模型（躺在地上） */
export function buildTrashModel(id) {
  const it = TRASH_BY_ID[id];
  const g = new THREE.Group();
  const c = it?.color ?? 0xcccccc;
  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  switch (it?.model) {
    case 'bottle': {
      const glass = mat(c, { transparent: true, opacity: 0.75, roughness: 0.15 });
      const b = add(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), glass, 0, 0.05, 0);
      b.rotation.z = Math.PI / 2;
      const neck = add(new THREE.CylinderGeometry(0.02, 0.04, 0.06, 8), glass, 0.12, 0.05, 0);
      neck.rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), mat(0x4a74b5), 0.16, 0.05, 0).rotation.z = Math.PI / 2;
      break;
    }
    case 'can': {
      const can = add(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12), mat(c, { metalness: 0.5, roughness: 0.35 }), 0, 0.045, 0);
      can.rotation.set(Math.PI / 2, 0, 0.4);
      can.scale.set(1, 1, 0.8); // 被踩扁一點
      break;
    }
    case 'bag': {
      const bag = add(new THREE.IcosahedronGeometry(0.1, 1), mat(c, { transparent: true, opacity: 0.85 }), 0, 0.05, 0);
      bag.scale.set(1.3, 0.45, 1);
      add(new THREE.TorusGeometry(0.035, 0.008, 4, 10), mat(c), 0.1, 0.05, 0).rotation.x = Math.PI / 2;
      break;
    }
    case 'stick': {
      for (const dz of [-0.015, 0.015]) {
        const s = add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5), mat(c), 0, 0.012, dz);
        s.rotation.z = Math.PI / 2;
        s.rotation.y = dz * 8;
      }
      break;
    }
    case 'cup': {
      const cup = add(new THREE.CylinderGeometry(0.045, 0.035, 0.1, 12, 1, true), mat(c, { side: THREE.DoubleSide }), 0, 0.04, 0);
      cup.rotation.z = Math.PI / 2;
      break;
    }
    case 'box':
      add(new THREE.BoxGeometry(0.16, 0.05, 0.11), mat(c), 0, 0.025, 0).rotation.y = 0.4;
      break;
    case 'flat': {
      const f = add(new THREE.CircleGeometry(0.08, 10), mat(c, { side: THREE.DoubleSide }), 0, 0.015, 0);
      f.rotation.x = -Math.PI / 2;
      f.scale.set(1.3, 0.8, 1);
      break;
    }
    case 'tangle':
      for (let i = 0; i < 3; i++) {
        const t = add(new THREE.TorusGeometry(0.06 + i * 0.015, 0.005, 4, 16), mat(c), 0, 0.02 + i * 0.008, 0);
        t.rotation.set(Math.PI / 2 + i * 0.4, i, 0);
      }
      break;
    case 'ball':
      add(new THREE.SphereGeometry(0.05, 10, 8), mat(c), 0, 0.05, 0);
      break;
    case 'tire': {
      const t = add(new THREE.TorusGeometry(0.16, 0.06, 8, 18), mat(c, { roughness: 0.9 }), 0, 0.06, 0);
      t.rotation.x = Math.PI / 2;
      break;
    }
    default:
      add(new THREE.SphereGeometry(0.05, 8, 6), mat(c), 0, 0.05, 0);
  }
  return g;
}

export function createTrashLayer(group, { y = () => 0 } = {}) {
  const items = new Map(); // k → { g, x, z, item, ring }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xbfe6a8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  return {
    setList(list = []) {
      const keep = new Set(list.map((x) => x.k));
      for (const [k, it] of items) {
        if (keep.has(k)) continue;
        group.remove(it.g);
        items.delete(k);
      }
      for (const x of list) {
        if (items.has(x.k)) continue;
        const g = new THREE.Group();
        const m = buildTrashModel(x.item);
        m.rotation.y = Math.random() * Math.PI * 2;
        g.add(m);
        // 淡淡的綠色小圈：提醒這是可以撿的
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 20), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        g.add(ring);
        g.position.set(x.x, y(x.x, x.z), x.z);
        group.add(g);
        items.set(x.k, { k: x.k, x: x.x, z: x.z, item: x.item, g });
      }
    },
    /** 1.4 公尺內最近的一件 */
    near(pos) {
      let best = null;
      let bd = 1.4;
      for (const it of items.values()) {
        const d = Math.hypot(pos.x - it.x, pos.z - it.z);
        if (d < bd) {
          bd = d;
          best = it;
        }
      }
      return best;
    },
    get count() {
      return items.size;
    },
  };
}
