/**
 * 帳篷前的小菜園（前端、伺服器共用的資料）。
 *
 * - 每頂帳篷前一塊菜園，有 3 格；種子用松果買（seed：一包幾顆松果，越慢長的越貴，收成一定比種子划算）
 * - 種下去幾小時後可以收成，不會枯死（放著不收也沒關係）
 * - 朋友路過可以幫忙澆水：每次澆水少等 30 分鐘（每格最多 3 位朋友）
 * - 收成的蔬菜放進採集籃，拿到營火旁煮料理、或當手作家具的材料
 *
 * ⚠️ id 存檔用，不能改。
 */
export const CROPS = [
  { id: 'carrot', icon: '🥕', zh: '紅蘿蔔', hours: 2, seed: 1, yield: [2, 3], color: 0xf08a3c },
  { id: 'tomato', icon: '🍅', zh: '番茄', hours: 3, seed: 2, yield: [2, 4], color: 0xe0443c },
  { id: 'potato', icon: '🥔', zh: '馬鈴薯', hours: 3, seed: 2, yield: [2, 4], color: 0xc8a06a },
  { id: 'pepper', icon: '🫑', zh: '甜椒', hours: 3, seed: 2, yield: [2, 3], color: 0x5fae4a },
  { id: 'corn', icon: '🌽', zh: '玉米', hours: 4, seed: 2, yield: [2, 3], color: 0xf2c94e },
  { id: 'cabbage', icon: '🥬', zh: '高麗菜', hours: 4, seed: 2, yield: [1, 2], color: 0x8ac96a },
  { id: 'sweetpotato', icon: '🍠', zh: '地瓜', hours: 5, seed: 3, yield: [2, 3], color: 0xa8506a },
  { id: 'pumpkin', icon: '🎃', zh: '南瓜', hours: 6, seed: 3, yield: [1, 2], color: 0xe0782a },
];
export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));
export const GARDEN_SLOTS = 3;
/** 朋友澆一次水少等多久、每格最多幾位朋友澆 */
export const WATER_MS = 30 * 60 * 1000;
export const WATER_MAX = 3;
/** 第一次收成某種蔬菜送的松果 */
export const CROP_FIRST_GAIN = 3;

/** 這一格什麼時候可以收成（slot：{ c, at, w: [澆過水的人] }） */
export const readyAtOf = (slot) => {
  const c = CROP_BY_ID[slot?.c];
  if (!c) return 0;
  return slot.at + c.hours * 3600 * 1000 - Math.min(WATER_MAX, slot.w?.length ?? 0) * WATER_MS;
};
/** 長到哪個階段：0 空、1 剛發芽、2 長大中、3 可以收成 */
export function stageOf(slot, now = Date.now()) {
  const c = CROP_BY_ID[slot?.c];
  if (!c) return 0;
  const ready = readyAtOf(slot);
  if (now >= ready) return 3;
  return (now - slot.at) / (ready - slot.at) < 0.4 ? 1 : 2;
}
