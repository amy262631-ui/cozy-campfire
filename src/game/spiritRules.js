/**
 * ✨ 小精靈的規則（前端、伺服器共用）。外型在 src/player/spirit.js。
 * 作者 11/11 定案：
 *   - 大家一開始都是小光點，玩遊戲累積「親密度」長大：光點 → 小精靈 → 長大（翅膀＋光環）
 *   - 中等速度：玩 2～3 天變小精靈，再 1～2 週長大
 *   - 變成小精靈時，看你最常做什麼決定樣子（6 種都能玩出來，見 SPIRIT_ACT_KIND）
 *   - 長大以後可以花 300 松果換成任何一種
 *   - 可以餵料理，喜歡的料理長得比較快；沒來不會生病、不會離開
 * ⚠️ 存檔欄位（wal.spirit）：xp 親密度、c 各活動次數、t 種類、day 今天的上限紀錄、last 上次來、off 隱藏
 */
export const SPIRIT_STAGE_AT = [0, 60, 400]; // 親密度到多少變下一階段
export const SPIRIT_XP = { fish: 2, fire: 1, gather: 1, cook: 2, mushGather: 1, harvest: 2, forest: 1, rest: 1, chat: 1, wish: 1, stargaze: 1 }; // 每做一次加多少
/**
 * 每種活動算在哪一種小精靈（作者 11/11：6 種都能玩出來）：
 *   💧 水滴：釣魚　🔥 火苗：添柴、煮菜　🍃 葉子：採集（花、果子、石頭⋯）
 *   ☁️ 雲朵：坐著發呆、睡覺、裹毯子休息、在營地陪別人聊天
 *   ⭐ 星星：看星星、許願（繪馬、抽籤、流星）；晚上或營火時間做任何事也會多算一點星星
 *   🍄 蘑菇：採蘑菇、在迷霧森林採集、去迷霧森林、種菜收成
 */
export const SPIRIT_ACT_KIND = { fish: 'fish', fire: 'fire', cook: 'fire', gather: 'gather', mushGather: 'mush', harvest: 'mush', forest: 'mush', rest: 'cloud', chat: 'cloud', wish: 'star', stargaze: 'star' };
export const SPIRIT_NIGHT_STAR = 0.5; // 晚上（18～6 點）或營火時間做事，星星多算 0.5
export const SPIRIT_DAY_CAP = 40; // 一天玩遊戲最多加這麼多（餵食另外算）
export const SPIRIT_FEED_DAY = 3; // 一天最多餵 3 次
export const SPIRIT_FEED_XP = 6;
export const SPIRIT_FAV_XP = 12; // 喜歡的料理
export const SPIRIT_CHANGE_PRICE = 300;
// 🥚 孵蛋器（作者 11/11 改）：一開始沒有小精靈（有的人養、有的人不養）。到商店「✨ 小精靈」買「小精靈蛋＋孵蛋器」：
//    第一顆 100 松果、買了馬上孵出來；之後每顆 300、10 分鐘孵好。（舊註解：第一隻免費，已取消）
export const SPIRIT_FIRST_PRICE = 100;
// 以下是第二隻以後：在商店「✨ 小精靈」買孵蛋器，放一顆蛋，10 分鐘後孵出新的小光點，再靠玩遊戲養大
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
    ['cloud', c.cloud ?? 0],
    ['star', c.star ?? 0],
    ['mush', c.mush ?? 0],
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
