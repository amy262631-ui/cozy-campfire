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
import compression from 'compression';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as storage from './storage.js';
import { createResidents, publicNpc } from './npc.js';
import geoip from 'geoip-country';
import { FISH, DEX_BONUS, dexGain, catchGain, FISH_MAX_CM, rollFish, rollSize, DEX_TOTAL, SHINY_CHANCE, SHINY_DEX_GAIN, SHINY_BONUS, SHINY_TOTAL, canShiny, isLimitedFish } from '../src/fishing/fishData.js';
import { RACE_LANTERNS, makeRaceRoute, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN, TOUCH_R } from '../src/game/miniSpots.js';
import { OUTFITS, OUTFIT_BY_ID, outfitCode, dailyOutfit, weeklyOutfit, nextDateOutfit, sponsorOutfits, XMAS_OUTFITS, XMAS_STREAK } from '../src/game/outfits.js';
import { todaySpecial, SHINY_DAY_MULT, isOpen } from '../src/game/dailySpecial.js';
import { GATHER_SPOTS, GATHER_ITEMS, isLimited, gatherDexItems, regrowMs, GATHER_FIRST_GAIN, GATHER_DEX_BONUS, gatherItemAt, isNight, GATHER_R, NET_PRICE, BUG_WANDER, BUG_CATCH_R } from '../src/game/gathering.js';
import { SOURCES, cleanSource, sourceFrom } from '../src/game/sources.js';
import { ANNOUNCE_TPL, ANNOUNCE_MAX, ANNOUNCE_LATE_MS } from '../src/game/announce.js';
import { GATHER_BY_ID, treasureTime, TREASURE_MAX, taipeiMonth } from '../src/game/gathering.js';
import { giftInfo, basketCat, GIFT_DAILY_CAP, GIFT_MIN_DAYS, GIFT_SEND_MAX, GIFT_MAX_N } from '../src/game/gifts.js';
import { CROP_BY_ID, GARDEN_MAX, gardenMax, GARDEN_EXPAND, gardenSlotsOf, WATER_MAX, CROP_FIRST_GAIN, readyAtOf, stageOf } from '../src/game/garden.js';
import { canMake, takeMaterials, materialOf } from '../src/game/materials.js';
import { RECIPE_BY_ID } from '../src/game/crafting.js';
import { DISH_BY_ID, dishFirstGain, BUFF_MS, DISH_FX, activeBuff, homeCanCook } from '../src/game/cooking.js';
import { HEN_FROM, COOP_PRICE, HEN_PRICE, HEN_MAX, FEED_PER_DAY, GOLD_EGG, HEN_COLORS, fatOf, fatNext, eggsOf, eggIn, canFeed, henMigrate, feedWait, layOnFeed } from '../src/game/hens.js';
import { LEGENDS, LEGEND_GAIN, legendHour, taipeiHour } from '../src/game/legendRules.js';
import { RIVER_FROM, COOP_GAIN, COOP_MIN_TAPS, COOP_SEC, SKIP_PER_DAY, SKIP_GOOD, skipBounces, DUCK_PER_DAY, DUCK_MS, DUCK_FIRST_GAIN } from '../src/game/river.js';
import { BOATS, BOAT_FROM, BOAT_MS, BOAT_MAX, BOAT_SLOTS, FEED_PRICE, FEED_MS, BOAT_LUCK, DOCK_END, keepOnLake, seatAt } from '../src/game/boats.js';
import { SOOTY_AT, potResult, parseToken, SEASON_BY_ID, SEASON_PRICE, SEASON_USES, SEASON_CAP, SEASON_MAX, POT_MAX, FISH_KEEP_CAP, POT_BY_ID } from '../src/game/potCooking.js';
import { MUSEUM_BY_ID, DONATE_PER_DAY } from '../src/game/museum.js';
import { TRASH, TRASH_BY_ID, TRASH_MAX, TRASH_ROOM, RECYCLE_GAIN, RECYCLE_DAILY_CAP, TRASH_FIRST_GAIN, TRASH_DEX_OUTFIT, pickTrash } from '../src/game/trash.js';
import { LAYOUT as CAMP_LAYOUT } from '../src/rooms/campLayout.js';
import { PASS, PASS_TIERS, PASS_PLANS, FREE, SPONSOR, SPONSOR_BOX, sponsorAmounts, sponsorMin, sponsorTier, SPONSOR_END, SPONSOR_END_DAY, PASS_MONTH_FURN, passMonthLooks, passLookMonth } from '../src/game/pass.js';
import { BOARD_ON, BOARD_GAMES, BOARD_MIN, BOARD_MAX as BG_MAX, BOARD_WIN, BOARD_DAY_CAP, FROG_HOLES } from '../src/game/boardGames.js';
import crypto from 'node:crypto';
import { SHOP, hashPassword, checkPassword, validateCredentials, newHome, available, validCell, TENT_STYLES, TENT_SHAPES, homeId, GIFTS, GIFT_FURNITURE, CATALOG_BY_ID, gridOf, expandPrice, expandHome, maxItems, stackAt, stackCheck, moveStack, hasLoft } from './homes.js';
import { cleanNameText, AUTHOR_MARK } from '../src/game/nameRules.js';
import { hasColors, ALL_COLORS, fishFits, LOGIN_GIFTS, isLoftCell } from '../src/game/furnitureCatalog.js';
import { YARD_BY_ID, hasYard, isBigYard, isDoorYard, normYard, YARD_SMALL_MAX } from '../src/game/yardCatalog.js';
import { SIGN_BY_ID } from '../src/game/signCatalog.js';
import { HOLIDAYS, HOL_TASK_GAIN, HOL_STEP_GAIN, HOL_GOLD_GAIN, holidayNow, nextHoliday, holGoal } from '../src/game/holiday.js';
import { DAILY_BY_ID, WEEKLY_BY_ID, CAT_TROPHY, MAKEUP_ORDER, DAILY_GAIN, STAMP_MONTH, STAMP_DAILY, STAMP_WEEKLY, WEEKLY_PLANT_AT, WEEKLY_BAIT_AT, CAT_TROPHY_AT, dailyOf, dailySwapTo, weeklyOf, weekKey } from '../src/game/quests.js';
import { SPIRIT_STAGE_AT, SPIRIT_XP, SPIRIT_DAY_CAP, SPIRIT_FEED_DAY, SPIRIT_FEED_XP, SPIRIT_FAV_XP, SPIRIT_CHANGE_PRICE, SPIRIT_KINDS, SPIRIT_FAV, SPIRIT_EGG_PRICE, SPIRIT_FIRST_PRICE, SPIRIT_EGG_MS, SPIRIT_MAX, SPIRIT_ACT_KIND, SPIRIT_NIGHT_STAR, SPIRIT_PLAY_DAY, SPIRIT_ACCS, SPIRIT_ACC_BY_ID, spiritStage, autoKind, spiritCode } from '../src/game/spiritRules.js';
import { isXmasDay as isXmasDay0, isXmasShopDay as isXmasShopDay0 } from '../src/game/season.js';
const isXmasDay = (k) => process.env.XMAS_TEST === '1' || isXmasDay0(k);
const isXmasShopDay = (k) => process.env.XMAS_TEST === '1' || isXmasShopDay0(k); // 🛒 聖誕商品賣到 1/15 // 本機測試用：XMAS_TEST=1 假裝現在是聖誕期間（Render 不要設）
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
  'idle', 'walk', 'run', 'addWood', 'roast', 'eat', 'ride', 'blanket', 'stargaze', 'fish', 'reel', 'showFish',
  'wave', 'salute', 'bye', 'pray', // 表情動作
  'pick', 'catch', 'plant', 'water', // 採摘、揮網捕蟲、種菜、澆水
  'sofa', 'sleep', 'bounce', // 🛋️ 坐沙發、躺床、🛏️ 彈簧床
  'boat', // ⛵ 坐在船上
]);
const EMOJIS = new Set(['😊', '😂', '🥰', '👍', '❤️', '🎉', '😴', '🥺', '😮', '🔥', '✨', '🍡', '🎵', '🌠']); // 🎵 彈吉他、🌠 看到流星（家具小功能用，表情面板不顯示）
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
/** 🏕️ 帳篷營地分區：A 區＝campground，B 區以後＝campground@1、@2…（同一分流不同區看不到彼此在走） */
const baseRoom = (rid) => String(rid).split('@')[0];
const campZoneOf = (rid) => (String(rid).startsWith('campground@') ? Number(String(rid).split('@')[1]) || 0 : 0);
const campRid = (zone) => (zone > 0 ? `campground@${zone}` : 'campground');
/** 垃圾在帳篷營地：每一區都看得到同一批（各區的房間都要通知） */
const trashKeys = (c, base) => (base === 'campground' ? [...c.rooms.keys()].filter((k) => baseRoom(k) === 'campground').map((k) => key(c.ch, k)) : key(c.ch, base));
function ensureRoom(c, rid) {
  if (!c.rooms.has(rid)) c.rooms.set(rid, { players: new Map(), npcs: new Map(), song: 0 });
  return c.rooms.get(rid);
}

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
const [savedNotes, savedWishes, savedBoard, savedCairns, savedStats, savedPlayers, savedTree, savedCairnLog, savedAccounts, savedHomes, savedIdeas, savedTotals, savedMuseum, savedOrders, savedInvites, savedGrants, savedDms, savedSupport, savedBans, savedChat, savedBottles] = await Promise.all(
  ['notes.json', 'wishes.json', 'board.json', 'cairns.json', 'stats.json', 'players.json', 'tree.json', 'cairnlog.json', 'accounts.json', 'homes.json', 'ideas.json', 'totals.json', 'museum2.json', 'orders.json', 'invites.json', 'grants.json', 'dms.json', 'support.json', 'bans.json', 'chatlog.json', 'bottles.json'].map((f) =>
    storage.load(f),
  ),
);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
/** 帳號：{ 小寫帳號: { u, salt, hash, vid, at } }（只存加鹽雜湊，不存密碼） */
const accounts = asObject(savedAccounts);
/** 每個人的帳篷：{ vid: { tent, inv: { 家具: 數量 }, items: [{ i, x, z, r }], open } } */
const homes = asObject(savedHomes);
/** 👫 邀請紀錄（作者在 /stats 查核用，最近 400 筆）：[{ at, kind, ref, friend, rn, fn, net, r }] */
const invites = asArray(savedInvites);
/** 💌 好友密頻：{ 'vidA|vidB'（排序過）: [{ f: 寄件人 vid, t, at }] }，每一對最多留 60 則 */
const dms = asObject(savedDms);
/** ⛔ 停權／🔇 禁言（作者 11/16）：{ v: { vid: { t: 'ban'|'mute', until（0＝永久）, at, note, name } }, n: { 網路雜湊: { until, vid, at } } } */
const bans = asObject(savedBans);
bans.v ??= {};
bans.n ??= {};
/** 這個人現在有沒有被停權／禁言（過期的自動不算） */
const banOf = (vid, kind) => {
  const b = vid && bans.v[vid];
  if (!b || (kind && b.t !== kind && !(kind === 'mute' && b.t === 'ban'))) return null;
  return !b.until || b.until > Date.now() ? b : null;
};
const netBanOf = (net) => {
  const b = net && bans.n[net];
  return b && (!b.until || b.until > Date.now()) ? b : null;
};
/** 💬 公開聊天＋大聲公紀錄（/admin 看；作者 11/18：存進存檔、保留 7 天，最多 6000 則；密頻不記在這裡） */
const CHAT_KEEP_MS = 7 * 86400000;
const chatLog = asArray(savedChat).filter((c) => c && c.at > Date.now() - CHAT_KEEP_MS);
/**
 * 🍾 漂流瓶（作者 11/23，玩家建議）：在湖邊寫一封信（最多 60 字）丟進湖裡，別人釣到漂流瓶時有一半機會裡面有信。
 * 只能回 💗、可以檢舉（2 次自動收起來）；作者在 /admin「🍾 漂流瓶」看、刪。最多留 600 封。
 * [{ k, v（寫的人）, name, text, at, hearts, hv（回過愛心的人）, rep（檢舉的人）, hidden, read（被撈到幾次） }]
 */
const bottles = asArray(savedBottles);
let bottleSeq = bottles.reduce((m, b) => Math.max(m, b.k ?? 0), 0);
const BOTTLE_LEN = 60;
const BOTTLE_PER_DAY = 3;
const BOTTLE_PRICE = 2;
const saveBottles = () => {
  if (bottles.length > 600) bottles.splice(0, bottles.length - 600);
  saveJson('bottles.json', bottles);
};
/** 撈到漂流瓶時挑一封：不是自己寫的、沒被收起來；被讀比較少的優先 */
function pickBottle(vid) {
  const ok = bottles.filter((b) => !b.hidden && b.v !== vid && !(b.rv ?? []).includes(vid)); // 作者 11/23：玩家少，同一封一直撈到很無聊 → 讀過的不會再撈到；都讀過了就只是空瓶子
  if (!ok.length) return null;
  ok.sort((a, b) => (a.read ?? 0) - (b.read ?? 0) || Math.random() - 0.5);
  const pool = ok.slice(0, 12);
  return pool[Math.floor(Math.random() * pool.length)];
}
function logChat(entry) {
  chatLog.push(entry);
  const old = Date.now() - CHAT_KEEP_MS;
  let cut = 0;
  while (cut < chatLog.length && chatLog[cut].at < old) cut++;
  if (chatLog.length - cut > 6000) cut = chatLog.length - 6000;
  if (cut) chatLog.splice(0, cut);
  storage.save('chatlog.json', chatLog, 60000); // 一分鐘存一次（聊天很多，不要每則都寫）
}
/** ✉️ 聯絡作者：[{ id, vid, hid, name, t, at, re, reAt, seen }]（最多 500 則） */
const support = asArray(savedSupport);
/** 🎁 作者發的補償紀錄：[{ at, hid, name, what, note }] */
const grants = asArray(savedGrants);
/** 🔭 星空圓頂屋可以選的骨架顏色（跟 src/game/tentShapes.js 的 FRAME_COLORS 一致） */
const FRAME_IDS = new Set(['gold', 'silver', 'white', 'black', 'copper']);
/** 💡 玩家建議（只有作者在 /ideas 看得到）：[{ n, t, at }] */
let ideas = asArray(savedIdeas);
/** 🍽️ 這一格有沒有餐桌（回傳那件餐桌的目錄資料） */
const dineTableAt = (h, x, z) => {
  for (const it of stackAt(h?.items ?? [], x, z)) if (CATALOG_BY_ID[it.i]?.dine) return CATALOG_BY_ID[it.i];
  return null;
};
/**
 * 🍽️ 擺設改了之後整理餐桌上的料理：餐桌搬走了料理跟著搬；餐桌收起來了，料理退回主人
 *   from、to：這次搬家的格子（沒有就不是搬家）
 */
function fixDine(h, vid, from, to) {
  if (!h?.dine) return;
  if (from && to) {
    const k0 = `${from.x},${from.z}`;
    const k1 = `${to.x},${to.z}`;
    if (h.dine[k0]?.length && !dineTableAt(h, from.x, from.z) && dineTableAt(h, to.x, to.z) && !h.dine[k1]?.length) {
      h.dine[k1] = h.dine[k0];
      delete h.dine[k0];
    }
  }
  const w = players[vid];
  for (const [k, list] of Object.entries(h.dine)) {
    const [x, z] = k.split(',').map(Number);
    if (list?.length && dineTableAt(h, x, z)) continue;
    if (w && list?.length) {
      w.dish ??= {};
      for (const d of list) w.dish[d] = (w.dish[d] ?? 0) + 1;
    }
    delete h.dine[k];
  }
}
/** ✨ 11/16 精靈家具：住在家裡的小精靈（收起來的，和「先收起來」的那隻）→ 給帳篷畫在小窩、鞦韆、玩具上 */
const homeOwnerOf = new WeakMap();
/** 🎀 每隻小精靈自己戴的造型（作者 11/22：每隻可以不一樣）。舊存檔沒有 acc／wg 的那隻，照以前大家共用的那套 */
const accWear = (sp, w) => (sp?.acc ?? w?.spiritAcc?.wear) || '';
const accWing = (sp, w) => (sp?.wg ?? w?.spiritAcc?.wing) || '';
function homeSpirits(h) {
  let vid = homeOwnerOf.get(h);
  if (!vid || homes[vid] !== h) {
    vid = Object.keys(homes).find((k) => homes[k] === h);
    if (vid) homeOwnerOf.set(h, vid);
  }
  const w = vid && players[vid];
  if (!w) return [];
  const list = [...(w.spirit?.off ? [w.spirit] : []), ...(w.spiritBox ?? [])].filter((x) => x && (x.own || x.xp > 0));
  return list.slice(0, 12).map((x) => ({ c: spiritCode({ ...x, off: false }, accWear(x, w), accWing(x, w)), n: String(x.nm ?? '').slice(0, 8) }));
}
const publicHome = (h) =>
  h
    ? {
        sps: homeSpirits(h), // ✨ 住在家裡的小精靈
        tent: !!h.tent,
        inv: h.inv,
        items: h.items,
        grid: gridOf(h),
        open: h.open !== false,
        style: h.style ?? 'classic',
        shape: h.shape ?? 'bell',
        shapes: h.shapes ?? ['bell'],
        frame: h.frame ?? 'gold', // 🔭 星空圓頂屋的骨架顏色
        name: h.name ?? '',
        likes: h.likes?.length ?? 0,
        notes: h.notes ?? [],
        gifts: h.gifts ?? [],
        rack: h.rack ?? [],
        cinv: h.cinv ?? {},
        yard: (() => { const y = normYard(h.yard ?? { own: [] }); return { own: y.own, on: y.on, sm: y.sm, dc: y.dc }; })(),
        plot: h.plot ?? null, // 🏕️ 固定營位 { z, n }
        sign: h.sign ?? 'wood', // 🪧 門牌造型
        signs: h.signs ?? ['wood'],
        moves: h.moves ?? 0, // 搬過幾次家（第一次免費）
        dine: h.dine ?? {}, // 🍽️ 餐桌上擺的料理 { "x,z": [料理 id…] }
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
/**
 * 🏕️ 固定營位（11/07）：每頂帳篷有固定的門牌「A 區 7 號」，所有人看到的位置都一樣。
 *   homes[vid].plot = { z: 區（0＝A）, n: 1～24 }；作者一開始住 A 區 1 號（camp.json 的 author），之後也能像大家一樣搬走。
 *   新版第一次啟動：7 天（原 15）內有上線的照最近上線排，每區先住 18 頂、每 4 號留 1 個空位（4、8、12…），前中後都有空地可以搬。
 *   7 天（原 15）沒上線（月票有效、作者除外）讓出營位；帳篷、家具、菜園都留著，回來自動分新營位（優先原本那區）。
 */
const CAMP_PLOTS = 24;
const campMeta = asObject(await storage.load('camp.json')); // { author: vid, migrated: 時間 }
const saveCamp = () => saveJson('camp.json', campMeta);
const RELEASE_MS = 7 * 864e5; // 11/08 作者：15 天改 7 天（7 天沒來就算不玩了，讓位給新人；回來自動分空位）;
const zoneName = (z) => String.fromCharCode(65 + (z % 26)) + (z >= 26 ? String(Math.floor(z / 26) + 1) : '');
const MOVE_PRICE = 100;
const STAR_FREE_MOVES = 2;
/** 這次搬家要多少松果：第一次免費；星空月票每個月前 2 次免費；其他 100 */
function movePrice(vid) {
  const h = homes[vid];
  if (!h) return MOVE_PRICE;
  if (!(h.moves > 0)) return 0;
  if (passTier(players[vid])?.id === 'star') {
    const m = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 7);
    if (h.starMove?.m !== m || h.starMove.n < STAR_FREE_MOVES) return 0;
  }
  return MOVE_PRICE;
}
const plotLabel = (p) => (p ? `${zoneName(p.z)} 區 ${p.n} 號` : '');
const isAuthorVid = (vid) => !!vid && vid === campMeta.author;
/** 最近一次上線（每天第一次進來記的 wal.last，和帳篷最近有動靜的時間，取比較晚的） */
function lastSeen(vid) {
  const d = players[vid]?.last ? Date.parse(`${players[vid].last}T23:59:00+08:00`) : 0;
  return Math.max(Number.isFinite(d) ? d : 0, homes[vid]?.at ?? 0);
}
function takenPlots() {
  const m = new Map();
  for (const [vid, h] of Object.entries(homes)) if (h?.tent && h.plot) m.set(`${h.plot.z}:${h.plot.n}`, vid);
  return m;
}
/** 找空營位：gaps＝一開始搬遷時跳過 4、8、12…號（留空地）；zone＝優先哪一區 */
function freePlot(taken, { gaps = false, zone = null } = {}) {
  const order = zone != null ? [zone, ...Array.from({ length: 60 }, (_, i) => i).filter((z) => z !== zone)] : Array.from({ length: 60 }, (_, i) => i);
  for (const z of order) {
    for (let n = 1; n <= CAMP_PLOTS; n++) {
      if (z === 0 && n === 1 && !campMeta.author) continue; // 作者還沒按「這台裝置是作者」之前，A 區 1 號先留著
      if (gaps && n % 4 === 0) continue;
      if (!taken.has(`${z}:${n}`)) return { z, n };
    }
  }
  return null;
}
/** 分一個營位給這頂帳篷（作者第一次分配到 A 區 1 號；之後作者也可以搬走，A 區 1 號就變普通營位）；回傳營位 */
function assignPlot(vid, opts = {}) {
  const h = homes[vid];
  if (!h?.tent) return null;
  const taken = takenPlots();
  if (isAuthorVid(vid) && (!taken.has('0:1') || taken.get('0:1') === vid)) h.plot = { z: 0, n: 1 };
  else h.plot = freePlot(taken, opts);
  return h.plot;
}
/** 新版第一次啟動：一次性搬遷（只跑一次） */
function migrateCamp() {
  if (campMeta.migrated) return;
  const now = Date.now();
  const list = Object.entries(homes)
    .filter(([vid, h]) => h?.tent)
    .map(([vid]) => vid)
    .sort((a, b) => lastSeen(b) - lastSeen(a));
  for (const vid of list) delete homes[vid].plot;
  let n = 0;
  for (const vid of list) {
    const keep = isAuthorVid(vid) || now - lastSeen(vid) < RELEASE_MS || passActive(players[vid]);
    if (!keep) continue;
    assignPlot(vid, { gaps: true });
    homes[vid].plotNew = 1; // 下次進來跳提示「你的帳篷有了固定門牌」
    n++;
  }
  campMeta.migrated = now;
  saveCamp();
  saveJson('homes.json', homes);
  console.log(`[營地] 固定營位搬遷完成：${n} 頂分到營位，${list.length - n} 頂超過 7 天沒上線先不分`);
}
/** 讓位：7 天沒上線（月票有效、作者除外）讓出營位，每小時檢查一次 */
setInterval(() => {
  const now = Date.now();
  let n = 0;
  for (const [vid, h] of Object.entries(homes)) {
    if (!h?.tent || !h.plot || isAuthorVid(vid) || passActive(players[vid])) continue;
    if (now - lastSeen(vid) < RELEASE_MS) continue;
    h.plotOld = h.plot.z;
    delete h.plot;
    n++;
  }
  if (n) {
    saveJson('homes.json', homes);
    console.log(`[營地] ${n} 頂帳篷超過 7 天沒上線，讓出營位`);
  }
}, 3600000);
/** 每一區住了幾頂（換區選單用） */
function zoneCounts() {
  const c = [];
  for (const h of Object.values(homes)) if (h?.tent && h.plot) c[h.plot.z] = (c[h.plot.z] ?? 0) + 1;
  const max = Math.max(1, c.length);
  return Array.from({ length: max }, (_, z) => c[z] ?? 0);
}
/** 👣 帳篷營地每一區現在幾個人（11/08 作者：換區格子旁邊要看得到）：在那一區走動的人（同分流）＋在那一區帳篷裡的人 */
function zoneOnline(ch, len) {
  const out = Array(len).fill(0);
  const c = channels.get(ch);
  if (c) for (const [k, r] of c.rooms) if (baseRoom(k) === 'campground') { const z = campZoneOf(k); if (z < len) out[z] += r.players.size; }
  for (const [owner, r] of homeRooms) {
    const z = homes[owner]?.plot?.z;
    if (r.players.size && z != null && z < len) out[z] += r.players.size;
  }
  return out;
}
/** 帳篷營地某一區：長度 24 的陣列，第 i 格＝那一區 i+1 號（沒人住＝null） */
function campList(zone = 0, selfVid = null) {
  const out = Array(CAMP_PLOTS).fill(null);
  const onv = new Set([...io.sockets.sockets.values()].map((s) => s.data.vid).filter(Boolean)); // 🗺️ 營地地圖：主人在線上
  for (const [vid, h] of Object.entries(homes)) {
    if (!h?.tent || !h.plot || h.plot.z !== zone) continue;
    out[h.plot.n - 1] = {
      hid: homeId(vid),
      mine: vid === selfVid,
      author: isAuthorVid(vid),
      plot: h.plot,
      name: h.name ?? '',
      shape: h.shape ?? 'bell',
      style: h.style ?? 'classic',
      frame: h.frame ?? 'gold',
      sign: h.sign === 'galaxy' && passTier(players[vid])?.id !== 'star' ? 'wood' : (h.sign ?? 'wood'), // 星空門牌：月票到期就換回木頭
      open: h.open !== false,
      likes: h.likes?.length ?? 0,
      n: homeRooms.get(vid)?.players.size ?? 0,
      garden: gardenView(h),
      hens: isOpen({ from: HEN_FROM }) ? (h.hens ?? []).map((x) => [x.c, fatOf(x.fed)]) : [], // 🐔 小肥雞（毛色、胖胖等級）
      yard: normYard(h.yard)?.on ?? null, // 大型擺設
      sm: h.yard?.sm ?? [], // 小型擺設（最多 3 個）
      dc: h.yard ? normYard(h.yard).dc : [], // 🎄 門口裝飾（拱門、門上花圈）
      on: onv.has(vid),
    };
  }
  return out;
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
  // 🎉 假日：大掃除垃圾冒得快、多；雞蛋節藏彩蛋；整點小高潮多冒一波／一顆大金蛋
  const H = holNow();
  const hourKey = H?.peak ? `${H.key}:${Math.floor(now / 3600000)}` : '';
  for (const c of channels.values()) {
    c.trash ??= {};
    c.nextTrash ??= {};
    c.nextEgg ??= {};
    const burst = hourKey && c.peakKey !== hourKey;
    if (burst) c.peakKey = hourKey;
    let goldPlace = burst && H.id === 'egg' ? TRASH_PLACES[Math.floor(Math.random() * TRASH_PLACES.length)] : '';
    for (const place of TRASH_PLACES) {
      let list = (c.trash[place] ??= []);
      let changed = false;
      if (H?.id !== 'egg' && list.some((x) => x.egg)) {
        list = c.trash[place] = list.filter((x) => !x.egg); // 雞蛋節結束：彩蛋收起來
        changed = true;
      }
      const junk = list.filter((x) => !x.egg).length;
      const clean = H?.id === 'clean';
      const max = TRASH_MAX[place] + (clean ? 3 : 0);
      if (clean && burst) {
        for (let i = junk; i < max + 3; i++) list.push({ k: ++trashSeq, ...trashSpot(place), item: pickTrash(place).id });
        changed = true;
      } else if (!c.nextTrash[place]) c.nextTrash[place] = now + Math.random() * 60000;
      else if (junk < max && now >= c.nextTrash[place]) {
        list.push({ k: ++trashSeq, ...trashSpot(place), item: pickTrash(place).id });
        c.nextTrash[place] = now + (TRASH_EVERY[0] + Math.random() * (TRASH_EVERY[1] - TRASH_EVERY[0])) * 1000 * (clean ? 0.3 : 1);
        changed = true;
      }
      if (H?.id === 'egg') {
        const eggs = list.filter((x) => x.egg && x.item === 'hegg').length;
        if (eggs < 3 && now >= (c.nextEgg[place] ?? 0)) {
          list.push({ k: ++trashSeq, ...trashSpot(place), item: 'hegg', egg: true });
          c.nextEgg[place] = now + (30 + Math.random() * 40) * 1000;
          changed = true;
        }
        if (goldPlace === place) {
          list.push({ k: ++trashSeq, ...trashSpot(place), item: 'hgold', egg: true });
          goldPlace = '';
          changed = true;
          io.to(key(c.ch, TRASH_ROOM[place])).emit('holGoldShow', { room: TRASH_ROOM[place] });
        }
      }
      if (changed) io.to(trashKeys(c, TRASH_ROOM[place])).emit('trash', { room: TRASH_ROOM[place], list: publicTrash(c, place) });
    }
  }
}
setInterval(tickTrash, 10000);

// ---------- 🌟 森林傳說（11/19）：很少很少才會經過的大大守護神；同一區的人一起看到 ----------
/** 正在經過的：「分流:房間」→ { id, t0, dur, dir } */
const legendNow = new Map();
const legendMsg = (lg) => ({ id: lg.id, el: Date.now() - lg.t0, dur: lg.dur, dir: lg.dir });
function tickLegends() {
  const now = Date.now();
  const test = Number(process.env.LEGEND_TEST) || 0; // 本機測試：LEGEND_TEST=1 每次都出現、不看時間（Render 不要設）
  if (!test && !isOpen({ from: '2026-11-19' })) return; // 🗓️ 11/20 才開
  for (const c of channels.values()) {
    for (const [rid, r] of c.rooms) {
      const k = key(c.ch, rid);
      const cur = legendNow.get(k);
      if (cur && now > cur.t0 + cur.dur) legendNow.delete(k);
      if (legendNow.has(k) || !r.players.size) continue;
      for (const L of LEGENDS) {
        if (!L.rooms.includes(baseRoom(rid))) continue;
        if (!test && (!legendHour(L) || (L.xmas && !isXmasDay(dayKey())))) continue;
        if (Math.random() >= (test || L.chance / 2)) continue; // 每 30 秒擲一次＝每分鐘 chance
        const lg = { id: L.id, t0: now, dur: L.dur, dir: Math.random() < 0.5 ? 1 : -1 };
        legendNow.set(k, lg);
        io.to(k).emit('legend', legendMsg(lg));
        console.log(`[傳說] ${L.zh} 出現在 ${c.ch} 分流 ${ROOM_DEFS[baseRoom(rid)]?.label ?? rid}（${r.players.size} 人）`);
        break;
      }
    }
  }
}
setInterval(tickLegends, 30000);
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
const saveJson = (file, data) => storage.save(file, data, file === 'stats.json' || file === 'players.json' ? 45000 : 8000);

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
  // 🕛 11/19 作者：中午 12:30 加一場 10 分鐘釣魚大賽（11/20 起）
  list.unshift({ at: 12 * 3600 + 30 * 60, kind: 'fish', noon: true });
  return list;
})();
/** 今天有哪些場次（中午那場 11/20 才開） */
const miniSlots = () => (isOpen({ from: '2026-11-19' }) ? MINI_SLOTS : MINI_SLOTS.filter((x) => !x.noon));
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
  const slots = miniSlots();
  const cur = slots.findIndex((x) => sec >= x.at && sec < x.at + MINI_LEN);
  if (cur >= 0) {
    const x = slots[cur];
    return { kind: x.kind, active: true, endsIn: x.at + MINI_LEN - sec, id: `${dayKey(now)}-${x.at}` };
  }
  let next = slots.find((x) => x.at > sec);
  let startsIn = next ? next.at - sec : 0;
  if (!next) {
    next = slots[0]; // 今晚都辦完了：明天第一場
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
const SIT_DAILY_CAP = FREE.sit; // 每天靠「待著」最多撿幾顆（免費玩家；月票更多，見 pass.js）
const QUEST_GAIN = 5;
const FISH_RARITY = FISH.map((f) => f.rarity);
const POS_MAX = 45; // 座標上限（帳篷營地到 ±37；以前限制 ±20，營地外圍的垃圾撿不到）
const MAX_SPEED = 8; // 每秒最多移動幾公尺（跑步大約 5.1；騎腳踏車大約 6.9）
const FISH_ROLL_GAP = 4000; // 兩次拋竿（要魚）最少間隔
const FISH_MIN_MS = 4500; // 要到魚之後，最快多久才能拉起來（浮標最快 4 秒才會沉＋拉竿）
const FISH_DAILY_FULL = FREE.fish; // 每天前幾條魚的松果照算（免費玩家；月票更多，見 pass.js）
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
    // 🏃 作者 11/24：燈籠位置每場隨機，同一場大家一樣
    if (m.kind === 'race') miniRun.route = makeRaceRoute();
    if (m.kind === 'hunt') {
      // 從候選地點隨機挑幾個藏金松果
      const pool = HUNT_SPOTS.map((p, i) => ({ ...p, i })).sort(() => Math.random() - 0.5);
      // 作者 11/14：不要一開始就全部出來（5 顆 30 秒內就被找光）→ 一顆一顆冒出來：第一顆開始後 20～90 秒，找到之後再等 40～150 秒冒下一顆
      miniRun.spots = pool.slice(0, HUNT_COUNT).map((p) => ({ x: p.x, z: p.z, by: null, showAt: null }));
      miniRun.spots[0].showAt = Date.now() + (20 + Math.random() * 70) * 1000;
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
  // 還沒冒出來的金松果不給位置（h＝藏著）
  const now = Date.now();
  return { ...m, top: same ? miniTop() : [], spots: same && m.kind === 'hunt' ? miniRun.spots.map((p) => (p.by || (p.showAt && p.showAt <= now) ? { x: p.x, z: p.z, by: p.by } : { h: 1 })) : [] };
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
// 🏢 同一個網路（同事、家人共用 Wi‑Fi）也算，但要多待一點、真的玩一下，而且同一個網路每天最多算 3 位（防開小帳號）
const SAMENET_STAY_MS = (Number(process.env.SAMENET_STAY_SEC) || 300) * 1000;
const SAMENET_DAILY = Number(process.env.SAMENET_DAILY) || 3;
/** 玩家看得到的名字（暱稱會改，查核要看玩家編號） */
const nameOfVid = (vid) => players[vid]?.nm || players[vid]?.look?.name || homes[vid]?.name || '（沒有名字）';
/** 📝 作者 11/18：改名紀錄（後台查玩家看得到，也能用舊名字查人）。wal.nh = [{ at, from, to }]，最多 30 筆 */
function noteName(wal, name) {
  if (!name) return;
  if (wal.nm && wal.nm !== name) {
    // 作者 11/19：登入帳號那一瞬間會先用隨機名字連線、不到 1 秒又換回來 → 1 分鐘內改回原本的名字，兩筆都不算
    const last = wal.nh?.at(-1);
    if (last && last.from === name && last.to === wal.nm && Date.now() - last.at < 60000) {
      wal.nh.pop();
      wal.nm = name;
      return;
    }
    (wal.nh ??= []).push({ at: Date.now(), from: wal.nm, to: name });
    if (wal.nh.length > 30) wal.nh.splice(0, wal.nh.length - 30);
    console.log(`[改名] ${wal.nm} → ${name}`);
  }
  wal.nm = name;
}
const acctOfVid = (vid) => Object.values(accounts).find((a) => a.vid === vid)?.u ?? '';
// ---------- 👫 好友、💌 密頻、✉️ 聯絡作者 ----------
const FRIEND_MAX = 100;
const pairKey = (a, b) => [a, b].sort().join('|');
const socketsOf = (vid) => [...io.sockets.sockets.values()].filter((s) => s.data.vid === vid);
const friendsOf = (w) => (w.fr ??= []);
const isFriend = (a, b) => !!players[a] && !!players[b] && friendsOf(players[a]).includes(b) && friendsOf(players[b]).includes(a);
/** 未讀：好友密頻幾則、好友邀請幾個、作者回覆幾則 */
function socialBadge(vid) {
  const w = players[vid];
  if (!w) return { dm: 0, req: 0, sup: 0 };
  let dm = 0;
  for (const f of friendsOf(w)) {
    const list = dms[pairKey(vid, f)] ?? [];
    const read = w.dmr?.[f] ?? 0;
    dm += list.filter((m) => m.f !== vid && m.at > read).length;
  }
  return { dm, req: (w.frq ?? []).length, sup: support.filter((x) => x.vid === vid && x.re && !x.seen).length };
}
const pushBadge = (vid) => {
  const b = socialBadge(vid);
  for (const so of socketsOf(vid)) so.emit('socialBadge', b);
};
const KIND_ZH = { invite: '邀請新朋友', share: '分享（每日造型）', date: '營火之約', join: '點連結進來' };
function logInvite(kind, ref, friend, fn, r, net = false) {
  invites.push({ at: Date.now(), kind, ref: ref ? homeId(ref) : '', rn: ref ? nameOfVid(ref) : '', friend: friend ? homeId(friend) : '', fn, net, r });
  if (invites.length > 400) invites.splice(0, invites.length - 400);
  saveJson('invites.json', invites);
}
/** 朋友待滿時間：幫邀請人記一筆 */
function creditReferral(refVid, friendName, friendVid = null) {
  const rw = players[refVid];
  if (!rw) return;
  // 🎁 被邀請的朋友也拿一樣多（作者 11/16：兩個人都有獎勵，邀朋友比較有吸引力）
  if (friendVid && players[friendVid] && !players[friendVid].refGot) {
    players[friendVid].refGot = refVid;
    giveTo(friendVid, REF_GAIN, 'friend');
    const refName = nameOfVid(refVid);
    for (const s of io.sockets.sockets.values()) if (s.data.vid === friendVid) s.emit('invitedGift', { name: refName, n: REF_GAIN });
  }
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
function addStay(kind, friend, ref, name, need, net = null) {
  const key = `${kind}:${friend}:${ref}`;
  if (!stays.has(key)) stays.set(key, { kind, friend, ref, name, at: Date.now(), need: net ? Math.max(need, SAMENET_STAY_MS) : need, net });
}
/** 同一個網路今天已經算過哪些朋友（每個網路每天最多 SAMENET_DAILY 位） */
const sameNetList = (ip) => {
  const d = dayKey();
  shared.netCredits ??= {};
  if (shared.netCredits.d !== d) shared.netCredits = { d, n: {} };
  return (shared.netCredits.n[ip] ??= []);
};
suggestFriend.done = new Set();
/** 👫 邀請／分享／營火之約成功後，問兩邊要不要加好友（11/09 玩家建議）；已經互為好友、被封鎖就不問 */
function suggestFriend(a, b) {
  const wa = players[a];
  const wb = players[b];
  if (!wa || !wb || a === b) return;
  if (friendsOf(wa).includes(b) && friendsOf(wb).includes(a)) return;
  if ((wa.blk ?? []).includes(b) || (wb.blk ?? []).includes(a)) return;
  const tell = (to, other, role) => {
    if (friendsOf(players[to]).includes(other)) return; // 這邊已經送過邀請了
    for (const so of io.sockets.sockets.values()) if (so.data.vid === to) so.emit('friendSuggest', { name: nameOfVid(other), hid: homeId(other), role });
  };
  const key = `${dayKey()}|${[a, b].sort().join('|')}`; // 同一對每天只問一次（邀請＋分享同時成功時不要問兩次）
  if (suggestFriend.done.has(key)) return;
  suggestFriend.done.add(key);
  if (suggestFriend.done.size > 5000) suggestFriend.done.clear();
  tell(b, a, 'ref'); // 邀請人：「○○ 用你的連結來了」
  tell(a, b, 'friend'); // 被邀請的人：「你是 ○○ 邀請來的」
}
function finishStay(st) {
  const { kind, friend, ref, name } = st;
  if (!players[ref]) return;
  if (st.net) {
    // 同一個網路：每天最多算 SAMENET_DAILY 位朋友（同一位朋友的邀請、分享、營火之約只佔一位）
    const list = sameNetList(st.net);
    if (!list.includes(friend)) {
      if (list.length >= SAMENET_DAILY) return logInvite(kind, ref, friend, name, `❌ 同一個網路今天已經算滿 ${SAMENET_DAILY} 位`, true);
      list.push(friend);
    }
  }
  if (kind === 'invite') {
    creditReferral(ref, name, friend);
    suggestFriend(friend, ref);
    return logInvite(kind, ref, friend, name, `✅ 成功：邀請人 +${REF_GAIN} 松果、每週造型；朋友也 +${REF_GAIN} 松果`, !!st.net);
  }
  if (kind === 'share') {
    const got = grantOutfit(ref, dailyOutfit(dayKey()).id, 'daily');
    suggestFriend(friend, ref);
    console.log(`[分享] ${name} 點了連結待滿了${got ? '，送出今天的每日造型' : '（今天的每日造型已經有了）'}`);
    return logInvite(kind, ref, friend, name, got ? '✅ 成功：送出今天的每日造型' : '✅ 待滿了（今天的每日造型本來就有了）', !!st.net);
  }
  if (kind === 'date') {
    // 🔥 營火之約：同一對朋友每天只算一次
    const d = dayKey();
    const pair = [friend, ref].sort().join('|');
    shared.datePairs ??= {};
    if (shared.datePairs.d !== d) shared.datePairs = { d, list: [] };
    if (shared.datePairs.list.includes(pair)) {
      console.log(`[營火之約] 沒算到：${name} 和邀請人今天已經約過了`);
      return logInvite(kind, ref, friend, name, '❌ 這兩個人今天已經約過了', !!st.net);
    }
    shared.datePairs.list.push(pair);
    // 作者 11/25：一個人一天只拿一款（原本是「同一對一天一次」，一群好友一起待在營火旁，一個人一次拿到好幾款）
    shared.datePairs.got ??= [];
    const gotToday = (v) => shared.datePairs.got.includes(v);
    const give = (v) => {
      if (!players[v] || gotToday(v)) return null;
      const id = grantOutfit(v, nextDateOutfit(players[v].outfits, isOpen)?.id, 'date');
      if (id) shared.datePairs.got.push(v);
      return id;
    };
    const a = give(friend);
    const b = give(ref);
    if (a || b) bump('dates');
    questEv(friend, 'date'); // 📒 營火之約
    questEv(ref, 'date');
    logInvite(kind, ref, friend, name, a && b ? '✅ 成功：兩個人拿營火之約造型' : a || b ? '✅ 成功：一個人拿營火之約造型（另一個今天已經拿過或都有了）' : '✅ 成立了（兩個人今天都拿過，或造型都已經有了）', !!st.net);
    for (const s2 of io.sockets.sockets.values()) if (s2.data.vid === ref) s2.emit('dateFriend', { name });
    suggestFriend(friend, ref);
  }
}
/** 檢查哪些已經待滿（每 5 秒，或朋友重新連上時） */
function checkStays(onlyFriend = null) {
  const now = Date.now();
  for (const [key, st] of stays) {
    if (onlyFriend && st.friend !== onlyFriend) continue;
    if (now - st.at < st.need) continue;
    // 同一個網路：朋友還要真的玩一下（釣魚、採集、撿垃圾、做任務⋯）
    const acted = !st.net || (players[st.friend]?.act ?? 0) > st.at;
    if (isOnline(st.friend) && acted) {
      stays.delete(key);
      finishStay(st);
    } else if (now - st.at > st.need + STAY_GRACE_MS) {
      stays.delete(key);
      const why = !acted ? '同一個網路，朋友 30 分鐘內沒有做任何事（釣魚、採集、撿垃圾、做任務）' : '時間到時已經離開，30 分鐘內也沒回來';
      console.log(`[${st.kind === 'invite' ? '邀請' : st.kind === 'share' ? '分享' : '營火之約'}] 沒算到：${st.name} ${why}`);
      logInvite(st.kind, st.ref, st.friend, st.name, `❌ ${why}`, !!st.net);
    }
  }
}
/**
 * 🔥 營火之約（作者 11/24）：老朋友不用再點連結 → 營火時間，兩個互相加好友的人在同一個分流的營火廣場一起待滿 1 分鐘就算
 * （玩家回報：老朋友都是直接開遊戲、或從群組點連結變成新角色，一直約不成功）
 */
const datePresence = new Map(); // 「a|b」→ 一起在營火廣場的開始時間
function checkDatePresence() {
  if (!eventInfo().active) return datePresence.clear();
  const now = Date.now();
  const byRoom = new Map();
  for (const so of io.sockets.sockets.values()) {
    const v = so.data.vid;
    if (!v || !players[v]) continue;
    for (const r of so.rooms) if (r.endsWith(':forest_main')) (byRoom.has(r) ? byRoom.get(r) : byRoom.set(r, new Set()).get(r)).add(v);
  }
  const seen = new Set();
  const d = dayKey();
  shared.datePairs ??= {};
  if (shared.datePairs.d !== d) shared.datePairs = { d, list: [] };
  for (const vids of byRoom.values()) {
    const list = [...vids];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i], list[j]].sort();
        const pair = `${a}|${b}`;
        if (shared.datePairs.list.includes(pair) || !isFriend(a, b)) continue;
        if (shared.datePairs.got?.includes(a) && shared.datePairs.got?.includes(b)) continue; // 兩個人今天都拿過了
        seen.add(pair);
        if (!datePresence.has(pair)) datePresence.set(pair, now);
        else if (now - datePresence.get(pair) >= DATE_STAY_MS) {
          datePresence.delete(pair);
          finishStay({ kind: 'date', friend: a, ref: b, name: nameOfVid(a), net: null });
        }
      }
  }
  for (const pair of [...datePresence.keys()]) if (!seen.has(pair)) datePresence.delete(pair);
}
/** 🔑 從群組（LINE、IG 內建瀏覽器）點連結會先變成新角色，再登入帳號：把還在計時的分享、營火之約轉到帳號的角色（作者 11/24）
 *  「邀請新朋友」不轉：登入的是老帳號，不算新朋友 */
function moveStays(oldVid, newVid) {
  if (!oldVid || !newVid || oldVid === newVid) return;
  for (const [k, st] of [...stays]) {
    if (st.friend !== oldVid) continue;
    stays.delete(k);
    if (st.kind === 'invite' || st.ref === newVid) continue;
    const key = `${st.kind}:${newVid}:${st.ref}`;
    if (!stays.has(key)) stays.set(key, { ...st, friend: newVid, name: nameOfVid(newVid) || st.name });
  }
}
setInterval(() => {
  checkStays();
  checkDatePresence();
}, 5000);

// ---------- 👒 造型收集 ----------
const OUTFIT_SLOTS = ['head', 'back', 'neck', 'hair', 'clip', 'face']; // 📎 髮夾（12 月起，月票本月造型）；💄 臉妝（任務本）
/** 身上穿的造型 → 線上同步用的代號 [頭, 背, 脖子]（0＝沒穿） */
const wearCodes = (w) => OUTFIT_SLOTS.map((k) => outfitCode(w?.wear?.[k]));
// ---------- 📒 任務本（作者 11/22；規則在 src/game/quests.js） ----------
/** 這個人能抽到哪些題目 */
const questCtx = (vid) => {
  const h = homes[vid];
  return { home: !!h?.tent, hens: !!(h?.hens?.length && isOpen({ from: HEN_FROM })), spirit: !!(players[vid]?.spirit?.own || players[vid]?.spirit?.xp > 0) };
};
/** 送任務家具（沒帳篷也先放背包，有帳篷就能擺） */
function giveQuestFurn(vid, id) {
  if (!CATALOG_BY_ID[id]) return;
  const h = (homes[vid] ??= newHome());
  h.inv[id] = (h.inv[id] ?? 0) + 1;
  saveJson('homes.json', homes);
  for (const s of socketsOf(vid)) s.emit('staffGift', { kind: 'furn', id, home: publicHome(h), why: 'quest' });
}
/** 這週的題目（星期一換新；換週那天才抽，之後固定） */
function weekState(vid) {
  const w = players[vid];
  const wk = weekKey(dayKey());
  if (w.wq?.w !== wk) w.wq = { w: wk, ids: weeklyOf(wk, questCtx(vid)), n: {}, p: {}, got: {} };
  return w.wq;
}
/** 任務本的樣子（給前端畫） */
function questView(vid) {
  const w = players[vid];
  if (!w) return null;
  const d = dayKey();
  const ctx = questCtx(vid);
  const ch = w.ch?.d === d ? w.ch : { d, n: {} };
  const daily = dailyOf(d, ctx, ch.sw).map((id) => ({ id, have: Math.min(ch.n[id] ?? 0, DAILY_BY_ID[id].n), need: DAILY_BY_ID[id].n }));
  const wq = weekState(vid);
  const weekly = wq.ids.map((id) => ({ id, have: Math.min(wq.n[id] ?? 0, WEEKLY_BY_ID[id].n), need: WEEKLY_BY_ID[id].n }));
  const ym = d.slice(0, 7);
  const st = w.stamp?.m === ym ? w.stamp : { m: ym, n: 0 };
  return {
    daily, swapped: !!ch.sw, dailyOutfit: dailyOutfit(d).id, dailyDone: daily.every((x) => x.have >= x.need),
    weekly, wk: wq.w, weeklyOutfit: weeklyOutfit(d).id, weeklyGot: wq.got ?? {}, baitOn: isOpen({ from: BOAT_FROM }),
    stamps: st.n, stampNeed: STAMP_MONTH, stampGot: !!st.got, makeupNext: MAKEUP_ORDER.find((m) => !(w.outfits ?? []).includes(m)) ?? null,
    cats: w.qcat ?? {}, catAt: CAT_TROPHY_AT,
    hol: holView(vid),
  };
}
// ---------- 🎉 假日活動（作者 11/22）：全營地一起的目標＋自己的 3 題＋整點小高潮 ----------
const HOL_TEST = process.env.HOLIDAY_TEST || ''; // 本機測試：clean／egg／fish／cook 強制打開（Render 不要設）
const holNow = () => holidayNow(new Date(), HOL_TEST);
/** 這一場的全營地進度（存在 totals.hol，伺服器重開也在） */
function holState(H) {
  if (totals.hol?.key !== H.key) totals.hol = { key: H.key, n: 0, got: {}, who: {} };
  return totals.hol;
}
function holMine(vid, H) {
  const w = players[vid];
  if (w.hq?.k !== H.key) w.hq = { k: H.key, n: {}, all: false };
  return w.hq;
}
function holView(vid) {
  const H = holNow();
  if (!H) return { next: nextHoliday() };
  const def = HOLIDAYS[H.id];
  const st = holState(H);
  const me = holMine(vid, H);
  const g = holGoal(H);
  return { id: H.id, endIn: H.endIn, peak: H.peak, n: st.n, goal: g.n, steps: g.steps, got: st.got, joined: !!st.who[vid], all: me.all, tasks: def.tasks.map((q) => ({ id: q.id, have: Math.min(me.n[q.id] ?? 0, q.n), need: q.n })) };
}
/** 假日活動的事件（questEv 一開始呼叫）；回傳這次做完的題目 */
function holEv(vid, ev, k = 1) {
  const H = holNow();
  if (!H || !players[vid]) return [];
  const def = HOLIDAYS[H.id];
  const g = holGoal(H);
  const kk = k * (H.peak && H.id !== 'egg' ? 2 : 1); // ⏰ 整點小高潮：算 2 倍
  const done = [];
  let moved = false;
  const me = holMine(vid, H);
  const st = holState(H);
  for (const q of def.tasks) {
    if (q.ev !== ev || (me.n[q.id] ?? 0) >= q.n) continue;
    me.n[q.id] = Math.min(q.n, (me.n[q.id] ?? 0) + kk);
    moved = true;
    if (me.n[q.id] >= q.n) {
      done.push(['h', q.id]);
      giveTo(vid, HOL_TASK_GAIN, 'quest');
    }
  }
  if (!me.all && def.tasks.every((q) => (me.n[q.id] ?? 0) >= q.n)) {
    me.all = true;
    giveQuestFurn(vid, def.furn);
    bump('holAll');
  }
  if (g.ev === ev) {
    st.n += kk;
    moved = true;
  }
  if (!moved) return done;
  st.who[vid] = 1; // 有參加
  g.steps.forEach((s, i) => {
    if (st.n < s || st.got[i]) return;
    st.got[i] = 1;
    const last = i === g.steps.length - 1;
    for (const v of Object.keys(st.who)) last ? giveQuestFurn(v, def.trophy) : giveTo(v, HOL_STEP_GAIN, 'quest');
    io.emit('holStep', { id: H.id, step: i, last, n: s, who: Object.keys(st.who).length });
    console.log(`[假日] ${def.zh} 全營地到 ${s}（${Object.keys(st.who).length} 人參加）`);
  });
  saveJson('totals.json', totals);
  saveJson('players.json', players);
  return done;
}
/** 蓋章（每月集滿 20 個：臉妝＋金獎盃） */
function addStamp(vid, n) {
  const w = players[vid];
  const ym = dayKey().slice(0, 7);
  if (w.stamp?.m !== ym) w.stamp = { m: ym, n: 0 };
  w.stamp.n += n;
  if (w.stamp.n >= STAMP_MONTH && !w.stamp.got) {
    w.stamp.got = true;
    const mk = MAKEUP_ORDER.find((m) => !(w.outfits ?? []).includes(m));
    if (mk) grantOutfit(vid, mk, 'stamp');
    giveQuestFurn(vid, 'q_trophy');
    bump('questMonth');
  }
}
/** 一題做完：那一類累積 10 題送達人獎盃 */
function questCat(vid, cat) {
  const w = players[vid];
  w.qcat ??= {};
  w.qcat[cat] = (w.qcat[cat] ?? 0) + 1;
  w.qtro ??= [];
  if (w.qcat[cat] >= CAT_TROPHY_AT && CAT_TROPHY[cat] && !w.qtro.includes(cat)) {
    w.qtro.push(cat);
    giveQuestFurn(vid, CAT_TROPHY[cat]);
  }
}
/**
 * 📒 發生一件事（ev）：算進今天的每日、這週的每週任務。
 * opt.who：對象（要「不同的人」的題目用）；opt.net：做的人的網路（同一個網路的對象不算）
 */
function questEv(vid, ev, k = 1, opt = {}) {
  const w = players[vid];
  if (!w || !vid) return;
  const d = dayKey();
  const ctx = questCtx(vid);
  const done = holEv(vid, ev, k); // 🎉 假日活動
  const holMoved = done.length > 0;
  let moved = false;
  // 📅 每日
  if (w.ch?.d !== d) w.ch = { d, n: {} };
  const dv = dailyOf(d, ctx, w.ch.sw);
  for (const id of dv) {
    const q = DAILY_BY_ID[id];
    if (q.ev !== ev || (w.ch.n[id] ?? 0) >= q.n) continue;
    w.ch.n[id] = Math.min(q.n, (w.ch.n[id] ?? 0) + k);
    moved = true;
    if (w.ch.n[id] >= q.n) {
      done.push(['d', id]);
      giveTo(vid, DAILY_GAIN, 'quest');
      questCat(vid, q.cat);
    }
  }
  // 🗓️ 每週
  const wq = weekState(vid);
  for (const id of wq.ids) {
    const q = WEEKLY_BY_ID[id];
    if (!q || q.ev !== ev || (wq.n[id] ?? 0) >= q.n) continue;
    if (q.who) {
      if (!opt.who || opt.who === vid) continue;
      if (opt.net && socketsOf(opt.who).some((s) => s.data.netKey === opt.net)) continue; // 同一個網路的不算
      wq.p ??= {};
      wq.p[id] ??= [];
      if (wq.p[id].includes(opt.who)) continue;
      wq.p[id].push(opt.who);
      wq.n[id] = wq.p[id].length;
    } else wq.n[id] = Math.min(q.n, (wq.n[id] ?? 0) + k);
    moved = true;
    if (wq.n[id] >= q.n) {
      done.push(['w', id]);
      questCat(vid, q.cat);
    }
  }
  if (!moved && !holMoved && !holNow()) return;
  if (!moved) {
    for (const s of socketsOf(vid)) s.emit('quest', { view: questView(vid), done });
    return;
  }
  // 📅 每日 3 題都做完：今天的造型＋1 個章
  if (done.some(([t]) => t === 'd') && dv.every((id) => (w.ch.n[id] ?? 0) >= DAILY_BY_ID[id].n) && !w.ch.all) {
    w.ch.all = true;
    grantOutfit(vid, dailyOutfit(d).id, 'chal');
    addStamp(vid, STAMP_DAILY);
    bump('chals');
  }
  // 🗓️ 每週：3 題小盆栽、4 題魚飼料（11/27 起）、5 題本週造型＋3 個章＋銀獎盃
  const wdone = wq.ids.filter((id) => (wq.n[id] ?? 0) >= WEEKLY_BY_ID[id].n).length;
  wq.got ??= {};
  if (wdone >= WEEKLY_PLANT_AT && !wq.got.plant) (wq.got.plant = true), giveQuestFurn(vid, 'q_plant');
  if (wdone >= WEEKLY_BAIT_AT && !wq.got.bait && isOpen({ from: BOAT_FROM })) (wq.got.bait = true), (w.bait = (w.bait ?? 0) + 1);
  if (wdone >= wq.ids.length && !wq.got.all) {
    wq.got.all = true;
    grantOutfit(vid, weeklyOutfit(d).id, 'qweek');
    addStamp(vid, STAMP_WEEKLY);
    giveQuestFurn(vid, 'q_tro_silver');
    bump('questWeek');
  }
  saveJson('players.json', players);
  for (const s of socketsOf(vid)) s.emit('quest', { view: questView(vid), done });
}

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
  return { outfits: owned, wear: w?.wear ?? {}, daily, dailyGot: owned.includes(daily), weekly, weeklyGot: owned.includes(weekly), dateNext: nextDateOutfit(owned, isOpen)?.id ?? null };
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
// ---------- ⛵ 租船（作者 11/19，11/27 開）：每個分流的湖畔碼頭各自一組船 ----------
/** rkey → Map(船編號 → 船)；船：{ id, k 種類, o 船主 socket, on 船主名字, ov 船主 vid, r 座位上的人（socket id，空位 null）, p socket→player, slot 停船位, x, z, ry, until } */
const boatRooms = new Map();
/** 🤝 河神大鯉魚（rkey → 正在拉的那一場）：{ id, fisher socket, fv 釣的人 vid, name, until, taps: Map(socket → { n, vid, name }) } */
const coopRuns = new Map();
let coopSeq = 0;
/** 🪨 今天的打水漂排行（全營地一起）：{ day, list: [{ name, vid, b }] }（前 5 名，一人一筆） */
// 作者 11/22：排行存進 totals.json，伺服器重開（Render 更新）也不會不見
let skipBoard = { day: '', list: [] };
const skipTop = () => {
  if (skipBoard.day !== dayKey()) skipBoard = totals.skipB?.day === dayKey() ? totals.skipB : { day: dayKey(), list: [] };
  totals.skipB = skipBoard;
  return skipBoard.list.map((e) => ({ name: e.name, b: e.b }));
};
let boatSeq = 0;
/** ⛵ 租船看板的位置（跟 lakeRoom.js 一樣） */
const BOAT_SIGN = { x: 1.9, z: 2.3 };
const boatPublic = (b) => ({ id: b.id, k: b.k, o: b.o, on: b.on, r: b.r, x: +b.x.toFixed(2), z: +b.z.toFixed(2), ry: +b.ry.toFixed(3), until: b.until, slot: b.slot });
const boatList = (key) => [...(boatRooms.get(key)?.values() ?? [])].map(boatPublic);
const boatOf = (key, sid) => [...(boatRooms.get(key)?.values() ?? [])].find((b) => b.r.includes(sid)) ?? null;
/** 下船站到碼頭上：照停船位、座位錯開，大家不會擠在同一點 */
function boatLanding(b, i) {
  const st = BOAT_SLOTS[b.slot] ?? BOAT_SLOTS[0];
  const side = st.x < 0 ? -1 : 1;
  return { x: side * (0.2 + (i % 2) * 0.3), z: Math.max(DOCK_END + 0.5, Math.min(1.4, st.z)) + (i >> 1) * 0.55 }; // 停船位旁邊的碼頭上
}
/** 某個人下船（回到碼頭上） */
function boatDropRider(key, b, sid, why) {
  const i = b.r.indexOf(sid);
  if (i < 0) return;
  b.r[i] = null;
  const p = b.p.get(sid);
  b.p.delete(sid);
  if (p) {
    const at = boatLanding(b, i);
    p.x = at.x;
    p.z = at.z;
    p.posAt = Date.now();
    p.dirty = true;
    io.to(sid).emit('boatOff', { id: b.id, why, x: at.x, z: at.z });
  }
}
/** 收船：時間到、船主下船或離開 → 船上每個人回碼頭，船消失 */
function boatEnd(key, b, why) {
  const map = boatRooms.get(key);
  if (!map?.has(b.id)) return;
  for (const sid of b.r) if (sid) boatDropRider(key, b, sid, why);
  map.delete(b.id);
  if (!map.size) boatRooms.delete(key);
  io.to(key).emit('boats', { list: boatList(key) });
}
setInterval(() => {
  const now = Date.now();
  for (const [key, map] of boatRooms) for (const b of [...map.values()]) if (now >= b.until) boatEnd(key, b, 'time');
}, 3000);

function today() {
  const k = dayKey();
  if (!stats[k]) {
    stats[k] = newDay();
    const keys = Object.keys(stats).sort();
    for (const old of keys.slice(0, Math.max(0, keys.length - STATS_DAYS))) delete stats[old];
  }
  return stats[k];
}
// 📣 大聲公
const SHOUT_PRICE = 30;
const SHOUT_MY_MS = 3 * 60 * 1000;
const SHOUT_ALL_MS = 20 * 1000;
let shoutAt = 0;
const shouts = []; // 最近 50 則（/admin 看得到，重開伺服器會清空）
const bump = (field, n = 1) => {
  const d = today();
  d[field] = (d[field] ?? 0) + n;
  saveJson('stats.json', stats);
};
/**
 * 🌰 松果存量（作者 11/23：老玩家會不會越存越多）：每天第一次記一筆「最近 14 天來過的人，手上有幾顆／總共拿過幾顆」
 * stats[日期].pcs = { vid: [現在有, 總共拿過] }。/stats「🌰 松果存量」用它算平均、這 7 天賺多少花多少。
 */
function snapPc() {
  const d = today();
  if (d.pcs) return;
  const seen = new Set();
  for (const k of Object.keys(stats).sort().reverse().slice(0, 14)) for (const v of stats[k]?.vids ?? []) seen.add(v);
  const pcs = {};
  for (const v of seen) if (players[v] && !isAuthorVid(v) && !players[v].author) pcs[v] = [players[v].pc ?? 0, players[v].tot ?? 0]; // 作者自己的不算（作者 11/23）
  d.pcs = pcs;
  for (const k of Object.keys(stats).sort().reverse().slice(30)) delete stats[k].pcs; // 只留 30 天，存檔不要變太大
  saveJson('stats.json', stats);
}
setInterval(snapPc, 60000);
setTimeout(snapPc, 20000);
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
/** 現在的月票等級（PASS_TIERS 的一項）；沒有月票＝null。以前買的月票沒有 tier，當作小營火 */
const passTier = (w) => (passActive(w) ? PASS_TIERS[w.pass.tier] ?? PASS_TIERS.ember : null);
/** 小營火升級星空的差價：(150−60)×剩下天數÷30，四捨五入，最少 NT$10 */
const upgradePrice = (w, now = Date.now()) => {
  const days = Math.ceil(Math.max(0, (w?.pass?.until ?? 0) - now) / 86400000);
  return Math.max(10, Math.round(((PASS_TIERS.star.price - PASS_TIERS.ember.price) * days) / 30));
};
/** 🎁 星空月票：每 30 天可以免費挑 1 件月票家具（第一次買星空就能拿；拿了之後 30 天再給一次） */
const FREE_FURN_MS = 30 * 86400000;
const freeFurnAt = (w) => (w?.pass?.freeAt ? w.pass.freeAt + FREE_FURN_MS : 0);
const freeFurnOk = (w, now = Date.now()) => passTier(w)?.id === 'star' && freeFurnAt(w) <= now;
const passView = (w) => {
  const tier = passTier(w);
  return { until: w?.pass?.until ?? 0, active: !!tier, tier: tier?.id ?? null, today: w?.pd === dayKey(), upgrade: tier?.id === 'ember' ? upgradePrice(w) : null, freeOk: freeFurnOk(w), freeNext: freeFurnAt(w) };
};
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
  const month = dayKey(new Date(order.paidAt ?? Date.now())).slice(0, 7); // 付款那個月（台北時間）
  const tier = sponsorTier(month, order.amt);
  const box = SPONSOR_BOX[month];
  // 🎁 12 月起：依金額送禮盒家具（放進背包）。100 元要二選一：order.pick＝'big' 拿大件，否則拿假髮
  const wantWig = tier.wig || (tier.pick && order.pick !== 'big');
  const wantBig = !!box && (tier.big || (tier.pick && order.pick === 'big'));
  // 送他選的那一款（要是付款那個月的）；沒選或對不上就送那個月的第一款
  const list = sponsorOutfits(month);
  // 選的那款已經有了（同一個月再贊助一次）→ 改送另一款；兩款都有了就不重複給
  const owned = w.outfits ?? [];
  const picked = list.find((o) => o.id === order.wig) ?? list[0];
  const wig = wantWig ? (picked && !owned.includes(picked.id) ? picked : list.find((o) => !owned.includes(o.id)) ?? null) : null;
  const furn = [];
  if (box) {
    if (tier.small >= 3) furn.push(...box.small);
    else if (tier.small) furn.push(box.small.includes(order.small) ? order.small : box.small[0]);
    if (wantBig) furn.push(box.big);
    const h = (homes[vid] ??= newHome());
    for (const id of furn) h.inv[id] = (h.inv[id] ?? 0) + 1;
    if (furn.length) saveJson('homes.json', homes);
  }
  saveJson('players.json', players);
  const got = wig ? grantOutfit(vid, wig.id, 'sponsor') : null;
  if (order) order.gave = { wig: got ? wig.id : null, furn }; // 退款時照這個收回
  for (const s of io.sockets.sockets.values()) if (s.data.vid === vid) s.emit('sponsored', { amt: order.amt, wig: wig?.id ?? null, got: !!got, furn });
  console.log(`[贊助] ${order.name} NT$${order.amt}${wig ? ` → ${wig.zh}` : ''}${furn.length ? ` ＋ ${furn.map((id) => CATALOG_BY_ID[id]?.zh ?? id).join('、')}` : ''}`);
}
/**
 * 💸 退款後收回（11/11）：作者在綠界退款後，到 /admin 輸入訂單編號，把這筆送的東西收回
 *   月票：扣回天數（升級的改回小營火）、扣回先送的松果（已經花掉就扣到 0）；支持營地：收回這筆送的假髮
 */
function refundOrder(no) {
  const o = orders[no];
  if (!o) return { ok: false, reason: '找不到這個訂單編號' };
  if (o.status === 'refunded') return { ok: false, reason: '這筆已經收回過了' };
  if (o.status !== 'paid') return { ok: false, reason: '這筆沒有付款成功，不用收回' };
  const w = players[o.vid];
  if (!w) return { ok: false, reason: '找不到這位玩家的存檔' };
  const g = o.gave ?? {};
  let what = '';
  if (o.kind === 'sponsor') {
    const wig = g.wig ?? null;
    if (wig && w.outfits?.includes(wig)) {
      w.outfits = w.outfits.filter((x) => x !== wig);
      for (const [slot, id] of Object.entries(w.wear ?? {})) if (id === wig) delete w.wear[slot];
      syncRack(o.vid);
      what = `收回假髮 ${OUTFIT_BY_ID[wig]?.zh ?? wig}`;
    } else what = '（這筆沒有送假髮）';
    // 🎁 禮盒家具：背包裡還沒擺的先收；擺出來了就從家裡拿掉
    const h = homes[o.vid];
    const took = [];
    for (const id of g.furn ?? []) {
      if (!h?.inv[id]) continue;
      if (available(h, id, 0) <= 0) {
        const i = h.items.findIndex((x) => x.i === id);
        if (i >= 0) h.items.splice(i, 1);
      }
      h.inv[id] -= 1;
      if (h.inv[id] <= 0) delete h.inv[id];
      took.push(CATALOG_BY_ID[id]?.zh ?? id);
    }
    if (took.length) {
      what += `、收回家具 ${took.join('、')}`;
      saveJson('homes.json', homes);
    }
    w.spons = Math.max(0, (w.spons ?? 0) - o.amt);
  } else {
    w.pass ??= {};
    const plan = PASS_PLANS[o.plan];
    const tier = PASS_TIERS[o.tier] ?? PASS_TIERS.ember;
    const up = g.up ?? !!o.upgrade;
    if (up) {
      if (w.pass.tier === 'star') w.pass.tier = 'ember';
      what = '星空改回小營火';
    } else {
      const ms = g.ms ?? (plan?.days ?? tier.days) * 86400000;
      w.pass.until = Math.max(Date.now(), (w.pass.until ?? 0) - ms);
      what = `月票扣回 ${Math.round(ms / 86400000)} 天`;
    }
    const pc = g.pc ?? (up ? PASS_TIERS.star.first - PASS_TIERS.ember.first : plan?.first ?? tier.first);
    const took = Math.min(w.pc, pc);
    w.pc -= took;
    what += `、松果 -${took}${took < pc ? `（他只剩 ${took} 顆，不足的不扣）` : ''}`;
  }
  o.status = 'refunded';
  o.refundAt = Date.now();
  saveJson('orders.json', orders);
  saveJson('players.json', players);
  for (const s of io.sockets.sockets.values()) {
    if (s.data.vid !== o.vid) continue;
    s.emit('wallet', { pc: w.pc, delta: 0, reason: 'refund' });
    if (o.kind !== 'sponsor') s.emit('pass', passView(w));
  }
  console.log(`[退款] ${o.name} ${no}：${what}`);
  return { ok: true, what, name: nameOfVid(o.vid), amt: o.amt };
}
/**
 * 💝 付款成功 → 送東西（共用：以後接國外付款平台，付款成功也呼叫這一段）
 *   order.kind：'pass' 月票、'sponsor' 支持營地（假髮）
 */
function fulfillOrder(order) {
  if (!order || order.done) return false;
  order.done = Date.now();
  saveJson('orders.json', orders);
  if (order.kind === 'sponsor') activateSponsor(order.vid, order);
  else activatePass(order.vid, order);
  return true;
}
function activatePass(vid, order) {
  const w = players[vid];
  if (!w) return false;
  const now = Date.now();
  const tier = PASS_TIERS[order?.tier] ?? PASS_TIERS.ember;
  const cur = passTier(w);
  w.pass ??= {};
  let gain;
  if (order?.upgrade && cur?.id === 'ember') {
    // ⬆️ 小營火升級星空：剩下的天數不變，改成星空的待遇；買的當天的松果補差額
    w.pass.tier = 'star';
    gain = PASS_TIERS.star.first - PASS_TIERS.ember.first;
  } else {
    // 1 個月／3 個月：天數疊加在剩下的天數上（舊訂單沒有 plan，照月票本身的 30 天）
    const plan = PASS_PLANS[order?.plan];
    w.pass.until = Math.max(now, w.pass.until ?? 0) + (plan?.days ?? tier.days) * 86400000;
    // 兩種混著買：用比較好的那一種
    w.pass.tier = cur && cur.rank > tier.rank ? cur.id : tier.id;
    gain = plan?.first ?? tier.first;
  }
  w.pass.bought = (w.pass.bought ?? 0) + 1;
  if (order) order.gave = { pc: gain, ms: order.upgrade && cur?.id === 'ember' ? 0 : (PASS_PLANS[order.plan]?.days ?? tier.days) * 86400000, up: !!(order.upgrade && cur?.id === 'ember') }; // 退款時照這個收回
  w.pd = dayKey(); // 今天已經用「先送的松果」領過了，今天不再加每日的份
  w.pc += gain;
  w.tot += gain;
  saveJson('players.json', players);
  grantGift(vid, tier.style);
  for (const s of io.sockets.sockets.values()) {
    if (s.data.vid !== vid) continue;
    s.emit('wallet', { pc: w.pc, delta: gain, reason: 'pass' });
    s.emit('pass', { ...passView(w), gain, order: order?.no });
    s.data.onPass?.();
  }
  console.log(`[月票] ${order?.name ?? vid} ${order?.upgrade ? '升級星空' : PASS_PLANS[order?.plan]?.item ?? tier.zh}，到 ${new Date(w.pass.until).toISOString()}`);
  return true;
}

// ---------- HTTP ----------
const app = express();
// 省流量（11/07）：網頁、程式、資料先壓縮再送（遊戲主程式 1.4 MB → 約 0.55 MB）
app.use(compression());
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
  // 📲 手機桌面捷徑的名字跟著玩家的語言（11/09）：遊戲會帶 ?lang=；沒帶就看瀏覽器語言
  app.get('/manifest.webmanifest', (req, res, next) => {
    let base;
    try {
      base = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.webmanifest'), 'utf8'));
    } catch {
      return next();
    }
    const al = String(req.headers['accept-language'] ?? '').toLowerCase();
    const q = String(req.query.lang ?? '');
    const lg = ['zh-Hant', 'en', 'ja', 'ko'].includes(q) ? q : al.startsWith('zh') ? 'zh-Hant' : al.startsWith('ja') ? 'ja' : al.startsWith('ko') ? 'ko' : al ? 'en' : 'zh-Hant';
    const L = {
      en: ['Misty Forest Campground', 'Misty Camp', 'Too tired to go out tonight? Come sit by the fire for a while.'],
      ja: ['霧の森キャンプ場', '霧の森キャンプ', '出かける元気がない夜は、焚き火のそばでひと休み。'],
      ko: ['안개 숲 캠핑장', '안개 숲 캠핑', '나가기 힘든 밤엔 모닥불 옆에 잠깐 앉아요.'],
    }[lg];
    if (L) Object.assign(base, { name: L[0], short_name: L[1], description: L[2], lang: lg });
    res.set('Cache-Control', 'no-cache');
    res.type('application/manifest+json').send(JSON.stringify(base));
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
    console.log(`[親友小花] 讀到 ${sponsors.length} 位（作者手動加的小黃花、四葉草，不是付款贊助）`);
  } catch (err) {
    console.warn('[親友小花] 讀取 sponsors.json 失敗：', err.message);
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

// 🔗 11/17 從別的網站（嵌入）換到完整版：把這台的進度暫存一下，新分頁用一次性代碼接回來
//   代碼 10 分鐘內有效、用一次就刪；只放在記憶體，不寫進存檔
const xfers = new Map();
const XFER_TTL = 10 * 60000;
app.post('/api/xfer', express.json({ limit: '80kb' }), (req, res) => {
  const now = Date.now();
  for (const [k, v] of xfers) if (v.exp < now) xfers.delete(k);
  if (xfers.size > 500) return res.status(429).json({ ok: false });
  const src = req.body?.data;
  if (!src || typeof src !== 'object' || Array.isArray(src)) return res.status(400).json({ ok: false });
  const data = {};
  let size = 0;
  for (const [k, v] of Object.entries(src).slice(0, 60)) {
    if (!/^cozy[\w-]{0,40}$/.test(k) || typeof v !== 'string') continue;
    size += k.length + v.length;
    if (size > 70000) break;
    data[k] = v;
  }
  if (!data['cozy-campfire-vid']) return res.status(400).json({ ok: false });
  const tok = crypto.randomBytes(12).toString('base64url');
  xfers.set(tok, { data, exp: now + XFER_TTL });
  res.json({ ok: true, tok });
});
app.get('/api/xfer/:tok', (req, res) => {
  const x = xfers.get(String(req.params.tok));
  xfers.delete(String(req.params.tok));
  if (!x || x.exp < Date.now()) return res.status(404).json({ ok: false });
  res.set('Cache-Control', 'no-store').json({ ok: true, data: x.data });
});
app.get('/api/channels', (_req, res) => {
  res.set('Access-Control-Allow-Origin', '*'); // 上架其他平台的版本從別的網址來問
  tidyChannels();
  res.json(channelList());
});
// 統計頁：/stats（有設環境變數 STATS_KEY 的話，要用 /stats?key=密碼 才看得到）
/** 🟢 現在在線的人（/stats、/admin 打開那一刻即時算，不另外存）；link(hid, name) 決定名字怎麼顯示 */
/** 🌏 IP → 國家（只在記憶體裡、不存 IP；VPN 會顯示 VPN 的國家）（作者 11/16） */
const REGION_ZH = new Intl.DisplayNames(['zh-TW'], { type: 'region' });
function countryOf(ip) {
  try {
    const cc = geoip.lookup(String(ip || '').replace(/^::ffff:/, ''))?.country;
    return cc || '';
  } catch {
    return '';
  }
}
function flagOf(cc) {
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  let name = cc;
  try {
    name = REGION_ZH.of(cc) ?? cc;
  } catch {
    /* 舊版 Node */
  }
  return `<span title="${cc}">${String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))} ${escH(name)}</span>`;
}
function onlineList(link) {
  const onRows = [];
  const ccOf = new Map();
  for (const so of io.sockets.sockets.values()) if (so.data.vid && so.data.cc) ccOf.set(so.data.vid, so.data.cc);
  // 🔗 同網路（作者 11/16：想知道說不認識的玩家是不是同一個網路）：同一個網路有 2 個以上不同玩家，標 A、B、C⋯
  const netVids = new Map();
  for (const so of io.sockets.sockets.values()) {
    if (!so.data.vid || !so.data.netKey) continue;
    if (!netVids.has(so.data.netKey)) netVids.set(so.data.netKey, new Set());
    netVids.get(so.data.netKey).add(so.data.vid);
  }
  const netTag = new Map();
  let netN = 0;
  for (const vids of netVids.values()) {
    if (vids.size < 2) continue;
    const tag = String.fromCharCode(65 + (netN++ % 26));
    for (const v of vids) netTag.set(v, tag);
  }
  const placeOf = (rid) => {
    const z = campZoneOf(rid);
    const base = baseRoom(rid);
    return base === 'campground' ? `帳篷營地 ${zoneName(z)} 區` : ROOM_DEFS[base]?.label ?? base;
  };
  const addOn = (p, where, ch) => {
    const w = players[p.vid];
    const h = homes[p.vid];
    const pt = passTier(w);
    onRows.push({ ch, row: `<tr><td>${link(homeId(p.vid), p.name)}${ccOf.get(p.vid) ? ` <small>${flagOf(ccOf.get(p.vid))}</small>` : ''}${netTag.get(p.vid) ? ` <small style="color:#ffb347">🔗 同網路 ${netTag.get(p.vid)}</small>` : ''}<br><small>${escH(homeId(p.vid))}</small></td><td>${escH(where)}</td><td>${ch}</td><td>${w?.fd ? `${Number(w.fd.slice(5, 7))}/${Number(w.fd.slice(8, 10))}<br><small>（第 ${Math.max(0, Math.round((Date.parse(`${dayKey()}T00:00:00Z`) - Date.parse(`${w.fd}T00:00:00Z`)) / 86400000)) + 1} 天）</small>` : w ? '更早' : '-'}</td><td>${h?.tent ? (h.plot ? plotLabel(h.plot) : '有') : '-'}</td><td>${pt ? `${pt.icon} ${pt.zh}` : ''}${isAuthorVid(p.vid) ? ' ⭐ 作者' : ''}</td></tr>` });
  };
  for (const c of channels.values()) for (const [rid, r] of c.rooms) for (const pl of r.players.values()) addOn(pl, placeOf(rid), c.ch);
  for (const [owner, r] of homeRooms) for (const pl of r.players.values()) addOn(pl, owner === pl.vid ? '🏠 自己的帳篷' : `🏠 ${String(homes[owner]?.name ?? '別人')}的帳篷`, pl.ch ?? '-');
  onRows.sort((x, y) => String(x.ch).localeCompare(String(y.ch)));
  return onRows;
}

app.get(['/stats', '/api/stats'], (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/stats?key=…');
  const days = Object.keys(stats).sort().reverse().slice(0, 30);
  const rows = days.map((k) => {
    const d = stats[k];
    const avg = d.sessions ? Math.round(d.totalSec / d.sessions) : 0;
    const pct = (n) => (d.sessions ? `${Math.round((n / d.sessions) * 100)}%` : '-');
    const nbPct = (n) => (d.nb ? `${Math.round(((n ?? 0) / d.nb) * 100)}%` : '-');
    return { day: k, visits: d.visits, visitors: d.vids.length, mobile: d.visits ? `${Math.round((d.touch / d.visits) * 100)}%` : '-', avg: `${Math.floor(avg / 60)}分${avg % 60}秒`, s30: pct(d.stay[0]), s120: pct(d.stay[1]), s600: pct(d.stay[2]), s600p: pct(d.stay[3]), nb: d.nb ?? '-', nb30: nbPct(d.nb30), nbDid: nbPct(d.nbDid), ritual: d.ritual, quests: d.ritual + Object.values(d.quests ?? {}).reduce((a, b) => a + b, 0), hangs: d.hangs ?? 0, stones: d.stones, wishes: d.wishes, notes: d.notes, fish: d.fish, chats: d.chats, hits: d.hits ?? '-', preLeave: d.hits ? `${Math.max(0, Math.round(((d.hits - (d.loaded ?? 0)) / d.hits) * 100))}%` : '-', shares: d.shares ?? 0, invNew: d.invNew ?? 0, dates: d.dates ?? 0, gathers: d.gathers ?? 0, treasures: d.treasures ?? 0, trash: d.trash ?? 0, recycled: d.recycled ?? 0, donates: d.donates ?? 0, crafts: d.crafts ?? 0, cooks: d.cooks ?? 0, harvests: d.harvests ?? 0, waters: d.waters ?? 0, chals: d.chals ?? 0 };
  });
  if (req.path.startsWith('/api')) return res.json(rows);
  const head = ['日期', '打開網頁', '載入完成前就離開', '進來次數', '不重複旅人', '手機比例', '平均停留', '30秒內離開', '30秒～2分', '2～10分', '10分以上', '新旅人', '新旅人30秒內離開', '新旅人完成任務', '分享', '邀請來的新旅人', '營火之約', '採集', '營火寶藏', '撿垃圾', '回收', '捐標本', '手作', '料理', '收成', '幫澆水', '今日挑戰完成', '疊過石頭的人', '完成任務', '掛裝飾', '石頭', '繪馬', '留言', '釣魚', '聊天'];
  const keys = ['day', 'hits', 'preLeave', 'visits', 'visitors', 'mobile', 'avg', 's30', 's120', 's600', 's600p', 'nb', 'nb30', 'nbDid', 'shares', 'invNew', 'dates', 'gathers', 'treasures', 'trash', 'recycled', 'donates', 'crafts', 'cooks', 'harvests', 'waters', 'chals', 'ritual', 'quests', 'hangs', 'stones', 'wishes', 'notes', 'fish', 'chats'];
  // 來源統計：最近 7 天每個來源的人數、30 秒內離開、平均停留、隔天回來的比例
  const srcDays = days.slice(0, 7);
  const srcRows = SOURCES.map((so) => {
    const a = { id: so.id, zh: so.zh, hits: 0, loaded: 0, v: 0, n: 0, ss: 0, s30: 0, sec: 0, d1: 0, nOld: 0, lang: {} };
    srcDays.forEach((k, idx) => {
      const e = stats[k]?.src?.[so.id];
      for (const [lg, n] of Object.entries(stats[k]?.langSrc?.[so.id] ?? {})) a.lang[lg] = (a.lang[lg] ?? 0) + n;
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
  // 👥 固定玩家：最近 7 天來了幾天（用每天的不重複旅人清單算，作者自己的裝置本來就不算）
  const allDays = Object.keys(stats).sort().reverse();
  const dayCount = (from, to) => {
    const m = new Map();
    for (const k of allDays.slice(from, to)) for (const v of stats[k]?.vids ?? []) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const notAuthor = (m) => { for (const v of [...m.keys()]) if (isAuthorVid(v) || players[v]?.author) m.delete(v); return m; }; // 作者自己的帳號不算（作者 11/23）
  const wk = notAuthor(dayCount(0, 7));
  const prev = notAuthor(dayCount(7, 14));
  const bucket = (m) => {
    const c = { one: 0, two: 0, reg: 0, fan: 0 };
    for (const n of m.values()) {
      if (n >= 5) c.fan++;
      if (n >= 3) c.reg++;
      else if (n === 2) c.two++;
      else c.one++;
    }
    return c;
  };
  const bw = bucket(wk);
  const bp = bucket(prev);
  const trend = (a, b) => (a > b ? ` <small style="color:#9fe39f">↑${a - b}</small>` : a < b ? ` <small style="color:#ff9f8a">↓${b - a}</small>` : '');
  // 🌰 每個人：現在有幾顆、這 7 天拿了幾顆、花了幾顆（用 7 天前那天的存量紀錄算；紀錄不到 7 天就用最早那天）
  const pcDays = allDays.filter((k) => stats[k]?.pcs);
  const pcBase = (v) => {
    for (const k of pcDays.slice(0, 8).reverse()) if (stats[k].pcs[v]) return stats[k].pcs[v];
    return null;
  };
  const pcRow = (v) => {
    const w = players[v];
    if (!w) return { now: '-', earn: '-', spend: '-' };
    const b = pcBase(v);
    if (!b) return { now: w.pc ?? 0, earn: '-', spend: '-' };
    const earn = Math.max(0, (w.tot ?? 0) - b[1]);
    return { now: w.pc ?? 0, earn, spend: Math.max(0, earn - ((w.pc ?? 0) - b[0])) };
  };
  const regs = [...wk.entries()]
    .filter(([, n]) => n >= 3)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 40)
    .map(([v, n]) => {
      const h = homes[v];
      const nm = String(h?.name ?? '').replace(/[<>&]/g, '') || '（沒帳篷）';
      const pc = pcRow(v);
      return `<tr><td>${nm}</td><td>${n} 天</td><td>${players[v]?.streak ?? '-'} 天</td><td>${h?.tent ? (h.plot ? `${zoneName(h.plot.z)} 區 ${h.plot.n} 號` : '有') : '-'}</td><td>${prev.get(v) ?? 0} 天</td><td>${pc.now}</td><td>${pc.earn}</td><td>${pc.spend}</td></tr>`;
    })
    .join('');
  const iaSum = {};
  for (const k of allDays.slice(0, 7)) for (const [ia, n] of Object.entries(stats[k]?.inapp ?? {})) iaSum[ia] = (iaSum[ia] ?? 0) + n;
  const iaNames = { line: 'LINE', ig: 'Instagram', fb: 'Facebook', threads: 'Threads', wechat: '微信', iframe: '嵌在別的網站' };
  const iaLine = Object.keys(iaSum).length
    ? Object.entries(iaSum).sort((a, b) => b[1] - a[1]).map(([ia, n]) => `${iaNames[ia] ?? ia} ${n} 次`).join('・')
    : '還沒有（11/08 之後才開始統計）';
  const onNow = onlineList((hid, name) => escH(name));
  const regTable = `<h3>👥 固定玩家（最近 7 天，不算作者）</h3>
<p>📲 從手機桌面圖示打開的次數（最近 7 天）：${allDays.slice(0, 7).reduce((n, k) => n + (stats[k]?.pwa ?? 0), 0)} 次<br>📱 從 App 內建瀏覽器或嵌入網頁進來的次數：${iaLine}<br><small>這些人常常存不了進度，下次進來會被當成新的人（「只來 1 天」會偏多）。遊戲會跳提示請他們用瀏覽器打開。</small></p>
<p>來 3 天以上（固定玩家）<b>${bw.reg}</b> 人${trend(bw.reg, bp.reg)}・其中 5 天以上（常客）<b>${bw.fan}</b> 人${trend(bw.fan, bp.fan)}・來 2 天 ${bw.two} 人・只來 1 天 ${bw.one} 人<br><small>箭頭是跟再前一週比。名字是帳篷門牌上的名字；沒買帳篷的顯示「（沒帳篷）」。</small></p>
<div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start"><div class="wrap"><table><tr><th>名字</th><th>這週來了</th><th>連續天數</th><th>營位</th><th>上週來了</th><th>🌰 現在有</th><th>這 7 天拿到</th><th>這 7 天花掉</th></tr>${regs || '<tr><td colspan="8">這週還沒有來 3 天以上的玩家</td></tr>'}</table></div>
<div class="wrap"><b style="color:#9fe39f">🟢 現在在線（${onNow.length} 人）</b><small>　打開這頁那一刻，重新整理才更新</small><table><tr><th>名字</th><th>在哪裡</th><th>分流</th><th>第一次來</th><th>營位</th><th>月票</th></tr>${onNow.map((r) => r.row).join('') || '<tr><td colspan="6">現在沒有人在線上</td></tr>'}</table></div></div>`;
  // 🌰 松果存量：常客（這週來 3 天以上）平均手上有幾顆，每天一行，看是不是一直在漲
  const regVids = [...wk.entries()].filter(([, n]) => n >= 3).map(([v]) => v); // wk 已經拿掉作者
  const pcStat = (pcs) => {
    const xs = regVids.map((v) => pcs?.[v]?.[0]).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    if (!xs.length) return null;
    return { n: xs.length, avg: Math.round(xs.reduce((a, x) => a + x, 0) / xs.length), mid: xs[Math.floor(xs.length / 2)], max: xs[xs.length - 1] };
  };
  const pcNow = pcStat(Object.fromEntries(regVids.map((v) => [v, [players[v]?.pc ?? 0]])));
  const pcRows = pcDays.slice(0, 14).map((k) => {
    const r = pcStat(stats[k].pcs);
    return r ? `<tr><td>${k}</td><td>${r.avg}</td><td>${r.mid}</td><td>${r.max}</td><td>${r.n}</td></tr>` : '';
  }).join('');
  const pcTable = `<h3>🌰 松果存量（這週的固定玩家，不算作者）</h3>
<p>現在：平均 <b>${pcNow?.avg ?? '-'}</b> 顆・一半的人有 ${pcNow?.mid ?? '-'} 顆以下・最多 ${pcNow?.max ?? '-'} 顆<br><small>每天第一次記一筆（那天一開始手上有幾顆）。平均一直往上漲＝大家松果花不完，可以考慮加新的東西讓大家花；每個人「這 7 天拿到／花掉」在上面固定玩家表的最右邊。11/23 之後才開始記。</small></p>
<div class="wrap"><table><tr><th>日期</th><th>平均</th><th>一半的人在這以下</th><th>最多</th><th>算了幾人</th></tr>${pcRows || '<tr><td colspan="5">明天開始會有資料</td></tr>'}</table></div>`;
  // 🌱 新手小任務每一步＋👤 新帳號（作者 11/12）
  const acctDay = {};
  for (const a of Object.values(accounts)) if (a.at) acctDay[dayKey(new Date(a.at))] = (acctDay[dayKey(new Date(a.at))] ?? 0) + 1;
  const KID_COLS = [['start', '看到第 1 步'], ['k_fire', '①走到營火'], ['k_sit', '②坐下'], ['k_wood', '③丟木頭'], ['k_roast', '④烤棉花糖'], ['k_fish', '⑤釣魚'], ['k_shop', '⑥看小舖'], ['done', '🎉 做完']];
  const kidRows = allDays.slice(0, 7).map((k) => {
    const kd = stats[k]?.kid ?? {};
    const base = kd.start || 0;
    const cell = (id) => (kd[id] ? `${kd[id]}${base && id !== 'start' ? `<small>（${Math.round((kd[id] / base) * 100)}%）</small>` : ''}` : '-');
    return `<tr><td>${k}</td>${KID_COLS.map(([id]) => `<td>${cell(id)}</td>`).join('')}<td>${acctDay[k] ?? 0}</td></tr>`;
  }).join('');
  const kidTable = `<h3>🌱 新手小任務：每一步走到幾個人（最近 7 天）</h3>
<p><small>第一次來的新朋友，每一步做完算一次（括號是從「看到第 1 步」走到這裡的比例）。哪一步掉最多，就是新朋友卡住的地方。11/12 之後才開始記。</small><br>👤 帳號總數 <b>${Object.keys(accounts).length}</b> 個（最右邊一欄是那天新辦的帳號）</p>
<div class="wrap"><table><tr><th>日期</th>${KID_COLS.map(([, n]) => `<th>${n}</th>`).join('')}<th>👤 新帳號</th></tr>${kidRows}</table></div>`;
  // 🎫 營火月票的收入：這個月（台北時間）付款成功的訂單
  const month = dayKey().slice(0, 7);
  const paidAll = Object.entries(orders).filter(([, o]) => o.status === 'paid' && !o.sim && dayKey(new Date(o.paidAt)).startsWith(month));
  // 🏷️ 自己人（作者 11/15：作者測試、家人買的）不算收入；作者裝置買的自動標，其他的在 /admin 標
  const paid = paidAll.filter(([, o]) => !o.self);
  const selfPaid = paidAll.filter(([, o]) => o.self);
  const revenue = paid.reduce((a, [, o]) => a + o.amt, 0);
  const sumOf = (f) => paid.filter(([, o]) => f(o)).reduce((a, [, o]) => a + o.amt, 0);
  const planOf = (o) => PASS_PLANS[o.plan]?.months ?? 1;
  const nt = (f) => `NT$ ${sumOf(f).toLocaleString()}`;
  // 🌏 國外玩家想買：這個月按了幾次購買（按了「我有台灣的卡，繼續」幾次）
  const fx = Object.entries(stats).filter(([k]) => k.startsWith(month)).reduce((a, [, d]) => [a[0] + (d.foreign ?? 0), a[1] + (d.foreignGo ?? 0)], [0, 0]);
  const split = `🔥 小營火 1 個月 ${nt((o) => o.kind !== 'sponsor' && o.tier !== 'star' && !o.upgrade && planOf(o) === 1)}・3 個月 ${nt((o) => o.kind !== 'sponsor' && o.tier !== 'star' && !o.upgrade && planOf(o) === 3)}・✨ 星空 1 個月 ${nt((o) => o.kind !== 'sponsor' && o.tier === 'star' && !o.upgrade && planOf(o) === 1)}・3 個月 ${nt((o) => o.kind !== 'sponsor' && o.tier === 'star' && !o.upgrade && planOf(o) === 3)}・⬆️ 升級 ${nt((o) => o.upgrade)}・🎁 支持營地 ${nt((o) => o.kind === 'sponsor')}・🌏 國外玩家想買 ${fx[0]} 次（繼續付款 ${fx[1]} 次）`;
  const passTable = `<h3>🎫 月票＋☕ 贊助（${month}）</h3><p class="me">${ECPAY.prod ? '綠界正式模式' : '⚠️ 綠界測試模式（不會真的收錢）'}・這個月玩家買了 ${paid.length} 筆、收入 <b>NT$ ${revenue.toLocaleString()}</b>（${split}）${selfPaid.length ? `・🏷️ 自己人 ${selfPaid.length} 筆 NT$ ${selfPaid.reduce((a, [, o]) => a + o.amt, 0).toLocaleString()}（不算）` : ''}（個人網路銷售服務類大約每月 4 萬元以下，可以先不用辦稅籍，以國稅局最新規定為準）</p>${
    paidAll.length
      ? `<div class="wrap"><table><tr><th>付款時間</th><th>名字</th><th>項目</th><th>金額</th><th>付款方式</th><th>訂單編號</th></tr>${paidAll
          .sort((a, b) => b[1].paidAt - a[1].paidAt)
          .slice(0, 50)
          .map(([no, o]) => `<tr><td>${new Date(o.paidAt).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })}</td><td>${(() => { const now = nameOfVid(o.vid); const was = String(o.name ?? ''); return `${escH(now)}${was && was !== now ? `<br><small style="opacity:.65">付款時叫：${escH(was)}</small>` : ''}<br><small style="opacity:.55">${escH(homeId(o.vid))}</small>`; })()}</td><td>${o.kind === 'sponsor' ? '🎁 支持營地' : o.upgrade ? '⬆️ 升級星空' : `${o.tier === 'star' ? '✨ 星空月票' : '🔥 小營火月票'} ${planOf(o)} 個月`}</td><td>${o.amt}${o.self ? '<br><small>🏷️ 自己人</small>' : ''}</td><td>${o.pay ?? ''}</td><td>${no}</td></tr>`)
          .join('')}</table></div>`
      : ''
  }`;
  // ✨ 小精靈（11/11）：誰在養、養到哪裡（親密度 60 變小精靈、400 長大）
  const KIND_ZH = { light: '✨ 小光點', drop: '💧 水滴', flame: '🔥 火苗', leaf: '🍃 葉子', cloud: '☁️ 雲朵', star: '⭐ 星星', mush: '🍄 蘑菇' };
  const owners = Object.entries(players).flatMap(([v, w]) => {
    if (isAuthorVid(v) || w.author) return []; // 作者自己的不算（作者 11/23）
    const all = [w.spirit, ...(w.spiritBox ?? [])].filter((x) => x && (x.own || x.xp > 0));
    return all.length ? [{ v, w, sp: all[0], n: all.length }] : [];
  });
  const stCount = [0, 0, 0];
  for (const o of owners) stCount[spiritStage(o.sp.xp)]++;
  const spDays = days.slice(0, 7);
  const sumDay = (f) => spDays.reduce((a, k) => a + (stats[k]?.[f] ?? 0), 0);
  const spRows = owners
    .sort((a, b) => b.sp.xp - a.sp.xp)
    .slice(0, 40)
    .map(({ v, w, sp, n }) => {
      const st = spiritStage(sp.xp);
      const kind = st ? (sp.t ?? 'leaf') : 'light';
      const nm = escH(String(homes[v]?.name || w.nm || '').slice(0, 20)) || '（沒名字）';
      return `<tr><td>${nm}</td><td>${escH(String(sp.nm ?? ''))}</td><td>${KIND_ZH[kind] ?? kind}</td><td>${['光點', '小精靈', '長大'][st]}</td><td>${Math.floor(sp.xp)}</td><td>${n}</td></tr>`;
    })
    .join('');
  const spiritTable = `<h3>✨ 小精靈</h3><p class="me">養小精靈的玩家 <b>${owners.length}</b> 人・還是光點 ${stCount[0]}・<b>變成小精靈（親密度 60 以上）${stCount[1] + stCount[2]}</b>・長大（400 以上）${stCount[2]}<br>最近 7 天：買第一顆蛋 ${sumDay('spiritFirst')} 次・買孵蛋器 ${sumDay('spiritEgg')} 次・孵出來 ${sumDay('spiritHatch')} 隻・變成小精靈 ${sumDay('spirit1')} 次・長大 ${sumDay('spirit2')} 次・換樣子 ${sumDay('spiritForm')} 次</p>
<div class="wrap"><table><tr><th>玩家</th><th>小精靈名字</th><th>種類</th><th>階段</th><th>親密度</th><th>養了幾隻</th></tr>${spRows || '<tr><td colspan="6">還沒有人養</td></tr>'}</table></div>`;
  // 「其他網站」是哪些網站（最近 7 天，打開網頁的次數）
  const LANG_ZH = { zh: '中文', en: '英文', ja: '日文', ko: '韓文', th: '泰文', vi: '越南文', id: '印尼文', ms: '馬來文', fr: '法文', de: '德文', es: '西班牙文', pt: '葡萄牙文', ru: '俄文', '?': '不知道' };
  const otherAll = {};
  for (const k of srcDays) for (const [h, n] of Object.entries(stats[k]?.otherRef ?? {})) otherAll[h] = (otherAll[h] ?? 0) + n;
  const otherList = Object.entries(otherAll).sort((x, y) => y[1] - x[1]).slice(0, 20);
  const otherTable = otherList.length ? `<p class="me">🌐 「其他網站」細分（最近 7 天）：${otherList.map(([h, n]) => `${h.replace(/[<>&]/g, '')} ${n}`).join('・')}</p>` : '';
  const srcTable = `<h3>📍 來源（最近 7 天）</h3><div class="wrap"><table><tr><th>來源</th><th>打開網頁</th><th>載入完成前就離開</th><th>進來次數</th><th>新旅人</th><th>30秒內離開</th><th>平均停留</th><th>隔天又回來</th><th>語言（打開網頁）</th></tr>${
    srcRows
      .sort((x, y) => y.v - x.v)
      .map((a) => {
        const avg = a.ss ? Math.round(a.sec / a.ss) : 0;
        return `<tr><td>${a.zh}</td><td>${a.hits || '-'}</td><td>${a.hits ? p100(Math.max(0, a.hits - a.loaded), a.hits) : '-'}</td><td>${a.v}</td><td>${a.n}</td><td>${p100(a.s30, a.ss)}</td><td>${Math.floor(avg / 60)}分${avg % 60}秒</td><td>${p100(a.d1, a.nOld)}</td><td style="text-align:left">${Object.entries(a.lang).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([lg, n]) => `${LANG_ZH[lg] ?? lg} ${n}`).join('・') || '-'}</td></tr>`;
      })
      .join('') || '<tr><td colspan="9">還沒有資料（這版上線後才開始記）</td></tr>'
  }</table></div>${otherTable}<p>「打開網頁」是網頁一打開就記一次（還沒載入遊戲）；「載入完成前就離開」＝打開網頁但沒等到遊戲畫面就走了，如果很高，代表 30 秒流失是卡在載入。「隔天又回來」＝第一次來的人，隔天又進來的比例（今天的還沒算）。來源是看玩家從哪個網站點過來；Threads、IG 的 App 常常不告訴網站從哪裡來，會算進「直接進來」，貼連結時可以在網址後面加 <code>?src=threads</code>。</p>`;
  const online = [...channels.values()].reduce((n, c) => n + chCount(c), 0);
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>營地統計</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px}h3{color:#ffb46b;margin-top:28px}code{background:#2a211c;padding:1px 5px;border-radius:4px}table{border-collapse:collapse;font-size:13px}th,td{padding:6px 9px;border-bottom:1px solid #3a2e27;text-align:right;white-space:nowrap}th{color:#ffb46b;position:sticky;top:0;background:#1d1714}td:first-child,th:first-child{text-align:left}.wrap{overflow-x:auto}p{opacity:.75;font-size:13px}.me{opacity:1;padding:8px 12px;border-radius:10px;background:#2a211c;display:inline-block}.me button{margin-left:6px;padding:4px 10px;border:none;border-radius:999px;background:#f08a3c;color:#2a1608;font-weight:700;cursor:pointer}.me small{opacity:.7}</style></head>
<body>${staffNav(req, 'stats')}<h2>🔥 營地統計</h2>
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
</script>
<p class="me">⭐ 作者專用：<button id="author-btn" type="button">這台裝置是作者</button> <span id="author-st">${campMeta.author ? '（已經設定過）' : ''}</span><br><small>用你平常玩的瀏覽器（有登入帳號的話登入著）打開這頁按一次。你的帳篷會搬到帳篷營地 A 區 1 號（你之後想搬走也可以，跟大家一樣）。</small></p>
<script>
(function () {
  var btn = document.getElementById('author-btn'), st = document.getElementById('author-st');
  btn.onclick = function () {
    var vid = ''; try { vid = localStorage.getItem('cozy-campfire-vid') || ''; } catch (e) {}
    if (!vid) { st.textContent = '這台裝置還沒玩過遊戲，先進遊戲一次再回來按'; return; }
    btn.disabled = true; st.textContent = '處理中⋯';
    fetch('/api/setAuthor' + location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: vid }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { st.textContent = r.ok ? (r.tent ? (r.plot && r.plot.z === 0 && r.plot.n === 1 ? '✅ 設定好了：你的帳篷在 A 區 1 號' : '✅ 設定好了') : '✅ 設定好了：買帳篷後會在 A 區 1 號') : '❌ ' + (r.reason || '失敗'); btn.disabled = false; })
      .catch(function () { st.textContent = '❌ 連不到伺服器'; btn.disabled = false; });
  };
})();
</script>
<p class="me">🎁 作者專用：<button id="all-btn" type="button">這台裝置拿到全部造型</button> <span id="all-st"></span><br><small>用你平常玩的那個瀏覽器打開這頁再按（有登入帳號的話，就送到那個帳號）。會拿到全部造型（每日、每週、營火之約、淨灘、贊助假髮）和分享禮物家具。按完回遊戲重新整理就看得到。</small></p>
<script>
(function () {
  var btn = document.getElementById('all-btn'), st = document.getElementById('all-st');
  btn.onclick = function () {
    var vid = ''; try { vid = localStorage.getItem('cozy-campfire-vid') || ''; } catch (e) {}
    if (!vid) { st.textContent = '這台裝置還沒玩過遊戲，先進遊戲一次再回來按'; return; }
    btn.disabled = true; st.textContent = '處理中⋯';
    fetch('/api/allOutfits' + location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: vid }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { st.textContent = r.ok ? '✅ 新拿到 ' + r.outfits + ' 款造型、' + r.gifts + ' 件禮物家具（回遊戲重新整理）' : '❌ ' + (r.reason || '失敗'); btn.disabled = false; })
      .catch(function () { st.textContent = '❌ 連不到伺服器'; btn.disabled = false; });
  };
})();
</script><p>伺服器已經連續醒著 <b>${awakeText()}</b>（從 ${new Date(BOOT_AT).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })} 起；正常只有重新部署時才會歸零，如果常常歸零，代表定時叫醒沒有生效、伺服器睡著過）</p><p>現在在線：${online} 人（名單在下面「👥 固定玩家」右邊）· 時區 ${STATS_TZ} · 只統計數字，不記錄個人資料。「30秒內離開」越低越好；「新旅人」是第一次來的人（從 11/3 開始統計）。</p>
<div class="wrap"><table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="${head.length}">還沒有資料</td></tr>'}</table></div>${regTable}${pcTable}${kidTable}${srcTable}${passTable}${spiritTable}</body></html>`);
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
  if (field === 'hitSrc') {
    // 📍 細分（11/11）：「其他網站」記真正的網域；每個來源記語言（只記網域和語言的前兩碼，不記個人資料）
    if (src === 'other') {
      const host = (q('r') || q('src') || '?').toLowerCase().replace(/[^a-z0-9.\-_]/g, '').slice(0, 50) || '?';
      d.otherRef ??= {};
      if (d.otherRef[host] != null || Object.keys(d.otherRef).length < 80) d.otherRef[host] = (d.otherRef[host] ?? 0) + 1;
    }
    const lg = q('l').toLowerCase().slice(0, 2).replace(/[^a-z]/g, '') || '?';
    d.langSrc ??= {};
    d.langSrc[src] ??= {};
    d.langSrc[src][lg] = (d.langSrc[src][lg] ?? 0) + 1;
  }
  saveJson('stats.json', stats);
});

// 🎁 作者專用：這台裝置（vid）拿到全部造型＋分享禮物家具（從 /stats 的按鈕呼叫，要 STATS_KEY）
// 不用名字判斷（別人改同名就能拿），只認 /stats 頁面送來的這台裝置代號
// ⭐ 作者專用：這台裝置（vid）是作者 → 帳篷固定在 A 區 1 號（從 /stats 的按鈕呼叫，要 STATS_KEY）
app.post('/api/setAuthor', express.json(), (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = String(req.body?.vid ?? '').slice(0, 24);
  if (!players[vid]) return res.json({ ok: false, reason: '找不到這台裝置的存檔，先進遊戲一次' });
  const old = campMeta.author;
  campMeta.author = vid;
  saveCamp();
  // 作者的帳篷搬到 A 區 1 號（那格空著才搬；之後作者想搬走也可以，跟大家一樣）
  if (homes[vid]?.tent && !takenPlots().has('0:1')) homes[vid].plot = { z: 0, n: 1 };
  saveJson('homes.json', homes);
  res.json({ ok: true, tent: !!homes[vid]?.tent, plot: homes[vid]?.plot ?? null });
});
app.post('/api/allOutfits', express.json(), (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = String(req.body?.vid ?? '').slice(0, 24);
  const w = players[vid];
  if (!w) return res.json({ ok: false, reason: '找不到這台裝置的存檔，先進遊戲一次' });
  w.outfits ??= [];
  let n = 0;
  for (const o of OUTFITS) {
    if (!o?.id || w.outfits.includes(o.id)) continue;
    w.outfits.push(o.id);
    n++;
  }
  syncRack(vid);
  saveJson('players.json', players);
  let g = 0;
  for (const id of ['postcard', ...REF_TIERS.map(([, gid]) => gid)]) if (grantGift(vid, id)) g++;
  for (const so of io.sockets.sockets.values()) if (so.data.vid === vid) so.emit('outfitGift', { id: null, why: 'all', outfits: w.outfits });
  console.log(`[作者] ${vid} 拿到全部造型：新增 ${n} 款、禮物 ${g} 件`);
  res.json({ ok: true, outfits: n, gifts: g });
});

// 🛠️ 營地管理：/admin（要 STATS_KEY）—— 查玩家（用玩家編號或帳號，不用暱稱）、發補償、看邀請紀錄
const keyOk = (req) => !process.env.STATS_KEY || req.query.key === process.env.STATS_KEY;
const escH = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** 🧭 後台三頁（統計、管理、玩家建議）最上面共用的切換按鈕（作者 11/17） */
const staffNav = (req, at) => {
  const k = req.query.key ? `?key=${encodeURIComponent(req.query.key)}` : '';
  const b = (id, href, label) => `<a href="${href}${k}" style="display:inline-block;padding:6px 14px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700;${id === at ? 'background:#ff9a4a;color:#2a1a10' : 'background:#2c231e;color:#f5e6d3;border:1px solid #4a3a30'}">${label}</a>`;
  return `<nav style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px">${b('stats', '/stats', '📊 玩家統計')}${b('admin', '/admin', '🛠️ 營地管理')}${b('ideas', '/ideas', `💡 玩家建議（${ideas.length}）`)}</nav>`;
};
/** 玩家編號（例：RcdNgX-AF8qD）或帳號名稱 → vid */
function findVid(q) {
  q = String(q ?? '').trim();
  if (!q) return null;
  const a = accounts[q.toLowerCase()];
  if (a?.vid && players[a.vid]) return a.vid;
  const v = vidOfCode(q);
  return v && players[v] ? v : null;
}
/** 🔍 用暱稱找（作者 11/16：看到奇怪的人只知道名字）：完全一樣的優先，再來是包含；在線的排前面，最多 20 個 */
function findByName(q) {
  q = String(q ?? '').trim().toLowerCase();
  if (!q) return [];
  const on = new Set([...io.sockets.sockets.values()].map((s) => s.data.vid).filter(Boolean));
  const hit = [];
  const seen = new Set();
  // 在線上的人用他現在頭上的名字（有些人的名字還沒存進存檔）
  for (const c of channels.values()) {
    for (const r of c.rooms.values()) {
      for (const p of r.players.values()) {
        const n = String(p.name ?? '').toLowerCase();
        if (p.vid && players[p.vid] && !seen.has(p.vid) && (n === q || n.includes(q))) seen.add(p.vid), hit.push({ vid: p.vid, exact: n === q, on: true, nm: p.name });
      }
    }
  }
  for (const vid of Object.keys(players)) {
    if (seen.has(vid)) continue;
    const n = String(nameOfVid(vid)).toLowerCase();
    if (n === q || n.includes(q)) hit.push({ vid, exact: n === q, on: on.has(vid) });
    else if ((players[vid].nh ?? []).some((x) => String(x.from).toLowerCase().includes(q))) hit.push({ vid, exact: false, on: on.has(vid), old: true });
  }
  hit.sort((a, b) => b.on - a.on || b.exact - a.exact);
  return hit.slice(0, 20).map((h) => ({ hid: homeId(h.vid), name: (h.nm ?? nameOfVid(h.vid)) + (h.old ? '（以前用過這個名字）' : ''), on: h.on, first: players[h.vid]?.fd ?? '' }));
}
const playerCard = (vid) => {
  const w = players[vid];
  const hid = homeId(vid);
  const byVid = w.by ? vidOfCode(w.by) : null;
  return {
    hid,
    name: nameOfVid(vid),
    account: acctOfVid(vid),
    first: w.fd ?? '',
    pc: w.pc ?? 0,
    outfits: (w.outfits ?? []).length,
    refs: w.refs ?? 0,
    by: w.by ? `${w.by}（${byVid ? nameOfVid(byVid) : '?'}）` : '',
    tent: !!homes[vid]?.tent,
    ban: banOf(vid) ?? null,
    netBan: Object.values(bans.n).some((b) => b.vid === vid && (!b.until || b.until > Date.now())),
    warns: (w.warns ?? []).slice(-10).reverse(),
    author: !!w.author,
    names: (w.nh ?? []).slice(-30).reverse(),
    chats: chatLog.filter((c) => c.hid === hid).slice(-60).reverse(),
    log: invites.filter((x) => x.ref === hid || x.friend === hid).slice(-30).reverse(),
  };
};
app.get('/api/lookup', (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.query.q);
  if (!vid) {
    const list = findByName(req.query.q);
    if (list.length === 1) return res.json({ ok: true, ...playerCard(vidOfCode(list[0].hid)) });
    if (list.length) return res.json({ ok: false, list, reason: `有 ${list.length} 個人叫這個名字，點一個查看` });
    return res.json({ ok: false, reason: '找不到：可以用名字、玩家編號或帳號名稱找' });
  }
  res.json({ ok: true, ...playerCard(vid) });
});
/** 🗑️ 刪掉一張留言／繪馬（作者 11/16：有人在留言板亂寫作者的事）：{ kind: 'notes'|'wishes', at } */
app.post('/api/delNote', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const kind = req.body?.kind === 'wishes' ? 'wishes' : 'notes';
  const at = Number(req.body?.at);
  const before = shared[kind].length;
  shared[kind] = shared[kind].filter((x) => x.at !== at);
  if (shared[kind].length === before) return res.json({ ok: false, reason: '找不到（可能已經刪了）' });
  saveJson(`${kind}.json`, shared[kind]);
  if (kind === 'notes') emitAllChannels('forest_main', 'notes', { notes: recent(shared.notes, MAX_NOTES) });
  else emitAllChannels('forest_main', 'wishes', { wishes: recent(shared.wishes, MAX_WISHES) });
  console.log(`[管理] 刪掉一張${kind === 'notes' ? '留言' : '繪馬'}`);
  res.json({ ok: true });
});
/** 🍾 漂流瓶：刪掉、放回去（作者 11/23）{ op: 'del'|'show', k } */
app.post('/api/bottle', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const i = bottles.findIndex((b) => b.k === Number(req.body?.k));
  if (i < 0) return res.json({ ok: false, reason: '找不到（可能已經刪了）' });
  if (req.body?.op === 'del') bottles.splice(i, 1);
  else Object.assign(bottles[i], { hidden: false, rep: [] });
  saveBottles();
  console.log(`[管理] 漂流瓶 ${req.body?.op === 'del' ? '刪掉' : '放回去'} 一封`);
  res.json({ ok: true });
});
/** ⚠️ 警告（作者 11/18）：玩家畫面跳警告視窗（5 秒後才能關）。在線上馬上跳，不在線上下次進來跳。{ q: 玩家編號, r: 原因代號, note: 其他原因的文字 } */
const WARN_REASONS = { curse: '罵人、說髒話', note: '亂留言', name: '名字不恰當', spam: '洗版、一直刷聊天', other: '其他' };
app.post('/api/warn', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.body?.q);
  if (!vid || !players[vid]) return res.json({ ok: false, reason: '找不到這個玩家' });
  const r = WARN_REASONS[req.body?.r] ? req.body.r : 'other';
  const note = String(req.body?.note ?? '').trim().slice(0, 60);
  if (r === 'other' && !note) return res.json({ ok: false, reason: '選「其他」要寫原因' });
  const w = players[vid];
  const warn = { at: Date.now(), r, note, sc: !!req.body?.sc };
  (w.warns ??= []).push(warn);
  if (w.warns.length > 30) w.warns.splice(0, w.warns.length - 30);
  w.warnPending = warn;
  saveJson('players.json', players);
  for (const so of socketsOf(vid)) so.emit('warned', warn);
  console.log(`[管理] 警告 ${nameOfVid(vid)}（${WARN_REASONS[r]}${note ? `：${note}` : ''}）第 ${w.warns.length} 次`);
  res.json({ ok: true, ...playerCard(vid) });
});

/** 📢 全營地公告（作者 11/23）：{ tpl } 套版，或 { text } 自己打字。所有人畫面上方跳出來、聊天紀錄也有；10 分鐘內才進來的人進來時也看得到 */
let lastAnnounce = null;
const announces = []; // 最近 30 則（記憶體，伺服器重開清空）
app.post('/api/announce', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const tpl = ANNOUNCE_TPL[req.body?.tpl] ? req.body.tpl : '';
  const text = tpl ? '' : String(req.body?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, ANNOUNCE_MAX);
  if (!tpl && !text) return res.json({ ok: false, reason: '選一個套版，或自己打字' });
  const m = { tpl, text, at: Date.now() };
  lastAnnounce = m;
  announces.push(m);
  if (announces.length > 30) announces.shift();
  io.emit('announce', m);
  console.log(`[公告] ${tpl ? ANNOUNCE_TPL[tpl] : text}（在線 ${io.engine.clientsCount} 個連線）`);
  res.json({ ok: true, online: io.engine.clientsCount });
});

/** 🪄 作者標誌（作者 11/22）：{ q } 切換；名字前面變 🪄（頭上、聊天、大聲公），蓋過月票的 🔥／✨ */
app.post('/api/author', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.body?.q);
  if (!vid || !players[vid]) return res.json({ ok: false, reason: '找不到這個玩家' });
  const w = players[vid];
  if (w.author) delete w.author;
  else w.author = true;
  saveJson('players.json', players);
  console.log(`[管理] ${w.author ? '標成作者' : '取消作者'} ${nameOfVid(vid)}`);
  res.json({ ok: true, ...playerCard(vid) });
});

/** ⛔ 停權／🔇 禁言／✅ 解除（作者 11/16）：{ q: 玩家編號, t: 'ban'|'mute'|'clear', days（0＝永久）, net（停權時連同他現在的網路一起擋）, note } */
app.post('/api/ban', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.body?.q);
  if (!vid) return res.json({ ok: false, reason: '找不到這個玩家' });
  const t = req.body?.t;
  const name = nameOfVid(vid);
  const socks = [...io.sockets.sockets.values()].filter((s) => s.data.vid === vid);
  if (t === 'clear') {
    delete bans.v[vid];
    for (const [k, b] of Object.entries(bans.n)) if (b.vid === vid) delete bans.n[k];
    for (const s of socks) s.emit('muted', { until: -1 });
    saveJson('bans.json', bans);
    console.log(`[管理] 解除 ${name}`);
    return res.json({ ok: true, ...playerCard(vid) });
  }
  if (t !== 'ban' && t !== 'mute') return res.json({ ok: false, reason: '種類不對' });
  const days = Math.max(0, Math.min(3650, Number(req.body?.days) || 0));
  const until = days ? Date.now() + days * 86400000 : 0;
  bans.v[vid] = { t, until, at: Date.now(), note: String(req.body?.note ?? '').slice(0, 100), name };
  if (t === 'ban') {
    if (req.body?.net) for (const s of socks) if (s.data.netKey) bans.n[s.data.netKey] = { until, vid, at: Date.now() };
    for (const s of socks) {
      s.emit('banned', { until });
      setTimeout(() => s.disconnect(true), 800);
    }
  } else for (const s of socks) s.emit('muted', { until });
  saveJson('bans.json', bans);
  console.log(`[管理] ${t === 'ban' ? '停權' : '禁言'} ${name}（${days ? `${days} 天` : '永久'}）${req.body?.net ? '＋網路' : ''}`);
  res.json({ ok: true, ...playerCard(vid) });
});
/** 🏷️ 標成自己人／取消（作者 11/15）：作者測試、家人買的訂單不算進 /stats 收入 */
app.post('/api/selfOrder', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const no = String(req.body?.no ?? '').trim();
  const o = orders[no];
  if (!o) return res.json({ ok: false, reason: '找不到這個訂單編號' });
  if (o.self) delete o.self;
  else o.self = 1;
  saveJson('orders.json', orders);
  res.json({ ok: true, self: !!o.self, name: nameOfVid(o.vid), amt: o.amt });
});
app.post('/api/refund', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  res.json(refundOrder(String(req.body?.no ?? '').trim()));
});
app.post('/api/grant', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.body?.q);
  if (!vid) return res.json({ ok: false, reason: '找不到這位玩家' });
  const type = String(req.body?.type ?? '');
  const id = String(req.body?.id ?? '');
  const note = String(req.body?.note ?? '').slice(0, 80);
  let what = '';
  if (type === 'outfit') {
    const o = OUTFIT_BY_ID[id];
    if (!o) return res.json({ ok: false, reason: '沒有這款造型' });
    if (!grantOutfit(vid, id, 'staff')) return res.json({ ok: false, reason: '他已經有這款造型了' });
    what = `👒 ${o.zh}`;
  } else if (type === 'pc') {
    const n = Math.floor(Number(req.body?.n) || 0);
    if (n < 1 || n > 1000) return res.json({ ok: false, reason: '松果要 1～1000 顆' });
    giveTo(vid, n, 'staff');
    what = `🌰 ${n} 顆松果`;
  } else if (type === 'furn') {
    const f = CATALOG_BY_ID[id];
    if (!f || id === 'tent') return res.json({ ok: false, reason: '沒有這件家具' });
    const h = (homes[vid] ??= newHome());
    if (GIFT_FURNITURE.has(id)) {
      // 分享禮物家具（狐狸提燈、彩虹、星空望遠鏡⋯）：照禮物的方式送，之後邀請滿人數就不會再送一次
      if (!grantGift(vid, id)) return res.json({ ok: false, reason: '他已經拿過這件禮物家具了' });
    } else {
      h.inv[id] = (h.inv[id] ?? 0) + 1;
      saveJson('homes.json', homes);
      for (const so of io.sockets.sockets.values()) if (so.data.vid === vid) so.emit('staffGift', { kind: 'furn', id, home: publicHome(h) });
    }
    what = `🪑 ${f.zh}`;
  } else return res.json({ ok: false, reason: '不知道要送什麼' });
  grants.push({ at: Date.now(), hid: homeId(vid), name: nameOfVid(vid), what, note });
  if (grants.length > 300) grants.splice(0, grants.length - 300);
  saveJson('grants.json', grants);
  console.log(`[補償] ${homeId(vid)}（${nameOfVid(vid)}）${what} ${note}`);
  res.json({ ok: true, what, card: playerCard(vid) });
});
/** ➖ 收回（作者 11/18）：把送給玩家的松果、造型、家具要回來。松果最多扣到 0；家具擺在家裡的也會拿掉。紀錄放在補償紀錄裡 */
app.post('/api/take', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const vid = findVid(req.body?.q);
  const w = vid && players[vid];
  if (!w) return res.json({ ok: false, reason: '找不到這位玩家' });
  const type = String(req.body?.type ?? '');
  const id = String(req.body?.id ?? '');
  const note = String(req.body?.note ?? '').slice(0, 80);
  let what = '';
  if (type === 'pc') {
    const n = Math.floor(Number(req.body?.n) || 0);
    if (n < 1 || n > 1000000) return res.json({ ok: false, reason: '松果要填 1 顆以上' });
    const took = Math.min(n, Math.max(0, w.pc ?? 0));
    if (!took) return res.json({ ok: false, reason: '他現在沒有松果了' });
    w.pc -= took;
    saveJson('players.json', players);
    for (const so of socketsOf(vid)) so.emit('wallet', { pc: w.pc, delta: -took, reason: 'staff' });
    what = `🌰 ${took} 顆松果${took < n ? `（他只剩 ${took} 顆，要收 ${n} 顆）` : ''}`;
  } else if (type === 'outfit') {
    if (!w.outfits?.includes(id)) return res.json({ ok: false, reason: '他沒有這款造型' });
    w.outfits = w.outfits.filter((x) => x !== id);
    for (const [slot, oid] of Object.entries(w.wear ?? {})) if (oid === id) delete w.wear[slot];
    syncRack(vid);
    saveJson('players.json', players);
    what = `👒 ${OUTFIT_BY_ID[id]?.zh ?? id}`;
  } else if (type === 'furn') {
    const h = homes[vid];
    if (!h?.inv?.[id]) return res.json({ ok: false, reason: '他沒有這件家具' });
    if (available(h, id, 0) <= 0) {
      const i = h.items.findIndex((x) => x.i === id);
      if (i >= 0) h.items.splice(i, 1);
    }
    h.inv[id] -= 1;
    if (h.inv[id] <= 0) delete h.inv[id];
    saveJson('homes.json', homes);
    what = `🪑 ${CATALOG_BY_ID[id]?.zh ?? id}`;
  } else return res.json({ ok: false, reason: '不知道要收回什麼' });
  grants.push({ at: Date.now(), hid: homeId(vid), name: nameOfVid(vid), what: `➖ 收回 ${what}`, note });
  if (grants.length > 300) grants.splice(0, grants.length - 300);
  saveJson('grants.json', grants);
  console.log(`[收回] ${homeId(vid)}（${nameOfVid(vid)}）${what} ${note}`);
  res.json({ ok: true, what, card: playerCard(vid) });
});
app.post('/api/supportReply', express.json(), (req, res) => {
  if (!keyOk(req)) return res.status(403).json({ ok: false, reason: '密碼不對' });
  const x = support.find((m) => m.id === String(req.body?.id ?? ''));
  const text = String(req.body?.text ?? '').trim().slice(0, 500);
  if (!x || !text) return res.json({ ok: false, reason: '找不到這則或回覆是空的' });
  x.re = text;
  x.reAt = Date.now();
  x.seen = false;
  saveJson('support.json', support);
  for (const so of socketsOf(x.vid)) so.emit('supportReply', { t: text });
  pushBadge(x.vid);
  res.json({ ok: true });
});
app.get('/admin', (req, res) => {
  if (!keyOk(req)) return res.status(403).send('需要密碼：/admin?key=…');
  const t = (at) => new Date(at).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false });
  const outfitOpts = OUTFITS.filter((o) => o?.id).map((o) => `<option value="${o.id}">${o.icon} ${escH(o.zh)}（${o.src ?? ''}）</option>`).join('');
  const furnOpts = Object.values(CATALOG_BY_ID).filter((f) => f.id !== 'tent').map((f) => `<option value="${f.id}">${f.icon ?? ''} ${escH(f.zh)}</option>`).join('');
  const invRows = invites.slice(-200).reverse().map((x) => `<tr><td>${t(x.at)}</td><td>${KIND_ZH[x.kind] ?? x.kind}</td><td><a href="#" data-q="${escH(x.ref)}">${escH(x.rn)}</a><br><small>${escH(x.ref)}</small></td><td><a href="#" data-q="${escH(x.friend)}">${escH(x.fn)}</a><br><small>${escH(x.friend)}</small></td><td>${x.net ? '🏢 同網路' : ''}</td><td style="text-align:left">${escH(x.r)}</td></tr>`).join('');
  const supRows = support.slice(-100).reverse().map((x) => `<tr><td>${t(x.at)}</td><td><a href="#" data-q="${escH(x.hid)}">${escH(x.name)}</a><br><small>${escH(x.hid)}</small></td><td style="white-space:pre-wrap;max-width:360px">${escH(x.t)}</td><td>${x.re ? `<div class="re">${escH(x.re)}</div><small>${t(x.reAt)}${x.seen ? '・玩家看過了' : '・玩家還沒看'}</small>` : `<textarea data-re="${x.id}" rows="2" cols="34" placeholder="回覆（玩家下次上線會看到）"></textarea><br><button data-send="${x.id}">回覆</button>`}</td></tr>`).join('');
  const onRows = onlineList((hid, name) => `<a href="#" data-q="${escH(hid)}">${escH(name)}</a>`);
  const chatRows = chatLog.slice(-600).reverse().map((c) => `<tr><td>${t(c.at)}</td><td>${escH(c.where)}${c.ch ? ` <small>分流 ${c.ch}</small>` : ''}</td><td>${c.hid ? `<a href="#" data-q="${escH(c.hid)}">${escH(c.name)}</a>` : escH(c.name)}</td><td style="text-align:left">${escH(c.text)}</td></tr>`).join('');
  // 🌐 11/23 作者：別國語言的漂流瓶可以翻成中文看（有日文假名、韓文、俄文，或幾乎沒有中文字）
  const foreignText = (x) => /[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/.test(x) || !/[\u4e00-\u9fff]/.test(x) && /[a-zA-Z]{2,}/.test(x);
  const bottleRows = bottles
    .slice(-150)
    .reverse()
    .map((x) => `<tr${x.hidden ? ' style="opacity:.55"' : ''}><td>${t(x.at)}</td><td><a href="#" data-q="${escH(homeId(x.v))}">${escH(x.name)}</a></td><td style="text-align:left">${escH(x.text)}${foreignText(x.text) ? ` <button data-tr="${escH(x.text)}" title="翻成中文">🌐</button>` : ''}</td><td>💗${x.hearts ?? 0}・被撈 ${x.read ?? 0}${x.rep?.length ? `・🚩${x.rep.length}` : ''}${x.hidden ? '<br>（收起來了）' : ''}</td><td>${x.hidden ? `<button data-btl="show:${x.k}">👀 放回去</button>` : ''}<button data-btl="del:${x.k}">🗑️ 刪掉</button></td></tr>`)
    .join('');
  const noteRow = (kind) => (x) => `<tr><td>${t(x.at)}</td><td>${x.hid ? `<a href="#" data-q="${escH(x.hid)}">${escH(x.name)}</a>` : `<a href="#" data-q="${escH(x.name)}">${escH(x.name)}</a>`}</td><td style="text-align:left">${escH(x.text)}</td><td><button data-del="${kind}:${x.at}">🗑️ 刪掉</button></td></tr>`;
  const noteRows = shared.notes.slice(-60).reverse().map(noteRow('notes')).join('');
  const wishRows = shared.wishes.slice(-30).reverse().map(noteRow('wishes')).join('');
  const banRows = Object.entries(bans.v).filter(([, b]) => !b.until || b.until > Date.now()).map(([vid, b]) => `<tr><td><a href="#" data-q="${escH(homeId(vid))}">${escH(nameOfVid(vid))}</a><br><small>${escH(homeId(vid))}</small></td><td>${b.t === 'ban' ? '⛔ 停權' : '🔇 禁言'}</td><td>${b.until ? t(b.until) : '永久'}</td><td style="text-align:left">${escH(b.note ?? '')}</td></tr>`).join('');
  const grantRows = grants.slice(-50).reverse().map((g) => `<tr><td>${t(g.at)}</td><td>${escH(g.name)}<br><small>${escH(g.hid)}</small></td><td>${escH(g.what)}</td><td style="text-align:left">${escH(g.note)}</td></tr>`).join('');
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>營地管理</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px;max-width:1100px;margin:auto}.tabs{position:sticky;top:0;z-index:5;background:#1d1714;padding:8px 0;display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid #3a2e27;margin:10px 0}.tabs button{background:#2c231e;color:#f5e6d3;border:1px solid #4a3a30;border-radius:999px;padding:6px 12px;font-size:14px;cursor:pointer}.tabs button.on{background:#ff9a4a;color:#2a1a10;border-color:#ff9a4a;font-weight:700}section.tab{display:none}section.tab.on{display:block}section.tab h3{margin-top:8px}h3{color:#ffb46b;margin-top:26px}table{border-collapse:collapse;font-size:13px;width:100%}th,td{padding:6px 8px;border-bottom:1px solid #3a2e27;text-align:left;vertical-align:top}th{color:#ffb46b}small{opacity:.6}.wrap{overflow-x:auto}.box{background:#2a211c;border-radius:12px;padding:12px 14px;margin:8px 0}input,select,button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #4a3b31;background:#1d1714;color:#f5e6d3}button{background:#f08a3c;color:#2a1608;border:none;font-weight:700;cursor:pointer}a{color:#ffd08a}#card p{margin:4px 0}.ok{color:#9be29b}.err{color:#ff9a8a}p.hint{opacity:.7;font-size:13px}.re{background:#3a2e27;border-radius:8px;padding:6px 8px;white-space:pre-wrap;max-width:360px}textarea{font:inherit;border-radius:8px;border:1px solid #4a3b31;background:#1d1714;color:#f5e6d3;padding:6px}</style></head>
<body>${staffNav(req, 'admin')}<h2>🛠️ 營地管理</h2><p class="hint">可以用名字、「玩家編號」或「帳號名稱」找人（名字大家會改，同名的會列出來讓你選；編號不會變，最準）。玩家用遊戲裡「✉️ 聯絡作者」寄信時會自動附上玩家編號；編號也顯示在「🔥 約朋友」和「👫 好友」視窗裡。</p>
<div class="tabs">${[['on', `🟢 現在在線（${onRows.length}）`], ['chat', `💬 聊天（${Math.min(chatLog.length, 600)}）`], ['notes', `📝 留言板・繪馬・🍾 漂流瓶${bottles.some((b) => b.hidden && b.rep?.length) ? `（🚩${bottles.filter((b) => b.hidden && b.rep?.length).length}）` : ''}`], ['mail', `✉️ 來信${support.filter((x) => !x.re).length ? `（${support.filter((x) => !x.re).length} 則沒回）` : ''}`], ['inv', '👫 邀請紀錄'], ['shout', '📣 大聲公'], ['ban', `⛔ 停權／禁言${banRows ? `（${banRows.split('<tr>').length - 1}）` : ''}`], ['grant', '🎁 補償紀錄'], ['money', '💸 退款・自己人']].map(([k, v]) => `<button type="button" data-tab="${k}">${v}</button>`).join('')}</div>
<div class="box"><b>🔍 查玩家</b><br><input id="q" placeholder="名字、玩家編號 或 帳號名稱" size="28"> <button id="find">查詢</button><div id="card"></div></div>
<div class="box"><b>📢 全營地公告</b> <small>（所有分流、所有地方的人畫面上方跳出 15 秒，聊天紀錄也有；之後 10 分鐘內才進來的人也看得到。套版會照玩家的語言顯示，自己打的字會自動翻譯給外國玩家）</small><br>${Object.entries(ANNOUNCE_TPL).map(([k, v]) => `<button type="button" data-atpl="${k}" style="margin:3px 4px 3px 0">${escH(v)}</button>`).join('')}<br><input id="atext" maxlength="${ANNOUNCE_MAX}" size="56" placeholder="點上面的套版，或自己打字（最多 ${ANNOUNCE_MAX} 字）"> <button id="asend">📢 發公告</button> <span id="ares"></span>${announces.length ? `<div style="margin-top:6px;font-size:13px;color:#bba">最近發過：${announces.slice(-5).reverse().map((a) => `<br>${new Date(a.at).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })}　${escH(a.tpl ? ANNOUNCE_TPL[a.tpl] : a.text)}`).join('')}</div>` : ''}</div>
<div class="box" id="gbox" hidden><b>🎁 發補償／收回：<span id="gname"></span></b><br>
<select id="gtype"><option value="outfit">👒 造型</option><option value="pc">🌰 松果</option><option value="furn">🪑 家具</option></select>
<select id="gout">${outfitOpts}</select><select id="gfurn" hidden>${furnOpts}</select><input id="gn" type="number" min="1" value="10" hidden>
<input id="gnote" placeholder="備註（例：同網路沒算到的邀請補發）" size="30"> <button id="give">送出</button> <button id="take" class="ghost">➖ 收回</button> <span id="gmsg"></span><div class="hint">「➖ 收回」：把選的造型、松果（填數量，最多扣到 0）、家具要回來；家具擺在家裡的也會拿掉。</div></div>
<section class="tab" data-tab="money"><div class="box"><b>💸 退款後收回</b><br><span class="hint">先在綠界後台退款，再在這裡輸入那筆的訂單編號（/stats 月票表格最右邊那欄）。會扣回月票天數、先送的松果（已花掉就扣到 0）；支持營地會收回假髮。</span><br><input id="rno" placeholder="訂單編號" size="28"> <button id="refund">收回</button> <span id="rmsg"></span></div>
<div class="box"><b>🏷️ 標成自己人（不算收入）</b><br><span class="hint">自己測試、家人朋友幫忙買的訂單，標了以後 /stats 收入不算它（東西不會收回）。再按一次就取消。用你自己裝置（打過 staff 的）買的會自動標。</span><br><input id="sno" placeholder="訂單編號" size="28"> <button id="selfo">標成自己人／取消</button> <span id="smsg"></span></div></section>
<section class="tab" data-tab="on"><h3>🟢 現在在線（${onRows.length} 人）</h3><p class="hint">打開這頁那一刻在線上的人（重新整理才會更新；營地居民不算）。點名字可以查他、發補償。</p>
<div class="wrap"><table><tr><th>名字／玩家編號</th><th>在哪裡</th><th>分流</th><th>第一次來</th><th>營位</th><th>月票</th></tr>${onRows.map((r) => r.row).join('') || '<tr><td colspan="6">現在沒有人在線上</td></tr>'}</table></div>
</section><section class="tab" data-tab="mail"><h3>✉️ 玩家來信（${support.filter((x) => !x.re).length} 則還沒回）</h3><p class="hint">玩家在遊戲裡按「✉️ 聯絡作者」寄來的，會自動附上玩家編號。點名字可以查他、發補償；回覆後玩家在線上會馬上收到，不在線上下次進來會看到。</p>
<div class="wrap"><table><tr><th>時間</th><th>玩家</th><th>內容</th><th>回覆</th></tr>${supRows || '<tr><td colspan="4">還沒有來信</td></tr>'}</table></div>
</section><section class="tab" data-tab="inv"><h3>👫 邀請紀錄（最近 200 筆）</h3><p class="hint">點名字可以直接查那位玩家。「同網路」＝邀請人和朋友用同一個網路（同事、家人），要待 ${Math.round(SAMENET_STAY_MS / 60000)} 分鐘、朋友要玩一下（釣魚、採集、撿垃圾、做任務），同一個網路每天最多算 ${SAMENET_DAILY} 位。</p>
<div class="wrap"><table><tr><th>時間</th><th>種類</th><th>邀請人</th><th>朋友</th><th></th><th>結果</th></tr>${invRows || '<tr><td colspan="6">還沒有紀錄（這版上線後才開始記）</td></tr>'}</table></div>
</section><section class="tab" data-tab="shout"><h3>📣 大聲公紀錄（最近 ${shouts.length} 則，伺服器重開會清空）</h3><div class="wrap"><table><tr><th>時間</th><th>玩家</th><th>內容</th></tr>${shouts.slice().reverse().map((x) => `<tr><td>${new Date(x.at).toLocaleString('zh-TW', { timeZone: STATS_TZ, hour12: false })}</td><td><a href="#" data-q="${escH(x.hid)}">${escH(x.name)}</a></td><td>${escH(x.text)}</td></tr>`).join('') || '<tr><td colspan="3">還沒有</td></tr>'}</table></div>
</section><section class="tab" data-tab="chat"><h3 id="chat">💬 大家的聊天（最近 ${Math.min(chatLog.length, 600)} 則，新的在上面）</h3><p class="hint">營火、湖邊、營地、帳篷裡的公開聊天和大聲公（好友密頻不在這裡）。保留 7 天（更新、重開也不會不見）；這裡只列最近 600 則，更早的用「查玩家」看他說過的話（最近 60 則）。點名字可以查他、禁言、停權。</p>
<div class="wrap" style="max-height:480px;overflow:auto"><table><tr><th>時間</th><th>在哪裡</th><th>玩家</th><th>說了什麼</th></tr>${chatRows || '<tr><td colspan="4">還沒有人聊天（這版上線後才開始記）</td></tr>'}</table></div>
</section><section class="tab" data-tab="notes"><h3 id="notes">📝 告示牌留言（最近 60 張）</h3><p class="hint">有人亂寫可以直接刪掉，大家的畫面會馬上更新。這版之後貼的留言才有玩家編號（點名字可以直接查到人）。</p>
<div class="wrap" style="max-height:420px;overflow:auto"><table><tr><th>時間</th><th>玩家</th><th>留言</th><th></th></tr>${noteRows || '<tr><td colspan="4">沒有留言</td></tr>'}</table></div>
<h3 id="bottles">🍾 漂流瓶（最近 150 封，新的在上面）</h3><p class="hint">玩家在湖邊寫的信，別人撈到漂流瓶時會讀到。2 個人檢舉就自動收起來（變淡的那幾封），看過沒問題可以「放回去」。</p><div class="wrap" style="max-height:360px;overflow:auto"><table><tr><th>時間</th><th>玩家</th><th>信</th><th>狀態</th><th></th></tr>${bottleRows || '<tr><td colspan="5">還沒有人丟漂流瓶</td></tr>'}</table></div>
<h3>🎋 繪馬（最近 30 塊）</h3><div class="wrap" style="max-height:300px;overflow:auto"><table><tr><th>時間</th><th>玩家</th><th>內容</th><th></th></tr>${wishRows || '<tr><td colspan="4">沒有繪馬</td></tr>'}</table></div>
</section><section class="tab" data-tab="ban"><h3 id="bans">⛔ 停權／🔇 禁言名單</h3><div class="wrap"><table><tr><th>玩家</th><th>種類</th><th>到什麼時候</th><th>原因</th></tr>${banRows || '<tr><td colspan="4">沒有人</td></tr>'}</table></div>
</section><section class="tab" data-tab="grant"><h3>🎁 補償紀錄</h3><div class="wrap"><table><tr><th>時間</th><th>玩家</th><th>送了</th><th>備註</th></tr>${grantRows || '<tr><td colspan="4">還沒有</td></tr>'}</table></div></section></section>
<script>
(function () {
  var K = location.search, cur = '';
  var $ = function (id) { return document.getElementById(id); };
  // 📢 全營地公告
  var aTpl = '';
  document.querySelectorAll('[data-atpl]').forEach(function (b) {
    b.addEventListener('click', function () { aTpl = b.dataset.atpl; $('atext').value = b.textContent; $('atext').focus(); });
  });
  $('atext').addEventListener('input', function () { aTpl = ''; });
  $('asend').addEventListener('click', function () {
    var tx = $('atext').value.trim();
    if (!tx) return alert('選一個套版，或自己打字');
    if (!confirm('發給全營地所有人？\\n\\n' + tx)) return;
    fetch('/api/announce' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aTpl ? { tpl: aTpl } : { text: tx }) }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) return alert(r.reason);
      $('ares').textContent = '✅ 發出去了（現在有 ' + r.online + ' 個連線）';
      $('atext').value = ''; aTpl = '';
    });
  });
  // 📑 分頁（作者 11/17：網頁太長 → 一次只看一區；記在網址 # 裡，重新整理還在同一頁）
  function tab(k) {
    if (!document.querySelector('section.tab[data-tab="' + k + '"]')) k = 'on';
    document.querySelectorAll('section.tab').forEach(function (s) { s.classList.toggle('on', s.dataset.tab === k); });
    document.querySelectorAll('.tabs [data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === k); });
    history.replaceState(null, '', '#' + k);
  }
  document.querySelectorAll('.tabs [data-tab]').forEach(function (b) { b.onclick = function () { tab(b.dataset.tab); }; });
  tab((location.hash || '#on').slice(1));
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function show(r) {
    if (!r.ok) {
      $('card').innerHTML = '<p class="err">' + esc(r.reason) + '</p>' + (r.list ? '<ul>' + r.list.map(function (x) { return '<li><a href="#" data-q="' + esc(x.hid) + '">' + esc(x.name) + '</a> <small>' + esc(x.hid) + '　第一次來 ' + esc(x.first) + (x.on ? '　🟢 在線' : '') + '</small></li>'; }).join('') + '</ul>' : '');
      $('gbox').hidden = true;
      return;
    }
    cur = r.hid;
    $('gname').textContent = r.name + '（' + r.hid + '）';
    $('gbox').hidden = false;
    var log = r.log.map(function (x) { return '<tr><td>' + new Date(x.at).toLocaleString('zh-TW', { hour12: false }) + '</td><td>' + esc(x.rn) + ' → ' + esc(x.fn) + '</td><td>' + (x.net ? '🏢' : '') + '</td><td>' + esc(x.r) + '</td></tr>'; }).join('');
    $('card').innerHTML = '<p>👤 <b>' + esc(r.name) + '</b>　玩家編號 <b>' + esc(r.hid) + '</b>　帳號 <b>' + (esc(r.account) || '（沒綁）') + '</b></p>' +
      (r.names && r.names.length ? '<p class="hint">📝 改名紀錄：' + r.names.map(function (x) { return new Date(x.at).toLocaleString('zh-TW', { hour12: false }) + ' ' + esc(x.from) + ' → ' + esc(x.to); }).join('<br>') + '</p>' : '<p class="hint">📝 改名紀錄：沒有（11/18 起才開始記）</p>') +
      '<p>第一次來 ' + esc(r.first || '?') + '　🌰 ' + r.pc + '　👒 ' + r.outfits + ' 款　' + (r.tent ? '⛺ 有帳篷' : '還沒帳篷') + '　邀請成功 ' + r.refs + ' 位' + (r.by ? '　被 ' + esc(r.by) + ' 邀請來的' : '') + '</p>' +
      (log ? '<div class="wrap"><table><tr><th>時間</th><th>邀請人 → 朋友</th><th></th><th>結果</th></tr>' + log + '</table></div>' : '<p class="hint">沒有邀請紀錄</p>') +
      '<div class="box" style="margin-top:10px"><b>🚫 處理這個人</b>　' + (r.ban ? '<span class="err">現在：' + (r.ban.t === 'ban' ? '⛔ 停權' : '🔇 禁言') + '（' + (r.ban.until ? '到 ' + new Date(r.ban.until).toLocaleString('zh-TW', { hour12: false }) : '永久') + '）' + (r.netBan ? '＋網路' : '') + '</span>' : '<span class="ok">現在：正常</span>') +
      '<br><input id="bnote" placeholder="原因（自己看的）" size="24"> <select id="bdays"><option value="1">1 天</option><option value="7">7 天</option><option value="30">30 天</option><option value="0">永久</option></select>' +
      ' <button data-ban="mute">🔇 禁言</button> <button data-ban="ban">⛔ 停權</button> <label><input type="checkbox" id="bnet"> 停權時連他現在的網路一起擋</label>' + (r.ban ? ' <button data-ban="clear">✅ 解除</button>' : '') +
      '<div class="hint">🔇 禁言：還能玩，但不能聊天、大聲公、留言、繪馬、密頻。⛔ 停權：馬上踢出去，進不來。「連網路一起擋」可以擋他開新帳號，但同一個家裡、學校的人也會一起進不來，小心用（只有他在線上時才擋得到網路）。</div></div>' +
      '<div class="box" style="margin-top:10px"><b>${AUTHOR_MARK} 作者標誌</b>　' + (r.author ? '<span class="err">現在：名字前面有 ${AUTHOR_MARK}</span>' : '<span class="hint">沒有</span>') + ' <button id="authorBtn">' + (r.author ? '取消' : '標成作者') + '</button><div class="hint">標了以後，這個帳號的名字前面會有 ${AUTHOR_MARK}（頭上、聊天、大聲公都看得到），蓋過月票的 🔥／✨。重新進遊戲才會換。其他人名字裡打不了 ${AUTHOR_MARK}。</div></div>' +
      '<div class="box" style="margin-top:10px"><b>⚠️ 警告這個人</b>　' + (r.warns && r.warns.length ? '<span class="err">已警告 ' + r.warns.length + ' 次</span>' : '<span class="hint">還沒警告過</span>') +
      '<br><select id="wr"><option value="curse">罵人、說髒話</option><option value="note">亂留言</option><option value="name">名字不恰當</option><option value="spam">洗版、一直刷聊天</option><option value="other">其他（自己寫）</option></select> <input id="wnote" placeholder="其他的原因（玩家會看到）" size="22"> <label><input type="checkbox" id="wsc"> 用簡體字</label> <button data-warn="1">⚠️ 送出警告</button>' +
      '<div class="hint">他的畫面會跳出警告（5 秒後才能關）。在線上馬上跳；不在線上，下次進來時跳。他的瀏覽器是大陸的設定會自動用簡體字；勾「用簡體字」一定用簡體。</div>' +
      (r.warns && r.warns.length ? '<div class="hint">' + r.warns.map(function (x) { return new Date(x.at).toLocaleString('zh-TW', { hour12: false }) + '　' + esc(({ curse: '罵人', note: '亂留言', name: '名字', spam: '洗版', other: '其他' })[x.r] || x.r) + (x.note ? '：' + esc(x.note) : ''); }).join('<br>') + '</div>' : '') + '</div>' +
      (r.chats && r.chats.length ? '<p><b>💬 他最近說的話</b></p><div class="wrap"><table>' + r.chats.map(function (c) { return '<tr><td>' + new Date(c.at).toLocaleString('zh-TW', { hour12: false }) + '</td><td>' + esc(c.where) + '</td><td style="text-align:left">' + esc(c.text) + '</td></tr>'; }).join('') + '</table></div>' : '');
  }
  function find(q) {
    $('q').value = q;
    fetch('/api/lookup' + K + (K ? '&' : '?') + 'q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(show).catch(function () { show({ ok: false, reason: '連不到伺服器' }); });
  }
  $('find').onclick = function () { find($('q').value); };
  $('q').onkeydown = function (e) { if (e.key === 'Enter') find($('q').value); };
  // 點名字查人（卡片裡後來才出現的名字也要能點）
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-q]');
    if (a) { e.preventDefault(); if (a.dataset.q) { find(a.dataset.q); scrollTo(0, 0); } return; }
    if (e.target.id === 'authorBtn') {
      fetch('/api/author' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: cur }) }).then(function (r) { return r.json(); }).then(function (r) { if (r.ok) show(r); else alert(r.reason); });
      return;
    }
    var b = e.target.closest('[data-ban]');
    if (b) {
      var t = b.dataset.ban, days = $('bdays').value;
      var what = t === 'clear' ? '解除' : (t === 'ban' ? '停權' : '禁言') + (days === '0' ? '（永久）' : '（' + days + ' 天）');
      if (!confirm('確定對 ' + $('gname').textContent + ' ' + what + '？')) return;
      fetch('/api/ban' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: cur, t: t, days: days, net: $('bnet') && $('bnet').checked, note: $('bnote') ? $('bnote').value : '' }) }).then(function (r) { return r.json(); }).then(function (r) { if (r.ok) show(r); else alert(r.reason); });
      return;
    }
    var wb = e.target.closest('[data-warn]');
    if (wb) {
      var wr = $('wr').value, wn = $('wnote').value;
      if (wr === 'other' && !wn.trim()) { alert('選「其他」要寫原因'); return; }
      if (!confirm('確定警告 ' + $('gname').textContent + '？')) return;
      fetch('/api/warn' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: cur, r: wr, note: wn, sc: $('wsc').checked }) }).then(function (r) { return r.json(); }).then(function (r) { if (r.ok) show(r); else alert(r.reason); });
      return;
    }
    var tb = e.target.closest('[data-tr]');
    if (tb) {
      var tx = tb.dataset.tr, src = /[ぁ-ヿ]/.test(tx) ? 'ja' : /[가-힯]/.test(tx) ? 'ko' : /[Ѐ-ӿ]/.test(tx) ? 'ru' : 'en';
      tb.disabled = true; tb.textContent = '⋯';
      fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(tx) + '&langpair=' + src + '|zh-TW').then(function (r) { return r.json(); }).then(function (d) {
        var out = d && d.responseStatus === 200 && d.responseData && d.responseData.translatedText;
        var em = document.createElement('div'); em.style.cssText = 'color:#9fd3ff;margin-top:4px';
        em.textContent = out ? '🌐 ' + out : '🌐 翻譯失敗，等一下再試';
        tb.after(em); tb.remove();
      }).catch(function () { tb.disabled = false; tb.textContent = '🌐'; alert('翻譯失敗，等一下再試'); });
      return;
    }
    var bt = e.target.closest('[data-btl]');
    if (bt) {
      var q = bt.dataset.btl.split(':');
      if (q[0] === 'del' && !confirm('確定刪掉這封漂流瓶？')) return;
      fetch('/api/bottle' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: q[0], k: Number(q[1]) }) }).then(function (r) { return r.json(); }).then(function (r) { if (!r.ok) return alert(r.reason); if (q[0] === 'del') bt.closest('tr').remove(); else { bt.closest('tr').style.opacity = 1; bt.remove(); } });
      return;
    }
    var d = e.target.closest('[data-del]');
    if (d) {
      var p = d.dataset.del.split(':');
      if (!confirm('確定刪掉這一張？大家都看不到了')) return;
      fetch('/api/delNote' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: p[0], at: Number(p[1]) }) }).then(function (r) { return r.json(); }).then(function (r) { if (r.ok) d.closest('tr').remove(); else alert(r.reason); });
    }
  });
  document.querySelectorAll('[data-send]').forEach(function (b) {
    b.onclick = function () {
      var ta = document.querySelector('[data-re="' + b.dataset.send + '"]');
      if (!ta.value.trim()) return;
      b.disabled = true;
      fetch('/api/supportReply' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.dataset.send, text: ta.value }) }).then(function (r) { return r.json(); }).then(function (r) {
        if (r.ok) { ta.outerHTML = '<div class="re">' + esc(ta.value) + '</div><small>剛剛回覆</small>'; b.remove(); } else { b.disabled = false; alert(r.reason); }
      });
    };
  });
  $('gtype').onchange = function () { var v = $('gtype').value; $('gout').hidden = v !== 'outfit'; $('gfurn').hidden = v !== 'furn'; $('gn').hidden = v !== 'pc'; };
  $('give').onclick = function () {
    var v = $('gtype').value;
    var body = { q: cur, type: v, id: v === 'outfit' ? $('gout').value : $('gfurn').value, n: $('gn').value, note: $('gnote').value };
    if (!confirm('確定送給 ' + $('gname').textContent + '？')) return;
    $('give').disabled = true;
    fetch('/api/grant' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (r) {
      $('give').disabled = false;
      $('gmsg').innerHTML = r.ok ? '<span class="ok">✅ 送出 ' + esc(r.what) + '（玩家在線上會馬上收到通知）</span>' : '<span class="err">❌ ' + esc(r.reason) + '</span>';
      if (r.ok) show(Object.assign({ ok: true }, r.card));
    });
  };
  $('take').onclick = function () {
    var v = $('gtype').value;
    var label = v === 'pc' ? $('gn').value + ' 顆松果' : v === 'outfit' ? $('gout').selectedOptions[0].textContent : $('gfurn').selectedOptions[0].textContent;
    var body = { q: cur, type: v, id: v === 'outfit' ? $('gout').value : $('gfurn').value, n: $('gn').value, note: $('gnote').value };
    if (!confirm('確定從 ' + $('gname').textContent + ' 收回 ' + label + '？')) return;
    $('take').disabled = true;
    fetch('/api/take' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (r) {
      $('take').disabled = false;
      $('gmsg').innerHTML = r.ok ? '<span class="ok">✅ 收回 ' + esc(r.what) + '</span>' : '<span class="err">❌ ' + esc(r.reason) + '</span>';
      if (r.ok) show(Object.assign({ ok: true }, r.card));
    });
  };
  $('selfo').onclick = function () {
    var no = $('sno').value.trim();
    if (!no) return;
    fetch('/api/selfOrder' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ no: no }) }).then(function (r) { return r.json(); }).then(function (r) {
      $('smsg').innerHTML = r.ok ? '<span class="ok">✅ ' + esc(r.name) + ' NT$' + esc(r.amt) + '：' + (r.self ? '標成自己人了（不算收入）' : '取消了，算回收入') + '</span>' : '<span class="err">❌ ' + esc(r.reason) + '</span>';
    });
  };
  $('refund').onclick = function () {
    var no = $('rno').value.trim();
    if (!no || !confirm('確定要收回訂單 ' + no + ' 送的東西嗎？（請先在綠界退款）')) return;
    fetch('/api/refund' + K, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ no: no }) }).then(function (r) { return r.json(); }).then(function (r) {
      $('rmsg').innerHTML = r.ok ? '<span class="ok">✅ ' + esc(r.name) + ' NT$' + esc(r.amt) + '：' + esc(r.what) + '</span>' : '<span class="err">❌ ' + esc(r.reason) + '</span>';
    });
  };
})();
</script></body></html>`);
});

// 💡 玩家建議：/ideas（有設 STATS_KEY 時要帶 ?key=）
app.get('/ideas', (req, res) => {
  if (process.env.STATS_KEY && req.query.key !== process.env.STATS_KEY) return res.status(403).send('需要密碼：/ideas?key=…');
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = [...ideas].reverse().map((i) => `<div class="i"><b>${esc(i.n)}</b><small>${new Date(i.at).toLocaleString('zh-TW', { timeZone: STATS_TZ })}</small><p>${esc(i.t)}</p></div>`).join('');
  res.send(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>玩家建議</title>
<style>body{font-family:system-ui,sans-serif;background:#1d1714;color:#f5e6d3;padding:16px;max-width:720px;margin:auto}.i{padding:10px 12px;margin:8px 0;border-radius:10px;background:#2a211c}.i b{color:#ffb46b}.i small{opacity:.6;margin-left:8px}.i p{margin:6px 0 0;white-space:pre-wrap}</style></head>
<body>${staffNav(req, 'ideas')}<h2>💡 玩家建議（${ideas.length} 則）</h2>${rows || '<p>還沒有建議</p>'}</body></html>`);
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
    ItemName: o.kind === 'sponsor' ? SPONSOR.item : o.upgrade ? '營火月票・升級星空（補差價）' : PASS_PLANS[o.plan]?.item ?? (PASS_TIERS[o.tier] ?? PASS).item,
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
    if (!o.sim || !ECPAY.prod) fulfillOrder(o);
  } else if (b.RtnCode !== '1') {
    o.last = `${b.RtnCode}:${String(b.RtnMsg ?? '').slice(0, 60)}`; // ATM、超商代碼取號成功，還沒付款
    saveJson('orders.json', orders);
  }
  res.send('1|OK');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  // 11/07：原本 10 秒問一次、8 秒沒回就斷，太嚴格。免費主機偶爾卡一兩秒、手機網路晃一下，
  // 就會讓好幾個人同時斷線（11/6 20:47 那次）。改回 socket.io 的預設值，比較能撐過短暫的卡頓。
  pingInterval: 25000,
  pingTimeout: 20000,
  // 省流量：WebSocket 訊息先壓縮再送（位置更新很多是重複的字，壓縮效果好）
  perMessageDeflate: { threshold: 0, zlibDeflateOptions: { level: 6, memLevel: 7 } },
});
/** 網頁切到背景的玩家放在這個房間：不送別人的走動（掛機只算松果，不傳畫面資料） */
const BG = 'bg';
/** 居民（NPC）的位置每幾次廣播才送一次：20Hz ÷ 4 ＝ 每秒 5 次，看起來一樣順，流量少很多 */
const NPC_EVERY = 4;
let tickNo = 0;

// ---------- 小工具 ----------
const num = (v, min, max, fallback = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/** 🪄 作者的名字前面加魔法棒（只有 /admin 標成作者的帳號；名字裡不能自己打 🪄；🏕️ 是營地居民用的） */
const authorName = (p) => (p?.vid && players[p.vid]?.author ? `${AUTHOR_MARK} ${p.name}` : p?.name ?? '');
function cleanName(raw) {
  const name = cleanNameText(raw); // 📝 作者 11/22：名字不能放符號、表情（月票 🔥✨、作者 🪄 才看得出來；舊名字下次進來會被清掉）
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
  p.zz | 0, // 😴 打瞌睡（舊版前端只讀前 6 格，不受影響）
];

const publicInfo = (p) => ({ id: p.id, name: p.name, fur: p.fur, sp: p.sp, tl: p.tl || undefined, er: p.er || undefined, rw: p.rw, ot: p.ot, pb: p.pb, sr: p.sr || undefined, sn: (p.sr && p.sn) || undefined, spk: p.spk || undefined, dk: p.dk > Date.now() ? p.dk : undefined, s: packState(p) }); // dk：🦆 小鴨跟到幾點

/** 某個分流的某個房間，給新進玩家的完整資料 */
function roomSnapshot(c, rid, selfId) {
  const r = c.rooms.get(rid);
  const id = baseRoom(rid); // 帳篷營地的各區（campground@1…）對前端來說都是 campground
  return {
    ch: c.ch,
    room: id,
    zone: campZoneOf(rid),
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
  const n = (id) => [...c.rooms.entries()].reduce((sum, [k, r]) => sum + (baseRoom(k) === id ? r.players.size : 0), 0); // 帳篷營地各區加起來
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
// ---------- 🎲 營火桌遊（作者 11/13：坐在營火圓木上發起，🪵 抽樹枝、🫧 吹泡泡；規則在 src/game/boardGames.js） ----------
const BOARD_LIVE = () => BOARD_ON || process.env.BOARD_TEST === '1';
const bgGames = new Map(); // rkey → 一局（每個分流的營火同時只有一局）
const BG_INVITE_MS = 30000;
const BG_TURN_MS = 10000;
const BG_BLOW_MS = 8000;
const BG_RATE = 0.16; // 泡泡每秒最多長多大（0～1）
const bgView = (g) => ({
  id: g.id,
  game: g.game,
  host: g.host,
  state: g.state,
  turn: g.turn ?? null,
  endsAt: g.endsAt ?? null,
  winners: g.winners ?? null,
  gain: g.gain ?? null,
  holes: g.holes ?? null, // 🐸 每個洞是誰戳的（null＝還沒戳）
  loser: g.loser ?? null,
  trap: g.state === 'done' ? (g.trap ?? null) : null, // 青蛙躲在哪個洞：結束才公開
  players: g.players.map((p) => ({ id: p.id, name: p.name, len: p.len ?? null, size: p.size ?? 0, popped: !!p.popped, done: !!p.done })),
});
const bgEmit = (g) => io.to(g.rkey).emit('bgame', bgView(g));
const bgClear = (g) => {
  clearTimeout(g.timer);
  if (bgGames.get(g.rkey) === g) bgGames.delete(g.rkey);
  io.to(g.rkey).emit('bgame', { id: g.id, state: 'gone' });
};
/** 贏家 +2 松果（每天最多 20 顆，上限到了照樣能玩、只是不給） */
function bgAward(vid) {
  const w = players[vid];
  if (!w) return 0;
  const d = dayKey();
  if (w.bgd?.d !== d) w.bgd = { d, n: 0 };
  const n = Math.min(BOARD_WIN, BOARD_DAY_CAP - w.bgd.n);
  if (n <= 0) return 0;
  w.bgd.n += n;
  giveTo(vid, n, 'board');
  return n;
}
function bgFinish(g) {
  clearTimeout(g.timer);
  g.state = 'done';
  let best = [];
  if (g.game === 'stick') {
    const max = Math.max(...g.players.map((p) => p.len ?? 0));
    best = g.players.filter((p) => p.len && p.len === max);
  } else if (g.game === 'frog') {
    best = g.loser ? g.players.filter((p) => p.id !== g.loser) : []; // 戳到青蛙的人輸，其他人都贏
  } else {
    const alive = g.players.filter((p) => !p.popped && p.size > 0);
    const max = Math.max(0, ...alive.map((p) => p.size));
    best = alive.filter((p) => p.size === max && max > 0);
  }
  if (g.players.length < 2) best = []; // 只剩一個人：不算輸贏
  g.winners = best.map((p) => p.id);
  g.gain = Object.fromEntries(best.map((p) => [p.id, bgAward(p.vid)]));
  if (g.players.length >= 2) for (const p of g.players) if (p.vid) questEv(p.vid, 'bgame'); // 📒 玩一局桌遊
  const d = today();
  d.bg ??= {};
  d.bg[g.game] = (d.bg[g.game] ?? 0) + 1;
  d.bgPlayers = (d.bgPlayers ?? 0) + g.players.length;
  saveJson('stats.json', stats);
  bgEmit(g);
  g.timer = setTimeout(() => bgClear(g), 15000); // 結果留 15 秒（可以按「再來一局」）
}
function bgNextTurn(g) {
  clearTimeout(g.timer);
  const next = g.players.find((p) => !p.len);
  if (!next) return bgFinish(g);
  g.turn = next.id;
  g.endsAt = Date.now() + BG_TURN_MS;
  bgEmit(g);
  g.timer = setTimeout(() => bgDraw(g, next.id), BG_TURN_MS); // 太久沒抽：自動幫他抽
}
function bgDraw(g, id) {
  const p = g.players.find((q) => q.id === id);
  if (!p || p.len || g.state !== 'play' || g.turn !== id) return;
  p.len = Math.round((0.2 + Math.random() * 1.0) * 100) / 100; // 0.2～1.2 公尺
  bgNextTurn(g);
}
/** 🐸 輪到下一個人戳（g.ti＝輪到第幾個人） */
function bgFrogTurn(g) {
  clearTimeout(g.timer);
  if (g.players.length < 2) return bgFinish(g);
  g.ti %= g.players.length;
  const p = g.players[g.ti];
  g.turn = p.id;
  g.endsAt = Date.now() + BG_TURN_MS;
  bgEmit(g);
  g.timer = setTimeout(() => {
    const free = g.holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
    bgPoke(g, p.id, free[Math.floor(Math.random() * free.length)]); // 太久沒戳：自動幫他戳
  }, BG_TURN_MS);
}
function bgPoke(g, id, hole) {
  if (g.state !== 'play' || g.game !== 'frog' || g.turn !== id) return false;
  if (!Number.isInteger(hole) || hole < 0 || hole >= g.holes.length || g.holes[hole]) return false;
  g.holes[hole] = id;
  if (hole === g.trap) {
    g.loser = id;
    bgFinish(g);
    return true;
  }
  g.ti += 1;
  bgFrogTurn(g);
  return true;
}
function bgStart(g) {
  clearTimeout(g.timer);
  g.state = 'play';
  g.startAt = Date.now();
  if (g.game === 'stick') return bgNextTurn(g);
  if (g.game === 'frog') {
    g.holes = Array(FROG_HOLES).fill(null);
    g.trap = Math.floor(Math.random() * FROG_HOLES);
    g.ti = 0;
    return bgFrogTurn(g);
  }
  for (const p of g.players) {
    p.limit = 0.55 + Math.random() * 0.45; // 每個人的泡泡極限不一樣（看不到）
    p.size = 0;
  }
  g.endsAt = Date.now() + BG_BLOW_MS;
  bgEmit(g);
  g.timer = setTimeout(() => bgFinish(g), BG_BLOW_MS + 600);
}
/** 有人離開營火（換房間、斷線、站起來） */
function bgLeave(rkey, sid) {
  const g = bgGames.get(rkey);
  if (!g) return;
  const i = g.players.findIndex((p) => p.id === sid);
  if (i < 0) return;
  if (g.state === 'done') return;
  g.players.splice(i, 1);
  if (g.state === 'invite') {
    if (g.host.id === sid || !g.players.length) return bgClear(g); // 發起的人走了：取消
    return bgEmit(g);
  }
  if (g.players.length < 2) return bgFinish(g);
  if (g.game === 'stick' && g.turn === sid) return bgNextTurn(g);
  if (g.game === 'frog') {
    if (i < g.ti) g.ti -= 1;
    if (g.turn === sid) return bgFrogTurn(g); // 輪到他卻走了：換下一個人（同一個位置）
  }
  bgEmit(g);
}

io.on('connection', (socket) => {
  let player = null;
  let chan = null; // 目前的分流
  let room = null;
  let roomId = null;
  let rkey = null; // socket.io 的房間名稱：「分流:房間」
  let campZone = 0; // 🏕️ 在帳篷營地的哪一區（0＝A 區）
  const curRid = () => (roomId === 'campground' ? campRid(campZone) : roomId);
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
  /** 🎯 今日挑戰 → 📒 任務本（作者 11/22）：舊的 chal(ev) 照樣能用，現在轉成任務事件 */
  const chalView = () => questView(player?.vid)?.daily ?? [];
  const chal = (ev, k = 1, opt = {}) => {
    if (!wal || !player?.vid) return;
    wal.act = Date.now(); // 有在玩（同一個網路的邀請要看這個）
    questEv(player.vid, ev, k, { net: socket.data.netKey, ...opt });
  };
  // 📒 打開任務本
  socket.on('questInfo', (_d, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    ack?.({ ok: true, ...questView(player.vid) });
  });
  // 🔄 每日換一題（一天一次，換同一類：互動換互動）
  socket.on('questSwap', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const d = dayKey();
    if (wal.ch?.d !== d) wal.ch = { d, n: {} };
    if (wal.ch.sw) return ack?.({ ok: false, reason: 'used' });
    const ctx = questCtx(player.vid);
    const ids = dailyOf(d, ctx);
    const from = String(data.id ?? '');
    if (!ids.includes(from) || (wal.ch.n[from] ?? 0) >= DAILY_BY_ID[from].n) return ack?.({ ok: false, reason: 'bad' });
    const to = dailySwapTo(d, ctx, ids, from);
    if (!to) return ack?.({ ok: false, reason: 'none' });
    wal.ch.sw = { from, to };
    saveJson('players.json', players);
    ack?.({ ok: true, ...questView(player.vid) });
  });
  /** ✨ 小精靈：存檔、加親密度、長大（規則在 src/game/spiritRules.js） */
  /** 有沒有小精靈（11/11 改：要到商店買蛋才有；xp>0 的是之前就在養的，也算有） */
  const spiritOf = () => {
    const sp = wal?.spirit;
    if (!sp || !(sp.own || sp.xp > 0)) return null;
    sp.c ??= {};
    return sp;
  };
  /** 🎄 小精靈配件：有哪些、戴哪個、現在小舖賣不賣（季節限定） */
  const accView = () => {
    const a = wal?.spiritAcc ?? {};
    const xmas = isXmasShopDay(dayKey()); // 小精靈聖誕配件賣到 1/15
    const sp = spiritOf();
    return { own: a.own ?? [], wear: sp ? accWear(sp, wal) : (a.wear ?? ''), wing: sp ? accWing(sp, wal) : (a.wing ?? ''), list: SPIRIT_ACCS.map((x) => ({ ...x, sell: (x.season === 'xmas' ? xmas : true) && isOpen(x) })) };
  };
  const spiritView = () => {
    if (!wal) return null;
    const sp = spiritOf();
    if (!sp) return { none: true, eggPrice: SPIRIT_FIRST_PRICE, max: SPIRIT_MAX, acc: accView() };
    const st = spiritStage(sp.xp);
    const d = dayKey();
    const day = sp.day?.d === d ? sp.day : { xp: 0, feed: 0 };
    const gk = st ? (sp.t ?? 'leaf') : 'light';
    const playLeft = Math.max(0, SPIRIT_PLAY_DAY - (day.play?.[gk] ?? 0));
    return { acc: accView(), playLeft, nm: sp.nm ?? '', xp: sp.xp, stage: st, t: st ? (sp.t ?? 'leaf') : 'light', next: SPIRIT_STAGE_AT[st + 1] ?? null, prev: SPIRIT_STAGE_AT[st], c: sp.c, off: !!sp.off, dayXp: day.xp, dayCap: SPIRIT_DAY_CAP, feed: day.feed, feedMax: SPIRIT_FEED_DAY, fav: st ? SPIRIT_FAV[sp.t ?? 'leaf'] : null, price: SPIRIT_CHANGE_PRICE, away: sp.away ?? 0, box: (wal.spiritBox ?? []).map((b) => ({ nm: b.nm ?? '', t: spiritStage(b.xp) ? (b.t ?? 'leaf') : 'light', stage: spiritStage(b.xp), xp: b.xp })), egg: wal.egg ? { left: Math.max(0, wal.egg.at - Date.now()) } : null, eggPrice: SPIRIT_EGG_PRICE, max: SPIRIT_MAX };
  };
  /** 小精靈外型變了：告訴同一區的人 */
  const spiritSync = () => {
    const sp = spiritOf();
    const code = spiritCode(sp, accWear(sp, wal), accWing(sp, wal));
    const nm = code ? String(sp?.nm ?? '') : '';
    if (!player || (player.sr === code && (player.sn ?? '') === nm)) return;
    player.sr = code;
    player.sn = nm; // ✏️ 名字（別人靠近或點它時顯示）
    if (rkey) socket.to(rkey).emit('spirit', { id: socket.id, sr: code, sn: nm });
    homeSpiritsSync();
  };
  /** ✨ 家裡的小精靈換了（收起來、換一隻帶出門、孵出來、取名字）：在這個帳篷裡的人重畫 */
  const homeSpiritsSync = () => {
    const h = player?.vid && homes[player.vid];
    if (h?.tent) io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
  };
  /** kind：fish／fire／gather／cook；feed：餵食直接加 xp（不算每日上限） */
  const spiritGain = (kind, feedXp = 0) => {
    const sp = spiritOf();
    if (!sp || !player?.vid) return;
    const d = dayKey();
    if (sp.day?.d !== d) sp.day = { d, xp: 0, feed: 0 };
    let add = feedXp;
    if (kind) {
      const ck = kind in SPIRIT_ACT_KIND ? SPIRIT_ACT_KIND[kind] : kind; // 這個活動算哪一種小精靈（null＝不算）
      if (ck) {
        sp.c[ck] = (sp.c[ck] ?? 0) + 1;
        if (ck !== 'star' && (isNight() || eventInfo().active)) sp.c.star = (sp.c.star ?? 0) + SPIRIT_NIGHT_STAR; // ⭐ 晚上、營火時間玩
      }
      add = Math.min(SPIRIT_XP[kind] ?? 0, SPIRIT_DAY_CAP - sp.day.xp);
      if (add > 0) sp.day.xp += add;
    }
    if (add <= 0) return;
    const before = spiritStage(sp.xp);
    sp.xp += add;
    const after = spiritStage(sp.xp);
    if (after !== before) {
      if (before === 0) sp.t = autoKind(sp.c); // 變成小精靈：看最常做什麼
      saveJson('players.json', players);
      spiritSync();
      bump(after === 1 ? 'spirit1' : 'spirit2');
    }
    socket.emit('spiritMe', { ...spiritView(), grew: after !== before ? after : 0, gain: add, kind: kind || 'feed' });
  };
  /** 🥚 蛋孵出來了：變成新的小光點，先放在「收起來的小精靈」裡 */
  let eggTimer = null;
  const checkEgg = () => {
    clearTimeout(eggTimer);
    eggTimer = null;
    if (!wal?.egg) return;
    const left = wal.egg.at - Date.now();
    if (left > 0) return (eggTimer = setTimeout(checkEgg, left + 500));
    wal.spiritBox ??= [];
    wal.spiritBox.push({ xp: 0, c: {}, own: true, born: Date.now(), acc: '', wg: '' }); // 新孵的什麼都沒戴
    wal.egg = null;
    saveJson('players.json', players);
    bump('spiritHatch');
    socket.emit('spiritHatch', spiritView());
    homeSpiritsSync();
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
    if (rkey) bgLeave(rkey, socket.id); // 🎲 離開營火：退出桌遊
    {
      const c = rkey ? coopRuns.get(rkey) : null;
      if (c && c.fisher === socket.id) coopRuns.delete(rkey), io.to(rkey).emit('coopEnd', { id: c.id, ok: false, name: c.name });
    }
    // ⛵ 離開湖畔（換地方、斷線）：船主→收船；乘客→下船
    {
      const b = roomId === 'lake_dock' && rkey ? boatOf(rkey, socket.id) : null;
      if (b && b.o === socket.id) boatEnd(rkey, b, 'owner');
      else if (b) boatDropRider(rkey, b, socket.id, 'leave'), io.to(rkey).emit('boats', { list: boatList(rkey) });
    }
    room.players.delete(socket.id);
    socket.leave(rkey);
    io.to(rkey).emit('playerLeft', to ? { id: socket.id, to } : { id: socket.id });
    if (roomId === 'home' && room.players.size === 0) homeRooms.delete(homeOwner);
  };
  /** 進入某個分流的某個房間 */
  let lastSpiritForest = 0;
  const enter = (c, id) => {
    // 🍄 去迷霧森林（10 分鐘算一次）
    if (id === 'mist_forest' && Date.now() - lastSpiritForest > 600000) (lastSpiritForest = Date.now()), setTimeout(() => spiritGain('forest'), 0);
    chan = c;
    if (player) (player.ch = c.ch), (player.spk = undefined); // 換地方：小精靈不在精靈家具上了
    roomId = id;
    const rid = id === 'campground' ? campRid(campZone) : id; // 帳篷營地：照現在在哪一區
    room = ensureRoom(c, rid);
    rkey = key(c.ch, rid);
    room.players.set(socket.id, player);
    socket.join(rkey);
    homeOwner = null;
    // ⛵ 湖上的船：剛進來的人也看得到
    if (id === 'lake_dock' && boatRooms.has(rkey)) setTimeout(() => rkey && socket.emit('boats', { list: boatList(rkey) }), 800);
    // 🌟 森林傳說正在經過：剛進來的人也看得到
    const lg = legendNow.get(rkey);
    if (lg) setTimeout(() => legendNow.get(rkey) === lg && socket.emit('legend', legendMsg(lg)), 1500);
  };
  /** 進到某個人的帳篷（帳篷不分分流） */
  let homeOwner = null;
  const enterHome = (owner) => {
    if (player) player.spk = undefined;
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

  /** 網頁切到背景／回到前景：背景時不送別人的走動；回來時補一次所有人現在的位置 */
  socket.on('bg', (hidden) => {
    if (hidden) {
      socket.join(BG);
      return;
    }
    socket.leave(BG);
    if (!room) return;
    const batch = {};
    for (const p of room.players.values()) if (p.id !== socket.id) batch[p.id] = packState(p);
    for (const p of room.npcs?.values() ?? []) batch[p.id] = packState(p);
    socket.emit('states', batch);
  });

  socket.on('join', (data = {}, ack) => {
    if (player) return;
    // ⛔ 被停權（帳號或網路）：進不來
    {
      const jip = String(socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address ?? '').split(',')[0].trim();
      const jnet = jip ? crypto.createHash('sha256').update(jip).digest('hex').slice(0, 12) : '';
      const b = banOf(String(data.vid ?? '').slice(0, 24), 'ban') ?? netBanOf(jnet);
      if (b) {
        ack?.({ ok: false, reason: 'banned', until: b.until || 0 });
        setTimeout(() => socket.disconnect(true), 500);
        return;
      }
    }
    let wanted = ROOM_DEFS[data.room] ? data.room : DEFAULT_ROOM;
    campZone = Math.floor(num(data.zone, 0, 59, 0));
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
      // 帳篷營地的分區房間叫 'campground@3'：拆成「帳篷營地＋第幾區」（11/15 log：朋友在營地 B 區以後時，用邀請連結進來會出錯、進不來）
      const fz = /^campground@(\d+)$/.exec(friend?.room ?? '');
      if (fz) friend.room = 'campground', (campZone = Number(fz[1]));
      if (friend && !ROOM_DEFS[friend.room]) friend = null; // 不認得的地方：照一般方式進來
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
    socket.data.staff = !!data.staff; // 📊 作者自己的裝置：新手小任務統計也不算
    if (!data.rejoin && !data.staff) {
      session = { at: Date.now() };
      const d = today();
      d.visits++;
      const vid = String(data.vid ?? '').slice(0, 24);
      if (vid && !d.vids.includes(vid) && d.vids.length < 50000) d.vids.push(vid);
      if (data.touch) d.touch++;
      // 📱 App 內建瀏覽器／嵌入網頁（11/08：看「只來一天」是不是被重複算）
      const ia = ['line', 'ig', 'fb', 'threads', 'wechat', 'iframe'].includes(data.inapp) ? data.inapp : null;
      if (ia) (d.inapp ??= {})[ia] = (d.inapp[ia] ?? 0) + 1;
      if (data.pwa) d.pwa = (d.pwa ?? 0) + 1; // 📲 從手機桌面圖示打開
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
    if (wal) {
      // ✨ 小精靈：好幾天沒來，它會衝過來（前端看 away）
      const sp = spiritOf();
      const now = Date.now();
      if (sp) {
        sp.away = sp.last ? Math.floor((now - sp.last) / 86400000) : 0;
        sp.last = now;
      }
      player.sr = spiritCode(sp, accWear(sp, wal), accWing(sp, wal));
      player.sn = player.sr ? String(sp?.nm ?? '') : '';
      setTimeout(checkEgg, 3000);
    }
    // 🐾 特殊毛色、尾巴、耳朵：沒買過的不能用（動物本來的形狀免費）
    {
      const lk = wal?.looks ?? {};
      if (player.fur >= BASE_FUR && !(lk.fur ?? []).includes(player.fur)) player.fur = 0;
      if (player.tl && player.tl !== SPECIES_TAIL[player.sp] && !(lk.tail ?? []).includes(player.tl)) player.tl = '';
      if (player.er && player.er !== SPECIES_EARS[player.sp] && !(lk.ear ?? []).includes(player.er)) player.er = '';
    }
    if (wal) player.pb = wal.author ? 9 : (passTier(wal)?.rank ?? 0); // 🪄 作者（/admin 標的，作者 11/22）蓋過月票徽章
    if (wal) noteName(wal, player.name); // 最近一次用的名字（好友、查核顯示用；沒存過外型的人也有名字） // 月票徽章：1＝🔥 小營火、2＝✨ 星空
    // 第一次來：記住是從哪裡來的（算隔天回來的比例用）
    if (firstVisit && wal) {
      wal.src = src;
      wal.fd = dayKey();
      if (session) today().src[src].n++;
    }
    socket.data.vid = wal ? String(data.vid).slice(0, 24) : null;
    // 👥 11/10 作者回報：手機切去「商店資訊」再回來，自己的角色多一隻（舊連線被手機暫停，伺服器還沒發現斷線，要等約 45 秒）
    // → 同一個人重新連上時，把他其他舊連線收掉（真的開兩個視窗的話，舊視窗會顯示「在別的視窗打開了」）
    if (socket.data.vid) {
      for (const so of io.sockets.sockets.values()) {
        if (so !== socket && so.data.vid === socket.data.vid) {
          so.emit('dupLogin');
          so.disconnect(true);
        }
      }
    }
    const ip = String(socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address ?? '').split(',')[0].trim();
    socket.data.cc = countryOf(ip); // 🌏 後台「現在在線」名字旁邊的國旗（只記國家）
    socket.data.netKey = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12) : ''; // 🔗 同網路比對用（雜湊，不留原本的 IP）
    // 朋友透過連結進來（?with=）：
    // ① 第一次來、待滿 3 分鐘 → 邀請人拿松果和每週造型
    // ② 待滿 1 分鐘（新、舊玩家都算）→ 分享人拿今天的每日造型
    // ③ 營火時間進來、待滿 1 分鐘 → 兩個人都拿營火之約造型（同一對每天一次）
    if (data.with && !data.rejoin && wal) {
      const raw = String(data.with).slice(0, 24);
      const refVid = vidOfCode(raw) ?? (players[raw] ? raw : null);
      const why = !refVid ? '找不到邀請人' : refVid === myVid ? '自己點自己的連結' : null;
      const name = player.name;
      if (why) {
        console.log(`[邀請] 沒算到：${name}（${why}）`);
        logInvite('join', refVid, myVid, name, `❌ ${why}`);
      } else {
        const net = lastIp.get(refVid) === ip ? ip || 'same' : null; // 🏢 同一個網路：多待一點、要玩一下、每天最多 3 位
        if (firstVisit) {
          wal.by = homeId(refVid);
          addStay('invite', myVid, refVid, name, REF_STAY_MS, net);
          if (!data.staff) bump('invNew');
        }
        addStay('share', myVid, refVid, name, SHARE_STAY_MS, net);
        if (eventInfo().active && players[refVid]) addStay('date', myVid, refVid, name, DATE_STAY_MS, net);
        logInvite('join', refVid, myVid, name, `⏳ 開始計時（${firstVisit ? '新朋友' : '老朋友'}${net ? `・同一個網路：要待 ${Math.round(SAMENET_STAY_MS / 60000)} 分鐘並玩一下` : ''}）`, !!net);
      }
    }
    if (wal) lastIp.set(myVid, ip);
    if (wal) setTimeout(() => checkStays(myVid), 0); // 朋友跳出去又回來：時間已經到了就馬上發
    if (wal) setTimeout(() => socket.emit('socialBadge', socialBadge(myVid)), 1500); // 有沒有未讀的密頻、好友邀請、作者回覆
    if (wal?.warnPending) setTimeout(() => socket.emit('warned', wal.warnPending), 2500); // ⚠️ 不在線上時收到的警告
    if (lastAnnounce && Date.now() - lastAnnounce.at < ANNOUNCE_LATE_MS) setTimeout(() => socket.connected && socket.emit('announce', lastAnnounce), 3500); // 📢 剛發的公告，晚進來的也看得到
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
        // 🌅 每日登入卡（11/09 作者）：來營地「第幾天」一輪 7 天，漏一天不歸零、接著算
        //    第 1～6 天 3～8 顆；第 7 天大禮 30 顆＋一件限定小家具（照順序一輪一件，拿完就只送松果）
        wal.ld = ((wal.ld ?? 0) % 7) + 1;
        let gift = null;
        let gain = 2 + wal.ld;
        if (wal.ld === 7) {
          gain = 30;
          const next = LOGIN_GIFTS.find((id) => !(homes[myVid]?.gifts ?? []).includes(id));
          if (next) gift = grantGift(myVid, next);
        }
        wal.pc += gain;
        wal.tot += gain;
        saveJson('players.json', players);
        const tomorrow = dayKey(new Date(Date.now() + 86400000));
        // 🎄 聖誕期間：連續上線每滿 3 天送 1 款聖誕造型（斷一天重算）
        let xmas = null;
        if (isXmasDay(d)) {
          wal.xs = wal.xsd === yesterday ? (wal.xs ?? 0) + 1 : 1;
          wal.xsd = d;
          const owned = wal.outfits ?? [];
          let got = null;
          if (wal.xs % XMAS_STREAK === 0) {
            const next = XMAS_OUTFITS.find((o) => !owned.includes(o.id));
            if (next) got = grantOutfit(myVid, next.id, 'xmas');
          }
          const left = XMAS_OUTFITS.filter((o) => !(wal.outfits ?? []).includes(o.id));
          xmas = { n: wal.xs % XMAS_STREAK || XMAS_STREAK, need: XMAS_STREAK, got, next: left[0]?.id ?? null, left: left.length };
          saveJson('players.json', players);
        }
        daily = { gain, streak: wal.streak, ld: wal.ld, gift, xmas, next: LOGIN_GIFTS.find((id) => !(homes[myVid]?.gifts ?? []).includes(id)) ?? null, tmr: dailyOutfit(tomorrow).id };
      }
      // 🔥 營火月票：每天第一次進來多領松果
      const tier = passTier(wal);
      if (tier && wal.pd !== d) {
        wal.pd = d;
        wal.pc += tier.daily;
        wal.tot += tier.daily;
        saveJson('players.json', players);
        daily = { ...(daily ?? { gain: 0, streak: wal.streak }), pass: tier.daily, tier: tier.id };
      }
      // 在營地待著，每 5 分鐘撿到松果（每天有上限）
      clearInterval(sitTimer);
      let minutes = 0;
      sitTimer = setInterval(() => {
        if (!player || !wal) return;
        minutes++;
        const ib = activeBuff(wal.buff);
        if (minutes < (ib?.k === 'idle' ? ib.v : SIT_EVERY_MIN)) return; // 🌰 吃了「掛機加速」：間隔變短
        minutes = 0;
        const d2 = dayKey();
        if (wal.sd !== d2) {
          wal.sd = d2;
          wal.sit = 0;
        }
        if (wal.sit >= (passTier(wal)?.sit ?? FREE.sit)) return; // 掛機每天上限：免費 30、小營火 45、星空 60
        wal.sit += SIT_GAIN;
        award(SIT_GAIN, 'sit');
      }, 60000);
    }

    // 🏕️ 固定營位：還沒有營位（第一次、或之前讓出去了）就分一個；搬遷後第一次進來跳提示
    let plotNote = null;
    const myH = homes[player.vid];
    if (myH?.tent) {
      if (!myH.plot) {
        const old = myH.plotOld;
        assignPlot(player.vid, { zone: old ?? null });
        delete myH.plotOld;
        if (myH.plot) plotNote = { kind: old != null ? 'moved' : 'new', label: plotLabel(myH.plot), plot: myH.plot };
        saveJson('homes.json', homes);
      } else if (myH.plotNew) {
        delete myH.plotNew;
        plotNote = { kind: 'new', label: plotLabel(myH.plot), plot: myH.plot };
        saveJson('homes.json', homes);
      }
    }
    ack?.({
      ok: true,
      id: socket.id,
      name: player.name, // 隨機名字撞名時，伺服器換過的名字
      reward: player.rw,
      wallet: wal ? { pc: wal.pc, streak: wal.streak, daily, age: walletAge(wal), dex: dexView(wal), shiny: wal.shiny ?? {}, look: wal.look ?? null, outfit: outfitView(wal), basket: wal.bk ?? {}, gdex: gdexOf(wal), ...trashView(wal), dishes: wal.dish ?? {}, cooked: Object.keys(wal.cooked ?? {}), buff: activeBuff(wal.buff) ? wal.buff : null, net: !!wal.net, pass: passView(wal) } : null,
      myHome: publicHome(homes[player.vid]),
      plotNote, // 🏕️ 「你的帳篷有了固定門牌／搬到 X 區 N 號了」
      code: player.vid ? homeId(player.vid) : null, // 邀請連結用的公開代號
      passOn: PASS_ON, // 🎫 月票要不要顯示
      spirit: spiritView(), // ✨ 小精靈
      ver: webVersion,
      ...roomSnapshot(chan, curRid(), socket.id),
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
    if (next === chan.ch) return ack?.({ ok: true, ...roomSnapshot(chan, curRid(), socket.id) });
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
    ack?.({ ok: true, ...roomSnapshot(chan, curRid(), socket.id) });
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
    player.e = Math.floor(num(s[5], 0, 199999, 0)); // 舉著的魚（✨ 異色 +100000）
    player.zz = s[6] ? 1 : 0; // 😴 打瞌睡
    player.st = Date.now(); // 最後一次收到狀態的時間（手機鎖螢幕、切到別的 App 就不會再送）
    player.dirty = true;
  });

  // 換房間（走進帳篷、樹屋、碼頭）：離開舊房、加入新房
  // ✨ 主人的小精靈去玩精靈家具（作者 11/20：來玩的朋友也看得到）；k＝家具的 key，null＝飛回來
  socket.on('spSpot', (data = {}) => {
    if (!player) return;
    const k = typeof data.k === 'string' && data.k.length <= 60 && roomId === 'home' && homeOwner === player.vid ? data.k : undefined;
    if (k === player.spk) return;
    player.spk = k;
    if (rkey) socket.to(rkey).emit('spSpot', { id: socket.id, k: k ?? null });
  });
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
      // 📮 誰來過我家（門口小郵筒看得到）：最近 20 位，同一個人 10 分鐘內只記一次
      if (owner !== player.vid) {
        h.visits ??= [];
        const last = h.visits[h.visits.length - 1];
        if (!(last && last.n === player.name && Date.now() - last.at < 600000)) {
          h.visits.push({ n: player.name, at: Date.now() });
          h.visits = h.visits.slice(-20);
          saveJson('homes.json', homes);
        }
      }
      if (owner === player.vid) {
        h.name = player.name; // 帳篷門口的名牌：主人最近一次用的名字
        h.at = Date.now();
        saveJson('homes.json', homes);
      }
      socket.to(rkey).emit('playerJoined', publicInfo(player));
      return ack?.({ ok: true, ...homeSnapshot() });
    }
    if (!ROOM_DEFS[next]) return ack?.({ ok: false, reason: 'unknown' });
    // 🏕️ 帳篷營地：要去哪一區（沒說就去自己帳篷那一區）
    const prevZone = campZone;
    const wantZone = next === 'campground' ? Math.floor(num(data.zone, 0, 59, homes[player.vid]?.plot?.z ?? 0)) : campZone;
    if (next === roomId && wantZone === prevZone) return ack?.({ ok: true, ...roomSnapshot(chan, curRid(), socket.id) });
    if (next === 'campground') campZone = wantZone;
    if (ensureRoom(chan, next === 'campground' ? campRid(campZone) : next).players.size >= ROOM_DEFS[next].capacity) {
      campZone = prevZone;
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
    ack?.({ ok: true, ...roomSnapshot(chan, curRid(), socket.id) });
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
  // 📣 大聲公（作者 11/12）：30 松果，全營地（所有分流、所有地方）都看得到；每人 3 分鐘一次，全營地 20 秒最多一則
  let lastShout = 0;
  // 🎲 營火桌遊：op＝invite 發起、join 加入、leave 退出、start 開始、draw 抽樹枝、blow 吹泡泡（回報現在多大、吹完了沒）
  let bgInviteAt = 0;
  socket.on('bgame', (data = {}, ack) => {
    if (!BOARD_LIVE() || !player || roomId !== 'forest_main') return ack?.({ ok: false, reason: 'off' });
    const nearFire = Math.hypot(player.x ?? 99, player.z ?? 99) < 3.4; // 要坐在營火旁
    const g = bgGames.get(rkey);
    const me = g?.players.find((p) => p.id === socket.id);
    const op = String(data.op ?? '');
    if (op === 'invite') {
      if (!nearFire) return ack?.({ ok: false, reason: 'far' });
      if (g && g.state !== 'done') return ack?.({ ok: false, reason: 'busy', game: bgView(g) });
      if (Date.now() - bgInviteAt < 8000) return ack?.({ ok: false, reason: 'tooFast' });
      const game = BOARD_GAMES.some((x) => x.id === data.game) ? data.game : 'stick';
      if (g) bgClear(g);
      bgInviteAt = Date.now();
      const ng = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, rkey, game, host: { id: socket.id, name: player.name }, state: 'invite', players: [{ id: socket.id, vid: player.vid, name: player.name }], endsAt: Date.now() + BG_INVITE_MS };
      ng.timer = setTimeout(() => bgClear(ng), BG_INVITE_MS);
      bgGames.set(rkey, ng);
      bump('bgInvite');
      bgEmit(ng);
      return ack?.({ ok: true });
    }
    if (op === 'peek') return ack?.({ ok: true, game: g ? bgView(g) : null }); // 剛走到營火：看看有沒有正在玩的
    if (!g) return ack?.({ ok: false, reason: 'none' });
    if (op === 'join') {
      if (g.state !== 'invite') return ack?.({ ok: false, reason: 'started' });
      if (!nearFire) return ack?.({ ok: false, reason: 'far' });
      if (me) return ack?.({ ok: true });
      if (g.players.length >= BG_MAX) return ack?.({ ok: false, reason: 'full' });
      if (g.players.some((p) => p.vid === player.vid)) return ack?.({ ok: false, reason: 'dup' }); // 同一個人開兩個視窗
      g.players.push({ id: socket.id, vid: player.vid, name: player.name });
      bgEmit(g);
      return ack?.({ ok: true });
    }
    if (op === 'leave') {
      bgLeave(rkey, socket.id);
      return ack?.({ ok: true });
    }
    if (op === 'start') {
      if (g.state !== 'invite' || g.host.id !== socket.id) return ack?.({ ok: false });
      if (g.players.length < BOARD_MIN) return ack?.({ ok: false, reason: 'few' });
      bgStart(g);
      return ack?.({ ok: true });
    }
    if (op === 'poke') {
      if (g.game !== 'frog' || !me) return ack?.({ ok: false });
      return ack?.({ ok: bgPoke(g, socket.id, Math.floor(num(data.hole, -1, 99, -1))) });
    }
    if (op === 'draw') {
      if (g.game !== 'stick' || !me) return ack?.({ ok: false });
      bgDraw(g, socket.id);
      return ack?.({ ok: true });
    }
    if (op === 'blow') {
      if (g.game !== 'bubble' || g.state !== 'play' || !me || me.done || me.popped) return ack?.({ ok: false });
      // 不能比「從開始一直按住」長得還大（防亂送）
      const maxNow = Math.min(1.2, ((Date.now() - g.startAt) / 1000) * BG_RATE + 0.05);
      me.size = Math.max(me.size ?? 0, Math.min(num(data.size, 0, 1.2, 0), maxNow));
      if (me.size > me.limit) me.popped = true;
      if (data.done) me.done = true;
      // 大家都吹完（或破了）就提早結束
      if (g.players.every((p) => p.done || p.popped)) bgFinish(g);
      else if (!g.emitAt || Date.now() - g.emitAt > 250 || me.popped || me.done) {
        g.emitAt = Date.now();
        bgEmit(g);
      }
      return ack?.({ ok: true, popped: me.popped });
    }
    ack?.({ ok: false });
  });
  socket.on('shout', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
    if (!text) return ack?.({ ok: false, reason: 'empty' });
    if (banOf(player.vid, 'mute')) return ack?.({ ok: false, reason: 'muted' });
    const now = Date.now();
    if (now - lastShout < SHOUT_MY_MS) return ack?.({ ok: false, reason: 'wait', sec: Math.ceil((SHOUT_MY_MS - (now - lastShout)) / 1000) });
    if (now - shoutAt < SHOUT_ALL_MS) return ack?.({ ok: false, reason: 'busy', sec: Math.ceil((SHOUT_ALL_MS - (now - shoutAt)) / 1000) });
    if (wal.pc < SHOUT_PRICE) return ack?.({ ok: false, reason: 'poor' });
    wal.pc -= SHOUT_PRICE;
    lastShout = shoutAt = now;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: -SHOUT_PRICE, reason: 'shout' });
    const msg = { name: player.name, hid: homeId(player.vid), text, at: now };
    shouts.push(msg);
    logChat({ at: now, name: player.name, hid: msg.hid, where: '📣 大聲公', ch: 0, text });
    if (shouts.length > 50) shouts.splice(0, shouts.length - 50);
    bump('shouts');
    io.emit('shout', { name: authorName(player), text, at: now });
    console.log(`[大聲公] ${player.name}：${text}`);
    ack?.({ ok: true, pc: wal.pc });
  });
  let lastSpiritChat = 0;
  socket.on('chat', (data = {}) => {
    if (!player || roomId === 'tent_focus') return;
    const now = Date.now();
    if (now - lastChat < 800) return;
    lastChat = now;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
    if (!text) return;
    const mu = banOf(player.vid, 'mute');
    if (mu) return socket.emit('muted', { until: mu.until || 0 });
    bump('chats');
    io.to(rkey).emit('chat', { id: socket.id, name: authorName(player), text });
    logChat({ at: now, name: player.name, hid: player.vid ? homeId(player.vid) : '', where: ROOM_DEFS[roomId]?.label ?? roomId, ch: chan?.ch ?? 0, text });
    // ☁️ 陪別人聊天（同一區有別人才算，每分鐘最多一次）
    if (room?.players.size > 1 && now - lastSpiritChat > 60000) (lastSpiritChat = now), spiritGain('chat');
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
    const mu = banOf(player.vid, 'mute');
    if (mu) return socket.emit('muted', { until: mu.until || 0 });
    const now = Date.now();
    if (now - lastWish < 20000) return;
    lastWish = now;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 30);
    if (!text) return;
    shared.wishes.push({ name: player.name, hid: player.vid ? homeId(player.vid) : '', text, at: now });
    spiritGain('wish'); // ⭐ 許願
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
  let lastSpiritQuest = 0;
  socket.on('quest', (data = {}, ack) => {
    const id = String(data.id ?? '');
    if (!player || !QUEST_IDS.has(id)) return ack?.({ ok: false });
    const d = today();
    d.quests ??= {};
    if (session) session.did = true;
    if (wal) wal.act = Date.now();
    if (['kuji', 'ema', 'meteor'].includes(id) && Date.now() - lastSpiritQuest > 30000) (lastSpiritQuest = Date.now()), spiritGain('wish'); // ⭐ 抽籤、繪馬、流星
    if (!questsDone.has(id) && questFirst(id)) {
      questsDone.add(id);
      award(QUEST_GAIN, 'quest');
      d.quests[id] = (d.quests[id] ?? 0) + 1;
      saveJson('stats.json', stats);
    }
    ack?.({ ok: true, n: d.quests[id] });
  });

  // 📊 新手小任務每一步走到幾個人（作者 11/12：看新朋友卡在哪一步）；同一個錢包每一步只算一次
  const KID_STEPS = ['start', 'k_fire', 'k_sit', 'k_wood', 'k_roast', 'k_fish', 'k_shop'];
  socket.on('kidStep', (data = {}) => {
    if (!wal || !player?.vid || socket.data.staff) return;
    const id = String(data.id ?? '');
    if (!KID_STEPS.includes(id)) return;
    wal.ks ??= [];
    if (wal.ks.includes(id)) return;
    wal.ks.push(id);
    const d = today();
    d.kid ??= {};
    d.kid[id] = (d.kid[id] ?? 0) + 1;
    saveJson('stats.json', stats);
  });
  // 🌱 新手小任務 6 步做完：送 20 顆松果（每個錢包一次）
  socket.on('kidDone', (_d, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (wal.kid) return ack?.({ ok: true, again: true });
    wal.kid = 1;
    { const d = today(); d.kid ??= {}; d.kid.done = (d.kid.done ?? 0) + 1; saveJson('stats.json', stats); }
    award(20, 'kid', true);
    ack?.({ ok: true });
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
    // 🪧 門牌：sign_燈籠⋯（買了就換上）
    const signId = id.startsWith('sign_') ? id.slice(5) : null;
    if (signId) {
      const sg = SIGN_BY_ID[signId];
      if (!sg || sg.pass) return ack?.({ ok: false, reason: 'unknown' });
      if (!h.tent) return ack?.({ ok: false, reason: 'noTent' });
      h.signs ??= ['wood'];
      if (h.signs.includes(signId)) return ack?.({ ok: false, reason: 'owned' });
      if (wal.pc < sg.price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      if (Date.now() - lastBuy < 800) return ack?.({ ok: false, reason: 'tooFast' });
      lastBuy = Date.now();
      wal.pc -= sg.price;
      h.signs.push(signId);
      h.sign = signId;
      saveJson('players.json', players);
      saveJson('homes.json', homes);
      bump('buys');
      socket.emit('wallet', { pc: wal.pc, delta: -sg.price, reason: 'buy' });
      return ack?.({ ok: true, pc: wal.pc, home: publicHome(h) });
    }
    // 🚙 門口擺設：yard_露營車⋯
    const yardId = id.startsWith('yard_') ? id.slice(5) : null;
    if (yardId) {
      const y = YARD_BY_ID[yardId];
      if (!y) return ack?.({ ok: false, reason: 'unknown' });
      if (!h.tent) return ack?.({ ok: false, reason: 'noTent' });
      normYard((h.yard ??= { own: [], on: null, sm: [] }));
      if (h.yard.own.includes(yardId)) return ack?.({ ok: false, reason: 'owned' });
      if (y.season === 'xmas' && !isXmasShopDay(dayKey())) return ack?.({ ok: false, reason: 'season' }); // 🎄 12/1～1/15 才賣
      if (!isOpen(y)) return ack?.({ ok: false, reason: 'later' }); // 🏮 風格系列 12/1 才開
      if (y.pass && !PASS_ON) return ack?.({ ok: false, reason: 'off' });
      if (y.pass && (passTier(wal)?.rank ?? 0) < y.pass) return ack?.({ ok: false, reason: 'needPass' });
      if (wal.pc < y.price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      if (Date.now() - lastBuy < 800) return ack?.({ ok: false, reason: 'tooFast' });
      lastBuy = Date.now();
      wal.pc -= y.price;
      h.yard.own.push(yardId);
      // 買了就擺出來：大型換掉原本的；小型還有空位就擺（滿 3 個先收在倉庫，到小舖再換）
      if (isBigYard(yardId)) h.yard.on = yardId;
      else if (isDoorYard(yardId)) h.yard.dc.push(yardId);
      else if (h.yard.sm.length < YARD_SMALL_MAX) h.yard.sm.push(yardId);
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
      if (shape.fish) return ack?.({ ok: false, reason: 'unknown' }); // 🐳 藍鯨帳篷：買不到，釣到藍鯨寶寶才有
      // 🎫 月票小屋：月票開通（PASS_ON）而且等級夠才能買；買了永久保留
      if (shape.from && dayKey() < shape.from && process.env.XMAS_TEST !== '1') return ack?.({ ok: false, reason: 'soon' }); // 🎄 還沒開賣
      if (shape.pass && !PASS_ON) return ack?.({ ok: false, reason: 'off' });
      if (shape.pass && (passTier(wal)?.rank ?? 0) < shape.pass) return ack?.({ ok: false, reason: 'needPass' });
      const cost = price;
      if (wal.pc < cost) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
      lastBuy = now;
      wal.pc -= cost;
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
    if (CATALOG_BY_ID[id]?.season === 'xmas' && !isXmasShopDay(dayKey())) return ack?.({ ok: false, reason: 'season' }); // 🎄 聖誕家具 12/1～1/15 才賣
    if (!isOpen(CATALOG_BY_ID[id])) return ack?.({ ok: false, reason: 'later' }); // 🗓️ 精靈家具 11/20 才開
    // 🎨 買的時候選的配色（0＝原色）
    const color = hasColors(CATALOG_BY_ID[id]) ? Math.floor(num(data.c, 0, ALL_COLORS.length - 1, 0)) : 0;
    // 🎫 月票家具、月票配色：月票開通（PASS_ON）而且月票有效才能買；買了永久保留
    const needRank = Math.max(CATALOG_BY_ID[id]?.pass ?? 0, ALL_COLORS[color]?.pass ?? 0);
    if (needRank && !PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (needRank && (passTier(wal)?.rank ?? 0) < needRank) return ack?.({ ok: false, reason: 'needPass' });
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    lastBuy = now;
    wal.pc -= price;
    if (id === 'tent') {
      h.tent = true;
      h.name = player.name;
      h.at = now;
      assignPlot(player.vid); // 🏕️ 分一個固定營位（最前面的空位）
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
    if (data.op === 'style' || data.op === 'shape' || data.op === 'yard' || data.op === 'sign' || data.op === 'frame') {
      const h = homes[player?.vid];
      if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
      const v = String(data.s ?? '');
      if (data.op === 'frame') {
        // 🔭 換星空圓頂屋的骨架顏色（有圓頂屋才能換，免費）
        if (!FRAME_IDS.has(v)) return ack?.({ ok: false, reason: 'unknown' });
        if (!(h.shapes ?? []).includes('stardome')) return ack?.({ ok: false, reason: 'locked' });
        h.frame = v;
      } else if (data.op === 'sign') {
        // 🪧 換門牌：買過的；星空門牌要星空月票有效
        const sg = SIGN_BY_ID[v];
        if (!sg) return ack?.({ ok: false, reason: 'unknown' });
        if (sg.pass ? passTier(wal)?.id !== sg.pass : !(h.signs ?? ['wood']).includes(v)) return ack?.({ ok: false, reason: 'locked' });
        h.sign = v;
      } else if (data.op === 'yard') {
        // 🚙 門口擺設：s＝哪一樣，on＝擺出來（true）或收起來（false）
        //    大型一次 1 個（擺新的會換掉舊的）；小型最多 3 個
        if (!YARD_BY_ID[v] || !(h.yard?.own ?? []).includes(v)) return ack?.({ ok: false, reason: 'locked' });
        const y = normYard(h.yard);
        const put = data.on !== false;
        if (isBigYard(v)) y.on = put ? v : y.on === v ? null : y.on;
        else if (isDoorYard(v)) y.dc = put ? [...new Set([...y.dc, v])] : y.dc.filter((id) => id !== v);
        else if (!put) y.sm = y.sm.filter((id) => id !== v);
        else if (!y.sm.includes(v)) {
          if (y.sm.length >= YARD_SMALL_MAX) return ack?.({ ok: false, reason: 'smallFull' });
          y.sm.push(v);
        }
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
    if (data.op === 'clearAll') {
      // 📦 一鍵全部收起（作者 11/14：想完全重來）：floor＝1 只收一樓、2 只收二樓、沒給＝全部
      const fl = Number(data.floor);
      h.items = (h.items ?? []).filter((it) => (fl === 1 ? isLoftCell(it.z) : fl === 2 ? !isLoftCell(it.z) : false));
      fixDine(h, player.vid);
      saveJson('homes.json', homes);
      saveJson('players.json', players);
      io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
      return ack?.({ ok: true, home: publicHome(h) });
    }
    const x = Number(data.x);
    const z = Number(data.z);
    if (!validCell(x, z, gridOf(h), h)) return ack?.({ ok: false, reason: 'cell' });
    // 一格可以疊好幾層（地墊→家具→小東西）；轉向、收起要指定第幾層，沒指定就是最上面那件
    const stack = stackAt(h.items, x, z);
    const lv = data.l == null ? stack.length - 1 : Math.floor(num(data.l, 0, 9, 0));
    const target = stack[lv] ?? null;
    if (data.op === 'place') {
      const i = String(data.i ?? '');
      // 作者 11/22：任務拿到的獎盃、小家具（小舖不賣）原本擺不出來 → 也認 quest
      if ((!SHOP[i] && !GIFT_FURNITURE.has(i) && !CATALOG_BY_ID[i]?.craft && !CATALOG_BY_ID[i]?.quest) || i === 'tent') return ack?.({ ok: false, reason: 'unknown' });
      const chk = stackCheck(h, x, z, i);
      if (chk.reason) return ack?.({ ok: false, reason: chk.reason });
      const c = hasColors(CATALOG_BY_ID[i]) ? Math.floor(num(data.c, 0, ALL_COLORS.length - 1, 0)) : 0;
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
    if (h.dine && (data.op === 'move' || data.op === 'remove')) {
      fixDine(h, player.vid, data.op === 'move' ? { x, z } : null, data.op === 'move' ? { x: Number(data.tx), z: Number(data.tz) } : null);
      saveJson('players.json', players);
    }
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    ack?.({ ok: true, home: publicHome(h), ...(h.dine ? dishView() : {}) });
  });
  // ---------- 🍽️ 餐桌請客（11/14 作者）：主人把料理擺上餐桌，來玩的人坐下吃一份（每人每天一份），主人 +1 松果（一天最多 10） ----------
  const dineEmit = (h) => io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
  socket.on('dinePut', (data = {}, ack) => {
    if (!wal || !player || roomId !== 'home' || homeOwner !== player.vid) return ack?.({ ok: false, reason: 'notHome' });
    const h = homes[player.vid];
    const x = Number(data.x);
    const z = Number(data.z);
    const tb = dineTableAt(h, x, z);
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!tb || !d) return ack?.({ ok: false });
    if (!(wal.dish?.[d.id] > 0)) return ack?.({ ok: false, reason: 'none' });
    h.dine ??= {};
    const list = (h.dine[`${x},${z}`] ??= []);
    if (list.length >= tb.dine) return ack?.({ ok: false, reason: 'full' });
    list.push(d.id);
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    dineEmit(h);
    ack?.({ ok: true, home: publicHome(h), ...dishView() });
  });
  socket.on('dineBack', (data = {}, ack) => {
    if (!wal || !player || roomId !== 'home' || homeOwner !== player.vid) return ack?.({ ok: false });
    const h = homes[player.vid];
    const k = `${Number(data.x)},${Number(data.z)}`;
    const list = h?.dine?.[k];
    if (!list?.length) return ack?.({ ok: false });
    wal.dish ??= {};
    for (const d of list) wal.dish[d] = (wal.dish[d] ?? 0) + 1;
    delete h.dine[k];
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    dineEmit(h);
    ack?.({ ok: true, home: publicHome(h), ...dishView() });
  });
  socket.on('dineEat', (data = {}, ack) => {
    if (!wal || !player || roomId !== 'home' || !homeOwner) return ack?.({ ok: false });
    if (homeOwner === player.vid) return ack?.({ ok: false, reason: 'mine' });
    const h = homes[homeOwner];
    const x = Number(data.x);
    const z = Number(data.z);
    const k = `${x},${z}`;
    const list = h?.dine?.[k];
    if (!dineTableAt(h, x, z) || !list?.length) return ack?.({ ok: false, reason: 'empty' });
    const d0 = dayKey();
    h.dineTook ??= {};
    if (h.dineTook[player.vid] === d0) return ack?.({ ok: false, reason: 'took' });
    for (const [v, day] of Object.entries(h.dineTook)) if (day !== d0) delete h.dineTook[v];
    h.dineTook[player.vid] = d0;
    const dish = list.shift();
    if (!list.length) delete h.dine[k];
    // 😋 跟自己吃料理一樣有飽飽效果
    const fx = DISH_FX[dish];
    if (fx) wal.buff = { k: fx[0], lv: fx[1], until: Date.now() + BUFF_MS, d: dish };
    // 主人 +1 松果（一天最多 10 顆）＋通知
    h.dineGain = h.dineGain?.d === d0 ? h.dineGain : { d: d0, n: 0 };
    const gain = h.dineGain.n < 10 ? 1 : 0;
    if (gain) {
      h.dineGain.n++;
      giveTo(homeOwner, 1, 'dine');
    }
    for (const sk of io.sockets.sockets.values()) if (sk.data.vid === homeOwner) sk.emit('dineAte', { name: player.name, dish, gain });
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    io.to(rkey).emit('ate', { id: socket.id, dish });
    dineEmit(h);
    chal('dine'); // 📒 在朋友家吃一份
    if (homeOwner !== player.vid) questEv(homeOwner, 'guest', 1, { who: player.vid, net: socketsOf(homeOwner)[0]?.data.netKey }); // 📒 主人：有人來吃（作者 11/22：原本拿吃的人自己的網路比對，永遠算「同網路」→ 一直不會加）
    ack?.({ ok: true, dish, buff: wal.buff ?? null });
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
    // 👤 at＝玩家最後改名字／外型的時間：比帳號裡的舊就不蓋掉（另一台裝置剛改過的名字才不會被這台舊的蓋回去）
    const at = Math.floor(num(data.at, 0, Date.now() + 60000, 0));
    if (wal.look?.name && at < (wal.look.at ?? 0)) return;
    noteName(wal, name);
    wal.look = { name, fur: Math.floor(num(data.fur, 0, 50, 0)), species: Math.floor(num(data.species, 0, 50, 0)), tail: TAIL_BY_ID[data.tail] ? data.tail : '', ear: EAR_BY_ID[data.ear] ? data.ear : '', at: at || wal.look?.at || 0 };
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
    // 作者 11/17：不再送松果（有人為了松果亂留言）
    console.log(`[建議] ${player.name}：${text.slice(0, 60)}`);
    ack?.({ ok: true, gain: 0 });
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
    // 🥚 假日雞蛋節的彩蛋（混在垃圾清單裡，同一套撿的方式）
    if (tr.egg) {
      io.to(trashKeys(chan, roomId)).emit('trash', { room: roomId, list: publicTrash(chan, place) });
      const gold = tr.item === 'hgold';
      if (gold) {
        giveTo(player.vid, HOL_GOLD_GAIN, 'quest');
        io.emit('holGold', { name: player.name });
      }
      chal('hegg');
      return ack?.({ ok: true, egg: true, gold, gain: gold ? HOL_GOLD_GAIN : 0 });
    }
    const r = gotTrash(wal, player.vid, tr.item);
    if (r.gain) award(r.gain, 'trash');
    saveJson('players.json', players);
    bump('trash');
    chal('trash');
    io.to(trashKeys(chan, roomId)).emit('trash', { room: roomId, list: publicTrash(chan, place), by: player.name, byId: socket.id, item: tr.item });
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
    // 🔨 11/07：選「留著做手作」→ 垃圾放進採集籃，當回收手作的材料（不換松果）
    if (data?.keep) {
      wal.bk ??= {};
      for (const [id, k] of Object.entries(wal.tbag ?? {})) if (k > 0) wal.bk[id] = (wal.bk[id] ?? 0) + k;
      wal.tbag = {};
      const d = today();
      d.recycled = (d.recycled ?? 0) + n;
      saveJson('stats.json', stats);
      saveJson('players.json', players);
      chal('recycle'); // 🎉 假日大掃除
      return ack?.({ ok: true, kept: true, n, gain: 0, basket: wal.bk, todayAll: d.recycled, allTime: totals.trash ?? 0, ...trashView(wal) });
    }
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
    chal('recycle'); // 🎉 假日大掃除
    ack?.({ ok: true, n, gain, todayAll: d.recycled, allTime: totals.trash ?? 0, ...trashView(wal) });
  });

  // 🔥 營火月票
  const hasAccount = () => !!player?.vid && Object.values(accounts).some((a) => a.vid === player.vid);
  socket.on('passInfo', (data, ack) => ack?.(wal ? { ok: true, ...passView(wal), account: hasAccount(), test: !ECPAY.prod, on: PASS_ON } : { ok: false }));
  let lastOrder = 0;
  // 🎫 月票本月造型、限定家具（作者 11/20：12/1 起贊助禮盒併進月票）：有月票的人用松果買，當月才賣
  const pmMonth = () => process.env.PASS_MONTH_TEST || dayKey().slice(0, 7); // 本機測試：PASS_MONTH_TEST=2026-12（Render 不要設）
  const passMonthOf = (data) => {
    const real = pmMonth();
    const pv = typeof data?.preview === 'string' && /^\d{4}-\d{2}$/.test(data.preview) && data.preview > real ? data.preview : null; // 👀 ?xmas=1 預覽 12 月（只能看）
    return { ym: pv ?? real, preview: !!pv };
  };
  socket.on('passMonthInfo', (data, ack) => {
    if (!wal) return ack?.({ ok: false });
    const { ym, preview } = passMonthOf(data);
    const h = homes[player?.vid];
    const lookYm = preview || process.env.PASS_MONTH_TEST ? ym : passLookMonth(isOpen({ from: '2026-11-27' }) && dayKey() < '2026-11-27' ? '2026-11-27' : dayKey()); // 💇 12 月髮型 11/27 就開賣
    const looks = passMonthLooks(OUTFITS, lookYm).map((o) => ({ id: o.id, price: o.price, own: !!wal.outfits?.includes(o.id) }));
    const furn = Object.entries(PASS_MONTH_FURN[lookYm] ?? {}).map(([id, price]) => ({ id, price, have: h?.inv?.[id] ?? 0 }));
    ack?.({ ok: true, ym, lookYm, preview, on: PASS_ON, rank: passTier(wal)?.rank ?? 0, looks, furn, tent: !!h?.tent });
  });
  let lastPm = 0;
  socket.on('passMonthBuy', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false, reason: 'noWallet' });
    if (!PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (!passTier(wal)) return ack?.({ ok: false, reason: 'needPass' });
    const ym = pmMonth();
    const id = String(data.id ?? '');
    const lookYm = process.env.PASS_MONTH_TEST ? ym : passLookMonth(isOpen({ from: '2026-11-27' }) && dayKey() < '2026-11-27' ? '2026-11-27' : dayKey());
    const look = passMonthLooks(OUTFITS, lookYm).find((o) => o.id === id);
    const fprice = PASS_MONTH_FURN[lookYm]?.[id];
    if (!look && !fprice) return ack?.({ ok: false, reason: 'notNow' });
    const price = look ? look.price : fprice;
    const h = homes[player.vid];
    if (look && wal.outfits?.includes(id)) return ack?.({ ok: false, reason: 'owned' });
    if (!look && !h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    if (!look && (h.inv[id] ?? 0) >= 20) return ack?.({ ok: false, reason: 'tooMany' });
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    const now = Date.now();
    if (now - lastPm < 800) return ack?.({ ok: false, reason: 'tooFast' });
    lastPm = now;
    wal.pc -= price;
    if (look) {
      wal.outfits ??= [];
      wal.outfits.push(id);
    } else h.inv[id] = (h.inv[id] ?? 0) + 1;
    const d = today();
    d.passBuy ??= {};
    d.passBuy[id] = (d.passBuy[id] ?? 0) + 1;
    saveJson('players.json', players);
    if (!look) saveJson('homes.json', homes);
    socket.emit('wallet', { pc: wal.pc, delta: -price, reason: 'buy' });
    console.log(`[月票本月] ${player.name} 買了 ${id}（${price} 松果）`);
    ack?.({ ok: true, pc: wal.pc, outfits: wal.outfits, home: look ? undefined : publicHome(h) });
  });
  // ☕ 贊助：這個月的假髮、能不能付款
  socket.on('sponsorInfo', (data, ack) => {
    // 👀 預覽下個月（網址 ?xmas=1 時前端帶 preview: '2026-12'）：只給看、不能付款（付款還是照真正的月份）
    const real = dayKey().slice(0, 7);
    const pv = typeof data?.preview === 'string' && /^\d{4}-\d{2}$/.test(data.preview) && data.preview > real ? data.preview : null;
    const ym = pv ?? real;
    const wigs = sponsorOutfits(ym).map((o) => o.id);
    ack?.({ ok: true, ended: ym >= SPONSOR_END || isOpen({ from: SPONSOR_END_DAY }), preview: !!pv, on: PASS_ON, test: !ECPAY.prod, amounts: sponsorAmounts(ym), min: sponsorMin(ym), box: SPONSOR_BOX[ym] ?? null, wigs, owned: wigs.filter((id) => wal?.outfits?.includes(id)), account: hasAccount(), total: wal?.spons ?? 0 });
  });
  socket.on('sponsorOrder', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (!PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (!hasAccount()) return ack?.({ ok: false, reason: 'account' });
    const amt = Number(data.amt);
    if (dayKey().slice(0, 7) >= SPONSOR_END || isOpen({ from: SPONSOR_END_DAY })) return ack?.({ ok: false, reason: 'ended' }); // 🎫 11/27 起贊助併進月票（作者 11/20）
    if (!sponsorAmounts(dayKey().slice(0, 7)).includes(amt)) return ack?.({ ok: false, reason: 'amt' });
    if (data.age !== true) return ack?.({ ok: false, reason: 'age' }); // 🔞 沒勾年齡確認不建立訂單
    const now = Date.now();
    if (now - lastOrder < 5000) return ack?.({ ok: false, reason: 'tooFast' });
    lastOrder = now;
    const no = `CS${now.toString(36)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 20).toUpperCase();
    const wigs = sponsorOutfits(dayKey().slice(0, 7)).map((o) => o.id);
    const wig = wigs.includes(data.wig) ? data.wig : wigs[0];
    const box = SPONSOR_BOX[dayKey().slice(0, 7)];
    const small = box?.small.includes(data.small) ? data.small : box?.small[0];
    const pick = data.pick === 'big' ? 'big' : 'wig';
    orders[no] = { vid: player.vid, name: player.name, amt, at: now, status: 'new', kind: 'sponsor', wig, ...(box ? { small, pick } : {}), age: { at: now, acct: acctOfVid(player.vid) }, ...(socket.data.staff ? { self: 1 } : {}) };
    saveJson('orders.json', orders);
    const proto = socket.handshake.headers['x-forwarded-proto']?.split(',')[0] || 'http';
    ack?.({ ok: true, no, url: `${proto}://${socket.handshake.headers.host}/api/pay/go/${no}` });
  });
  // 🎁 星空月票每月免費挑 1 件月票家具（放進背包，跟用松果買的一樣）
  socket.on('passFree', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    if (!PASS_ON) return ack?.({ ok: false, reason: 'off' });
    if (!freeFurnOk(wal)) return ack?.({ ok: false, reason: passTier(wal)?.id === 'star' ? 'used' : 'needPass' });
    const id = String(data.id ?? '');
    const f = CATALOG_BY_ID[id];
    if (!f?.pass || f.pass > 2) return ack?.({ ok: false, reason: 'unknown' });
    if (!isOpen(f)) return ack?.({ ok: false, reason: 'later' }); // 🎫 11/22 新月票家具 11/27 才開
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    if ((h.inv[id] ?? 0) >= 20) return ack?.({ ok: false, reason: 'tooMany' });
    const color = hasColors(f) ? Math.floor(num(data.c, 0, ALL_COLORS.length - 1, 0)) : 0;
    wal.pass.freeAt = Date.now();
    h.inv[id] = (h.inv[id] ?? 0) + 1;
    if (color) {
      // 有選顏色：跟用松果買的一樣記在 cinv（id~顏色）
      h.cinv ??= {};
      h.cinv[`${id}~${color}`] = (h.cinv[`${id}~${color}`] ?? 0) + 1;
    }
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    bump('passFree');
    console.log(`[月票] ${player.name} 星空每月免費家具：${f.zh}`);
    ack?.({ ok: true, home: publicHome(h), pass: passView(wal) });
  });
  // 🌏 國外玩家按了購買（只記次數，給作者判斷要不要申請國外卡）
  // 🌏 國外玩家想買：跳提示算一次、按「繼續付款」另外算（11/16 修：原本兩個共用 1 分鐘的限制，「繼續付款」永遠算不到）
  const lastForeign = { try: 0, go: 0 };
  socket.on('foreignTry', (data, ack) => {
    const now = Date.now();
    const k = data?.go ? 'go' : 'try';
    if (now - lastForeign[k] > 60000) {
      lastForeign[k] = now;
      bump(data?.go ? 'foreignGo' : 'foreign');
    }
    ack?.({ ok: true });
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
    // 🔥 小營火、✨ 星空 × 1 個月／3 個月；小營火還沒到期可以升級星空（補差價）
    const upgrade = !!data?.upgrade;
    const plan = PASS_PLANS[data?.plan] ?? (upgrade ? null : PASS_PLANS[`${PASS_TIERS[data?.tier] ? data.tier : 'ember'}1`]);
    const tier = upgrade ? PASS_TIERS.star : PASS_TIERS[plan.tier];
    const cur = passTier(wal);
    if (data?.age !== true) return ack?.({ ok: false, reason: 'age' }); // 🔞 沒勾年齡確認不建立訂單
    if (upgrade && cur?.id !== 'ember') return ack?.({ ok: false, reason: 'noUpgrade' });
    if (!upgrade && cur?.id === 'star' && tier.id === 'ember') return ack?.({ ok: false, reason: 'hasStar' }); // 星空期間不用再買小營火
    const amt = upgrade ? upgradePrice(wal, now) : plan.price;
    orders[no] = { vid: player.vid, name: player.name, kind: 'pass', tier: tier.id, plan: upgrade ? null : plan.id, upgrade, amt, at: now, status: 'new', age: { at: now, acct: acctOfVid(player.vid) }, ...(socket.data.staff ? { self: 1 } : {}) };
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
    const item = gatherItemAt(spot.type, isNight(), Math.random, undefined, todaySpecial().gather); // 📅 今天特別多的那種
    wal.gat[i] = now + Math.round(regrowMs());
    wal.bk ??= {};
    // 🧺 吃了「採集達人」的料理：有機會多拿一個
    const gb = activeBuff(wal.buff);
    const extra = gb?.k === 'gather' && Math.random() < gb.v ? 1 : 0;
    wal.bk[item.id] = (wal.bk[item.id] ?? 0) + 1 + extra;
    const first = discover(wal, item.id);
    let gain = 0;
    let bonus = 0;
    if (first) {
      gain = GATHER_FIRST_GAIN[item.rarity] ?? 2;
      if (!isLimited(item) && gatherDexItems().every((x) => wal.gdex[x.id])) bonus = GATHER_DEX_BONUS; // 🗓️ 每月、冬天限定不算；11/27 加的新品項也算進來（全部集滿會再送一次）
      award(gain + bonus, 'gather');
    }
    saveJson('players.json', players);
    bump('gathers');
    // 📒 任務本：抓蟲、採集、迷霧森林
    if (isBug) {
      chal('bug');
      if (item.rarity >= 2) chal('bug2');
    } else chal('gather');
    if (roomId === 'mist_forest') {
      chal('mistGather');
      if (item.type === 'mush') chal('mistMush');
      if (item.rarity >= 3) chal('mistRare');
    }
    if (first) chal('dexNew');
    spiritGain(item.type === 'mush' || roomId === 'mist_forest' ? 'mushGather' : 'gather'); // 🍄 採蘑菇、在迷霧森林採集算蘑菇
    ack?.({ ok: true, id: item.id, count: wal.bk[item.id], first, gain, bonus, extra, readyAt: wal.gat[i], now });
  });
  socket.on('giftInfo', (data, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    ack?.({ ok: true, code: homeId(player.vid), shared: !!wal.shared, refs: wal.refs ?? 0, gifts: homes[player.vid]?.gifts ?? [], gain: REF_GAIN, stay: Math.round(REF_STAY_MS / 60000), chal: chalView(), rules: { share: Math.max(1, Math.round(SHARE_STAY_MS / 60000)), date: Math.max(1, Math.round(DATE_STAY_MS / 60000)), net: Math.max(1, Math.round(SAMENET_STAY_MS / 60000)), netDaily: SAMENET_DAILY }, ...outfitView(wal) });
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
  // 🚚 搬家：搬到空的營位。第一次免費，之後 100 松果；星空月票每個月免費 2 次；A 區 1 號不能選
  socket.on('movePlot', (data = {}, ack) => {
    const vid = player?.vid;
    const h = homes[vid];
    if (!wal || !h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const z = Math.floor(num(data.z, 0, 59, -1));
    const n = Math.floor(num(data.n, 1, CAMP_PLOTS, -1));
    if (z < 0 || n < 1) return ack?.({ ok: false, reason: 'bad' });
    if (z === 0 && n === 1 && !campMeta.author) return ack?.({ ok: false, reason: 'reserved' });
    if (h.plot?.z === z && h.plot?.n === n) return ack?.({ ok: false, reason: 'same' });
    if (takenPlots().has(`${z}:${n}`)) return ack?.({ ok: false, reason: 'taken' });
    const cost = movePrice(vid);
    if (cost > 0 && wal.pc < cost) return ack?.({ ok: false, reason: 'poor', cost });
    if (cost > 0) {
      wal.pc -= cost;
      saveJson('players.json', players);
      socket.emit('wallet', { pc: wal.pc, delta: -cost, reason: 'move' });
    } else if ((h.moves ?? 0) > 0 && passTier(wal)?.id === 'star') {
      const m = dayKey().slice(0, 7);
      if (h.starMove?.m !== m) h.starMove = { m, n: 0 };
      h.starMove.n++;
    }
    h.moves = (h.moves ?? 0) + 1;
    h.plot = { z, n };
    h.at = Date.now();
    saveJson('homes.json', homes);
    ack?.({ ok: true, plot: h.plot, label: plotLabel(h.plot), cost, home: publicHome(h) });
    console.log(`[搬家] ${player.name} → ${plotLabel(h.plot)}（${cost ? cost + ' 松果' : '免費'}）`);
  });
  socket.on('movePrice', (data, ack) => ack?.({ ok: true, cost: movePrice(player?.vid) }));
  socket.on('campList', (data = {}, ack) => {
    const zone = Math.floor(num(data?.zone, 0, 59, campZone));
    const zones = zoneCounts();
    ack?.({ ok: true, zone, tents: campList(zone, player?.vid), zones, online: zoneOnline(player?.ch, Math.max(zones.length + 1, zone + 1)), mine: homes[player?.vid]?.plot ?? null, reserved: zone === 0 && !campMeta.author ? [1] : [] });
  });

  // ---------- 🏛️ 營地標本櫃：大家一起捐，寫上第一個捐的人 ----------
  const donatedToday = () => (wal?.mday === dayKey() ? wal.mcount ?? 1 : 0);
  socket.on('museumInfo', (data, ack) => ack?.({ ok: true, museum, left: wal ? Math.max(0, DONATE_PER_DAY - donatedToday()) : 0, fishDex: Object.keys(dexView(wal)), shinyDex: Object.keys(wal?.shiny ?? {}), crops: Object.keys(wal?.crops ?? {}), tbag: wal?.tbag ?? {}, tdex: Object.keys(wal?.tdex ?? {}) }));
  socket.on('donate', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const id = String(data.id ?? '');
    const it = MUSEUM_BY_ID[id];
    if (!it || !isOpen(it)) return ack?.({ ok: false, reason: 'unknown' });
    if (museum[id]) return ack?.({ ok: false, reason: 'done', by: museum[id].n });
    // 每個人每天只能捐一件：大家慢慢一起填滿
    if (donatedToday() >= DONATE_PER_DAY) return ack?.({ ok: false, reason: 'daily' });
    if (it.type === 'fish') {
      if (!(dexView(wal)[it.fish] > 0)) return ack?.({ ok: false, reason: 'none' }); // 釣過才能捐魚拓
    } else if (it.type === 'shiny') {
      if (!(wal.shiny?.[it.fish] > 0)) return ack?.({ ok: false, reason: 'none' }); // ✨ 釣過那種的異色魚
    } else if (it.type === 'trash') {
      // ♻️ 垃圾袋裡的優先，沒有再看採集籃（留著做手作的）
      const bag = wal.tbag?.[it.trash] > 0 ? wal.tbag : wal.bk?.[it.trash] > 0 ? wal.bk : null;
      if (!bag) return ack?.({ ok: false, reason: 'none' });
      bag[it.trash]--;
      if (!bag[it.trash]) delete bag[it.trash];
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
    ack?.({ ok: true, gain, count: wal.bk?.[id] ?? 0, tbag: wal.tbag ?? {}, basket: wal.bk ?? {}, left: Math.max(0, DONATE_PER_DAY - donatedToday()) });
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
    // 🍖 自家門口有烤肉爐：在帳篷營地也能煮（烤肉爐限定的料理只能在這裡做）
    const atGrill = roomId === 'campground' && hasYard(homes[player.vid], 'bbq');
    // 🍳 11/14：自己帳篷裡有瓦斯爐／灶台（stove）或小烤箱（oven）也能煮
    const at = data.at === 'oven' ? 'oven' : data.at === 'stove' ? 'stove' : null;
    const atHome = !!at && roomId === 'home' && homeOwner === player.vid && (homes[player.vid]?.items ?? []).some((it) => CATALOG_BY_ID[it.i]?.cook === at);
    if (roomId !== 'forest_main' && !atGrill && !atHome) return ack?.({ ok: false, reason: 'notHere' });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d) return ack?.({ ok: false, reason: 'unknown' });
    if (atHome && !homeCanCook(d, at)) return ack?.({ ok: false, reason: at === 'oven' ? 'oven' : 'grill' });
    if (d.grill && !atGrill) return ack?.({ ok: false, reason: 'grill' });
    if (d.month && d.month !== taipeiMonth()) return ack?.({ ok: false, reason: 'season' }); // 🗓️ 每月限定
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
    if (d.need.length >= 3) chal('cook3');
    chal('cookKind', 1, { who: `dish:${d.id}` }); // 📒 煮不同的料理
    spiritGain('cook');
    io.to(rkey).emit('cooked', { id: socket.id, name: player.name, dish: d.id });
    // 🍲 大菜（營火大鍋菜、營火麻辣鍋）：附近 6 公尺內的每個人都分到一份
    let shared = 0;
    if (d.big) {
      for (const p of room?.players.values() ?? []) {
        const pw = p.vid && players[p.vid];
        const ps = io.sockets.sockets.get(p.id);
        if (p.id === socket.id || !pw || !ps || Math.hypot(p.x - player.x, p.z - player.z) > 6) continue;
        pw.dish ??= {};
        pw.dish[d.id] = (pw.dish[d.id] ?? 0) + 1;
        ps.emit('dishGift', { from: player.name, fromId: socket.id, dish: d.id, dishes: pw.dish, share: true });
        shared++;
      }
      if (shared) saveJson('players.json', players);
    }
    ack?.({ ok: true, first, gain, shared, basket: wal.bk, ...dishView() });
  });
  let lastEat = 0;
  // 🗑️ 背包丟掉（作者 11/20：黑暗料理太多了）：料理、採集籃選數量丟；kind 'dark'＝黑暗料理一次丟 n 份（數量多的先丟）。不給松果
  socket.on('discard', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const kind = String(data.kind ?? '');
    let n = Math.floor(Number(data.n) || 0);
    if (n <= 0) return ack?.({ ok: false });
    let gone = 0;
    if (kind === 'dark') {
      const list = Object.keys(wal.dish ?? {})
        .filter((id) => DISH_BY_ID[id]?.dark && wal.dish[id] > 0)
        .sort((a, b) => wal.dish[b] - wal.dish[a]);
      for (const id of list) {
        if (n <= 0) break;
        const k = Math.min(n, wal.dish[id]);
        wal.dish[id] -= k;
        if (!wal.dish[id]) delete wal.dish[id];
        n -= k;
        gone += k;
      }
    } else {
      const bag = kind === 'dish' ? wal.dish : kind === 'bk' ? wal.bk : null;
      const id = String(data.id ?? '');
      if (!bag || !Object.hasOwn(bag, id) || !(bag[id] > 0)) return ack?.({ ok: false });
      gone = Math.min(n, bag[id]);
      bag[id] -= gone;
      if (!bag[id]) delete bag[id];
    }
    if (!gone) return ack?.({ ok: false });
    saveJson('players.json', players);
    console.log(`[丟掉] ${player.name} 丟了 ${kind} ${data.id ?? ''} ×${gone}`);
    ack?.({ ok: true, gone, basket: wal.bk ?? {}, ...dishView() });
  });
  socket.on('eat', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d || !(wal.dish?.[d.id] > 0)) return ack?.({ ok: false });
    const now = Date.now();
    if (now - lastEat < 1500) return ack?.({ ok: false, reason: 'tooFast' });
    lastEat = now;
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    // 😋 飽飽小效果：10 分鐘，一次一種（吃新的換掉舊的）
    const fx = DISH_FX[d.id];
    if (fx) wal.buff = { k: fx[0], lv: fx[1], until: now + BUFF_MS, d: d.id };
    saveJson('players.json', players);
    io.to(rkey).emit('ate', { id: socket.id, dish: d.id });
    ack?.({ ok: true, buff: wal.buff ?? null, ...dishView() });
  });
  // ---------- 🍳 自由料理鍋（11/19）----------
  const potView = () => ({ fk: wal?.fk ?? {}, sea: wal?.sea ?? {}, basket: wal?.bk ?? {}, tbag: wal?.tbag ?? {}, fc: wal?.fc ?? {}, crops: wal?.crops ?? {}, cnt: wal?.cnt ?? {}, pc: wal?.pc ?? 0, ...dishView() });
  socket.on('potInfo', (data, ack) => ack?.(wal ? { ok: true, ...potView() } : { ok: false }));
  // 🍡 烤棉花糖幾次、烤焦幾次（解鎖隱藏食譜用；前端吃掉一顆就回報，最快 5 秒一次）
  let lastRoastAt = 0;
  socket.on('roasted', (data = {}) => {
    if (!wal || roomId !== 'forest_main') return;
    const now = Date.now();
    if (now - lastRoastAt < 5000) return;
    lastRoastAt = now;
    wal.cnt ??= {};
    wal.cnt.roast = (wal.cnt.roast ?? 0) + 1;
    if (data.burnt) wal.cnt.burnt = (wal.cnt.burnt ?? 0) + 1;
    saveJson('players.json', players);
  });
  // 🧂 買調味料：5 顆松果一包，一包用 5 次
  socket.on('buySeason', (data = {}, ack) => {
    if (!wal || !isOpen({ from: '2026-11-19' })) return ack?.({ ok: false, reason: 'later' }); // 🗓️ 11/20 跟小精靈更新一起開
    const s = SEASON_BY_ID[String(data.id ?? '')];
    if (!s) return ack?.({ ok: false });
    wal.sea ??= {};
    if ((wal.sea[s.id] ?? 0) + SEASON_USES > SEASON_CAP) return ack?.({ ok: false, reason: 'full' });
    if (wal.pc < SEASON_PRICE) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= SEASON_PRICE;
    wal.sea[s.id] = (wal.sea[s.id] ?? 0) + SEASON_USES;
    saveJson('players.json', players);
    bump('buys');
    socket.emit('wallet', { pc: wal.pc, delta: -SEASON_PRICE, reason: 'buy' });
    ack?.({ ok: true, ...potView() });
  });
  socket.on('potCook', (data = {}, ack) => {
    if (!wal || !player || !isOpen({ from: '2026-11-19' })) return ack?.({ ok: false, reason: 'later' }); // 🗓️ 11/20 才開
    const atGrill = roomId === 'campground' && hasYard(homes[player.vid], 'bbq');
    const atHome = roomId === 'home' && homeOwner === player.vid && (homes[player.vid]?.items ?? []).some((it) => CATALOG_BY_ID[it.i]?.cook);
    if (roomId !== 'forest_main' && !atGrill && !atHome) return ack?.({ ok: false, reason: 'notHere' });
    const items = (Array.isArray(data.items) ? data.items : []).slice(0, POT_MAX + 1).map(String);
    if (!items.length || items.length > POT_MAX || items.some((x) => !parseToken(x))) return ack?.({ ok: false, reason: 'bad' });
    const sea = {};
    let seaN = 0;
    for (const [k, v] of Object.entries(data.sea ?? {})) {
      const n = Math.floor(num(v, 0, SEASON_MAX, 0));
      if (!SEASON_BY_ID[k] || !n) continue;
      sea[k] = n;
      seaN += n;
    }
    if (seaN > SEASON_MAX) return ack?.({ ok: false, reason: 'bad' });
    // 夠不夠
    const want = {};
    for (const x of items) want[x] = (want[x] ?? 0) + 1;
    const bagOf = (tok) => {
      const [k, id] = tok.split(':');
      return k === 'f' ? [(wal.fk ??= {}), id] : k === 't' ? [(wal.tbag ??= {}), id] : [(wal.bk ??= {}), id];
    };
    for (const [tok, n] of Object.entries(want)) {
      const [bag, id] = bagOf(tok);
      if ((bag[id] ?? 0) < n) return ack?.({ ok: false, reason: 'need' });
    }
    for (const [k, n] of Object.entries(sea)) if ((wal.sea?.[k] ?? 0) < n) return ack?.({ ok: false, reason: 'sea' });
    const r = potResult(items, sea, wal);
    if (!r) return ack?.({ ok: false, reason: 'bad' });
    // 扣掉材料、魚、調味料
    for (const [tok, n] of Object.entries(want)) {
      const [bag, id] = bagOf(tok);
      bag[id] -= n;
      if (bag[id] <= 0) delete bag[id];
    }
    for (const [k, n] of Object.entries(sea)) {
      wal.sea[k] -= n;
      if (wal.sea[k] <= 0) delete wal.sea[k];
    }
    wal.dish ??= {};
    wal.dish[r.id] = (wal.dish[r.id] ?? 0) + 1;
    wal.cooked ??= {};
    const firstDish = !wal.cooked[r.id];
    // 第一次做出這道（不管口味、哪種魚）送松果：隱藏 10、一般／求生 3、家常／黑暗 1
    const key = r.dark ? `p.d_${r.dark}` : `p.${r.recipe.id}`;
    const firstKind = !Object.keys(wal.cooked).some((k) => k === key || k.startsWith(key + '.') || k.startsWith(key + '~'));
    wal.cooked[r.id] = (wal.cooked[r.id] ?? 0) + 1;
    const kind = r.recipe?.kind ?? '';
    const gain = firstKind ? (r.dark ? 1 : kind === 'hidden' || kind === 'unlock' ? 10 : r.recipe.basic ? 1 : 3) : 0;
    if (gain) award(gain, 'cook');
    // 😵 煮失敗（黑暗料理）10 次：送「灰頭土臉」造型（作者 11/19）
    if (r.dark) {
      wal.cnt ??= {};
      wal.cnt.dark = (wal.cnt.dark ?? 0) + 1;
      if (wal.cnt.dark >= SOOTY_AT) grantOutfit(player.vid, 'sooty', 'cook');
    }
    saveJson('players.json', players);
    bump('cooks');
    if (items.length >= 3) chal('cook3');
    if (!r.dark) chal('cookKind', 1, { who: `dish:${r.id}` }); // 📒 煮不同的料理
    if (!r.dark && items.some((x) => /:(gold_)?egg$/.test(x))) chal('eggCook'); // 📒 用雞蛋煮
    spiritGain('cook');
    io.to(rkey).emit('cooked', { id: socket.id, name: player.name, dish: r.id });
    if (r.recipe && POT_BY_ID[r.recipe.id] && (kind === 'hidden' || kind === 'unlock') && firstKind) console.log(`[料理] ${player.name} 第一次煮出隱藏食譜 ${r.recipe.zh}`);
    ack?.({ ok: true, dish: r.id, first: firstDish, firstKind, gain, locked: r.locked?.id ?? null, ...potView() });
  });
  // 🌟 看到森林傳說：記次數，第一次送松果（同一次經過只算一次）
  let lastLegend = null;
  socket.on('legendSeen', (data = {}, ack) => {
    const lg = rkey && legendNow.get(rkey);
    if (!wal || !lg || lg.id !== data.id || lastLegend === lg) return ack?.({ ok: false });
    lastLegend = lg;
    wal.lg ??= {};
    const first = !wal.lg[lg.id];
    wal.lg[lg.id] = (wal.lg[lg.id] ?? 0) + 1;
    if (first) award(LEGEND_GAIN, 'legend');
    saveJson('players.json', players);
    bump('legends');
    chal('legend'); // 📒
    ack?.({ ok: true, first, gain: first ? LEGEND_GAIN : 0, lg: wal.lg });
  });
  socket.on('legendInfo', (data, ack) => ack?.({ ok: !!wal, lg: wal?.lg ?? {} }));
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

  // ---------- ✨ 小精靈 ----------
  // ☁️ 休息（坐著、睡覺、裹毯子滿 1 分鐘）、⭐ 看星星：前端回報，每 50 秒最多一次
  let lastSpiritAct = 0;
  socket.on('spiritAct', (data = {}) => {
    const k = data.k === 'rest' || data.k === 'stargaze' ? data.k : null;
    const now = Date.now();
    if (!k || now - lastSpiritAct < 50000) return;
    lastSpiritAct = now;
    spiritGain(k);
  });
  // 🎮 跟小精靈玩完小遊戲：每種一天 3 次，加一點親密度（遊戲要是現在帶著的那種）
  let lastPlay = 0;
  socket.on('spiritPlay', (data = {}, ack) => {
    const sp = spiritOf();
    if (!sp) return ack?.({ ok: false });
    const st = spiritStage(sp.xp);
    const gk = st ? (sp.t ?? 'leaf') : 'light';
    if (String(data.g) !== gk) return ack?.({ ok: false, reason: 'kind' });
    const now = Date.now();
    if (now - lastPlay < 10000) return ack?.({ ok: false, reason: 'tooFast' });
    lastPlay = now;
    const d = dayKey();
    if (sp.day?.d !== d) sp.day = { d, xp: 0, feed: 0 };
    sp.day.play ??= {};
    if ((sp.day.play[gk] ?? 0) >= SPIRIT_PLAY_DAY) return ack?.({ ok: false, reason: 'full', sp: spiritView() });
    sp.day.play[gk] = (sp.day.play[gk] ?? 0) + 1;
    const before = sp.xp;
    bump('spiritPlay');
    chal('spiritPlay'); // 📒
    spiritGain('play');
    saveJson('players.json', players);
    ack?.({ ok: true, gain: sp.xp - before, sp: spiritView() });
  });
  // 🎄 小精靈配件：買（季節限定、松果）、戴／拿下
  socket.on('spiritAcc', (data = {}, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    const a = (wal.spiritAcc ??= { own: [], wear: '' });
    a.own ??= [];
    const id = String(data.id ?? '');
    if (data.op === 'buy') {
      const x = SPIRIT_ACC_BY_ID[id];
      if (!x) return ack?.({ ok: false });
      if (a.own.includes(id)) return ack?.({ ok: false, reason: 'have' });
      if ((x.season === 'xmas' && !isXmasShopDay(dayKey())) || !isOpen(x)) return ack?.({ ok: false, reason: 'season' });
      if (wal.pc < x.price) return ack?.({ ok: false, reason: 'poor' });
      wal.pc -= x.price;
      a.own.push(id);
      // 買了直接戴在身邊這隻（其他隻不變；還沒有小精靈就記在共用的）
      const cur = spiritOf();
      if (x.slot === 'wing') cur ? (cur.wg = id) : (a.wing = id); // 🦋 翅膀另外一格
      else cur ? (cur.acc = id) : (a.wear = id);
      socket.emit('wallet', { pc: wal.pc, delta: -x.price, reason: 'spiritAcc' });
      bump('spiritAcc');
    } else if (data.op === 'wear') {
      if (id && !a.own.includes(id)) return ack?.({ ok: false });
      const cur = spiritOf(); // 只換身邊這隻
      if (data.slot === 'wing' || SPIRIT_ACC_BY_ID[id]?.slot === 'wing') cur ? (cur.wg = id) : (a.wing = id); // 🦋 翅膀（id 空的＝拿掉翅膀配色）
      else cur ? (cur.acc = id) : (a.wear = id);
    } else return ack?.({ ok: false });
    saveJson('players.json', players);
    spiritSync();
    ack?.({ ok: true, sp: spiritView() });
  });
  socket.on('spiritInfo', (_d, ack) => ack?.(wal ? { ok: true, sp: spiritView(), dish: wal.dish ?? {} } : { ok: false }));
  socket.on('spiritFeed', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const d = DISH_BY_ID[String(data.id ?? '')];
    if (!d || !(wal.dish?.[d.id] > 0)) return ack?.({ ok: false, reason: 'none' });
    const sp = spiritOf();
    if (!sp) return ack?.({ ok: false, reason: 'noSpirit' });
    const day = dayKey();
    if (sp.day?.d !== day) sp.day = { d: day, xp: 0, feed: 0 };
    if (sp.day.feed >= SPIRIT_FEED_DAY) return ack?.({ ok: false, reason: 'full' });
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    sp.day.feed++;
    const st = spiritStage(sp.xp);
    const fav = st > 0 && SPIRIT_FAV[sp.t ?? 'leaf']?.includes(d.id);
    saveJson('players.json', players);
    io.to(rkey).emit('spiritAte', { id: socket.id, dish: d.id, fav });
    spiritGain(null, fav ? SPIRIT_FAV_XP : SPIRIT_FEED_XP);
    ack?.({ ok: true, fav, sp: spiritView(), ...dishView() });
  });
  socket.on('spiritForm', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const t = String(data.t ?? '');
    const sp = spiritOf();
    if (!sp || !SPIRIT_KINDS.includes(t)) return ack?.({ ok: false });
    if (spiritStage(sp.xp) < 2) return ack?.({ ok: false, reason: 'young' });
    if (sp.t === t) return ack?.({ ok: false, reason: 'same' });
    if (wal.pc < SPIRIT_CHANGE_PRICE) return ack?.({ ok: false, reason: 'poor' });
    wal.pc -= SPIRIT_CHANGE_PRICE;
    sp.t = t;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: -SPIRIT_CHANGE_PRICE, reason: 'spirit' });
    bump('spiritForm');
    spiritSync();
    ack?.({ ok: true, sp: spiritView() });
  });
  socket.on('spiritEgg', (_d, ack) => {
    if (!wal || !player?.vid) return ack?.({ ok: false });
    // 第一顆：100 松果，買了馬上孵出來、直接跟在身邊
    if (!spiritOf()) {
      if (wal.pc < SPIRIT_FIRST_PRICE) return ack?.({ ok: false, reason: 'poor' });
      wal.pc -= SPIRIT_FIRST_PRICE;
      wal.spirit = { xp: 0, c: {}, own: true, last: Date.now(), away: 0 };
      saveJson('players.json', players);
      socket.emit('wallet', { pc: wal.pc, delta: -SPIRIT_FIRST_PRICE, reason: 'egg' });
      bump('spiritFirst');
      spiritSync();
      return ack?.({ ok: true, first: true, sp: spiritView() });
    }
    if (wal.egg) return ack?.({ ok: false, reason: 'egg' });
    if (1 + (wal.spiritBox?.length ?? 0) >= SPIRIT_MAX) return ack?.({ ok: false, reason: 'max' });
    if (wal.pc < SPIRIT_EGG_PRICE) return ack?.({ ok: false, reason: 'poor' });
    wal.pc -= SPIRIT_EGG_PRICE;
    wal.egg = { at: Date.now() + SPIRIT_EGG_MS };
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: -SPIRIT_EGG_PRICE, reason: 'egg' });
    bump('spiritEgg');
    checkEgg();
    ack?.({ ok: true, sp: spiritView() });
  });
  /** 換一隻小精靈帶在身邊（原本的收起來） */
  socket.on('spiritPick', (data = {}, ack) => {
    if (!wal || !player) return ack?.({ ok: false });
    const i = Math.floor(Number(data.i));
    const box = wal.spiritBox ?? [];
    if (!(i >= 0 && i < box.length)) return ack?.({ ok: false });
    const cur = spiritOf();
    if (!cur) return ack?.({ ok: false });
    const next = box[i];
    next.c ??= {};
    next.own = true;
    next.off = false;
    delete cur.off;
    box[i] = cur;
    next.last = cur.last;
    wal.spirit = next;
    saveJson('players.json', players);
    spiritSync();
    homeSpiritsSync();
    ack?.({ ok: true, sp: spiritView() });
  });
  /** ✏️ 幫小精靈取名字（最多 8 個字） */
  socket.on('spiritName', (data = {}, ack) => {
    const sp = spiritOf();
    if (!sp) return ack?.({ ok: false });
    sp.nm = String(data.nm ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 8);
    saveJson('players.json', players);
    spiritSync();
    ack?.({ ok: true, sp: spiritView() });
  });
  socket.on('spiritHide', (data = {}, ack) => {
    const sp = spiritOf();
    if (!sp) return ack?.({ ok: false });
    sp.off = !!data.off;
    saveJson('players.json', players);
    spiritSync();
    ack?.({ ok: true, sp: spiritView() });
  });

  // ---------- 🥕 帳篷前的小菜園 ----------
  const gardenInfo = (owner) => {
    const h = homes[owner];
    const me = homeId(player.vid);
    return {
      ok: true,
      now: Date.now(),
      mine: owner === player.vid,
      max: gardenMax(),
      next: gardenSlotsOf(h) < gardenMax() ? GARDEN_EXPAND[gardenSlotsOf(h) + 1] : null,
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
    if (!c || !isOpen(c)) return ack?.({ ok: false, reason: 'unknown' }); // 🌾 新蔬菜 11/27 才開
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
    chal('plant'); // 📒
    ack?.(gardenInfo(player.vid));
  });
  // 🌱 全部空格一次種同一種（作者 11/20）：種子錢 × 空格數
  socket.on('gardenPlantAll', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const c = CROP_BY_ID[String(data.c ?? '')];
    if (!c || !isOpen(c)) return ack?.({ ok: false, reason: 'unknown' });
    h.garden ??= [];
    // 作者 11/22：可以只種勾選的那幾格（idx）；沒帶就是全部空格
    const pickIdx = Array.isArray(data.idx) ? new Set(data.idx.map(Number)) : null;
    const empty = [];
    for (let i = 0; i < gardenSlotsOf(h); i++) if (!h.garden[i]?.c && (!pickIdx || pickIdx.has(i))) empty.push(i);
    if (!empty.length) return ack?.({ ok: false, reason: 'busy' });
    const cost = c.seed * empty.length;
    if (wal.pc < cost) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= cost;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    const now = Date.now();
    for (const i of empty) h.garden[i] = { c: c.id, at: now, w: [] };
    saveJson('homes.json', homes);
    bump('plants', empty.length);
    chal('plant', empty.length); // 📒
    ack?.({ ...gardenInfo(player.vid), n: empty.length });
  });
  // ➕ 開墾菜園：多一格（最多 6 格），越後面越貴
  socket.on('gardenExpand', (data, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const n = gardenSlotsOf(h);
    if (n >= gardenMax()) return ack?.({ ok: false, reason: 'max' }); // 11/27 起 9 格
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
    if (c.night && !isNight()) return ack?.({ ok: false, reason: 'night' }); // 🌙 月光白蘿蔔：只能晚上收
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
    chal('harvest');
    chal('harvestCell'); // 📒
    spiritGain('harvest');
    ack?.({ ...gardenInfo(player.vid), got: { id: c.id, n }, first, gain: first ? CROP_FIRST_GAIN : 0, basket: wal.bk });
  });
  // 🧺 一次收成全部長好的（作者 11/21）：跟一格一格收一樣的規則（澆過水多 1 個、月光白蘿蔔白天不收、第一次收成送松果）
  socket.on('gardenHarvestAll', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const h = homes[player.vid];
    if (!h?.garden) return ack?.({ ok: false, reason: 'empty' });
    const now = Date.now();
    const got = {};
    let gain = 0;
    let skipNight = 0;
    const slots = [];
    h.garden.forEach((sl, i) => {
      if (i >= gardenSlotsOf(h) || !sl?.c || now < readyAtOf(sl)) return;
      const c = CROP_BY_ID[sl.c];
      if (!c) return;
      if (c.night && !isNight()) return void skipNight++;
      const n = c.yield[0] + Math.floor(Math.random() * (c.yield[1] - c.yield[0] + 1)) + (sl.w?.length ? 1 : 0);
      h.garden[i] = null;
      slots.push(i);
      wal.bk ??= {};
      wal.bk[c.id] = (wal.bk[c.id] ?? 0) + n;
      wal.crops ??= {};
      if (!wal.crops[c.id]) (gain += CROP_FIRST_GAIN), award(CROP_FIRST_GAIN, 'harvest');
      wal.crops[c.id] = (wal.crops[c.id] ?? 0) + n;
      got[c.id] = (got[c.id] ?? 0) + n;
      bump('harvests');
      chal('harvest');
      chal('harvestCell'); // 📒
      spiritGain('harvest');
    });
    if (!slots.length) return ack?.({ ok: false, reason: skipNight ? 'night' : 'notYet' });
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    ack?.({ ...gardenInfo(player.vid), got, slots, gain, skipNight, basket: wal.bk });
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
    chal('water', 1, { who: owner }); // 📒 幫朋友澆水（每週要不同的人）
    for (const s2 of io.sockets.sockets.values()) if (s2.data.vid === owner) s2.emit('gardenWatered', { name: player.name, c: sl.c });
    ack?.(gardenInfo(owner));
  });
  // ---------- 🐔 小肥雞（11/27 開）：菜園旁邊的雞舍 ----------
  const henInfo = (owner) => {
    const h = homes[owner];
    const now = Date.now();
    const today = dayKey();
    return {
      ok: true,
      open: isOpen({ from: HEN_FROM }),
      mine: owner === player.vid,
      max: HEN_MAX,
      price: h?.hens?.length ? HEN_PRICE : COOP_PRICE,
      hens: (h?.hens ?? []).map((x) => (henMigrate(x, now), { c: x.c, nm: x.nm ?? '', fed: x.fed ?? 0, fat: fatOf(x.fed), next: fatNext(x.fed), eggs: eggsOf(x, now), eggIn: eggIn(x, now), wait: feedWait(x, now), fn: x.fd === today ? (x.fn ?? 0) : 0 })),
    };
  };
  socket.on('henInfo', (data = {}, ack) => {
    if (!player?.vid) return ack?.({ ok: false });
    const owner = ownerOf(data.hid);
    if (!homes[owner]?.tent) return ack?.({ ok: false, reason: 'noTent' });
    ack?.(henInfo(owner));
  });
  socket.on('henBuy', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    if (!isOpen({ from: HEN_FROM })) return ack?.({ ok: false, reason: 'later' });
    const h = homes[player.vid];
    if (!h?.tent) return ack?.({ ok: false, reason: 'noTent' });
    h.hens ??= [];
    if (h.hens.length >= HEN_MAX) return ack?.({ ok: false, reason: 'max' });
    const c = HEN_COLORS.some((x) => x.id === data.c) ? data.c : 0;
    const price = h.hens.length ? HEN_PRICE : COOP_PRICE;
    if (wal.pc < price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    wal.pc -= price;
    h.hens.push({ c, nm: '', fed: 0, eg: [], v: 3 });
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    bump('buys');
    console.log(`[小肥雞] ${player.name} 養了第 ${h.hens.length} 隻`);
    ack?.(henInfo(player.vid));
  });
  socket.on('henName', (data = {}, ack) => {
    const hen = homes[player?.vid]?.hens?.[Math.floor(num(data.i, 0, HEN_MAX - 1, 0))];
    if (!hen) return ack?.({ ok: false });
    hen.nm = String(data.nm ?? '').replace(/[<>&"']/g, '').trim().slice(0, 8);
    saveJson('homes.json', homes);
    ack?.(henInfo(player.vid));
  });
  // 🍞 餵蔬菜或果實：每隻一天 3 次，越餵越圓
  socket.on('henFeed', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const hen = homes[player.vid]?.hens?.[Math.floor(num(data.i, 0, HEN_MAX - 1, 0))];
    const id = String(data.id ?? '');
    if (!hen || !canFeed(materialOf(id))) return ack?.({ ok: false });
    if (!(wal.bk?.[id] > 0)) return ack?.({ ok: false, reason: 'none' });
    const today = dayKey();
    if (hen.fd !== today) {
      hen.fd = today;
      hen.fn = 0;
    }
    if (hen.fn >= FEED_PER_DAY) return ack?.({ ok: false, reason: 'full' });
    // 作者 11/22：同一隻隔 1 小時才能再餵；餵一次 1 小時後下一顆蛋（沒餵不下蛋）
    const now = Date.now();
    henMigrate(hen, now);
    const wait = feedWait(hen, now);
    if (wait > 0) return ack?.({ ok: false, reason: 'wait', wait });
    const before = fatOf(hen.fed);
    hen.fn++;
    hen.fed = (hen.fed ?? 0) + 1;
    hen.lf = now;
    layOnFeed(hen, now);
    wal.bk[id]--;
    if (!wal.bk[id]) delete wal.bk[id];
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    chal('henfeed'); // 📒
    ack?.({ ...henInfo(player.vid), basket: wal.bk, up: fatOf(hen.fed) > before ? fatOf(hen.fed) : 0 });
  });
  // 🥚 撿蛋：全部的雞一起撿；1% 是金蛋
  socket.on('henEggs', (data, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    const hens = homes[player.vid]?.hens ?? [];
    const now = Date.now();
    let egg = 0;
    let gold = 0;
    for (const x of hens) {
      henMigrate(x, now);
      const n = eggsOf(x, now);
      if (!n) continue;
      for (let k = 0; k < n; k++) Math.random() < GOLD_EGG ? gold++ : egg++;
      x.eg = x.eg.filter((t) => t > now); // 還沒下的留著
    }
    if (!egg && !gold) return ack?.({ ok: false, reason: 'none' });
    wal.bk ??= {};
    if (egg) wal.bk.egg = (wal.bk.egg ?? 0) + egg;
    if (gold) wal.bk.gold_egg = (wal.bk.gold_egg ?? 0) + gold;
    wal.cnt ??= {};
    wal.cnt.eggs = (wal.cnt.eggs ?? 0) + egg + gold;
    saveJson('players.json', players);
    saveJson('homes.json', homes);
    bump('eggs');
    chal('egg', egg + gold); // 📒 撿雞蛋（每日 1 次就算、每週算顆數）
    if (gold) console.log(`[小肥雞] ${player.name} 撿到金蛋 ×${gold}`);
    ack?.({ ...henInfo(player.vid), got: { egg, gold }, basket: wal.bk });
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
    if (banOf(player.vid, 'mute')) return ack?.({ ok: false, reason: 'muted' });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!text) return ack?.({ ok: false, reason: 'empty' });
    const now = Date.now();
    if (now - lastHomeNote < 15000) return ack?.({ ok: false, reason: 'tooFast' });
    lastHomeNote = now;
    h.notes ??= [];
    h.notes.push({ n: player.name, v: player.vid ? homeId(player.vid) : '', t: text, at: now });
    h.notes = h.notes.slice(-30);
    saveJson('homes.json', homes);
    io.to(rkey).emit('homeUpdate', { owner: homeId(homeOwner), home: publicHome(h) });
    if (homeOwner !== player.vid) chal('note', 1, { who: homeOwner }); // 📒 去朋友帳篷留言
    ack?.({ ok: true });
  });
  // 🗑️ 主人刪掉自己帳篷留言本的一則（作者 11/16：有人在作者的留言本亂寫）
  // ⚠️ 玩家看完警告（按了「我知道了」）
  socket.on('warnSeen', (_d, ack) => {
    const w = player?.vid && players[player.vid];
    if (w?.warnPending) {
      delete w.warnPending;
      saveJson('players.json', players);
    }
    ack?.({ ok: true });
  });

  socket.on('homeNoteDel', (data = {}, ack) => {
    const h = player?.vid && homes[player.vid];
    if (!h?.notes) return ack?.({ ok: false });
    const at = Number(data.at);
    const before = h.notes.length;
    h.notes = h.notes.filter((x) => x.at !== at);
    if (h.notes.length === before) return ack?.({ ok: false });
    saveJson('homes.json', homes);
    io.to(`home:${player.vid}`).emit('homeUpdate', { owner: homeId(player.vid), home: publicHome(h) });
    ack?.({ ok: true });
  });

  // ---------- 🚙 門口擺設的功能（帳篷營地） ----------
  /** 某頂帳篷的門口擺設資訊：主人、擺了什麼、野餐桌上的料理、我今天拿過了沒 */
  socket.on('yardInfo', (data = {}, ack) => {
    const owner = vidOfHid(String(data.hid ?? ''));
    const h = owner && homes[owner];
    if (!h?.tent) return ack?.({ ok: false });
    const pic = h.picnic?.d && h.picnic.n > 0 ? { dish: h.picnic.d, n: h.picnic.n, took: h.picnic.took?.[player?.vid] === dayKey() } : null;
    ack?.({ ok: true, mine: owner === player?.vid, name: h.name ?? '', yard: normYard(h.yard)?.on ?? null, sm: h.yard?.sm ?? [], picnic: pic });
  });
  // 📮 小郵筒：主人看誰來過、大家的留言；別人可以在郵筒留一句話
  socket.on('mailbox', (data, ack) => {
    const h = homes[player?.vid];
    if (!h?.tent) return ack?.({ ok: false });
    ack?.({ ok: true, visits: (h.visits ?? []).slice().reverse(), notes: (h.notes ?? []).slice().reverse() });
  });
  socket.on('yardNote', (data = {}, ack) => {
    if (!player || roomId !== 'campground') return ack?.({ ok: false });
    const owner = vidOfHid(String(data.hid ?? ''));
    const h = owner && homes[owner];
    if (!h?.tent || !hasYard(h, 'mailbox') || owner === player.vid) return ack?.({ ok: false });
    if (banOf(player.vid, 'mute')) return ack?.({ ok: false, reason: 'muted' });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!text) return ack?.({ ok: false, reason: 'empty' });
    const now = Date.now();
    if (now - lastHomeNote < 15000) return ack?.({ ok: false, reason: 'tooFast' });
    lastHomeNote = now;
    h.notes ??= [];
    h.notes.push({ n: player.name, v: player.vid ? homeId(player.vid) : '', t: text, at: now });
    h.notes = h.notes.slice(-30);
    saveJson('homes.json', homes);
    ack?.({ ok: true });
  });
  // 🧺 野餐桌：主人把料理放上桌（同一種最多 5 份），路過的人每天能拿一份
  //    🧊 帳篷裡的小冰箱也一樣（where: 'fridge'）：主人放料理進去，來玩的客人每天能拿一份
  const hasFridge = (h) => (h?.items ?? []).some((it) => it.i === 'fridge');
  socket.on('picnicPut', (data = {}, ack) => {
    const h = homes[player?.vid];
    const d = DISH_BY_ID[String(data.id ?? '')];
    const key = data.where === 'fridge' ? 'fridge' : 'picnic';
    const okSpot = key === 'fridge' ? hasFridge(h) : hasYard(h, 'picnic');
    if (!h?.tent || !okSpot || !d || !(wal?.dish?.[d.id] > 0)) return ack?.({ ok: false });
    const box = (h[key] ??= { d: null, n: 0, took: {} });
    if (box.n > 0 && box.d !== d.id) return ack?.({ ok: false, reason: 'other' });
    if (box.n >= 5) return ack?.({ ok: false, reason: 'full' });
    wal.dish[d.id]--;
    if (!wal.dish[d.id]) delete wal.dish[d.id];
    box.d = d.id;
    box.n++;
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    ack?.({ ok: true, n: box.n, ...dishView() });
  });
  /** 主人把冰箱裡的料理拿回來 */
  socket.on('fridgeBack', (data, ack) => {
    const h = homes[player?.vid];
    const box = h?.fridge;
    if (!box?.d || !(box.n > 0) || !wal) return ack?.({ ok: false });
    wal.dish ??= {};
    wal.dish[box.d] = (wal.dish[box.d] ?? 0) + box.n;
    h.fridge = { d: null, n: 0, took: box.took ?? {} };
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    ack?.({ ok: true, ...dishView() });
  });
  /** 冰箱裡現在有什麼（在誰的帳篷裡就看誰的） */
  socket.on('fridgeInfo', (data, ack) => {
    const owner = roomId === 'home' ? homeOwner : null;
    const h = owner && homes[owner];
    const box = h?.fridge;
    ack?.({ ok: !!h, mine: owner === player?.vid, fridge: box?.d && box.n > 0 ? { dish: box.d, n: box.n, took: box.took?.[player?.vid] === dayKey() } : null });
  });
  socket.on('picnicTake', (data = {}, ack) => {
    const fridge = data.where === 'fridge';
    if (!wal || !player || roomId !== (fridge ? 'home' : 'campground')) return ack?.({ ok: false });
    const owner = fridge ? homeOwner : vidOfHid(String(data.hid ?? ''));
    const h = owner && homes[owner];
    const box = h?.[fridge ? 'fridge' : 'picnic'];
    if (!box?.d || !(box.n > 0) || owner === player.vid) return ack?.({ ok: false, reason: 'none' });
    box.took ??= {};
    const d0 = dayKey();
    if (box.took[player.vid] === d0) return ack?.({ ok: false, reason: 'took' });
    for (const [k, v] of Object.entries(box.took)) if (v !== d0) delete box.took[k]; // 舊的日子清掉
    box.took[player.vid] = d0;
    box.n--;
    const dish = box.d;
    if (!box.n) box.d = null;
    wal.dish ??= {};
    wal.dish[dish] = (wal.dish[dish] ?? 0) + 1;
    saveJson('homes.json', homes);
    saveJson('players.json', players);
    ack?.({ ok: true, dish, ...dishView() });
  });
  // 🔭 星空望遠鏡：晚上可以看星星；營火時間（流星雨）看到流星，每場送一次松果
  socket.on('telescope', (data, ack) => {
    if (!wal || roomId !== 'home') return ack?.({ ok: false });
    const owner = homeOwner;
    if (!(homes[owner]?.items ?? []).some((it) => it.i === 'telescope')) return ack?.({ ok: false });
    const ev = eventInfo();
    if (!ev.active && !isNight()) return ack?.({ ok: false, reason: 'day' });
    if (!ev.active) return ack?.({ ok: true, meteor: false });
    const key = `${dayKey()}-${ev.slot}`;
    if (wal.scope === key) return ack?.({ ok: true, meteor: true, got: 0 });
    wal.scope = key;
    award(3, 'telescope', true);
    ack?.({ ok: true, meteor: true, got: 3 });
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
    moveStays(socket.data.vid, rec.vid); // 🔑 點連結變成新角色、再登入帳號：計時跟著過去
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
    const mu = banOf(player.vid, 'mute');
    if (mu) return socket.emit('muted', { until: mu.until || 0 });
    const now = Date.now();
    if (now - lastNote < 20000) return;
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!text) return;
    lastNote = now;
    const color = Math.max(0, Math.min(3, data.color | 0));
    shared.notes.push({ name: player.name, hid: player.vid ? homeId(player.vid) : '', text, at: now, color, ch: chan.ch });
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

  // ⛵ 租船（作者 11/19，11/27 開）
  const boatNow = () => (roomId === 'lake_dock' && rkey ? boatOf(rkey, socket.id) : null);
  const boatSync = () => rkey && io.to(rkey).emit('boats', { list: boatList(rkey) });
  socket.on('boatInfo', (_d, ack) => {
    const now = Date.now();
    ack?.({ ok: true, open: isOpen({ from: BOAT_FROM }), list: boatList(rkey ?? ''), mine: boatNow()?.id ?? null, feedLeft: Math.max(0, (wal?.feedUntil ?? 0) - now), bait: wal?.bait ?? 0, full: (boatRooms.get(rkey)?.size ?? 0) >= BOAT_MAX });
  });
  let lastBoat = 0;
  socket.on('boatRent', (data = {}, ack) => {
    if (!player || !wal || !player.vid) return ack?.({ ok: false, reason: 'noWallet' });
    if (roomId !== 'lake_dock') return ack?.({ ok: false, reason: 'place' });
    if (!isOpen({ from: BOAT_FROM })) return ack?.({ ok: false, reason: 'later' });
    const k = BOATS[String(data.k ?? '')];
    if (!k) return ack?.({ ok: false, reason: 'unknown' });
    if (boatNow()) return ack?.({ ok: false, reason: 'already' });
    if (Math.hypot(player.x - BOAT_SIGN.x, player.z - BOAT_SIGN.z) > 4) return ack?.({ ok: false, reason: 'far' });
    const map = boatRooms.get(rkey) ?? new Map();
    const used = new Set([...map.values()].map((b) => b.slot));
    const slot = BOAT_SLOTS.findIndex((_, i) => !used.has(i));
    if (map.size >= BOAT_MAX || slot < 0) return ack?.({ ok: false, reason: 'full' });
    if (wal.pc < k.price) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    const now = Date.now();
    if (now - lastBoat < 1500) return ack?.({ ok: false, reason: 'tooFast' });
    lastBoat = now;
    wal.pc -= k.price;
    const st = BOAT_SLOTS[slot];
    const b = { id: ++boatSeq, k: k.id, o: socket.id, on: player.name, ov: player.vid, r: Array(k.people).fill(null), p: new Map(), slot, x: st.x, z: st.z, ry: st.ry, until: now + BOAT_MS };
    b.r[0] = socket.id;
    b.p.set(socket.id, player);
    map.set(b.id, b);
    boatRooms.set(rkey, map);
    const seat = seatAt(b, 0);
    [player.x, player.z, player.posAt, player.dirty] = [seat.x, seat.z, now, true];
    const d = today();
    d.boat ??= {};
    d.boat[k.id] = (d.boat[k.id] ?? 0) + 1;
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: -k.price, reason: 'boat' });
    console.log(`[租船] ${player.name} ${k.zh}（分流 ${chan.ch}）`);
    boatSync();
    ack?.({ ok: true, boat: boatPublic(b), seat: 0, pc: wal.pc });
  });
  socket.on('boatJoin', (data = {}, ack) => {
    if (!player || roomId !== 'lake_dock') return ack?.({ ok: false, reason: 'place' });
    if (boatNow()) return ack?.({ ok: false, reason: 'already' });
    const b = boatRooms.get(rkey)?.get(Number(data.id));
    if (!b) return ack?.({ ok: false, reason: 'gone' });
    const i = b.r.indexOf(null);
    if (i < 0) return ack?.({ ok: false, reason: 'full' });
    if (Math.hypot(player.x - b.x, player.z - b.z) > 4.5) return ack?.({ ok: false, reason: 'far' });
    b.r[i] = socket.id;
    b.p.set(socket.id, player);
    const seat = seatAt(b, i);
    [player.x, player.z, player.posAt, player.dirty] = [seat.x, seat.z, Date.now(), true];
    bump('boatRide');
    // 📒 坐上朋友的船／跟朋友一起坐船
    chal('boatRide');
    chal('boatMate');
    const ownerVid = io.sockets.sockets.get(b.o)?.data.vid;
    if (ownerVid) questEv(ownerVid, 'boatMate');
    boatSync();
    ack?.({ ok: true, boat: boatPublic(b), seat: i });
  });
  socket.on('boatLeave', (_d, ack) => {
    const b = boatNow();
    if (!b) return ack?.({ ok: true });
    if (b.o === socket.id) boatEnd(rkey, b, 'owner');
    else {
      boatDropRider(rkey, b, socket.id, 'leave');
      boatSync();
    }
    ack?.({ ok: true });
  });
  let lastBoatMove = 0;
  socket.on('boatMove', (d) => {
    const b = boatNow();
    if (!b || b.o !== socket.id || !Array.isArray(d)) return;
    const now = Date.now();
    const dt = Math.min(Math.max((now - (lastBoatMove || now)) / 1000, 0.05), 1.5);
    if (now - lastBoatMove < 60) return;
    lastBoatMove = now;
    const p = { x: num(d[0], -POS_MAX, POS_MAX, b.x), z: num(d[1], -POS_MAX, POS_MAX, b.z) };
    const dist = Math.hypot(p.x - b.x, p.z - b.z);
    const maxStep = MAX_SPEED * dt + 1;
    if (dist > maxStep) [p.x, p.z] = [b.x + ((p.x - b.x) / dist) * maxStep, b.z + ((p.z - b.z) / dist) * maxStep];
    keepOnLake(p, BOATS[b.k].r * 0.6);
    [b.x, b.z, b.ry] = [p.x, p.z, num(d[2], -1000, 1000, b.ry)];
    socket.to(rkey).emit('boatPos', [b.id, +b.x.toFixed(2), +b.z.toFixed(2), +b.ry.toFixed(3)]);
  });
  // 🐟 特殊魚飼料：10 分鐘稀有魚 ×2（再買一次往後延）
  // 🐟 魚飼料（作者 11/22）：買了放進背包（wal.bait 包數），釣魚時按「🐟 撒」才開始算 10 分鐘
  socket.on('buyFeed', (_d, ack) => {
    if (!player || !wal || !player.vid) return ack?.({ ok: false, reason: 'noWallet' });
    if (!isOpen({ from: BOAT_FROM })) return ack?.({ ok: false, reason: 'later' });
    if (wal.pc < FEED_PRICE) return ack?.({ ok: false, reason: 'poor', pc: wal.pc });
    if ((wal.bait ?? 0) >= 20) return ack?.({ ok: false, reason: 'bagFull' });
    wal.pc -= FEED_PRICE;
    wal.bait = (wal.bait ?? 0) + 1;
    bump('feed');
    saveJson('players.json', players);
    socket.emit('wallet', { pc: wal.pc, delta: -FEED_PRICE, reason: 'feed' });
    ack?.({ ok: true, pc: wal.pc, bait: wal.bait, feedLeft: Math.max(0, (wal.feedUntil ?? 0) - Date.now()) });
  });
  socket.on('useFeed', (_d, ack) => {
    if (!player || !wal || !player.vid) return ack?.({ ok: false });
    if (!(wal.bait > 0)) return ack?.({ ok: false, reason: 'none' });
    if (!['lake_dock', 'forest_main'].includes(roomId)) return ack?.({ ok: false, reason: 'place' });
    const now = Date.now();
    if ((wal.feedUntil ?? 0) - now > FEED_MS * 2) return ack?.({ ok: false, reason: 'tooMany' });
    wal.bait--;
    wal.feedUntil = Math.max(now, wal.feedUntil ?? 0) + FEED_MS;
    bump('feedUse');
    saveJson('players.json', players);
    if (rkey) socket.to(rkey).emit('feedThrow', { id: socket.id }); // 旁邊的人也看到撒飼料
    ack?.({ ok: true, bait: wal.bait, feedLeft: wal.feedUntil - now });
  });

  // 🤝 河神大鯉魚（作者 11/20）：上鉤後釣的人送 coopStart，附近的人按「幫忙拉」→ 進度送給釣的人
  const coopMine = () => {
    const c = rkey ? coopRuns.get(rkey) : null;
    return c && c.fisher === socket.id ? c : null;
  };
  socket.on('coopStart', (_d, ack) => {
    if (!player || roomId !== 'forest_main' || !hooked || !FISH[hooked.fish]?.coop) return ack?.({ ok: false });
    const cur = coopRuns.get(rkey);
    if (cur && cur.fisher !== socket.id && Date.now() < cur.until) return ack?.({ ok: false, reason: 'busy' }); // 同一時間只有一場
    const c = { id: ++coopSeq, fisher: socket.id, fv: player.vid, name: player.name, until: Date.now() + COOP_SEC * 1000, taps: new Map() };
    coopRuns.set(rkey, c);
    io.to(rkey).emit('coop', { id: c.id, by: socket.id, name: c.name, left: COOP_SEC * 1000 });
    console.log(`[河神] ${player.name} 釣到河神大鯉魚，等大家幫忙（分流 ${chan.ch}）`);
    ack?.({ ok: true, id: c.id });
  });
  let coopTapAt = 0;
  socket.on('coopPull', (data = {}) => {
    const c = rkey ? coopRuns.get(rkey) : null;
    if (!player || !c || c.id !== Number(data.id) || c.fisher === socket.id || Date.now() > c.until) return;
    const now = Date.now();
    if (now - coopTapAt < 90) return; // 一秒最多算 11 下
    coopTapAt = now;
    const e = c.taps.get(socket.id) ?? { n: 0, vid: player.vid, name: player.name };
    e.n++;
    c.taps.set(socket.id, e);
    io.to(c.fisher).emit('coopPush', { id: c.id, n: 1, name: player.name });
  });
  // 釣的人送進度給大家看（一秒幾次）
  socket.on('coopProg', (data = {}) => {
    const c = coopMine();
    if (!c) return;
    socket.to(rkey).emit('coopProg', { id: c.id, p: num(data.p, 0, 1, 0), helpers: [...c.taps.values()].filter((e) => e.n >= COOP_MIN_TAPS).map((e) => e.name) });
  });
  socket.on('coopStop', () => {
    const c = coopMine();
    if (!c) return;
    coopRuns.delete(rkey);
    io.to(rkey).emit('coopEnd', { id: c.id, ok: false, name: c.name });
  });

  // 🪨 打水漂（作者 11/20，11/27 開）：前端送力道 p（0～1），伺服器算跳幾下；每天 10 顆、今天排行前 5
  socket.on('skipInfo', (_d, ack) => {
    const d = dayKey();
    const sk = wal?.sk?.d === d ? wal.sk : { n: 0, best: 0 };
    ack?.({ ok: true, open: isOpen({ from: RIVER_FROM }), left: Math.max(0, SKIP_PER_DAY - sk.n), best: sk.best, top: skipTop() });
  });
  let lastSkip = 0;
  socket.on('skipThrow', (data = {}, ack) => {
    if (!player || !wal || roomId !== 'forest_main') return ack?.({ ok: false, reason: 'place' });
    if (!isOpen({ from: RIVER_FROM })) return ack?.({ ok: false, reason: 'later' });
    const now = Date.now();
    if (now - lastSkip < 1500) return ack?.({ ok: false, reason: 'tooFast' });
    lastSkip = now;
    const d = dayKey();
    if (wal.sk?.d !== d) wal.sk = { d, n: 0, best: 0 };
    if (wal.sk.n >= SKIP_PER_DAY) return ack?.({ ok: false, reason: 'none' });
    wal.sk.n++;
    const b = skipBounces(num(data.p, 0, 1, 0));
    const pb = b > wal.sk.best;
    wal.sk.best = Math.max(wal.sk.best, b);
    let gain = 0;
    if (b >= SKIP_GOOD) (gain = 1), award(1, 'skip');
    // 今天排行：一人一筆（最好的那次）
    skipTop();
    const L = skipBoard.list;
    const mine = L.find((e) => e.vid === player.vid);
    let boardChanged = false;
    if (mine ? b > mine.b : L.length < 5 || b > L[L.length - 1].b) {
      if (mine) [mine.b, mine.name] = [b, player.name];
      else L.push({ name: player.name, vid: player.vid, b });
      L.sort((x, y) => y.b - x.b);
      L.length = Math.min(L.length, 5);
      boardChanged = L.some((e) => e.vid === player.vid);
    }
    if (boardChanged) io.emit('skipBoard', { top: skipTop() }), saveJson('totals.json', totals);
    saveJson('players.json', players);
    bump('skip');
    if (b >= 5) chal('skip5'); // 📒
    socket.to(rkey).emit('skip', { id: socket.id, b, x: +player.x.toFixed(2), z: +player.z.toFixed(2), ry: +player.ry.toFixed(3) });
    ack?.({ ok: true, b, gain, left: SKIP_PER_DAY - wal.sk.n, best: wal.sk.best, pb, top: skipTop() });
  });
  // 🦆 迷你小鴨：餵一樣蔬菜或果實（採集籃扣 1 個），跟著走 3 分鐘；一天 3 次；第一次 +3
  socket.on('duckFeed', (_d, ack) => {
    if (!player || !wal || roomId !== 'forest_main') return ack?.({ ok: false, reason: 'place' });
    if (!isOpen({ from: RIVER_FROM })) return ack?.({ ok: false, reason: 'later' });
    const now = Date.now();
    if ((player.dk ?? 0) > now) return ack?.({ ok: false, reason: 'already', until: player.dk });
    const d = dayKey();
    if (wal.dk?.d !== d) wal.dk = { d, n: 0 };
    if (wal.dk.n >= DUCK_PER_DAY) return ack?.({ ok: false, reason: 'full' });
    // 蔬菜或果實：挑數量最多、最常見的那個
    const pick = Object.entries(wal.bk ?? {})
      .filter(([id, n]) => n > 0 && ['veg', 'fruit'].includes(materialOf(id)?.type))
      .sort((a, b) => (materialOf(a[0]).rarity ?? 1) - (materialOf(b[0]).rarity ?? 1) || b[1] - a[1])[0];
    if (!pick) return ack?.({ ok: false, reason: 'noFood' });
    wal.bk[pick[0]]--;
    wal.dk.n++;
    player.dk = now + DUCK_MS;
    let gain = 0;
    if (!wal.duckFirst) (wal.duckFirst = 1), (gain = DUCK_FIRST_GAIN), award(gain, 'duck');
    saveJson('players.json', players);
    bump('duck');
    chal('duck'); // 📒
    io.to(rkey).emit('duck', { id: socket.id, until: player.dk });
    ack?.({ ok: true, item: pick[0], until: player.dk, left: DUCK_PER_DAY - wal.dk.n, gain, basket: wal.bk });
  });

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
    const fb = activeBuff(wal?.buff);
    const today = todaySpecial(); // 📅 今日限定：某種魚特別好釣、週六異色魚比較多
    const onBoat = !!boatNow(); // ⛵ 坐在船上：船釣限定魚、稀有魚多一點
    const feed = (wal?.feedUntil ?? 0) > now; // 🐟 特殊魚飼料
    const hr = taipeiHour();
    // 🔥 營火河畔（作者 11/20，11/27 開）：火越旺稀有魚越多；超旺時火光魚才出來
    // 作者 11/20：稀有魚加成不要疊太多 → 好運料理、營火只算比較高的那個；坐船另外 ×1.3；魚飼料改成「上鉤比較快」（不改機率）
    const fireOn = place === 'pond' && isOpen({ from: RIVER_FROM });
    const fr = fireOn ? chan.fuel / MAX_FUEL : 0;
    const fireMul = fr >= 0.75 ? 1.6 : fr >= 0.4 ? 1.3 : 1;
    const luck = Math.max(fb?.k === 'fish' ? fb.v : 1, fireMul) * (onBoat ? BOAT_LUCK : 1);
    let fish = rollFish({ place, event: !!eventInfo().active, contest: m?.kind === 'fish', luck, boost: today.fish, boat: onBoat, night: hr >= 18 || hr < 6, open: isOpen, fire: fireOn && fr >= 0.75 }); // 🎣 吃了「釣魚好運」：稀有魚機率變高
    if (process.env.COOP_TEST === '1' && place === 'pond') fish = FISH.findIndex((f) => f.coop); // 本機測試：營火河畔每竿都是河神大鯉魚（Render 不要設）
    const shiny = canShiny(FISH[fish]) && Math.random() < (Number(process.env.SHINY_TEST) || SHINY_CHANCE * (today.shiny ? SHINY_DAY_MULT : 1)); // ✨ 異色魚（本機測試：SHINY_TEST=1 每條都是異色；Render 不要設）
    hooked = { fish, size: rollSize(fish), at: now, shiny, fast: feed, boat: onBoat }; // fast：🐟 撒了魚飼料，上鉤比較快；boat：📒 船上釣的
    ack?.({ ok: true, fish, size: hooked.size, shiny });
  });
  // 釣到魚：全場公告＋湖畔排行（只收湖畔房間；一定要先有伺服器給的魚，而且要過了最少的時間）
  socket.on('catch', (data = {}) => {
    if (!player || (roomId !== 'lake_dock' && roomId !== 'forest_main')) return; // 湖畔或營火河畔
    const now = Date.now();
    if (!hooked || Number(data.fish) !== hooked.fish || now - hooked.at < (hooked.fast ? 2500 : FISH_MIN_MS) || now - lastCatch < 3000) return;
    lastCatch = now;
    const fish = hooked.fish;
    const shiny = !!hooked.shiny;
    let size = hooked.size;
    // 浮標一沉就拉的漂亮時機：魚大一點（和前端同一個算法）
    if (data.perfect && !FISH[fish].junk) size = Math.min(FISH[fish].max, Math.round(size * 1.15) + 1);
    // 🤝 河神大鯉魚：幫忙的人每人 +5（作者 11/22：自己一個人也拉得上來，只是要按很快；原本沒人幫忙就不算，釣魚大賽的排行也沒更新）
    const onBoatCatch = !!hooked.boat;
    if (FISH[fish].coop) {
      const c = coopRuns.get(rkey);
      const helpers = c && c.fisher === socket.id ? [...c.taps.values()].filter((e) => e.n >= COOP_MIN_TAPS) : [];
      for (const e of helpers) if (e.vid) questEv(e.vid, 'coop'); // 📒 幫別人拉河神
      if (c && c.fisher === socket.id) {
        coopRuns.delete(rkey);
        for (const e of helpers) if (e.vid) giveTo(e.vid, COOP_GAIN, 'coop');
        io.to(rkey).emit('coopEnd', { id: c.id, ok: true, name: c.name, helpers: helpers.map((e) => e.name) });
      }
      bump('coop');
    }
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
    if (!JUNK.has(fish)) chal('fish'), spiritGain('fish');
    // 📒 任務本：★3 以上、船上釣、船釣限定
    if (!JUNK.has(fish) && FISH[fish].rarity >= 3) chal('fishRare');
    if (!JUNK.has(fish) && onBoatCatch) chal('boatFish');
    if (FISH[fish].boat) chal('boatOnly');
    // 🌰 釣魚松果：每天前 FISH_DAILY_FULL 條照算（營火時間加倍）；之後每條固定 1 顆，稀有魚（四星以上）照算
    {
      const gain = catchGain(FISH[fish]);
      if (gain > 0 && wal) {
        const d = dayKey();
        if (wal.fday !== d) [wal.fday, wal.fn] = [d, 0];
        wal.fn++;
        const full = passTier(wal)?.fish ?? FREE.fish; // 照價算的條數：免費 30、小營火 40、星空 50
        if (wal.fn <= full || FISH_RARITY[fish] >= 4) award(gain, 'fish');
        else award(1, wal.fn === full + 1 ? 'fishCap' : 'fish', true);
      }
    }
    // ♻️ 釣到垃圾：順手放進垃圾袋（湖裡會釣到的種類很多，不只漂流瓶和罐頭）
    if (JUNK.has(fish) && wal) {
      const id = FISH[fish].junk === 'boot' ? 'old_boot' : pickTrash('lake').id; // 🥾 舊靴子 → 垃圾袋裡的「舊皮鞋」（可以煮求生料理）
      const r = gotTrash(wal, player.vid, id);
      if (r.gain) award(r.gain, 'trash');
      socket.emit('trashGot', { id, ...r, ...trashView(wal) });
    }
    // 🧊 11/19 料理鍋：釣到的魚放進保冷箱（可以拿去煮），也記下每種魚釣到幾次（解鎖隱藏食譜）
    if (wal && !JUNK.has(fish)) {
      wal.fk ??= {};
      if (FISH[fish].keep !== false) wal.fk[fish] = Math.min(FISH_KEEP_CAP, (wal.fk[fish] ?? 0) + 1); // ⛵ 鯊魚、海豹、藍鯨寶寶：放回湖裡，不能煮
      wal.fc ??= {};
      wal.fc[fish] = (wal.fc[fish] ?? 0) + 1;
    }
    // 🐳 釣到藍鯨寶寶：送藍鯨帳篷（小舖買不到）
    if (FISH[fish].shape === 'whale' && player.vid) {
      const h = (homes[player.vid] ??= newHome());
      h.shapes ??= ['bell'];
      if (!h.shapes.includes('whale')) {
        h.shapes.push('whale');
        saveJson('homes.json', homes);
        socket.emit('whaleTent', { tent: !!h.tent });
        console.log(`[藍鯨帳篷] ${player.name}`);
      }
    }
    // 📖 魚類圖鑑：第一次釣到這種魚就收錄、送松果；全部收集完再送一份大禮
    if (wal) {
      wal.dex ??= {};
      const first = !(fish in wal.dex);
      wal.dex[fish] = Math.max(wal.dex[fish] ?? 0, size);
      if (first) {
        const gain = dexGain(FISH[fish]);
        award(gain, 'dex');
        const count = Object.keys(wal.dex).filter((k) => !isLimitedFish(FISH[k])).length; // 🗓️ 每月限定、⛵ 船釣限定的不算
        let bonus = 0;
        if (count >= DEX_TOTAL && !wal.dexDone) {
          wal.dexDone = true;
          bonus = DEX_BONUS;
          award(bonus, 'dex');
        }
        socket.emit('dex', { fish, gain, bonus, count, total: DEX_TOTAL, dex: dexView(wal) });
      }
      // ✨ 異色圖鑑：第一次釣到這種的異色 +10；全部（每月限定的不算）收集完 +500
      if (shiny) {
        wal.shiny ??= {};
        const firstS = !(fish in wal.shiny);
        wal.shiny[fish] = Math.max(wal.shiny[fish] ?? 0, size);
        bump('shiny');
        if (firstS) {
          award(SHINY_DEX_GAIN, 'dex');
          const count = Object.keys(wal.shiny).filter((k) => !isLimitedFish(FISH[k])).length;
          let bonus = 0;
          if (count >= SHINY_TOTAL && !wal.shinyDone) {
            wal.shinyDone = true;
            bonus = SHINY_BONUS;
            award(bonus, 'dex');
          }
          socket.emit('shinyDex', { fish, gain: SHINY_DEX_GAIN, bonus, count, total: SHINY_TOTAL, shiny: wal.shiny });
        }
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
    // 作者 11/24（玩家：別人釣魚的通知一直跑，畫面太滿）：上方即時動態只跑 ★4 以上、異色、上排行的（作者 11/24：4 星以上再跟大家說）
    if (!JUNK.has(fish) && ((FISH[fish]?.rarity ?? 0) >= 4 || shiny || rank)) pushNews('fish', { fish, size, rank, ...(shiny ? { shiny: 1 } : {}) });
    // 📣 五星魚與傳說之魚：整個伺服器（所有分流、所有地點）跳出大公告
    if (FISH_RARITY[fish] >= 5 || shiny) io.emit('bigCatch', { name: player.name, fish, size, ch: chan.ch, place: roomId, shiny }); // ✨ 異色魚也全營地公告
    io.to(rkey).emit('caught', { id: socket.id, name: player.name, fish, size, rank, shiny });
    // 🍾 撈到漂流瓶：一半機會裡面有別人寫的信
    if (FISH[fish].junk === 'bottle' && FISH[fish].glass && Math.random() < 0.5) { // 作者 11/23：只有玻璃的「漂流瓶」裡面有信，寶特瓶沒有
      const b = pickBottle(socket.data.vid);
      if (b) {
        b.read = (b.read ?? 0) + 1;
        (b.rv ??= []).push(socket.data.vid); // 誰讀過（不會再撈到同一封）
        if (b.rv.length > 200) b.rv.shift();
        saveBottles();
        setTimeout(() => socket.emit('bottleLetter', { k: b.k, text: b.text, name: b.name, hearted: (b.hv ?? []).includes(socket.data.vid) }), 1600);
      }
    }
  });
  // 🍾 寫一封漂流瓶（湖畔碼頭、營火河畔）
  socket.on('bottleThrow', (data = {}, ack) => {
    if (!player?.vid || !wal) return ack?.({ ok: false });
    if (roomId !== 'lake_dock' && roomId !== 'forest_main') return ack?.({ ok: false, reason: 'where' });
    if (banOf(player.vid, 'mute')) return ack?.({ ok: false, reason: 'muted' });
    const text = String(data.text ?? '').replace(/\s+/g, ' ').trim().slice(0, BOTTLE_LEN);
    if (text.length < 2) return ack?.({ ok: false, reason: 'short' });
    const d = dayKey();
    if (wal.btd?.d !== d) wal.btd = { d, n: 0 };
    if (wal.btd.n >= BOTTLE_PER_DAY) return ack?.({ ok: false, reason: 'limit' });
    if (wal.pc < BOTTLE_PRICE) return ack?.({ ok: false, reason: 'poor' });
    wal.pc -= BOTTLE_PRICE;
    wal.btd.n++;
    socket.emit('wallet', { pc: wal.pc, delta: 0 });
    bottles.push({ k: ++bottleSeq, v: player.vid, name: player.name, text, at: Date.now(), hearts: 0, hv: [], rep: [], read: 0 });
    saveBottles();
    saveJson('players.json', players);
    bump('bottle');
    console.log(`[漂流瓶] ${player.name}：${text}`);
    io.to(rkey).emit('bottleSplash', { id: socket.id });
    ack?.({ ok: true, left: BOTTLE_PER_DAY - wal.btd.n });
  });
  socket.on('bottleInfo', (data, ack) => {
    const d = dayKey();
    ack?.({ ok: true, left: wal?.btd?.d === d ? BOTTLE_PER_DAY - wal.btd.n : BOTTLE_PER_DAY, price: BOTTLE_PRICE, len: BOTTLE_LEN, mine: bottles.filter((b) => b.v === player?.vid).slice(-5).map((b) => ({ text: b.text, at: b.at, hearts: b.hearts ?? 0, read: b.read ?? 0, hidden: !!b.hidden })) });
  });
  // 💗 回一顆愛心（同一封信每人一次）；寄信的人在線上會收到通知
  socket.on('bottleHeart', (data = {}, ack) => {
    const b = bottles.find((x) => x.k === Number(data.k));
    if (!b || !player?.vid || b.v === player.vid) return ack?.({ ok: false });
    b.hv ??= [];
    if (b.hv.includes(player.vid)) return ack?.({ ok: false, reason: 'done' });
    b.hv.push(player.vid);
    b.hearts = (b.hearts ?? 0) + 1;
    saveBottles();
    for (const s2 of socketsOf(b.v)) s2.emit('bottleHeart', { name: player.name, text: b.text.slice(0, 16) });
    ack?.({ ok: true });
  });
  // 🚩 檢舉：2 個人檢舉就先收起來，等作者看
  socket.on('bottleReport', (data = {}, ack) => {
    const b = bottles.find((x) => x.k === Number(data.k));
    if (!b || !player?.vid) return ack?.({ ok: false });
    b.rep ??= [];
    if (!b.rep.includes(player.vid)) b.rep.push(player.vid);
    if (b.rep.length >= 2) b.hidden = true;
    saveBottles();
    console.log(`[漂流瓶檢舉] ${player.name} 檢舉了 ${b.name}：${b.text}（${b.rep.length} 次）`);
    ack?.({ ok: true });
  });

  // 添柴火：伺服器加 fuel，通知其他人播放火星特效
  // 🏃 燈籠賽跑：依序碰到 1 → 5 號燈籠，伺服器用自己記的位置確認
  // 作者 11/24：位置每場隨機（miniRun.route，同一場大家一樣），玩法照舊
  let race = { next: 0, t0: 0 };
  const nearSpot = (p) => player && Math.hypot(player.x - p.x, player.z - p.z) < TOUCH_R + 1.2;
  socket.on('race', (data = {}, ack) => {
    const m = miniNow();
    if (m?.kind !== 'race' || roomId !== 'forest_main' || !socket.data.vid) return ack?.({ ok: false, reason: 'off' });
    const route = miniRun.route ?? (miniRun.route = makeRaceRoute());
    if (race.mid !== m.id) race = { next: 0, t0: 0, mid: m.id };
    if (data.op === 'route') return ack?.({ ok: true, route, next: race.next });
    const i = Math.floor(num(data.i, -1, RACE_LANTERNS.length - 1, -1));
    if (i < 0 || (i !== 0 && i !== race.next)) return ack?.({ ok: false, reason: 'order', next: race.next });
    if (!nearSpot(route[i])) return ack?.({ ok: false, reason: 'far', next: race.next });
    if (i === 0) {
      race = { next: 1, t0: Date.now(), mid: m.id }; // 隨時可以從 1 號重新開始
      return ack?.({ ok: true, next: 1 });
    }
    if (i < RACE_LANTERNS.length - 1) {
      race.next = i + 1;
      return ack?.({ ok: true, next: race.next });
    }
    const time = Math.round((Date.now() - race.t0) / 100) / 10;
    race = { next: 0, t0: 0, mid: m.id };
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
    if (!spot.showAt || spot.showAt > Date.now()) return ack?.({ ok: false, reason: 'hidden' });
    if (!nearSpot(spot)) return ack?.({ ok: false, reason: 'far' });
    spot.by = player.name;
    award(HUNT_GAIN, 'hunt');
    // 下一顆：等一下才冒出來（時間不夠就不冒了）
    const nxt = miniRun.spots.find((p) => !p.by && !p.showAt);
    if (nxt) {
      const endAt = Date.now() + (m.endsIn ?? 0) * 1000;
      const at = Date.now() + (40 + Math.random() * 110) * 1000;
      if (at < endAt - 20000) nxt.showAt = at;
      else if (endAt - Date.now() > 40000) nxt.showAt = Date.now() + 15000;
    }
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
    spiritGain('fire');
    chal('wood'); // 📒 添柴
    pushNews('fire');
  });

  // ---------- 👫 好友 ----------
  const meVid = () => (wal && player?.vid ? player.vid : null);
  /** 對方：玩家編號（hid）或同一個房間裡的連線 id（sid） */
  const targetVid = (data = {}) => {
    if (data.sid) return io.sockets.sockets.get(String(data.sid))?.data.vid ?? null;
    const v = vidOfCode(String(data.hid ?? '').trim());
    return v && players[v] ? v : null;
  };
  socket.on('friendList', (data, ack) => {
    const me = meVid();
    if (!me) return ack?.({ ok: false });
    const w = players[me];
    const friends = friendsOf(w)
      .filter((f) => players[f])
      .map((f) => {
        const list = dms[pairKey(me, f)] ?? [];
        const read = w.dmr?.[f] ?? 0;
        const last = list.at(-1);
        return { hid: homeId(f), name: nameOfVid(f), plot: homes[f]?.tent ? homes[f].plot ?? null : null, online: socketsOf(f).length > 0, away: players[f].last ? Math.max(0, Math.round((Date.parse(`${dayKey()}T00:00:00Z`) - Date.parse(`${players[f].last}T00:00:00Z`)) / 86400000)) : null, mutual: friendsOf(players[f]).includes(me), unread: list.filter((m) => m.f !== me && m.at > read).length, last: last ? { t: last.t.slice(0, 40), at: last.at, me: last.f === me } : null };
      })
      .sort((a, b) => b.unread - a.unread || b.online - a.online || (b.last?.at ?? 0) - (a.last?.at ?? 0));
    const reqs = (w.frq ?? []).filter((f) => players[f]).map((f) => ({ hid: homeId(f), name: nameOfVid(f) }));
    // 11/08 作者：已經加過的人（好友、我送出的、對方送來的）不要再出現在「＋ 加好友」：回傳他們現在的連線 id
    const knownVids = new Set([...friendsOf(w), ...(w.frq ?? [])]);
    const known = [...io.sockets.sockets.values()].filter((s) => knownVids.has(s.data.vid)).map((s) => s.id);
    ack?.({ ok: true, code: homeId(me), friends, reqs, known, badge: socialBadge(me) });
  });
  let lastFriendReq = 0;
  socket.on('friendAdd', (data = {}, ack) => {
    const me = meVid();
    const to = targetVid(data);
    if (!me) return ack?.({ ok: false });
    if (!to) return ack?.({ ok: false, reason: 'notFound' });
    if (to === me) return ack?.({ ok: false, reason: 'self' });
    const w = players[me];
    const tw = players[to];
    if (friendsOf(w).includes(to) && friendsOf(tw).includes(me)) return ack?.({ ok: false, reason: 'already' });
    if (friendsOf(w).length >= FRIEND_MAX) return ack?.({ ok: false, reason: 'full' });
    const now = Date.now();
    if (now - lastFriendReq < 3000) return ack?.({ ok: false, reason: 'tooFast' });
    lastFriendReq = now;
    const hadReq = (w.frq ?? []).includes(to);
    w.frq = (w.frq ?? []).filter((x) => x !== to);
    if ((tw.blk ?? []).includes(me)) return ack?.({ ok: true, sent: true }); // 被封鎖：假裝送出，不通知
    if (friendsOf(tw).includes(me) || hadReq) {
      // 對方本來就加過我（或先邀請過我）：直接成為好友
      if (!friendsOf(w).includes(to)) friendsOf(w).push(to);
      if (!friendsOf(tw).includes(me)) friendsOf(tw).push(me);
      saveJson('players.json', players);
      for (const so of socketsOf(to)) so.emit('friendNew', { name: nameOfVid(me) });
      pushBadge(to);
      return ack?.({ ok: true, now: true, name: nameOfVid(to) });
    }
    if (!friendsOf(w).includes(to)) friendsOf(w).push(to); // 我這邊先記著，對方按同意才算互為好友
    tw.frq ??= [];
    if (!tw.frq.includes(me)) {
      tw.frq.push(me);
      if (tw.frq.length > 50) tw.frq.shift();
      for (const so of socketsOf(to)) so.emit('friendReq', { name: nameOfVid(me), hid: homeId(me) });
      pushBadge(to);
    }
    saveJson('players.json', players);
    ack?.({ ok: true, sent: true, name: nameOfVid(to) });
  });
  socket.on('friendAnswer', (data = {}, ack) => {
    const me = meVid();
    const from = targetVid(data);
    if (!me || !from) return ack?.({ ok: false });
    const w = players[me];
    w.frq = (w.frq ?? []).filter((x) => x !== from);
    if (data.ok) {
      if (!friendsOf(w).includes(from)) friendsOf(w).push(from);
      if (!friendsOf(players[from]).includes(me)) friendsOf(players[from]).push(me);
      for (const so of socketsOf(from)) so.emit('friendNew', { name: nameOfVid(me) });
      pushBadge(from);
    } else players[from].fr = friendsOf(players[from]).filter((x) => x !== me); // 拒絕：對方那邊的「等待中」也拿掉
    saveJson('players.json', players);
    ack?.({ ok: true });
  });
  socket.on('friendRemove', (data = {}, ack) => {
    const me = meVid();
    const f = targetVid(data);
    if (!me || !f) return ack?.({ ok: false });
    players[me].fr = friendsOf(players[me]).filter((x) => x !== f);
    players[f].fr = friendsOf(players[f]).filter((x) => x !== me);
    if (data.block) {
      players[me].blk ??= [];
      if (!players[me].blk.includes(f)) players[me].blk.push(f);
      players[f].frq = (players[f].frq ?? []).filter((x) => x !== me);
    }
    saveJson('players.json', players);
    ack?.({ ok: true });
  });
  // ---------- 💌 密頻（互為好友才能傳；不在線上也會留著） ----------
  socket.on('dmHistory', (data = {}, ack) => {
    const me = meVid();
    const f = targetVid(data);
    if (!me || !f) return ack?.({ ok: false });
    const list = dms[pairKey(me, f)] ?? [];
    players[me].dmr ??= {};
    players[me].dmr[f] = Date.now();
    saveJson('players.json', players);
    ack?.({ ok: true, name: nameOfVid(f), hid: homeId(f), plot: homes[f]?.tent ? homes[f].plot ?? null : null, mutual: isFriend(me, f), online: socketsOf(f).length > 0, msgs: list.map((m) => ({ me: m.f === me, t: m.t, at: m.at })), badge: socialBadge(me) });
  });
  let lastDm = 0;
  socket.on('dmSend', (data = {}, ack) => {
    const me = meVid();
    const f = targetVid(data);
    if (!me || !f) return ack?.({ ok: false });
    if (!isFriend(me, f)) return ack?.({ ok: false, reason: 'notFriend' });
    if (banOf(me, 'mute')) return ack?.({ ok: false, reason: 'muted' });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!text) return ack?.({ ok: false });
    const now = Date.now();
    if (now - lastDm < 1000) return ack?.({ ok: false, reason: 'tooFast' });
    lastDm = now;
    const k = pairKey(me, f);
    const list = (dms[k] ??= []);
    list.push({ f: me, t: text, at: now });
    if (list.length > 60) list.splice(0, list.length - 60);
    players[me].dmr ??= {};
    players[me].dmr[f] = now;
    saveJson('dms.json', dms);
    saveJson('players.json', players);
    for (const so of socketsOf(f)) so.emit('dm', { hid: homeId(me), name: nameOfVid(me), t: text, at: now });
    pushBadge(f);
    ack?.({ ok: true, at: now });
  });
  // ---------- 🎁 送禮給好友（11/07）：互為好友、送的人有帳號且玩滿 7 天、對方每天收禮總價值最多 50 ----------
  socket.on('friendGiftInfo', (data = {}, ack) => {
    const me = meVid();
    const to = targetVid(data);
    if (!me || !to) return ack?.({ ok: false });
    const tw = players[to];
    const dk = dayKey();
    const got = tw.grc?.d === dk ? tw.grc.v : 0;
    ack?.({ ok: true, left: Math.max(0, GIFT_DAILY_CAP - got), account: hasAccount(), age: walletAge(wal), tent: !!homes[to]?.tent, sent: wal.gsc?.d === dk ? wal.gsc.n : 0 });
  });
  let lastGift = 0;
  socket.on('giftSend', (data = {}, ack) => {
    const me = meVid();
    const to = targetVid(data);
    if (!me || !to) return ack?.({ ok: false });
    if (to === me) return ack?.({ ok: false, reason: 'self' });
    const cat = String(data.cat ?? '');
    // 🍲 作者 11/24：料理可以送給同一個地方、同一個分流的人（還不是好友也可以）；其他東西照舊要互相加好友
    const nearby = cat === 'dish' && data.sid && rkey && !!io.sockets.sockets.get(String(data.sid))?.rooms.has(rkey);
    if (!isFriend(me, to) && !nearby) return ack?.({ ok: false, reason: 'notFriend' });
    if (!hasAccount()) return ack?.({ ok: false, reason: 'account' });
    if (walletAge(wal) < GIFT_MIN_DAYS) return ack?.({ ok: false, reason: 'young', days: GIFT_MIN_DAYS - walletAge(wal) });
    const id = String(data.id ?? '');
    const n = Math.floor(num(data.n, 1, GIFT_MAX_N, 1));
    const info = giftInfo(cat, id);
    if (!info || (['gather', 'veg', 'trash'].includes(cat) && basketCat(id) !== cat)) return ack?.({ ok: false, reason: 'unknown' });
    const now = Date.now();
    if (now - lastGift < 2000) return ack?.({ ok: false, reason: 'tooFast' });
    const dk = dayKey();
    if (wal.gsc?.d !== dk) wal.gsc = { d: dk, n: 0 };
    if (wal.gsc.n >= GIFT_SEND_MAX) return ack?.({ ok: false, reason: 'sendMax' });
    const tw = players[to];
    if (tw.grc?.d !== dk) tw.grc = { d: dk, v: 0 };
    const value = info.value * n;
    if (tw.grc.v + value > GIFT_DAILY_CAP) return ack?.({ ok: false, reason: 'cap', left: Math.max(0, GIFT_DAILY_CAP - tw.grc.v) });
    // 從自己身上拿走
    const h = homes[me];
    const th = homes[to];
    if (cat === 'furn' && !th?.tent) return ack?.({ ok: false, reason: 'noTent' });
    const store = cat === 'dish' ? (wal.dish ??= {}) : cat === 'furn' ? h?.inv : (wal.bk ??= {});
    if (!store || (store[id] ?? 0) < n) return ack?.({ ok: false, reason: 'none' });
    // 🪑 家具：擺在家裡的、有配色的不能送（只送收在背包、原色的），免得送出去家裡的東西不見
    if (cat === 'furn' && available(h, id, 0) < n) return ack?.({ ok: false, reason: 'placed' });
    store[id] -= n;
    if (store[id] <= 0) delete store[id];
    // 放進對方那邊
    const dest = cat === 'dish' ? (tw.dish ??= {}) : cat === 'furn' ? (th.inv ??= {}) : (tw.bk ??= {});
    dest[id] = (dest[id] ?? 0) + n;
    lastGift = now;
    wal.gsc.n++;
    tw.grc.v += value;
    // 密頻留一句（對方不在線上也看得到）
    const text = `🎁 ${info.icon} ${info.zh} ×${n}`;
    const k = pairKey(me, to);
    const list = (dms[k] ??= []);
    list.push({ f: me, t: text, at: now, g: 1 });
    if (list.length > 60) list.splice(0, list.length - 60);
    saveJson('dms.json', dms);
    saveJson('players.json', players);
    if (cat === 'furn') saveJson('homes.json', homes);
    bump('gifts');
    for (const so of socketsOf(to)) {
      so.emit('dm', { hid: homeId(me), name: nameOfVid(me), t: text, at: now });
      so.emit('giftGot', { name: nameOfVid(me), icon: info.icon, zh: info.zh, n, cat, basket: tw.bk ?? {}, dishes: tw.dish ?? {}, home: cat === 'furn' ? publicHome(th) : null });
    }
    pushBadge(to);
    chal('gift', 1, { who: to }); // 📒 送朋友禮物
    ack?.({ ok: true, left: GIFT_DAILY_CAP - tw.grc.v, basket: wal.bk ?? {}, dishes: wal.dish ?? {}, home: cat === 'furn' ? publicHome(h) : null });
  });

  // ---------- ✉️ 聯絡作者（自動附上玩家編號；作者在 /admin 回覆） ----------
  let lastSup = 0;
  socket.on('supportSend', (data = {}, ack) => {
    const me = meVid();
    if (!me) return ack?.({ ok: false });
    const text = String(data.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
    if (text.length < 2) return ack?.({ ok: false, reason: 'short' });
    const now = Date.now();
    if (now - lastSup < 60000) return ack?.({ ok: false, reason: 'tooFast' });
    if (support.filter((x) => x.vid === me && now - x.at < 86400000).length >= 5) return ack?.({ ok: false, reason: 'tooMany' });
    lastSup = now;
    support.push({ id: `${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`, vid: me, hid: homeId(me), name: nameOfVid(me), t: text, at: now });
    if (support.length > 500) support.splice(0, support.length - 500);
    saveJson('support.json', support);
    console.log(`[聯絡作者] ${nameOfVid(me)}（${homeId(me)}）：${text}`);
    ack?.({ ok: true });
  });
  socket.on('supportList', (data, ack) => {
    const me = meVid();
    if (!me) return ack?.({ ok: false });
    const mine = support.filter((x) => x.vid === me);
    for (const x of mine) if (x.re) x.seen = true;
    if (mine.some((x) => x.re)) saveJson('support.json', support);
    ack?.({ ok: true, code: homeId(me), list: mine.slice(-10).reverse().map((x) => ({ t: x.t, at: x.at, re: x.re ?? '', reAt: x.reAt ?? 0 })), badge: socialBadge(me) });
  });

  socket.on('disconnect', () => {
    clearTimeout(eggTimer);
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
      // 😴 手機切到背景、鎖螢幕：瀏覽器停了就不會再送狀態，超過 30 秒在別人畫面上讓他打瞌睡
      if (!p.zz && p.st && now - p.st > 30000 && p.a !== 'blanket' && p.a !== 'sleep') {
        p.zz = 1;
        p.dirty = true;
      }
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
  const npcTurn = ++tickNo % NPC_EVERY === 0;

  for (const c of channels.values()) {
    c.fuel = Math.max(0, c.fuel - BURN_RATE * dt);
    // 有真人在這個分流時，居民才活動（沒人時省電）
    if (chCount(c) > 0) c.residents?.update(dt);
    for (const [id, room] of c.rooms) {
      if (room.players.size === 0) continue;

      // 只送有變動的玩家（含營地居民）
      const batch = {};
      let any = false;
      for (const p of room.players.values()) {
        if (!p.dirty) continue;
        batch[p.id] = packState(p);
        p.dirty = false;
        any = true;
      }
      if (npcTurn) {
        for (const p of room.npcs.values()) {
          if (!p.dirty) continue;
          batch[p.id] = packState(p);
          p.dirty = false;
          any = true;
        }
      }
      if (any) io.to(key(c.ch, id)).except(BG).volatile.emit('states', batch);
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
    if (any) io.to(`home:${owner}`).except(BG).volatile.emit('states', batch);
  }
  if (fireSync >= 2) fireSync = 0;
}, TICK_MS);

// 🛟 保險：某個功能出錯（例如 11/13 擴建帳篷的 cost 打錯字）不要讓整台伺服器當掉、把所有人踢出去。
//   記下錯誤，伺服器繼續跑；同一種錯誤 1 分鐘內只印一次，免得洗版。
{
  const seen = new Map();
  const report = (kind) => (err) => {
    const msg = String(err?.stack || err).split('\n').slice(0, 3).join(' | ');
    const now = Date.now();
    if (now - (seen.get(msg) ?? 0) < 60000) return;
    seen.set(msg, now);
    console.error(`[出錯了但沒當掉] ${kind}：${msg}`);
  };
  process.on('uncaughtException', report('uncaughtException'));
  process.on('unhandledRejection', report('unhandledRejection'));
}

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

// ✨ 找金松果：時間到就讓下一顆冒出來，通知大家
setInterval(() => {
  const m = miniInfo();
  if (!m.active || m.kind !== 'hunt' || !miniNow()) return;
  const now = Date.now();
  let fresh = false;
  for (const p of miniRun.spots) {
    if (p.showAt && p.showAt <= now && !p.shown) {
      p.shown = true;
      fresh = true;
    }
  }
  if (fresh) io.emit('miniHuntShow', miniPublic());
}, 2000);

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

// 🏕️ 固定營位：第一次啟動新版時搬遷（要等玩家、月票資料都載入好）
migrateCamp();

httpServer.listen(PORT, () => {
  console.log(`🔥 營地伺服器已啟動：http://localhost:${PORT}`);
});
