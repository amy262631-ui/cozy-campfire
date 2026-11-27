import * as THREE from 'three';
import { lowpoly } from './shared.js';
import { isXmas } from '../game/season.js';
import { mergeStatic } from '../scene/mergeStatic.js';

/**
 * 🎄 營火廣場的聖誕造景（作者 11/10、11/12、11/18）：只在聖誕期間（12/1～1/6，season.js）顯示。
 *   地上薄雪、飄雪、四周散布的小聖誕樹（有的掛聖誕襪、樹下禮物盒）、兩個小雪人。
 *   大聖誕樹＝心願大樹變身（wishTree.js），不在這裡。
 * 都是裝飾、沒有碰撞（不會擋路）。
 */
/** 圓圓、邊緣柔柔的雪花貼圖（不然雪會是小方塊） */
let _flakeTex = null;
function flakeTex() {
  if (_flakeTex) return _flakeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  _flakeTex = new THREE.CanvasTexture(c);
  return _flakeTex;
}
/** 燈泡一閃一閃（每顆時間錯開）；bulbs 可以是一顆一顆的 Mesh，或 packBulbs 包好的 */
function blink(bulbs, time) {
  if (bulbs.packed) return bulbs.packed(time);
  for (const b of bulbs) b.visible = Math.sin(time * 2 + b.userData.ph) > -0.5;
}
/**
 * ⚡ 效能（11/27）：一整區的小燈泡改成一個 InstancedMesh（原本每顆燈泡各畫一次，聖誕樹一多手機就卡）。
 *   長相、顏色、閃的節奏都一樣；熄掉的那顆縮成 0。
 */
export function packBulbs(root, bulbs, { speed = 2, th = -0.5 } = {}) {
  if (!bulbs.length) return bulbs;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const im = new THREE.InstancedMesh(bulbs[0].geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs.length);
  im.castShadow = bulbs[0].castShadow;
  const mats = [];
  const phs = [];
  const col = new THREE.Color();
  bulbs.forEach((b, i) => {
    const m = new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld);
    mats.push(m);
    phs.push(b.userData.ph);
    im.setMatrixAt(i, m);
    im.setColorAt(i, col.copy(b.material.color));
    b.parent.remove(b);
  });
  im.computeBoundingSphere();
  root.add(im);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const on = bulbs.map(() => true);
  const out = [];
  out.packed = (time) => {
    let dirty = false;
    for (let i = 0; i < phs.length; i++) {
      const v = Math.sin(time * speed + phs[i]) > th;
      if (v === on[i]) continue;
      on[i] = v;
      im.setMatrixAt(i, v ? mats[i] : zero);
      dirty = true;
    }
    if (dirty) im.instanceMatrix.needsUpdate = true;
  };
  return out;
}
const BULB_COLS = [0xffd27a, 0xff7a7a, 0x9fe39f, 0xffd27a, 0x8ac4ff];
let _bulbGeo = null;
/** 🎄 小聖誕樹（約一個人高）：三層樹葉、枝頭一點雪、彩色小燈、頂端星星；可選聖誕襪、樹下禮物盒 */
export function xmasTree(s = 1, ph = 0, { sock = false, gifts = false } = {}) {
  _bulbGeo ??= new THREE.SphereGeometry(0.05, 8, 6);
  const g = new THREE.Group();
  const bulbs = [];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), lowpoly(0x5b3d26));
  trunk.position.y = 0.17;
  g.add(trunk);
  const leaf = lowpoly(0x2f6b3f);
  const snow = lowpoly(0xf3f7ff);
  [[0.62, 0.7, 0.55], [0.48, 0.6, 0.95], [0.32, 0.5, 1.3]].forEach(([r, h, y], k) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), leaf);
    c.position.y = y;
    g.add(c);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.3, 8), snow);
    cap.position.y = y + h * 0.36;
    g.add(cap);
    const n = 7 - k * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k;
      const b = new THREE.Mesh(_bulbGeo, new THREE.MeshBasicMaterial({ color: BULB_COLS[(i + k) % BULB_COLS.length] }));
      b.position.set(Math.sin(a) * r * 0.85, y - h * 0.32, Math.cos(a) * r * 0.85);
      b.userData.ph = ph + i * 1.3 + k;
      g.add(b);
      bulbs.push(b);
    }
  });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  star.position.y = 1.62;
  g.add(star);
  if (sock) {
    const red = lowpoly(0xc9483c);
    const sk = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.07), red);
    leg.position.y = -0.1;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.07), red);
    foot.position.set(0.03, -0.2, 0);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.09), lowpoly(0xf6f2ea));
    sk.add(leg, foot, cuff);
    sk.position.set(0, 0.62, 0.5);
    g.add(sk);
  }
  if (gifts) {
    for (const [x, z, w, c] of [[0.42, 0.3, 0.22, 0xd8433a], [-0.38, 0.36, 0.18, 0x3f8a5a], [0.1, 0.55, 0.16, 0xe8c25a]]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.85, w), lowpoly(c));
      box.position.set(x, w * 0.42, z);
      box.rotation.y = x * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, w * 0.87, w * 0.2), lowpoly(0xf6f2ea));
      rib.position.copy(box.position);
      rib.rotation.y = box.rotation.y;
      g.add(box, rib);
    }
  }
  g.scale.setScalar(s);
  g.traverse((o) => o.isMesh && !o.material.isMeshBasicMaterial && (o.castShadow = true));
  return { group: g, bulbs };
}

/**
 * 🎄 湖畔碼頭、迷霧森林的聖誕裝飾（作者 11/18）：聖誕期間（isXmas）才出現，自己每分鐘看一次日期。
 *   trees：小聖誕樹的位置 [{x,z,s}]
 *   glowTrees：大樹 [{x,z,s}]（迷霧森林的錐形樹）→ 樹枝下掛暖黃小燈球、樹幹綁紅緞帶
 *   strings：燈串 [{x0,z0,x1,z1,y,n}]（直的一條，例如碼頭兩邊）
 *   y(x,z)：地面高度
 */
export function buildXmasExtras({ trees = [], glowTrees = [], strings = [], y = () => 0 } = {}) {
  const g = new THREE.Group();
  const bulbs = [];
  const glows = [];
  trees.forEach((p, i) => {
    const tr = xmasTree(p.s ?? 1, i * 2.1, { gifts: i % 2 === 1 });
    tr.group.position.set(p.x, y(p.x, p.z), p.z);
    tr.group.rotation.y = i * 1.9;
    g.add(tr.group);
    bulbs.push(...tr.bulbs);
  });
  const glowGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const haloGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd896 });
  const ribbon = lowpoly(0xc9483c);
  glowTrees.forEach((tr, i) => {
    const s = tr.s;
    const n = 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i * 0.9;
      const r = 1.25 * s;
      const yy = 2.35 * s - (k % 2) * 0.25;
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 3), new THREE.MeshBasicMaterial({ color: 0x8a7a60 }));
      thread.position.set(tr.x + Math.sin(a) * r, yy + 0.18, tr.z + Math.cos(a) * r);
      const ball = new THREE.Mesh(glowGeo, glowMat);
      ball.position.set(tr.x + Math.sin(a) * r, yy, tr.z + Math.cos(a) * r);
      const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0xffd896, transparent: true, opacity: 0.25, depthWrite: false }));
      halo.position.copy(ball.position);
      halo.userData.ph = i * 1.7 + k;
      g.add(thread, ball, halo);
      glows.push(halo);
    }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.31 * s, 0.14, 8, 1, true), ribbon);
    band.position.set(tr.x, 1.1 * s, tr.z);
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), ribbon);
    bow.scale.set(1.6, 1, 0.6);
    const a = Math.atan2(-tr.x, -tr.z);
    bow.position.set(tr.x + Math.sin(a) * 0.31 * s, 1.1 * s, tr.z + Math.cos(a) * 0.31 * s);
    bow.rotation.y = a;
    g.add(band, bow);
  });
  _bulbGeo ??= new THREE.SphereGeometry(0.05, 8, 6);
  strings.forEach((l, j) => {
    for (let i = 0; i <= l.n; i++) {
      const f = i / l.n;
      const b = new THREE.Mesh(_bulbGeo, new THREE.MeshBasicMaterial({ color: BULB_COLS[(i + j) % BULB_COLS.length] }));
      b.position.set(l.x0 + (l.x1 - l.x0) * f, l.y - Math.abs(Math.sin(f * l.n * 0.5 * Math.PI)) * 0.06, l.z0 + (l.z1 - l.z0) * f);
      b.userData.ph = i * 1.1 + j;
      g.add(b);
      bulbs.push(b);
    }
  });
  const packed = packBulbs(g, bulbs);
  mergeStatic(g, (o) => glows.includes(o), { keepShadow: true });
  let on = isXmas();
  g.visible = on;
  let check = 0;
  return {
    group: g,
    update(dt, time) {
      check -= dt;
      if (check < 0) {
        check = 60;
        on = isXmas();
        g.visible = on;
      }
      if (!on) return;
      blink(packed, time);
      for (const h of glows) h.material.opacity = 0.18 + 0.12 * Math.sin(time * 1.2 + h.userData.ph);
    },
  };
}

export function buildXmasDecor(spots = []) {
  const g = new THREE.Group();
  const rnd = (() => {
    let s = 1225;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();

  // ❄️ 地上一片一片的薄雪
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf3f7ff, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 4.5 + rnd() * 24;
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rnd() * 1.4, 9), snowMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd() * 6;
    m.scale.set(1, 0.55 + rnd() * 0.6, 1);
    m.position.set(Math.sin(a) * r, 0.02 + i * 0.0004, Math.cos(a) * r);
    g.add(m);
  }

  // 🎄 作者 11/18：拿掉營火旁那一圈木樁燈串（像圍欄、有壓迫感）→ 廣場四周散布小聖誕樹（spots 由房間挑空地）
  const bulbs = [];
  spots.forEach((p, i) => {
    const tr = xmasTree(p.s ?? 1, i * 1.7, { sock: i % 3 === 1, gifts: i % 2 === 0 });
    tr.group.position.set(p.x, 0, p.z);
    tr.group.rotation.y = rnd() * 6;
    g.add(tr.group);
    bulbs.push(...tr.bulbs);
  });

  // ⛄ 兩個小雪人
  const white = lowpoly(0xf6f9ff);
  const coal = lowpoly(0x2a2a2a);
  const carrot = lowpoly(0xf08a3c);
  for (const [x, z, ry, sc] of [[-6.5, 4.5, 2.4, 1], [3.2, -7.2, -0.5, 0.8]]) {
    const s = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), white);
    b1.position.y = 0.42;
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), white);
    b2.position.y = 1.02;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.04, 0.33);
    s.add(b1, b2, nose);
    for (const ex of [-0.1, 0.1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), coal);
      e.position.set(ex, 1.13, 0.28);
      s.add(e);
    }
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 14), lowpoly(0xd8433a));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.78;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), lowpoly(0xd8433a));
    hat.position.y = 1.42;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), white);
    pom.position.y = 1.64;
    s.add(scarf, hat, pom);
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    s.scale.setScalar(sc);
    g.add(s);
  }

  // 🌨️ 飄雪（跟著鏡頭的一小團，看起來整個營地都在下雪）
  const FLAKES = 500;
  const pos = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES; i++) {
    pos[i * 3] = (rnd() - 0.5) * 30;
    pos[i * 3 + 1] = rnd() * 12;
    pos[i * 3 + 2] = (rnd() - 0.5) * 30;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, map: flakeTex(), transparent: true, opacity: 0.9, depthWrite: false }));
  flakes.frustumCulled = false;
  g.add(flakes);

  g.traverse((o) => {
    if (o.isMesh && o.material !== snowMat && !o.material.isMeshBasicMaterial) o.castShadow = true;
  });
  const packed = packBulbs(g, bulbs);
  mergeStatic(g, undefined, { keepShadow: true });

  return {
    group: g,
    /** center：跟著誰下雪（鏡頭或玩家的位置） */
    update(dt, time, center) {
      blink(packed, time);
      const a = geo.attributes.position;
      for (let i = 0; i < FLAKES; i++) {
        let y = a.getY(i) - dt * (0.6 + (i % 5) * 0.12);
        if (y < 0) y += 12;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(time * 0.7 + i) * dt * 0.15);
      }
      a.needsUpdate = true;
      if (center) flakes.position.set(center.x, 0, center.z);
    },
  };
}

/**
 * 🌨️ 只有飄雪（作者 11/16：營地也要飄雪）：帳篷營地、湖畔、迷霧森林用。
 * 聖誕期間（isXmas）才看得到；跟著鏡頭的一小團，看起來整個地方都在下雪。
 */
export function buildSnowfall() {
  const FLAKES = 450;
  const pos = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = Math.random() * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, map: flakeTex(), transparent: true, opacity: 0.9, depthWrite: false }));
  flakes.frustumCulled = false;
  let on = isXmas();
  flakes.visible = on;
  let check = 0;
  return {
    obj: flakes,
    update(dt, time, center) {
      check -= dt;
      if (check < 0) {
        check = 60; // 每分鐘看一次日期（12/1、1/7 不用重新整理也會換）
        on = isXmas();
        flakes.visible = on;
      }
      if (!on) return;
      const a = geo.attributes.position;
      for (let i = 0; i < FLAKES; i++) {
        let y = a.getY(i) - dt * (0.6 + (i % 5) * 0.12);
        if (y < 0) y += 12;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(time * 0.7 + i) * dt * 0.15);
      }
      a.needsUpdate = true;
      if (center) flakes.position.set(center.x, 0, center.z);
    },
  };
}
