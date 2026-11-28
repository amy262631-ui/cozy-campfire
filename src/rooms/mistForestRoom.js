import * as THREE from 'three';
import { mergeStatic } from '../scene/mergeStatic.js';
import { makeResolver, makeSign, lowpoly } from './shared.js';
import { buildMiniLayer } from './miniLayer.js';
import { seededRandom } from '../scene/textures.js';
import { GATHER_SPOTS, MIST_R } from '../game/gathering.js';
import { createGatherLayer, buildDecor } from './gatherLayer.js';
import { t } from '../i18n/i18n.js';
import { buildSnowfall, buildXmasExtras } from './xmasDecor.js';

const MIST_COLOR = 0x1c2a33;

/**
 * 迷霧森林（mist_forest）：從中央營火走進來的獨立區域。
 * 地上有蘑菇、果實、野花，晚上還有螢火蟲和甲蟲；走近就自動採進採集籃。
 * 每個人的採集點各自分開（伺服器記錄），採過的幾小時後長回來。
 */
export function createMistForestRoom() {
  const group = new THREE.Group();
  const snowfall = buildSnowfall(); // 🌨️ 聖誕期間飄雪（作者 11/16）
  group.add(snowfall.obj);
  group.name = 'mist_forest';
  const rand = seededRandom(1104);
  const occluders = [];
  const colliders = [];

  // 燈光：淡淡的月光＋霧裡的藍綠色
  group.add(new THREE.HemisphereLight(0x8fb0c8, 0x24301f, 1.25));
  const moon = new THREE.DirectionalLight(0xbfd4ff, 0.85);
  moon.position.set(-10, 20, 8);
  group.add(moon);

  // 地面：長滿青苔的圓形空地
  const ground = new THREE.Mesh(new THREE.CircleGeometry(MIST_R + 14, 48), new THREE.MeshStandardMaterial({ color: 0x2c3f2c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const moss = new THREE.Mesh(new THREE.CircleGeometry(MIST_R, 40), new THREE.MeshStandardMaterial({ color: 0x3a5236, roughness: 1 }));
  moss.rotation.x = -Math.PI / 2;
  moss.position.y = 0.005;
  group.add(moss);
  // 入口小徑
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9), new THREE.MeshStandardMaterial({ color: 0x5a4a36, roughness: 1 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, MIST_R - 4);
  group.add(path);

  // 樹：外圈一大片（擋住邊界）＋裡面零星幾棵（用 InstancedMesh 省效能）
  const trees = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + rand() * 0.08;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.16) continue; // 入口留空
    trees.push({ x: Math.sin(a) * (MIST_R + 1 + rand() * 6), z: Math.cos(a) * (MIST_R + 1 + rand() * 6), s: 1 + rand() * 0.8 });
  }
  const free = (x, z, r) => GATHER_SPOTS.filter((p) => p.room === 'mist_forest').every((p) => Math.hypot(p.x - x, p.z - z) > r) && Math.hypot(x, z) > 3.2 && !(Math.abs(x) < 1.6 && z > 4);
  for (let i = 0, tries = 0; i < 14 && tries < 400; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 4 + rand() * (MIST_R - 5.5);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (!free(x, z, 1.8) || trees.some((tr) => Math.hypot(tr.x - x, tr.z - z) < 2.5)) continue;
    trees.push({ x, z, s: 0.8 + rand() * 0.5, inner: true });
    colliders.push({ x, z, r: 0.45 });
    i++;
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.35, 4, 7);
  const leafGeo = new THREE.ConeGeometry(1.6, 4.2, 7);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, lowpoly(0x3d2c22), trees.length);
  const leafMesh = new THREE.InstancedMesh(leafGeo, lowpoly(0x1f3a2c), trees.length * 2);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  trees.forEach((tr, i) => {
    sc.setScalar(tr.s);
    m4.compose(pos.set(tr.x, 2 * tr.s, tr.z), q, sc);
    trunkMesh.setMatrixAt(i, m4);
    m4.compose(pos.set(tr.x, 4.6 * tr.s, tr.z), q, sc);
    leafMesh.setMatrixAt(i * 2, m4);
    m4.compose(pos.set(tr.x, 6.6 * tr.s, tr.z), q, sc.setScalar(tr.s * 0.72));
    leafMesh.setMatrixAt(i * 2 + 1, m4);
  });
  trunkMesh.castShadow = leafMesh.castShadow = true;
  group.add(trunkMesh, leafMesh);
  occluders.push(trunkMesh);

  // 🎄 作者 11/18：迷霧森林也有聖誕風，燈少少的、保留安靜的迷霧感
  //   裡面零星的大樹掛暖黃小燈球、綁紅緞帶；步道旁幾棵小聖誕樹
  const xmasTrees = [];
  for (let i = 0, tries = 0; i < 5 && tries < 300; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 3.8 + rand() * (MIST_R - 5);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (!free(x, z, 1.4) || trees.some((tr) => Math.hypot(tr.x - x, tr.z - z) < 2.2) || xmasTrees.some((p) => Math.hypot(p.x - x, p.z - z) < 3.5)) continue;
    xmasTrees.push({ x, z, s: 0.8 + rand() * 0.25 });
    colliders.push({ x, z, r: 0.5 });
    i++;
  }
  const xmasDeco = buildXmasExtras({ trees: xmasTrees, glowTrees: trees.filter((tr) => tr.inner) });
  group.add(xmasDeco.group);

  // ⚡ 效能（11/27）：不會動的造景（樹墩、蘑菇圈、造景蘑菇野花、蕨類）先放進這一包，最後合成幾塊
  //   分成 6 塊扇形，各自合，鏡頭看不到的那幾塊就不用畫
  const SECT = 6;
  const sectors = Array.from({ length: SECT }, () => new THREE.Group());
  group.add(...sectors);
  const still = { add: (o) => sectors[Math.floor(((Math.atan2(o.position.x, o.position.z) / (Math.PI * 2)) + 1) * SECT) % SECT].add(o) };
  // 中央：長青苔的大樹墩＋發光小蘑菇圈
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 12), lowpoly(0x5a4030));
  stump.position.y = 0.35;
  still.add(stump);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.04, 12), lowpoly(0x8a6a48));
  top.position.y = 0.72;
  still.add(top);
  colliders.push({ x: 0, z: 0, r: 1.1 });
  const ringGlow = new THREE.MeshBasicMaterial({ color: 0x9ff0e0 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), ringGlow);
    m.position.set(Math.sin(a) * 1.6, 0.02, Math.cos(a) * 1.6);
    still.add(m);
  }
  const sign = makeSign(t('🍄 迷霧森林'), { height: 0.3 });
  sign.position.set(0, 1.9, 0);
  group.add(sign);
  const exitSign = makeSign(t('🔥 回營火'), { height: 0.26 });
  exitSign.position.set(1.5, 2.3, MIST_R - 0.2); // 放在小徑旁邊，不要擋住剛進來的鏡頭
  group.add(exitSign);

  // 霧裡飄的光點（晚上變成螢火蟲）
  // ⚡ 40 顆光點用同一個 InstancedMesh 一次畫完
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.5, fog: false });
  const MOTE_N = 40;
  const moteMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 4), moteMat, MOTE_N);
  moteMesh.frustumCulled = false;
  const motes = [];
  for (let i = 0; i < MOTE_N; i++) motes.push({ x: (rand() - 0.5) * MIST_R * 1.8, z: (rand() - 0.5) * MIST_R * 1.8, y: 0.5 + rand() * 2.2, p: rand() * 6 });
  const moteM4 = new THREE.Matrix4();
  group.add(moteMesh);

  // ---------- 造景：到處都是可愛的蘑菇、野花、小樹叢（不能採；能採的地上有發光的圈圈） ----------
  const spotList = GATHER_SPOTS.filter((p) => p.room === 'mist_forest');
  for (let i = 0, tries = 0; i < 46 && tries < 900; tries++) {
    const a = rand() * Math.PI * 2;
    const r = 2.4 + rand() * (MIST_R - 3);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (spotList.some((p) => Math.hypot(p.x - x, p.z - z) < 1.5) || (Math.abs(x) < 1.3 && z > 4) || colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.6)) continue;
    const d = buildDecor(['mush', 'flower', 'fruit', 'mush', 'flower'][i % 5], rand);
    d.position.set(x, 0, z);
    d.rotation.y = rand() * Math.PI * 2;
    d.scale.setScalar(0.85 + rand() * 0.5);
    still.add(d);
    i++;
  }
  // 蕨類小草叢
  const fern = lowpoly(0x2f5a3a);
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const r = 3 + rand() * (MIST_R - 2.5);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.18 + rand() * 0.12, 0.35 + rand() * 0.25, 5), fern);
    f.position.set(Math.sin(a) * r, 0.15, Math.cos(a) * r);
    still.add(f);
  }
  for (const sg of sectors) mergeStatic(sg, undefined, { keepShadow: true });

  // ---------- 採集點（每個人各自的） ----------
  const gather = createGatherLayer(group, 'mist_forest', rand);

  // ✨ 找金松果：迷霧森林也會冒（作者 11/28）
  const mini = buildMiniLayer();
  group.add(mini.group);

  const resolveCollision = makeResolver(colliders, { type: 'circle', r: MIST_R });

  return {
    id: 'mist_forest',
    label: t('🍄 迷霧森林'),
    group,
    fog: new THREE.FogExp2(MIST_COLOR, 0.045),
    background: new THREE.Color(MIST_COLOR),
    outdoor: true,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: MIST_R - 0.4, r: 0.8, label: t('回到營火') }],
    spawn: { x: 0, z: MIST_R - 2.4, ry: Math.PI, camYaw: 0, camPitch: 0.42 },
    cameraDistance: 6,
    audio: { fire: 0, wind: 0.7, ambient: 1, water: 0, music: 0.45, song: 0 },
    resolveCollision,
    gather,
    mini,

    onAction(name, actions) {
      if (actions.state !== 'free') return false;
      if (name === 'roast') {
        actions.hud.toast(t('森林裡不能生火，回營火再烤棉花糖吧 🔥'));
        return true;
      }
      if (name === 'interact') {
        if (gather.tryPick(actions) || gather.tryCatch(actions)) return true;
        actions.hud.toast(t('走到發光圈圈按 E 採摘 🧺　蟲蟲用捕蟲網 🦋'));
        return true;
      }
      return false;
    },

    prompt(actions) {
      return gather.prompt(actions);
    },

    /** 手機的互動按鈕：採集點旁邊變「採摘」、蟲蟲在旁邊變「捕捉」 */
    interactHint(actions) {
      if (gather.spotNear(actions)) return ['🧺', t('採摘')];
      return gather.bugNear(actions) ? ['🦋', t('捕捉')] : null;
    },

    update(dt, time, _camera, actions) {
      snowfall.update(dt, time, _camera?.position);
      xmasDeco.update(dt, time);
      for (let i = 0; i < MOTE_N; i++) {
        const u = motes[i];
        moteM4.makeTranslation(u.x + Math.sin(time * 0.3 + u.p) * 0.6, u.y + Math.sin(time * 0.7 + u.p) * 0.25, u.z + Math.cos(time * 0.25 + u.p) * 0.6);
        moteMesh.setMatrixAt(i, moteM4);
      }
      moteMesh.instanceMatrix.needsUpdate = true;
      const night = gather.night;
      moteMat.color.setHex(night ? 0xd8ff7a : 0xe8f4ff);
      moteMat.opacity = night ? 0.6 + Math.sin(time * 2) * 0.3 : 0.4;
      gather.update(dt, time, actions);
      mini.update(dt, time);
    },
  };
}
