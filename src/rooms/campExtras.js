import * as THREE from 'three';
import { lowpoly, makeSign } from './shared.js';
import { GATHER_ITEMS } from '../game/gathering.js';
import { t } from '../i18n/i18n.js';

const polar = (a, r) => ({ x: Math.sin(a) * r, z: Math.cos(a) * r });

/** 🏛️ 營地標本櫃：在營火告示牌和專注帳篷之間 */
export const MUSEUM_POS = polar(2.45, 7.4);
/** 🍲 營火料理鍋：營火旁兩張長椅之間 */
export const POT_POS = polar(0.42, 3.05);
export const EXTRA_CLEARINGS = [
  { ...MUSEUM_POS, r: 2.4 },
  { ...POT_POS, r: 0.9 },
];

/**
 * 標本櫃的正面：一張畫布畫出所有格子，捐了的格子畫上圖示（每次有人捐就重畫）
 */
function buildMuseum() {
  const g = new THREE.Group();
  const wood = lowpoly(0x6a4a30);
  const dark = lowpoly(0x3e2a1c);
  const W = 2.6;
  const H = 2.2;
  const D = 0.5;
  // 櫃子本體＋屋頂
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wood);
  body.position.y = H / 2;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.14, D + 0.3), dark);
  roof.position.y = H + 0.07;
  g.add(roof);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, D), dark);
    leg.position.set(s * (W / 2 - 0.1), 0.1, 0);
    g.add(leg);
  }
  // 正面玻璃格子（畫布貼圖）
  const COLS = 8;
  const ROWS = Math.ceil(GATHER_ITEMS.length / COLS);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * (H - 0.3)) / (W - 0.2));
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  front.position.set(0, H / 2 + 0.03, D / 2 + 0.005);
  g.add(front);
  // 暖暖的櫃內燈（光暈，不用真的燈）
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.6, H + 0.4), new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.08, depthWrite: false }));
  halo.position.set(0, H / 2, D / 2 + 0.02);
  g.add(halo);

  function draw(museum = {}) {
    const cw = c.width / COLS;
    const ch = c.height / ROWS;
    ctx.fillStyle = '#2a1c12';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    GATHER_ITEMS.forEach((it, i) => {
      const x = (i % COLS) * cw;
      const y = Math.floor(i / COLS) * ch;
      const has = !!museum[it.id];
      ctx.fillStyle = has ? 'rgba(255, 214, 150, 0.22)' : 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(x + 5, y + 5, cw - 10, ch - 10);
      ctx.strokeStyle = 'rgba(255, 210, 150, 0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
      ctx.font = `${Math.floor(ch * 0.55)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.globalAlpha = has ? 1 : 0.13;
      ctx.fillText(it.icon, x + cw / 2, y + ch / 2 + 4);
      ctx.globalAlpha = 1;
    });
    tex.needsUpdate = true;
  }
  draw();
  g.traverse((o) => o.isMesh && o !== front && o !== halo && (o.castShadow = true));
  return { group: g, draw, colliderR: 1.35 };
}

/** 營火料理鍋：三腳架吊著一口小鐵鍋，鍋裡冒熱氣 */
function buildPot() {
  const g = new THREE.Group();
  const wood = lowpoly(0x5b3d26);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.25, 6), wood);
    leg.position.set(Math.sin(a) * 0.32, 0.58, Math.cos(a) * 0.32);
    leg.lookAt(0, 1.3, 0);
    leg.rotateX(Math.PI / 2);
    g.add(leg);
  }
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }));
  pot.position.y = 0.55;
  g.add(pot);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshStandardMaterial({ color: 0xe0903a, emissive: 0x6a3008, emissiveIntensity: 0.5 }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = 0.64;
  g.add(soup);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 4), lowpoly(0x444444));
  chain.position.y = 1.0;
  g.add(chain);
  // 熱氣
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
  const steam = Array.from({ length: 5 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), steamMat.clone());
    m.userData.p = i / 5;
    g.add(m);
    return m;
  });
  const sign = makeSign(t('🍲 營火料理'), { height: 0.22 });
  sign.position.y = 1.6;
  g.add(sign);
  function update(dt, time) {
    for (const m of steam) {
      const p = (time * 0.35 + m.userData.p) % 1;
      m.position.set(Math.sin(p * 9 + m.userData.p * 6) * 0.06, 0.7 + p * 0.7, Math.cos(p * 7) * 0.05);
      m.scale.setScalar(0.6 + p * 1.4);
      m.material.opacity = 0.28 * (1 - p);
    }
  }
  return { group: g, update, colliderR: 0.42 };
}

/** 加到中央營火：標本櫃＋料理鍋；回傳靠近判斷和更新函式 */
export function buildCampExtras(group, world) {
  const museum = buildMuseum();
  museum.group.position.set(MUSEUM_POS.x, 0, MUSEUM_POS.z);
  museum.group.rotation.y = Math.atan2(-MUSEUM_POS.x, -MUSEUM_POS.z); // 正面朝營火
  group.add(museum.group);
  world.colliders.push({ x: MUSEUM_POS.x, z: MUSEUM_POS.z, r: museum.colliderR });
  const sign = makeSign(t('🏛️ 營地標本櫃'), { height: 0.26 });
  sign.position.set(MUSEUM_POS.x, 2.85, MUSEUM_POS.z);
  group.add(sign);
  const museumFront = polar(2.45, 7.4 - 1.25);

  const pot = buildPot();
  pot.group.position.set(POT_POS.x, 0, POT_POS.z);
  group.add(pot.group);
  world.colliders.push({ x: POT_POS.x, z: POT_POS.z, r: pot.colliderR });

  const near = (p, q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r;
  return {
    drawMuseum: museum.draw,
    nearMuseum: (pos) => near(pos, museumFront, 1.8),
    nearPot: (pos) => near(pos, POT_POS, 1.25),
    update: pot.update,
    occluders: [museum.group],
  };
}

/**
 * ✨ 營火寶藏（晚上 8～10 點）：地上偶爾閃一下的小星光，要走近才看得清楚，像在找寶藏
 */
export function createTreasures(group) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,240,180,0.9)');
  grd.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  // 十字星芒
  g.fillStyle = 'rgba(255,255,240,0.95)';
  g.fillRect(30, 2, 4, 60);
  g.fillRect(2, 30, 60, 4);
  const tex = new THREE.CanvasTexture(c);
  const items = new Map(); // k → { sprite, x, z, seed }
  const near = (pos, r) => {
    let best = null;
    let bd = r;
    for (const it of items.values()) {
      const d = Math.hypot(pos.x - it.x, pos.z - it.z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  };
  return {
    setList(list = []) {
      const keep = new Set(list.map((x) => x.k));
      for (const [k, it] of items) {
        if (keep.has(k)) continue;
        group.remove(it.sprite);
        it.sprite.material.dispose();
        items.delete(k);
      }
      for (const x of list) {
        if (items.has(x.k)) continue;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        sprite.position.set(x.x, 0.25, x.z);
        group.add(sprite);
        items.set(x.k, { k: x.k, x: x.x, z: x.z, sprite, seed: Math.random() * 6 });
      }
    },
    near: (pos) => near(pos, 1.6),
    get count() {
      return items.size;
    },
    update(dt, time, pos) {
      for (const it of items.values()) {
        // 一閃一閃：遠的時候很淡，走近才看得清楚
        const d = pos ? Math.hypot(pos.x - it.x, pos.z - it.z) : 99;
        const blink = Math.max(0, Math.sin(time * 2.6 + it.seed)) ** 6;
        const closeness = Math.max(0, 1 - d / 7);
        it.sprite.material.opacity = 0.08 + blink * (0.35 + closeness * 0.65) + closeness * 0.25;
        const s = 0.25 + blink * 0.35 + closeness * 0.15;
        it.sprite.scale.set(s, s, 1);
        it.sprite.position.y = 0.22 + Math.sin(time * 1.5 + it.seed) * 0.04;
      }
    },
  };
}
