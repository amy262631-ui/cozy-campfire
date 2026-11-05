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
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as storage from './storage.js';
import { createResidents, publicNpc } from './npc.js';
import { FISH, DEX_BONUS, dexGain, catchGain, FISH_MAX_CM, rollFish, rollSize } from '../src/fishing/fishData.js';
import { RACE_LANTERNS, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN, TOUCH_R } from '../src/game/miniSpots.js';
import { OUTFITS, OUTFIT_BY_ID, outfitCode, dailyOutfit, weeklyOutfit, nextDateOutfit, sponsorOutfits } from '../src/game/outfits.js';
import { GATHER_SPOTS, GATHER_ITEMS, regrowMs, GATHER_FIRST_GAIN, GATHER_DEX_BONUS, gatherItemAt, isNight, GATHER_R, NET_PRICE, BUG_WANDER, BUG_CATCH_R } from '../src/game/gathering.js';
import { SOURCES, cleanSource, sourceFrom } from '../src/game/sources.js';
import { GATHER_BY_ID, treasureTime, TREASURE_MAX } from '../src/game/gathering.js';
import { CROP_BY_ID, GARDEN_MAX, GARDEN_EXPAND, gardenSlotsOf, WATER_MAX, CROP_FIRST_GAIN, readyAtOf, stageOf } from '../src/game/garden.js';
import { canMake, takeMaterials } from '../src/game/materials.js';
import { RECIPE_BY_ID } from '../src/game/crafting.js';
import { DISH_BY_ID, dishFirstGain } from '../src/game/cooking.js';
import { MUSEUM_BY_ID, DONATE_PER_DAY } from '../src/game/museum.js';
import { TRASH, TRASH_BY_ID, TRASH_MAX, TRASH_ROOM, RECYCLE_GAIN, RECYCLE_DAILY_CAP, TRASH_FIRST_GAIN, TRASH_DEX_OUTFIT, pickTrash } from '../src/game/trash.js';
import { LAYOUT as CAMP_LAYOUT } from '../src/rooms/campLayout.js';
import { PASS, SPONSOR } from '../src/game/pass.js';
import crypto from 'node:crypto';
import { SHOP, hashPassword, checkPassword, validateCredentials, newHome, available, validCell, TENT_STYLES, TENT_SHAPES, homeId, GIFTS, GIFT_FURNITURE, CATALOG_BY_ID, gridOf, expandPrice, expandHome, maxItems, stackAt, stackCheck, moveStack, hasLoft } from './homes.js';
import { hasColors, FURNITURE_COLORS, fishFits } from '../src/game/furnitureCatalog.js';
import { YARD_BY_ID } from '../src/game/yardCatalog.js';
import { FUR_TOTAL, BASE_FUR, PREMIUM_FUR, TAIL_BY_ID, EAR_BY_ID, SPECIES_TAIL, SPECIES_EARS } from '../src/game/looks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const ROOM_DEFS = {
  forest_main: { label: '中央大營火', capacity: 100 },
  tent_focus: { label: '專注帳篷', capacity: 30 },
  treehouse_music: { label: '森林樹屋', capacity: 30 },
  lake_dock: { label: '湖畔碼頭', capacity: 30 },
  tent_social: { label: '交流帳篷', capacity: 40 },
  campground: { label: '帳篷營地', capacity: 60 },
  mist_forest: { label: '迷霧森林', capacity: 60 },
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
const FUR_COUNT = FUR_TOTAL; // 毛色數量（5 種一般＋特殊毛色）
const SPECIES_COUNT = 6; // 狐狸、貓、熊、兔、熊貓、柴犬
const ACTION_STATES = new Set([
  'idle', 'walk', 'run', 'addWood', 'roast', 'blanket', 'stargaze', 'fish', 'reel', 'showFish',
  'wave', 'salute', 'bye', 'pray', // 表情動作
  'pick', 'catch', 'plant', 'water', // 採摘、揮網捕蟲、種菜、澆水
  'sofa', 'sleep', // 🛋️ 坐沙發、躺床
]);
const EMOJIS = new Set(['😊', '😂', '🥰', '👍', '❤️', '🎉', '😴', '🥺', '😮', '🔥', '✨', '🍡']);
const MAX_WISHES = 40;
const MAX_NOTES = 60;
/** 舊的留言、繪馬不刪，留著給大家翻頁看（最多這麼多則） */
const ARCHIVE_MAX = 1500;
const HISTORY_PAGE = 20;
const recent = (arr, n) => arr.slice(-n);
/** 石塔祈願：幾座石塔、每座最多幾顆（與前端 cairns.js 相同） */
const CAIRN_COUNT = 6;
const CAIRN_MAX = 99;
const STACK_COOLDOWN_MS = 2000;
// 魚：索引 0~9（8、9 是垃圾，不列入排行），尺寸上限
const FISH_COUNT = FISH.length;
const JUNK = new Set(FISH.flatMap((f, i) => (f.junk ? [i] : [])));

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
/** 每個人的帳篷（不分分流） */
const homeRooms = new Map();
const chCount = (c) => {
  let n = 0;
  for (const r of c.rooms.values()) n += r.players.size;
  // 帳篷裡的人（帳篷不分分流）：算回他原本所在的分流
  for (const r of homeRooms.values()) for (const p of r.players.values()) if (p.ch === c.ch) n++;
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
const [savedNotes, savedWishes, savedBoard, savedCairns, savedStats, savedPlayers, savedTree, savedCairnLog, savedAccounts, savedHomes, savedIdeas, savedTotals, savedMuseum, savedOrders] = await Promise.all(
  ['notes.json', 'wishes.json', 'board.json', 'cairns.json', 'stats.json', 'players.json', 'tree.json', 'cairnlog.json', 'accounts.json', 'homes.json', 'ideas.json', 'totals.json', 'museum2.json', 'orders.json'].map((f) =>
    storage.load(f),
  ),
);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
/** 帳號：{ 小寫帳號: { u, salt, hash, vid, at } }（只存加鹽雜湊，不存密碼） */
const accounts = asObject(savedAccounts);
/** 每個人的帳篷：{ vid: { tent, inv: { 家具: 數量 }, items: [{ i, x, z, r }], open } } */
const homes = asObject(savedHomes);
/** 💡 玩家建議（只有作者在 /ideas 看得到）：[{ n, t, at }] */
let ideas = asArray(savedIdeas);
const publicHome = (h) =>
  h
    ? {
        tent: !!h.tent,
        inv: h.inv,
        items: h.items,
        grid: gridOf(h),
        open: h.open !== false,
        style: h.style ?? 'classic',
        shape: h.shape ?? 'bell',
        shapes: h.shapes ?? ['bell'],
        name: h.name ?? '',
        likes: h.likes?.length ?? 0,
        notes: h.notes ?? [],
        gifts: h.gifts ?? [],
        rack: h.rack ?? [],
        cinv: h.cinv ?? {},
        yard: { own: h.yard?.own ?? [], on: h.yard?.on ?? null },
      }
    : { tent: false, inv: {}, items: [], grid: gridOf(null), open: true, style: 'classic', shape: 'bell', shapes: ['bell'], name: '', likes: 0, notes: [], gifts: [] };
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
/** 帳篷營地要顯示的帳篷：自己的一定在，其他依最近有動靜排序，最多 32 頂 */
const CAMP_PLOTS = 32;
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
    garden: gardenView(h),
    yard: h.yard?.on ?? null,
  }));
}
/** 🥕 菜園給大家看的樣子：[[作物, 階段], ...]（空的格子是 null） */
const gardenView = (h, now = Date.now()) => Array.from({ length: gardenSlotsOf(h) }, (_, i) => (h?.garden?.[i]?.c ? [h.garden[i].c, stageOf(h.garden[i], now)] : null));
/** 採集圖鑑：找到過哪些（就算用掉、捐掉也還在）；第一次找到回傳 true */
function discover(w, id) {
  w.gdex ??= Object.fromEntries(Object.keys(w.bk ?? {}).filter((k) => GATHER_BY_ID[k]).map((k) => [k, 1]));
  if (w.gdex[id]) return false;
  w.gdex[id] = 1;
  return true;
}
const gdexOf = (w) => Object.keys(w?.gdex ?? Object.fromEntries(Object.keys(w?.bk ?? {}).filter((k) => GATHER_BY_ID[k]).map((k) => [k, 1])));
/** 🏛️ 營地標本櫃：{ 品項: { n: 第一個捐的人, at } }（所有分流共用；museum2.json＝11/4 測試完重新開始） */
const museum = asObject(savedMuseum);

// ---------- ✨ 營火寶藏（晚上 8～10 點）：營火附近偶爾藏一個稀有寶物，同一分流先找到的人拿走 ----------
const TREASURE_ITEMS = GATHER_ITEMS.filter((x) => x.type === 'treasure');
const TREASURE_EVERY = [Number(process.env.TREASURE_MIN_SEC) || 120, Number(process.env.TREASURE_MAX_SEC) || 300]; // 每隔 2～5 分鐘冒一個
let treasureSeq = 0;
const treasureOn = () => process.env.TREASURE_ALWAYS === '1' || treasureTime();
function pickTreasure() {
  const w = (x) => (x.rarity >= 3 ? 1 : 3);
  let r = Math.random() * TREASURE_ITEMS.reduce((a, x) => a + w(x), 0);
  for (const x of TREASURE_ITEMS) if ((r -= w(x)) <= 0) return x;
  return TREASURE_ITEMS[0];
}
const publicTreasures = (c) => (c.treasures ?? []).map((x) => ({ k: x.k, x: x.x, z: x.z }));
function tickTreasures() {
  const on = treasureOn();
  const now = Date.now();
  for (const c of channels.values()) {
    c.treasures ??= [];
    if (!on) {
      if (c.treasures.length) {
        c.treasures = [];
        io.to(key(c.ch, 'forest_main')).emit('treasures', { list: [] });
      }
      c.nextTreasure = 0;
      continue;
    }
    if (!c.nextTreasure) c.nextTreasure = now + 20000; // 剛開始：20 秒後冒第一個
    if (c.treasures.length >= TREASURE_MAX || now < c.nextTreasure) continue;
    const used = new Set(c.treasures.map((x) => x.spot));
    const free = HUNT_SPOTS.map((p, i) => ({ ...p, i })).filter((p) => !used.has(p.i));
    const p = free[Math.floor(Math.random() * free.length)];
    if (!p) continue;
    c.treasures.push({ k: ++treasureSeq, spot: p.i, x: p.x + (Math.random() - 0.5) * 1.2, z: p.z + (Math.random() - 0.5) * 1.2, item: pickTreasure().id });
    c.nextTreasure = now + (TREASURE_EVERY[0] + Math.random() * (TREASURE_EVERY[1] - TREASURE_EVERY[0])) * 1000;
    io.to(key(c.ch, 'forest_main')).emit('treasures', { list: publicTreasures(c), fresh: true });
  }
}
setInterval(tickTreasures, 5000);

// ---------- ♻️ 垃圾：湖邊、帳篷營地路邊、中央營火區偶爾冒出來，同一分流誰看到誰撿 ----------
const TRASH_EVERY = [Number(process.env.TRASH_MIN_SEC) || 150, Number(process.env.TRASH_MAX_SEC) || 360]; // 每個地方每 2.5～6 分鐘冒一件
let trashSeq = 0;
const TRASH_PLACES = Object.keys(TRASH_MAX);
const PLACE_OF_ROOM = Object.fromEntries(TRASH_PLACES.map((p) => [TRASH_ROOM[p], p]));
function trashSpot(place) {
  const r = Math.random;
  if (place === 'shore') {
    const side = r() < 0.5 ? -1 : 1;
    return { x: side * (1.4 + r() * 7), z: 1.9 + r() * 1.7 };
  }
  if (place === 'camp') {
    const path = r() < 0.8 ? CAMP_LAYOUT.loop : CAMP_LAYOUT.entry;
    const p = path[Math.floor(r() * path.length)];
    const side = r() < 0.5 ? -1 : 1;
    return { x: p.x - (p.tz ?? 0) * 1.25 * side, z: p.z + (p.tx ?? 0) * 1.25 * side };
  }
  const p = HUNT_SPOTS[Math.floor(r() * HUNT_SPOTS.length)];
  return { x: p.x + (r() - 0.5) * 1.6, z: p.z + (r() - 0.5) * 1.6 };
}
const publicTrash = (c, place) => (c.trash?.[place] ?? []).map((x) => ({ k: x.k, x: x.x, z: x.z, item: x.item }));
function tickTrash() {
  const now = Date.now();
  for (const c of channels.values()) {
    c.trash ??= {};
    c.nextTrash ??= {};
    for (const place of TRASH_PLACES) {
      const list = (c.trash[place] ??= []);
      if (!c.nextTrash[place]) c.nextTrash[place] = now + Math.random() * 60000;
      if (list.length >= TRASH_MAX[place] || now < c.nextTrash[place]) continue;
      list.push({ k: ++trashSeq, ...trashSpot(place), item: pickTrash(place).id });
      c.nextTrash[place] = now + (TRASH_EVERY[0] + Math.random() * (TRASH_EVERY[1] - TRASH_EVERY[0])) * 1000;
      io.to(key(c.ch, TRASH_ROOM[place])).emit('trash', { room: TRASH_ROOM[place], list: publicTrash(c, place) });
    }
  }
}
setInterval(tickTrash, 10000);
/** 撿到一件垃圾：放進垃圾袋、記進垃圾圖鑑（第一次撿到送松果；全部收集完送淨灘小隊造型） */
function gotTrash(w, vid, id) {
  w.tbag ??= {};
  w.tbag[id] = (w.tbag[id] ?? 0) + 1;
  w.tdex ??= {};
  const first = !w.tdex[id];
  w.tdex[id] = (w.tdex[id] ?? 0) + 1;
  let done = false;
  if (first && TRASH.every((x) => w.tdex[x.id]) && !w.tdone) {
    w.tdone = true;
    done = true;
    grantOutfit(vid, TRASH_DEX_OUTFIT, 'eco');
  }
  totals.trash = (totals.trash ?? 0) + 1;
  saveJson('totals.json', totals);
  return { first, done, gain: first ? TRASH_FIRST_GAIN[TRASH_BY_ID[id].rarity] ?? 1 : 0 };
}
const trashView = (w) => ({ tbag: w?.tbag ?? {}, tdex: w?.tdex ?? {} });
/** 帳篷的房間（每個帳篷一間，所有分流共用）：主人 vid → { players, npcs } */
const homeRoom = (owner) => {
  if (!homeRooms.has(owner)) homeRooms.set(owner, { players: new Map(), npcs: new Map(), song: 0 });
  return homeRooms.get(owner);
};
/** 存檔：統計和錢包更新很頻繁，等 10 秒合併成一次；其他 2 秒 */
const saveJson = (file, data) => storage.save(file, data, file === 'stats.json' || file === 'players.json' ? 10000 : 2000);

// ---------- 營火時間（台北時間早上 9:30、晚上 9:30，各 30 分鐘）：流星雨、松果加倍、限定流星吊飾 ----------
const envNum = (k, def) => (process.env[k] != null && process.env[k] !== '' ? Number(process.env[k]) : def);
const EVENT_START = envNum('EVENT_HOUR', 21) * 3600 + envNum('EVENT_MINUTE', 30) * 60;
const EVENT_LEN = (Number(process.env.EVENT_MINUTES) || 30) * 60;
/** 早上、晚上各一場（同一個分鐘數）：EVENT_AM_HOUR 預設 9 → 早上 9:30 */
const EVENT_STARTS = [envNum('EVENT_AM_HOUR', 9) * 3600 + envNum('EVENT_MINUTE', 30) * 60, EVENT_START];
const evSlot = (st) => (st < 12 * 3600 ? 'am' : 'pm');
function eventInfo(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: process.env.STATS_TZ || 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const sec = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  for (const st of EVENT_STARTS) if (sec >= st && sec < st + EVENT_LEN) return { active: true, endsIn: st + EVENT_LEN - sec, slot: evSlot(st) };
  let startsIn = Infinity;
  let slot = 'pm';
  for (const st of EVENT_STARTS) {
    let d = st - sec;
    if (d <= 0) d += 86400;
    if (d < startsIn) [startsIn, slot] = [d, evSlot(st)];
  }
  return { active: false, startsIn, slot };
}

// ---------- 晚上的小活動（台北時間 19:00～23:00，每半小時一場；21:30 是營火時間，不另外辦） ----------
const MINI_FROM = envNum('MINI_FROM', 19) * 3600; // 第一場幾點開始
const MINI_TO = envNum('MINI_TO', 23) * 3600; // 最後一場要在幾點前開始
const MINI_EVERY = (Number(process.env.MINI_EVERY) || 30) * 60; // 每隔幾分鐘一場
const MINI_LEN = (Number(process.env.MINI_MINUTES) || 10) * 60;
const MINI_CAP = 10; // 疊石、添柴：每人每場最多多拿幾顆松果
const MINI_PRIZES = [15, 10, 6]; // 釣魚大賽前三名
/** 依序輪流：釣魚大賽最熱門，多排幾場 */
const MINI_ORDER = ['fish', 'stone', 'race', 'wood', 'fish', 'hunt', 'fish'];
/** 今晚的場次：[{ at: 一天中的第幾秒, kind }] */
const MINI_SLOTS = (() => {
  const list = [];
  for (let at = MINI_FROM; at < MINI_TO; at += MINI_EVERY) {
    if (at >= EVENT_START && at < EVENT_START + EVENT_LEN) continue; // 營火時間
    list.push({ at, kind: process.env.MINI_KIND || MINI_ORDER[list.length % MINI_ORDER.length] });
  }
  return list;
})();
function taipeiClock(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: process.env.STATS_TZ || 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { h: Number(parts.hour), sec: Number(parts.minute) * 60 + Number(parts.second) };
}
function miniInfo(now = new Date()) {
  const { h, sec: s } = taipeiClock(now);
  const sec = h * 3600 + s;
  const cur = MINI_SLOTS.findIndex((x) => sec >= x.at && sec < x.at + MINI_LEN);
  if (cur >= 0) {
    const x = MINI_SLOTS[cur];
    return { kind: x.kind, active: true, endsIn: x.at + MINI_LEN - sec, id: `${dayKey(now)}-${cur}` };
  }
  let next = MINI_SLOTS.find((x) => x.at > sec);
  let startsIn = next ? next.at - sec : 0;
  if (!next) {
    next = MINI_SLOTS[0]; // 今晚都辦完了：明晚第一場
    startsIn = 86400 - sec + next.at;
  }
  return { kind: next.kind, active: false, startsIn, hour: Math.floor(next.at / 3600), minute: Math.floor((next.at % 3600) / 60) };
}

// ---------- 松果錢包（依瀏覽器的隨機代號記錄，不用帳號；名字和動物每次隨機也沒關係） ----------
/** @type {Record<string, { pc: number, tot: number, last: string, streak: number, sd: string, sit: number }>} */
const players = savedPlayers && typeof savedPlayers === 'object' && !Array.isArray(savedPlayers) ? savedPlayers : {};
const MAX_WALLETS = 30000;
const SIT_EVERY_MIN = 5; // 在營地待滿幾分鐘撿一次松果
const SIT_GAIN = 2;
const SIT_DAILY_CAP = 30; // 每天靠「待著」最多撿幾顆
const QUEST_GAIN = 5;
const FISH_RARITY = FISH.map((f) => f.rarity);
const POS_MAX = 45; // 座標上限（帳篷營地到 ±37；以前限制 ±20，營地外圍的垃圾撿不到）
const MAX_SPEED = 7; // 每秒最多移動幾公尺（跑步大約 5.1）
const FISH_ROLL_GAP = 4000; // 兩次拋竿（要魚）最少間隔
const FISH_MIN_MS = 4500; // 要到魚之後，最快多久才能拉起來（浮標最快 4 秒才會沉＋拉竿）
const FISH_DAILY_FULL = 30; // 每天前幾條魚的松果照算（之後每條 1 顆）
/** 給玩家看的圖鑑：伺服器紀錄＋以前存在瀏覽器裡的舊紀錄（舊紀錄只顯示，不送松果） */
const dexView = (w) => {
  const out = { ...(w?.dexOld ?? {}) };
  for (const [k, v] of Object.entries(w?.dex ?? {})) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};
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
/** 🌱 來了幾天（第一次來那天算 0；以前的老玩家沒記錄，當作很久了），新手功能慢慢打開用 */
const walletAge = (w) => {
  if (!w.fd) return 99;
  if ((w.tot ?? 0) > 150) return 99; // 已經玩很多了
  return Math.max(0, Math.round((Date.parse(`${dayKey()}T00:00:00Z`) - Date.parse(`${w.fd}T00:00:00Z`)) / 86400000));
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
const DATE_STAY_MS = (Number(process.env.DATE_STAY_SEC) || 60) * 1000; // 營火之約：待滿 1 分鐘
const lastIp = new Map(); // vid → 最近一次連線的 IP（自己開無痕視窗刷不算）
/** 朋友待滿時間：幫邀請人記一筆 */
function creditReferral(refVid, friendName) {
  const rw = players[refVid];
  if (!rw) return;
  rw.refs = (rw.refs ?? 0) + 1;
  giveTo(refVid, REF_GAIN, 'friend');
  for (const [n, id] of REF_TIERS) if (rw.refs >= n) grantGift(refVid, id);
  // 👒 每週限定造型：朋友真的透過連結來玩才拿得到
  grantOutfit(refVid, weeklyOutfit(dayKey()).id, 'weekly');
  saveJson('players.json', players);
  for (const s of io.sockets.sockets.values()) if (s.data.vid === refVid) s.emit('friendCredit', { name: friendName, refs: rw.refs });
  console.log(`[邀請] ${friendName} 待滿了，邀請人累積 ${rw.refs} 位`);
}

// ---------- ⏳ 朋友透過連結進來，待滿時間才算（斷線不取消） ----------
// 從朋友「進來那一刻」開始算（跳出 App 的時間也算）；時間到時朋友還連著就發；
// 剛好斷線的話保留 30 分鐘，朋友回來（重新連上）就立刻發。只有很快就關掉、而且沒回來，才不算。
const SHARE_STAY_MS = (Number(process.env.SHARE_STAY_SEC) || 60) * 1000; // 分享：朋友待滿 1 分鐘，分享人拿今天的每日造型
const STAY_GRACE_MS = 30 * 60 * 1000;
/** key → { kind: 'invite'|'share'|'date', friend, ref, name, at, need } */
const stays = new Map();
const isOnline = (vid) => {
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) return true;
  return false;
};
function addStay(kind, friend, ref, name, need) {
  const key = `${kind}:${friend}:${ref}`;
  if (!stays.has(key)) stays.set(key, { kind, friend, ref, name, at: Date.now(), need });
}
function finishStay(st) {
  const { kind, friend, ref, name } = st;
  if (!players[ref]) return;
  if (kind === 'invite') return creditReferral(ref, name);
  if (kind === 'share') {
    const got = grantOutfit(ref, dailyOutfit(dayKey()).id, 'daily');
    console.log(`[分享] ${name} 點了連結待滿了${got ? '，送出今天的每日造型' : '（今天的每日造型已經有了）'}`);
    return;
  }
  if (kind === 'date') {
    // 🔥 營火之約：同一對朋友每天只算一次
    const d = dayKey();
    const pair = [friend, ref].sort().join('|');
    shared.datePairs ??= {};
    if (shared.datePairs.d !== d) shared.datePairs = { d, list: [] };
    if (shared.datePairs.list.includes(pair)) return console.log(`[營火之約] 沒算到：${name} 和邀請人今天已經約過了`);
    shared.datePairs.list.push(pair);
    const a = players[friend] ? grantOutfit(friend, nextDateOutfit(players[friend].outfits)?.id, 'date') : null;
    const b = grantOutfit(ref, nextDateOutfit(players[ref].outfits)?.id, 'date');
    if (a || b) bump('dates');
    for (const s2 of io.sockets.sockets.values()) if (s2.data.vid === ref) s2.emit('dateFriend', { name });
  }
}
/** 檢查哪些已經待滿（每 5 秒，或朋友重新連上時） */
function checkStays(onlyFriend = null) {
  const now = Date.now();
  for (const [key, st] of stays) {
    if (onlyFriend && st.friend !== onlyFriend) continue;
    if (now - st.at < st.need) continue;
    if (isOnline(st.friend)) {
      stays.delete(key);
      finishStay(st);
    } else if (now - st.at > st.need + STAY_GRACE_MS) {
      stays.delete(key);
      console.log(`[${st.kind === 'invite' ? '邀請' : st.kind === 'share' ? '分享' : '營火之約'}] 沒算到：${st.name} 時間到時已經離開，30 分鐘內也沒回來`);
    }
  }
}
setInterval(() => checkStays(), 5000);

// ---------- 👒 造型收集 ----------
const OUTFIT_SLOTS = ['head', 'back', 'neck', 'hair'];
/** 身上穿的造型 → 線上同步用的代號 [頭, 背, 脖子]（0＝沒穿） */
const wearCodes = (w) => OUTFIT_SLOTS.map((k) => outfitCode(w?.wear?.[k]));
/** 送一款造型（不一定在線上；在線上的話通知他）；已經有了回傳 null */
function grantOutfit(vid, id, why) {
  const w = players[vid];
  if (!w || !OUTFIT_BY_ID[id]) return null;
  w.outfits ??= [];
  if (w.outfits.includes(id)) return null;
  w.outfits.push(id);
  syncRack(vid);
  saveJson('players.json', players);
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) s.emit('outfitGift', { id, why, outfits: w.outfits });
  return id;
}
/** 帳篷裡的衣帽架：每個部位展示一件（最近拿到、現在沒穿在身上的） */
function syncRack(vid) {
  const w = players[vid];
  const h = homes[vid];
  if (!w || !h) return;
  const owned = w.outfits ?? [];
  const rack = ['head', 'back', 'neck'].map((slot) => {
    const mine = owned.filter((id) => OUTFIT_BY_ID[id]?.slot === slot);
    return [...mine].reverse().find((id) => id !== w.wear?.[slot]) ?? mine[mine.length - 1] ?? null;
  }).filter(Boolean);
  if (JSON.stringify(rack) === JSON.stringify(h.rack ?? [])) return;
  h.rack = rack;
  saveJson('homes.json', homes);
}
const outfitView = (w) => {
  const d = dayKey();
  const daily = dailyOutfit(d).id;
  const weekly = weeklyOutfit(d).id;
  const owned = w?.outfits ?? [];
  return { outfits: owned, wear: w?.wear ?? {}, daily, dailyGot: owned.includes(daily), weekly, weeklyGot: owned.includes(weekly), dateNext: nextDateOutfit(owned)?.id ?? null };
};

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
/** 一直累計的數字（不會每天歸零）：疊了幾顆石頭。第一次啟用時用還留著的每日統計當起點 */
const totals = asObject(savedTotals);
if (typeof totals.stones !== 'number') totals.stones = Object.values(stats).reduce((a, d) => a + (Number(d?.stones) || 0), 0);
/** 給玩家看的：累計幾位旅人來過（每個瀏覽器／帳號算一位）、累計疊了幾顆石頭，以及今天的人數 */
const todayPublic = () => {
  const d = today();
  return { visitors: d.vids.length || d.visits, stones: d.stones, wishes: d.wishes, allVisitors: Object.keys(players).length, allStones: totals.stones };
};

shared.notes = asArray(savedNotes).slice(-ARCHIVE_MAX);
shared.wishes = asArray(savedWishes).slice(-ARCHIVE_MAX);
shared.board = asArray(savedBoard).slice(0, 15);
/** 🏆 湖畔排行：歷史前 15 名（不會每天清掉） */
const BOARD_MAX = 15;
const boardAll = () => shared.board;
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

// ---------- 🔥 營火月票＋綠界自動開通 ----------
/** 訂單：{ 訂單編號: { vid, name, amt, at, status: 'new' | 'paid', paidAt, pay } } */
const orders = asObject(savedOrders);
const passActive = (w, now = Date.now()) => (w?.pass?.until ?? 0) > now;
const passView = (w) => ({ until: w?.pass?.until ?? 0, active: passActive(w), today: w?.pd === dayKey() });
/** 綠界設定：Render 的環境變數；沒設定時用綠界公開的測試帳號（不會真的扣錢） */
const ECPAY = {
  prod: process.env.ECPAY_MODE === 'prod',
  id: process.env.ECPAY_MERCHANT_ID || '3002607',
  key: process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6',
  iv: process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs',
};
/** 月票要不要給玩家看到、能不能買：Render 的環境變數 PASS_ON 設成 1 才開（綠界審核通過前先關著） */
const PASS_ON = process.env.PASS_ON === '1';
const ECPAY_URL = ECPAY.prod ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5' : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
/** 綠界的檢查碼（CheckMacValue，SHA256）：參數依名稱排序、前後加 HashKey／HashIV、照 .NET 的規則網址編碼後轉小寫 */
function ecpayMac(params) {
  const keys = Object.keys(params)
    .filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
  const raw = `HashKey=${ECPAY.key}&${keys.map((k) => `${k}=${params[k]}`).join('&')}&HashIV=${ECPAY.iv}`;
  const enc = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  return crypto.createHash('sha256').update(enc).digest('hex').toUpperCase();
}
const taipeiTime = (d = new Date()) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}`;
};
/** 付款成功：開通（或延長）30 天，先送一份松果、送月票限定花色 */
/** ☕ 贊助付款成功：送這個月的假髮（付款那個月，台北時間） */
function activateSponsor(vid, order) {
  const w = players[vid];
  if (!w) return;
  w.spons = (w.spons ?? 0) + (order?.amt ?? 0);
  // 送他選的那一款（要是付款那個月的）；沒選或對不上就送那個月的第一款
  const list = sponsorOutfits(dayKey(new Date(order.paidAt ?? Date.now())).slice(0, 7));
  const wig = order.amt >= SPONSOR.min ? list.find((o) => o.id === order.wig) ?? list[0] : null;
  saveJson('players.json', players);
  const got = wig ? grantOutfit(vid, wig.id, 'sponsor') : null;
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) s.emit('sponsored', { amt: order.amt, wig: wig?.id ?? null, got: !!got });
  console.log(`[贊助] ${order.name} NT$${order.amt}${wig ? ` → ${wig.zh}` : ''}`);
}
function activatePass(vid, order) {
  const w = players[vid];
  if (!w) return false;
  const now = Date.now();
  w.pass ??= {};
  w.pass.until = Math.max(now, w.pass.until ?? 0) + PASS.days * 86400000;
  w.pass.bought = (w.pass.bought ?? 0) + 1;
  w.pd = dayKey(); // 今天已經用「先送的松果」領過了，今天不再加每日的份
  w.pc += PASS.first;
  w.tot += PASS.first;
  saveJson('players.json', players);
  grantGift(vid, PASS.style);
  for (const s of io.sockets.sockets.values()) {
    if (s.data.vid !== vid) continue;
    s.emit('wallet', { pc: w.pc, delta: PASS.first, reason: 'pass' });
    s.emit('pass', { ...passView(w), gain: PASS.first, order: order?.no });
    s.data.onPass?.();
  }
  console.log(`[月票] ${order?.name ?? vid} 開通到 ${new Date(w.pass.until).toISOString()}`);
  return true;
}

// ---------- HTTP ----------
const app = express();
/** 伺服器這次醒來的時間：Render 免費方案沒人叫醒會睡著，醒來就重新算（看定時叫醒有沒有效） */
const BOOT_AT = Date.now();
const awakeText = () => {
  const m = Math.floor((Date.now() - BOOT_AT) / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return `${d ? `${d} 天 ` : ''}${h} 小時 ${m % 60} 分`;
};
const distDir = path.resolve(__dirname, '../dist');
/** 目前網頁的版本（打包後 JS 檔名裡的雜湊）：玩家的畫面版本不一樣，就提醒他重新整理 */
let webVersion = null;
try {
  webVersion = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8').match(/assets\/index-([\w-]+)\.js/)?.[1] ?? null;
} catch {
  /* 開發模式沒有 dist */
}
if (fs.existsSync(distDir)) {
  // 首頁：把分享預覽圖換成完整網址（Threads、LINE、FB 的預覽卡片需要）
  const indexFile = path.join(distDir, 'index.html');
  app.get(['/', '/index.html'], (req, res) => {
    const proto = req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol;
    const origin = `${proto}://${req.headers.host}`;
    const html = fs.readFileSync(indexFile, 'utf8').replace('content="og.png"', `content="${origin}/og.png"`);
    // 首頁不快取（改版後馬上拿到新版），但壓縮後再送
    res.set('Cache-Control', 'no-cache');
    res.type('html');
    if (/\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      res.set({ 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
      return res.send(zlib.gzipSync(html));
    }
    res.send(html);
  });

  // 🚀 手機進場加速：遊戲程式（JS、CSS）先壓縮好（1.2MB → 約 0.28MB），
  // 檔名有版本雜湊，所以讓瀏覽器快取一年，第二次進來幾乎不用再下載
  const assetsDir = path.join(distDir, 'assets');
  /** /檔名 → { type, gz, br }（br 在背景壓縮，好了才有） */
  const packed = new Map();
  for (const f of fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []) {
    if (!/\.(js|css|svg|json)$/.test(f)) continue;
    const buf = fs.readFileSync(path.join(assetsDir, f));
    const entry = { type: path.extname(f), gz: zlib.gzipSync(buf, { level: 9 }), br: null };
    packed.set(`/${f}`, entry);
    zlib.brotliCompress(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }, (err, out) => {
      if (!err) entry.br = out;
    });
  }
  app.use('/assets', (req, res, next) => {
    const p = packed.get(req.path);
    if (!p) return next();
    const ae = req.headers['accept-encoding'] ?? '';
    const enc = p.br && /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : null;
    if (!enc) return next();
    res.set({ 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Encoding': enc, Vary: 'Accept-Encoding' });
    res.type(p.type);
    res.send(enc === 'br' ? p.br : p.gz);
  });
  app.use('/assets', express.static(assetsDir, { immutable: true, maxAge: '1y' }));
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

app.get('/api/notes', (_req, res) => res.json(recent(shared.notes, MAX_NOTES)));
app.get('/api/channels', (_req, res) => {
  res.set('Access-Control-Allow-Origin', '*'); // 上架其他平台的版本從別的網址來問
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
    const nbPct = (n) => (d.nb ? `${Math.round(((n ?? 0) / d.nb) * 100)}%` : '-');
    return { day: k, visits: d.visits, visitors: d.vids.length, mobile: d.visits ? `${Math.round((d.touch / d.visits) * 100)}%` : '-', avg: `${Math.floor(avg / 60)}分${avg % 60}秒`, s30: pct(d.stay[0]), s120: pct(d.stay[1]), s600: pct(d.stay[2]), s600p: pct(d.stay[3]), nb: d.nb ?? '-', nb30: nbPct(d.nb30), nbDid: nbPct(d.nbDid), ritual: d.ritual, quests: d.ritual + Object.values(d.quests ?? {}).reduce((a, b) => a + b, 0), hangs: d.hangs ?? 0, stones: d.stones, wishes: d.wishes, notes: d.notes, fish: d.fish, chats: d.chats, hits: d.hits ?? '-', preLeave: d.hits ? `${Math.max(0, Math.round(((d.hits - (d.loaded ?? 0)) / d.hits) * 100))}%` : '-', shares: d.shares ?? 0, invNew: d.invNew ?? 0, dates: d.dates ?? 0, gathers: d.gathers ?? 0, treasures: d.treasures ?? 0, trash: d.trash ?? 0, recycled: d.recycled ?? 0, donates: d.donates ?? 0, crafts: d.crafts ?? 0, cooks: d.cooks ?? 0, harvests: d.harvests ?? 0, waters: d.waters ?? 0 };
  });
  if (req.path.startsWith('/api')) return res.json(rows);
  const head = ['日期', '打開網頁', '載入完成前就離開', '進來次數', '不重複旅人', '手機比例', '平均停留', '30秒內離開', '30秒～2分', '2～10分', '10分以上', '新旅人', '新旅人30秒內離開', '新旅人完成任務', '分享', '邀請來的新旅人', '營火之約', '採集', '營火寶藏', '撿垃圾', '回收', '捐標本', '手作', '料理', '收成', '幫澆水', '疊過石頭的人', '完成任務', '掛裝飾', '石頭', '繪馬', '留言', '釣魚', '聊天'];
  const keys = ['day', 'hits', 'preLeave', 'visits', 'visitors', 'mobile', 'avg', 's30', 's120', 's600', 's600p', 'nb', 'nb30', 'nbDid', 'shares', 'invNew', 'dates', 'gathers', 'treasures', 'trash', 'recycled', 'donates', 'crafts', 'cooks', 'harvests', 'waters', 'ritual', 'quests', 'hangs', 'stones', 'wishes', 'notes', 'fish', 'chats'];
  // 來源統計：最近 7 天每個來源的人數、30 秒內離開、平均停留、隔天回來的比例
  const srcDays = days.slice(0, 7);
  const srcRows = SOURCES.map((so) => {
    const a = { id: so.id, zh: so.zh, hits: 0, loaded: 0, v: 0, n: 0, ss: 0, s30: 0, sec: 0, d1: 0, nOld: 0 };
    srcDays.forEach((k, idx) => {
      const e = stats[k]?.src?.[so.id];
      a.hits += stats[k]?.hitSrc?.[so.id] ?? 0;
      a.loaded += stats[k]?.loadSrc?.[so.id] ?? 0;
      if (!e) return;
      a.v += e.v ?? 0;
      a.n += e.n ?? 0;
      a.ss += e.ss ?? 0;
      a.s30 += e.s30 ?? 0;
      a.sec += e.sec ?? 0;
      // 隔天回來：今天還沒過完，不算今天的
      if (idx > 0) {
        a.d1 += e.d1 ?? 0;
        a.nOld += e.n ?? 0;
      }
    });
    return a;
  }).filter((a) => a.v || a.hits);
  const p100 = (x, y) => (y ? `${Math.round((x / y) * 100)}%` : '-');
  // 🎫 營火月票的收入：這個月（台北時間）付款成功的訂單
  const month = dayKey().slice(0, 7);
  const paid = Object.entries(orders).filter(([, o]) => o.status === 'paid' && !o.sim && dayKey(new Date(o.paidAt)).startsWith(month));
  const revenue = paid.reduce((a, [, o]) => a + o.amt, 0);
  const passTable = `<h3>🎫 月票＋☕ 贊助（${month}）</h3><p class="me">${ECPAY.prod ? '綠界正式模式' : '⚠️ 綠界測試模式（不會真的收錢）'}・這個月 ${paid.length} 筆、收入 <b>NT$ ${revenue.toLocaleString()}</b>（個人網路銷售服務類大約每月 4 萬元以下，可以先不用辦稅籍，以國稅局最新規定為準）</p>${
    paid.length
      ? `<div class="wrap"><table><tr><th>付款時間</th><th>名字</th><th>項目</th><th>金額</th><th>付款方式</th><th>訂單編號</th></tr>${paid
          .sort((a, b) => b[1].paidAt - a[1].paidAt)
          .slice(0, 50)
          .map(([no, o]) => `<tr><td>${new Date(o.paidAt).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })}</td><td>${String(o.name).replace(/[<>&]/g, '')}</td><td>${o.kind === 'sponsor' ? '☕ 贊助' : '🎫 月票'}</td><td>${o.amt}</td><td>${o.pay ?? ''}</td><td>${no}</td></tr>`)
          .join('')}</table></div>`
      : ''
  }`;
  const srcTable = `<h3>📍 來源（最近 7 天）</h3><div class="wrap"><table><tr><th>來源</th><th>打開網頁</th><th>載入完成前就離開</th><th>進來次數</th><th>新旅人</th><th>30秒內離開</th><th>平均停留</th><th>隔天又回來</th></tr>${
    srcRows
      .sort((x, y) => y.v - x.v)
      .map((a) => {
        const avg = a.ss ? Math.round(a.sec / a.ss) : 0;
        return `<tr><td>${a.zh}</td><td>${a.hits || '-'}</td><td>${a.hits ? p100(Math.max(0, a.hits - a.loaded), a.hits) : '-'}</td><td>${a.v}</td><td>${a.n}</td><td>${p100(a.s30, a.ss)}</td><td>${Math.floor(avg / 60)}分${avg % 60}秒</td><td>${p100(a.d1, a.nOld)}</td></tr>`;
      })
      .join('') || '<tr><td colspan="8">還沒有資料（這版上線後才開始記）</td></tr>'
  }</table></div><p>「打開網頁」是網頁一打開就記一次（還沒載入遊戲）；「載入完成前就離開」＝打開網頁但沒等到遊戲畫面就走了，如果很高，代表 30 秒流失是卡在載入。「隔天又回來」＝第一次來的人，隔天又進來的比例（今天的還沒算）。來源是看玩家從哪個網站點過來；Threads、IG 的 App 常常不告訴網站從哪裡來，會算進「直接進來」，貼連結時可以在網址後面加 <code>?src=threads</code>。</p>`;
  const online = [...channels.values()].reduce((n, c) => n + chCount(c), 0);
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>營地統計</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px}h3{color:#ffb46b;margin-top:28px}code{background:#2a211c;padding:1px 5px;border-radius:4px}table{border-collapse:collapse;font-size:13px}th,td{padding:6px 9px;border-bottom:1px solid #3a2e27;text-align:right;white-space:nowrap}th{color:#ffb46b;position:sticky;top:0;background:#1d1714}td:first-child,th:first-child{text-align:left}.wrap{overflow-x:auto}p{opacity:.75;font-size:13px}.me{opacity:1;padding:8px 12px;border-radius:10px;background:#2a211c;display:inline-block}.me button{margin-left:6px;padding:4px 10px;border:none;border-radius:999px;background:#f08a3c;color:#2a1608;font-weight:700;cursor:pointer}.me small{opacity:.7}</style></head>
<body><h2>🔥 營地統計</h2>
<p class="me">這台裝置：<b id="me-st"></b> <button id="me-btn" type="button"></button><br><small>自己測試用的手機、平板、電腦，各打開這頁按一次，你自己進出就不會被算進「進來次數、停留時間、新旅人」。（只影響之後，之前的數字改不了）</small></p>
<script>
(function () {
  var K = 'cozy-campfire-staff';
  var st = document.getElementById('me-st'), btn = document.getElementById('me-btn');
  function get() { try { return localStorage.getItem(K) === '1'; } catch (e) { return false; } }
  function draw() { var on = get(); st.textContent = on ? '🙈 不算進統計' : '👀 會算進統計'; btn.textContent = on ? '改回會算進統計' : '這台裝置不算進統計'; }
  btn.onclick = function () { try { if (get()) localStorage.removeItem(K); else localStorage.setItem(K, '1'); } catch (e) {} draw(); };
  draw();
})();
</script><p>伺服器已經連續醒著 <b>${awakeText()}</b>（從 ${new Date(BOOT_AT).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })} 起；正常只有重新部署時才會歸零，如果常常歸零，代表定時叫醒沒有生效、伺服器睡著過）</p><p>現在在線：${online} 人 · 時區 ${STATS_TZ} · 只統計數字，不記錄個人資料。「30秒內離開」越低越好；「新旅人」是第一次來的人（從 11/3 開始統計）。</p>
<div class="wrap"><table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="${head.length}">還沒有資料</td></tr>'}</table></div>${srcTable}${passTable}</body></html>`);
});

// 📍 網頁一打開就記一次（還沒載入遊戲）：算「載入完成前就離開」；遊戲畫出第一張畫面再記一次 loaded
// 瀏覽器的 sendBeacon 一律用 POST 送，所以 GET、POST 都要收（之前只收 GET，這兩欄一直是「-」）
app.all('/api/hit', (req, res) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.status(204).end();
  if (req.query.staff === '1') return;
  const d = today();
  const q = (k) => String(req.query[k] ?? '').slice(0, 80);
  const src = sourceFrom({ tag: q('src'), invite: q('w') === '1', host: q('h'), ref: q('r') });
  const field = req.query.loaded === '1' ? 'loadSrc' : 'hitSrc';
  d[field === 'loadSrc' ? 'loaded' : 'hits'] = (d[field === 'loadSrc' ? 'loaded' : 'hits'] ?? 0) + 1;
  d[field] ??= {};
  d[field][src] = (d[field][src] ?? 0) + 1;
  saveJson('stats.json', stats);
});

// 💡 玩家建議：/ideas（有設 STATS_KEY 時要帶 ?key=）
app.get('/ideas', (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/ideas?key=…');
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = [...ideas].reverse().map((i) => `<div class="i"><b>${esc(i.n)}</b><small>${new Date(i.at).toLocaleString('zh-TW', { timeZone: STATS_TZ })}</small><p>${esc(i.t)}</p></div>`).join('');
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>玩家建議</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px;max-width:720px;margin:auto}.i{padding:10px 12px;margin:8px 0;border-radius:10px;background:#2a211c}.i b{color:#ffb46b}.i small{opacity:.6;margin-left:8px}.i p{margin:6px 0 0;white-space:pre-wrap}</style></head>
<body><h2>💡 玩家建議（${ideas.length} 則）</h2>${rows || '<p>還沒有建議</p>'}</body></html>`);
});

// 備份：/api/backup（有設 STATS_KEY 時要帶 ?key=），下載所有留言、繪馬、石塔、排行、統計
app.get('/api/backup', (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/api/backup?key=…');
  res.setHeader('Content-Disposition', `attachment; filename="cozy-backup-${dayKey()}.json"`);
  res.json({ notes: shared.notes, wishes: shared.wishes, cairns: shared.cairns, cairnLog, board: shared.board, tree, players, stats, ideas, museum, homes });
});

app.get('/api/health', (_req, res) => {
  const summary = {};
  for (const c of channels.values()) {
    summary[c.ch] = { players: chCount(c), fuel: Math.round(c.fuel) };
    for (const [id, r] of c.rooms) summary[c.ch][id] = r.players.size;
  }
  res.json({ ok: true, awake: awakeText(), since: new Date(BOOT_AT).toISOString(), storage: storage.status, channels: summary });
});

// 🔥 營火月票：帶玩家去綠界付款（自動送出表單）
app.get('/api/pay/go/:no', (req, res) => {
  const no = String(req.params.no);
  const o = orders[no];
  if (!o || o.status !== 'new') return res.status(404).send('找不到這筆訂單，請回遊戲重新按一次購買');
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol;
  const base = `${proto}://${req.headers.host}`;
  const params = {
    MerchantID: ECPAY.id,
    MerchantTradeNo: no,
    MerchantTradeDate: taipeiTime(new Date(o.at)),
    PaymentType: 'aio',
    TotalAmount: String(o.amt),
    TradeDesc: o.kind === 'sponsor' ? 'CozyCampfire support' : 'CozyCampfire monthly pass',
    ItemName: o.kind === 'sponsor' ? SPONSOR.item : PASS.item,
    ReturnURL: `${base}/api/pay/notify`,
    ChoosePayment: 'ALL',
    EncryptType: '1',
    ClientBackURL: `${base}/?paid=${no}`,
    CustomField1: homeId(o.vid),
  };
  params.CheckMacValue = ecpayMac(params);
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  res.set('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前往綠界付款</title></head>
<body style="font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;text-align:center;padding:40px 16px">
<p>🔥 正在前往綠界付款頁⋯</p>
<form id="f" method="post" action="${ECPAY_URL}">${Object.entries(params).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')}
<button type="submit" style="margin-top:16px;padding:10px 20px;border:none;border-radius:999px;background:#f08a3c;font-size:16px">如果沒有自動跳轉，請按這裡</button></form>
<script>document.getElementById('f').submit();</script></body></html>`);
});
// 綠界付款結果通知（伺服器對伺服器）：驗證檢查碼，付款成功就自動開通
app.post('/api/pay/notify', express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body ?? {};
  if (!b.CheckMacValue || ecpayMac(b) !== String(b.CheckMacValue).toUpperCase()) {
    console.warn('[月票] 檢查碼不對，忽略這個通知');
    return res.send('0|CheckMacValue Error');
  }
  const o = orders[b.MerchantTradeNo];
  if (!o) return res.send('1|OK');
  if (b.RtnCode === '1' && o.status !== 'paid') {
    if (Number(b.TradeAmt) !== o.amt) {
      console.warn('[月票] 金額不符', b.MerchantTradeNo, b.TradeAmt);
      return res.send('1|OK');
    }
    o.status = 'paid';
    o.paidAt = Date.now();
    o.pay = String(b.PaymentType ?? '').slice(0, 40);
    o.ecpay = String(b.TradeNo ?? '').slice(0, 40);
    o.sim = b.SimulatePaid === '1'; // 綠界後台的「模擬付款」
    saveJson('orders.json', orders);
    if (!o.sim || !ECPAY.prod) (o.kind === 'sponsor' ? activateSponsor : activatePass)(o.vid, o);
  } else if (b.RtnCode !== '1') {
    o.last = `${b.RtnCode}:${String(b.RtnMsg ?? '').slice(0, 60)}`; // ATM、超商代碼取號成功，還沒付款
    saveJson('orders.json', orders);
  }
  res.send('1|OK');
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

const publicInfo = (p) => ({ id: p.id, name: p.name, fur: p.fur, sp: p.sp, tl: p.tl || undefined, er: p.er || undefined, rw: p.rw, ot: p.ot, pb: p.pb, s: packState(p) });

/** 某個分流的某個房間，給新進玩家的完整資料 */
function roomSnapshot(c, id, selfId) {
  const r = c.rooms.get(id);
  return {
    ch: c.ch,
    room: id,
    fuel: c.fuel,
    song: r.song,
    board: id === 'lake_dock' || id === 'forest_main' ? boardAll() : undefined,
    wishes: id === 'forest_main' ? recent(shared.wishes, MAX_WISHES) : undefined,
    notes: id === 'forest_main' ? recent(shared.notes, MAX_NOTES) : undefined,
    cairns: id === 'forest_main' ? shared.cairns : undefined,
    cairnLog: id === 'forest_main' ? publicCairnLog() : undefined,
    tree: id === 'forest_main' ? tree : undefined,
    museum: id === 'forest_main' ? museum : undefined,
    treasures: id === 'forest_main' ? publicTreasures(c) : undefined,
    trash: PLACE_OF_ROOM[id] ? publicTrash(c, PLACE_OF_ROOM[id]) : undefined,
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
  return { forest_main: n('forest_main'), lake_dock: n('lake_dock'), tent_focus: n('tent_focus'), treehouse_music: n('treehouse_music'), tent_social: n('tent_social'), campground: n('campground') + inTents, mist_forest: n('mist_forest') };
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
  const award = (n, reason, flat = false) => {
    if (!wal || n <= 0) return;
    if (!flat && eventInfo().active) n *= 2; // 營火時間：松果加倍
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

  /** 離開目前的分流／房間 */
  /** 離開目前的房間；to：去了哪裡（沒有＝離開遊戲） */
  const leave = (to) => {
    room.players.delete(socket.id);
    socket.leave(rkey);
    io.to(rkey).emit('playerLeft', to ? { id: socket.id, to } : { id: socket.id });
    if (roomId === 'home' && room.players.size === 0) homeRooms.delete(homeOwner);
  };
  /** 進入某個分流的某個房間 */
  const enter = (c, id) => {
    chan = c;
    if (player) player.ch = c.ch;
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
      tl: TAIL_BY_ID[data.tail] ? data.tail : '', // 🐾 尾巴、耳朵形狀（下面會檢查有沒有買）
      er: EAR_BY_ID[data.ear] ? data.ear : '',
      rw: 0, // 贊助回饋：0 無、1 小黃花、2 四葉草（由伺服器判斷，玩家改不了）
      x: num(data.x, -POS_MAX, POS_MAX, 0),
      z: num(data.z, -POS_MAX, POS_MAX, 6),
      ry: num(data.ry, -10, 10, Math.PI),
      a: 'idle',
      d: 0,
      e: 0,
      dirty: true,
      vid: String(data.vid ?? '').slice(0, 24),
    };
    // 🎲 隨機名字不要和線上的人撞名：撞到了就換前端先準備好的備用名字（自己取的名字不動）
    {
      const me = String(data.vid ?? '').slice(0, 24);
      const inUse = (n) => {
        for (const s2 of io.sockets.sockets.values()) if (s2.id !== socket.id && s2.data.vid !== me && s2.data.name === n) return true;
        return false;
      };
      if (data.auto && inUse(player.name)) {
        const alts = Array.isArray(data.alts) ? data.alts.slice(0, 8).map(cleanName) : [];
        let next = alts.find((n) => !inUse(n));
        for (let i = 0; !next && i < 20; i++) {
          const n = `${player.name.slice(0, 10)}${Math.floor(Math.random() * 90 + 10)}`;
          if (!inUse(n)) next = n;
        }
        if (next) player.name = next;
      }
      socket.data.name = player.name;
    }
    player.rw = findReward(player.name, data.code);
    const src = cleanSource(data.src);
    // 統計：第一次進來才算一次來訪（斷線重連、改名字不重複算）
    // 🙈 作者自己的裝置（在 /stats 按過「這台裝置不算進統計」）：來訪、停留、新旅人都不算
    if (!data.rejoin && !data.staff) {
      session = { at: Date.now() };
      const d = today();
      d.visits++;
      const vid = String(data.vid ?? '').slice(0, 24);
      if (vid && !d.vids.includes(vid) && d.vids.length < 50000) d.vids.push(vid);
      if (data.touch) d.touch++;
      // 來源統計：從哪裡來的、各來源有幾個新旅人
      d.src ??= {};
      const e = (d.src[src] ??= { v: 0, n: 0 });
      e.v++;
      session.src = src;
      saveJson('stats.json', stats);
    }
    enter(c, wanted);
    tidyChannels();

    // 松果錢包：每天第一次來，依連續天數送松果（第 1 天 3 顆，之後每天多 1 顆，最多 9 顆）
    const myVid = String(data.vid ?? '').slice(0, 24);
    const firstVisit = !!myVid && !players[myVid]; // 第一次來（瀏覽器裡還沒有任何紀錄）
    if (session && firstVisit) session.newbie = true; // 統計：新旅人留不留得住
    wal = wallet(myVid);
    if (wal) player.ot = wearCodes(wal);
    // 🐾 特殊毛色、尾巴、耳朵：沒買過的不能用（動物本來的形狀免費）
    {
      const lk = wal?.looks ?? {};
      if (player.fur >= BASE_FUR && !(lk.fur ?? []).includes(player.fur)) player.fur = 0;
      if (player.tl && player.tl !== SPECIES_TAIL[player.sp] && !(lk.tail ?? []).includes(player.tl)) player.tl = '';
      if (player.er && player.er !== SPECIES_EARS[player.sp] && !(lk.ear ?? []).includes(player.er)) player.er = '';
    }
    if (wal) player.pb = passActive(wal) ? 1 : 0; // 🔥 月票徽章
    // 第一次來：記住是從哪裡來的（算隔天回來的比例用）
    if (firstVisit && wal) {
      wal.src = src;
      wal.fd = dayKey();
      if (session) today().src[src].n++;
    }
    socket.data.vid = wal ? String(data.vid).slice(0, 24) : null;
    const ip = String(socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address ?? '').split(',')[0].trim();
    // 朋友透過連結進來（?with=）：
    // ① 第一次來、待滿 3 分鐘 → 邀請人拿松果和每週造型
    // ② 待滿 1 分鐘（新、舊玩家都算）→ 分享人拿今天的每日造型
    // ③ 營火時間進來、待滿 1 分鐘 → 兩個人都拿營火之約造型（同一對每天一次）
    if (data.with && !data.rejoin && wal) {
      const raw = String(data.with).slice(0, 24);
      const refVid = vidOfCode(raw) ?? (players[raw] ? raw : null);
      const why = !refVid ? '找不到邀請人' : refVid === myVid ? '自己點自己的連結' : lastIp.get(refVid) === ip ? '和邀請人同一個網路' : null;
      if (why) console.log(`[邀請] 沒算到：${player.name}（${why}）`);
      else {
        const name = player.name;
        if (firstVisit) {
          wal.by = homeId(refVid);
          addStay('invite', myVid, refVid, name, REF_STAY_MS);
          if (!data.staff) bump('invNew');
        }
        addStay('share', myVid, refVid, name, SHARE_STAY_MS);
        if (eventInfo().active && players[refVid]) addStay('date', myVid, refVid, name, DATE_STAY_MS);
      }
    }
    if (wal) lastIp.set(myVid, ip);
    if (wal) setTimeout(() => checkStays(myVid), 0); // 朋友跳出去又回來：時間已經到了就馬上發
    let daily = null;
    if (wal) {
      const d = dayKey();
      if (wal.last !== d) {
        const yesterday = dayKey(new Date(Date.now() - 86400000));
        // 來源統計：昨天第一次來的人，今天又回來了
        if (wal.fd === yesterday && wal.src && stats[yesterday]?.src?.[wal.src] && !data.staff) {
          stats[yesterday].src[wal.src].d1 = (stats[yesterday].src[wal.src].d1 ?? 0) + 1;
          saveJson('stats.json', stats);
        }
        wal.streak = wal.last === yesterday ? wal.streak + 1 : 1;
        wal.last = d;
        const gain = 2 + Math.min(wal.streak, 7);
        wal.pc += gain;
        wal.tot += gain;
        saveJson('players.json', players);
        daily = { gain, streak: wal.streak };
      }
      // 🔥 營火月票：每天第一次進來多領松果
      if (passActive(wal) && wal.pd !== d) {
        wal.pd = d;
        wal.pc += PASS.daily;
        wal.tot += PASS.daily;
        saveJson('players.json', players);
        daily = { ...(daily ?? { gain: 0, streak: wal.streak }), pass: PASS.daily };
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
      name: player.name, // 隨機名字撞名時，伺服器換過的名字
      reward: player.rw,
      wallet: wal ? { pc: wal.pc, streak: wal.streak, daily, age: walletAge(wal), dex: dexView(wal), look: wal.look ?? null, outfit: outfitView(wal), basket: wal.bk ?? {}, gdex: gdexOf(wal), ...trashView(wal), dishes: wal.dish ?? {}, cooked: Object.keys(wal.cooked ?? {}), net: !!wal.net, pass: passView(wal) } : null,
      myHome: publicHome(homes[player.vid]),
      code: player.vid ? homeId(player.vid) : null, // 邀請連結用的公開代號
      passOn: PASS_ON, // 🎫 月票要不要顯示
      ver: webVersion,
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
    leave('channel'); // 換分流
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
    // 🏃 位置檢查：一次最多只能移動「跑步速度 × 經過時間」那麼遠，用主控台瞬移會被拉回來慢慢走
    {
      const now = Date.now();
      const dt = Math.min(Math.max((now - (player.posAt ?? now)) / 1000, 0.05), 1.5);
      player.posAt = now;
      const tx = num(s[0], -POS_MAX, POS_MAX, player.x);
      const tz = num(s[1], -POS_MAX, POS_MAX, player.z);
      const dx = tx - player.x;
      const dz = tz - player.z;
      const dist = Math.hypot(dx, dz);
      const maxStep = MAX_SPEED * dt + 1.5;
      if (dist > maxStep) {
        player.x += (dx / dist) * maxStep;
        player.z += (dz / dist) * maxStep;
      } else [player.x, player.z] = [tx, tz];
    }
    player.ry = num(s[2], -1000, 1000, player.ry);
    player.a = ACTION_STATES.has(s[3]) ? s[3] : 'idle';
    player.d = num(s[4], 0, 2, 0);
    player.e = Math.floor(num(s[5], 0, 99999, 0));
    player.st = Date.now(); // 最後一次收到狀態的時間（手機鎖螢幕、切到別的 App 就不會再送）
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
      leave('home');
      player.x = num(data.x, -POS_MAX, POS_MAX, 0);
      player.z = num(data.z, -POS_MAX, POS_MAX, 0);
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

    leave(next);
    player.x = num(data.x, -POS_MAX, POS_MAX, 0);
    player.z = num(data.z, -POS_MAX, POS_MAX, 0);
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
    shared.wishes = shared.wishes.slice(-ARCHIVE_MAX);
    saveJson('wishes.json', shared.wishes);
    bump('wishes');
    emitAllChannels('forest_main', 'wishes', { wishes: recent(shared.wishes, MAX_WISHES), by: socket.id, name: player.name });
    pushNews('wish');
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
    totals.stones++;
    saveJson('totals.json', totals);
    // 「你是今天第幾位許願的旅人」：每次來訪第一次疊石頭才算
    let ritual = null;
    if (!stacked && questFirst('stone')) {
      stacked = true;
      if (session) session.did = true;
      bump('ritual');
      ritual = today().ritual;
      award(QUEST_GAIN, 'quest');
    }
    if (cairn.length >= CAIRN_MAX) {
      cairnLog.done[i] = now;
      saveJson('cairnlog.json', cairnLog);
    }
    miniBonus('stone');
    pushNews('stone');
    emitAllChannels('forest_main', 'stone', { i, stone, count: cairn.length, by: socket.id, today: todayPublic(), done: cairnLog.done[i] });
    ack?.({ ok: true, count: cairn.length, ritual });
  });

  // 每日任務完成：回傳「你是今天第幾位完成這個任務的旅人」（每次來訪每種任務只算一次）
  const QUEST_IDS = new Set(['wood', 'roast', 'kuji', 'ema', 'note', 'fish', 'meteor', 'hang']);
  const questsDone = new Set();
  /** 每天每種任務只算一次：記在玩家存檔（以前記在這次連線，重新整理網頁就能再領） */
  const questFirst = (id) => {
    if (!wal) return !questsDone.has(id);
    const d = dayKey();
    if (wal.qd !== d) [wal.qd, wal.qdone] = [d, []];
    if (wal.qdone.includes(id)) return false;
    wal.qdone.push(id);
    return true;
  };
  socket.on('quest', (data = {}, ack) => {
    const id = String(data.id ?? '');
    if (!player || !QUEST_IDS.has(id)) return ack?.({ ok: false });
    const d = today();
    d.quests ??= {};
    if (session) session.did = true;
    if (!questsDone.has(id) && questFirst(id)) {
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
    const h = (homes[player.vid] ??= newHome());
    // 🚙 門口擺設：yard_露營車⋯
    const yardId = id.startsWith('yard_') ? id.slice(5) : null;
    if (yardId) {
      const y = YARD_BY_ID[yardId];
      if (!y) return ack?.({ ok: false, reason: 'unknown' });
      if (!h.tent) return ack?.({ ok: false, reason: 'noTent' });
      h.yard ??= { own: [], on: null };
      if (h.yard.own.includes(yardId)) return ack?.({ ok: false, reason: 'owned' });
      if (wal.pc < y.price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      if (Date.now() - lastBuy < 800) return ack?.({ ok: false, reason: 'tooFast' });
      lastBuy = Date.now();
      wal.pc -= y.price;
      h.yard.own.push(yardId);
      h.yard.on = yardId;
      saveJson('players.json', players);
      saveJson('homes.json', homes);
      bump('buys');
      socket.emit('wallet', { pc: wal.pc, delta: -y.price, reason: 'buy' });
      return ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
    }
    const price = shapeId ? shape?.price : id === 'expand' ? expandPrice(h) : SHOP[id];
    if (id === 'expand' && h.tent && !price) return ack?.({ ok: false, reason: 'maxed' });
    if (!price) return ack?.({ ok: false, reason: 'unknown' });
    const now = Date.now();
    if (now - lastBuy < 800) return ack?.({ ok: false, reason: 'tooFast' });
    if (id === 'expand') {
      // 📐 擴建帳篷：地板多一圈格子，一次比一次貴
      if (!h.tent) return ack?.({ ok: false, reason: 'noTent' });
      if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      lastBuy = now;
      wal.pc -= price;
      expandHome(h);
      saveJson('players.json', players);
      saveJson('homes.json', homes);
      bump('buys');
      socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'buy' });
      io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
      return ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
    }
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
    if (id !== 'tent' && (h.inv[id] ?? 0) >= (CATALOG_BY_ID[id]?.kind === 'wall' ? 80 : 20)) return ack?.({ ok: false, reason: 'tooMany' });
    // 🎨 買的時候選的配色（0＝原色）
    const color = hasColors(CATALOG_BY_ID[id]) ? Math.floor(num(data.c, 0, FURNITURE_COLORS.length - 1, 0)) : 0;
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    lastBuy = now;
    wal.pc -= price;
    if (id === 'tent') {
      h.tent = true;
      h.name = player.name;
      h.at = now;
    }
    else {
      h.inv[id] = (h.inv[id] ?? 0) + 1;
      if (color) {
        h.cinv ??= {};
        h.cinv[`${id}~${color}`] = (h.cinv[`${id}~${color}`] ?? 0) + 1;
      }
    }
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    bump('buys');
    socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'buy' });
    ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
  });

  // ---------- 布置自己的帳篷：放、轉、收起 ----------
  socket.on('homeEdit', (data = {}, ack) => {
    // 花色、造型在小舖也能換；擺家具要在自己的帳篷裡
    if (data.op === 'style' || data.op === 'shape' || data.op === 'yard') {
      const h = homes[player?.vid];
      if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
      const v = String(data.s ?? '');
      if (data.op === 'yard') {
        // 🚙 換門口擺設（空字串＝收起來）
        if (v && !(h.yard?.own ?? []).includes(v)) return ack?.({ ok: false, reason: 'locked' });
        h.yard ??= { own: [], on: null };
        h.yard.on = v || null;
      } else if (data.op === 'style') {
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
    if (!validCell(x, z, gridOf(h), h)) return ack?.({ ok: false, reason: 'cell' });
    // 一格可以疊好幾層（地墊→家具→小東西）；轉向、收起要指定第幾層，沒指定就是最上面那件
    const stack = stackAt(h.items, x, z);
    const lv = data.l == null ? stack.length - 1 : Math.floor(num(data.l, 0, 9, 0));
    const target = stack[lv] ?? null;
    if (data.op === 'place') {
      const i = String(data.i ?? '');
      if ((!SHOP[i] && !GIFT_FURNITURE.has(i) && !CATALOG_BY_ID[i]?.craft) || i === 'tent') return ack?.({ ok: false, reason: 'unknown' });
      const chk = stackCheck(h, x, z, i);
      if (chk.reason) return ack?.({ ok: false, reason: chk.reason });
      const c = hasColors(CATALOG_BY_ID[i]) ? Math.floor(num(data.c, 0, FURNITURE_COLORS.length - 1, 0)) : 0;
      if (available(h, i, c) <= 0) return ack?.({ ok: false, reason: 'none' });
      if (h.items.length >= maxItems(gridOf(h), hasLoft(h))) return ack?.({ ok: false, reason: 'tooMany' });
      const it = { i, x, z, r: Math.floor(num(data.r, 0, 3, 0)), l: chk.l };
      if (c) it.c = c;
      h.items.push(it);
    } else if (data.op === 'fish') {
      // 🐠 大魚缸：放一條自己釣過的魚（-1＝拿出來）
      if (!target || !CATALOG_BY_ID[target.i]?.fish) return ack?.({ ok: false, reason: 'empty' });
      const f = Math.floor(num(data.fish, -1, FISH_COUNT - 1, -1));
      if (f >= 0 && (JUNK.has(f) || !(f in (wal?.dex ?? {})))) return ack?.({ ok: false, reason: 'notCaught' });
      if (f >= 0 && !fishFits(CATALOG_BY_ID[target.i], FISH[f])) return ack?.({ ok: false, reason: 'tooBig' });
      if (f < 0) delete target.fish;
      else target.fish = f;
    } else if (data.op === 'rotate') {
      if (!target) return ack?.({ ok: false, reason: 'empty' });
      target.r = ((target.r ?? 0) + 1) % 4;
    } else if (data.op === 'move') {
      // ✋ 直接搬家：這一層連同上面疊的，一起搬到另一格的最上面
      const tx = Number(data.tx);
      const tz = Number(data.tz);
      if (!validCell(tx, tz, gridOf(h), h)) return ack?.({ ok: false, reason: 'cell' });
      if (!target) return ack?.({ ok: false, reason: 'empty' });
      const why = moveStack(h.items, x, z, lv, tx, tz);
      if (why) return ack?.({ ok: false, reason: why });
    } else if (data.op === 'remove') {
      if (!target) return ack?.({ ok: false, reason: 'empty' });
      // 收起某一層：疊在它上面的也一起收回背包
      const drop = new Set(stack.slice(lv));
      h.items = h.items.filter((it) => !drop.has(it));
    } else return ack?.({ ok: false, reason: 'op' });
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    ack?.({ ok: true, home: publicHome(h) });
  });
  // 🐾 買動物外型：kind＝fur（特殊毛色索引）／tail／ear
  socket.on('lookInfo', (data, ack) => ack?.(wal ? { ok: true, looks: wal.looks ?? {} } : { ok: false }));
  socket.on('buyLook', (data = {}, ack) => {
    if (!wal) return ack?.({ ok: false, reason: 'noWallet' });
    const kind = String(data.kind ?? '');
    const item =
      kind === 'fur' ? PREMIUM_FUR.find((x) => x.i === Number(data.id)) : kind === 'tail' ? TAIL_BY_ID[data.id] : kind === 'ear' ? EAR_BY_ID[data.id] : null;
    if (!item) return ack?.({ ok: false, reason: 'unknown' });
    const key = kind === 'fur' ? item.i : item.id;
    wal.looks ??= {};
    wal.looks[kind] ??= [];
    if (wal.looks[kind].includes(key)) return ack?.({ ok: false, reason: 'owned' });
    if (wal.pc < item.price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= item.price;
    wal.looks[kind].push(key);
    saveJson('players.json', players);
    bump('buys');
    socket.emit('wallet', { pc: wal.pc, delta: -item.price, reason: 'buy' });
    ack?.({ ok: true, pc: wal.pc, looks: wal.looks });
  });
  // 👤 記住自己取的名字和外型（換裝置用帳號登入就會跟著回來）
  socket.on('saveLook', (data = {}) => {
    if (!wal) return;
    const name = String(data.name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
    if (!name) return;
    wal.look = { name, fur: Math.floor(num(data.fur, 0, 50, 0)), species: Math.floor(num(data.species, 0, 50, 0)), tail: TAIL_BY_ID[data.tail] ? data.tail : '', ear: EAR_BY_ID[data.ear] ? data.ear : '' };
    saveJson('players.json', players);
  });

  // 📖 把以前存在瀏覽器裡的魚簍紀錄存進帳號（只顯示，不送松果；換手機登入也看得到）
  socket.on('dexSync', (data = {}, ack) => {
    if (!wal) return ack?.({ ok: false });
    wal.dexOld ??= {};
    let changed = false;
    for (const [k, v] of Object.entries(data.dex ?? {}).slice(0, FISH_COUNT)) {
      const i = Number(k);
      const size = Math.round(num(v, 0, FISH_MAX_CM, 0));
      if (!Number.isInteger(i) || i < 0 || i >= FISH_COUNT || size <= 0) continue;
      if (size > (wal.dexOld[i] ?? 0)) {
        wal.dexOld[i] = size;
        changed = true;
      }
    }
    if (changed) saveJson('players.json', players);
    ack?.({ ok: true, dex: dexView(wal) });
  });

  // 💡 給建議：每天第一則送 3 顆松果
  let lastIdea = 0;
  socket.on('idea', (data = {}, ack) => {
    if (!player) return ack?.({ ok: false });
    const text = String(data.text ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 200);
    if (text.length < 4) return ack?.({ ok: false, reason: 'short' });
    const now = Date.now();
    if (now - lastIdea < 60000) return ack?.({ ok: false, reason: 'tooFast' });
    lastIdea = now;
    ideas.push({ n: player.name, t: text, at: now });
    ideas = ideas.slice(-2000);
    saveJson('ideas.json', ideas);
    let gain = 0;
    if (wal && wal.ideaDay !== dayKey()) {
      wal.ideaDay = dayKey();
      gain = 3;
      award(gain, 'idea');
    }
    console.log(`[建議] ${player.name}：${text.slice(0, 60)}`);
    ack?.({ ok: true, gain });
  });

  // 🎁 分享一次就送「營火明信片牆」（每人一次）
  // 👒 每天第一次分享：送今天的每日造型（每天換一款）
  socket.on('shared', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    const d = dayKey();
    const first = !wal.shared;
    const todayFirst = wal.sd2 !== d;
    if (!first && !todayFirst) return ack?.({ ok: false, reason: 'done' });
    wal.shared = true;
    wal.sd2 = d;
    saveJson('players.json', players);
    if (todayFirst && !data?.staff) bump('shares');
    const kind = String(data?.kind ?? '').slice(0, 12);
    if (kind === 'invite' && todayFirst) bump('invShares');
    // 每日造型不再按了就送（以前傳到只有自己的群組也拿得到）：要有朋友點連結進來待滿 1 分鐘才送（見 addStay 'share'）
    ack?.({ ok: true, gift: first ? grantGift(player.vid, 'postcard') : null, outfit: null });
  });
  socket.on('outfitInfo', (data, ack) => ack?.(wal ? { ok: true, ...outfitView(wal) } : { ok: false }));
  socket.on('wear', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const slot = OUTFIT_SLOTS.includes(data.slot) ? data.slot : null;
    if (!slot) return ack?.({ ok: false });
    const id = data.id ? String(data.id) : null;
    if (id && (OUTFIT_BY_ID[id]?.slot !== slot || !wal.outfits?.includes(id))) return ack?.({ ok: false, reason: 'notOwned' });
    wal.wear ??= {};
    if (id) wal.wear[slot] = id;
    else delete wal.wear[slot];
    saveJson('players.json', players);
    player.ot = wearCodes(wal);
    syncRack(player.vid);
    socket.to(rkey).emit('outfit', { id: socket.id, ot: player.ot });
    ack?.({ ok: true, wear: wal.wear });
  });

  // 🍄 迷霧森林採集：每個人的採集點各自分開
  socket.on('gatherInfo', (data, ack) => {
    if (!wal) return ack?.({ ok: false });
    ack?.({ ok: true, ready: GATHER_SPOTS.map((_, i) => wal.gat?.[i] ?? 0), basket: wal.bk ?? {}, gdex: gdexOf(wal), night: isNight(), now: Date.now(), net: !!wal.net });
  });
  // ✨ 撿到營火寶藏
  socket.on('treasure', (data = {}, ack) => {
    if (!wal || !player || roomId !== 'forest_main') return ack?.({ ok: false });
    const list = chan.treasures ?? [];
    const k = Number(data.k);
    const tr = list.find((x) => x.k === k);
    if (!tr) return ack?.({ ok: false, reason: 'gone' });
    if (Math.hypot(player.x - tr.x, player.z - tr.z) > TOUCH_R + 2.5) return ack?.({ ok: false, reason: 'far' });
    chan.treasures = list.filter((x) => x !== tr);
    const it = GATHER_BY_ID[tr.item];
    wal.bk ??= {};
    wal.bk[it.id] = (wal.bk[it.id] ?? 0) + 1;
    const dexFirst = discover(wal, it.id);
    const gain = dexFirst ? GATHER_FIRST_GAIN[it.rarity] ?? 4 : 2;
    award(gain, 'treasure');
    saveJson('players.json', players);
    bump('treasures');
    io.to(rkey).emit('treasures', { list: publicTreasures(chan), by: player.name, item: it.id, byId: socket.id });
    ack?.({ ok: true, id: it.id, count: wal.bk[it.id], first: dexFirst, gain });
  });

  // ♻️ 撿垃圾
  socket.on('pickTrash', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const place = PLACE_OF_ROOM[roomId];
    const list = place && chan.trash?.[place];
    const k = Number(data.k);
    const tr = list?.find((x) => x.k === k);
    if (!tr) return ack?.({ ok: false, reason: 'gone' });
    if (Math.hypot(player.x - tr.x, player.z - tr.z) > TOUCH_R + 2.5) return ack?.({ ok: false, reason: 'far' });
    chan.trash[place] = list.filter((x) => x !== tr);
    const r = gotTrash(wal, player.vid, tr.item);
    if (r.gain) award(r.gain, 'trash');
    saveJson('players.json', players);
    bump('trash');
    io.to(rkey).emit('trash', { room: roomId, list: publicTrash(chan, place), by: player.name, byId: socket.id, item: tr.item });
    ack?.({ ok: true, id: tr.item, ...r, ...trashView(wal) });
  });
  socket.on('trashInfo', (data, ack) => {
    if (!wal) return ack?.({ ok: false });
    const d = today();
    ack?.({ ok: true, ...trashView(wal), recycledToday: wal.rcd === dayKey() ? wal.rcn ?? 0 : 0, cap: RECYCLE_DAILY_CAP, todayAll: d.recycled ?? 0, allTime: totals.trash ?? 0 });
  });
  // ♻️ 丟回收桶：垃圾袋清空，每件換 1 顆松果（每天最多 20 顆）
  socket.on('recycle', (data, ack) => {
    if (!wal || !player || roomId !== 'forest_main') return ack?.({ ok: false });
    const n = Object.values(wal.tbag ?? {}).reduce((a, b) => a + b, 0);
    if (!n) return ack?.({ ok: false, reason: 'empty' });
    const dk = dayKey();
    if (wal.rcd !== dk) {
      wal.rcd = dk;
      wal.rcn = 0;
    }
    const gain = Math.max(0, Math.min(n * RECYCLE_GAIN, RECYCLE_DAILY_CAP - wal.rcn));
    wal.rcn += gain;
    wal.tbag = {};
    if (gain) award(gain, 'recycle');
    const d = today();
    d.recycled = (d.recycled ?? 0) + n;
    saveJson('stats.json', stats);
    saveJson('players.json', players);
    ack?.({ ok: true, n, gain, todayAll: d.recycled, allTime: totals.trash ?? 0, ...trashView(wal) });
  });

  // 🔥 營火月票
  const hasAccount = () => !!player?.vid && Object.values(accounts).some((a) => a.vid === player.vid);
  socket.on('passInfo', (data, ack) => ack?.(wal ? { ok: true, ...passView(wal), account: hasAccount(), price: PASS.price, test: !ECPAY.prod, on: PASS_ON } : { ok: false }));
  let lastOrder = 0;
  // ☕ 贊助：這個月的假髮、能不能付款
  socket.on('sponsorInfo', (data, ack) => {
    const wigs = sponsorOutfits(dayKey().slice(0, 7)).map((o) => o.id);
    ack?.({ ok: true, on: PASS_ON, test: !ECPAY.prod, amounts: SPONSOR.amounts, min: SPONSOR.min, wigs, owned: wigs.filter((id) => wal?.outfits?.includes(id)), account: hasAccount(), total: wal?.spons ?? 0 });
  });
  socket.on('sponsorOrder', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (!PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (!hasAccount()) return ack?.({ ok: false, reason: 'account' });
    const amt = Number(data.amt);
    if (!SPONSOR.amounts.includes(amt)) return ack?.({ ok: false, reason: 'amt' });
    const now = Date.now();
    if (now - lastOrder < 5000) return ack?.({ ok: false, reason: 'tooFast' });
    lastOrder = now;
    const no = `CS${now.toString(36)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 20).toUpperCase();
    const wigs = sponsorOutfits(dayKey().slice(0, 7)).map((o) => o.id);
    const wig = wigs.includes(data.wig) ? data.wig : wigs[0];
    orders[no] = { vid: player.vid, name: player.name, amt, at: now, status: 'new', kind: 'sponsor', wig };
    saveJson('orders.json', orders);
    const proto = socket.handshake.headers['x-forwarded-proto']?.split(',')[0] || 'http';
    ack?.({ ok: true, no, url: `${proto}://${socket.handshake.headers.host}/api/pay/go/${no}` });
  });
  socket.on('passOrder', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (!PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (!hasAccount()) return ack?.({ ok: false, reason: 'account' });
    const now = Date.now();
    if (now - lastOrder < 5000) return ack?.({ ok: false, reason: 'tooFast' });
    lastOrder = now;
    // 訂單編號：英數字 20 字以內，不能重複
    const no = `CF${now.toString(36)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 20).toUpperCase();
    orders[no] = { vid: player.vid, name: player.name, amt: PASS.price, at: now, status: 'new' };
    // 太舊、沒付款的訂單清掉
    for (const [k, o] of Object.entries(orders)) if (o.status === 'new' && now - o.at > 7 * 86400000) delete orders[k];
    saveJson('orders.json', orders);
    const proto = socket.handshake.headers['x-forwarded-proto']?.split(',')[0] || 'http';
    ack?.({ ok: true, no, url: `${proto}://${socket.handshake.headers.host}/api/pay/go/${no}` });
  });

  // 🦋 捕蟲網：用松果買一次，之後一直能用
  socket.on('buyNet', (data, ack) => {
    if (!wal) return ack?.({ ok: false });
    if (wal.net) return ack?.({ ok: true, net: true, pc: wal.pc });
    if (wal.pc < NET_PRICE) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= NET_PRICE;
    wal.net = true;
    saveJson('players.json', players);
    bump('buys');
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    ack?.({ ok: true, net: true, pc: wal.pc });
  });
  socket.on('gather', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const i = Math.floor(num(data.i, -1, GATHER_SPOTS.length, -1));
    const spot = GATHER_SPOTS[i];
    if (!spot || spot.room !== roomId) return ack?.({ ok: false });
    const isBug = spot.type === 'bug';
    if (isBug && !wal.net) return ack?.({ ok: false, reason: 'noNet' });
    if (Math.hypot(player.x - spot.x, player.z - spot.z) > (isBug ? BUG_WANDER + BUG_CATCH_R : GATHER_R) + 2.5) return ack?.({ ok: false, reason: 'far' });
    const now = Date.now();
    wal.gat ??= {};
    if ((wal.gat[i] ?? 0) > now) return ack?.({ ok: false, reason: 'notYet', readyAt: wal.gat[i] });
    const item = gatherItemAt(spot.type, isNight());
    wal.gat[i] = now + Math.round(regrowMs());
    wal.bk ??= {};
    wal.bk[item.id] = (wal.bk[item.id] ?? 0) + 1;
    const first = discover(wal, item.id);
    let gain = 0;
    let bonus = 0;
    if (first) {
      gain = GATHER_FIRST_GAIN[item.rarity] ?? 2;
      if (GATHER_ITEMS.every((x) => wal.gdex[x.id])) bonus = GATHER_DEX_BONUS;
      award(gain + bonus, 'gather');
    }
    saveJson('players.json', players);
    bump('gathers');
    ack?.({ ok: true, id: item.id, count: wal.bk[item.id], first, gain, bonus, readyAt: wal.gat[i], now });
  });
  socket.on('giftInfo', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    ack?.({ ok: true, code: homeId(player.vid), shared: !!wal.shared, refs: wal.refs ?? 0, gifts: homes[player.vid]?.gifts ?? [], gain: REF_GAIN, stay: Math.round(REF_STAY_MS / 60000), ...outfitView(wal) });
  });

  // 帳篷營地：列出大家的帳篷
  // 翻看以前的留言／繪馬：page 0 是最新的一頁，回傳新的在前
  socket.on('history', (data = {}, ack) => {
    const all = data.kind === 'wishes' ? shared.wishes : data.kind === 'notes' ? shared.notes : null;
    if (!all) return ack?.({ ok: false });
    const pages = Math.max(1, Math.ceil(all.length / HISTORY_PAGE));
    const page = Math.min(pages - 1, Math.max(0, Math.floor(Number(data.page) || 0)));
    const end = all.length - page * HISTORY_PAGE;
    ack?.({ ok: true, page, pages, total: all.length, items: all.slice(Math.max(0, end - HISTORY_PAGE), end).reverse() });
  });
  socket.on('campList', (data, ack) => ack?.({ ok: true, tents: campList(player?.vid) }));

  // ---------- 🏛️ 營地標本櫃：大家一起捐，寫上第一個捐的人 ----------
  const donatedToday = () => (wal?.mday === dayKey() ? wal.mcount ?? 1 : 0);
  socket.on('museumInfo', (data, ack) => ack?.({ ok: true, museum, left: wal ? Math.max(0, DONATE_PER_DAY - donatedToday()) : 0, fishDex: Object.keys(dexView(wal)) }));
  socket.on('donate', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const id = String(data.id ?? '');
    const it = MUSEUM_BY_ID[id];
    if (!it) return ack?.({ ok: false, reason: 'unknown' });
    if (museum[id]) return ack?.({ ok: false, reason: 'done', by: museum[id].n });
    // 每個人每天只能捐一件：大家慢慢一起填滿
    if (donatedToday() >= DONATE_PER_DAY) return ack?.({ ok: false, reason: 'daily' });
    if (it.type === 'fish') {
      if (!(dexView(wal)[it.fish] > 0)) return ack?.({ ok: false, reason: 'none' }); // 釣過才能捐魚拓
    } else {
      if (!(wal.bk?.[id] > 0)) return ack?.({ ok: false, reason: 'none' });
      wal.bk[id]--;
      if (!wal.bk[id]) delete wal.bk[id];
    }
    const d = dayKey();
    wal.mcount = wal.mday === d ? (wal.mcount ?? 0) + 1 : 1;
    wal.mday = d;
    museum[id] = { n: player.name, at: Date.now() };
    const gain = [0, 3, 5, 10][it.rarity] ?? 3;
    award(gain, 'donate');
    saveJson('museum2.json', museum);
    saveJson('players.json', players);
    bump('donates');
    emitAllChannels('forest_main', 'museum', { id, n: player.name });
    ack?.({ ok: true, gain, count: wal.bk?.[id] ?? 0, left: Math.max(0, DONATE_PER_DAY - donatedToday()) });
  });

  // ---------- 🔨 手作家具：用採集籃的東西做，放進帳篷背包 ----------
  socket.on('craft', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    const r = RECIPE_BY_ID[String(data.id ?? '')];
    if (!r) return ack?.({ ok: false, reason: 'unknown' });
    wal.bk ??= {};
    if (!canMake(wal.bk, r.need)) return ack?.({ ok: false, reason: 'need' });
    takeMaterials(wal.bk, r.need);
    const h = (homes[player.vid] ??= newHome());
    h.inv[r.id] = (h.inv[r.id] ?? 0) + 1;
    wal.crafted ??= {};
    wal.crafted[r.id] = (wal.crafted[r.id] ?? 0) + 1;
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    bump('crafts');
    ack?.({ ok: true, basket: wal.bk, home: publicHome(h) });
  });

  // ---------- 🍲 營火料理 ----------
  const dishView = () => ({ dishes: wal?.dish ?? {}, cooked: Object.keys(wal?.cooked ?? {}) });
  socket.on('dishInfo', (data, ack) => ack?.(wal ? { ok: true, ...dishView() } : { ok: false }));
  socket.on('cook', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    if (roomId !== 'forest_main') return ack?.({ ok: false, reason: 'notHere' });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d) return ack?.({ ok: false, reason: 'unknown' });
    wal.bk ??= {};
    if (!canMake(wal.bk, d.need)) return ack?.({ ok: false, reason: 'need' });
    takeMaterials(wal.bk, d.need);
    wal.dish ??= {};
    wal.dish[d.id] = (wal.dish[d.id] ?? 0) + 1;
    wal.cooked ??= {};
    const first = !wal.cooked[d.id];
    wal.cooked[d.id] = (wal.cooked[d.id] ?? 0) + 1;
    const gain = first ? dishFirstGain(d) : 0;
    if (gain) award(gain, 'cook');
    saveJson('players.json', players);
    bump('cooks');
    io.to(rkey).emit('cooked', { id: socket.id, name: player.name, dish: d.id });
    ack?.({ ok: true, first, gain, basket: wal.bk, ...dishView() });
  });
  let lastEat = 0;
  socket.on('eat', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d || !(wal.dish?.[d.id] > 0)) return ack?.({ ok: false });
    const now = Date.now();
    if (now - lastEat < 1500) return ack?.({ ok: false, reason: 'tooFast' });
    lastEat = now;
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    saveJson('players.json', players);
    io.to(rkey).emit('ate', { id: socket.id, dish: d.id });
    ack?.({ ok: true, ...dishView() });
  });
  // 送料理給同一區的人
  socket.on('giftDish', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d || !(wal.dish?.[d.id] > 0)) return ack?.({ ok: false });
    const to = room?.players.get(String(data.to ?? ''));
    const toSock = to && io.sockets.sockets.get(to.id);
    const toWal = to?.vid && players[to.vid];
    if (!to || to.id === socket.id || !toSock || !toWal) return ack?.({ ok: false, reason: 'gone' });
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    toWal.dish ??= {};
    toWal.dish[d.id] = (toWal.dish[d.id] ?? 0) + 1;
    saveJson('players.json', players);
    bump('dishGifts');
    toSock.emit('dishGift', { from: player.name, fromId: socket.id, dish: d.id, dishes: toWal.dish });
    ack?.({ ok: true, ...dishView() });
  });

  // ---------- 🥕 帳篷前的小菜園 ----------
  const gardenInfo = (owner) => {
    const h = homes[owner];
    const me = homeId(player.vid);
    return {
      ok: true,
      now: Date.now(),
      mine: owner === player.vid,
      max: GARDEN_MAX,
      next: gardenSlotsOf(h) < GARDEN_MAX ? GARDEN_EXPAND[gardenSlotsOf(h) + 1] : null,
      slots: Array.from({ length: gardenSlotsOf(h) }, (_, i) => {
        const sl = h?.garden?.[i];
        if (!sl?.c) return null;
        return { c: sl.c, at: sl.at, ready: readyAtOf(sl), w: sl.w?.length ?? 0, iw: !!sl.w?.includes(me) };
      }),
    };
  };
  const ownerOf = (hid) => (hid ? vidOfHid(String(hid)) : player?.vid);
  socket.on('gardenInfo', (data = {}, ack) => {
    if (!player?.vid) return ack?.({ ok: false });
    const owner = ownerOf(data.hid);
    if (!homes[owner]?.tent) return ack?.({ ok: false, reason: 'noTent' });
    ack?.(gardenInfo(owner));
  });
  socket.on('gardenPlant', (data = {}, ack) => {
    if (!player?.vid) return ack?.({ ok: false });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const i = Math.floor(num(data.slot, 0, GARDEN_MAX - 1, 0));
    const c = CROP_BY_ID[String(data.c ?? '')];
    if (!c) return ack?.({ ok: false, reason: 'unknown' });
    if (i >= gardenSlotsOf(h)) return ack?.({ ok: false, reason: 'locked' });
    h.garden ??= [];
    if (h.garden[i]?.c) return ack?.({ ok: false, reason: 'busy' });
    if (!wal || wal.pc < c.seed) return ack?.({ ok: false, reason: 'poor', pc: wal?.pc ?? 0 });
    wal.pc -= c.seed;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    h.garden[i] = { c: c.id, at: Date.now(), w: [] };
    saveJson('homes.json', homes);
    bump('plants');
    ack?.(gardenInfo(player.vid));
  });
  // ➕ 開墾菜園：多一格（最多 6 格），越後面越貴
  socket.on('gardenExpand', (data, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const n = gardenSlotsOf(h);
    if (n >= GARDEN_MAX) return ack?.({ ok: false, reason: 'max' });
    const price = GARDEN_EXPAND[n + 1];
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= price;
    h.gslots = n + 1;
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    bump('buys');
    ack?.(gardenInfo(player.vid));
  });
  socket.on('gardenHarvest', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const h = homes[player.vid];
    const i = Math.floor(num(data.slot, 0, GARDEN_MAX - 1, 0));
    const sl = h?.garden?.[i];
    if (!sl?.c) return ack?.({ ok: false, reason: 'empty' });
    if (Date.now() < readyAtOf(sl)) return ack?.({ ok: false, reason: 'notYet' });
    const c = CROP_BY_ID[sl.c];
    const n = c.yield[0] + Math.floor(Math.random() * (c.yield[1] - c.yield[0] + 1)) + (sl.w?.length ? 1 : 0); // 有朋友澆過水，多收一個
    h.garden[i] = null;
    wal.bk ??= {};
    wal.bk[c.id] = (wal.bk[c.id] ?? 0) + n;
    wal.crops ??= {};
    const first = !wal.crops[c.id];
    wal.crops[c.id] = (wal.crops[c.id] ?? 0) + n;
    if (first) award(CROP_FIRST_GAIN, 'harvest');
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    bump('harvests');
    ack?.({ ...gardenInfo(player.vid), got: { id: c.id, n }, first, gain: first ? CROP_FIRST_GAIN : 0, basket: wal.bk });
  });
  let lastWater = 0;
  socket.on('gardenWater', (data = {}, ack) => {
    if (!player?.vid) return ack?.({ ok: false });
    const owner = ownerOf(data.hid);
    if (!owner || owner === player.vid) return ack?.({ ok: false, reason: 'own' });
    const sl = homes[owner]?.garden?.[Math.floor(num(data.slot, 0, GARDEN_MAX - 1, 0))];
    if (!sl?.c) return ack?.({ ok: false, reason: 'empty' });
    const me = homeId(player.vid);
    sl.w ??= [];
    if (sl.w.includes(me)) return ack?.({ ok: false, reason: 'done' });
    if (sl.w.length >= WATER_MAX) return ack?.({ ok: false, reason: 'full' });
    if (Date.now() >= readyAtOf(sl)) return ack?.({ ok: false, reason: 'ready' });
    const now = Date.now();
    if (now - lastWater < 1000) return ack?.({ ok: false, reason: 'tooFast' });
    lastWater = now;
    sl.w.push(me);
    saveJson('homes.json', homes);
    bump('waters');
    for (const s2 of io.sockets.sockets.values()) if (s2.data.vid === owner) s2.emit('gardenWatered', { name: player.name, c: sl.c });
    ack?.(gardenInfo(owner));
  });
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
    pushNews('hang');
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
    shared.notes = shared.notes.slice(-ARCHIVE_MAX);
    saveJson('notes.json', shared.notes);
    bump('notes');
    emitAllChannels('forest_main', 'notes', { notes: recent(shared.notes, MAX_NOTES), by: socket.id, name: player.name });
  });

  // 📣 即時動態：釣魚、添柴、疊石、繪馬、掛裝飾，所有分流、所有地點都看得到
  // 同一個人同一種動作 1 分鐘內只播一次（釣魚除外），免得洗版
  const newsAt = {};
  const pushNews = (kind, extra = {}) => {
    if (!player) return;
    const now = Date.now();
    if (kind !== 'fish' && now - (newsAt[kind] ?? 0) < 60000) return;
    newsAt[kind] = now;
    const item = { kind, name: player.name, ch: chan.ch, at: now, ...extra };
    shared.lakeNews.push(item);
    shared.lakeNews = shared.lakeNews.slice(-8);
    io.emit('lakeNews', item);
  };

  // 🏆 湖畔排行：在哪裡打開都拿得到今天的大家排行
  socket.on('boardInfo', (_d, ack) => ack?.({ ok: true, board: boardAll() }));

  // 🎣 魚由伺服器決定：浮標落水時前端來要一條魚（記下魚種、尺寸、時間），拉起來成功時才照這條算
  // 前端不能自己說釣到什麼魚（以前可以用主控台一直送「釣到傳說魚」）
  let hooked = null; // { fish, size, at }
  let lastRoll = 0;
  let lastCatch = 0;
  socket.on('fishRoll', (_d, ack) => {
    if (!player || (roomId !== 'lake_dock' && roomId !== 'forest_main')) return ack?.({ ok: false, reason: 'place' });
    const now = Date.now();
    if (now - lastRoll < FISH_ROLL_GAP) return ack?.({ ok: false, reason: 'tooFast', wait: FISH_ROLL_GAP - (now - lastRoll) });
    lastRoll = now;
    const place = roomId === 'lake_dock' ? 'lake' : 'pond';
    const m = miniNow();
    const fish = rollFish({ place, event: !!eventInfo().active, contest: m?.kind === 'fish' });
    hooked = { fish, size: rollSize(fish), at: now };
    ack?.({ ok: true, fish, size: hooked.size });
  });
  // 釣到魚：全場公告＋湖畔排行（只收湖畔房間；一定要先有伺服器給的魚，而且要過了最少的時間）
  socket.on('catch', (data = {}) => {
    if (!player || (roomId !== 'lake_dock' && roomId !== 'forest_main')) return; // 湖畔或營火河畔
    const now = Date.now();
    if (!hooked || Number(data.fish) !== hooked.fish || now - hooked.at < FISH_MIN_MS || now - lastCatch < 3000) return;
    lastCatch = now;
    const fish = hooked.fish;
    let size = hooked.size;
    // 浮標一沉就拉的漂亮時機：魚大一點（和前端同一個算法）
    if (data.perfect && !FISH[fish].junk) size = Math.min(FISH[fish].max, Math.round(size * 1.15) + 1);
    hooked = null; // 同一竿只能領一次
    let rank = null;
    if (!JUNK.has(fish)) {
      shared.board.push({ name: player.name, fish, size, at: now });
      shared.board.sort((a, b) => b.size - a.size);
      shared.board = shared.board.slice(0, BOARD_MAX);
      const i = shared.board.findIndex((r) => r.at === now && r.name === player.name);
      if (i >= 0) {
        rank = i + 1;
        saveJson('board.json', shared.board);
        emitAllChannels('lake_dock', 'board', { board: shared.board });
        emitAllChannels('forest_main', 'board', { board: shared.board });
      }
    }
    bump('fish');
    // 🌰 釣魚松果：每天前 FISH_DAILY_FULL 條照算（營火時間加倍）；之後每條固定 1 顆，稀有魚（四星以上）照算
    {
      const gain = catchGain(FISH[fish]);
      if (gain > 0 && wal) {
        const d = dayKey();
        if (wal.fday !== d) [wal.fday, wal.fn] = [d, 0];
        wal.fn++;
        if (wal.fn <= FISH_DAILY_FULL || FISH_RARITY[fish] >= 4) award(gain, 'fish');
        else award(1, wal.fn === FISH_DAILY_FULL + 1 ? 'fishCap' : 'fish', true);
      }
    }
    // ♻️ 釣到垃圾：順手放進垃圾袋（湖裡會釣到的種類很多，不只漂流瓶和罐頭）
    if (JUNK.has(fish) && wal) {
      const id = pickTrash('lake').id;
      const r = gotTrash(wal, player.vid, id);
      if (r.gain) award(r.gain, 'trash');
      socket.emit('trashGot', { id, ...r, ...trashView(wal) });
    }
    // 📖 魚類圖鑑：第一次釣到這種魚就收錄、送松果；全部收集完再送一份大禮
    if (wal) {
      wal.dex ??= {};
      const first = !(fish in wal.dex);
      wal.dex[fish] = Math.max(wal.dex[fish] ?? 0, size);
      if (first) {
        const gain = dexGain(FISH[fish]);
        award(gain, 'dex');
        const count = Object.keys(wal.dex).length;
        let bonus = 0;
        if (count >= FISH_COUNT && !wal.dexDone) {
          wal.dexDone = true;
          bonus = DEX_BONUS;
          award(bonus, 'dex');
        }
        socket.emit('dex', { fish, gain, bonus, count, total: FISH_COUNT, dex: dexView(wal) });
      }
      saveJson('players.json', players);
    }
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
    if (!JUNK.has(fish)) pushNews('fish', { fish, size, rank });
    // 📣 五星魚與傳說之魚：整個伺服器（所有分流、所有地點）跳出大公告
    if (FISH_RARITY[fish] >= 5) io.emit('bigCatch', { name: player.name, fish, size, ch: chan.ch, place: roomId });
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
    pushNews('fire');
  });

  socket.on('disconnect', () => {
    if (!player) return;
    leave();
    clearInterval(sitTimer);
    if (session) {
      const sec = (Date.now() - session.at) / 1000;
      const d = today();
      d.sessions++;
      d.totalSec += Math.round(sec);
      d.stay[sec < 30 ? 0 : sec < 120 ? 1 : sec < 600 ? 2 : 3]++;
      const se = session.src && d.src?.[session.src];
      if (se) {
        se.ss = (se.ss ?? 0) + 1;
        se.sec = (se.sec ?? 0) + Math.round(sec);
        if (sec < 30) se.s30 = (se.s30 ?? 0) + 1;
      }
      // 新旅人：第一次來的人有幾個、30 秒內就走的、有完成小任務的
      if (session.newbie) {
        d.nb = (d.nb ?? 0) + 1;
        if (sec < 30) d.nb30 = (d.nb30 ?? 0) + 1;
        if (session.did) d.nbDid = (d.nbDid ?? 0) + 1;
      }
      saveJson('stats.json', stats);
      session = null;
    }
    console.log(`[離開] ${player.name}（分流 ${chan.ch} 剩 ${chCount(chan)} 人）`);
    player = null;
    tidyChannels();
  });
});

// ---------- 🎣 拉竿卡住的保險 ----------
// 拉竿是幾秒鐘的動作，但玩家剛好鎖螢幕或切到別的 App，瀏覽器會暫停，就不會再送「拉完了」。
// 超過 10 秒沒收到新狀態：在別人的畫面上讓他坐回去釣魚。
// （舉魚炫耀不算：要玩家自己按「繼續釣魚」或「放下」才放下，可以舉著魚到處走）
const SHORT_ACTIONS = new Set(['reel']);
setInterval(() => {
  const now = Date.now();
  const rooms = [...[...channels.values()].flatMap((c) => [...c.rooms.values()]), ...homeRooms.values()];
  for (const r of rooms) {
    for (const p of r.players.values()) {
      if (!SHORT_ACTIONS.has(p.a) || now - (p.st ?? 0) < 10000) continue;
      p.a = 'fish';
      p.e = 0;
      p.dirty = true;
    }
  }
}, 2000);

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
