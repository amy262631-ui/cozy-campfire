import { FISH } from '../fishing/fishData.js';
import { GATHER_ITEMS } from './gathering.js';

/**
 * 📅 每天都有點不一樣（作者 11/16）：每天（台北時間）自動換「今日限定」，前後端用同一個日期算出一樣的結果。
 *   🐟 今天某種魚特別好釣（權重 ×3）
 *   🍄 今天森林多一種採集物（那一種特別容易採到）
 *   ✨ 每週六：異色魚比較容易出現（1% → 3%）
 */
export const FISH_BOOST = 3;
/** 🗓️ 作者 11/16：精靈家具、小精靈造型（蝴蝶結、翅膀）、每日限定、營火之約新 3 款 → 11/20（台北時間）自動打開＋跳更新說明 */
export const LAUNCH_1120 = '2026-11-19'; // 作者 11/19 晚上：推上去就打開，不用等 11/20 凌晨
/** 🏮🏰🐉 風格系列（作者 11/19：先藏起來，12/1 聖誕大更新一起開） */
export const LAUNCH_STYLE = '2026-11-27'; // 作者 11/19：原本 12/1 的全部提早到 11/27
/** 東西有 from（'YYYY-MM-DD'）：台北時間到那天才打開；網址 ?open1120=1 可以先看（只影響自己的畫面） */
export function isOpen(x, now = new Date()) {
  if (!x?.from) return true;
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    if (q?.get('open1120') === '1') return true;
    if (q?.get('xmas') === '1' && x.from <= '2026-12-01') return true; // 🎄 ?xmas=1：12/1 的東西也先看得到（只有自己的畫面）
  } catch {
    /* 伺服器 */
  }
  if (globalThis.process?.env?.OPEN_1120 === '1') return true; // 本機測試（Render 不要設）
  if (globalThis.process?.env?.XMAS_TEST === '1' && x.from <= '2026-12-01') return true; // 本機測試（Render 不要設）
  return taipeiDay(now).key >= x.from;
}
export const SHINY_DAY_MULT = 3;
const SHINY_WEEKDAY = 6; // 週六

/** 台北時間的日期 'YYYY-MM-DD' 和星期幾 */
export function taipeiDay(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** 可以當「今天好釣」的魚：哪裡都釣得到、不用等活動的 ★2～★4（不含垃圾、魚王、每月限定） */
const FISH_POOL = FISH.map((f, i) => i).filter((i) => {
  const f = FISH[i];
  return !f.where && !f.when && !f.month && !f.junk && !f.legend && f.rarity >= 2 && f.rarity <= 4;
});
/** 可以當「今天特別多」的採集物：蘑菇、果子、野花裡 ★2～★3、白天晚上都有的 */
const GATHER_POOL = GATHER_ITEMS.filter((x) => ['mush', 'fruit', 'flower'].includes(x.type) && x.rarity >= 2 && !x.night && !x.day && !x.month);

/** 今天的限定：{ day, fish（魚的編號）, gather（採集物 id）, shiny（今天是不是異色魚日） } */
export function todaySpecial(now = new Date()) {
  const { key, wd } = taipeiDay(now);
  if (!isOpen({ from: LAUNCH_1120 }, now)) return { day: key, fish: -1, gather: null, shiny: false, off: true }; // 11/20 才開始
  const h = hash(`cozy-${key}`);
  const h2 = hash(`gather-${key}`);
  return { day: key, fish: FISH_POOL[h % FISH_POOL.length], gather: GATHER_POOL[h2 % GATHER_POOL.length].id, shiny: wd === SHINY_WEEKDAY };
}
