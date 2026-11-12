import * as THREE from 'three';

/**
 * ✨ 小精靈：飄在肩膀旁邊的可愛小精靈（作者 11/10：不要動物，玩家自己就是動物）
 *   type：light 小光點（大家一開始）、drop 💧 水滴、flame 🔥 火苗、leaf 🍃 葉子、cloud ☁️ 雲朵、star ⭐ 星星、mush 🍄 蘑菇
 *   stage：0 小光點、1 小精靈、2 長大（多了小翅膀和光環）
 *   face：happy 開心、sleepy 想睡、hungry 肚子餓、wow 驚訝、love 愛心、shy 害羞
 * 臉是一張一直對著鏡頭的小貼圖（畫在畫布上），所以從哪個角度看都看得到表情。
 */
export const SPIRIT_TYPES = [
  { id: 'drop', icon: '💧', zh: '水滴', color: 0x8fd3ff, glow: 0xc8ecff },
  { id: 'flame', icon: '🔥', zh: '火苗', color: 0xffa14f, glow: 0xffd28a },
  { id: 'leaf', icon: '🍃', zh: '葉子', color: 0x9ad97a, glow: 0xd8f5c4 },
  { id: 'cloud', icon: '☁️', zh: '雲朵', color: 0xf6f4ff, glow: 0xffffff },
  { id: 'star', icon: '⭐', zh: '星星', color: 0xffe07a, glow: 0xfff3c0 },
  { id: 'mush', icon: '🍄', zh: '蘑菇', color: 0xff8fbf, glow: 0xffd6e8 },
];
export const SPIRIT_BY_ID = Object.fromEntries(SPIRIT_TYPES.map((s) => [s.id, s]));
/** 作者 11/11 挑好的樣子：水滴 B、火苗 B、葉子 A、雲朵 A、星星 C、蘑菇 B（改粉紅色） */
export const SPIRIT_LOOK = { drop: 1, flame: 1, leaf: 0, cloud: 0, star: 2, mush: 1 };
export const SPIRIT_FACES = ['happy', 'sleepy', 'hungry', 'wow', 'love', 'shy'];

const cache = new Map();
const _c = new THREE.Vector3();
const once = (k, make) => {
  if (!cache.has(k)) cache.set(k, make());
  return cache.get(k);
};
const soft = (color, extra) => once(`s${color}|${JSON.stringify(extra ?? {})}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: 0.35, ...extra }));
const glowTex = () =>
  once('glowTex', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

/** 畫一張臉（透明底）：眼睛、腮紅、嘴巴 */
function faceTex(face) {
  return once(`face-${face}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const ink = '#3a2a2a';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // 腮紅
    const blush = face === 'shy' ? 'rgba(255,110,140,0.85)' : 'rgba(255,130,150,0.55)';
    g.fillStyle = blush;
    for (const x of [30, 98]) {
      g.beginPath();
      g.ellipse(x, 78, face === 'shy' ? 15 : 12, face === 'shy' ? 9 : 7, 0, 0, Math.PI * 2);
      g.fill();
    }
    const eye = (x, y, r = 9) => {
      g.fillStyle = ink;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x - r * 0.35, y - r * 0.4, r * 0.38, 0, Math.PI * 2);
      g.fill();
    };
    const arcEye = (x, y, up = true) => {
      g.strokeStyle = ink;
      g.lineWidth = 6;
      g.beginPath();
      if (up) g.arc(x, y + 5, 9, Math.PI * 1.1, Math.PI * 1.9);
      else g.arc(x, y - 4, 9, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    };
    const heart = (x, y, s) => {
      g.fillStyle = '#ff5f86';
      g.beginPath();
      g.moveTo(x, y + s * 0.9);
      g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.35);
      g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
      g.fill();
    };
    g.strokeStyle = ink;
    g.lineWidth = 5;
    switch (face) {
      case 'sleepy':
        g.lineWidth = 5;
        for (const x of [42, 86]) {
          g.beginPath();
          g.moveTo(x - 9, 60);
          g.lineTo(x + 9, 60);
          g.stroke();
        }
        g.beginPath();
        g.arc(64, 82, 5, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'hungry':
        eye(42, 58, 8);
        eye(86, 58, 8);
        g.fillStyle = ink;
        g.beginPath();
        g.ellipse(64, 84, 9, 11, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ff8fa3';
        g.beginPath();
        g.ellipse(64, 89, 6, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(140,200,255,0.9)'; // 一滴口水
        g.beginPath();
        g.ellipse(76, 94, 3, 5, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case 'wow':
        eye(42, 58, 11);
        eye(86, 58, 11);
        g.fillStyle = ink;
        g.beginPath();
        g.ellipse(64, 86, 6, 7, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case 'love':
        heart(42, 60, 11);
        heart(86, 60, 11);
        g.beginPath();
        g.arc(64, 78, 9, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
        break;
      case 'shy':
        arcEye(42, 60, false);
        arcEye(86, 60, false);
        g.beginPath();
        g.moveTo(58, 84);
        g.quadraticCurveTo(61, 80, 64, 84);
        g.quadraticCurveTo(67, 88, 70, 84);
        g.stroke();
        break;
      default:
        // 開心：^ ^ 眼睛＋大大的笑
        arcEye(42, 60, true);
        arcEye(86, 60, true);
        g.beginPath();
        g.arc(64, 76, 10, Math.PI * 0.12, Math.PI * 0.88);
        g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/**
 * 做一隻小精靈。回傳 Group；userData：{ body, face, setFace(face), update(dt, time) }
 */
export function buildSpirit(type = 'light', stage = 0, face = 'happy', variant = SPIRIT_LOOK[type] ?? 0, acc = null) {
  const g = new THREE.Group();
  const T = SPIRIT_BY_ID[type] ?? { color: 0xfff1b8, glow: 0xfff6d0 };
  const body = new THREE.Group();
  g.add(body);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // 光暈：每一種都有，小光點最亮
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: T.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: stage === 0 ? 0.95 : 0.55 }));
  halo.scale.setScalar(stage === 0 ? 0.42 : 0.55 + stage * 0.08);
  g.add(halo);
  const R = stage === 0 ? 0.075 : stage === 1 ? 0.12 : 0.15;
  const mat = soft(T.color, type === 'light' || stage === 0 ? { emissiveIntensity: 0.9 } : undefined);
  // 形狀：每一種有 3 款（v = 0/1/2），回傳臉的高度、頭頂高度（光環放這裡）
  let faceY = 0;
  let top = R * 1.2;
  const v = variant;
  const grad = (lo, hi, emi) => once(`grad${lo}${hi}`, () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: emi, emissiveIntensity: 0.3 }));
  const tint = (geo, y0, y1, lo, hi) => {
    const pos = geo.attributes.position, col = [], c = new THREE.Color(), a = new THREE.Color(lo), b = new THREE.Color(hi);
    for (let i = 0; i < pos.count; i++) c.copy(a).lerp(b, THREE.MathUtils.clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1)), col.push(c.r, c.g, c.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  };
  /** 一條火舌／水滴尖：下面粗、上面尖，可以往旁邊彎 */
  const tongue = (r, h, bend = 0, round = 1.15) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector2(Math.max(0.0001, r * Math.pow(1 - t, round) * (t < 0.2 ? 0.85 + t * 0.75 : 1)), t * h));
    }
    const geo = new THREE.LatheGeometry(pts, 18);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + bend * h * Math.pow(pos.getY(i) / h, 2));
    geo.computeVertexNormals();
    return geo;
  };
  /** 圓底尖頂（真正的火焰／水滴形）：下面 35% 是半圓，上面往內凹收成尖尖 */
  const bulb = (r, h, bend = 0, sharp = 1.6) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const rad = t < 0.35 ? r * Math.sqrt(1 - (1 - t / 0.35) ** 2) : r * Math.pow(1 - (t - 0.35) / 0.65, sharp);
      pts.push(new THREE.Vector2(Math.max(0.0001, rad), t * h));
    }
    const geo = new THREE.LatheGeometry(pts, 22);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + bend * h * Math.pow(Math.max(0, pos.getY(i) / h - 0.3) / 0.7, 2));
    geo.computeVertexNormals();
    return geo;
  };
  const ball = (r, m, x = 0, y = 0, z = 0, p) => add(new THREE.SphereGeometry(r, 22, 16), m, x, y, z, p);
  const leafMesh = (len, m, x, y, z, rz, ry = 0, p) => {
    const l = ball(len * 0.5, m, x, y, z, p);
    l.scale.set(1, 0.28, 0.55);
    l.rotation.set(0, ry, rz);
    return l;
  };
  /** 把一顆小東西貼在球面上（蘑菇的白點用） */
  const onSphere = (geo, m, rad, cy, th, ph, p, flat = 0.25) => {
    const d = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    const o = add(geo, m, d.x * rad, cy + d.y * rad, d.z * rad, p);
    o.lookAt(o.position.clone().add(d));
    o.scale.z = flat;
    return o;
  };
  const starGeo = (outer, inner, depth, roundTips = false) => {
    const sh = new THREE.Shape();
    const P = (i, rr) => [Math.cos(Math.PI / 2 + (i / 10) * Math.PI * 2) * rr, Math.sin(Math.PI / 2 + (i / 10) * Math.PI * 2) * rr];
    if (!roundTips) {
      for (let i = 0; i < 10; i++) {
        const [x, y] = P(i, i % 2 ? inner : outer);
        if (i) sh.lineTo(x, y);
        else sh.moveTo(x, y);
      }
    } else {
      // 圓圓胖胖的星星：尖角用弧線帶過
      const [sx, sy] = P(1, inner);
      sh.moveTo(sx, sy);
      for (let i = 2; i <= 11; i += 2) {
        const [cx, cy] = P(i % 10, outer * 1.18);
        const [ex, ey] = P((i + 1) % 10, inner);
        sh.quadraticCurveTo(cx, cy, ex, ey);
      }
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * 0.45, bevelSize: outer * 0.16, bevelSegments: 5, curveSegments: 10 });
    geo.center();
    return geo;
  };
  const twinkle = (r, color, x, y, z, p) => {
    const s = add(new THREE.OctahedronGeometry(r, 0), new THREE.MeshBasicMaterial({ color }), x, y, z, p);
    s.userData.spark = Math.random() * 6;
    return s;
  };

  if (stage === 0 || type === 'light') {
    ball(R, soft(0xfff1b8, { emissiveIntensity: 0.9 }));
  } else if (type === 'drop') {
    if (v === 0) {
      // A：經典水滴
      ball(R, mat).scale.set(1, 0.95, 1);
      add(new THREE.ConeGeometry(R * 0.72, R * 1.15, 22, 1, true), mat, 0, R * 0.95, 0);
      top = R * 1.7;
    } else if (v === 1) {
      // B：頭上一撮捲捲的小浪花＋身邊兩顆小泡泡
      ball(R, mat).scale.set(1.08, 0.92, 1);
      const c = add(tongue(R * 0.45, R * 0.9, 0.55), mat, 0, R * 0.6, 0);
      c.rotation.z = 0.25;
      for (const [x, y, r] of [[1.2, 0.5, 0.18], [1.45, 0.05, 0.11], [-1.25, 0.35, 0.13]]) ball(R * r, soft(0xdff4ff, { transparent: true, opacity: 0.75 }), x * R, y * R, 0);
      top = R * 1.45;
    } else {
      // C：透明果凍水滴（下面寬寬的、會 Q 彈），裡面有一顆小光
      const jelly = soft(0x9fe6ff, { transparent: true, opacity: 0.72, roughness: 0.15 });
      const b = add(bulb(R * 1.08, R * 2.4, 0.12, 1.25), jelly, 0, -R * 1.05, 0);
      b.userData.jelly = 1;
      ball(R * 0.22, new THREE.MeshBasicMaterial({ color: 0xffffff }), -R * 0.5, R * 0.85, R * 0.4);
      faceY = -R * 0.2;
      top = R * 1.4;
    }
  } else if (type === 'flame') {
    if (v === 0) {
      // A：三條彎彎火舌（中間高、兩邊小），下面黃、上面橘紅
      const fm = grad(0xffd65a, 0xff5a2e, 0xff6a20);
      ball(R, fm).geometry = tint(new THREE.SphereGeometry(R, 22, 16), -R * 1.6, R * 2.2, 0xffd65a, 0xff5a2e);
      body.children.at(-1).scale.set(1.05, 0.95, 1);
      const f1 = add(tint(bulb(R * 0.62, R * 1.9, -0.3, 1.5), -R * 0.6, R * 1.9, 0xffb84a, 0xff4a2a), fm, 0, -R * 0.1, 0);
      f1.userData.flick = 1;
      for (const sx of [-1, 1]) {
        const f = add(tint(bulb(R * 0.38, R * 1.15, sx * 0.4, 1.5), -R * 0.4, R * 1.15, 0xffb84a, 0xff4a2a), fm, sx * R * 0.55, -R * 0.05, -R * 0.1);
        f.rotation.z = -sx * 0.5;
        f.userData.flick = 2;
      }
      top = R * 1.95;
    } else if (v === 1) {
      // B：蠟燭小火苗：整隻就是一朵高高的火（外橘、裡面一層亮黃），尖尖往旁邊捲
      const fm = grad(0xffe07a, 0xff7a2e, 0xff8a30);
      const outer = add(tint(bulb(R * 1.0, R * 2.9, 0.28, 1.7), 0, R * 2.6, 0xffd65a, 0xff5a2a), fm, 0, -R * 1.0, 0);
      outer.userData.flick = 1;
      const core = add(bulb(R * 0.5, R * 1.5, 0.15, 1.5), soft(0xfff3b0, { emissiveIntensity: 0.8 }), 0, -R * 0.95, -R * 0.45);
      core.userData.flick = 2;
      for (const [x, y] of [[1.0, 0.9], [-0.9, 1.3], [0.6, 1.8]]) twinkle(R * 0.08, 0xffd27a, x * R, y * R, 0);
      faceY = -R * 0.2;
      top = R * 1.9;
    } else {
      // C：紅紅的小火球，頭頂一圈火焰頭髮（像皇冠）
      const fm = grad(0xff9a3a, 0xff3a2a, 0xff4a20);
      const b = ball(R, fm);
      b.geometry = tint(new THREE.SphereGeometry(R, 22, 16), -R, R * 1.5, 0xffb24a, 0xff4a2e);
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + (i / 4) * 1.8;
        const h = i === 2 ? 1.1 : i % 2 ? 0.85 : 0.65;
        const f = add(tint(tongue(R * 0.3, R * h, 0), 0, R * h, 0xffc04a, 0xff3a2a), fm, Math.sin(a) * R * 0.78, Math.cos(a) * R * 0.6, -R * 0.15);
        f.rotation.z = -a * 0.8;
        f.userData.flick = 1 + (i % 2);
      }
      top = R * 2.0;
    }
  } else if (type === 'leaf') {
    const lm = soft(0x6fbf4f);
    if (v === 0) {
      // A：小芽：頭上兩片小葉子
      ball(R, mat);
      add(new THREE.CylinderGeometry(R * 0.06, R * 0.08, R * 0.45, 6), soft(0x6aa84f), 0, R * 1.15, 0);
      for (const sx of [-1, 1]) leafMesh(R * 0.72, lm, sx * R * 0.32, R * 1.38, 0, sx * 0.5);
      top = R * 1.8;
    } else if (v === 1) {
      // B：戴一片大葉子當帽子（葉尖捲起來）
      ball(R, soft(0xc8eaa0));
      const hat = leafMesh(R * 2.3, soft(0x58a845), 0, R * 0.85, 0, 0.25);
      hat.scale.set(1, 0.18, 0.75);
      add(new THREE.CylinderGeometry(R * 0.04, R * 0.05, R * 0.4, 6), soft(0x4a8a3a), R * 0.95, R * 1.18, 0).rotation.z = -0.9;
      add(new THREE.BoxGeometry(R * 1.9, R * 0.03, R * 0.03), soft(0x8fcf6f), 0, R * 0.98, R * 0.05).rotation.z = 0.25;
      top = R * 1.6;
    } else {
      // C：花苞：頭頂一圈葉子，中間一朵粉紅小花
      ball(R, mat);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const l = leafMesh(R * 0.75, lm, Math.cos(a) * R * 0.32, R * 1.05, Math.sin(a) * R * 0.32, 0, -a);
        l.rotation.z = 0.5;
        l.rotation.order = 'YZX';
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ball(R * 0.15, soft(0xffa6c4), Math.cos(a) * R * 0.15, R * 1.22, Math.sin(a) * R * 0.15);
      }
      ball(R * 0.1, soft(0xffe06a), 0, R * 1.28, 0);
      top = R * 1.7;
    }
  } else if (type === 'cloud') {
    const puffs = (list, m) => list.forEach(([x, y, r, z = -0.15]) => ball(R * r, m, x * R, y * R, z * R));
    if (v === 0) {
      // A：澎澎雲
      ball(R, mat);
      puffs([[-0.85, -0.2, 0.62], [0.85, -0.2, 0.62], [-0.45, 0.55, 0.55], [0.45, 0.6, 0.5]], mat);
      top = R * 1.55;
    } else if (v === 1) {
      // B：雲朵後面掛一道小彩虹
      ball(R, mat);
      puffs([[-0.9, -0.25, 0.55], [0.9, -0.25, 0.55], [0, 0.55, 0.6]], mat);
      [0xff8a8a, 0xffc46a, 0xfff07a, 0x9ce08a, 0x8ac4ff].forEach((c, i) => {
        const arc = add(new THREE.TorusGeometry(R * (1.65 - i * 0.12), R * 0.06, 6, 24, Math.PI), soft(c, { emissiveIntensity: 0.4 }), 0, -R * 0.15, -R * 0.55);
        arc.userData.rainbow = 1;
      });
      top = R * 1.75;
    } else {
      // C：扁扁的愛睏雲，下面滴兩顆小雨滴
      const b = ball(R, mat);
      b.scale.set(1.15, 0.85, 1);
      puffs([[-1.0, -0.15, 0.55], [1.0, -0.15, 0.55], [-0.5, 0.45, 0.5], [0.4, 0.5, 0.55], [1.5, -0.25, 0.35]], mat);
      for (const [x, d] of [[-0.45, 0], [0.4, 1.2]]) {
        const rd = add(tongue(R * 0.13, R * 0.3, 0), soft(0x8fd3ff), x * R, -R * 1.15, 0);
        rd.userData.rain = d;
      }
      top = R * 1.4;
    }
  } else if (type === 'star') {
    if (v === 0) {
      // A：尖尖五角星
      add(starGeo(R * 1.25, R * 0.62, R * 0.7), mat);
      top = R * 1.55;
    } else if (v === 1) {
      // B：圓圓胖胖的星星（角是圓的）
      add(starGeo(R * 1.15, R * 0.75, R * 0.8, true), mat);
      top = R * 1.65;
    } else {
      // C：流星：後面拖一條亮亮的尾巴＋小星星
      const s = add(starGeo(R * 1.1, R * 0.56, R * 0.6, true), mat);
      s.rotation.z = 0.2;
      for (let i = 1; i <= 5; i++) ball(R * (0.28 - i * 0.04), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff3b0 : 0xffd0f0, transparent: true, opacity: 1 - i * 0.15 }), -R * (0.9 + i * 0.32), -R * (0.55 + i * 0.22), -R * 0.3);
      twinkle(R * 0.1, 0xfff6c8, R * 1.3, R * 0.9, 0);
      twinkle(R * 0.07, 0xbfe0ff, -R * 0.8, R * 1.1, 0);
      top = R * 1.5;
    }
  } else if (type === 'mush') {
    const cream = soft(0xfff1dc, { emissiveIntensity: 0.15 });
    const spot = soft(0xffffff, { emissiveIntensity: 0.25 });
    const capOf = (Rc, color, rimY, open = 0.55, tilt = 0.12, sy = 0.82) => {
      const cap = new THREE.Group();
      cap.position.set(0, rimY - Rc * Math.cos(Math.PI * open) * sy, 0);
      cap.rotation.z = tilt;
      body.add(cap);
      add(new THREE.SphereGeometry(Rc, 26, 14, 0, Math.PI * 2, 0, Math.PI * open), color, 0, 0, 0, cap);
      const under = add(new THREE.CircleGeometry(Rc * Math.sin(Math.PI * open) * 0.98, 26), soft(0xffe2c4, { side: THREE.DoubleSide, emissiveIntensity: 0.15 }), 0, Rc * Math.cos(Math.PI * open) + 0.001, 0, cap);
      under.rotation.x = Math.PI / 2;
      cap.scale.y = sy;
      return cap;
    };
    if (v === 0) {
      // A：紅帽子白點點（經典）
      ball(R * 0.8, cream, 0, -R * 0.32, 0).scale.set(1.05, 0.95, 1);
      const Rc = R * 1.22;
      const cap = capOf(Rc, soft(0xe8443c, { emissiveIntensity: 0.2 }), R * 0.08);
      for (const [th, ph, sz] of [[0.08, 0, 0.3], [0.62, 1.25, 0.28], [0.62, 1.9, 0.24], [0.95, 0.65, 0.22], [0.95, 2.55, 0.22], [0.55, 3.6, 0.26], [0.75, 4.6, 0.24], [0.6, 5.5, 0.26]]) onSphere(new THREE.SphereGeometry(R * sz, 14, 8), spot, Rc * 0.99, 0, th, ph, cap);
      faceY = -R * 0.34;
      top = cap.position.y + Rc * 0.82;
    } else if (v === 1) {
      // B：粉紅色蘑菇，白點點會亮（作者挑這款，紫色改粉紅）
      ball(R * 0.8, cream, 0, -R * 0.32, 0).scale.set(1.05, 0.95, 1);
      const Rc = R * 1.18;
      const cap = capOf(Rc, soft(0xff8fbf, { emissiveIntensity: 0.3 }), R * 0.08, 0.5, -0.1, 0.9);
      for (const [th, ph, sz] of [[0.1, 0, 0.22], [0.6, 1.0, 0.2], [0.6, 2.1, 0.2], [0.85, 1.55, 0.16], [0.5, 3.4, 0.2], [0.7, 4.6, 0.2], [0.55, 5.6, 0.18]]) onSphere(new THREE.SphereGeometry(R * sz, 14, 8), new THREE.MeshBasicMaterial({ color: 0xfff4fa }), Rc * 0.99, 0, th, ph, cap);
      faceY = -R * 0.34;
      top = cap.position.y + Rc * 0.9;
    } else {
      // C：尖尖鐘形紅帽子（像小精靈帽），頭頂還長出一朵小小蘑菇寶寶
      ball(R * 0.8, cream, 0, -R * 0.32, 0).scale.set(1.05, 0.95, 1);
      const Rc = R * 1.1;
      const cap = capOf(Rc, soft(0xe8443c, { emissiveIntensity: 0.2 }), R * 0.1, 0.6, 0.05, 1.15);
      for (const [th, ph, sz] of [[0.75, 1.3, 0.24], [0.75, 1.95, 0.2], [1.0, 0.7, 0.18], [1.0, 2.5, 0.18], [0.5, 4.2, 0.2]]) onSphere(new THREE.SphereGeometry(R * sz, 14, 8), spot, Rc * 0.99, 0, th, ph, cap);
      const baby = new THREE.Group();
      baby.position.set(R * 0.3, cap.position.y + Rc * 1.15 - R * 0.12, 0);
      baby.rotation.z = -0.35;
      body.add(baby);
      add(new THREE.CylinderGeometry(R * 0.08, R * 0.1, R * 0.28, 8), cream, 0, 0, 0, baby);
      const bc = add(new THREE.SphereGeometry(R * 0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), soft(0xe8443c, { emissiveIntensity: 0.2 }), 0, R * 0.1, 0, baby);
      bc.scale.y = 0.8;
      onSphere(new THREE.SphereGeometry(R * 0.06, 8, 6), spot, R * 0.22, R * 0.1, 0.4, 1.5, baby);
      faceY = -R * 0.34;
      top = cap.position.y + Rc * 1.15 + R * 0.3;
    }
  }
  // 臉：一直對著鏡頭的小貼圖（臉稍微往前，不會被身體蓋住）
  const faceMat = new THREE.SpriteMaterial({ map: faceTex(face), transparent: true, depthWrite: false, depthTest: false });
  const faceSp = new THREE.Sprite(faceMat);
  const fs = stage === 0 ? R * 2.0 : R * 1.75;
  faceSp.scale.set(fs, fs, 1);
  faceSp.position.set(0, faceY, R * 0.2);
  // 臉離中心多遠（貼在表面前面一點）
  const faceDist = R * 1.6; // 比身體最外面（星星的角、蘑菇帽子）還遠一點
  faceSp.renderOrder = 6;
  body.add(faceSp);
  // 🎄 小精靈配件（12 月：聖誕帽、紅／綠小雪人圍巾；作者 11/12 拿掉鹿角）：戴在頭頂（top）或繞在身體中間
  if (acc) {
    const red = soft(0xd2392f, { emissiveIntensity: 0.15 });
    const white = soft(0xfffaf2, { emissiveIntensity: 0.15 });
    const hy = type === 'leaf' && stage > 0 ? R * 0.88 : top - R * 0.15; // 戴的高度（頭頂往下一點）；葉子：帽子直接蓋住頭上的小芽（作者 11/12）
    if (acc === 'santa') {
      const rim = add(new THREE.TorusGeometry(R * 0.55, R * 0.13, 8, 20), white, 0, hy, 0);
      rim.rotation.x = Math.PI / 2;
      const hat = add(new THREE.ConeGeometry(R * 0.55, R * 1.1, 14), red, 0, hy + R * 0.5, -R * 0.08);
      hat.rotation.x = -0.35;
      add(new THREE.SphereGeometry(R * 0.16, 10, 8), white, 0, hy + R * 1.0, -R * 0.38);
    } else if (acc === 'scarf' || acc === 'scarf2') {
      // 🧣 圍巾（作者 11/12：跟玩家的一樣，紅色、綠色兩款，前面一個小雪人）
      const red2 = acc === 'scarf';
      const knit = red2 ? red : soft(0x2f7a45, { emissiveIntensity: 0.15 });
      const sc = add(new THREE.TorusGeometry(R * 0.82, R * 0.15, 8, 22), knit, 0, faceY - R * 0.58, 0);
      sc.rotation.x = Math.PI / 2;
      const tail = add(new THREE.CapsuleGeometry(R * 0.12, R * 0.4, 4, 8), knit, -R * 0.5, faceY - R * 0.92, R * 0.6);
      tail.rotation.z = -0.2;
      tail.scale.z = 0.5;
      // 小雪人吊飾
      const sx = R * 0.42;
      const sy = faceY - R * 0.62;
      const sz = R * 0.92;
      add(new THREE.SphereGeometry(R * 0.11, 8, 6), white, sx, sy, sz);
      add(new THREE.SphereGeometry(R * 0.08, 8, 6), white, sx, sy + R * 0.15, sz);
      add(new THREE.ConeGeometry(R * 0.07, R * 0.12, 8), red2 ? soft(0x2f7a45, { emissiveIntensity: 0.15 }) : red, sx, sy + R * 0.27, sz);
    }
  }
  // 長大（第 3 階段）：小翅膀＋光環
  if (stage >= 2) {
    const wing = once(`wing${type}`, () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: T.glow, emissiveIntensity: 0.5, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    for (const sx of [-1, 1]) {
      const w = add(new THREE.CircleGeometry(R * 0.75, 16), wing, sx * R * 0.95, R * 0.35, -R * 0.5);
      w.scale.set(1, 0.62, 1);
      w.rotation.set(0, sx * 0.9, sx * 0.4);
      w.userData.wing = sx;
    }
    const ring = add(new THREE.TorusGeometry(R * 0.55, R * 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), 0, top + R * 0.3, 0);
    if (acc === 'santa') ring.visible = false; // 戴帽子時光環先收起來
    ring.rotation.x = Math.PI / 2;
    ring.userData.halo = true;
  }
  g.userData = {
    body,
    face: faceSp,
    setFace(f) {
      faceMat.map = faceTex(SPIRIT_FACES.includes(f) ? f : 'happy');
      faceMat.needsUpdate = true;
    },
    /** 每幀：上下飄、翅膀拍、火苗閃 */
    /** camPos：遊戲裡傳鏡頭位置，臉會貼在面向鏡頭的那一面（不會穿過樹、牆被看到） */
    update(dt, time, camPos) {
      body.position.y = Math.sin(time * 2.2) * 0.035;
      if (camPos) {
        if (!faceMat.depthTest) (faceMat.depthTest = true), (faceMat.needsUpdate = true);
        body.updateWorldMatrix(true, false);
        _c.copy(camPos);
        body.worldToLocal(_c);
        _c.y -= faceY;
        _c.normalize().multiplyScalar(faceDist);
        // 11/12：臉沿著「臉中心→鏡頭」那條線往前推到身體外面（螢幕上位置不變），
        // 星星的角、蘑菇帽子這些就不會從斜的角度擋住一隻眼睛
        faceSp.position.set(_c.x, faceY + _c.y, _c.z);
      }
      body.traverse((o) => {
        if (o.userData.wing) o.rotation.y = o.userData.wing * (0.9 + Math.sin(time * 14) * 0.35);
        if (o.userData.flick) o.scale.y = 1 + Math.sin(time * (o.userData.flick === 1 ? 9 : 13)) * 0.12;
        if (o.userData.spark !== undefined) o.scale.setScalar(0.6 + Math.abs(Math.sin(time * 3 + o.userData.spark)) * 0.6);
        if (o.userData.jelly) o.scale.set(1 + Math.sin(time * 4) * 0.04, 1 - Math.sin(time * 4) * 0.04, 1);
        if (o.userData.rain !== undefined) {
          if (o.userData.y0 === undefined) o.userData.y0 = o.position.y;
          const k = (time * 0.8 + o.userData.rain) % 1;
          o.position.y = o.userData.y0 - k * R * 0.8;
          o.visible = k < 0.85;
        }
      });
      halo.material.opacity = (stage === 0 ? 0.85 : 0.5) + Math.sin(time * 3) * 0.1;
    },
  };
  return g;
}
