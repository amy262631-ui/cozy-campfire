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

  if (f.junk === 'boot') {
    const leather = mat(f.color);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.55, 10), leather);
    leg.position.set(-0.1, 0.12, 0);
    leg.rotation.z = Math.PI / 2;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), leather);
    foot.position.set(0.25, -0.02, 0);
    g.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.32), mat(0x2a2018));
    sole.position.set(0.25, -0.14, 0);
    g.add(sole);
    const weed = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), mat(0x5c8a3a));
    weed.position.set(-0.36, 0.25, 0.05);
    g.add(weed);
    return g;
  }
  if (f.junk === 'bottle') {
    const plastic = mat(f.color, { transparent: true, opacity: 0.6, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 14), plastic);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.16, 12), plastic);
    neck.rotation.z = -Math.PI / 2;
    neck.position.x = 0.38;
    g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 12), mat(0x3a8fd8));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.49;
    g.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.22, 14, 1, true), mat(0x6ec27a, { side: THREE.DoubleSide }));
    label.rotation.z = Math.PI / 2;
    g.add(label);
    return g;
  }

  if (f.junk === 'can') {
    const tin = mat(f.color, { metalness: 0.6, roughness: 0.5 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 14), tin);
    can.rotation.z = Math.PI / 2;
    g.add(can);
    const rust = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.16, 14, 1, true), mat(0xa0522d, { side: THREE.DoubleSide }));
    rust.rotation.z = Math.PI / 2;
    rust.position.x = -0.06;
    g.add(rust);
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
