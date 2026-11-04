import * as THREE from 'three';
import { makeResolver, makeSign, lowpoly } from './shared.js';
import { seededRandom } from '../scene/textures.js';
import { GATHER_SPOTS, GATHER_R, MIST_R, isNight } from '../game/gathering.js';
import { t } from '../i18n/i18n.js';

const MIST_COLOR = 0x1c2a33;

/** 一叢小蘑菇 */
function buildMushSpot(rand) {
  const g = new THREE.Group();
  const caps = [0xd2453c, 0x9a6a44, 0xf3ecdf, 0xf0a83a];
  const stem = lowpoly(0xf3ecdf);
  for (let i = 0; i < 3; i++) {
    const s = 0.7 + rand() * 0.5;
    const x = (rand() - 0.5) * 0.35;
    const z = (rand() - 0.5) * 0.35;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.045 * s, 0.16 * s, 6), stem);
    st.position.set(x, 0.08 * s, z);
    g.add(st);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lowpoly(caps[Math.floor(rand() * caps.length)]));
    cap.position.set(x, 0.15 * s, z);
    cap.scale.y = 0.7;
    g.add(cap);
  }
  return { group: g, ripe: g, leftover: null };
}

/** 結果實的矮樹叢（採過只剩葉子） */
function buildFruitSpot(rand) {
  const g = new THREE.Group();
  const leaf = lowpoly(0x2f5a3a);
  for (const [x, y, z, r] of [[0, 0.22, 0, 0.3], [0.22, 0.16, 0.05, 0.2], [-0.2, 0.15, -0.04, 0.21]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leaf);
    b.position.set(x, y, z);
    g.add(b);
  }
  const ripe = new THREE.Group();
  const berry = new THREE.MeshStandardMaterial({ color: [0xe0443c, 0x4a5fa8, 0xd2456a][Math.floor(rand() * 3)], roughness: 0.4, emissive: 0x220808, emissiveIntensity: 0.3 });
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const h = 0.12 + rand() * 0.28;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), berry);
    m.position.set(Math.sin(a) * 0.27, h, Math.cos(a) * 0.24);
    ripe.add(m);
  }
  g.add(ripe);
  return { group: g, ripe, leftover: null };
}

/** 一小片野花（採過剩下葉子） */
function buildFlowerSpot(rand) {
  const g = new THREE.Group();
  const green = lowpoly(0x4f8a4a);
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 4), green);
    l.position.set((rand() - 0.5) * 0.4, 0.1, (rand() - 0.5) * 0.4);
    l.rotation.z = (rand() - 0.5) * 0.6;
    g.add(l);
  }
  const ripe = new THREE.Group();
  const colors = [0xffd84a, 0x8a5ac9, 0xffffff, 0x7ab8f2, 0xf3a6c0];
  for (let i = 0; i < 5; i++) {
    const x = (rand() - 0.5) * 0.4;
    const z = (rand() - 0.5) * 0.4;
    const h = 0.18 + rand() * 0.12;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, h, 4), green);
    st.position.set(x, h / 2, z);
    ripe.add(st);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.7, emissive: 0x222222, emissiveIntensity: 0.25 }));
    f.position.set(x, h, z);
    f.scale.y = 0.6;
    ripe.add(f);
  }
  g.add(ripe);
  return { group: g, ripe, leftover: null };
}

/** 晚上的蟲蟲：草叢上一閃一閃的光點（白天只有草叢） */
function buildBugSpot(rand) {
  const g = new THREE.Group();
  const grass = lowpoly(0x355f3a);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32 + rand() * 0.2, 3), grass);
    b.position.set((rand() - 0.5) * 0.5, 0.17, (rand() - 0.5) * 0.5);
    b.rotation.z = (rand() - 0.5) * 0.5;
    g.add(b);
  }
  const ripe = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: 0xd8ff7a, transparent: true, opacity: 0.9, fog: false });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), glow);
    m.userData.phase = rand() * 6;
    m.userData.base = new THREE.Vector3((rand() - 0.5) * 0.6, 0.45 + rand() * 0.35, (rand() - 0.5) * 0.6);
    m.position.copy(m.userData.base);
    ripe.add(m);
  }
  g.add(ripe);
  return { group: g, ripe, leftover: null, bug: true };
}

const BUILDERS = { mush: buildMushSpot, fruit: buildFruitSpot, flower: buildFlowerSpot, bug: buildBugSpot };

/**
 * 迷霧森林（mist_forest）：從中央營火走進來的獨立區域。
 * 地上有蘑菇、果實、野花，晚上還有螢火蟲和甲蟲；走近就自動採進採集籃。
 * 每個人的採集點各自分開（伺服器記錄），採過的幾小時後長回來。
 */
export function createMistForestRoom() {
  const group = new THREE.Group();
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
  const free = (x, z, r) => GATHER_SPOTS.every((p) => Math.hypot(p.x - x, p.z - z) > r) && Math.hypot(x, z) > 3.2 && !(Math.abs(x) < 1.6 && z > 4);
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

  // 中央：長青苔的大樹墩＋發光小蘑菇圈
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 12), lowpoly(0x5a4030));
  stump.position.y = 0.35;
  group.add(stump);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.04, 12), lowpoly(0x8a6a48));
  top.position.y = 0.72;
  group.add(top);
  colliders.push({ x: 0, z: 0, r: 1.1 });
  const ringGlow = new THREE.MeshBasicMaterial({ color: 0x9ff0e0 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), ringGlow);
    m.position.set(Math.sin(a) * 1.6, 0.02, Math.cos(a) * 1.6);
    group.add(m);
  }
  const sign = makeSign(t('🍄 迷霧森林'), { height: 0.3 });
  sign.position.set(0, 1.9, 0);
  group.add(sign);
  const exitSign = makeSign(t('🔥 回營火'), { height: 0.26 });
  exitSign.position.set(1.5, 2.3, MIST_R - 0.2); // 放在小徑旁邊，不要擋住剛進來的鏡頭
  group.add(exitSign);

  // 霧裡飄的光點（晚上變成螢火蟲）
  const motes = [];
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.5, fog: false });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), moteMat);
    m.userData = { x: (rand() - 0.5) * MIST_R * 1.8, z: (rand() - 0.5) * MIST_R * 1.8, y: 0.5 + rand() * 2.2, p: rand() * 6 };
    group.add(m);
    motes.push(m);
  }

  // ---------- 採集點 ----------
  const spots = GATHER_SPOTS.map((sp, i) => {
    const b = BUILDERS[sp.type](rand);
    b.group.position.set(sp.x, 0, sp.z);
    b.group.rotation.y = rand() * Math.PI * 2;
    group.add(b.group);
    // 可以採的時候：上面一圈淡淡的光
    const sparkle = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    sparkle.rotation.x = -Math.PI / 2;
    sparkle.position.set(sp.x, 0.03, sp.z);
    group.add(sparkle);
    return { ...sp, i, ...b, sparkle, readyAt: 0 };
  });

  let night = isNight();
  /** 伺服器時間 − 本機時間（毫秒） */
  let clockSkew = 0;
  const now = () => Date.now() + clockSkew;
  const ready = (s) => (s.bug ? night : true) && s.readyAt <= now();
  let online = false;
  function refreshSpots() {
    for (const s of spots) {
      const r = online && ready(s);
      s.ripe.visible = r;
      s.sparkle.visible = r;
    }
  }
  refreshSpots();

  const resolveCollision = makeResolver(colliders, { type: 'circle', r: MIST_R });
  let busy = false;
  let checkTimer = 0;

  return {
    id: 'mist_forest',
    label: t('🍄 迷霧森林'),
    group,
    fog: new THREE.FogExp2(MIST_COLOR, 0.055),
    background: new THREE.Color(MIST_COLOR),
    outdoor: true,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: MIST_R - 0.4, r: 0.8, label: t('回到營火') }],
    spawn: { x: 0, z: MIST_R - 2.4, ry: Math.PI, camYaw: 0, camPitch: 0.42 },
    cameraDistance: 6,
    audio: { fire: 0, wind: 0.7, ambient: 1, water: 0, music: 0.45, song: 0 },
    resolveCollision,
    /** main.js 設定：走到可以採的點時呼叫，回傳 Promise<伺服器回應> */
    onGather: null,

    /** 伺服器給的每個點長回來的時間 */
    setState({ ready: list, now: serverNow, night: n } = {}) {
      online = true;
      if (serverNow) clockSkew = serverNow - Date.now();
      if (typeof n === 'boolean') night = n;
      (list ?? []).forEach((at, i) => spots[i] && (spots[i].readyAt = at || 0));
      refreshSpots();
    },
    /** 單人模式：不能採（沒地方記） */
    setOffline() {
      online = false;
      refreshSpots();
    },

    onAction(name, actions) {
      if (actions.state !== 'free') return false;
      if (name === 'roast') {
        actions.hud.toast(t('森林裡不能生火，回營火再烤棉花糖吧 🔥'));
        return true;
      }
      if (name === 'interact') {
        actions.hud.toast(t('走到發光的蘑菇、果實、野花旁邊，就會自動採進採集籃 🧺'));
        return true;
      }
      return false;
    },

    prompt(actions) {
      const p = actions.player.position;
      let best = null;
      let bd = 1.8;
      for (const s of spots) {
        const d = Math.hypot(p.x - s.x, p.z - s.z);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (!best) return null;
      if (!online) return t('連上伺服器才能採集喔');
      if (best.bug && !night) return t('🌙 晚上（6 點以後）這裡會有螢火蟲和甲蟲');
      if (!ready(best)) {
        const h = Math.max(1, Math.ceil((best.readyAt - now()) / 3600000));
        return t('🌱 這裡剛採過，大約 {h} 小時後長回來', { h });
      }
      return null;
    },

    update(dt, time, _camera, actions) {
      for (const m of motes) {
        const u = m.userData;
        m.position.set(u.x + Math.sin(time * 0.3 + u.p) * 0.6, u.y + Math.sin(time * 0.7 + u.p) * 0.25, u.z + Math.cos(time * 0.25 + u.p) * 0.6);
      }
      moteMat.color.setHex(night ? 0xd8ff7a : 0xe8f4ff);
      moteMat.opacity = night ? 0.6 + Math.sin(time * 2) * 0.3 : 0.4;
      for (const s of spots) {
        if (!s.ripe.visible) continue;
        s.sparkle.material.opacity = 0.22 + Math.sin(time * 2.2 + s.i) * 0.12;
        if (s.bug) {
          for (const m of s.ripe.children) {
            const b = m.userData.base;
            m.position.set(b.x + Math.sin(time * 1.3 + m.userData.phase) * 0.15, b.y + Math.sin(time * 2 + m.userData.phase) * 0.1, b.z + Math.cos(time * 1.1 + m.userData.phase) * 0.15);
            m.visible = Math.sin(time * 3 + m.userData.phase) > -0.4;
          }
        }
      }
      // 每 0.2 秒看一次：靠近可以採的點就自動採
      checkTimer -= dt;
      if (checkTimer > 0 || busy || !online || !this.onGather) return;
      checkTimer = 0.2;
      // 白天晚上切換、長回來的點：每次都重新整理一下
      const n = isNight();
      if (n !== night) {
        night = n;
        refreshSpots();
      }
      const p = actions?.player?.position;
      if (!p) return;
      for (const s of spots) {
        if (!ready(s)) continue;
        if (!s.ripe.visible) refreshSpots();
        if (Math.hypot(p.x - s.x, p.z - s.z) > GATHER_R) continue;
        busy = true;
        Promise.resolve(this.onGather(s.i))
          .then((res) => {
            if (res?.readyAt) s.readyAt = res.readyAt;
            else if (res?.reason === 'notYet' && res.readyAt) s.readyAt = res.readyAt;
            refreshSpots();
          })
          .finally(() => {
            busy = false;
          });
        break;
      }
    },
  };
}
