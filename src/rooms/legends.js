/**
 * 🌟 森林傳說（作者 11/19）：很少很少才會在背景經過的大大守護神（原創、可愛版）。
 *   🐢 苔蘚大龜爺爺：迷霧森林深處慢慢爬過去
 *   🐋 霧中雲鯨：湖面浮起、噴發光水花，再游到天上（之後船上也會游到船邊）
 * 模型都用 1 公尺左右的比例做，放到場景時再放大。
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });

/** 圓圓的大眼睛＋亮點＋腮紅（臉朝 +Z） */
function cuteFace(g, { x = 0.12, y = 0, z = 0, r = 0.05, blush = 0xff9fb0 } = {}) {
  const eyeM = glow(0x1a1410);
  const hiM = glow(0xffffff);
  const blushM = glow(blush, { transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), eyeM);
    eye.position.set(s * x, y, z);
    eye.scale.set(1, 1.15, 0.6);
    g.add(eye);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 10, 8), hiM);
    hi.position.set(s * x + r * 0.3, y + r * 0.35, z + r * 0.45);
    g.add(hi);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 16), blushM);
    bl.position.set(s * (x + r * 0.7), y - r * 1.4, z - r * 0.1);
    bl.lookAt(bl.position.clone().add(new THREE.Vector3(s * 0.4, 0, 1)));
    g.add(bl);
  }
}

/**
 * 🐢 森林大龜（作者 11/19：要更可愛 → 5 款讓作者挑）
 *   v：'cloud' 棉花糖雲朵殼、'mush' 紅點蘑菇殼、'house' 背著發光小木屋、'flower' 花圈薰衣草、'star' 星空殼＋月亮（瞇瞇眼）
 */
export const TORTOISE_LOOKS = ['cloud', 'mush', 'house', 'flower', 'star'];
export function buildMossTortoise(v = 'cloud') {
  const g = new THREE.Group();
  const L = {
    cloud: { shell: 0xf6f2ff, plate: 0xe6e0fa, rim: 0xbfd8ff, skin: 0xffd6de, emis: 0x6a3a44 },
    mush: { shell: 0xe8524a, plate: 0xfff6ea, rim: 0xf6e6cc, skin: 0xfff0d8, emis: 0x5a4a30 },
    house: { shell: 0x8fcf9a, plate: 0x74b884, rim: 0xf4ecd8, skin: 0xffe6b8, emis: 0x5a4a30 },
    flower: { shell: 0xc8b4f0, plate: 0xb49ce6, rim: 0xfff0f6, skin: 0xd8f2e0, emis: 0x2a4a3a },
    star: { shell: 0x34407a, plate: 0x4a58a0, rim: 0xf6e6b0, skin: 0xfff2c0, emis: 0x6a5a20 },
  }[v] ?? {};
  const shellM = std(L.shell, v === 'star' ? { emissive: 0x1a2050, emissiveIntensity: 0.6 } : {});
  const plateM = std(L.plate, { emissive: L.plate, emissiveIntensity: v === 'mush' ? 0.35 : 0 });
  const rimM = std(L.rim);
  const skinM = std(L.skin, { emissive: L.emis, emissiveIntensity: 0.5 }); // 晚上也看得清楚臉
  const glowM = glow(0xffd98a);
  const H0 = 0.4;
  // 圓滾滾的殼
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  shell.scale.set(1, 1.05, 1.05);
  shell.position.y = H0;
  g.add(shell);
  const top = H0 + 0.9 * 1.05;
  const onShell = (a, r) => {
    const y = H0 + 0.9 * 1.05 * Math.sqrt(Math.max(0, 1 - (r / 0.9) ** 2));
    return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 1.05);
  };
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 12, 48), rimM);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1.05, 1);
  rim.position.y = H0;
  g.add(rim);
  const extra = [];
  if (v === 'cloud') {
    // 一球一球的棉花糖雲
    for (let i = 0; i < 16; i++) {
      const p = onShell(i * 2.39, 0.15 + (i % 5) * 0.15);
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.2 + (i % 3) * 0.05, 14, 10), std(0xffffff));
      c.position.copy(p);
      g.add(c);
    }
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.03, 6, 12), std(0xffa8c0));
    extra.push(['bow', bow]);
  } else if (v === 'mush') {
    // 白色圓點
    for (let i = 0; i < 9; i++) {
      const p = onShell(i * 2.39 + 0.3, 0.2 + (i % 4) * 0.17);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (i % 2) * 0.04, 14, 8), plateM);
      d.position.copy(p);
      d.scale.y = 0.4;
      d.lookAt(p.clone().multiplyScalar(2).setY(4));
      g.add(d);
    }
    for (const [a, c] of [
      [0.8, 0xffb070],
      [2.6, 0xff8a7a],
    ]) {
      const p = onShell(a, 0.62);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow(c));
      cap.position.copy(p).add(new THREE.Vector3(0, 0.1, 0));
      g.add(cap);
    }
  } else if (v === 'house') {
    // 背著一間小木屋，窗戶會亮
    const hs = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.5), std(0xd8a878));
    wall.position.y = 0.21;
    hs.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.34, 4), std(0xd2524a));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.58;
    hs.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), glowM);
    win.position.set(0, 0.24, 0.252);
    hs.add(win);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), std(0x8a6040));
    chim.position.set(0.15, 0.68, -0.1);
    hs.add(chim);
    hs.position.set(0, top - 0.08, -0.05);
    g.add(hs);
    for (let i = 0; i < 6; i++) {
      const p = onShell(i * 1.05, 0.55);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), std(0x6aa85a));
      m.position.copy(p);
      m.scale.y = 0.55;
      g.add(m);
    }
  } else if (v === 'flower') {
    // 殼上花瓣花紋＋頭上花圈
    for (let i = 0; i < 6; i++) {
      const p = onShell((i / 6) * Math.PI * 2, 0.5);
      const pl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8), plateM);
      pl.position.copy(p);
      pl.lookAt(p.clone().multiplyScalar(2).setY(4));
      pl.scale.z = 0.25;
      g.add(pl);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8), std(0xfff2a0));
    center.position.y = top;
    center.scale.y = 0.4;
    g.add(center);
    extra.push(['crown', null]);
  } else if (v === 'star') {
    // 星空殼：發光小星星＋背上一彎月亮
    for (let i = 0; i < 18; i++) {
      const p = onShell(i * 2.39, 0.12 + (i % 6) * 0.13);
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.035 + (i % 3) * 0.015, 0), glow(0xfff2b0));
      st.position.copy(p).multiplyScalar(1.01);
      g.add(st);
    }
    // 標準的彎月（作者 11/19）：大圓扣掉往右偏的同樣大的圓，再做出一點厚度
    const R = 0.26;
    const d = 0.15;
    const hy = Math.sqrt(R * R - (d / 2) ** 2);
    const a1 = Math.atan2(hy, d / 2);
    const cres = new THREE.Shape();
    cres.absarc(0, 0, R, a1, Math.PI * 2 - a1, false);
    cres.absarc(d, 0, R, Math.atan2(-hy, -d / 2) + Math.PI * 2, Math.atan2(hy, -d / 2), true);
    const mg = new THREE.ExtrudeGeometry(cres, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3, curveSegments: 32 });
    mg.center();
    const moon = new THREE.Mesh(mg, glow(0xffe28a));
    moon.position.set(0, top + 0.32, -0.05);
    g.add(moon);
    // 月亮一直面向鏡頭（大龜側身走過去也看得到彎月的形狀）
    const pq = new THREE.Quaternion();
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.35);
    moon.onBeforeRender = (_r, _s, cam) => {
      moon.parent.getWorldQuaternion(pq);
      moon.quaternion.copy(pq.invert().multiply(cam.quaternion).multiply(tilt));
    };
  }
  // 大大的頭（稍微歪一點點）
  const head = new THREE.Group();
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.48, 26, 20), skinM);
  hm.scale.set(1.05, 0.95, 1);
  head.add(hm);
  if (v === 'star') {
    // 瞇瞇眼 ^ ^
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 14, Math.PI), glow(0x2a1a14));
      e.position.set(sx * 0.17, 0.05, 0.43);
      head.add(e);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), glow(0xff8fa8, { transparent: true, opacity: 0.6 }));
      bl.position.set(sx * 0.26, -0.06, 0.4);
      bl.lookAt(bl.position.clone().add(new THREE.Vector3(sx * 0.4, 0, 1)));
      head.add(bl);
    }
  } else cuteFace(head, { x: 0.17, y: 0.05, z: 0.41, r: 0.09, blush: 0xff8fa8 });
  // 小小的 ω 嘴
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 10, Math.PI), glow(0x5a3a2a));
    m.rotation.z = Math.PI;
    m.position.set(sx * 0.034, -0.08, 0.47);
    head.add(m);
  }
  for (const [kind, obj] of extra) {
    if (kind === 'bow') {
      for (const sx of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std(0xffa8c0));
        b.scale.set(1.2, 0.8, 0.5);
        b.position.set(0.18 + sx * 0.1, 0.43, 0.13);
        head.add(b);
      }
      obj?.position.set(0.18, 0.43, 0.16);
      if (obj) head.add(obj);
    }
    if (kind === 'crown') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), std([0xffb0c8, 0xfff2a0, 0xffffff][i % 3]));
        f.position.set(Math.sin(a) * 0.27, 0.4, Math.cos(a) * 0.24);
        head.add(f);
      }
    }
  }
  head.position.set(0, 0.6, 1.2);
  head.rotation.z = 0.08;
  g.add(head);
  // 短短圓圓的腳＋小尾巴
  const legs = [];
  for (const [x, z] of [
    [0.55, 0.5],
    [-0.55, 0.5],
    [0.55, -0.5],
    [-0.55, -0.5],
  ]) {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), skinM);
    leg.scale.set(1, 0.9, 1.1);
    leg.position.set(x, 0.18, z);
    g.add(leg);
    legs.push(leg);
  }
  const tailM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinM);
  tailM.position.set(0, 0.3, -1.0);
  g.add(tailM);
  // ⚡ 11/20：不加真的燈光（傳說出現時手機會頓一下），靠會發亮的顏色就好
  g.userData.tick = (t) => {
    legs.forEach((l, i) => (l.position.y = 0.18 + Math.max(0, Math.sin(t * 1.4 + (i % 2) * Math.PI)) * 0.07));
    head.rotation.x = Math.sin(t * 0.7) * 0.06;
    head.rotation.y = Math.sin(t * 0.35) * 0.18;
    head.position.y = 0.6 + Math.sin(t * 1.4) * 0.03;
  };
  return g;
}

/** 🐋 霧中雲鯨：半透明淡藍、身上星星點點，會發光 */
export function buildCloudWhale() {
  const g = new THREE.Group();
  const bodyM = std(0xbfe2ff, { transparent: true, opacity: 0.82, emissive: 0x4a7ab0, emissiveIntensity: 0.45, roughness: 0.5 });
  const bellyM = std(0xf2f8ff, { transparent: true, opacity: 0.9, emissive: 0x8ab0d8, emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), bodyM);
  body.scale.set(0.75, 0.62, 1.35);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), bellyM);
  belly.scale.set(0.72, 0.6, 1.28);
  belly.position.y = -0.02;
  g.add(belly);
  // 尾巴：往後變細＋兩片尾鰭
  const tail = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 16), bodyM);
  stem.rotation.x = -Math.PI / 2;
  stem.position.z = -0.45;
  tail.add(stem);
  for (const s of [-1, 1]) {
    const fluke = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), bodyM);
    fluke.scale.set(1, 0.12, 0.5);
    fluke.position.set(s * 0.32, 0.05, -0.95);
    fluke.rotation.y = s * 0.5;
    tail.add(fluke);
  }
  tail.position.z = -1.05;
  g.add(tail);
  // 胸鰭
  const fins = [];
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), bodyM);
    fin.scale.set(1, 0.12, 0.45);
    fin.position.set(s * 0.75, -0.25, 0.25);
    fin.rotation.z = s * -0.5;
    g.add(fin);
    fins.push(fin);
  }
  // 臉
  const face = new THREE.Group();
  cuteFace(face, { x: 0.42, y: 0.05, z: 0, r: 0.07 });
  face.position.set(0, 0, 1.0);
  face.children.forEach((c) => {
    // 眼睛貼在兩側臉頰上
    c.position.z += -Math.abs(c.position.x) * 0.55;
  });
  g.add(face);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 14, Math.PI), glow(0x3a4a6a));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.12, 1.3);
  g.add(smile);
  // 身上的星星點點
  const starM = glow(0xfff6c8);
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39;
    const v = ((i * 0.37) % 1) * 1.6 - 0.8;
    const p = new THREE.Vector3(Math.sin(a) * 0.76, Math.cos(a) * 0.62 * 0.9, v * 1.2);
    if (p.y < -0.1) continue;
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.022 + (i % 3) * 0.008, 6, 6), starM);
    st.position.copy(p);
    g.add(st);
  }
  // 頭頂噴出來的發光水花
  const spout = new THREE.Group();
  const dropM = glow(0xbff0ff, { transparent: true, opacity: 0.85 });
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), dropM);
    d.userData.ph = i / 14;
    d.userData.a = i * 2.4;
    spout.add(d);
    drops.push(d);
  }
  spout.position.set(0, 0.6, 0.45);
  g.add(spout);
  // ⚡ 11/20：不加真的燈光（出現時手機會頓一下）
  g.userData.tick = (t) => {
    tail.rotation.x = Math.sin(t * 1.3) * 0.25;
    fins.forEach((f, i) => (f.rotation.x = Math.sin(t * 1.3 + i) * 0.3));
    g.position.y = (g.userData.baseY ?? 0) + Math.sin(t * 0.8) * 0.08;
    for (const d of drops) {
      const f = (t * 0.6 + d.userData.ph) % 1;
      d.position.set(Math.sin(d.userData.a) * f * 0.35, f * 0.9 - f * f * 0.5, Math.cos(d.userData.a) * f * 0.35);
      d.scale.setScalar(1 - f * 0.6);
    }
  };
  return g;
}

/** 🎅 聖誕老人雪橇（作者 11/19：聖誕期間出沒）：圓滾滾的聖誕老人＋禮物袋＋兩隻小馴鹿（帶頭的紅鼻子會亮） */
export function buildSantaSleigh() {
  const g = new THREE.Group();
  const red = std(0xd23a32);
  const gold = std(0xf2c14e, { emissive: 0x6a4a10, emissiveIntensity: 0.4 });
  const white = std(0xfaf6ee);
  // 雪橇：彎彎的車身＋兩條金色滑板
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 1.0), red);
  box.position.set(0, 0.35, 0);
  g.add(box);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.12), red);
  back.position.set(0, 0.7, -0.48);
  back.rotation.x = -0.25;
  g.add(back);
  const front = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 16, Math.PI), red);
  front.rotation.y = Math.PI / 2;
  front.position.set(0, 0.55, 0.5);
  g.add(front);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 24, Math.PI * 0.8), gold);
    rail.rotation.y = Math.PI / 2;
    rail.rotation.z = Math.PI * 1.1;
    rail.position.set(s * 0.3, 0.55, 0.05);
    g.add(rail);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 1.0), gold);
    trim.position.set(s * 0.36, 0.52, 0);
    g.add(trim);
  }
  // 聖誕老人
  const santa = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), red);
  bodyM.scale.set(1, 1.05, 0.95);
  santa.add(bodyM);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 24), std(0x2a1a14));
  belt.rotation.x = Math.PI / 2;
  santa.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(0xf7d2b8));
  head.position.y = 0.36;
  santa.add(head);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), white);
  beard.scale.set(1, 0.9, 0.7);
  beard.position.set(0, 0.27, 0.08);
  santa.add(beard);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 14), red);
  hat.position.set(0, 0.58, -0.02);
  hat.rotation.x = -0.35;
  santa.add(hat);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 18), white);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 0.47;
  santa.add(brim);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), white);
  pom.position.set(0, 0.7, -0.14);
  santa.add(pom);
  const sface = new THREE.Group();
  cuteFace(sface, { x: 0.06, y: 0.4, z: 0.15, r: 0.025 });
  santa.add(sface);
  santa.position.set(0, 0.75, -0.05);
  g.add(santa);
  // 禮物袋
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), std(0x8a5a32));
  sack.scale.set(1, 1.2, 1);
  sack.position.set(0, 0.75, -0.42);
  g.add(sack);
  for (const [x, c] of [
    [-0.12, 0x5fae4a],
    [0.1, 0x4a74b5],
  ]) {
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), std(c));
    box2.position.set(x, 1.0, -0.45);
    box2.rotation.y = x * 4;
    g.add(box2);
  }
  // 小馴鹿兩隻（前面那隻紅鼻子會亮）
  const deerM = std(0xa8754a);
  const deers = [];
  for (let i = 0; i < 2; i++) {
    const d = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 6, 12), deerM);
    b.rotation.x = Math.PI / 2;
    d.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), deerM);
    h.position.set(0, 0.17, 0.24);
    d.add(h);
    cuteFace(h, { x: 0.05, y: 0.02, z: 0.09, r: 0.02 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), i === 1 ? glow(0xff3a3a) : std(0x2a1a14));
    nose.position.set(0, 0.15, 0.35);
    d.add(nose);
    for (const s of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.16, 5), std(0x6b4a2e));
      ant.position.set(s * 0.06, 0.32, 0.2);
      ant.rotation.z = s * -0.4;
      d.add(ant);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.08, 5), std(0x6b4a2e));
      tip.position.set(s * 0.1, 0.36, 0.22);
      tip.rotation.z = s * 0.6;
      d.add(tip);
    }
    const legs = [];
    for (const [x, z] of [
      [0.07, 0.12],
      [-0.07, 0.12],
      [0.07, -0.12],
      [-0.07, -0.12],
    ]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 5), deerM);
      l.position.set(x, -0.15, z);
      d.add(l);
      legs.push(l);
    }
    d.userData.legs = legs;
    d.position.set(0, 0.5, 1.0 + i * 0.75);
    g.add(d);
    deers.push(d);
  }
  if (deers[1]) {
  }
  // 韁繩
  const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), gold);
  rein.rotation.x = Math.PI / 2;
  rein.position.set(0, 0.6, 1.0);
  g.add(rein);
  // 後面亮晶晶的尾巴
  const trail = [];
  const sparkM = glow(0xfff2b0, { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), sparkM.clone());
    s.userData.ph = i / 24;
    g.add(s);
    trail.push(s);
  }
  g.userData.tick = (t) => {
    deers.forEach((d, i) => {
      d.position.y = 0.5 + Math.sin(t * 6 + i) * 0.05;
      d.userData.legs.forEach((l, k) => (l.rotation.x = Math.sin(t * 8 + k * 1.6 + i) * 0.5));
    });
    santa.rotation.z = Math.sin(t * 2) * 0.05;
    for (const s of trail) {
      const f = (t * 0.5 + s.userData.ph) % 1;
      s.position.set(Math.sin(s.userData.ph * 40) * 0.25 * f, 0.3 + Math.sin(f * 6 + s.userData.ph * 9) * 0.15, -0.7 - f * 3.2);
      s.material.opacity = 0.9 * (1 - f);
      s.rotation.y = t * 3;
    }
  };
  return g;
}
