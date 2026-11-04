import * as THREE from 'three';
import { GATHER_SPOTS, GATHER_R, BUG_WANDER, BUG_CATCH_R, isNight } from '../game/gathering.js';
import { t } from '../i18n/i18n.js';

/**
 * 採集點（迷霧森林、湖邊共用）：
 * - 蘑菇、果實、野花、石頭、貝殼：走到旁邊按 E（手機按「🧺 採摘」），蹲下去拔起來
 * - 蟲蟲在空中飛：要有捕蟲網，走近按 E（手機按「🦋 捕捉」）
 * 每個人的採集點各自分開（伺服器記錄每個點長回來的時間）。
 */
const soft = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
const EYE = new THREE.MeshBasicMaterial({ color: 0x2a1a14 });
const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff9aa8, transparent: true, opacity: 0.85 });
const SPARK = new THREE.MeshBasicMaterial({ color: 0xffffff });

/** 小臉：兩顆豆豆眼＋腮紅（貼在 z 正面） */
function addFace(parent, y, z, s = 1) {
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014 * s, 8, 6), EYE);
    e.position.set(sx * 0.026 * s, y, z);
    parent.add(e);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.014 * s, 10), BLUSH);
    b.position.set(sx * 0.046 * s, y - 0.016 * s, z + 0.001);
    parent.add(b);
  }
}

/** 一叢圓滾滾的小蘑菇（傘蓋有白點點、菇柄上有小臉） */
function buildMushSpot(rand) {
  const g = new THREE.Group();
  const caps = [0xe5544a, 0xb07a52, 0xf2c14e, 0xc9a0dc, 0xf3a6c0];
  const dot = soft(0xfff6ea);
  const stemMat = soft(0xfff3e2);
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const s = i === 0 ? 1.25 : 0.7 + rand() * 0.3;
    const m = new THREE.Group();
    m.position.set(i === 0 ? 0 : (rand() - 0.5) * 0.45, 0, i === 0 ? 0 : (rand() - 0.5) * 0.45);
    m.rotation.y = (rand() - 0.5) * 0.8;
    m.scale.setScalar(s);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.13, 12), stemMat);
    stem.position.y = 0.065;
    m.add(stem);
    addFace(m, 0.07, 0.058);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), soft(caps[Math.floor(rand() * caps.length)]));
    cap.position.y = 0.12;
    cap.scale.y = 0.85;
    m.add(cap);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.05 + rand() * 0.04;
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dot);
      d.position.set(Math.sin(a) * r, 0.12 + Math.sqrt(Math.max(0, 0.0144 - r * r)) * 0.85, Math.cos(a) * r);
      d.scale.y = 0.5;
      m.add(d);
    }
    g.add(m);
  }
  return { group: g, ripe: g };
}

/** 圓嘟嘟的小樹叢，掛著亮晶晶的果實（採過只剩樹叢） */
function buildFruitSpot(rand) {
  const g = new THREE.Group();
  const leaf = soft(0x4f8a4a);
  for (const [x, y, z, r] of [[0, 0.24, 0, 0.27], [0.2, 0.16, 0.06, 0.18], [-0.19, 0.16, -0.03, 0.19], [0.02, 0.14, 0.2, 0.15]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), leaf);
    b.position.set(x, y, z);
    g.add(b);
  }
  const ripe = new THREE.Group();
  const color = [0xe0443c, 0x5a6fd0, 0xe0457a, 0xf2a03a][Math.floor(rand() * 4)];
  const berry = soft(color, { roughness: 0.25, emissive: color, emissiveIntensity: 0.12 });
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const h = 0.14 + rand() * 0.24;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), berry);
    const r = 0.24 + rand() * 0.05;
    m.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    ripe.add(m);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4), SPARK);
    sp.position.copy(m.position).add(new THREE.Vector3(0.016, 0.018, 0.02));
    ripe.add(sp);
  }
  g.add(ripe);
  return { group: g, ripe };
}

/** 一小片野花：五片圓花瓣＋黃色花心（採過剩下葉子） */
function buildFlowerSpot(rand) {
  const g = new THREE.Group();
  const green = soft(0x5fa04f);
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), green);
    l.position.set((rand() - 0.5) * 0.36, 0.03, (rand() - 0.5) * 0.36);
    l.scale.set(1, 0.3, 1.8);
    l.rotation.y = rand() * 3;
    g.add(l);
  }
  const ripe = new THREE.Group();
  const colors = [0xffd84a, 0xb98ae0, 0xffffff, 0x8ec5f2, 0xf3a6c0, 0xff9a6a];
  const center = soft(0xffc23a);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    const h = 0.18 + rand() * 0.12;
    f.position.set((rand() - 0.5) * 0.36, h, (rand() - 0.5) * 0.36);
    f.rotation.set(-0.5 + rand() * 0.3, rand() * 6, 0);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, h, 5), green);
    st.position.y = -h / 2;
    f.add(st);
    const pm = soft(colors[Math.floor(rand() * colors.length)]);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6), pm);
      p.position.set(Math.sin(a) * 0.035, 0, Math.cos(a) * 0.035);
      p.scale.set(1, 0.35, 1);
      f.add(p);
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), center);
    c.position.y = 0.008;
    f.add(c);
    ripe.add(f);
  }
  g.add(ripe);
  return { group: g, ripe };
}

/** 湖邊的一小堆圓圓的石頭 */
function buildStoneSpot(rand) {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), soft(0x8a7a5e));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.012;
  g.add(sand);
  const ripe = new THREE.Group();
  const cs = [0xb8b8b0, 0x9a8a7a, 0xe8e8e0, 0x7ab0a8, 0xd8a090];
  for (let i = 0; i < 4; i++) {
    const r = 0.06 + rand() * 0.05;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), soft(cs[Math.floor(rand() * cs.length)], { roughness: 0.4 }));
    m.position.set((rand() - 0.5) * 0.45, r * 0.5, (rand() - 0.5) * 0.45);
    m.scale.y = 0.6;
    ripe.add(m);
  }
  // 最大那顆有小臉
  const big = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), soft(0xc8c0b0, { roughness: 0.4 }));
  big.position.y = 0.06;
  big.scale.y = 0.65;
  ripe.add(big);
  addFace(ripe, 0.07, 0.098, 1.1);
  g.add(ripe);
  return { group: g, ripe };
}

/** 湖邊的貝殼和一小段漂流木 */
function buildShellSpot(rand) {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), soft(0x8a7a5e));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.012;
  g.add(sand);
  const ripe = new THREE.Group();
  const cs = [0xffd6e0, 0xfff0d8, 0xf3c8a8];
  for (let i = 0; i < 3; i++) {
    const sh = new THREE.Group();
    const mat = soft(cs[i % 3], { roughness: 0.3, emissive: 0x332018, emissiveIntensity: 0.2 });
    for (let k = 0; k < 5; k++) {
      const rib = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat);
      rib.position.set((k - 2) * 0.022, 0.012, -Math.abs(k - 2) * 0.008);
      rib.scale.set(0.6, 0.45, 1.6);
      rib.rotation.y = (k - 2) * 0.3;
      sh.add(rib);
    }
    sh.position.set((rand() - 0.5) * 0.45, 0, (rand() - 0.5) * 0.45);
    sh.rotation.y = rand() * 6;
    ripe.add(sh);
  }
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.45, 8), soft(0xc8b098));
  wood.rotation.set(0, rand() * 3, Math.PI / 2);
  wood.position.y = 0.04;
  ripe.add(wood);
  g.add(ripe);
  return { group: g, ripe };
}

/** 飛來飛去的蟲蟲：白天是蝴蝶，晚上是會發光的螢火蟲 */
function buildBugSpot(rand) {
  const g = new THREE.Group();
  const ripe = new THREE.Group();
  const wingColors = [0xffb46b, 0x8ec5f2, 0xf3a6c0, 0xffe08a, 0xb98ae0];
  const wingMat = new THREE.MeshStandardMaterial({ color: wingColors[Math.floor(rand() * wingColors.length)], roughness: 0.5, side: THREE.DoubleSide, emissive: 0x111111 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), soft(0x3a2a1a));
  body.rotation.x = Math.PI / 2;
  ripe.add(body);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), wingMat);
    up.position.set(sx * 0.06, 0, 0.015);
    up.scale.set(1, 1.15, 1);
    const low = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), wingMat);
    low.position.set(sx * 0.045, 0, -0.045);
    w.add(up, low);
    w.rotation.x = -Math.PI / 2;
    ripe.add(w);
    wings.push({ w, sx });
  }
  // 晚上：屁股的光點＋光暈
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8ff7a, fog: false }));
  glow.position.z = -0.05;
  ripe.add(glow);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8ff7a, transparent: true, opacity: 0.45, depthWrite: false, fog: false }));
  halo.scale.setScalar(0.35);
  halo.position.z = -0.05;
  ripe.add(halo);
  g.add(ripe);
  return { group: g, ripe, bug: { wings, glow, halo, wingMat, phase: rand() * 6, speed: 0.35 + rand() * 0.25, r: 0.8 + rand() * (BUG_WANDER - 0.8) } };
}

const BUILDERS = { mush: buildMushSpot, fruit: buildFruitSpot, flower: buildFlowerSpot, bug: buildBugSpot, stone: buildStoneSpot, shell: buildShellSpot };

/** 造景用（不能採）：跟採集點長得一樣，但沒有發光的圈圈 */
export function buildDecor(type, rand) {
  return BUILDERS[type](rand).group;
}

export function createGatherLayer(group, roomId, rand) {
  const spots = [];
  GATHER_SPOTS.forEach((sp, i) => {
    if (sp.room !== roomId) return;
    const b = BUILDERS[sp.type](rand);
    b.group.position.set(sp.x, 0, sp.z);
    if (!b.bug) b.group.rotation.y = rand() * Math.PI * 2;
    group.add(b.group);
    let sparkle = null;
    if (!b.bug) {
      // 可以採的時候：地上一圈淡淡的光
      sparkle = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      sparkle.rotation.x = -Math.PI / 2;
      sparkle.position.set(sp.x, 0.03, sp.z);
      group.add(sparkle);
    }
    spots.push({ ...sp, i, ...b, sparkle, readyAt: 0, pos: new THREE.Vector3(sp.x, 1.2, sp.z) });
  });

  let night = isNight();
  let clockSkew = 0; // 伺服器時間 − 本機時間
  const now = () => Date.now() + clockSkew;
  const ready = (s) => s.readyAt <= now();
  let online = false;
  let hasNet = false;
  function refresh() {
    for (const s of spots) {
      const r = online && ready(s);
      s.ripe.visible = r;
      if (s.sparkle) s.sparkle.visible = r;
      if (s.bug) {
        s.bug.glow.visible = s.bug.halo.visible = night;
        s.bug.wingMat.emissive.setHex(night ? 0x223311 : 0x111111);
      }
    }
  }
  refresh();
  let busy = false;
  let checkTimer = 0;

  /** 離玩家最近、可以捕的蟲（水平距離） */
  function bugNear(p, r = BUG_CATCH_R) {
    let best = null;
    let bd = r;
    for (const s of spots) {
      if (!s.bug || !s.ripe.visible || s.anim) continue;
      const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** 離玩家最近、可以採的點 */
  function spotNear(p, r = GATHER_R + 0.35) {
    let best = null;
    let bd = r;
    for (const s of spots) {
      if (s.bug || !s.ripe.visible || s.anim) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** 拔起來的動畫：抖一抖 → 「啵」地拔出來往上跳 → 縮小飛進玩家懷裡 */
  const anims = [];
  function playPull(s, player, isBug) {
    if (s.anim) return;
    s.anim = { t: 0, isBug, player, from: s.ripe.position.clone(), base: s.ripe.scale.clone(), start: isBug ? 0.45 : 0.4 };
    anims.push(s);
  }

  function pick(s, actions, isBug) {
    busy = true;
    const face = Math.atan2(s.pos.x - actions.player.position.x, s.pos.z - actions.player.position.z);
    actions.perform(isBug ? 'catch' : 'pick', isBug ? 1.0 : 1.25, face);
    playPull(s, actions.player, isBug);
    return Promise.resolve(api.onGather?.(s.i))
      .then((res) => {
        if (res?.ok) {
          if (res.readyAt) s.readyAt = res.readyAt;
        } else if (s.anim) {
          s.anim.cancel = true; // 沒採成：放回去
          if (res?.readyAt) s.readyAt = res.readyAt;
        }
        return res;
      })
      .finally(() => {
        busy = false;
      });
  }

  const api = {
    get night() {
      return night;
    },
    get hasNet() {
      return hasNet;
    },
    set hasNet(v) {
      hasNet = !!v;
    },
    /** 除錯用：所有採集點 */
    spots,
    /** main.js 設定：採／捕的時候呼叫，回傳 Promise<伺服器回應> */
    onGather: null,
    /** main.js 設定：沒有捕蟲網時按捕捉 */
    onNoNet: null,
    setState({ ready: list, now: serverNow, night: n, net } = {}) {
      online = true;
      if (serverNow) clockSkew = serverNow - Date.now();
      if (typeof n === 'boolean') night = n;
      if (net != null) hasNet = !!net;
      for (const s of spots) s.readyAt = list?.[s.i] || 0;
      refresh();
    },
    setOffline() {
      online = false;
      refresh();
    },
    /** 身邊有沒有可以捕的蟲（手機按鈕、提示用） */
    bugNear: (actions) => (online ? bugNear(actions.player.position) : null),
    /** 按 E：捕最近的蟲 */
    tryCatch(actions) {
      const s = online && bugNear(actions.player.position);
      if (!s) return false;
      if (!hasNet) {
        api.onNoNet?.();
        return true;
      }
      if (!busy && actions.state === 'free') pick(s, actions, true);
      return true;
    },
    /** 身邊有沒有可以採的（手機按鈕、提示用） */
    spotNear: (actions) => (online ? spotNear(actions.player.position) : null),
    /** 按 E：採最近的 */
    tryPick(actions) {
      const s = online && spotNear(actions.player.position);
      if (!s) return false;
      if (!busy && actions.state === 'free') pick(s, actions, false);
      return true;
    },
    prompt(actions) {
      const p = actions.player.position;
      const bug = online && bugNear(p, BUG_CATCH_R + 0.6);
      if (bug) return hasNet ? t('<kbd>E</kbd> 🦋 用捕蟲網捕捉') : t('🦋 要有捕蟲網才能捕（按 <kbd>E</kbd> 看看）');
      if (online && spotNear(p)) return t('<kbd>E</kbd> 🧺 採摘');
      let best = null;
      let bd = 1.8;
      for (const s of spots) {
        if (s.bug) continue;
        const d = Math.hypot(p.x - s.x, p.z - s.z);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (!best) return null;
      if (!online) return t('連上伺服器才能採集喔');
      if (!ready(best)) {
        const h = Math.max(1, Math.ceil((best.readyAt - now()) / 3600000));
        return t('🌱 這裡剛採過，大約 {h} 小時後長回來', { h });
      }
      return null;
    },
    update(dt, time, actions) {
      for (const s of spots) {
        if (!s.ripe.visible) continue;
        if (s.sparkle) s.sparkle.material.opacity = 0.22 + Math.sin(time * 2.2 + s.i) * 0.12;
        if (s.bug) {
          // 繞著自己的點飄來飄去（8 字形），翅膀拍拍
          const b = s.bug;
          const a = time * b.speed + b.phase;
          const x = s.x + Math.sin(a) * b.r;
          const z = s.z + Math.sin(a * 2) * b.r * 0.55;
          const y = 1.1 + Math.sin(time * 1.7 + b.phase) * 0.35;
          const dx = x - s.pos.x;
          const dz = z - s.pos.z;
          s.pos.set(x, y, z);
          s.group.position.set(x, y, z);
          if (dx || dz) s.group.rotation.y = Math.atan2(dx, dz);
          const flap = Math.sin(time * 16 + b.phase) * 0.9;
          for (const w of b.wings) w.w.rotation.z = w.sx * flap;
          if (night) b.halo.material.opacity = 0.3 + Math.sin(time * 3 + b.phase) * 0.2;
        }
      }
      // 拔起來的動畫
      for (let i = anims.length - 1; i >= 0; i--) {
        const s = anims[i];
        const a = s.anim;
        if (!a) {
          anims.splice(i, 1);
          continue;
        }
        a.t += dt;
        const u = a.t - a.start; // 蹲下伸手之後才開始拔
        if (a.cancel || u > 0.75) {
          s.ripe.position.copy(a.from);
          s.ripe.scale.copy(a.base);
          s.ripe.rotation.z = 0;
          s.anim = null;
          anims.splice(i, 1);
          if (!a.cancel) s.ripe.visible = false;
          if (s.sparkle) s.sparkle.visible = s.ripe.visible;
          continue;
        }
        if (u < 0) {
          s.ripe.rotation.z = a.isBug ? 0 : Math.sin(a.t * 45) * 0.06 * (a.t / a.start); // 抓住、抖一抖
          continue;
        }
        if (a.isBug) {
          // 被網子罩住：縮小
          s.ripe.scale.copy(a.base).multiplyScalar(Math.max(0.01, 1 - u / 0.4));
          continue;
        }
        s.ripe.rotation.z = 0;
        if (u < 0.3) {
          // 啵！往上彈出來、稍微變大
          const k = u / 0.3;
          s.ripe.position.set(a.from.x, a.from.y + Math.sin(k * Math.PI * 0.5) * 0.45, a.from.z);
          s.ripe.scale.copy(a.base).multiplyScalar(1 + Math.sin(k * Math.PI) * 0.25);
        } else {
          // 飛進玩家懷裡、縮小
          const k = (u - 0.3) / 0.45;
          const pp = a.player.position;
          const lx = (pp.x - s.group.position.x) * k;
          const lz = (pp.z - s.group.position.z) * k;
          const c = Math.cos(-s.group.rotation.y);
          const sn = Math.sin(-s.group.rotation.y);
          s.ripe.position.set(a.from.x + lx * c - lz * sn, a.from.y + 0.45 + k * 0.2, a.from.z + lx * sn + lz * c);
          s.ripe.scale.copy(a.base).multiplyScalar(Math.max(0.01, 1 - k));
        }
      }
      // 每 0.5 秒看一次：白天晚上切換、長回來的點
      checkTimer -= dt;
      if (checkTimer > 0 || !online) return;
      checkTimer = 0.5;
      const n = isNight();
      if (n !== night) {
        night = n;
        refresh();
      }
      if (spots.some((s) => !s.anim && !s.ripe.visible && ready(s))) refresh(); // 長回來了
    },
  };
  return api;
}
