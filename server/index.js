/**
 * 迷霧森林露營地：即時多人伺服器（Express + Socket.io）
 *
 * - 玩家加入／離開廣播、斷線自動清除
 * - 客戶端以 20Hz 送出自己的狀態，伺服器每 50ms 把整個房間的狀態「打包」廣播一次
 * - 營火的生命值（fuel）由伺服器統一管理，所有人看到同一團火
 * - 分流：每個分流最多 100 人（可用環境變數 CHANNEL_MAX、CHANNELS 調整），全滿時自動開新分流
 * - 每日統計：來訪人數、停留時間、疊石頭⋯（不存個人資料），網址 /stats 可以看
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
import * as storage from './storage.js';
import { createResidents, publicNpc } from './npc.js';
import { RACE_LANTERNS, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN, TOUCH_R } from '../src/game/miniSpots.js';
import { SHOP, MAX_ITEMS, hashPassword, checkPassword, validateCredentials, newHome, available, cellFree, validCell, TENT_STYLES, TENT_SHAPES, homeId, GIFTS, GIFT_FURNITURE } from './homes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const ROOM_DEFS = {
  forest_main: { label: '中央大營火', capacity: 100 },
  tent_focus: { label: '專注帳篷', capacity: 30 },
  treehouse_music: { label: '森林樹屋', capacity: 30 },
  lake_dock: { label: '湖畔碼頭', capacity: 30 },
  tent_social: { label: '交流帳篷', capacity: 40 },
  campground: { label: '帳篷營地', capacity: 60 },
};
/** 分流：每個分流最多幾人、平常開幾個、最多開到幾個 */
const CHANNEL_MAX = Number(process.env.CHANNEL_MAX) || 100;
const BASE_CHANNELS = Number(process.env.CHANNELS) || 1; // 人少時大家聚在一起，滿了才自動加開
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
/** 石塔祈願：幾座石塔、每座最多幾顆（與前端 cairns.js 相同） */
const CAIRN_COUNT = 6;
const CAIRN_MAX = 99;
const STACK_COOLDOWN_MS = 2000;
// 魚：索引 0~9（8、9 是垃圾，不列入排行），尺寸上限
const FISH_COUNT = 10;
const JUNK = new Set([8, 9]);
const FISH_MAX_CM = 130;

// ---------- 分流與房間資料 ----------
/** 所有分流共用：繪馬、告示牌留言、釣魚排行 */
const shared = { wishes: [], notes: [], board: [], cairns: [], lakeNews: [] };
/** @type {Map<number, { ch: number, fuel: number, rooms: Map<string, { players: Map<string, any>, song: number }> }>} */
const channels = new Map();
const key = (ch, roomId) => `${ch}:${roomId}`;

function makeChannel(ch) {
  const c = { ch, fuel: 55, rooms: new Map() };
  for (const id of Object.keys(ROOM_DEFS)) c.rooms.set(id, { players: new Map(), npcs: new Map(), song: 0 });
  channels.set(ch, c);
  // 營地居民（電腦角色，名牌標示清楚，不算人數）
  c.residents = createResidents({
    ch,
    room: (id) => c.rooms.get(id),
    emit: (roomId, ev, data) => io.to(key(ch, roomId)).emit(ev, data),
    addWood: (n) => {
      if (c.fuel > 80) return;
      c.fuel = Math.min(MAX_FUEL, c.fuel + WOOD_FUEL);
      io.to(key(ch, 'forest_main')).emit('fire', { fuel: c.fuel, by: n.id, name: n.name, npc: true });
    },
    packFish: () => Math.floor(Math.random() * 4) * 1000 + Math.round(12 + Math.random() * 25),
  });
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
      c.residents?.remove();
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

// ---------- 存檔：留言、繪馬、石塔、排行、統計（見 storage.js；有設定 Upstash 就永久保存） ----------
const DATA_DIR = path.resolve(__dirname, 'data');
await storage.init(DATA_DIR);
const asArray = (v) => (Array.isArray(v) ? v : []);
const [savedNotes, savedWishes, savedBoard, savedCairns, savedStats, savedPlayers, savedTree, savedCairnLog, savedAccounts, savedHomes] = await Promise.all(
  ['notes.json', 'wishes.json', 'board.json', 'cairns.json', 'stats.json', 'players.json', 'tree.json', 'cairnlog.json', 'accounts.json', 'homes.json'].map((f) =>
    storage.load(f),
  ),
);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
/** 帳號：{ 小寫帳號: { u, salt, hash, vid, at } }（只存加鹽雜湊，不存密碼） */
const accounts = asObject(savedAccounts);
/** 每個人的帳篷：{ vid: { tent, inv: { 家具: 數量 }, items: [{ i, x, z, r }], open } } */
const homes = asObject(savedHomes);
const publicHome = (h) =>
  h
    ? {
        tent: !!h.tent,
        inv: h.inv,
        items: h.items,
        open: h.open !== false,
        style: h.style ?? 'classic',
        shape: h.shape ?? 'bell',
        shapes: h.shapes ?? ['bell'],
        name: h.name ?? '',
        likes: h.likes?.length ?? 0,
        notes: h.notes ?? [],
        gifts: h.gifts ?? [],
      }
    : { tent: false, inv: {}, items: [], open: true, style: 'classic', shape: 'bell', shapes: ['bell'], name: '', likes: 0, notes: [], gifts: [] };
/** 公開代號 → vid（找不到回傳 null） */
const hidCache = new Map();
function vidOfHid(hid) {
  if (hidCache.has(hid)) return hidCache.get(hid);
  for (const vid of Object.keys(homes)) {
    const k = homeId(vid);
    hidCache.set(k, vid);
    if (k === hid) return vid;
  }
  return null;
}
/** 帳篷營地要顯示的帳篷：自己的一定在，其他依最近有動靜排序，最多 16 頂 */
const CAMP_PLOTS = 16;
function campList(selfVid) {
  const list = Object.entries(homes)
    .filter(([vid, h]) => h?.tent && vid !== selfVid)
    .sort((a, b) => (b[1].open !== false) - (a[1].open !== false) || (b[1].at ?? 0) - (a[1].at ?? 0))
    .slice(0, selfVid && homes[selfVid]?.tent ? CAMP_PLOTS - 1 : CAMP_PLOTS);
  if (selfVid && homes[selfVid]?.tent) list.unshift([selfVid, homes[selfVid]]);
  return list.map(([vid, h]) => ({
    hid: homeId(vid),
    mine: vid === selfVid,
    name: h.name ?? '',
    shape: h.shape ?? 'bell',
    style: h.style ?? 'classic',
    open: h.open !== false,
    likes: h.likes?.length ?? 0,
    n: homeRooms.get(vid)?.players.size ?? 0,
  }));
}
/** 帳篷的房間（每個帳篷一間，所有分流共用）：主人 vid → { players, npcs } */
const homeRooms = new Map();
const homeRoom = (owner) => {
  if (!homeRooms.has(owner)) homeRooms.set(owner, { players: new Map(), npcs: new Map(), song: 0 });
  return homeRooms.get(owner);
};
/** 存檔：統計和錢包更新很頻繁，等 10 秒合併成一次；其他 2 秒 */
const saveJson = (file, data) => storage.save(file, data, file === 'stats.json' || file === 'players.json' ? 10000 : 2000);

// ---------- 每晚的營火時間（台北時間 21:00～21:30）：流星雨、松果加倍、限定流星吊飾 ----------
const EVENT_START = (Number(process.env.EVENT_HOUR) || 21) * 3600 + (Number(process.env.EVENT_MINUTE) || 0) * 60;
const EVENT_LEN = (Number(process.env.EVENT_MINUTES) || 30) * 60;
function eventInfo(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: process.env.STATS_TZ || 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const sec = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  if (sec >= EVENT_START && sec < EVENT_START + EVENT_LEN) return { active: true, endsIn: EVENT_START + EVENT_LEN - sec };
  let startsIn = EVENT_START - sec;
  if (startsIn < 0) startsIn += 86400;
  return { active: false, startsIn };
}

// ---------- 每小時小活動（整點開始 10 分鐘；晚上 9 點是營火時間，不另外辦） ----------
const MINI_LEN = (Number(process.env.MINI_MINUTES) || 10) * 60;
const MINI_CAP = 10; // 疊石、添柴：每人每場最多多拿幾顆松果
const MINI_PRIZES = [15, 10, 6]; // 釣魚大賽前三名
// 偶數點固定釣魚大賽；奇數點輪流：疊石接力、添柴時光、燈籠賽跑、找金松果
const ODD_KINDS = ['stone', 'wood', 'race', 'hunt'];
const miniKind = (h) => process.env.MINI_KIND || (h % 2 === 0 ? 'fish' : ODD_KINDS[((h - 1) / 2) % ODD_KINDS.length]);
function taipeiClock(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: process.env.STATS_TZ || 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { h: Number(parts.hour), sec: Number(parts.minute) * 60 + Number(parts.second) };
}
const EVENT_HOUR = Math.floor(EVENT_START / 3600);
function miniInfo(now = new Date()) {
  const { h, sec } = taipeiClock(now);
  if (h !== EVENT_HOUR && sec < MINI_LEN) return { kind: miniKind(h), active: true, endsIn: MINI_LEN - sec, id: `${dayKey(now)}-${h}` };
  let next = (h + 1) % 24;
  let startsIn = 3600 - sec;
  if (next === EVENT_HOUR) {
    next = (next + 1) % 24;
    startsIn += 3600;
  }
  return { kind: miniKind(next), active: false, startsIn, hour: next };
}

// ---------- 松果錢包（依瀏覽器的隨機代號記錄，不用帳號；名字和動物每次隨機也沒關係） ----------
/** @type {Record<string, { pc: number, tot: number, last: string, streak: number, sd: string, sit: number }>} */
const players = savedPlayers && typeof savedPlayers === 'object' && !Array.isArray(savedPlayers) ? savedPlayers : {};
const MAX_WALLETS = 30000;
const SIT_EVERY_MIN = 5; // 在營地待滿幾分鐘撿一次松果
const SIT_GAIN = 2;
const SIT_DAILY_CAP = 30; // 每天靠「待著」最多撿幾顆
const QUEST_GAIN = 5;
const FISH_RARITY = [1, 1, 2, 2, 3, 4, 4, 5, 0, 0]; // 與前端 fishData.js 相同
const FISH_GAIN = { 1: 1, 2: 2, 3: 3, 4: 6, 5: 15 };
/** 這一場小活動的紀錄：釣魚大賽每人最大的一條；疊石、添柴每人多拿了幾顆 */
let miniRun = { id: null, best: new Map(), got: new Map() };
const miniNow = () => {
  const m = miniInfo();
  if (!m.active) return null;
  if (miniRun.id !== m.id) {
    miniRun = { id: m.id, kind: m.kind, best: new Map(), got: new Map(), spots: [] };
    if (m.kind === 'hunt') {
      // 從候選地點隨機挑幾個藏金松果
      const pool = HUNT_SPOTS.map((p, i) => ({ ...p, i })).sort(() => Math.random() - 0.5);
      miniRun.spots = pool.slice(0, HUNT_COUNT).map((p) => ({ x: p.x, z: p.z, by: null }));
    }
  }
  return m;
};
/** 排行榜：釣魚比大（size），賽跑比快（time） */
const miniRanked = () =>
  [...miniRun.best.entries()].sort((a, b) => (miniRun.kind === 'race' ? a[1].time - b[1].time : b[1].size - a[1].size));
const miniTop = () => miniRanked().slice(0, 5).map(([, r]) => ({ ...r }));
const miniPublic = () => {
  const m = miniInfo();
  const same = m.active && miniNow() && miniRun.id === m.id;
  return { ...m, top: same ? miniTop() : [], spots: same && m.kind === 'hunt' ? miniRun.spots.map((p) => ({ x: p.x, z: p.z, by: p.by })) : [] };
};
/** 發松果給某人（不一定在線上；在線上的話通知他） */
function giveTo(vid, n, reason) {
  const w = players[vid];
  if (!w || n <= 0) return;
  w.pc += n;
  w.tot += n;
  saveJson('players.json', players);
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) s.emit('wallet', { pc: w.pc, delta: n, reason });
}

// ---------- 🎁 分享禮物、朋友邀請 ----------
/** 公開的邀請代號（不能直接放 vid：vid 等同登入憑證） */
const codeCache = new Map();
function vidOfCode(code) {
  if (!code) return null;
  if (codeCache.has(code)) return codeCache.get(code);
  for (const vid of new Set([...Object.keys(players), ...Object.keys(homes)])) {
    const k = homeId(vid);
    codeCache.set(k, vid);
    if (k === code) return vid;
  }
  return null;
}
/** 送一份禮物（家具放進背包、花色解鎖）；已經有了回傳 null */
function grantGift(vid, id) {
  const h = (homes[vid] ??= newHome());
  h.gifts ??= [];
  if (h.gifts.includes(id)) return null;
  h.gifts.push(id);
  if (GIFT_FURNITURE.has(id)) h.inv[id] = (h.inv[id] ?? 0) + 1;
  saveJson('homes.json', homes);
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) s.emit('gift', { id, home: publicHome(h) });
  return id;
}
const REF_TIERS = [
  [1, 'foxlamp'],
  [3, 'rainbow'],
  [5, 'telescope'],
];
const REF_GAIN = 10; // 每位朋友 +10 松果
const REF_STAY_MS = (Number(process.env.REF_STAY_SEC) || 180) * 1000; // 朋友要待滿 3 分鐘才算
const lastIp = new Map(); // vid → 最近一次連線的 IP（自己開無痕視窗刷不算）
/** 朋友待滿時間：幫邀請人記一筆 */
function creditReferral(refVid, friendName) {
  const rw = players[refVid];
  if (!rw) return;
  rw.refs = (rw.refs ?? 0) + 1;
  giveTo(refVid, REF_GAIN, 'friend');
  for (const [n, id] of REF_TIERS) if (rw.refs >= n) grantGift(refVid, id);
  saveJson('players.json', players);
  for (const s of io.sockets.sockets.values()) if (s.data.vid === refVid) s.emit('friendCredit', { name: friendName, refs: rw.refs });
  console.log(`[邀請] ${friendName} 待滿了，邀請人累積 ${rw.refs} 位`);
}

function wallet(vid) {
  if (!vid) return null;
  if (!players[vid]) {
    const keys = Object.keys(players);
    if (keys.length >= MAX_WALLETS) delete players[keys[0]];
    players[vid] = { pc: 0, tot: 0, last: '', streak: 0, sd: '', sit: 0 };
  }
  return players[vid];
}

/** 登入失敗次數（防止一直猜密碼） */
const loginFails = new Map();

// ---------- 心願大樹（所有分流共用的同一棵樹） ----------
const TREE_SLOTS = 140;
const ORNAMENT_PRICE = { ribbon: 3, heart: 4, lantern: 6, fish: 6, star: 8, bell: 10, moon: 12, firefly: 15, meteor: 5 }; // 與前端 ornaments.js 相同
const EVENT_ONLY = new Set(['meteor']); // 只有營火時間能掛
let tree = Array.isArray(savedTree) ? savedTree.filter((x) => x && ORNAMENT_PRICE[x.o] && x.slot < TREE_SLOTS) : [];

// ---------- 每日統計（server/data/stats.json，只存數字，不存個人資料） ----------
const STATS_TZ = process.env.STATS_TZ || 'Asia/Taipei';
const STATS_DAYS = 90;
const dayKey = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: STATS_TZ }).format(d);
let stats = savedStats && typeof savedStats === 'object' && !Array.isArray(savedStats) ? savedStats : {};
const newDay = () => ({
  visits: 0, // 進來幾次
  vids: [], // 不重複的訪客（瀏覽器隨機產生的代號）
  touch: 0, // 其中用手機的
  sessions: 0, // 已經離開、有算停留時間的
  totalSec: 0,
  stay: [0, 0, 0, 0], // 停留：30 秒內、30 秒～2 分、2～10 分、10 分以上
  ritual: 0, // 疊過石頭（完成小儀式）的人
  stones: 0,
  wishes: 0,
  notes: 0,
  fish: 0,
  chats: 0,
  quests: {}, // 每種任務今天有幾人完成
  hangs: 0, // 心願大樹掛了幾個裝飾
});
function today() {
  const k = dayKey();
  if (!stats[k]) {
    stats[k] = newDay();
    const keys = Object.keys(stats).sort();
    for (const old of keys.slice(0, Math.max(0, keys.length - STATS_DAYS))) delete stats[old];
  }
  return stats[k];
}
const bump = (field, n = 1) => {
  const d = today();
  d[field] = (d[field] ?? 0) + n;
  saveJson('stats.json', stats);
};
/** 給玩家看的「今天」：幾位旅人來過、疊了幾顆石頭 */
const todayPublic = () => {
  const d = today();
  return { visitors: d.vids.length || d.visits, stones: d.stones, wishes: d.wishes };
};

shared.notes = asArray(savedNotes).slice(-MAX_NOTES);
shared.wishes = asArray(savedWishes).slice(-MAX_WISHES);
shared.board = asArray(savedBoard).slice(0, 10);
{
  const saved = asArray(savedCairns);
  shared.cairns = Array.from({ length: CAIRN_COUNT }, (_, i) => (Array.isArray(saved[i]) ? saved[i].slice(0, CAIRN_MAX) : []));
}
// 石塔疊滿後：展示 12 小時（頂端發光），之後收進「石塔紀念冊」，原地重新開始一座
const CAIRN_SHOW_MS = (Number(process.env.CAIRN_SHOW_HOURS) || 12) * 3600 * 1000;
const cairnLog = {
  done: Array.from({ length: CAIRN_COUNT }, (_, i) => savedCairnLog?.done?.[i] ?? null), // 每座塔疊滿的時間
  archive: Array.isArray(savedCairnLog?.archive) ? savedCairnLog.archive.slice(-50) : [],
};
// 之前就已經疊滿、還沒記錄時間的：從現在開始展示
shared.cairns.forEach((c, i) => {
  if (c.length >= CAIRN_MAX && !cairnLog.done[i]) cairnLog.done[i] = Date.now();
});
const publicCairnLog = () => ({ done: cairnLog.done, showMs: CAIRN_SHOW_MS, archive: cairnLog.archive.slice(-30) });

// ---------- HTTP ----------
const app = express();
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  // 首頁：把分享預覽圖換成完整網址（Threads、LINE、FB 的預覽卡片需要）
  const indexFile = path.join(distDir, 'index.html');
  app.get(['/', '/index.html'], (req, res) => {
    const proto = req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol;
    const origin = `${proto}://${req.headers.host}`;
    const html = fs.readFileSync(indexFile, 'utf8').replace('content="og.png"', `content="${origin}/og.png"`);
    res.type('html').send(html);
  });
  app.use(express.static(distDir));
}

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
// 統計頁：/stats（有設環境變數 STATS_KEY 的話，要用 /stats?key=密碼 才看得到）
app.get(['/stats', '/api/stats'], (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/stats?key=…');
  const days = Object.keys(stats).sort().reverse().slice(0, 30);
  const rows = days.map((k) => {
    const d = stats[k];
    const avg = d.sessions ? Math.round(d.totalSec / d.sessions) : 0;
    const pct = (n) => (d.sessions ? `${Math.round((n / d.sessions) * 100)}%` : '-');
    return { day: k, visits: d.visits, visitors: d.vids.length, mobile: d.visits ? `${Math.round((d.touch / d.visits) * 100)}%` : '-', avg: `${Math.floor(avg / 60)}分${avg % 60}秒`, s30: pct(d.stay[0]), s120: pct(d.stay[1]), s600: pct(d.stay[2]), s600p: pct(d.stay[3]), ritual: d.ritual, quests: d.ritual + Object.values(d.quests ?? {}).reduce((a, b) => a + b, 0), hangs: d.hangs ?? 0, stones: d.stones, wishes: d.wishes, notes: d.notes, fish: d.fish, chats: d.chats };
  });
  if (req.path.startsWith('/api')) return res.json(rows);
  const head = ['日期', '進來次數', '不重複旅人', '手機比例', '平均停留', '30秒內離開', '30秒～2分', '2～10分', '10分以上', '疊過石頭的人', '完成任務', '掛裝飾', '石頭', '繪馬', '留言', '釣魚', '聊天'];
  const keys = ['day', 'visits', 'visitors', 'mobile', 'avg', 's30', 's120', 's600', 's600p', 'ritual', 'quests', 'hangs', 'stones', 'wishes', 'notes', 'fish', 'chats'];
  const online = [...channels.values()].reduce((n, c) => n + chCount(c), 0);
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>營地統計</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px}table{border-collapse:collapse;font-size:13px}th,td{padding:6px 9px;border-bottom:1px solid #3a2e27;text-align:right;white-space:nowrap}th{color:#ffb46b;position:sticky;top:0;background:#1d1714}td:first-child,th:first-child{text-align:left}.wrap{overflow-x:auto}p{opacity:.75;font-size:13px}</style></head>
<body><h2>🔥 營地統計</h2><p>現在在線：${online} 人 · 時區 ${STATS_TZ} · 只統計數字，不記錄個人資料。「30秒內離開」越低越好。</p>
<div class="wrap"><table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="17">還沒有資料</td></tr>'}</table></div></body></html>`);
});

// 備份：/api/backup（有設 STATS_KEY 時要帶 ?key=），下載所有留言、繪馬、石塔、排行、統計
app.get('/api/backup', (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/api/backup?key=…');
  res.setHeader('Content-Disposition', `attachment; filename="cozy-backup-${dayKey()}.json"`);
  res.json({ notes: shared.notes, wishes: shared.wishes, cairns: shared.cairns, cairnLog, board: shared.board, tree, players, stats });
});

app.get('/api/health', (_req, res) => {
  const summary = {};
  for (const c of channels.values()) {
    summary[c.ch] = { players: chCount(c), fuel: Math.round(c.fuel) };
    for (const [id, r] of c.rooms) summary[c.ch][id] = r.players.size;
  }
  res.json({ ok: true, storage: storage.status, channels: summary });
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
    cairns: id === 'forest_main' ? shared.cairns : undefined,
    cairnLog: id === 'forest_main' ? publicCairnLog() : undefined,
    tree: id === 'forest_main' ? tree : undefined,
    areas: id === 'forest_main' ? areaCounts(c) : undefined,
    lakeNews: shared.lakeNews,
    today: todayPublic(),
    players: [...[...r.players.values()].filter((p) => p.id !== selfId).map(publicInfo), ...[...r.npcs.values()].map(publicNpc)],
    event: eventInfo(),
    mini: miniPublic(),
  };
}
/** 各區人數（不含營地居民）：中央營火的看板用。帳篷裡的人算在露營區 */
function areaCounts(c) {
  const n = (id) => c.rooms.get(id)?.players.size ?? 0;
  let inTents = 0;
  for (const r of homeRooms.values()) inTents += r.players.size;
  return { forest_main: n('forest_main'), lake_dock: n('lake_dock'), tent_focus: n('tent_focus'), treehouse_music: n('treehouse_music'), tent_social: n('tent_social'), campground: n('campground') + inTents };
}
const lastAreas = new Map();
setInterval(() => {
  for (const c of channels.values()) {
    const a = areaCounts(c);
    const k = JSON.stringify(a);
    if (lastAreas.get(c.ch) === k) continue;
    lastAreas.set(c.ch, k);
    io.to(key(c.ch, 'forest_main')).emit('areas', a);
  }
}, 4000);
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
  let session = null; // 統計用：這次來訪從什麼時候開始
  let wal = null; // 這個瀏覽器的松果錢包
  let sitTimer = null;
  /** 給松果，並通知這位玩家 */
  const award = (n, reason) => {
    if (!wal || n <= 0) return;
    if (eventInfo().active) n *= 2; // 營火時間：松果加倍
    wal.pc += n;
    wal.tot += n;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: n, reason });
  };
  /** 疊石接力／添柴時光：每做一次多一顆松果（每場有上限） */
  const miniBonus = (kind) => {
    const m = miniNow();
    if (m?.kind !== kind || !socket.data.vid) return;
    const n = miniRun.got.get(socket.data.vid) ?? 0;
    if (n >= MINI_CAP) return;
    miniRun.got.set(socket.data.vid, n + 1);
    award(1, 'mini');
  };
  let stacked = false; // 這次來訪疊過石頭了嗎
  let refTimer = null; // 朋友邀請：待滿時間才算

  /** 離開目前的分流／房間 */
  const leave = () => {
    room.players.delete(socket.id);
    socket.leave(rkey);
    io.to(rkey).emit('playerLeft', { id: socket.id });
    if (roomId === 'home' && room.players.size === 0) homeRooms.delete(homeOwner);
  };
  /** 進入某個分流的某個房間 */
  const enter = (c, id) => {
    chan = c;
    roomId = id;
    room = c.rooms.get(id);
    rkey = key(c.ch, id);
    room.players.set(socket.id, player);
    socket.join(rkey);
    homeOwner = null;
  };
  /** 進到某個人的帳篷（帳篷不分分流） */
  let homeOwner = null;
  const enterHome = (owner) => {
    roomId = 'home';
    homeOwner = owner;
    room = homeRoom(owner);
    rkey = `home:${owner}`;
    room.players.set(socket.id, player);
    socket.join(rkey);
  };
  const homeSnapshot = () => ({
    room: 'home',
    owner: homeId(homeOwner),
    mine: homeOwner === player.vid,
    liked: !!homes[homeOwner]?.likes?.includes(homeId(player.vid)),
    home: publicHome(homes[homeOwner]),
    fuel: chan.fuel,
    players: [...room.players.values()].filter((p) => p.id !== socket.id).map(publicInfo),
  });

  socket.on('join', (data = {}, ack) => {
    if (player) return;
    let wanted = ROOM_DEFS[data.room] ? data.room : DEFAULT_ROOM;
    let wantCh = Math.floor(num(data.ch, 0, 999, 0));
    // 朋友的邀請連結（?with=朋友的訪客代號）：到朋友所在的分流、地點，出現在他旁邊
    let friend = null;
    if (data.with && !data.rejoin) {
      // 新連結帶的是公開代號；舊連結帶的是 vid（已經分享出去的舊連結也照樣能用）
      const raw = String(data.with).slice(0, 24);
      const fv = vidOfCode(raw) ?? raw;
      for (const fc of channels.values()) {
        for (const [rid, fr] of fc.rooms) {
          for (const p of fr.players.values()) {
            if (p.vid === fv && rid !== 'tent_focus') friend = { p, ch: fc.ch, room: rid };
          }
        }
      }
      if (friend) {
        wantCh = friend.ch;
        wanted = friend.room;
        const a = Math.random() * Math.PI * 2;
        data.x = friend.p.x + Math.sin(a) * 1.3;
        data.z = friend.p.z + Math.cos(a) * 1.3;
        data.ry = Math.atan2(friend.p.x - data.x, friend.p.z - data.z);
      }
    }
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
      vid: String(data.vid ?? '').slice(0, 24),
    };
    player.rw = findReward(player.name, data.code);
    // 統計：第一次進來才算一次來訪（斷線重連、改名字不重複算）
    if (!data.rejoin) {
      session = { at: Date.now() };
      const d = today();
      d.visits++;
      const vid = String(data.vid ?? '').slice(0, 24);
      if (vid && !d.vids.includes(vid) && d.vids.length < 50000) d.vids.push(vid);
      if (data.touch) d.touch++;
      saveJson('stats.json', stats);
    }
    enter(c, wanted);
    tidyChannels();

    // 松果錢包：每天第一次來，依連續天數送松果（第 1 天 3 顆，之後每天多 1 顆，最多 9 顆）
    const myVid = String(data.vid ?? '').slice(0, 24);
    const firstVisit = !!myVid && !players[myVid]; // 第一次來（瀏覽器裡還沒有任何紀錄）
    wal = wallet(myVid);
    socket.data.vid = wal ? String(data.vid).slice(0, 24) : null;
    const ip = String(socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address ?? '').split(',')[0].trim();
    // 朋友透過邀請連結第一次來：待滿 3 分鐘，邀請人就拿到松果和禮物
    if (firstVisit && data.with && !data.rejoin && wal) {
      const raw = String(data.with).slice(0, 24);
      const refVid = vidOfCode(raw) ?? (players[raw] ? raw : null);
      if (refVid && refVid !== myVid && lastIp.get(refVid) !== ip) {
        wal.by = homeId(refVid);
        const name = player.name;
        refTimer = setTimeout(() => creditReferral(refVid, name), REF_STAY_MS);
      }
    }
    if (wal) lastIp.set(myVid, ip);
    let daily = null;
    if (wal) {
      const d = dayKey();
      if (wal.last !== d) {
        const yesterday = dayKey(new Date(Date.now() - 86400000));
        wal.streak = wal.last === yesterday ? wal.streak + 1 : 1;
        wal.last = d;
        const gain = 2 + Math.min(wal.streak, 7);
        wal.pc += gain;
        wal.tot += gain;
        saveJson('players.json', players);
        daily = { gain, streak: wal.streak };
      }
      // 在營地待著，每 5 分鐘撿到松果（每天有上限）
      clearInterval(sitTimer);
      let minutes = 0;
      sitTimer = setInterval(() => {
        if (!player || !wal) return;
        minutes++;
        if (minutes % SIT_EVERY_MIN) return;
        const d2 = dayKey();
        if (wal.sd !== d2) {
          wal.sd = d2;
          wal.sit = 0;
        }
        if (wal.sit >= SIT_DAILY_CAP) return;
        wal.sit += SIT_GAIN;
        award(SIT_GAIN, 'sit');
      }, 60000);
    }

    ack?.({
      ok: true,
      id: socket.id,
      reward: player.rw,
      wallet: wal ? { pc: wal.pc, streak: wal.streak, daily } : null,
      myHome: publicHome(homes[player.vid]),
      code: player.vid ? homeId(player.vid) : null, // 邀請連結用的公開代號
      ...roomSnapshot(chan, roomId, socket.id),
    });
    socket.to(rkey).emit('playerJoined', publicInfo(player));
    if (friend && friend.p.id) io.to(friend.p.id).emit('friendJoined', { name: player.name });
    console.log(`[加入] ${player.name}（分流 ${chan.ch}／${roomId}，分流共 ${chCount(chan)} 人）`);
  });

  // 換分流：留在同一個地點，換到另一個分流
  socket.on('switchChannel', (data = {}, ack) => {
    if (!player) return ack?.({ ok: false, reason: 'notJoined' });
    const next = Math.floor(num(data.ch, 1, 999, 1));
    if (roomId === 'home') return ack?.({ ok: false, reason: 'home' });
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
    // 進帳篷：自己的，或主人開放參觀的
    if (next === 'home') {
      const owner = data.hid ? vidOfHid(String(data.hid)) : player.vid;
      const h = homes[owner];
      if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
      if (owner !== player.vid && h.open === false) return ack?.({ ok: false, reason: 'closed' });
      if (homeRoom(owner).players.size >= 12) return ack?.({ ok: false, reason: 'full', message: fullMsg('帳篷') });
      leave();
      player.x = num(data.x, -20, 20, 0);
      player.z = num(data.z, -20, 20, 0);
      player.ry = num(data.ry, -1000, 1000, 0);
      player.a = 'idle';
      player.d = 0;
      player.dirty = true;
      enterHome(owner);
      if (owner === player.vid) {
        h.name = player.name; // 帳篷門口的名牌：主人最近一次用的名字
        h.at = Date.now();
        saveJson('homes.json', homes);
      }
      socket.to(rkey).emit('playerJoined', publicInfo(player));
      return ack?.({ ok: true, ...homeSnapshot() });
    }
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
    bump('chats');
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
    bump('wishes');
    emitAllChannels('forest_main', 'wishes', { wishes: shared.wishes, by: socket.id, name: player.name });
  });

  // 石塔祈願：在第 i 座石塔疊一顆石頭（所有分流共用、永久保存）
  let lastStack = 0;
  socket.on('stack', (data = {}, ack) => {
    if (!player || roomId !== 'forest_main') return ack?.({ ok: false, reason: 'room' });
    const i = Math.floor(num(data.i, -1, CAIRN_COUNT - 1, -1));
    if (i < 0) return ack?.({ ok: false, reason: 'unknown' });
    const now = Date.now();
    if (now - lastStack < STACK_COOLDOWN_MS) return ack?.({ ok: false, reason: 'tooFast' });
    const cairn = shared.cairns[i];
    if (cairn.length >= CAIRN_MAX) return ack?.({ ok: false, reason: 'full' });
    lastStack = now;
    const stone = { n: player.name, s: Math.floor(Math.random() * 100000), at: now };
    cairn.push(stone);
    saveJson('cairns.json', shared.cairns);
    bump('stones');
    // 「你是今天第幾位許願的旅人」：每次來訪第一次疊石頭才算
    let ritual = null;
    if (!stacked) {
      stacked = true;
      bump('ritual');
      ritual = today().ritual;
      award(QUEST_GAIN, 'quest');
    }
    if (cairn.length >= CAIRN_MAX) {
      cairnLog.done[i] = now;
      saveJson('cairnlog.json', cairnLog);
    }
    miniBonus('stone');
    emitAllChannels('forest_main', 'stone', { i, stone, count: cairn.length, by: socket.id, today: todayPublic(), done: cairnLog.done[i] });
    ack?.({ ok: true, count: cairn.length, ritual });
  });

  // 每日任務完成：回傳「你是今天第幾位完成這個任務的旅人」（每次來訪每種任務只算一次）
  const QUEST_IDS = new Set(['wood', 'roast', 'kuji', 'ema', 'note', 'fish', 'meteor', 'hang']);
  const questsDone = new Set();
  socket.on('quest', (data = {}, ack) => {
    const id = String(data.id ?? '');
    if (!player || !QUEST_IDS.has(id)) return ack?.({ ok: false });
    const d = today();
    d.quests ??= {};
    if (!questsDone.has(id)) {
      questsDone.add(id);
      award(QUEST_GAIN, 'quest');
      d.quests[id] = (d.quests[id] ?? 0) + 1;
      saveJson('stats.json', stats);
    }
    ack?.({ ok: true, n: d.quests[id] });
  });

  // ---------- 小超商：用松果買帳篷、家具 ----------
  socket.on('myHome', (_data, ack) => ack?.({ ok: true, home: publicHome(homes[player?.vid]) }));
  let lastBuy = 0;
  socket.on('buy', (data = {}, ack) => {
    if (!player || !wal || !player.vid) return ack?.({ ok: false, reason: 'noWallet' });
    const id = String(data.id ?? '');
    const shapeId = id.startsWith('shape_') ? id.slice(6) : null;
    const shape = shapeId && Object.hasOwn(TENT_SHAPES, shapeId) ? TENT_SHAPES[shapeId] : null;
    const price = shapeId ? shape?.price : SHOP[id];
    if (!price) return ack?.({ ok: false, reason: 'unknown' });
    const now = Date.now();
    if (now - lastBuy < 800) return ack?.({ ok: false, reason: 'tooFast' });
    const h = (homes[player.vid] ??= newHome());
    if (shapeId) {
      // 帳篷造型：買一次就一直有，買下後直接換上
      if (!h.tent) return ack?.({ ok: false, reason: 'noTent' });
      h.shapes ??= ['bell'];
      if (h.shapes.includes(shapeId)) return ack?.({ ok: false, reason: 'owned' });
      if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      lastBuy = now;
      wal.pc -= price;
      h.shapes.push(shapeId);
      h.shape = shapeId;
      if (shape.style) h.style = shape.style;
      saveJson('players.json', players);
      saveJson('homes.json', homes);
      bump('buys');
      socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'buy' });
      io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
      return ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
    }
    if (id === 'tent' && h.tent) return ack?.({ ok: false, reason: 'owned' });
    if (id !== 'tent' && !h.tent) return ack?.({ ok: false, reason: 'noTent' });
    if (id !== 'tent' && (h.inv[id] ?? 0) >= 20) return ack?.({ ok: false, reason: 'tooMany' });
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    lastBuy = now;
    wal.pc -= price;
    if (id === 'tent') {
      h.tent = true;
      h.name = player.name;
      h.at = now;
    }
    else h.inv[id] = (h.inv[id] ?? 0) + 1;
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    bump('buys');
    socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'buy' });
    ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
  });

  // ---------- 布置自己的帳篷：放、轉、收起 ----------
  socket.on('homeEdit', (data = {}, ack) => {
    // 花色、造型在小舖也能換；擺家具要在自己的帳篷裡
    if (data.op === 'style' || data.op === 'shape') {
      const h = homes[player?.vid];
      if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
      const v = String(data.s ?? '');
      if (data.op === 'style') {
        if (!TENT_STYLES.has(v)) return ack?.({ ok: false, reason: 'unknown' });
        if (GIFTS[v] && !(h.gifts ?? []).includes(v)) return ack?.({ ok: false, reason: 'locked' });
        h.style = v;
      } else {
        if (!(h.shapes ?? ['bell']).includes(v)) return ack?.({ ok: false, reason: 'locked' });
        h.shape = v;
      }
      saveJson('homes.json', homes);
      io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
      return ack?.({ ok: true, home: publicHome(h) });
    }
    if (!player || roomId !== 'home' || homeOwner !== player.vid) return ack?.({ ok: false, reason: 'notHome' });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const x = Number(data.x);
    const z = Number(data.z);
    if (!validCell(x, z)) return ack?.({ ok: false, reason: 'cell' });
    const at = h.items.findIndex((it) => it.x === x && it.z === z);
    if (data.op === 'place') {
      const i = String(data.i ?? '');
      if ((!SHOP[i] && !GIFT_FURNITURE.has(i)) || i === 'tent') return ack?.({ ok: false, reason: 'unknown' });
      if (!cellFree(h, x, z)) return ack?.({ ok: false, reason: 'taken' });
      if (available(h, i) <= 0) return ack?.({ ok: false, reason: 'none' });
      if (h.items.length >= MAX_ITEMS) return ack?.({ ok: false, reason: 'tooMany' });
      h.items.push({ i, x, z, r: Math.floor(num(data.r, 0, 3, 0)) });
    } else if (data.op === 'rotate') {
      if (at < 0) return ack?.({ ok: false, reason: 'empty' });
      h.items[at].r = (h.items[at].r + 1) % 4;
    } else if (data.op === 'remove') {
      if (at < 0) return ack?.({ ok: false, reason: 'empty' });
      h.items.splice(at, 1);
    } else return ack?.({ ok: false, reason: 'op' });
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    ack?.({ ok: true, home: publicHome(h) });
  });
  // 🎁 分享一次就送「營火明信片牆」（每人一次）
  socket.on('shared', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (wal.shared) return ack?.({ ok: false, reason: 'done' });
    wal.shared = true;
    saveJson('players.json', players);
    bump('shares');
    ack?.({ ok: true, gift: grantGift(player.vid, 'postcard') });
  });
  socket.on('giftInfo', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    ack?.({ ok: true, code: homeId(player.vid), shared: !!wal.shared, refs: wal.refs ?? 0, gifts: homes[player.vid]?.gifts ?? [], gain: REF_GAIN, stay: Math.round(REF_STAY_MS / 60000) });
  });

  // 帳篷營地：列出大家的帳篷
  socket.on('campList', (data, ack) => ack?.({ ok: true, tents: campList(player?.vid) }));
  // 拜訪別人的帳篷：按讚（再按一次收回）
  socket.on('homeLike', (data, ack) => {
    if (!player?.vid || roomId !== 'home' || !homeOwner || homeOwner === player.vid) return ack?.({ ok: false });
    const h = homes[homeOwner];
    if (!h?.tent) return ack?.({ ok: false });
    const me = homeId(player.vid);
    h.likes ??= [];
    const i = h.likes.indexOf(me);
    if (i >= 0) h.likes.splice(i, 1);
    else if (h.likes.length < 5000) h.likes.push(me);
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    ack?.({ ok: true, liked: i < 0, likes: h.likes.length });
  });
  // 帳篷留言本
  let lastHomeNote = 0;
  socket.on('homeNote', (data = {}, ack) => {
    if (!player || roomId !== 'home' || !homeOwner) return ack?.({ ok: false });
    const h = homes[homeOwner];
    if (!h?.tent) return ack?.({ ok: false });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!text) return ack?.({ ok: false, reason: 'empty' });
    const now = Date.now();
    if (now - lastHomeNote < 15000) return ack?.({ ok: false, reason: 'tooFast' });
    lastHomeNote = now;
    h.notes ??= [];
    h.notes.push({ n: player.name, t: text, at: now });
    h.notes = h.notes.slice(-30);
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    ack?.({ ok: true });
  });

  socket.on('homeOpen', (data = {}, ack) => {
    const h = homes[player?.vid];
    if (!h?.tent) return ack?.({ ok: false });
    h.open = !!data.open;
    saveJson('homes.json', homes);
    ack?.({ ok: true, open: h.open });
  });

  // ---------- 帳號（選填）：註冊、登入 ----------
  let authTries = [];
  const authLimited = () => {
    const now = Date.now();
    authTries = authTries.filter((t0) => now - t0 < 60000);
    authTries.push(now);
    return authTries.length > 6;
  };
  socket.on('register', (data = {}, ack) => {
    if (!player?.vid) return ack?.({ ok: false, reason: 'noVid' });
    if (authLimited()) return ack?.({ ok: false, reason: 'tooFast' });
    const user = String(data.user ?? '').trim();
    const bad = validateCredentials(user, data.pass);
    if (bad) return ack?.({ ok: false, reason: bad });
    const lower = user.toLowerCase();
    if (accounts[lower]) return ack?.({ ok: false, reason: 'taken' });
    if (Object.values(accounts).some((a) => a.vid === player.vid)) return ack?.({ ok: false, reason: 'already' });
    const { salt, hash } = hashPassword(data.pass);
    accounts[lower] = { u: user, salt, hash, vid: player.vid, at: Date.now() };
    saveJson('accounts.json', accounts);
    console.log(`[帳號] 新帳號：${user}`);
    ack?.({ ok: true, user });
  });
  socket.on('login', (data = {}, ack) => {
    if (authLimited()) return ack?.({ ok: false, reason: 'tooFast' });
    const lower = String(data.user ?? '').trim().toLowerCase();
    const rec = accounts[lower];
    const lock = loginFails.get(lower);
    if (lock && lock.until > Date.now()) return ack?.({ ok: false, reason: 'locked' });
    if (!rec || !checkPassword(String(data.pass ?? ''), rec)) {
      const f = loginFails.get(lower) ?? { n: 0, until: 0 };
      f.n++;
      if (f.n >= 8) {
        f.until = Date.now() + 10 * 60000; // 連續錯 8 次，鎖 10 分鐘
        f.n = 0;
      }
      loginFails.set(lower, f);
      return ack?.({ ok: false, reason: 'wrong' });
    }
    loginFails.delete(lower);
    ack?.({ ok: true, user: rec.u, vid: rec.vid });
  });

  // 心願大樹：花松果買一個裝飾掛上去（樹滿了就換掉最舊的那個）
  let lastHang = 0;
  socket.on('hang', (data = {}, ack) => {
    if (!player || roomId !== 'forest_main') return ack?.({ ok: false, reason: 'room' });
    if (!wal) return ack?.({ ok: false, reason: 'noWallet' });
    const o = String(data.o ?? '');
    const price = ORNAMENT_PRICE[o];
    if (!price) return ack?.({ ok: false, reason: 'unknown' });
    if (EVENT_ONLY.has(o) && !eventInfo().active) return ack?.({ ok: false, reason: 'eventOnly' });
    const now = Date.now();
    if (now - lastHang < 1500) return ack?.({ ok: false, reason: 'tooFast' });
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    lastHang = now;
    wal.pc -= price;
    saveJson('players.json', players);
    const used = new Set(tree.map((x) => x.slot));
    let slot = -1;
    // 空位隨機挑一個，讓裝飾平均分布在整棵樹上
    const free = [];
    for (let i = 0; i < TREE_SLOTS; i++) if (!used.has(i)) free.push(i);
    if (free.length) slot = free[Math.floor(Math.random() * free.length)];
    else slot = tree.shift().slot;
    const item = { o, n: player.name, at: now, slot };
    tree.push(item);
    saveJson('tree.json', tree);
    bump('hangs');
    emitAllChannels('forest_main', 'ornament', { item, by: socket.id });
    socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'hang' });
    ack?.({ ok: true, pc: wal.pc, item });
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
    bump('notes');
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
    bump('fish');
    award(FISH_GAIN[FISH_RARITY[fish]] ?? 0, 'fish');
    // 釣魚大賽：記下每人最大的一條，名次有變就廣播
    const mini = miniNow();
    if (mini?.kind === 'fish' && !JUNK.has(fish) && socket.data.vid) {
      const prev = miniRun.best.get(socket.data.vid);
      if (!prev || size > prev.size) {
        miniRun.best.set(socket.data.vid, { name: player.name, fish, size });
        io.emit('miniBoard', { top: miniTop() });
      }
    }
    // 湖畔即時動態：所有分流、所有地點都看得到（垃圾不算）
    if (!JUNK.has(fish)) {
      const item = { name: player.name, fish, size, rank, ch: chan.ch, at: now };
      shared.lakeNews.push(item);
      shared.lakeNews = shared.lakeNews.slice(-6);
      io.emit('lakeNews', item);
    }
    io.to(rkey).emit('caught', { id: socket.id, name: player.name, fish, size, rank });
  });

  // 添柴火：伺服器加 fuel，通知其他人播放火星特效
  // 🏃 燈籠賽跑：依序碰到 1 → 5 號燈籠，伺服器用自己記的位置確認
  let race = { next: 0, t0: 0 };
  const nearSpot = (p) => player && Math.hypot(player.x - p.x, player.z - p.z) < TOUCH_R + 1.2;
  socket.on('race', (data = {}, ack) => {
    const m = miniNow();
    if (m?.kind !== 'race' || roomId !== 'forest_main' || !socket.data.vid) return ack?.({ ok: false, reason: 'off' });
    const i = Math.floor(num(data.i, -1, RACE_LANTERNS.length - 1, -1));
    if (i < 0 || (i !== 0 && i !== race.next)) return ack?.({ ok: false, reason: 'order', next: race.next });
    if (!nearSpot(RACE_LANTERNS[i])) return ack?.({ ok: false, reason: 'far', next: race.next });
    if (i === 0) {
      race = { next: 1, t0: Date.now() }; // 隨時可以從 1 號重新開始
      return ack?.({ ok: true, next: 1 });
    }
    if (i < RACE_LANTERNS.length - 1) {
      race.next = i + 1;
      return ack?.({ ok: true, next: race.next });
    }
    const time = Math.round((Date.now() - race.t0) / 100) / 10;
    race = { next: 0, t0: 0 };
    if (time < 6) return ack?.({ ok: false, reason: 'tooFast', next: 0 }); // 不可能這麼快
    const prev = miniRun.best.get(socket.data.vid);
    const best = !prev || time < prev.time;
    if (best) {
      miniRun.best.set(socket.data.vid, { name: player.name, time });
      io.emit('miniBoard', { top: miniTop() });
    }
    const rank = miniRanked().findIndex(([v]) => v === socket.data.vid) + 1;
    ack?.({ ok: true, next: 0, time, best, rank });
  });

  // ✨ 找金松果：走到藏的地方就撿起來，先到先得
  socket.on('grab', (data = {}, ack) => {
    const m = miniNow();
    if (m?.kind !== 'hunt' || roomId !== 'forest_main' || !socket.data.vid) return ack?.({ ok: false, reason: 'off' });
    const i = Math.floor(num(data.i, -1, miniRun.spots.length - 1, -1));
    const spot = miniRun.spots[i];
    if (!spot) return ack?.({ ok: false, reason: 'unknown' });
    if (spot.by) return ack?.({ ok: false, reason: 'taken', by: spot.by });
    if (!nearSpot(spot)) return ack?.({ ok: false, reason: 'far' });
    spot.by = player.name;
    award(HUNT_GAIN, 'hunt');
    const left = miniRun.spots.filter((p) => !p.by).length;
    io.emit('miniHunt', { i, by: player.name, left });
    ack?.({ ok: true, left });
  });

  socket.on('addWood', () => {
    if (!player || roomId !== 'forest_main') return;
    const now = Date.now();
    if (now - lastWood < WOOD_COOLDOWN_MS) return;
    lastWood = now;
    chan.fuel = Math.min(MAX_FUEL, chan.fuel + WOOD_FUEL);
    io.to(rkey).emit('fire', { fuel: chan.fuel, by: player.id, name: player.name });
    miniBonus('wood');
  });

  socket.on('disconnect', () => {
    clearTimeout(refTimer); // 還沒待滿就走了：不算
    if (!player) return;
    leave();
    clearInterval(sitTimer);
    if (session) {
      const sec = (Date.now() - session.at) / 1000;
      const d = today();
      d.sessions++;
      d.totalSec += Math.round(sec);
      d.stay[sec < 30 ? 0 : sec < 120 ? 1 : sec < 600 ? 2 : 3]++;
      saveJson('stats.json', stats);
      session = null;
    }
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
    // 有真人在這個分流時，居民才活動（沒人時省電）
    if (chCount(c) > 0) c.residents?.update(dt);
    for (const [id, room] of c.rooms) {
      if (room.players.size === 0) continue;

      // 只送有變動的玩家（含營地居民）
      const batch = {};
      let any = false;
      for (const p of [...room.players.values(), ...room.npcs.values()]) {
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
  // 帳篷裡的玩家
  for (const [owner, hr] of homeRooms) {
    if (!hr.players.size) continue;
    const batch = {};
    let any = false;
    for (const p of hr.players.values()) {
      if (!p.dirty) continue;
      batch[p.id] = packState(p);
      p.dirty = false;
      any = true;
    }
    if (any) io.to(`home:${owner}`).volatile.emit('states', batch);
  }
  if (fireSync >= 2) fireSync = 0;
}, TICK_MS);

// 重新部署或關機時：先把還沒存的資料寫完再結束（不然最後幾秒的石頭、留言會不見）
let closing = false;
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    if (closing) return;
    closing = true;
    console.log(`[關機] 收到 ${sig}，存檔中⋯`);
    try {
      await storage.flush();
      console.log('[關機] 存檔完成，掰掰 👋');
    } catch (err) {
      console.error('[關機] 存檔失敗：', err.message);
    }
    process.exit(0);
  });
}

// 疊滿的石塔展示夠久了：收進紀念冊，原地重新開始
setInterval(() => {
  const now = Date.now();
  shared.cairns.forEach((c, i) => {
    const done = cairnLog.done[i];
    if (!done || now - done < CAIRN_SHOW_MS) return;
    const counts = {};
    for (const st of c) counts[st.n] = (counts[st.n] ?? 0) + 1;
    const names = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n]) => n);
    const record = { tower: i + 1, at: done, stones: c.length, people: names.length, names: names.slice(0, 40) };
    cairnLog.archive.push(record);
    cairnLog.archive = cairnLog.archive.slice(-50);
    cairnLog.done[i] = null;
    shared.cairns[i] = [];
    saveJson('cairns.json', shared.cairns);
    saveJson('cairnlog.json', cairnLog);
    emitAllChannels('forest_main', 'cairnReset', { i, record, log: publicCairnLog() });
    console.log(`[石塔] 第 ${i + 1} 座收進紀念冊（${record.stones} 顆、${record.people} 位旅人），重新開始`);
  });
}, 60000);

// 每小時小活動：開始、結束時通知所有人；釣魚大賽結束時發獎
let miniActive = miniInfo().active;
setInterval(() => {
  const m = miniInfo();
  if (m.active === miniActive) return;
  miniActive = m.active;
  if (m.active) {
    miniNow();
    io.emit('mini', miniPublic());
    console.log(`[小活動] ${m.kind} 開始`);
    return;
  }
  // 結束
  let winners = [];
  if (miniRun.kind === 'fish' || miniRun.kind === 'race') {
    winners = miniRanked()
      .slice(0, MINI_PRIZES.length)
      .map(([vid, r], i) => {
        giveTo(vid, MINI_PRIZES[i], 'contest');
        return { ...r, prize: MINI_PRIZES[i] };
      });
  } else if (miniRun.kind === 'hunt') {
    winners = miniRun.spots.filter((p) => p.by).map((p) => ({ name: p.by }));
  }
  io.emit('mini', { ...m, ended: miniRun.kind, winners });
  console.log(`[小活動] ${miniRun.kind} 結束`, winners.map((w) => w.name + (w.size ? ` ${w.size}cm` : w.time ? ` ${w.time}s` : '')).join('、'));
}, 5000);

// 營火時間開始／結束時通知所有人
let eventActive = eventInfo().active;
setInterval(() => {
  const ev = eventInfo();
  if (ev.active !== eventActive) {
    eventActive = ev.active;
    io.emit('event', ev);
    console.log(ev.active ? '[營火時間] 開始 🌠' : '[營火時間] 結束');
  }
}, 5000);

httpServer.listen(PORT, () => {
  console.log(`🔥 營地伺服器已啟動：http://localhost:${PORT}`);
});
