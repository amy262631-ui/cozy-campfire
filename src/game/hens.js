/**
 * 🐔 小肥雞（作者 11/19 看過模擬圖、說可以；11/27 跟聖誕一起開）。前端、伺服器共用。
 *
 * - 菜園面板裡「🐔 養小肥雞」：雞舍 200 🌰（送 1 隻），之後一隻 80 🌰，最多 4 隻；毛色白／奶茶／黑芝麻自己挑，可以取名
 * - 雞舍、小雞在菜園旁邊，朋友經過營地看得到
 * - 餵採集籃的蔬菜或果實：每隻一天最多 3 次；餵滿 10 次變 2 級、30 次變 3 級（越來越圓）
 * - 作者 11/22 改：餵一次下一顆蛋（餵完 1 小時後下），沒餵不下蛋；同一隻要隔 1 小時才能再餵；3 級一次 2 顆；最多存 6 顆；1% 是金蛋
 * - 不會餓死、不會跑走
 * 存檔：homes[vid].hens = [{ c: 毛色, nm: 名字, fed: 總共餵幾次, fd: 今天日期, fn: 今天餵幾次, t: 上次撿蛋的時間 }]
 */
export const HEN_FROM = '2026-11-22'; // 作者 11/22：提早開
export const COOP_PRICE = 200;
export const HEN_PRICE = 80;
export const HEN_MAX = 4;
export const FEED_PER_DAY = 3;
export const LAY_MS = 6 * 3600 * 1000;
export const EGG_STORE = 2;
export const GOLD_EGG = 0.01;
export const HEN_COLORS = [
  { id: 0, icon: '🤍', zh: '白色' },
  { id: 1, icon: '🧋', zh: '奶茶' },
  { id: 2, icon: '🖤', zh: '黑芝麻' },
];
/** 胖胖等級 1～3 */
export const fatOf = (fed = 0) => (fed >= 30 ? 3 : fed >= 10 ? 2 : 1);
/** 下一級還要餵幾次（3 級回傳 0） */
export const fatNext = (fed = 0) => (fed >= 30 ? 0 : fed >= 10 ? 30 - fed : 10 - fed);
export const FEED_GAP_MS = 3600 * 1000; // 同一隻要隔 1 小時才能再餵
export const EGG_DELAY = 3600 * 1000; // 餵完 1 小時後下蛋
export const EGG_CAP = 6; // 最多存 6 顆（含還沒下的）
/** 舊存檔（每 6 小時自動下蛋）轉成新的：已經下好的蛋保留 */
export function henMigrate(hen, now = Date.now()) {
  if (!hen || hen.v === 2) return hen;
  const old = hen.t ? Math.min(EGG_STORE, Math.floor((now - hen.t) / LAY_MS)) * (fatOf(hen.fed) >= 3 ? 2 : 1) : 0;
  hen.eg = Array(Math.max(0, old)).fill(0);
  hen.v = 2;
  delete hen.t;
  return hen;
}
/** 現在可以撿幾顆蛋 */
export const eggsOf = (hen, now = Date.now()) => (hen?.eg ?? []).filter((t) => t <= now).length;
/** 下一顆蛋還要多久（毫秒；沒有在等的回傳 0） */
export const eggIn = (hen, now = Date.now()) => {
  const w = (hen?.eg ?? []).filter((t) => t > now);
  return w.length ? Math.min(...w) - now : 0;
};
/** 還要等多久才能再餵（毫秒） */
export const feedWait = (hen, now = Date.now()) => Math.max(0, (hen?.lf ?? 0) + FEED_GAP_MS - now);
/** 餵完：排好要下的蛋（3 級一次 2 顆），回傳排了幾顆 */
export function layOnFeed(hen, now = Date.now()) {
  hen.eg ??= [];
  const k = Math.min(fatOf(hen.fed) >= 3 ? 2 : 1, EGG_CAP - hen.eg.length);
  for (let i = 0; i < k; i++) hen.eg.push(now + EGG_DELAY);
  return Math.max(0, k);
}
/** 可以拿來餵的（採集籃裡的蔬菜、果實） */
export const canFeed = (m) => m && (m.type === 'veg' || m.type === 'fruit');
