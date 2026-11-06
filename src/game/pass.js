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
/** 免費玩家：釣魚每天前 30 條照價算、掛機每天最多 30 顆 */
export const FREE = { fish: 30, sit: 30 };
/** 舊程式用（預設小營火） */
export const PASS = PASS_TIERS.ember;

/**
 * ☕ 贊助（請作者喝咖啡）：NT$100 以上自動拿到「這個月的贊助限定假髮」（outfits.js 的 sponsor 造型，每月一款）。
 * 小黃花、四葉草是作者親友團的心意，不是贊助贈品（還是手動寫在 server/data/sponsors.json）。
 */
export const SPONSOR = {
  amounts: [60, 100, 150, 200], // 可以選的金額（新台幣）；NT$60 只是請喝咖啡，沒有假髮
  min: 100, // 這個金額以上送假髮
  item: '請作者喝咖啡（迷霧森林露營地）',
};
