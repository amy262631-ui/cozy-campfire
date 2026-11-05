/**
 * 🐾 動物外型（前端、伺服器共用的資料）：特殊毛色、尾巴、耳朵。
 * 所有動物都能用（熊貓是固定的黑白配色，不能換毛色）。用松果買，買過的可以隨時換。
 * 動物本來的尾巴、耳朵免費；換成別的形狀要先買。
 */
/** 一開始就能選的毛色有幾種（0～4，在 furPalettes.js） */
export const BASE_FUR = 5;
/** 特殊毛色：索引接在一般毛色後面（顏色在 furPalettes.js） */
export const PREMIUM_FUR = [
  { i: 5, icon: '🧡', zh: '橘貓', price: 80 },
  { i: 6, icon: '🖤', zh: '黑貓', price: 100 },
  { i: 7, icon: '🤎', zh: '暹羅', price: 120 },
  { i: 8, icon: '🩶', zh: '藍灰', price: 100 },
  { i: 9, icon: '🤍', zh: '賓士', price: 120 },
  { i: 10, icon: '🍁', zh: '三花', price: 150 },
];
export const FUR_TOTAL = BASE_FUR + PREMIUM_FUR.length;
export const TAILS = [
  { id: 'fox', icon: '🦊', zh: '蓬蓬狐狸尾', price: 30 },
  { id: 'cat', icon: '🐱', zh: '珠珠貓尾', price: 30 },
  { id: 'stub', icon: '🐻', zh: '小圓球尾', price: 30 },
  { id: 'cotton', icon: '🐰', zh: '棉花尾', price: 30 },
  { id: 'curl', icon: '🐕', zh: '捲捲尾', price: 30 },
  { id: 'sleek', icon: '〰️', zh: '滑順長尾', price: 45 },
  { id: 'lion', icon: '🦁', zh: '獅子尾', price: 45 },
  { id: 'fluffy', icon: '☁️', zh: '大蓬蓬尾', price: 60 },
];
export const EARS = [
  { id: 'fox', icon: '🦊', zh: '狐狸耳', price: 30 },
  { id: 'cat', icon: '🐱', zh: '貓咪耳', price: 30 },
  { id: 'round', icon: '🐻', zh: '圓圓耳', price: 30 },
  { id: 'long', icon: '🐰', zh: '兔子長耳', price: 30 },
  { id: 'dog', icon: '🐕', zh: '柴犬耳', price: 30 },
  { id: 'fold', icon: '🙀', zh: '折耳', price: 45 },
  { id: 'droopy', icon: '🐶', zh: '垂垂耳', price: 45 },
  { id: 'fennec', icon: '🌵', zh: '大耳狐耳', price: 60 },
];
export const TAIL_BY_ID = Object.fromEntries(TAILS.map((x) => [x.id, x]));
export const EAR_BY_ID = Object.fromEntries(EARS.map((x) => [x.id, x]));
/** 每種動物本來的尾巴、耳朵（跟 characters/species.js 一致：狐狸、貓、熊、兔、熊貓、柴犬） */
export const SPECIES_TAIL = ['fox', 'cat', 'stub', 'cotton', 'stub', 'curl'];
export const SPECIES_EARS = ['fox', 'cat', 'round', 'long', 'round', 'dog'];
