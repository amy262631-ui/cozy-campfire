/**
 * 🎲 營火桌遊（作者 11/13：1 月桌遊，第一批 🪵 抽樹枝、🫧 吹泡泡）——前端、伺服器共用的規則
 *   作者 11/13：不放桌椅（太多桌子）→ 坐在營火圓木上按「🎲 桌遊」發起，坐在營火旁的人按「加入」；
 *   抽到的樹枝、吹的泡泡出現在每個人頭上，旁邊的人也看得到
 *   作者：先藏起來，等作者說再開 → BOARD_ON＝false 時，看不到「🎲 桌遊」按鈕、伺服器也不收。
 *   測試：網址加 ?board=1 前端先看得到（伺服器要設 BOARD_TEST=1）
 */
export const BOARD_ON = true; // 作者 11/13：今天就開
export const boardOn = () => {
  if (BOARD_ON) return true;
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('board') === '1') return true;
  } catch {
    /* 伺服器沒有 location */
  }
  return typeof globalThis !== 'undefined' && !!globalThis.__boardPreview;
};
export const BOARD_GAMES = [
  { id: 'stick', icon: '🪵', zh: '抽樹枝', how: '輪流抽一根，最長的贏' },
  { id: 'bubble', icon: '🫧', zh: '吹泡泡', how: '按住吹，最大的贏；吹太大會破' },
  // 🐸 作者 11/13：有小朋友，要簡單 → 輪流點一個洞，戳到青蛙跳出來的人輸；只在畫面上的小視窗玩，不放 3D 模型
  { id: 'frog', icon: '🐸', zh: '青蛙跳出來', how: '輪流戳一個洞，戳到青蛙跳出來的人就輸了' },
];
export const FROG_HOLES = 8; // 🐸 木桶上幾個洞
export const BOARD_MIN = 2; // 幾個人才能開始
export const BOARD_MAX = 6; // 一局最多幾個人
export const BOARD_WIN = 2; // 贏家拿幾顆松果
export const BOARD_DAY_CAP = 20; // 每天從桌遊最多拿幾顆（上限到了照樣能玩）

