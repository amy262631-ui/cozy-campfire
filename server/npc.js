/**
 * 營地居民（電腦角色）：讓營地有生活感。
 *
 * 原則（誠實、不騙人）：
 *   - 名牌清楚標示「🏕️ 營地居民」，畫面上一看就知道不是真人
 *   - 不算在線人數、不出現在統計
 *   - 不留言、不掛繪馬、不疊石頭、不掛裝飾、釣到魚也不上排行或湖畔動態
 *   - 只做「看得到的日常」：添柴、烤棉花糖、打盹、看星星、參拜、釣魚、在各地點走動
 *
 * 由伺服器統一模擬，所以同一個分流的每個人看到的居民都一樣。
 */

import { POND, pondQ, pondLocal, pondWorld } from '../src/game/pondShape.js';
import { ENTRANCE_POS } from '../src/game/entrances.js';

const polar = (a, r) => ({ x: Math.sin(a) * r, z: Math.cos(a) * r });
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const jitter = (p, r = 0.4) => ({ x: p.x + rand(-r, r), z: p.z + rand(-r, r) });

/** 各地點的位置（與前端各房間的配置對應） */
const FIRE = { x: 0, z: 0 };
const PLACES = {
  forest_main: {
    fireSeat: () => polar(rand(0, Math.PI * 2), 1.95),
    fireRest: () => polar(rand(0, Math.PI * 2), rand(2.5, 3.1)),
    shrine: () => jitter(polar(-0.15, 11.2), 0.5),
    board: () => jitter(polar(2.1, 3.3), 0.3),
    tree: () => jitter(polar(0.5, 6.7), 0.6),
    cairns: () => jitter(polar(-0.66, 8.4), 0.6),
    meadow: () => pick([polar(-0.7, 5.8), polar(2.9, 6.2), polar(0.9, 5.4), polar(-3.0, 6.4)]),
    // 入口前 0.5 公尺（入口位置和前端共用 entrances.js）
    gate: {
      lake_dock: ENTRANCE_POS.lake_dock(-0.5),
      treehouse_music: ENTRANCE_POS.treehouse_music(-0.5),
      tent_social: ENTRANCE_POS.tent_social(-0.5),
    },
  },
  lake_dock: {
    spawn: { x: 0, z: 6 },
    gate: { forest_main: { x: 0, z: 7.6 } },
    fishSpots: [
      { x: 0, z: -5.6, face: Math.PI },
      { x: -2.6, z: 2.5, face: Math.PI },
      { x: 3.0, z: 2.6, face: Math.PI },
      { x: -5.2, z: 2.4, face: Math.PI },
    ],
    stroll: () => ({ x: rand(-6, 6), z: rand(3.6, 7) }),
  },
  treehouse_music: {
    spawn: { x: 0, z: 2.6 },
    gate: { forest_main: { x: 0, z: 3.4 } },
    spots: () => pick([{ x: 1.2, z: -1.0 }, { x: -1.7, z: 0.4 }, { x: 0.6, z: 1.6 }, { x: -1.0, z: -1.9 }, { x: 2.6, z: 0.6 }]),
  },
  tent_social: {
    spawn: { x: 0, z: 3.4 },
    gate: { forest_main: { x: 0, z: 3.9 } },
    seat: () => polar(rand(0, Math.PI * 2), 1.7),
  },
};
/** 從森林走進子房間後，在子房間的出生點出現；回森林時在入口前出現 */
const FOREST_RETURN = {
  lake_dock: ENTRANCE_POS.lake_dock(-2.4),
  treehouse_music: ENTRANCE_POS.treehouse_music(-2.4),
  tent_social: ENTRANCE_POS.tent_social(-2.4),
};

/** 居民名單：每個人有自己喜歡的地點和事情 */
export const RESIDENTS = [
  { key: 'oak', name: '撿柴的小橡', sp: 0, fur: 1, home: 'forest_main', likes: ['wood', 'roast', 'roast', 'tree', 'nap'] },
  { key: 'le', name: '釣魚的阿樂', sp: 5, fur: 3, home: 'lake_dock', likes: ['fish', 'fish', 'fish', 'stroll', 'visitForest'] },
  { key: 'pudding', name: '愛睡的布丁', sp: 4, fur: 0, home: 'forest_main', likes: ['nap', 'nap', 'roast', 'stars'] },
  { key: 'mimi', name: '樹屋的咪咪', sp: 1, fur: 2, home: 'treehouse_music', likes: ['hang', 'hang', 'wave', 'visitTent'] },
  { key: 'lulu', name: '看星星的露露', sp: 3, fur: 0, home: 'forest_main', likes: ['stars', 'stars', 'pray', 'board', 'cairns'] },
  { key: 'song', name: '守林人阿松', sp: 2, fur: 4, home: 'forest_main', likes: ['wood', 'patrol', 'visitLake', 'visitTent', 'roast', 'pray'] },
];

const WALK_SPEED = 1.25;

/**
 * 建立一個分流的居民。
 * @param {object} api 伺服器提供的工具
 *   api.ch                   分流編號
 *   api.room(id)             取得房間 { players: Map, npcs: Map }
 *   api.emit(roomId, ev, d)  通知某個房間
 *   api.addWood(npc)         添柴（伺服器更新火勢並通知）
 *   api.packFish()           隨機一條小魚（給「舉魚」的畫面用，不上排行）
 */
export function createResidents(api) {
  const list = RESIDENTS.map((def) => {
    const n = {
      id: `npc-${api.ch}-${def.key}`,
      npc: true,
      def,
      name: `🏕️ ${def.name}`,
      fur: def.fur,
      sp: def.sp,
      rw: 0,
      room: def.home,
      x: 0,
      z: 0,
      ry: 0,
      a: 'idle',
      d: 0,
      e: 0,
      dirty: true,
      plan: [],
      step: null,
      wait: rand(0, 4),
    };
    const start = def.home === 'forest_main' ? PLACES.forest_main.fireRest() : PLACES[def.home].spawn;
    n.x = start.x;
    n.z = start.z;
    api.room(n.room).npcs.set(n.id, n);
    return n;
  });

  /** 從 A 走到 B：在森林裡，路線會繞過營火 */
  function route(n, to) {
    const pts = [];
    if (n.room === 'forest_main') {
      const ax = n.x, az = n.z;
      const dx = to.x - ax, dz = to.z - az;
      const len2 = dx * dx + dz * dz || 1;
      const u = Math.max(0, Math.min(1, -(ax * dx + az * dz) / len2));
      const cx = ax + dx * u, cz = az + dz * u;
      if (Math.hypot(cx, cz) < 1.8) {
        const a = Math.atan2(ax, az) + (Math.atan2(to.x, to.z) - Math.atan2(ax, az) > 0 ? 1.2 : -1.2);
        pts.push(polar(a, 2.9));
      }
    }
    pts.push(to);
    return pts.map((p) => ({ type: 'go', to: p }));
  }

  /** 從 A 到 B 若會經過湖：回傳沿著湖岸外圈的轉折點 */
  function aroundPond(a, b) {
    let hits = false;
    for (let i = 1; i < 20; i++) {
      const u = i / 20;
      if (pondQ(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, 0.7) < 1) {
        hits = true;
        break;
      }
    }
    if (!hits) return [];
    const ang = (p) => {
      const [lp, lq] = pondLocal(p.x, p.z);
      return Math.atan2(lq / POND.b, lp / POND.a);
    };
    const t0 = ang(a);
    let t1 = ang(b);
    // 兩個方向都算，避開靠營火那一側（湖和營火之間比較窄），除非另一邊遠很多
    let d = t1 - t0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const other = d > 0 ? d - Math.PI * 2 : d + Math.PI * 2;
    const passesFire = (span) => {
      for (let i = 1; i < 10; i++) if (Math.sin(t0 + (span * i) / 10) < -0.8) return true;
      return false;
    };
    const span = passesFire(d) && !passesFire(other) && Math.abs(other) < Math.abs(d) * 2.2 ? other : d;
    const steps = Math.max(2, Math.ceil(Math.abs(span) / 0.45));
    const out = [];
    for (let i = 1; i < steps; i++) {
      const th = t0 + (span * i) / steps;
      const [x, z] = pondWorld(Math.cos(th) * (POND.a + 1.1), Math.sin(th) * (POND.b + 1.0));
      out.push({ x, z });
    }
    return out;
  }

  const act = (a, min, max, extra = {}) => ({ type: 'act', a, t: rand(min, max), ...extra });

  /** 換到另一個房間：走到入口 → 消失 → 在新房間出現 */
  function travel(n, to) {
    const gate = PLACES[n.room].gate?.[to];
    if (!gate) return [];
    return [...route(n, gate), { type: 'room', to }];
  }

  /** 依喜好挑下一件事 */
  function nextPlan(n) {
    const F = PLACES.forest_main;
    const like = pick(n.def.likes);
    // 不在家：做完一兩件事就回家
    if (n.room !== n.def.home && Math.random() < 0.35) {
      return n.room === 'forest_main' ? travel(n, n.def.home) : travel(n, 'forest_main');
    }
    if (n.room === 'forest_main') {
      switch (like) {
        case 'wood': {
          const seat = F.fireSeat();
          return [...route(n, seat), { type: 'face', to: FIRE }, act('addWood', 1.8, 1.8, { wood: true }), act('idle', 2, 5)];
        }
        case 'roast': {
          const seat = F.fireSeat();
          return [...route(n, seat), { type: 'face', to: FIRE }, act('roast', 15, 35, { roast: true })];
        }
        case 'nap': {
          const p = F.fireRest();
          return [...route(n, p), { type: 'face', to: FIRE }, act('blanket', 40, 120)];
        }
        case 'stars': {
          const p = F.meadow();
          return [...route(n, p), act('stargaze', 25, 60)];
        }
        case 'pray': {
          const p = F.shrine();
          return [...route(n, p), { type: 'face', to: polar(-0.15, 13.2) }, act('pray', 3, 3), act('idle', 3, 8)];
        }
        case 'board': {
          const p = F.board();
          return [...route(n, p), { type: 'face', to: polar(2.1, 4.4) }, act('idle', 6, 14)];
        }
        case 'tree': {
          const p = F.tree();
          return [...route(n, p), { type: 'face', to: polar(0.5, 8.4) }, act('idle', 6, 14)];
        }
        case 'cairns': {
          const p = F.cairns();
          return [...route(n, p), act('pray', 3, 3), act('idle', 4, 8)];
        }
        case 'patrol':
          return [...route(n, F.meadow()), act('idle', 2, 5), ...route(n, F.tree()), act('idle', 3, 6)];
        case 'visitLake':
          return travel(n, 'lake_dock');
        case 'visitTent':
          return travel(n, Math.random() < 0.5 ? 'tent_social' : 'treehouse_music');
        default: {
          // 在子房間才會做的事（釣魚、樹屋聽歌⋯）：回到自己的家
          if (n.def.home !== 'forest_main') return travel(n, n.def.home);
          return [...route(n, F.fireRest()), act('idle', 4, 10)];
        }
      }
    }
    if (n.room === 'lake_dock') {
      const L = PLACES.lake_dock;
      if (like === 'fish' || n.def.home === 'lake_dock') {
        if (like === 'stroll') return [...route(n, L.stroll()), act('idle', 4, 9)];
        if (like === 'visitForest') return travel(n, 'forest_main');
        const s = pick(L.fishSpots);
        return [...route(n, s), { type: 'faceAngle', ry: s.face }, act('fish', 20, 45), act('reel', 1.6, 2.2), act('showFish', 3.5, 3.5, { fish: true })];
      }
      return [...route(n, L.stroll()), act('idle', 5, 10), ...travel(n, 'forest_main')];
    }
    if (n.room === 'treehouse_music') {
      const T = PLACES.treehouse_music;
      if (like === 'visitTent') return travel(n, 'forest_main');
      const p = T.spots();
      return [...route(n, p), act(like === 'wave' ? 'wave' : 'idle', like === 'wave' ? 2.4 : 8, like === 'wave' ? 2.4 : 20)];
    }
    if (n.room === 'tent_social') {
      const p = PLACES.tent_social.seat();
      return [...route(n, p), { type: 'face', to: { x: 0, z: 0 } }, act('idle', 15, 40)];
    }
    // 專注帳篷不去（那裡要安靜）
    return travel(n, 'forest_main');
  }

  function setAction(n, a) {
    if (n.a !== a) {
      n.a = a;
      n.dirty = true;
    }
  }

  function changeRoom(n, to) {
    const from = n.room;
    api.room(from).npcs.delete(n.id);
    api.emit(from, 'playerLeft', { id: n.id });
    const p = to === 'forest_main' ? FOREST_RETURN[from] ?? PLACES.forest_main.fireRest() : PLACES[to].spawn;
    n.room = to;
    n.x = p.x + rand(-0.3, 0.3);
    n.z = p.z + rand(-0.3, 0.3);
    n.ry = to === 'forest_main' ? faceTo(n, FIRE) : Math.PI;
    n.a = 'idle';
    n.e = 0;
    n.dirty = true;
    api.room(to).npcs.set(n.id, n);
    api.emit(to, 'playerJoined', publicNpc(n));
  }

  /** 有沒有真人在附近（打招呼用） */
  function humanNear(n, r = 3) {
    for (const p of api.room(n.room).players.values()) if (Math.hypot(p.x - n.x, p.z - n.z) < r) return true;
    return false;
  }

  function update(dt) {
    for (const n of list) {
      if (n.wait > 0) {
        n.wait -= dt;
        continue;
      }
      if (!n.step) {
        if (!n.plan.length) {
          n.plan = nextPlan(n);
          // 偶爾跟附近的真人打招呼
          if (humanNear(n) && Math.random() < 0.25) n.plan.unshift(act('wave', 2.4, 2.4));
          if (!n.plan.length) {
            n.wait = 2;
            continue;
          }
        }
        n.step = n.plan.shift();
        n.step.left = n.step.t;
        // 要走的直線會穿過營火河畔：改成沿著湖岸外圈繞過去（出發當下才算，位置才準）
        if (n.step.type === 'go' && n.room === 'forest_main' && !n.step.direct) {
          const via = aroundPond(n, n.step.to);
          if (via.length) {
            n.plan.unshift(...via.slice(1).map((p) => ({ type: 'go', to: p, direct: true })), { ...n.step, direct: true });
            n.step = { type: 'go', to: via[0], direct: true };
          }
        }
      }
      const s = n.step;
      if (s.type === 'go') {
        const dx = s.to.x - n.x;
        const dz = s.to.z - n.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) {
          n.step = null;
          setAction(n, 'idle');
          continue;
        }
        // 前面有真人：先停下來讓路；等太久就往旁邊繞一步
        const ux = dx / d;
        const uz = dz / d;
        let blocked = false;
        for (const p of api.room(n.room).players.values()) {
          const px = p.x - n.x;
          const pz = p.z - n.z;
          const ahead = px * ux + pz * uz;
          if (ahead > 0 && ahead < 1.1 && Math.abs(px * uz - pz * ux) < 0.7) blocked = true;
        }
        if (blocked) {
          n.blocked = (n.blocked ?? 0) + dt;
          setAction(n, 'idle');
          if (n.blocked > 1.5) {
            n.blocked = 0;
            const side = Math.random() < 0.5 ? 1 : -1;
            n.plan.unshift(s); // 繞完再繼續原本的目標
            n.step = { type: 'go', to: { x: n.x + uz * side * 1.1 + ux * 0.3, z: n.z - ux * side * 1.1 + uz * 0.3 } };
          }
          continue;
        }
        n.blocked = 0;
        const k = Math.min(1, (WALK_SPEED * dt) / d);
        n.x += dx * k;
        n.z += dz * k;
        n.ry = Math.atan2(dx, dz);
        setAction(n, 'walk');
        n.dirty = true;
      } else if (s.type === 'face') {
        n.ry = faceTo(n, s.to);
        n.dirty = true;
        n.step = null;
      } else if (s.type === 'faceAngle') {
        n.ry = s.ry;
        n.dirty = true;
        n.step = null;
      } else if (s.type === 'room') {
        changeRoom(n, s.to);
        n.step = null;
      } else if (s.type === 'act') {
        if (s.left === s.t) {
          // 剛開始這個動作
          setAction(n, s.a);
          n.d = 0;
          n.e = s.fish ? api.packFish() : 0;
          n.dirty = true;
        }
        s.left -= dt;
        if (s.roast) {
          n.d = Math.min(0.6, n.d + dt / 30);
          n.dirty = true;
        }
        if (s.wood && !s.done && s.t - s.left > 1.4) {
          s.done = true;
          api.addWood(n);
        }
        if (s.left <= 0) {
          n.e = 0;
          n.d = 0;
          setAction(n, 'idle');
          n.step = null;
        }
      }
    }
  }

  function remove() {
    for (const n of list) api.room(n.room).npcs.delete(n.id);
  }

  return { list, update, remove };
}

/** 傳給前端的居民資料（npc: true → 名牌顯示成營地居民） */
export const publicNpc = (n) => ({
  id: n.id,
  name: n.name,
  fur: n.fur,
  sp: n.sp,
  rw: 0,
  npc: true,
  s: [Math.round(n.x * 100) / 100, Math.round(n.z * 100) / 100, Math.round(n.ry * 1000) / 1000, n.a, Math.round(n.d * 100) / 100, n.e | 0],
});
