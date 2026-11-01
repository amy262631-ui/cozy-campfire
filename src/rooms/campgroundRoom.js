import * as THREE from 'three';
import { makeResolver, makeSign, lowpoly, shadowAll } from './shared.js';
import { FOG_COLOR } from '../scene/World.js';
import { seededRandom } from '../scene/textures.js';
import { buildTentShell, shapeOf } from '../game/tentShapes.js';
import { styleOf, tentTexture } from '../game/tentStyles.js';
import { t } from '../i18n/i18n.js';

/**
 * 🏕️ 帳篷營地：大家的帳篷排在草地上，開放參觀的可以走到門口按 E 進去逛。
 * 帳篷清單由伺服器給（setTents），最多 16 頂；沒人住的空地插一支小木牌。
 */
const SCALE = 0.55; // 營地裡的帳篷縮小一點，才排得下
const COLS = [-9.75, -3.25, 3.25, 9.75];
const ROWS = [-15, -8.5, -2];
export const CAMP_PLOTS = COLS.length * ROWS.length + 4; // 最後一排只有 4 格（門口留走道）
const PLOTS = [
  ...ROWS.flatMap((z) => COLS.map((x) => ({ x, z }))),
  { x: -9.75, z: 4.5 },
  { x: -3.25, z: 4.5 },
  { x: 3.25, z: 4.5 },
  { x: 9.75, z: 4.5 },
];
const ENTRY_Z = 12.5;

/** 每種花色共用一組外觀材質 */
const matCache = new Map();
function tentMats(styleId) {
  if (matCache.has(styleId)) return matCache.get(styleId);
  const st = styleOf(styleId);
  const tex = tentTexture(st);
  const m = {
    canvas: new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : st.canvas, map: tex, roughness: 1, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, flatShading: true }),
    accentDouble: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, side: THREE.DoubleSide }),
    wood: lowpoly(0x7a5236),
    trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.DoubleSide }),
    gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, metalness: 0.3 }),
    window: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
  };
  matCache.set(styleId, m);
  return m;
}

export function createCampgroundRoom() {
  const group = new THREE.Group();
  group.name = 'campground';
  const rand = seededRandom(77);

  // 草地與步道
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 40), lowpoly(0x3d5a32));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -2;
  ground.receiveShadow = true;
  group.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 32), lowpoly(0x5b4a36));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -2);
  group.add(path);
  for (const z of [-11.75, -5.25, 1.25]) {
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.2), lowpoly(0x5b4a36));
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(0, 0.008, z);
    group.add(cross);
  }

  // 四周的樹
  const colliders = [];
  const treeMat = lowpoly(0x1f3a2a);
  const trunkMat = lowpoly(0x4a3322);
  for (let i = 0; i < 46; i++) {
    const side = i % 3;
    const x = side === 0 ? -16.5 - rand() * 2 : side === 1 ? 16.5 + rand() * 2 : -16 + rand() * 32;
    const z = side === 2 ? -20 - rand() * 2 : -19 + rand() * 32;
    const h = 3 + rand() * 3;
    const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 6), trunkMat);
    trunk.position.y = 0.5;
    tr.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1 + rand() * 0.6, h, 7), treeMat);
    crown.position.y = 1 + h / 2;
    tr.add(crown);
    tr.position.set(x, 0, z);
    group.add(tr);
  }

  // 一串串小燈（沿著中間步道）
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd38a });
  const poleMat = lowpoly(0x5a3c26);
  for (const z of [-16, -9.5, -3, 3.5, 10]) {
    for (const x of [-1.6, 1.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), poleMat);
      pole.position.set(x, 1.2, z);
      group.add(pole);
      colliders.push({ x, z, r: 0.15 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bulbMat);
      bulb.position.set(x, 2.45, z);
      group.add(bulb);
    }
    const light = new THREE.PointLight(0xffc27a, 4, 9, 1.6);
    light.position.set(0, 2.4, z);
    group.add(light);
  }
  group.add(new THREE.HemisphereLight(0xb8c6e8, 0x2a3a22, 1.25));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 0.9);
  moon.position.set(-8, 14, 6);
  group.add(moon);

  // 入口招牌
  const gate = makeSign(t('🏕️ 帳篷營地'), { height: 0.42 });
  gate.position.set(0, 2.8, ENTRY_Z - 1.2);
  group.add(gate);
  const back = makeSign(t('回到營火'), { height: 0.3 });
  back.position.set(0, 2.1, ENTRY_Z + 0.3);
  group.add(back);

  shadowAll(group);

  // ---- 帳篷們 ----
  const plotsGroup = new THREE.Group();
  group.add(plotsGroup);
  const signs = []; // 名牌：鏡頭太近時淡出
  const wp = new THREE.Vector3();
  const tentColliders = [];
  let plots = []; // [{ x, z, door, tent }]
  const staticColliders = [...colliders];

  function setTents(list = []) {
    for (const c of plotsGroup.children) c.traverse((o) => o.geometry?.dispose?.());
    plotsGroup.clear();
    tentColliders.length = 0;
    signs.length = 0;
    plots = PLOTS.map((p, i) => {
      const tent = list[i] ?? null;
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      plotsGroup.add(g);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20), lowpoly(tent?.mine ? 0x4a5c33 : 0x3a5230));
      patch.rotation.x = -Math.PI / 2;
      patch.position.y = 0.006;
      g.add(patch);
      if (!tent) {
        // 空地：小木牌
        const stake = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), poleMat);
        stake.position.y = 0.4;
        g.add(stake);
        const s = makeSign(t('空地'), { height: 0.22, bg: 'rgba(30,20,14,0.45)' });
        s.position.y = 1.05;
        g.add(s);
        return { ...p, door: { x: p.x, z: p.z + 1.2 }, tent: null };
      }
      const shell = buildTentShell(tent.shape, tentMats(tent.style), { outside: true });
      shell.scale.setScalar(SCALE);
      g.add(shell);
      // 帳篷裡透出的暖光
      const glow = new THREE.PointLight(0xffb565, tent.open ? 4 : 1, 6, 1.5);
      glow.position.set(0, 1, 0.8);
      g.add(glow);
      const sh = shapeOf(tent.shape);
      const front = (sh.kind === 'rect' ? sh.D : sh.R) * SCALE;
      const name = tent.mine ? t('⭐ 我的帳篷') : tent.demo ? tent.name : tent.name ? t('{name} 的帳篷', { name: tent.name }) : t('旅人的帳篷');
      const label = makeSign(name, { height: 0.3 });
      signs.push(label);
      label.position.y = 3.3;
      g.add(label);
      const info = [tent.open ? t('🚪 開放參觀') : t('🔒 休息中'), `❤️ ${tent.likes}`];
      if (tent.n) info.push(t('👣 {n} 人在裡面', { n: tent.n }));
      const status = makeSign(info.join('　'), { height: 0.22, bg: 'rgba(30,20,14,0.5)' });
      status.position.y = 2.92;
      g.add(status);
      signs.push(status);
      tentColliders.push({ x: p.x, z: p.z, r: front * 0.92 });
      return { ...p, door: { x: p.x, z: p.z + front + 0.55 }, tent };
    });
    colliders.length = 0;
    colliders.push(...staticColliders, ...tentColliders);
  }
  setTents([]);

  const resolveCollision = makeResolver(colliders, { type: 'rect', minX: -15.5, maxX: 15.5, minZ: -19, maxZ: ENTRY_Z + 0.6 });

  /** 站在哪一格的門口（1.6 公尺內） */
  function plotAt(pos) {
    let best = null;
    let bd = 1.6;
    for (const p of plots) {
      const d = Math.hypot(pos.x - p.door.x, pos.z - p.door.z);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  const returnSpawn = {};
  return {
    id: 'campground',
    label: t('🏕️ 帳篷營地'),
    group,
    fog: new THREE.FogExp2(FOG_COLOR, 0.014),
    background: new THREE.Color(FOG_COLOR),
    outdoor: true,
    occluders: [],
    entrances: [{ to: 'forest_main', x: 0, z: ENTRY_Z + 0.4, r: 0.9, label: t('回到營火') }],
    spawn: { x: 0, z: ENTRY_Z - 1.6, ry: Math.PI },
    returnSpawn,
    cameraDistance: 8,
    audio: { fire: 0.15, wind: 0.9, ambient: 1, water: 0, music: 0.5, song: 0 },
    resolveCollision,
    setTents,
    plotAt,
    /** 從某頂帳篷出來時，站回那頂帳篷的門口 */
    setReturnFrom(plot) {
      returnSpawn.home = plot ? { x: plot.door.x, z: plot.door.z + 0.6, ry: 0 } : undefined;
    },
    update(dt, time, camera) {
      for (const sg of signs) {
        sg.getWorldPosition(wp);
        sg.material.opacity = Math.min(1, Math.max(0, (camera.position.distanceTo(wp) - 2.5) / 3));
      }
    },
    onAction(name, actions) {
      if (name !== 'interact' || actions.state !== 'free') return false;
      const p = plotAt(actions.player.position);
      if (!p) return false;
      actions.onVisit?.(p);
      return true;
    },
    prompt(actions) {
      const p = plotAt(actions.player.position);
      if (!p) return null;
      if (!p.tent) return t('<kbd>E</kbd> 空地・到營火旁的小舖買帳篷就能住進來');
      if (p.tent.mine) return t('<kbd>E</kbd> 回我的帳篷');
      if (!p.tent.open) return t('🔒 這頂帳篷休息中');
      return t('<kbd>E</kbd> 拜訪「{name}」', { name: p.tent.name || t('旅人的帳篷') });
    },
    interactHint(actions) {
      const p = plotAt(actions.player.position);
      return p ? ['🚪', t('拜訪')] : null;
    },
  };
}
