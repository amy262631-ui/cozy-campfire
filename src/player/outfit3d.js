import * as THREE from 'three';
import { OUTFIT_BY_ID } from '../game/outfits.js';
import { buildHair } from './hair3d.js';

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

/** opts（頭髮用）：{ hat, back, neck } 同時戴了哪些，頭髮會自己讓開（不會跟帽子、背包、圍巾卡在一起） */
/** 🔴 圓點圍巾（作者 11/12：紅底白色圓點點）：紅色圍巾，上面貼一顆一顆白色小圓點 */
function buildDotScarf(g, add, sphere, base, dotM) {
  const ring = add(new THREE.TorusGeometry(0.25, 0.085, 10, 28), base, 0, 0.535, 0.03);
  ring.rotation.x = Math.PI / 2 - 0.12;
  ring.scale.set(1.18, 1, 1);
  // 脖子那圈：沿著圈圈一排排小白點（交錯排）
  const dotGeo = new THREE.SphereGeometry(0.018, 8, 6);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    for (const [bb, off] of [[0.6, 0], [-0.6, 0.5], [1.6, 0.25]]) {
      const aa = a + (off / 22) * Math.PI * 2;
      const d = new THREE.Mesh(dotGeo, dotM);
      const rr = 0.25 + 0.085 * Math.cos(bb);
      d.position.set(Math.cos(aa) * rr, Math.sin(aa) * rr, 0.085 * Math.sin(bb));
      d.scale.set(1, 1, 0.45);
      d.lookAt(d.position.clone().multiplyScalar(2));
      ring.add(d);
    }
  }
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.52, 0.32),
    new THREE.Vector3(0.16, 0.43, 0.375),
    new THREE.Vector3(0.19, 0.33, 0.39),
    new THREE.Vector3(0.2, 0.24, 0.37),
  ]);
  const hg = new THREE.TubeGeometry(path, 20, 0.062, 12, false);
  hg.translate(-0.17, 0, -0.36).scale(1.55, 1, 0.5).translate(0.17, 0, 0.36);
  const hang = new THREE.Mesh(hg, base);
  hang.castShadow = true;
  g.add(hang);
  // 垂下來那段：正面兩排小白點
  for (let i = 0; i < 6; i++) {
    const p = path.getPointAt(0.08 + i * 0.16);
    for (const dx of [-0.045, 0.045]) {
      const d = new THREE.Mesh(dotGeo, dotM);
      d.position.set(0.17 + (p.x - 0.17) * 1.55 + dx + (i % 2 ? 0.02 : -0.02), p.y, 0.36 + (p.z - 0.36) * 0.5 + 0.034);
      d.scale.set(1, 1, 0.4);
      g.add(d);
    }
  }
  sphere(0.062, base, 0.2, 0.24, 0.37, 1.55, 1, 0.5);
  sphere(0.07, base, 0.12, 0.52, 0.31, 1, 0.9, 0.8);
  return g;
}

export function buildOutfit(id, opts = {}) {
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
    // ---------------- 💇 頭髮（贊助限定假髮，模型在 hair3d.js） ----------------
    case 'hair':
      g.add(buildHair(o.hair, o.c1, o.c2, opts));
      break;

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
    case 'santa': {
      // 🎅 聖誕帽：白色毛毛邊＋紅色軟軟的尖帽（一整塊，尖端往後彎垂下來）＋白毛球
      torus(0.36, 0.075, m2, 0.16).scale.set(1.12, 1, 1);
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const k = i / 16;
        pts.push(new THREE.Vector2(Math.max(0.012, 0.37 * Math.pow(1 - k, 1.25)), k * 0.5));
      }
      const geo = new THREE.LatheGeometry(pts, 20);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const k = pos.getY(i) / 0.5;
        pos.setZ(i, pos.getZ(i) - k * k * 0.32); // 往後彎
        pos.setY(i, pos.getY(i) - k * k * k * 0.12); // 尖端垂一點
      }
      geo.computeVertexNormals();
      const hat = add(geo, m1, 0, 0.19, 0);
      hat.scale.set(1.12, 1, 1);
      sphere(0.075, m2, 0, 0.19 + 0.5 - 0.12, -0.32);
      g.userData.hatTop = 0.62;
      break;
    }
    case 'antlers': {
      // 🦌 馴鹿角（作者 11/12 改：不要髮箍、不要另外的鹿耳朵 → 動物自己的耳朵直接變成鹿角，鼻子變紅色，看起來是一體的）
      //   耳朵在 ProceduralFox.setOutfit 收起來；紅鼻子也在那邊對準臉上的鼻子
      const branch = (r, len, x, y, z, rz) => {
        const c = add(new THREE.CapsuleGeometry(r, len, 4, 10), m1, x, y, z);
        c.rotation.z = rz;
        return c;
      };
      for (const s of [-1, 1]) {
        // 從耳朵的位置長出來：主幹往上、往外彎
        branch(0.05, 0.16, s * 0.22, 0.34, -0.03, -s * 0.35);
        branch(0.044, 0.13, s * 0.3, 0.5, -0.03, -s * 0.05);
        // 分岔：往外兩根、往內一根
        branch(0.038, 0.08, s * 0.37, 0.43, -0.03, -s * 1.15);
        branch(0.036, 0.07, s * 0.38, 0.58, -0.03, -s * 0.85);
        branch(0.034, 0.06, s * 0.23, 0.58, -0.03, s * 0.55);
      }
      const nose = sphere(0.05, new THREE.MeshStandardMaterial({ color: o.c2 ?? 0xd2392f, emissive: 0x801010, emissiveIntensity: 0.35, roughness: 0.5 }), 0, -0.078, 0.37, 1.1, 0.9, 0.75);
      nose.name = 'rednose';
      g.userData.hatTop = 0.62;
      g.userData.hideEars = true;
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
    // 11/07 改版：原本放在 y 0.6，剛好在下巴裡面（看不到、跟頭穿模）→ 往下移到下巴和胸口之間，
    // 頸圈在 y 0.54（頭和身體交界）、前面的領結／墜子在胸口 y 0.40～0.50，整體放大約 1.5 倍，比較明顯可愛。
    case 'scarf': {
      // 🔴 圓點圍巾（作者 11/12：聖誕圍巾＝紅底白色圓點點）：整條用圓點貼圖
      if (o.dots) return buildDotScarf(g, add, sphere, m1, m2);
      if (o.snowman) {
        // ⛄ 綠色針織圍巾＋前面一個小雪人吊飾（作者 11/12 參考）
        const w = mat(0xfffaf2);
        const S = 1.5; // 大一點，遠遠也看得到
        const sx = 0.12, sy = 0.44, sz = 0.39;
        sphere(0.05 * S, w, sx, sy, sz);
        sphere(0.037 * S, w, sx, sy + 0.075 * S, sz);
        const hatC = o.c1 === 0xd2392f ? 0x2f7a45 : 0xd2392f; // 紅圍巾配綠帽子雪人、綠圍巾配紅帽子
        add(new THREE.ConeGeometry(0.032 * S, 0.06 * S, 8), mat(hatC), sx, sy + 0.135 * S, sz);
        sphere(0.012 * S, w, sx, sy + 0.17 * S, sz);
        for (const ex of [-0.013, 0.013]) sphere(0.007 * S, mat(0x2a1a14), sx + ex * S, sy + 0.083 * S, sz + 0.05);
        sphere(0.008 * S, mat(0xf08a3c), sx, sy + 0.07 * S, sz + 0.055);
        sphere(0.016 * S, mat(hatC), sx, sy + 0.035 * S, sz + 0.04, 1.6, 0.8, 0.6);
      }
      const ring = add(new THREE.TorusGeometry(0.25, 0.085, 10, 28), m1, 0, 0.535, 0.03);
      ring.rotation.x = Math.PI / 2 - 0.12;
      ring.scale.set(1.18, 1, 1);
      // 垂下來的那一段：軟軟的弧線，順著肚子往下、末端圓圓的（11/07 作者：不要硬梆梆的方塊）
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.12, 0.52, 0.32),
        new THREE.Vector3(0.16, 0.43, 0.375),
        new THREE.Vector3(0.19, 0.33, 0.39),
        new THREE.Vector3(0.2, 0.24, 0.37),
      ]);
      // 壓扁成布條的樣子（寬、薄），不要像一根管子
      const hg = new THREE.TubeGeometry(path, 20, 0.062, 12, false);
      hg.translate(-0.17, 0, -0.36).scale(1.55, 1, 0.5).translate(0.17, 0, 0.36);
      const hang = new THREE.Mesh(hg, m1);
      hang.castShadow = true;
      g.add(hang);
      // 條紋圍巾：垂下來那段有一圈一圈的橫條紋（跟著布條一起壓扁）
      if (o.stripe) {
        const flat = new THREE.Group();
        flat.position.set(0.17, 0, 0.36);
        flat.scale.set(1.55, 1, 0.5);
        g.add(flat);
        const up = new THREE.Vector3(0, 1, 0);
        for (const u of [0.3, 0.55, 0.8]) {
          const pt = path.getPointAt(u);
          const band = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.035, 14), m2);
          band.position.set(pt.x - 0.17, pt.y, pt.z - 0.36);
          band.quaternion.setFromUnitVectors(up, path.getTangentAt(u).normalize());
          flat.add(band);
        }
      }
      sphere(0.062, m1, 0.2, 0.24, 0.37, 1.55, 1, 0.5); // 圓圓的尾端
      // 尾端的流蘇（一排小穗，用第二個顏色）
      for (const dx of [-0.06, -0.02, 0.02, 0.06]) add(new THREE.CapsuleGeometry(0.012, 0.04, 3, 6), m2, 0.2 + dx, 0.17, 0.37);
      sphere(0.07, m1, 0.12, 0.52, 0.31, 1, 0.9, 0.8); // 打結的地方
      break;
    }
    case 'bowtie': {
      for (const sd of [-1, 1]) {
        const w = add(new THREE.ConeGeometry(0.105, 0.19, 4), m1, sd * 0.105, 0.48, 0.33);
        w.rotation.z = (sd * Math.PI) / 2;
        w.rotation.x = -0.25;
        w.scale.set(1, 1, 0.55);
      }
      sphere(0.055, m2, 0, 0.48, 0.355, 1, 1, 0.8);
      break;
    }
    case 'beads': {
      const cs = [o.c1, o.c2, 0xfff3b0];
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI * 0.6 + (i / 12) * Math.PI * 1.2;
        const y = 0.53 - Math.cos(a * 0.85) * 0.09;
        sphere(0.046, mat(cs[i % 3]), Math.sin(a) * 0.3, y, Math.cos(a) * 0.29 + 0.04);
      }
      break;
    }
    case 'bandana': {
      const ring = add(new THREE.TorusGeometry(0.25, 0.04, 8, 28), m1, 0, 0.54, 0.03);
      ring.rotation.x = Math.PI / 2 - 0.12;
      ring.scale.set(1.18, 1, 1);
      // 胸前一片圓角三角形的小方巾（尖角朝下），上面有白色點點（11/07 改：原本是立體錐形，看不出是什麼）
      const w = 0.21, h = 0.22, rr = 0.03;
      const tri = new THREE.Shape();
      tri.moveTo(-w + rr, 0);
      tri.lineTo(w - rr, 0);
      tri.quadraticCurveTo(w, 0, w - rr * 0.8, -rr);
      tri.lineTo(rr * 0.7, -h + rr);
      tri.quadraticCurveTo(0, -h - rr * 0.2, -rr * 0.7, -h + rr);
      tri.lineTo(-w + rr * 0.8, -rr);
      tri.quadraticCurveTo(-w, 0, -w + rr, 0);
      const cloth = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), m1);
      cloth.position.set(0, 0.535, 0.29);
      cloth.rotation.x = -0.32; // 順著胸口往前斜
      cloth.castShadow = true;
      g.add(cloth);
      // 點點貼在方巾正面
      for (const [x, y] of [[-0.11, -0.04], [0.11, -0.04], [0, -0.07], [-0.05, -0.13], [0.05, -0.13], [0, -0.18]]) {
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.017, 12), m2);
        dot.position.set(x, y, 0.039);
        cloth.add(dot);
      }
      break;
    }
    case 'bell': {
      const ring = add(new THREE.TorusGeometry(0.25, 0.038, 8, 28), m1, 0, 0.54, 0.03);
      ring.rotation.x = Math.PI / 2 - 0.12;
      ring.scale.set(1.18, 1, 1);
      const metal = new THREE.MeshStandardMaterial({ color: o.c2, metalness: 0.6, roughness: 0.35 });
      add(new THREE.SphereGeometry(0.085, 16, 12), metal, 0, 0.44, 0.355);
      add(new THREE.BoxGeometry(0.1, 0.012, 0.02), mat(0x5a3a1a), 0, 0.425, 0.435);
      break;
    }
    case 'pendant': {
      const cord = add(new THREE.TorusGeometry(0.26, 0.011, 6, 28), m2, 0, 0.53, 0.03);
      cord.rotation.x = Math.PI / 2 - 0.35;
      sphere(0.075, m1, 0, 0.4, 0.35, 1, 1.2, 1);
      dome(0.075, m2, 0.43).position.set(0, 0.435, 0.35);
      add(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), m2, 0, 0.5, 0.35);
      break;
    }
    case 'jar': {
      const cord = add(new THREE.TorusGeometry(0.26, 0.011, 6, 28), mat(0x8a6a4a), 0, 0.53, 0.03);
      cord.rotation.x = Math.PI / 2 - 0.35;
      const glass = new THREE.MeshStandardMaterial({ color: o.c1, transparent: true, opacity: 0.5, roughness: 0.2 });
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 14), glass, 0, 0.38, 0.36);
      cyl(0.058, 0.058, 0.035, mat(0x8a6a4a), 0, 0.47, 0.36);
      add(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: o.c2 }), 0, 0.37, 0.36);
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
