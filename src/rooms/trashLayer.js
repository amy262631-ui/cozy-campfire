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
/** 🥚 假日雞蛋節的彩蛋（hegg）、整點大金蛋（hgold）：混在垃圾清單裡 */
export const isHolEgg = (id) => id === 'hegg' || id === 'hgold';
const EGG_COLORS = [[0xffc8dc, 0x8fd0f0], [0x9ad8f0, 0xffe07a], [0xffe07a, 0xf2a8b4], [0xc8e8a0, 0xd8b4f0], [0xd8b4f0, 0x9ad8f0]];
function buildHolEgg(gold) {
  const g = new THREE.Group();
  const [c1, c2] = gold ? [0xf2c14a, 0xfff0a0] : EGG_COLORS[Math.floor(Math.random() * EGG_COLORS.length)];
  const body = new THREE.Mesh(new THREE.SphereGeometry(gold ? 0.18 : 0.14, 16, 12), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.45, metalness: gold ? 0.5 : 0, emissive: gold ? 0xffb020 : 0x000000, emissiveIntensity: gold ? 0.45 : 0 }));
  body.scale.set(0.85, 1.12, 0.85);
  body.position.y = gold ? 0.2 : 0.16;
  body.castShadow = true;
  g.add(body);
  for (const dy of [-0.025, 0.035]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry((gold ? 0.152 : 0.118) * (dy < 0 ? 1 : 0.96), 0.012, 6, 20), new THREE.MeshStandardMaterial({ color: c2, emissive: gold ? 0xffe080 : 0x000000, emissiveIntensity: gold ? 0.5 : 0 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = body.position.y + dy;
    g.add(band);
  }
  return g;
}
export function buildTrashModel(id) {
  if (isHolEgg(id)) return buildHolEgg(id === 'hgold');
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
  // ⭐ 稀有垃圾（作者 11/22：小垃圾不改，稀有的做得像真的）
  const cylX = (r1, r2, len, m, x, y, z, seg = 10) => {
    const mesh = add(new THREE.CylinderGeometry(r1, r2, len, seg), m, x, y, z);
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  };
  if (id === 'umbrella') {
    // ☂️ 壞掉的雨傘：躺在地上，傘面半開又塌掉一邊，一根傘骨凸出來，J 字握把
    const cloth = mat(c, { side: THREE.DoubleSide, roughness: 0.7 });
    cylX(0.008, 0.008, 0.5, mat(0x9aa0a8, { metalness: 0.6 }), 0, 0.04, 0, 6);
    const canopy = add(new THREE.ConeGeometry(0.13, 0.3, 8, 1, true), cloth, 0.1, 0.07, 0);
    canopy.rotation.z = -Math.PI / 2;
    canopy.scale.set(1, 1, 0.7);
    const stripe = add(new THREE.ConeGeometry(0.131, 0.05, 8, 1, true), mat(0xd9c9a3, { side: THREE.DoubleSide }), 0.0, 0.07, 0);
    stripe.rotation.z = -Math.PI / 2;
    stripe.scale.set(1, 1, 0.7);
    const rib = add(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), mat(0x9aa0a8, { metalness: 0.6 }), 0.0, 0.14, 0.08);
    rib.rotation.set(0.9, 0, 0.5);
    const hook = add(new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), mat(0x5a3a22), -0.26, 0.05, 0);
    hook.rotation.z = Math.PI / 2;
    add(new THREE.SphereGeometry(0.008, 6, 4), mat(0x9aa0a8, { metalness: 0.6 }), 0.26, 0.04, 0);
    return g;
  }
  if (id === 'old_plush') {
    // 🧸 破舊玩偶：歪坐著的小熊，掉了一顆眼睛、身上有補丁、棉花跑出來
    const fur = mat(c, { roughness: 0.95 });
    const body = add(new THREE.SphereGeometry(0.075, 12, 10), fur, 0, 0.07, 0);
    body.scale.set(1, 1.1, 0.9);
    const head = add(new THREE.SphereGeometry(0.06, 12, 10), fur, 0.01, 0.17, 0.01);
    head.rotation.z = 0.35;
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.022, 8, 6), fur, 0.01 + s * 0.045, 0.22, 0);
    add(new THREE.SphereGeometry(0.025, 8, 6), mat(0xd8c0a0), 0.02, 0.16, 0.055);
    add(new THREE.SphereGeometry(0.01, 6, 4), mat(0x1a1410), -0.015, 0.185, 0.05);
    add(new THREE.CircleGeometry(0.008, 6), mat(0x6a4a30), 0.04, 0.19, 0.053); // 掉了的那顆眼睛只剩線頭
    for (const [x, y, z] of [[-0.075, 0.08, 0.02], [0.075, 0.07, 0.03], [-0.04, 0.02, 0.06], [0.04, 0.02, 0.06]]) add(new THREE.SphereGeometry(0.028, 8, 6), fur, x, y, z);
    const patch = add(new THREE.CircleGeometry(0.022, 4), mat(0x6a8ab0), 0.02, 0.08, 0.07);
    patch.rotation.z = 0.3;
    for (const [x, y, z] of [[0.07, 0.1, -0.03], [0.08, 0.12, -0.01]]) add(new THREE.SphereGeometry(0.018, 6, 5), mat(0xf6f3ea, { roughness: 1 }), x, y, z);
    g.rotation.z = 0.25;
    return g;
  }
  if (id === 'broken_phone') {
    // 📱 壞掉的手機：平躺、外殼、黑色螢幕上裂成蜘蛛網、相機鏡頭
    add(new THREE.BoxGeometry(0.11, 0.014, 0.2), mat(0x6a8ab0, { roughness: 0.5 }), 0, 0.008, 0);
    add(new THREE.BoxGeometry(0.098, 0.004, 0.186), mat(0x10141c, { roughness: 0.15, metalness: 0.3 }), 0, 0.016, 0);
    const crack = mat(0xdfe8f2);
    for (const a of [0.2, 1.1, 2.0, 2.9, 3.9, 5.0]) {
      const l = add(new THREE.BoxGeometry(0.06, 0.002, 0.002), crack, 0.02 + Math.cos(a) * 0.03, 0.019, -0.03 + Math.sin(a) * 0.03);
      l.rotation.y = -a;
    }
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 10), mat(0x2a2a2a), -0.03, 0.002, -0.075).rotation.x = Math.PI;
    g.rotation.y = 0.4;
    return g;
  }
  if (id === 'broken_chair') {
    // 🪑 斷腿露營椅：倒在地上的折疊椅，綠色椅布、X 字椅腳、一隻腳斷了
    const frame = mat(0x2a2a2a, { metalness: 0.4 });
    const cloth = mat(c, { side: THREE.DoubleSide, roughness: 0.8 });
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.24), cloth);
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 0.16;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.24), cloth);
    back.position.set(0, 0.29, -0.13);
    back.rotation.x = -0.15;
    chair.add(seat, back);
    for (const s of [-1, 1]) {
      for (const [len, rx, z] of [[0.3, 0.6, 0], [s > 0 ? 0.14 : 0.3, -0.6, 0]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 5), frame);
        leg.position.set(s * 0.14, len === 0.14 ? 0.11 : 0.08, z);
        leg.rotation.x = rx;
        chair.add(leg);
      }
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 5), frame);
      post.position.set(s * 0.14, 0.28, -0.13);
      chair.add(post);
    }
    chair.rotation.z = Math.PI / 2 - 0.15; // 側倒
    chair.position.set(0.15, 0.13, 0);
    g.add(chair);
    return g;
  }
  if (id === 'telescope') {
    // 🔭 壞掉的望遠鏡：三節黃銅鏡筒、鏡片裂了、目鏡，旁邊一根斷掉的腳架
    const brass = mat(0xc9a14a, { metalness: 0.7, roughness: 0.35 });
    const leather = mat(c, { roughness: 0.8 });
    cylX(0.045, 0.045, 0.16, leather, 0.06, 0.045, 0, 14);
    cylX(0.037, 0.037, 0.12, brass, -0.07, 0.045, 0, 14);
    cylX(0.029, 0.029, 0.08, brass, -0.16, 0.045, 0, 12);
    for (const x of [0.14, -0.01, -0.13]) {
      const ring = add(new THREE.TorusGeometry(x > 0 ? 0.047 : x > -0.05 ? 0.04 : 0.032, 0.006, 6, 16), brass, x, 0.045, 0);
      ring.rotation.y = Math.PI / 2;
    }
    const lens = add(new THREE.CircleGeometry(0.04, 16), mat(0xbfe0f0, { metalness: 0.3, roughness: 0.05 }), 0.141, 0.045, 0);
    lens.rotation.y = Math.PI / 2;
    for (const a of [0.4, 1.9, 3.6]) {
      const k = add(new THREE.BoxGeometry(0.002, 0.035, 0.002), mat(0xffffff), 0.142, 0.045 + Math.sin(a) * 0.01, Math.cos(a) * 0.01);
      k.rotation.x = a;
    }
    cylX(0.014, 0.018, 0.03, mat(0x2a2a2a), -0.21, 0.045, 0);
    const leg = add(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), mat(0x5a3a22), 0.0, 0.01, 0.1);
    leg.rotation.set(Math.PI / 2, 0, 0.4);
    return g;
  }
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
      if (id === 'bike_wheel') {
        // 🚲 腳踏車輪（作者 11/22：要像真的）：細輪胎＋銀色輪框＋一根根輻條＋中間花鼓，有點歪
        const w = new THREE.Group();
        const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 32), mat(0x262626, { roughness: 0.9 }));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.008, 4, 32), mat(0xc8ccd2, { metalness: 0.7, roughness: 0.35 }));
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), mat(0x9aa0a8, { metalness: 0.7 }));
        hub.rotation.x = Math.PI / 2;
        w.add(tyre, rim, hub);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.18, 3), mat(0xb8bcc2, { metalness: 0.6 }));
          sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, i % 2 ? 0.008 : -0.008);
          sp.rotation.z = a - Math.PI / 2;
          w.add(sp);
        }
        w.rotation.x = -Math.PI / 2 + 0.12; // 平躺在地上、有點翹
        w.position.y = 0.035;
        g.add(w);
        break;
      }
      // 🛞 舊輪胎（作者 11/22）：胖胖的胎身、外圈胎紋一格一格、側面有一圈字的凸紋、中間空的，旁邊有一點泥巴
      const rubber = mat(c, { roughness: 0.95 });
      const t = add(new THREE.TorusGeometry(0.15, 0.07, 12, 28), rubber, 0, 0.07, 0);
      t.scale.z = 0.8;
      t.rotation.x = Math.PI / 2;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const tread = add(new THREE.BoxGeometry(0.022, 0.034, 0.04), mat(0x1c1c1c, { roughness: 1 }), Math.cos(a) * 0.212, 0.07 + (i % 2 ? 0.022 : -0.022), Math.sin(a) * 0.212);
        tread.rotation.y = -a;
      }
      const wall = add(new THREE.TorusGeometry(0.15, 0.006, 4, 28), mat(0x5a5a5a, { roughness: 0.8 }), 0, 0.125, 0);
      wall.rotation.x = Math.PI / 2;
      const mud = add(new THREE.SphereGeometry(0.05, 8, 6), mat(0x5a4632, { roughness: 1 }), 0.2, 0.03, 0.08);
      mud.scale.set(1.4, 0.35, 1);
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
