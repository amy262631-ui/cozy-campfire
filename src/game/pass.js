/**
 * 🔥 營火月票：兩種（前端、伺服器共用的設定；改價格、數量只要改這裡）
 * - 付一次，30 天內每天第一次進來多領松果（當天沒來就領不到，不能補領）
 * - 買下當天先送一些松果、名牌前面的徽章、月票限定帳篷花色
 * - 月票期間：釣魚「照價算」的條數、掛機每天上限都提高（越常玩，多拿的越多）
 * - 到期後上限回到免費玩家的數字（FREE），已經買的東西都保留
 * - 再買一次：天數往後延；兩種混著買時，用比較好的那一種
 */
export const PASS_TIERS = {
  ember: { id: 'ember', rank: 1, icon: '🔥', zh: '小營火', price: 60, days: 30, first: 50, daily: 20, fish: 40, sit: 45, style: 'ember', item: '營火月票・小營火 30 天' },
  star: { id: 'star', rank: 2, icon: '✨', zh: '星空', price: 150, days: 30, first: 150, daily: 40, fish: 50, sit: 60, style: 'ember', item: '營火月票・星空 30 天' },
};
export const PASS_TIER_LIST = [PASS_TIERS.ember, PASS_TIERS.star];
/**
 * 💝 支持營地頁的月票方案（作者 11/10 定案）：兩種月票 × 1 個月／3 個月
 *   days 天數（疊加在剩下的天數上）　first 買的當天一次送的松果　save 比買 3 次 1 個月省多少
 * ⚠️ id 存在訂單裡，不能改
 */
export const PASS_PLANS = {
  ember1: { id: 'ember1', tier: 'ember', months: 1, price: 60, days: 30, first: 50, item: '營火月票・小營火 30 天' },
  ember3: { id: 'ember3', tier: 'ember', months: 3, price: 160, days: 90, first: 150, save: 20, item: '營火月票・小營火 3 個月（90 天）' },
  star1: { id: 'star1', tier: 'star', months: 1, price: 150, days: 30, first: 150, item: '營火月票・星空 30 天' },
  star3: { id: 'star3', tier: 'star', months: 3, price: 400, days: 90, first: 450, save: 50, item: '營火月票・星空 3 個月（90 天）' },
};
/** 免費玩家：釣魚每天前 30 條照價算、掛機每天最多 30 顆 */
export const FREE = { fish: 30, sit: 30 };
/** 舊程式用（預設小營火） */
export const PASS = PASS_TIERS.ember;

/**
 * ☕ 贊助（請作者喝咖啡）：NT$100 以上自動拿到「這個月的贊助限定假髮」（outfits.js 的 sponsor 造型，每月一款）。
 * 小黃花、四葉草是作者親友團的心意，不是贊助贈品（還是手動寫在 server/data/sponsors.json）。
 */
export const SPONSOR = {
  amounts: [60, 100, 150, 200], // 可以選的金額（新台幣）
  min: 100, // 這個金額以上送假髮
  item: '支持迷霧森林露營地（贊助）',
};
/**
 * 🎁 本月禮盒的家具（12 月起才有）。還沒有禮盒家具的月份：只有「送假髮」
 *   { 'YYYY-MM': { small: [小東西 id ×3], big: 大件 id } }
 * 作者 11/16 改的分級（60 送假髮，以上都是假髮＋搭配商品；shop.html 也這樣寫）：
 *   NT$60：假髮（2 選 1）
 *   NT$100：假髮＋小東西 3 選 1
 *   NT$150：假髮＋大件
 *   NT$200：假髮＋大件＋小東西 3 件全拿
 */
export const SPONSOR_BOX = {
  '2026-12': { small: ['box12_globe', 'box12_train', 'box12_fire'], big: 'box12_lux' }, // 作者 11/16：換成更高級、會動的
};
/** 這個月可以選的金額（都可以選） */
export const sponsorAmounts = () => SPONSOR.amounts;
/** 這個月贊助多少以上送假髮：還沒有禮盒家具的月份（11 月）NT$60 以上都送（作者 11/11）；12 月起有禮盒後 NT$60 是小東西、NT$100 以上才有假髮 */
export const sponsorMin = () => SPONSOR.amounts[0]; // 作者 11/16：每個月都是 NT$60 以上送假髮
/** 這個金額可以拿什麼：small 小東西幾件、wig/big 有沒有、pick＝假髮跟大件要二選一 */
export function sponsorTier(month, amt) {
  if (!SPONSOR_BOX[month]) return { small: 0, wig: amt >= sponsorMin(month), big: false, pick: false };
  if (amt >= 200) return { small: 3, wig: true, big: true, pick: false };
  if (amt >= 150) return { small: 0, wig: true, big: true, pick: false };
  if (amt >= 100) return { small: 1, wig: true, big: false, pick: false };
  return { small: 0, wig: amt >= SPONSOR.amounts[0], big: false, pick: false };
}

/**
 * 🎫 12/1 起（作者 11/20）：💝 支持營地只剩月票，🎁 贊助禮盒拿掉（只有幾位玩家買，不要讓他們兩邊都付錢）
 *   → 有月票的人在小舖「🎫 月票」用松果買每個月的限定造型、限定家具（當月才賣，下個月下架，隔年同月再回來；買了永久）
 *   SPONSOR_END：這個月起不能再贊助（11 月贊助照舊到 11/30）
 */
export const SPONSOR_END = '2026-12';
/** 作者 11/20：支持營地只剩月票、月票限定聖誕家具也跟 11/27 聖誕更新一起（11 月贊助到 11/26） */
export const SPONSOR_END_DAY = '2026-11-27';
/** 月票本月造型的價格：💇 假髮、📎 髮夾 */
export const PASS_LOOK_PRICE = { hair: 150, clip: 50 };
/** 月票本月限定家具（原本禮盒的家具）：{ 'YYYY-MM': { 家具 id: 松果 } } */
export const PASS_MONTH_FURN = {
  '2026-12': { box12_lux: 120, box12_globe: 50, box12_train: 50, box12_fire: 50 }, // 作者 11/20：豪華聖誕樹 120（兩種月票都能買）、其他 50
};
/** 💇 作者 11/20：12 月的髮型（假髮、髮夾）、限定家具都跟 11/27 聖誕更新一起提早開賣（11 月贊助的假髮該有的都有了） */
export const PASS_LOOK_EARLY = { '2026-12': '2026-11-27' };
/** 今天（'YYYY-MM-DD'）月票造型賣哪個月的 */
export function passLookMonth(day) {
  for (const [ym, from] of Object.entries(PASS_LOOK_EARLY)) if (day >= from && day.slice(0, 7) < ym) return ym;
  return day.slice(0, 7);
}
/** 這個月（'YYYY-MM'）月票能買的造型（outfits.js 的 OUTFITS 傳進來）：當月的假髮（女生款、男生款）＋當月的髮夾 */
export const passMonthLooks = (outfits, ym) =>
  ym < SPONSOR_END ? [] : outfits.filter((o) => (o.src === 'sponsor' || o.src === 'pass') && o.month === ym).map((o) => ({ ...o, price: PASS_LOOK_PRICE[o.slot] ?? 50 }));
