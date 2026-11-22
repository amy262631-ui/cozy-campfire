/**
 * 📒 任務本（作者 11/22）：新手 → 每日 3 題 → 每週 5 題 → 假日主題（之後做）。前後端共用。
 *
 * 每一題：
 *   id   存檔用，不能改（每日題目沿用原本「今日挑戰」的 id）
 *   ev   伺服器發生什麼事時算一次（同一個 ev 可以同時算每日、每週）
 *   n    要幾次
 *   cat  分類：social 互動、fish 釣魚、garden 種菜、hen 養雞、river 河畔、forest 森林、cook 料理、camp 營地
 *   who  true＝要不同的人（幫不同朋友澆水⋯，自己、同一個網路的不算）
 *   need 有這個才會抽到：hens 有小肥雞、home 有帳篷、spirit 有小精靈
 *   from 那天才開（例：船 11/27）
 *
 * 獎勵（伺服器照這裡給）：
 *   每日：每題 +5 🌰；3 題都做完 → 今天的每日造型＋蓋 1 個章
 *   每週：做完 3 題 → 🪴 每週小盆栽；4 題 → 🐟 魚飼料 1 包（11/27 起）；5 題 → 本週限定造型＋蓋 3 個章＋🥈 銀獎盃
 *   每月集滿 20 個章 → 💄 臉妝 1 款（照順序）＋🏆 金獎盃
 *   同一類任務累積完成 10 題 → 那一類的達人獎盃（一類一次）
 */
import { isOpen } from './dailySpecial.js';

export const DAILY_GAIN = 5;
export const STAMP_MONTH = 20;
export const STAMP_DAILY = 1;
export const STAMP_WEEKLY = 3;
export const WEEKLY_PLANT_AT = 3;
export const WEEKLY_BAIT_AT = 4;
export const CAT_TROPHY_AT = 10;

/** 📅 每日題庫（前 7 題是原本的今日挑戰，id 不能改；只能往後加） */
export const DAILY = [
  { id: 'water', ev: 'water', icon: '💧', zh: '幫朋友的菜園澆水', n: 3, cat: 'social' },
  { id: 'bug', ev: 'bug2', icon: '🦋', zh: '抓到一隻少見（★★）以上的蟲', n: 1, cat: 'forest' },
  { id: 'cook3', ev: 'cook3', icon: '🍲', zh: '煮一道要 3 種以上食材的料理', n: 1, cat: 'cook' },
  { id: 'fish', ev: 'fish', icon: '🎣', zh: '釣到魚', n: 5, cat: 'fish' },
  { id: 'harvest', ev: 'harvest', icon: '🥕', zh: '收成自己的菜園', n: 2, cat: 'garden', need: 'home' },
  { id: 'trash', ev: 'trash', icon: '♻️', zh: '撿起垃圾', n: 5, cat: 'camp' },
  { id: 'gather', ev: 'gather', icon: '🍄', zh: '採集（蘑菇、果子、花、石頭貝殼）', n: 6, cat: 'forest' },
  // ---- 11/22 任務本新增 ----
  { id: 'd_note', ev: 'note', icon: '📖', zh: '去朋友帳篷的留言本寫一句話', n: 1, cat: 'social' },
  { id: 'd_dine', ev: 'dine', icon: '🍽️', zh: '在朋友家的餐桌吃一份料理', n: 1, cat: 'social' },
  { id: 'd_gift', ev: 'gift', icon: '🎁', zh: '送朋友一個禮物', n: 1, cat: 'social' },
  { id: 'd_bgame', ev: 'bgame', icon: '🎲', zh: '跟大家玩一局營火桌遊', n: 1, cat: 'social' },
  { id: 'd_coop', ev: 'coop', icon: '🤝', zh: '幫別人拉河神大鯉魚', n: 1, cat: 'social', rare: true },
  { id: 'd_henfeed', ev: 'henfeed', icon: '🐔', zh: '餵小肥雞', n: 2, cat: 'hen', need: 'hens' },
  { id: 'd_egg', ev: 'egg', icon: '🥚', zh: '撿雞蛋', n: 1, cat: 'hen', need: 'hens' },
  { id: 'd_plant', ev: 'plant', icon: '🌱', zh: '在菜園種下種子', n: 3, cat: 'garden', need: 'home' },
  { id: 'd_duck', ev: 'duck', icon: '🦆', zh: '在營火河畔餵小鴨', n: 1, cat: 'river' },
  { id: 'd_skip', ev: 'skip5', icon: '🪨', zh: '打水漂打出 5 下以上', n: 1, cat: 'river' },
  { id: 'd_wood', ev: 'wood', icon: '🔥', zh: '幫營火添柴', n: 5, cat: 'camp' },
  { id: 'd_spirit', ev: 'spiritPlay', icon: '✨', zh: '跟小精靈玩一次小遊戲', n: 1, cat: 'camp', need: 'spirit' },
  { id: 'd_mist', ev: 'mistGather', icon: '🌫️', zh: '在迷霧森林採集', n: 5, cat: 'forest' },
  { id: 'd_mistmush', ev: 'mistMush', icon: '🍄', zh: '在迷霧森林採到蘑菇', n: 2, cat: 'forest' },
  { id: 'd_bug', ev: 'bug', icon: '🐞', zh: '抓到蟲', n: 2, cat: 'forest' },
  { id: 'd_boatfish', ev: 'boatFish', icon: '⛵', zh: '在船上釣到魚', n: 3, cat: 'fish', from: '2026-11-27' },
  { id: 'd_boatride', ev: 'boatRide', icon: '🚣', zh: '坐上朋友的船', n: 1, cat: 'social', from: '2026-11-27' },
];

/** 🗓️ 每週題庫（星期一換新；只能往後加） */
export const WEEKLY = [
  { id: 'w_water5', ev: 'water', icon: '💧', zh: '幫 5 個不同的朋友澆水', n: 5, cat: 'social', who: true },
  { id: 'w_note3', ev: 'note', icon: '📖', zh: '去 3 個不同朋友的帳篷留言', n: 3, cat: 'social', who: true },
  { id: 'w_guest3', ev: 'guest', icon: '🍽️', zh: '有 3 個人來吃你餐桌上的料理', n: 3, cat: 'social', who: true, need: 'home' },
  { id: 'w_date', ev: 'date', icon: '🔥', zh: '晚上 9:30 營火之約，跟朋友一起烤火', n: 1, cat: 'social' },
  { id: 'w_bgame3', ev: 'bgame', icon: '🎲', zh: '玩 3 局營火桌遊', n: 3, cat: 'social' },
  { id: 'w_boatmate', ev: 'boatMate', icon: '⛵', zh: '跟朋友一起坐船出去', n: 1, cat: 'social', from: '2026-11-27' },
  { id: 'w_egg10', ev: 'egg', icon: '🥚', zh: '撿 10 顆雞蛋', n: 10, cat: 'hen', need: 'hens' },
  { id: 'w_eggcook', ev: 'eggCook', icon: '🍳', zh: '用雞蛋煮 3 道料理', n: 3, cat: 'hen', need: 'hens' },
  { id: 'w_harvest15', ev: 'harvestCell', icon: '🥕', zh: '收成 15 格菜園', n: 15, cat: 'garden', need: 'home' },
  { id: 'w_duck3', ev: 'duck', icon: '🦆', zh: '讓小鴨跟著你 3 次', n: 3, cat: 'river' },
  { id: 'w_fish30', ev: 'fish', icon: '🎣', zh: '釣 30 條魚', n: 30, cat: 'fish' },
  { id: 'w_fish3s', ev: 'fishRare', icon: '⭐', zh: '釣到一條 ★3 以上的魚', n: 1, cat: 'fish' },
  { id: 'w_boatonly', ev: 'boatOnly', icon: '🦈', zh: '釣到一條船釣限定魚', n: 1, cat: 'fish', from: '2026-11-27' },
  { id: 'w_cook3', ev: 'cookKind', icon: '🍲', zh: '煮 3 道不同的料理', n: 3, cat: 'cook', who: true },
  { id: 'w_gather40', ev: 'gather', icon: '🍄', zh: '採集 40 次', n: 40, cat: 'forest' },
  { id: 'w_dex3', ev: 'dexNew', icon: '📖', zh: '圖鑑多收集 3 樣新東西', n: 3, cat: 'forest' },
  { id: 'w_mistrare', ev: 'mistRare', icon: '🌫️', zh: '在迷霧森林採到 ★3 稀有的東西', n: 1, cat: 'forest' },
  { id: 'w_legend', ev: 'legend', icon: '🌟', zh: '遇見一次森林傳說', n: 1, cat: 'forest' },
  { id: 'w_wood30', ev: 'wood', icon: '🔥', zh: '幫營火添柴 30 次', n: 30, cat: 'camp' },
  { id: 'w_trash30', ev: 'trash', icon: '♻️', zh: '撿起 30 個垃圾', n: 30, cat: 'camp' },
];
export const DAILY_BY_ID = Object.fromEntries(DAILY.map((q) => [q.id, q]));
export const WEEKLY_BY_ID = Object.fromEntries(WEEKLY.map((q) => [q.id, q]));

/** 🏆 每一類累積完成 10 題送的達人獎盃（家具 id） */
export const CAT_TROPHY = { social: 'q_tro_heart', fish: 'q_tro_fish', garden: 'q_tro_garden', hen: 'q_tro_hen', forest: 'q_tro_leaf', river: 'q_tro_duck', cook: 'q_tro_cook', camp: 'q_tro_camp' };
export const CAT_NAME = { social: '熱心助人', fish: '釣魚達人', garden: '園藝達人', hen: '養雞達人', forest: '森林探險家', river: '河畔小高手', cook: '小廚神', camp: '營地小幫手' };

/** 💄 集章送臉妝的順序（作者 11/22：6 款照順序，每月一款） */
export const MAKEUP_ORDER = ['mk_pink', 'mk_peach', 'mk_freckle', 'mk_star', 'mk_heart', 'mk_shimmer'];

const dayNum = (dayKey) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
/** 這週的星期一（台北日期） */
export function weekKey(dayKey) {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
const seeded = (seed) => {
  let a = (seed * 0x9e3779b1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const shuffled = (list, seed) => {
  const rand = seeded(seed);
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/** 這個人抽得到這題嗎（ctx：{ hens, home, spirit, day }） */
export const canHave = (q, ctx = {}) => (!q.need || !!ctx[q.need]) && (!q.from || isOpen({ from: q.from }));

/**
 * 📅 今天的 3 題：同一天大家順序一樣，跳過做不到的題目；一定有 1 題互動、菜園類最多 1 題。
 * swap：{ from, to } 今天換掉的那一題
 */
export function dailyOf(dayKey, ctx = {}, swap = null) {
  const list = shuffled(DAILY, dayNum(dayKey));
  const ok = list.filter((q) => canHave(q, ctx) && !q.rare);
  const social = ok.find((q) => q.cat === 'social');
  const out = social ? [social] : [];
  for (const q of ok) {
    if (out.length >= 3) break;
    if (out.includes(q) || q.cat === 'social') continue;
    if (q.cat === 'garden' && out.some((x) => x.cat === 'garden')) continue;
    out.push(q);
  }
  let ids = out.map((q) => q.id);
  if (swap?.from && ids.includes(swap.from) && DAILY_BY_ID[swap.to]) ids = ids.map((id) => (id === swap.from ? swap.to : id));
  return ids;
}
/** 🔄 換一題：照順序找下一題還沒出現、同一類（互動換互動） */
export function dailySwapTo(dayKey, ctx, ids, from) {
  const q0 = DAILY_BY_ID[from];
  const list = shuffled(DAILY, dayNum(dayKey) + 7).filter((q) => canHave(q, ctx) && !q.rare && !ids.includes(q.id));
  return (list.find((q) => (q0?.cat === 'social') === (q.cat === 'social')) ?? list[0])?.id ?? null;
}

/** 🗓️ 這週的 5 題：2 題互動＋3 題其他 */
export function weeklyOf(wk, ctx = {}) {
  const list = shuffled(WEEKLY, dayNum(wk) * 3 + 1).filter((q) => canHave(q, ctx));
  const social = list.filter((q) => q.cat === 'social').slice(0, 2);
  const other = [];
  for (const q of list) {
    if (other.length >= 5 - social.length) break;
    if (q.cat === 'social' || other.some((x) => x.cat === q.cat)) continue;
    other.push(q);
  }
  for (const q of list) {
    if (social.length + other.length >= 5) break;
    if (!social.includes(q) && !other.includes(q)) other.push(q);
  }
  return [...social, ...other].map((q) => q.id);
}
