import * as THREE from 'three';
import { FISH } from './fishData.js';

/**
 * 圓滾滾的小魚模型（長度 1，頭朝 +X）。舊靴子與寶特瓶另外做。
 * 使用時依尺寸縮放：mesh.scale.setScalar(公分 / 100 * 1.3)
 */
export function createFishMesh(index, shiny = false) {
  const f0 = FISH[index] ?? FISH[0];
  const f = shiny && !f0.junk ? { ...f0, ...shinyLook(f0) } : f0;
  const g = new THREE.Group();
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const glow = f.glow ? { emissive: f.glow, emissiveIntensity: 0.55 } : {};

  // ♻️ 釣到的垃圾（作者 11/22：舉在頭上要像真的 → 重做靴子、寶特瓶、漂流瓶、罐頭）
  const lathe = (pts, m, seg = 20) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
  const weedTube = (pts, r = 0.018) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 12, r, 5), mat(0x4f8a3a, { roughness: 0.8 }));
  const drip = (x, y, z, r = 0.022) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(0xbfe6ff, { transparent: true, opacity: 0.75, roughness: 0.05 }));
    d.scale.y = 1.4;
    d.position.set(x, y, z);
    return d;
  };
  if (f.junk === 'boot') {
    // 🥾 舊靴子：直立的靴筒＋圓圓的鞋頭、厚鞋底、鞋跟、鞋帶、後面的拉環，掛著水草、滴水
    const leather = mat(f.color, { roughness: 0.75 });
    const dark = mat(0x2a2018, { roughness: 0.9 });
    const boot = new THREE.Group();
    const shaft = lathe([[0.0, 0.0], [0.15, 0.0], [0.15, 0.1], [0.135, 0.3], [0.145, 0.46], [0.155, 0.5], [0.13, 0.5], [0.12, 0.47], [0.11, 0.2], [0.0, 0.2]], leather, 18);
    shaft.scale.z = 0.85;
    boot.add(shaft);
    const inside = new THREE.Mesh(new THREE.CircleGeometry(0.118, 16), mat(0x140e0a));
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = 0.47;
    inside.scale.y = 0.85;
    boot.add(inside);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), leather);
    foot.scale.set(1.45, 0.62, 0.82);
    foot.position.set(0.13, 0.07, 0);
    boot.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat(0x3a2a1e, { roughness: 0.6 }));
    toe.scale.set(1.1, 0.75, 1.15);
    toe.position.set(0.33, 0.06, 0);
    boot.add(toe);
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 18), dark);
    sole.scale.set(2.05, 1, 1.0);
    sole.position.set(0.12, -0.035, 0);
    boot.add(sole);
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.24), dark);
    heel.position.set(-0.08, -0.07, 0);
    boot.add(heel);
    const lace = mat(0xd9c9a3);
    for (let i = 0; i < 4; i++) {
      const y = 0.16 + i * 0.075;
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.006, 6, 10), mat(0xc9a14a, { metalness: 0.6, roughness: 0.4 }));
        eye.position.set(0.13, y, s * 0.06);
        eye.rotation.y = Math.PI / 2;
        boot.add(eye);
      }
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.15, 5), lace);
      l.position.set(0.135, y + 0.035, 0);
      l.rotation.x = i % 2 ? 0.95 : -0.95;
      boot.add(l);
    }
    boot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.14, 0.43, 0), new THREE.Vector3(0.22, 0.36, 0.04), new THREE.Vector3(0.25, 0.22, 0.02)]), 8, 0.007, 4), lace));
    const tab = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), leather);
    tab.position.set(-0.13, 0.5, 0);
    tab.rotation.y = Math.PI / 2;
    boot.add(tab);
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), mat(0x7a5a40, { roughness: 0.9 }));
    patch.position.set(0.02, 0.3, 0.13);
    patch.rotation.y = 0.15;
    boot.add(patch);
    boot.add(weedTube([[-0.1, 0.5, 0.08], [-0.16, 0.42, 0.13], [-0.18, 0.28, 0.12], [-0.15, 0.16, 0.1]]));
    boot.add(weedTube([[0.05, 0.49, -0.1], [0.08, 0.4, -0.14], [0.06, 0.3, -0.13]], 0.014));
    boot.add(drip(0.3, -0.1, 0.05), drip(-0.12, -0.13, -0.06, 0.018));
    boot.position.set(-0.12, -0.2, 0);
    g.add(boot);
    return g;
  }
  if (f.junk === 'bottle' && f.glass) {
    // 🍾 漂流瓶：綠色玻璃瓶、軟木塞、裡面捲起來的紙條（紅繩），外面黏著小藤壺
    const glassM = mat(0x8fcf9a, { transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0.1 });
    const inner = new THREE.Group();
    inner.add(lathe([[0.0, -0.3], [0.15, -0.3], [0.17, -0.26], [0.17, 0.08], [0.15, 0.15], [0.07, 0.24], [0.055, 0.34], [0.06, 0.38], [0.0, 0.38]], glassM, 22));
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.1, 12), mat(0xc79a5a, { roughness: 0.9 }));
    cork.position.y = 0.41;
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 14), mat(0xf3e6c4, { roughness: 0.9 }));
    paper.position.y = -0.06;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.36, 14, 1, true, 0, 1.2), mat(0xe8d7ad, { side: THREE.DoubleSide }));
    roll.position.y = -0.06;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 6, 16), mat(0xc8463c));
    tie.rotation.x = Math.PI / 2;
    tie.position.y = -0.04;
    inner.add(cork, paper, roll, tie);
    for (const [x, y, z] of [[0.15, -0.18, 0.08], [0.12, -0.24, -0.1], [-0.16, 0.0, 0.05]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), mat(0xd8d2c2, { roughness: 0.9 }));
      b.scale.set(1, 0.6, 1);
      b.position.set(x, y, z);
      inner.add(b);
    }
    inner.add(weedTube([[0.12, 0.12, 0.08], [0.2, 0.0, 0.1], [0.19, -0.15, 0.06]], 0.012));
    inner.rotation.z = -Math.PI / 2;
    g.add(inner);
    g.add(drip(-0.05, -0.2, 0.05));
    return g;
  }
  if (f.junk === 'bottle') {
    // 🥤 寶特瓶：一圈一圈的瓶身、壓扁一點、標籤、螺紋瓶蓋、裡面還有一點水
    const pet = mat(f.color, { transparent: true, opacity: 0.42, roughness: 0.06 });
    const prof = [[0.0, -0.3], [0.11, -0.3], [0.13, -0.27]];
    for (let i = 0; i < 6; i++) prof.push([0.135, -0.24 + i * 0.07], [0.122, -0.205 + i * 0.07]);
    prof.push([0.135, 0.18], [0.11, 0.25], [0.055, 0.31], [0.05, 0.35], [0.0, 0.35]);
    const inner = new THREE.Group();
    const body = lathe(prof, pet, 22);
    body.scale.z = 0.88;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.16, 18), mat(0x7ec4e8, { transparent: true, opacity: 0.55, roughness: 0.05 }));
    water.position.y = -0.21;
    water.scale.z = 0.86;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.16, 22, 1, true, 0.3, 4.6), mat(0x4fb06a, { side: THREE.DoubleSide, roughness: 0.6 }));
    label.scale.z = 0.88;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.139, 0.139, 0.03, 22, 1, true, 0.3, 4.6), mat(0xf4f1e6, { side: THREE.DoubleSide }));
    stripe.scale.z = 0.88;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.01, 6, 16), pet);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.33;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 16), mat(0x3a8fd8, { roughness: 0.5 }));
    cap.position.y = 0.39;
    inner.add(body, water, label, stripe, ring, cap);
    for (let i = 0; i < 8; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07, 0.012), mat(0x2f6fb0));
      const a = (i / 8) * Math.PI * 2;
      rib.position.set(Math.cos(a) * 0.063, 0.39, Math.sin(a) * 0.063);
      rib.rotation.y = -a;
      inner.add(rib);
    }
    inner.rotation.z = -Math.PI / 2;
    g.add(inner);
    g.add(drip(-0.1, -0.16, 0.04), drip(0.12, -0.15, -0.03, 0.017));
    return g;
  }

  if (f.junk === 'can') {
    // 🥫 生鏽罐頭：上下捲邊、一圈圈的紋、撕掉一半的標籤、生鏽斑點、蓋子翹開
    const tin = mat(0xb8b8b0, { metalness: 0.7, roughness: 0.42 });
    const can = new THREE.Group();
    can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 22), tin));
    for (const y of [-0.18, 0.18]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 6, 24), tin);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      can.add(rim);
    }
    for (const y of [-0.1, -0.05, 0.05, 0.1]) {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(0.171, 0.004, 4, 24), mat(0x8c8c86, { metalness: 0.6 }));
      groove.rotation.x = Math.PI / 2;
      groove.position.y = y;
      can.add(groove);
    }
    can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.173, 0.173, 0.24, 22, 1, true, 0.8, 3.6), mat(0xd8483a, { side: THREE.DoubleSide, roughness: 0.8 })));
    can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.174, 0.05, 22, 1, true, 0.8, 3.6), mat(0xf2c94a, { side: THREE.DoubleSide })));
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), mat(0xd8483a, { side: THREE.DoubleSide, roughness: 0.8 }));
    flap.position.set(Math.sin(0.8) * 0.2, -0.02, Math.cos(0.8) * 0.2);
    flap.rotation.set(0, 0.8 + 0.6, 0.2);
    can.add(flap);
    for (const [a, y, s] of [[2.2, -0.12, 1], [3.0, 0.08, 0.8], [5.2, -0.05, 1.2], [4.5, 0.13, 0.7], [0.3, -0.14, 0.9]]) {
      const rust = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), mat(0xa0522d, { roughness: 0.95 }));
      rust.scale.set(1, 1, 0.25);
      rust.position.set(Math.cos(a) * 0.168, y, Math.sin(a) * 0.168);
      rust.lookAt(Math.cos(a) * 2, y, Math.sin(a) * 2);
      can.add(rust);
    }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.012, 22), tin);
    lid.geometry.translate(0.155, 0, 0);
    lid.position.set(-0.155, 0.19, 0);
    lid.rotation.z = 0.7;
    can.add(lid);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.155, 22), mat(0x2a2620));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.181;
    can.add(hole);
    can.add(weedTube([[0.15, 0.17, 0.06], [0.22, 0.08, 0.08], [0.21, -0.08, 0.05]], 0.013));
    can.add(drip(0.05, -0.24, 0.05));
    can.rotation.z = 0.35;
    g.add(can);
    return g;
  }

  // ⛵ 船釣限定：🦭 小海豹、🐳 藍鯨寶寶（不是魚的樣子，另外做）
  if (f.shape === 'seal' || f.shape === 'whale') {
    const whale = f.shape === 'whale';
    const skin = mat(f.color, glow);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), skin);
    body.scale.set(1.05, whale ? 0.6 : 0.5, whale ? 0.55 : 0.45);
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), mat(whale ? 0xf2f4fa : 0xe8e2d8));
    belly.scale.set(0.95, 0.38, 0.42);
    belly.position.set(0.05, -0.12, 0);
    g.add(belly);
    // 尾巴：兩片圓圓的
    const tail = new THREE.Group();
    for (const sd of [-1, 1]) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), skin);
      fl.scale.set(0.9, 0.25, 0.7);
      fl.position.set(-0.08, whale ? 0.06 : 0, sd * 0.12);
      fl.rotation.y = sd * 0.5;
      tail.add(fl);
    }
    tail.position.x = -0.55;
    g.add(tail);
    // 小手（前鰭）
    for (const sd of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), skin);
      fin.scale.set(1, 0.3, 0.6);
      fin.position.set(0.1, -0.16, sd * 0.25);
      fin.rotation.x = sd * 0.6;
      g.add(fin);
    }
    // 臉：大眼睛、亮點、腮紅；海豹多鼻子、鬍鬚
    for (const sd of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(0x1c1410, { roughness: 0.2 }));
      eye.position.set(0.4, 0.08, 0.13 * sd);
      g.add(eye);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(0.44, 0.1, 0.15 * sd);
      g.add(shine);
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9fb8 }));
      blush.scale.set(0.5, 0.6, 1);
      blush.position.set(0.38, -0.02, 0.2 * sd);
      g.add(blush);
    }
    if (whale) {
      // 頭頂小噴水
      const wm = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.85 });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.22, 8), wm);
      col.position.set(0.15, 0.4, 0);
      g.add(col);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), wm);
        d.position.set(0.15 + Math.cos(a) * 0.08, 0.52, Math.sin(a) * 0.08);
        g.add(d);
      }
      body.material.emissiveIntensity = 0.35;
    } else {
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x3a2a24));
      nose.position.set(0.52, 0.0, 0);
      g.add(nose);
      const wh = mat(0x6a5a50);
      for (const sd of [-1, 1])
        for (const k of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4), wh);
          w.rotation.z = Math.PI / 2;
          w.rotation.y = sd * (0.4 + k * 0.15);
          w.position.set(0.52, -0.03 + k * 0.02, sd * 0.08);
          g.add(w);
        }
    }
    g.userData.tail = tail;
    return g;
  }

  // 身體（圓圓的橢球）
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), mat(f.color, glow));
  body.scale.set(1, 0.48, 0.3);
  g.add(body);
  // 淺色肚子
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 10),
    mat(new THREE.Color(f.color).lerp(new THREE.Color(0xffffff), 0.55).getHex(), glow),
  );
  belly.scale.set(0.9, 0.3, 0.27);
  belly.position.set(0.02, -0.08, 0);
  g.add(belly);
  // 錦鯉的花紋
  if (f.patch) {
    for (const [x, y, s] of [[0.18, 0.1, 0.17], [-0.15, 0.08, 0.2], [0.0, 0.14, 0.12]]) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), mat(f.patch));
      spot.scale.set(1.2, 0.6, 0.32);
      spot.position.set(x, y, 0);
      g.add(spot);
    }
  }
  // 尾巴（扁扁的三角）
  const finColor = f.fin ?? new THREE.Color(f.color).multiplyScalar(0.85).getHex();
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 4), mat(finColor, glow));
  tail.rotation.z = -Math.PI / 2; // 尖的那頭接身體、寬的那頭在後面（11/07：原本反過來，看起來怪）
  tail.scale.set(1, 1, 0.22);
  tail.position.x = -0.6;
  g.add(tail);
  // 背鰭
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 3), mat(finColor, glow));
  fin.scale.set(1.3, 1, 0.2);
  fin.position.set(0.02, 0.27, 0);
  g.add(fin);
  // 眼睛（小黑點＋反光）
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0x1c1410, { roughness: 0.2 }));
    eye.position.set(0.33, 0.05, 0.135 * side);
    g.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(0.35, 0.07, 0.17 * side);
    g.add(shine);
  }
  // ⛵ 船釣限定的魚：換一下比例和鰭
  if (f.shape === 'shark') {
    fin.scale.set(2.2, 2.6, 0.3); // 高高的背鰭
    fin.position.y = 0.42;
    tail.scale.set(1.6, 1.8, 0.22);
    body.scale.set(1.15, 0.42, 0.3);
  } else if (f.shape === 'mola') {
    body.scale.set(0.8, 0.85, 0.22); // 圓圓扁扁、尾巴很短
    belly.scale.set(0.7, 0.55, 0.2);
    fin.scale.set(1.6, 2.6, 0.2);
    fin.position.set(-0.15, 0.55, 0);
    const anal = fin.clone();
    anal.rotation.z = Math.PI;
    anal.position.set(-0.15, -0.55, 0);
    g.add(anal);
    tail.scale.set(0.5, 1.6, 0.2);
    tail.position.x = -0.42;
  } else if (f.shape === 'ribbon') {
    body.scale.set(2.4, 0.22, 0.12); // 長長的帶子，背上一整排紅鰭
    belly.scale.set(2.2, 0.12, 0.1);
    fin.visible = false;
    const red = mat(finColor, glow);
    for (let k = 0; k < 14; k++) {
      const r = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 3), red);
      r.scale.z = 0.3;
      r.position.set(1.05 - k * 0.16, 0.15, 0);
      g.add(r);
    }
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 3), red);
    crest.position.set(1.0, 0.32, 0);
    crest.rotation.z = -0.4;
    g.add(crest);
    tail.position.x = -1.25;
    tail.scale.set(0.5, 0.5, 0.2);
    g.children.forEach((c) => {
      if (c.geometry?.type === 'SphereGeometry' && c !== body && c !== belly) c.position.x += 0.7; // 眼睛移到頭
    });
  } else if (f.shape === 'mahi') {
    body.scale.set(1.15, 0.5, 0.26); // 額頭方方的
    fin.scale.set(4.5, 0.8, 0.2);
    fin.position.set(-0.05, 0.25, 0);
  }
  // 🐉 傳說之魚：長鬍鬚＋頭上一對小角，發光更強
  if (f.legend) {
    const gold = mat(f.glow ?? 0xffd060, { emissive: f.glow ?? 0xffd060, emissiveIntensity: 0.9 });
    for (const side of [-1, 1]) {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.55, 5), gold);
      whisker.rotation.z = Math.PI / 2 + 0.35;
      whisker.rotation.y = 0.5 * side;
      whisker.position.set(0.55, -0.05, 0.15 * side);
      g.add(whisker);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 6), gold);
      horn.rotation.z = -0.5;
      horn.position.set(0.28, 0.27, 0.06 * side);
      g.add(horn);
    }
    body.material.emissiveIntensity = 0.9;
  }
  // ✨ 異色魚：身邊一圈小亮片
  if (shiny && !f0.junk) {
    const sp = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
    for (const [x, y, z] of [[0.45, 0.32, 0.12], [-0.2, 0.38, -0.1], [0.1, -0.32, 0.14], [-0.5, 0.2, 0.1], [0.62, -0.1, -0.12]]) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), sp);
      star.position.set(x, y, z);
      star.scale.set(0.6, 1.4, 0.6);
      g.add(star);
    }
    g.userData.shiny = true;
  }
  g.userData.tail = tail;
  return g;
}

/** ✨ 異色魚的顏色：有寫 shiny 的照寫的，沒寫的把色相轉半圈、亮一點 */
export function shinyLook(f) {
  if (f.shiny) return f.shiny;
  const rot = (hex) => {
    const c = new THREE.Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    return new THREE.Color().setHSL((hsl.h + 0.5) % 1, Math.min(1, hsl.s + 0.35), Math.min(0.75, Math.max(0.45, hsl.l))).getHex();
  };
  return { color: rot(f.color), ...(f.patch ? { patch: rot(f.patch) } : {}), glow: f.glow ? rot(f.glow) : undefined };
}

/** 依公分數算出模型縮放（比真實略大一點，比較看得清楚） */
// 超過 130 公分的傳說之魚放大得慢一點，不然會把整個畫面擋住
export const fishScale = (cm) => (cm <= 130 ? Math.max(0.18, (cm / 100) * 1.3) : 1.69 + ((cm - 130) / 100) * 0.55);
