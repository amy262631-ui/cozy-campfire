/**
 * ✨ 小精靈的規則（前端、伺服器共用）。外型在 src/player/spirit.js。
 * 作者 11/11 定案：
 *   - 大家一開始都是小光點，玩遊戲累積「親密度」長大：光點 → 小精靈 → 長大（翅膀＋光環）
 *   - 中等速度：玩 2～3 天變小精靈，再 1～2 週長大
 *   - 變成小精靈時，看你最常做什麼決定樣子：釣魚 💧、顧火／煮菜 🔥、採集 🍃
 *   - 長大以後可以花 300 松果換成任何一種（☁️ ⭐ 🍄 只能這樣換到）
 *   - 可以餵料理，喜歡的料理長得比較快；沒來不會生病、不會離開
 * ⚠️ 存檔欄位（wal.spirit）：xp 親密度、c 各活動次數、t 種類、day 今天的上限紀錄、last 上次來、off 隱藏
 */
export const SPIRIT_STAGE_AT = [0, 60, 400]; // 親密度到多少變下一階段
export const SPIRIT_XP = { fish: 2, fire: 1, gather: 1, cook: 2 }; // 每做一次加多少
export const SPIRIT_DAY_CAP = 40; // 一天玩遊戲最多加這麼多（餵食另外算）
export const SPIRIT_FEED_DAY = 3; // 一天最多餵 3 次
export const SPIRIT_FEED_XP = 6;
export const SPIRIT_FAV_XP = 12; // 喜歡的料理
export const SPIRIT_CHANGE_PRICE = 300;
// 🥚 孵蛋器（作者 11/11）：第一隻免費；在商店「✨ 小精靈」買孵蛋器，放一顆蛋，10 分鐘後孵出新的小光點，再靠玩遊戲養大
// 養好幾隻可以收起來，挑一隻帶在身邊。存檔：wal.spiritBox（收起來的）、wal.egg = { at 孵出來的時間 }
export const SPIRIT_EGG_PRICE = 300;
export const SPIRIT_EGG_MS = 10 * 60 * 1000;
export const SPIRIT_MAX = 12; // 最多養幾隻（含帶在身邊的）
export const SPIRIT_KINDS = ['drop', 'flame', 'leaf', 'cloud', 'star', 'mush'];
/** 每種小精靈喜歡吃的料理 */
export const SPIRIT_FAV = {
  drop: ['melon_smoothie', 'summer_salad', 'flower_tea', 'petal_jelly'],
  flame: ['roast_corn', 'roast_sweetpotato', 'roast_chestnut', 'spicy_pot', 'grill_platter', 'camp_skewer'],
  leaf: ['veg_skewer', 'tomato_stew', 'cabbage_roll', 'salted_edamame', 'big_pot'],
  cloud: ['honey_cookie', 'lavender_tea', 'berry_daifuku', 'popcorn', 'berry_pie'],
  star: ['star_pudding', 'gold_tart', 'moon_soup', 'carrot_cake'],
  mush: ['mush_soup', 'mush_stirfry', 'lions_mane_soup', 'forest_curry'],
};
export const spiritStage = (xp = 0) => (xp >= SPIRIT_STAGE_AT[2] ? 2 : xp >= SPIRIT_STAGE_AT[1] ? 1 : 0);
/** 依玩法決定種類：釣魚最多 💧、顧火＋煮菜最多 🔥、採集最多 🍃 */
export function autoKind(c = {}) {
  const s = [
    ['leaf', c.gather ?? 0],
    ['drop', c.fish ?? 0],
    ['flame', c.fire ?? 0],
  ];
  s.sort((a, b) => b[1] - a[1]);
  return s[0][0];
}
/** 給別人看的代碼：'drop1'、'light0'；隱藏＝'' */
export function spiritCode(sp) {
  if (!sp || sp.off) return '';
  const st = spiritStage(sp.xp);
  return st === 0 ? 'light0' : `${sp.t ?? 'leaf'}${st}`;
}
export function parseSpirit(code) {
  const m = /^(light|drop|flame|leaf|cloud|star|mush)([0-2])$/.exec(String(code ?? ''));
  return m ? { type: m[1], stage: +m[2] } : null;
}
