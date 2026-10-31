/**
 * 迷霧森林露營地：即時多人伺服器（Express + Socket.io）
 *
 * - 玩家加入／離開廣播、斷線自動清除
 * - 客戶端以 20Hz 送出自己的狀態，伺服器每 50ms 把整個房間的狀態「打包」廣播一次
 * - 營火的生命值（fuel）由伺服器統一管理，所有人看到同一團火
 * - 分流：每個分流最多 100 人（可用環境變數 CHANNEL_MAX、CHANNELS 調整），全滿時自動開新分流
 * - 繪馬、告示牌留言、釣魚排行是所有分流共用的；營火、點唱機、玩家則各分流獨立
 * - 正式部署時同一個埠也負責提供 dist/ 的網頁檔案
 *
 * 啟動：npm run server（預設埠 3000，可用環境變數 PORT 更改）
 */
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const ROOM_DEFS = {
  forest_main: { label: '中央大營火', capacity: 100 },
  tent_focus: { label: '專注帳篷', capacity: 30 },
  treehouse_music: { label: '森林樹屋', capacity: 30 },
  lake_dock: { label: '湖畔碼頭', capacity: 30 },
  tent_social: { label: '交流帳篷', capacity: 40 },
};
/** 分流：每個分流最多幾人、平常開幾個、最多開到幾個 */
const CHANNEL_MAX = Number(process.env.CHANNEL_MAX) || 100;
const BASE_CHANNELS = Number(process.env.CHANNELS) || 3;
const MAX_CHANNELS = 30;
/** 自動選分流時，人數低於這個比例的分流優先（熱鬧但不擠） */
const COZY_RATIO = 0.8;
const SONG_COUNT = 20; // 內建 3 首＋之後放進來的錄音檔
const DEFAULT_ROOM = 'forest_main';

const TICK_MS = 50; // 20Hz 廣播
const MAX_FUEL = 100;
const BURN_RATE = 0.22; // 與前端 Campfire.js 相同
const WOOD_FUEL = 25;
const WOOD_COOLDOWN_MS = 1500;
const FUR_COUNT = 5; // 前端毛色選項數量
const SPECIES_COUNT = 6; // 狐狸、貓、熊、兔、熊貓、柴犬
const ACTION_STATES = new Set([
  'idle', 'walk', 'run', 'addWood', 'roast', 'blanket', 'stargaze', 'fish', 'reel', 'showFish',
  'wave', 'salute', 'bye', 'pray', // 表情動作
]);
const EMOJIS = new Set(['😊', '😂', '🥰', '👍', '❤️', '🎉', '😴', '🥺', '😮', '🔥', '✨', '🍡']);
const MAX_WISHES = 40;
const MAX_NOTES = 60;
// 魚：索引 0~9（8、9 是垃圾，不列入排行），尺寸上限
const FISH_COUNT = 10;
const JUNK = new Set([8, 9]);
const FISH_MAX_CM = 130;

// ---------- 分流與房間資料 ----------
/** 所有分流共用：繪馬、告示牌留言、釣魚排行 */
const shared = { wishes: [], notes: [], board: [] };
/** @type {Map<number, { ch: number, fuel: number, rooms: Map<string, { players: Map<string, any>, song: number }> }>} */
const channels = new Map();
const key = (ch, roomId) => `${ch}:${roomId}`;

function makeChannel(ch) {
  const c = { ch, fuel: 55, rooms: new Map() };
  for (const id of Object.keys(ROOM_DEFS)) c.rooms.set(id, { players: new Map(), song: 0 });
  channels.set(ch, c);
  return c;
}
const chCount = (c) => {
  let n = 0;
  for (const r of c.rooms.values()) n += r.players.size;
  return n;
};
/** 保持基本分流數；全部滿了就開新的；多開的分流沒人了就收掉 */
function tidyChannels() {
  for (let i = 1; i <= BASE_CHANNELS; i++) if (!channels.has(i)) makeChannel(i);
  const list = [...channels.values()];
  if (list.every((c) => chCount(c) >= CHANNEL_MAX) && channels.size < MAX_CHANNELS) {
    let n = 1;
    while (channels.has(n)) n++;
    makeChannel(n);
  }
  for (const c of list) {
    if (c.ch > BASE_CHANNELS && chCount(c) === 0 && [...channels.values()].some((o) => o !== c && chCount(o) < CHANNEL_MAX)) {
      channels.delete(c.ch);
    }
  }
}
tidyChannels();

const channelList = () =>
  [...channels.values()].sort((a, b) => a.ch - b.ch).map((c) => ({ ch: c.ch, count: chCount(c), max: CHANNEL_MAX }));

/**
 * 選分流：指定的分流有位子就用它；沒指定（0）就自動挑
 * 「最熱鬧但還沒擠」的那一個，讓大家盡量遇得到人。
 */
function pickChannel(wanted) {
  tidyChannels();
  if (wanted) {
    const c = channels.get(wanted);
    return c && chCount(c) < CHANNEL_MAX ? c : null;
  }
  const open = [...channels.values()].filter((c) => chCount(c) < CHANNEL_MAX);
  const cozy = open.filter((c) => chCount(c) < CHANNEL_MAX * COZY_RATIO).sort((a, b) => chCount(b) - chCount(a) || a.ch - b.ch);
  if (cozy.length) return cozy[0];
  open.sort((a, b) => chCount(a) - chCount(b));
  return open[0] ?? null;
}

// ---------- 留言與繪馬存檔（server/data/*.json，重開伺服器也不會不見） ----------
const DATA_DIR = path.resolve(__dirname, 'data');
const readJson = (file, fallback) => {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const saveTimers = {};
/** 延遲 1 秒寫檔，連續留言只寫一次 */
function saveJson(file, data) {
  clearTimeout(saveTimers[file]);
  saveTimers[file] = setTimeout(() => {
    fs.mkdir(DATA_DIR, { recursive: true }, () =>
      fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 1), (err) => err && console.warn(`[存檔] ${file} 失敗：`, err.message)),
    );
  }, 1000);
}
shared.notes = readJson('notes.json', []).slice(-MAX_NOTES);
shared.wishes = readJson('wishes.json', []).slice(-MAX_WISHES);
shared.board = readJson('board.json', []).slice(0, 10);

// ---------- HTTP ----------
const app = express();
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) app.use(express.static(distDir));

// ---------- 贊助名單（server/data/sponsors.json） ----------
// 格式：[{ id, name, date, reward: 'flower' | 'clover', code?（選填兌換碼） }]
// 檔案改了會自動重新讀取，不用重開伺服器。
const SPONSORS_FILE = path.resolve(__dirname, 'data/sponsors.json');
let sponsors = [];
function loadSponsors() {
  try {
    const list = JSON.parse(fs.readFileSync(SPONSORS_FILE, 'utf8'));
    sponsors = Array.isArray(list) ? list.filter((s) => s && typeof s.name === 'string') : [];
    console.log(`[贊助] 讀到 ${sponsors.length} 位贊助者`);
  } catch (err) {
    console.warn('[贊助] 讀取 sponsors.json 失敗：', err.message);
  }
}
loadSponsors();
fs.watchFile(SPONSORS_FILE, { interval: 3000 }, loadSponsors);

const REWARD_CODE = { flower: 1, clover: 2 };
const normName = (s) => String(s ?? '').trim().toLowerCase();

/** 比對暱稱（＋兌換碼）：有設兌換碼的贊助者，兩個都要對才算 */
function findReward(name, code) {
  const s = sponsors.find((x) => normName(x.name) === normName(name) && (!x.code || String(x.code) === String(code ?? '').trim()));
  return s ? REWARD_CODE[s.reward] ?? 1 : 0;
}

// 給木牌名冊用：只公開名字、日期、回饋（不含兌換碼）
app.get('/api/sponsors', (_req, res) => {
  res.json(sponsors.map((s) => ({ name: s.name, date: s.date ?? '', reward: s.reward ?? 'flower' })));
});

app.get('/api/notes', (_req, res) => res.json(shared.notes));
app.get('/api/channels', (_req, res) => {
  tidyChannels();
  res.json(channelList());
});
app.get('/api/health', (_req, res) => {
  const summary = {};
  for (const c of channels.values()) {
    summary[c.ch] = { players: chCount(c), fuel: Math.round(c.fuel) };
    for (const [id, r] of c.rooms) summary[c.ch][id] = r.players.size;
  }
  res.json({ ok: true, channels: summary });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  pingInterval: 10000,
  pingTimeout: 8000,
});

// ---------- 小工具 ----------
const num = (v, min, max, fallback = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function cleanName(raw) {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .trim()
    .slice(0, 12);
  return name || `旅人${Math.floor(Math.random() * 900 + 100)}`;
}

/** 傳給前端的精簡狀態陣列：[x, z, rotationY, actionState, doneness, extra（舉起的魚）] */
const packState = (p) => [
  Math.round(p.x * 100) / 100,
  Math.round(p.z * 100) / 100,
  Math.round(p.ry * 1000) / 1000,
  p.a,
  Math.round(p.d * 100) / 100,
  p.e | 0,
];

const publicInfo = (p) => ({ id: p.id, name: p.name, fur: p.fur, sp: p.sp, rw: p.rw, s: packState(p) });

/** 某個分流的某個房間，給新進玩家的完整資料 */
function roomSnapshot(c, id, selfId) {
  const r = c.rooms.get(id);
  return {
    ch: c.ch,
    room: id,
    fuel: c.fuel,
    song: r.song,
    board: id === 'lake_dock' ? shared.board : undefined,
    wishes: id === 'forest_main' ? shared.wishes : undefined,
    notes: id === 'forest_main' ? shared.notes : undefined,
    players: [...r.players.values()].filter((p) => p.id !== selfId).map(publicInfo),
  };
}
/** 共用資料（繪馬、留言、排行）更新時，通知每個分流裡那個房間的人 */
const emitAllChannels = (roomId, ev, data) => {
  for (const c of channels.values()) io.to(key(c.ch, roomId)).emit(ev, data);
};
const fullMsg = (label) => `${label}人數已滿，請稍後再來`;

// ---------- 連線 ----------
io.on('connection', (socket) => {
  let player = null;
  let chan = null; // 目前的分流
  let room = null;
  let roomId = null;
  let rkey = null; // socket.io 的房間名稱：「分流:房間」
  let lastWood = 0;

  /** 離開目前的分流／房間 */
  const leave = () => {
    room.players.delete(socket.id);
    socket.leave(rkey);
    io.to(rkey).emit('playerLeft', { id: socket.id });
  };
  /** 進入某個分流的某個房間 */
  const enter = (c, id) => {
    chan = c;
    roomId = id;
    room = c.rooms.get(id);
    rkey = key(c.ch, id);
    room.players.set(socket.id, player);
    socket.join(rkey);
  };

  socket.on('join', (data = {}, ack) => {
    if (player) return;
    const wanted = ROOM_DEFS[data.room] ? data.room : DEFAULT_ROOM;
    const wantCh = Math.floor(num(data.ch, 0, 999, 0));
    let c = pickChannel(wantCh);
    // 斷線重連時原分流滿了，就自動換一個，不要把人擋在外面
    if (!c && data.rejoin) c = pickChannel(0);
    if (!c) {
      ack?.({ ok: false, reason: 'chFull', ch: wantCh, channels: channelList() });
      return;
    }
    if (c.rooms.get(wanted).players.size >= ROOM_DEFS[wanted].capacity) {
      ack?.({ ok: false, reason: 'full', message: fullMsg(ROOM_DEFS[wanted].label) });
      return;
    }

    player = {
      id: socket.id,
      name: cleanName(data.name),
      fur: Math.floor(num(data.fur, 0, FUR_COUNT - 1)),
      sp: Math.floor(num(data.species, 0, SPECIES_COUNT - 1)),
      rw: 0, // 贊助回饋：0 無、1 小黃花、2 四葉草（由伺服器判斷，玩家改不了）
      x: num(data.x, -20, 20, 0),
      z: num(data.z, -20, 20, 6),
      ry: num(data.ry, -10, 10, Math.PI),
      a: 'idle',
      d: 0,
      e: 0,
      dirty: true,
    };
    player.rw = findReward(player.name, data.code);
    enter(c, wanted);
    tidyChannels();

    ack?.({ ok: true, id: socket.id, reward: player.rw, ...roomSnapshot(chan, roomId, socket.id) });
    socket.to(rkey).emit('playerJoined', publicInfo(player));
    console.log(`[加入] ${player.name}（分流 ${chan.ch}／${roomId}，分流共 ${chCount(chan)} 人）`);
  });

  // 換分流：留在同一個地點，換到另一個分流
  socket.on('switchChannel', (data = {}, ack) => {
    if (!player) return ack?.({ ok: false, reason: 'notJoined' });
    const next = Math.floor(num(data.ch, 1, 999, 1));
    if (next === chan.ch) return ack?.({ ok: true, ...roomSnapshot(chan, roomId, socket.id) });
    tidyChannels();
    const c = channels.get(next);
    if (!c || chCount(c) >= CHANNEL_MAX) return ack?.({ ok: false, reason: 'chFull', channels: channelList() });
    if (c.rooms.get(roomId).players.size >= ROOM_DEFS[roomId].capacity) {
      return ack?.({ ok: false, reason: 'full', message: fullMsg(ROOM_DEFS[roomId].label) });
    }
    leave();
    player.a = 'idle';
    player.d = 0;
    player.dirty = true;
    enter(c, roomId);
    socket.to(rkey).emit('playerJoined', publicInfo(player));
    ack?.({ ok: true, ...roomSnapshot(chan, roomId, socket.id) });
    tidyChannels();
    console.log(`[換分流] ${player.name} → 分流 ${chan.ch}`);
  });

  // 客戶端 20Hz 送來的狀態
  socket.on('state', (s) => {
    if (!player || !Array.isArray(s)) return;
    player.x = num(s[0], -20, 20, player.x);
    player.z = num(s[1], -20, 20, player.z);
    player.ry = num(s[2], -1000, 1000, player.ry);
    player.a = ACTION_STATES.has(s[3]) ? s[3] : 'idle';
    player.d = num(s[4], 0, 2, 0);
    player.e = Math.floor(num(s[5], 0, 99999, 0));
    player.dirty = true;
  });

  // 換房間（走進帳篷、樹屋、碼頭）：離開舊房、加入新房
  socket.on('switchRoom', (data = {}, ack) => {
    if (!player) return ack?.({ ok: false, reason: 'notJoined' });
    const next = data.room;
    if (!ROOM_DEFS[next]) return ack?.({ ok: false, reason: 'unknown' });
    if (next === roomId) return ack?.({ ok: true, ...roomSnapshot(chan, roomId, socket.id) });
    if (chan.rooms.get(next).players.size >= ROOM_DEFS[next].capacity) {
      return ack?.({ ok: false, reason: 'full', message: fullMsg(ROOM_DEFS[next].label) });
    }

    leave();
    player.x = num(data.x, -20, 20, 0);
    player.z = num(data.z, -20, 20, 0);
    player.ry = num(data.ry, -1000, 1000, 0);
    player.a = 'idle';
    player.d = 0;
    player.dirty = true;
    enter(chan, next);
    socket.to(rkey).emit('playerJoined', publicInfo(player));
    ack?.({ ok: true, ...roomSnapshot(chan, roomId, socket.id) });
    console.log(`[換房] ${player.name} → ${ROOM_DEFS[roomId].label}`);
  });

  // 樹屋點唱機：換歌，同房間的人一起聽
  socket.on('setSong', (index) => {
    if (!player || roomId !== 'treehouse_music') return;
    const song = Math.floor(num(index, -1, SONG_COUNT - 1)); // -1 = 停止音樂
    room.song = song;
    io.to(rkey).emit('song', { song, by: player.id, name: player.name });
  });

  // 聊天：專注帳篷裡不能聊；每 0.8 秒最多一則；最多 40 字
  let lastChat = 0;
  socket.on('chat', (data = {}) => {
    if (!player || roomId === 'tent_focus') return;
    const now = Date.now();
    if (now - lastChat < 800) return;
    lastChat = now;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
    if (!text) return;
    io.to(rkey).emit('chat', { id: socket.id, name: player.name, text });
  });

  // 表情符號（只接受清單內的）
  let lastEmoji = 0;
  socket.on('emoji', (data = {}) => {
    if (!player || !EMOJIS.has(data.e)) return;
    const now = Date.now();
    if (now - lastEmoji < 500) return;
    lastEmoji = now;
    io.to(rkey).emit('emoji', { id: socket.id, e: data.e });
  });

  // 繪馬：掛在森林祈福處，大家都看得到（每 20 秒最多一塊）
  let lastWish = 0;
  socket.on('wish', (data = {}) => {
    if (!player || roomId !== 'forest_main') return;
    const now = Date.now();
    if (now - lastWish < 20000) return;
    lastWish = now;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 30);
    if (!text) return;
    shared.wishes.push({ name: player.name, text, at: now });
    shared.wishes = shared.wishes.slice(-MAX_WISHES);
    saveJson('wishes.json', shared.wishes);
    emitAllChannels('forest_main', 'wishes', { wishes: shared.wishes, by: socket.id, name: player.name });
  });

  // 營火告示牌留言：大家都看得到（每 20 秒最多一則、最多 60 字）
  let lastNote = 0;
  socket.on('note', (data = {}) => {
    if (!player || roomId !== 'forest_main') return;
    const now = Date.now();
    if (now - lastNote < 20000) return;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!text) return;
    lastNote = now;
    const color = Math.max(0, Math.min(3, data.color | 0));
    shared.notes.push({ name: player.name, text, at: now, color, ch: chan.ch });
    shared.notes = shared.notes.slice(-MAX_NOTES);
    saveJson('notes.json', shared.notes);
    emitAllChannels('forest_main', 'notes', { notes: shared.notes, by: socket.id, name: player.name });
  });

  // 釣到魚：全場公告＋湖畔排行（只收湖畔房間、每 3 秒最多一次）
  let lastCatch = 0;
  socket.on('catch', (data = {}) => {
    if (!player || roomId !== 'lake_dock') return;
    const now = Date.now();
    if (now - lastCatch < 3000) return;
    lastCatch = now;
    const fish = Math.floor(num(data.fish, 0, FISH_COUNT - 1));
    const size = Math.round(num(data.size, 1, FISH_MAX_CM));
    let rank = null;
    if (!JUNK.has(fish)) {
      shared.board.push({ name: player.name, fish, size, at: now });
      shared.board.sort((a, b) => b.size - a.size);
      shared.board = shared.board.slice(0, 10);
      const i = shared.board.findIndex((r) => r.at === now && r.name === player.name);
      if (i >= 0) {
        rank = i + 1;
        saveJson('board.json', shared.board);
        emitAllChannels('lake_dock', 'board', { board: shared.board });
      }
    }
    io.to(rkey).emit('caught', { id: socket.id, name: player.name, fish, size, rank });
  });

  // 添柴火：伺服器加 fuel，通知其他人播放火星特效
  socket.on('addWood', () => {
    if (!player || roomId !== 'forest_main') return;
    const now = Date.now();
    if (now - lastWood < WOOD_COOLDOWN_MS) return;
    lastWood = now;
    chan.fuel = Math.min(MAX_FUEL, chan.fuel + WOOD_FUEL);
    io.to(rkey).emit('fire', { fuel: chan.fuel, by: player.id, name: player.name });
  });

  socket.on('disconnect', () => {
    if (!player) return;
    leave();
    console.log(`[離開] ${player.name}（分流 ${chan.ch} 剩 ${chCount(chan)} 人）`);
    player = null;
    tidyChannels();
  });
});

// ---------- 20Hz 廣播迴圈 ----------
let lastTick = Date.now();
let fireSync = 0;
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  fireSync += dt;

  for (const c of channels.values()) {
    c.fuel = Math.max(0, c.fuel - BURN_RATE * dt);
    for (const [id, room] of c.rooms) {
      if (room.players.size === 0) continue;

      // 只送有變動的玩家
      const batch = {};
      let any = false;
      for (const p of room.players.values()) {
        if (!p.dirty) continue;
        batch[p.id] = packState(p);
        p.dirty = false;
        any = true;
      }
      if (any) io.to(key(c.ch, id)).volatile.emit('states', batch);
      // 每個分流只有一團火（在森林），各房間都同步一下數值，回森林時才不會跳動
      if (fireSync >= 2) io.to(key(c.ch, id)).emit('fireSync', { fuel: c.fuel });
    }
  }
  if (fireSync >= 2) fireSync = 0;
}, TICK_MS);

httpServer.listen(PORT, () => {
  console.log(`🔥 營地伺服器已啟動：http://localhost:${PORT}`);
});
