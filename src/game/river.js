/**
 * 🔥 營火河畔新玩法（作者 11/20，11/27 開）：前端、伺服器共用的規則
 *   🔥 營火越旺河裡越熱鬧（火 40% ×1.3、75% ×1.6＋火光魚；跟魚飼料取比較高的）
 *   🤝 河神大鯉魚：一個人拉不動，附近的人按「幫忙拉」
 *   🪨 打水漂：每天 10 顆扁石頭，跳越多下越厲害，每天排行
 *   🦆 迷你小鴨：餵蔬菜或果實，跟著走 3 分鐘（只在營火廣場；離開時在河邊等，回來再跟）
 */
export const RIVER_FROM = '2026-11-22'; // 作者 11/22：營火河畔、小肥雞、種菜擴充先開（11/27 東西才不會太多）
/** 火有多旺（0～1）→ 稀有魚倍數 */
export const fireLuck = (ratio) => (ratio >= 0.75 ? 1.6 : ratio >= 0.4 ? 1.3 : 1);
export const FIRE_HOT = 0.75;
/** 🤝 河神大鯉魚：幫忙拉的人每人送幾顆松果、最少按幾下才算有幫忙；整場最多幾秒 */
export const COOP_GAIN = 5;
export const COOP_MIN_TAPS = 4;
export const COOP_SEC = 32;
/** 🪨 打水漂 */
export const SKIP_PER_DAY = 10;
export const SKIP_GOOD = 8; // 跳這麼多下以上 +1 松果
export const SKIP_MAX = 12;
/** 力道 p（0～1）→ 跳幾下：0.72 附近最好（綠色區 0.62～0.82） */
export const SKIP_SWEET = [0.62, 0.82];
export function skipBounces(p, rnd = Math.random()) {
  const d = Math.abs(p - 0.72);
  const q = Math.max(0, 1 - d / 0.62);
  return Math.max(1, Math.min(SKIP_MAX, Math.round(SKIP_MAX * Math.pow(q, 1.6) * (0.82 + rnd * 0.22))));
}
/** 🦆 迷你小鴨 */
export const DUCK_PER_DAY = 3;
export const DUCK_MS = 3 * 60 * 1000;
export const DUCK_FIRST_GAIN = 3;
