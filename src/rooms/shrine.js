import * as THREE from 'three';
import { makeSign, lowpoly, shadowAll } from './shared.js';
import { t } from '../i18n/i18n.js';

const STONE = 0x9a978f;
const STONE_DARK = 0x7f7c75;
const MOSS = 0x6f8f4e;
const BIB_RED = 0xc8443a;

/** 地藏的臉（平面貼圖：瞇瞇笑眼、小小的微笑） */
let faceTex = null;
function jizoFace() {
  if (faceTex) return faceTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(60, 55, 50, 0.85)';
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (const x of [92, 164]) {
    g.beginPath();
    g.arc(x, 112, 16, Math.PI * 0.15, Math.PI * 0.85); // 彎彎的笑眼
    g.stroke();
  }
  g.lineWidth = 6;
  g.beginPath();
  g.arc(128, 150, 14, Math.PI * 0.2, Math.PI * 0.8);
  g.stroke();
  // 淡淡的腮紅
  for (const x of [72, 184]) {
    const b = g.createRadialGradient(x, 140, 0, x, 140, 22);
    b.addColorStop(0, 'rgba(230, 140, 140, 0.45)');
    b.addColorStop(1, 'rgba(230, 140, 140, 0)');
    g.fillStyle = b;
    g.fillRect(x - 24, 116, 48, 48);
  }
  faceTex = new THREE.CanvasTexture(c);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  return faceTex;
}

/** 一尊圓圓的石頭地藏：台座、身體、頭、紅圍兜、紅色小毛帽、青苔 */
function buildJizo(scale = 1) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.95 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 14), lowpoly(STONE_DARK));
  base.position.y = 0.09;
  g.add(base);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), stone);
  body.scale.set(1, 1.25, 0.9);
  body.position.y = 0.48;
  g.add(body);
  const headR = 0.21;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), stone);
  head.position.y = 0.9;
  g.add(head);
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 1.005, 24, 16, Math.PI / 2 - 0.8, 1.6, 0.9, 1.3),
    new THREE.MeshStandardMaterial({ map: jizoFace(), transparent: true, depthWrite: false, roughness: 0.95 }),
  );
  face.position.copy(head.position);
  g.add(face);
  // 紅圍兜（前掛け）
  const bib = new THREE.Mesh(
    new THREE.SphereGeometry(0.285, 20, 12, Math.PI / 2 - 1.0, 2.0, 0.25, 0.75),
    new THREE.MeshStandardMaterial({ color: BIB_RED, roughness: 1, side: THREE.DoubleSide }),
  );
  bib.scale.set(1.03, 1.27, 0.93);
  bib.position.y = 0.5;
  g.add(bib);
  // 紅色小毛帽
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(headR * 1.04, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: BIB_RED, roughness: 1 }),
  );
  cap.position.copy(head.position);
  cap.position.y += 0.01;
  g.add(cap);
  const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2e6d8, roughness: 1 }));
  pompom.position.set(0, head.position.y + headR + 0.02, 0);
  g.add(pompom);
  // 青苔
  for (const [x, y, z, s] of [[-0.18, 0.22, 0.15, 0.08], [0.2, 0.3, -0.1, 0.07], [0.05, 0.12, -0.25, 0.09]]) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), lowpoly(MOSS));
    moss.scale.y = 0.4;
    moss.position.set(x, y, z);
    g.add(moss);
  }
  g.scale.setScalar(scale);
  return g;
}

/** 石鳥居 */
function buildTorii() {
  const g = new THREE.Group();
  const stone = lowpoly(STONE);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.1, 10), stone);
    pillar.position.set(side * 0.85, 1.05, 0);
    g.add(pillar);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 10), lowpoly(STONE_DARK));
    foot.position.set(side * 0.85, 0.07, 0);
    g.add(foot);
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), stone);
  nuki.position.y = 1.62;
  g.add(nuki);
  // 笠木：兩端微微往上翹
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.22), stone);
  kasagi.position.y = 2.12;
  g.add(kasagi);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.22), stone);
    tip.position.set(side * 1.15, 2.17, 0);
    tip.rotation.z = side * 0.25;
    g.add(tip);
  }
  // 掛在鳥居下的鈴鐺與紅白繩
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd4a83c, metalness: 0.6, roughness: 0.35 }));
  bell.position.set(0, 1.42, 0);
  g.add(bell);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), lowpoly(0xd9c9b0));
  rope.position.set(0, 0.98, 0.02);
  g.add(rope);
  const ropeRed = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.25, 6), lowpoly(0xc8443a));
  ropeRed.position.set(0, 1.15, 0.02);
  g.add(ropeRed);
  return { group: g, bell };
}

/** 石燈籠（裡面亮著暖光） */
function buildLantern() {
  const g = new THREE.Group();
  const stone = lowpoly(STONE);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.15, 6), stone);
  base.position.y = 0.075;
  g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), stone);
  post.position.y = 0.45;
  g.add(post);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.08, 6), stone);
  plate.position.y = 0.79;
  g.add(plate);
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
  light.position.y = 0.94;
  g.add(light);
  for (const [x, z] of [[0.12, 0.12], [-0.12, 0.12], [0.12, -0.12], [-0.12, -0.12]]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), stone);
    frame.position.set(x, 0.94, z);
    g.add(frame);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 6), stone);
  roof.position.y = 1.16;
  g.add(roof);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), stone);
  knob.position.y = 1.3;
  g.add(knob);
  const pl = new THREE.PointLight(0xffb866, 2.6, 6, 1.6);
  pl.position.y = 0.95;
  g.add(pl);
  return { group: g, light: pl };
}

/** 一塊繪馬（五角形的小木牌＋紅繩） */
const EMA_SHAPE = new THREE.Shape([
  new THREE.Vector2(-0.11, -0.08),
  new THREE.Vector2(0.11, -0.08),
  new THREE.Vector2(0.11, 0.04),
  new THREE.Vector2(0, 0.1),
  new THREE.Vector2(-0.11, 0.04),
]);
const EMA_GEO = new THREE.ExtrudeGeometry(EMA_SHAPE, { depth: 0.015, bevelEnabled: false });
const EMA_MAT = new THREE.MeshStandardMaterial({ color: 0xe2c597, roughness: 1 });
const EMA_INK = new THREE.MeshBasicMaterial({ color: 0x8a3a2a });

/**
 * 地藏祈福處：石鳥居、三尊地藏、石燈籠、賽錢箱、繪馬架、供花。
 * 放在森林裡（不用換房間）。
 * @returns {{ group, colliders, front: THREE.Vector3, ringBell(), setWishes(list), update(dt, t) }}
 */
export function buildShrine() {
  const group = new THREE.Group();

  // 石板地
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.1, 10), lowpoly(0x8d8a82));
  platform.position.y = 0.05;
  platform.receiveShadow = true;
  group.add(platform);
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.4), lowpoly(0x8a877f));
    step.position.set((Math.random() - 0.5) * 0.2, 0.03, 2.9 + i * 0.55);
    step.rotation.y = (Math.random() - 0.5) * 0.3;
    group.add(step);
  }

  // 三尊地藏（中間大、兩邊小）
  [
    [0, -1.1, 1.15, 0],
    [-0.75, -0.95, 0.85, 0.12],
    [0.75, -0.95, 0.9, -0.1],
  ].map(([x, z, s, ry]) => {
    const j = buildJizo(s);
    j.position.set(x, 0.1, z);
    j.rotation.y = ry;
    group.add(j);
  });

  // 鳥居
  const torii = buildTorii();
  torii.group.position.set(0, 0.1, 0.9);
  group.add(torii.group);

  // 石燈籠一對
  const lanterns = [-1.75, 1.75].map((x) => {
    const l = buildLantern();
    l.group.position.set(x, 0.1, 0.5);
    group.add(l.group);
    return l;
  });

  // 賽錢箱
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.4), lowpoly(0x7a5236));
  box.position.set(0, 0.3, -0.2);
  group.add(box);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.05), lowpoly(0x4f3524));
    slat.position.set(0, 0.51, -0.36 + i * 0.08);
    group.add(slat);
  }

  // 供花與疊石
  for (const [x, c] of [[-0.42, 0xf2b8c6], [0.42, 0xf7e3a1]]) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10), lowpoly(0x6f8fa8));
    vase.position.set(x, 0.18, -0.55);
    group.add(vase);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      f.position.set(x + Math.sin(i * 1.7) * 0.05, 0.3 + i * 0.02, -0.55 + Math.cos(i * 1.7) * 0.05);
      group.add(f);
    }
  }
  [0.16, 0.12, 0.09, 0.06].forEach((r, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), lowpoly(STONE));
    s.scale.y = 0.55;
    s.position.set(1.35, 0.13 + i * 0.11 + r * 0.2, -0.75);
    group.add(s);
  });

  // 繪馬架（右後方）
  const rack = new THREE.Group();
  const wood = lowpoly(0x7a5236);
  for (const x of [-0.75, 0.75]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), wood);
    post.position.set(x, 0.7, 0);
    rack.add(post);
  }
  const bars = [0.85, 1.25];
  for (const y of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.05), wood);
    bar.position.set(0, y, 0);
    rack.add(bar);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), lowpoly(0x5a3a2a));
  roof.position.y = 1.45;
  rack.add(roof);
  rack.position.set(2.0, 0.1, -0.6);
  rack.rotation.y = -0.6;
  group.add(rack);
  const emaHolder = new THREE.Group();
  rack.add(emaHolder);

  const sign = makeSign(t('⛩️ 地藏祈福處'), { height: 0.26 });
  sign.position.set(0, 2.75, 0.9);
  group.add(sign);

  shadowAll(group);
  lanterns.forEach((l) => (l.light.castShadow = false));

  let bellSwing = 0;
  const emas = [];

  return {
    group,
    // 碰撞（相對於祈福處中心）：地藏、賽錢箱、鳥居柱、燈籠、繪馬架
    colliders: [
      { x: 0, z: -1.0, r: 1.0 },
      { x: 0, z: -0.2, r: 0.42 },
      { x: -0.85, z: 0.9, r: 0.18 },
      { x: 0.85, z: 0.9, r: 0.18 },
      { x: -1.75, z: 0.5, r: 0.3 },
      { x: 1.75, z: 0.5, r: 0.3 },
      { x: 2.0, z: -0.6, r: 0.5 },
    ],
    /** 參拜的位置（鳥居前） */
    front: new THREE.Vector3(0, 0, 1.6),

    ringBell() {
      bellSwing = 1;
    },

    /** 依願望數量掛上繪馬（最多 24 塊） */
    setWishes(list) {
      const n = Math.min(24, list.length);
      while (emas.length < n) {
        const i = emas.length;
        const e = new THREE.Group();
        const plaque = new THREE.Mesh(EMA_GEO, EMA_MAT);
        plaque.castShadow = true;
        e.add(plaque);
        // 木牌上的幾筆「字」
        for (let k = 0; k < 2; k++) {
          const ink = new THREE.Mesh(new THREE.PlaneGeometry(0.12 - k * 0.04, 0.012), EMA_INK);
          ink.position.set(0, 0.0 - k * 0.03, 0.017);
          e.add(ink);
        }
        const row = i % 2;
        const col = Math.floor(i / 2);
        e.position.set(-0.68 + (col % 12) * 0.124, bars[row] - 0.12, 0.04);
        e.rotation.z = (Math.random() - 0.5) * 0.2;
        e.userData.phase = Math.random() * 6;
        emaHolder.add(e);
        emas.push(e);
      }
      while (emas.length > n) emaHolder.remove(emas.pop());
    },

    update(dt, t) {
      bellSwing *= Math.exp(-1.5 * dt);
      torii.bell.position.x = Math.sin(t * 9) * 0.06 * bellSwing;
      lanterns.forEach((l, i) => (l.light.intensity = 2.6 * (0.9 + Math.sin(t * 3.1 + i * 2) * 0.06)));
      for (const e of emas) e.rotation.x = Math.sin(t * 1.3 + e.userData.phase) * 0.12; // 隨風輕輕晃
    },
  };
}
