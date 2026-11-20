/**
 * 🔥 營火河畔新玩法（作者 11/20，11/27 開）：🦆 迷你小鴨、🪨 打水漂（扁石頭堆、排行木牌、丟石頭的動畫）
 *   規則在 src/game/river.js；伺服器 skipThrow／duckFeed
 */
import * as THREE from 'three';
import { buildDuck, buildFlatStone } from './riverModels.js';
import { POND, pondQ, pondWorld } from '../game/pondShape.js';
import { POND_WATER_Y } from './pond.js';
import { RIVER_FROM, SKIP_SWEET } from '../game/river.js';
import { isOpen } from '../game/dailySpecial.js';
import { t } from '../i18n/i18n.js';
import { lowpoly } from './shared.js';
import { mergeStatic } from '../scene/mergeStatic.js';

const WY = POND_WATER_Y;
export const riverOpen = () => isOpen({ from: RIVER_FROM });

/** 排行木牌的字（canvas） */
function boardTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 340;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (top = []) => {
    const g = c.getContext('2d');
    g.fillStyle = '#6b4a2e';
    g.fillRect(0, 0, 512, 340);
    g.fillStyle = '#7d5836';
    for (let y = 0; y < 340; y += 34) g.fillRect(0, y, 512, 30);
    g.fillStyle = '#ffe9c8';
    g.textAlign = 'center';
    g.font = '700 40px "Noto Sans TC", "PingFang TC", sans-serif';
    g.fillText(t('🪨 今天打水漂排行'), 256, 52);
    g.font = '600 34px "Noto Sans TC", "PingFang TC", sans-serif';
    if (!top.length) g.fillText(t('還沒有人丟，快來當第一名！'), 256, 180);
    top.slice(0, 5).forEach((e, i) => {
      g.textAlign = 'left';
      g.fillText(`${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${String(e.name).slice(0, 10)}`, 40, 110 + i * 48);
      g.textAlign = 'right';
      g.fillText(t('{n} 下', { n: e.b }), 472, 110 + i * 48);
    });
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}

export function createRiverFun(group) {
  const root = new THREE.Group();
  root.name = 'riverFun';
  group.add(root);

  // ---------- 🦆 河裡的鴨媽媽＋3 隻迷你小鴨（一直沿著湖繞圈） ----------
  const family = [buildDuck(true), buildDuck(), buildDuck(), buildDuck()].map((d) => mergeStatic(d)); // ⚡ 小零件合起來
  for (const d of family) root.add(d);
  const swimAt = (a, k = 0.62) => pondWorld(Math.cos(a) * POND.a * k, Math.sin(a) * POND.b * k);

  // ---------- 🪨 扁石頭堆（發光）＋排行木牌 ----------
  const [px, pz] = pondWorld(3.9, -4.0);
  const pile = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const s = buildFlatStone();
    s.position.set((Math.random() - 0.5) * 0.5, 0.03 + (i % 3) * 0.03, (Math.random() - 0.5) * 0.4);
    s.rotation.y = Math.random() * 3;
    pile.add(s);
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.25, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  pile.add(glow);
  pile.position.set(px, 0, pz);
  mergeStatic(pile, (m) => m === glow);
  root.add(pile);
  // 作者 11/20：排行木牌放在池子另一頭（營火河畔招牌旁邊）、小一點、矮一點
  const [bx, bz] = pondWorld(5.8, 5.4);
  const board = boardTexture();
  const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: board.tex }));
  signBoard.position.set(bx, 0.72, bz);
  signBoard.lookAt(0, 0.72, 0); // 面向營火
  root.add(signBoard);
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), signBoard.getWorldDirection(new THREE.Vector3())).normalize();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.72, 6), lowpoly(0x5b3f28));
    post.position.set(bx, 0.36, bz).addScaledVector(side, s * 0.4);
    post.position.addScaledVector(signBoard.getWorldDirection(new THREE.Vector3()), -0.02);
    root.add(post);
  }

  // ---------- 丟出去的石頭（自己的、別人的） ----------
  const flying = [];
  const rings = Array.from({ length: 14 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.visible = false; // ⚡ 沒在用的水波不畫
    root.add(r);
    return { r, t: 1 };
  });
  const ring = (x, z) => {
    const q = rings.find((x2) => x2.t >= 1) ?? rings[0];
    q.t = 0;
    q.r.visible = true;
    q.r.position.set(x, WY + 0.01, z);
  };
  /** 從 (x,z) 往池子丟一顆，跳 b 下 */
  function throwStone(x, z, b, onBounce) {
    const dx = POND.x - x;
    const dz = POND.z - z;
    const d = Math.hypot(dx, dz) || 1;
    const dir = [dx / d, dz / d];
    // 落點一個一個沿著方向，越後面越近；停在池子裡
    const pts = [];
    // 第一下落在水邊往裡一點的地方（站得離水遠也一樣）
    let s = 0.4;
    while (s < 14 && pondQ(x + dir[0] * s, z + dir[1] * s) > 0.9) s += 0.2;
    s += 0.6;
    let step = 1.1;
    for (let i = 0; i < b; i++) {
      const p = [x + dir[0] * s, z + dir[1] * s];
      if (pondQ(p[0], p[1]) > 0.97) break;
      pts.push(p);
      step *= 0.86;
      s += Math.max(0.25, step);
    }
    if (!pts.length) pts.push([x + dir[0] * s, z + dir[1] * s]);
    const mesh = buildFlatStone();
    root.add(mesh);
    flying.push({ mesh, from: [x, z], pts, i: 0, t: 0, onBounce });
  }

  // ---------- 🦆 跟著人走的迷你小鴨（自己、別人） ----------
  /** id → { mesh, until, x, z, ry, hop } */
  const followers = new Map();
  const edgeNear = (x, z) => {
    const a = Math.atan2(z - POND.z, x - POND.x);
    const [ex, ez] = swimAt(a, 1.05);
    return [ex, ez];
  };
  function setDuck(id, until, near) {
    let f = followers.get(id);
    if (!until || until <= Date.now()) {
      if (f) root.remove(f.mesh), followers.delete(id);
      return;
    }
    if (!f) {
      const mesh = mergeStatic(buildDuck());
      root.add(mesh);
      // 從河邊離那個人最近的地方跑過來
      const [ex, ez] = near ? edgeNear(near.x, near.z) : swimAt(0, 1.05);
      f = { mesh, x: ex, z: ez, ry: 0, hop: Math.random() * 6 };
      followers.set(id, f);
    }
    f.until = until;
  }

  // ---------- 🪨 力道條（按 F 開始、再按 F 丟） ----------
  const meter = document.createElement('div');
  meter.className = 'skip-meter';
  meter.hidden = true;
  meter.innerHTML = `<div class="sm-title">${t('🪨 看準綠色，按 F 丟！')}</div><div class="sm-bar"><i class="sm-good" style="left:${SKIP_SWEET[0] * 100}%;width:${(SKIP_SWEET[1] - SKIP_SWEET[0]) * 100}%"></i><b class="sm-mark"></b></div>`;
  document.getElementById('ui')?.appendChild(meter);
  const mark = meter.querySelector('.sm-mark');
  let aiming = null; // { t }

  return {
    root,
    riverOpen,
    /** 在扁石頭堆旁邊嗎 */
    nearPile: (p) => riverOpen() && Math.hypot(p.x - px, p.z - pz) < 1.5,
    /** 在河邊（餵鴨子的距離）嗎 */
    nearBank: (p) => {
      if (!riverOpen()) return false;
      const q = pondQ(p.x, p.z);
      return q > 0.9 && q < 1.4;
    },
    get aiming() {
      return !!aiming;
    },
    startAim() {
      aiming = { t: 0 };
      meter.hidden = false;
    },
    /** 停下力道條，回傳 p（0～1） */
    stopAim() {
      if (!aiming) return null;
      const p = Math.abs(((aiming.t * 0.9) % 2) - 1); // 0→1→0 來回
      aiming = null;
      meter.hidden = true;
      return 1 - p;
    },
    cancelAim() {
      aiming = null;
      meter.hidden = true;
    },
    throwStone,
    setBoard: (top) => board.draw(top),
    setDuck,
    clearDucks() {
      for (const id of [...followers.keys()]) setDuck(id, 0);
    },
    /** posOf(id) → 那個人現在的位置（不在這個地方回傳 null） */
    update(dt, time, posOf) {
      root.visible = riverOpen();
      if (!root.visible) return;
      // 鴨子一家：鴨媽媽在前，小鴨排一排跟在後面
      family.forEach((d, i) => {
        const a = time * 0.06 - i * 0.075;
        const [x, z] = swimAt(a);
        const [x2, z2] = swimAt(a + 0.01);
        d.position.set(x, WY - 0.02 + Math.sin(time * 3 + i) * 0.008, z);
        d.rotation.y = Math.atan2(x2 - x, z2 - z);
      });
      glow.material.opacity = 0.18 + Math.sin(time * 2.4) * 0.08;
      // 力道條
      if (aiming) {
        aiming.t += dt;
        const p = 1 - Math.abs(((aiming.t * 0.9) % 2) - 1);
        mark.style.left = `${p * 100}%`;
      }
      // 石頭飛、跳
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.t += dt;
        const seg = f.i === 0 ? 0.45 : 0.22;
        const a = f.i === 0 ? f.from : f.pts[f.i - 1];
        const b = f.pts[f.i];
        const u = Math.min(1, f.t / seg);
        const h = f.i === 0 ? 0.9 : 0.35 * Math.pow(0.85, f.i);
        f.mesh.position.set(a[0] + (b[0] - a[0]) * u, WY + (f.i === 0 ? 0.9 * (1 - u) : 0) + Math.sin(u * Math.PI) * h, a[1] + (b[1] - a[1]) * u);
        f.mesh.rotation.y += dt * 18;
        if (u >= 1) {
          ring(b[0], b[1]);
          f.onBounce?.(f.i + 1);
          f.i++;
          f.t = 0;
          if (f.i >= f.pts.length) {
            root.remove(f.mesh);
            flying.splice(i, 1);
          }
        }
      }
      for (const r of rings) {
        if (r.t >= 1) continue;
        r.t = Math.min(1, r.t + dt / 1.2);
        r.r.scale.setScalar(1 + r.t * 5);
        r.r.material.opacity = (1 - r.t) * 0.7;
        if (r.t >= 1) r.r.visible = false;
      }
      // 跟著人的小鴨：在腳邊後面一點、一跳一跳
      const now = Date.now();
      for (const [id, f] of followers) {
        if (f.until <= now) {
          setDuck(id, 0);
          continue;
        }
        const p = posOf(id);
        f.mesh.visible = !!p;
        if (!p) continue;
        const back = [p.x - Math.sin(p.ry ?? 0) * 0.55, p.z - Math.cos(p.ry ?? 0) * 0.55];
        const dx = back[0] - f.x;
        const dz = back[1] - f.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.12) {
          const sp = Math.min(d, dt * Math.max(2.2, d * 2.5));
          f.x += (dx / d) * sp;
          f.z += (dz / d) * sp;
          f.ry = Math.atan2(dx, dz);
        }
        f.hop += dt * (d > 0.12 ? 14 : 4);
        f.mesh.position.set(f.x, Math.abs(Math.sin(f.hop)) * (d > 0.12 ? 0.05 : 0.012), f.z);
        f.mesh.rotation.y = f.ry;
      }
    },
  };
}
