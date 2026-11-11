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
 * 🎁 本月禮盒的家具（12 月起才有）。還沒有禮盒家具的月份：NT$60 選項先藏起來，只有「贊助 NT$100 以上送假髮」
 *   { 'YYYY-MM': [家具 id, ...] }
 */
export const SPONSOR_BOX = {};
/** 這個月可以選的金額（都可以選） */
export const sponsorAmounts = () => SPONSOR.amounts;
/** 這個月贊助多少以上送假髮：還沒有禮盒家具的月份（11 月）NT$60 以上都送（作者 11/11）；12 月起有禮盒後 NT$60 是小東西、NT$100 以上才有假髮 */
export const sponsorMin = (month) => (SPONSOR_BOX[month]?.length ? SPONSOR.min : SPONSOR.amounts[0]);
