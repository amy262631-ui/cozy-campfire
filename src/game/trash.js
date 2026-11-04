/**
 * ♻️ 撿垃圾（前端、伺服器共用的資料）。
 *
 * - 湖裡：釣魚偶爾釣到垃圾（原本的漂流瓶、生鏽罐頭之外，還會釣到更多種）
 * - 湖邊岸上、帳篷營地的路邊、中央營火區：偶爾冒出垃圾，同一分流誰看到誰撿（按 E 撿起來）
 * - 撿到的垃圾放在「垃圾袋」，拿去營火旁的「♻️ 回收桶」丟，換一點松果
 * - 「♻️ 垃圾」圖鑑：撿過哪些；全部收集完送「淨灘小隊」造型
 *
 * ⚠️ id 存檔用，不能改。
 *   where：會出現在哪裡（lake 湖裡釣到、shore 湖邊、camp 營地路邊、fire 營火區）
 *   model：3D 小模型的樣子（trashModels.js）
 */
export const TRASH = [
  { id: 'pet_bottle', icon: '🧴', zh: '寶特瓶', rarity: 1, where: ['lake', 'shore', 'camp', 'fire'], model: 'bottle', color: 0x9fd8ff },
  { id: 'can', icon: '🥫', zh: '鋁罐', rarity: 1, where: ['lake', 'shore', 'camp', 'fire'], model: 'can', color: 0xd2453c },
  { id: 'plastic_bag', icon: '🛍️', zh: '塑膠袋', rarity: 1, where: ['lake', 'shore', 'camp'], model: 'bag', color: 0xf6f3ec },
  { id: 'straw', icon: '🥤', zh: '吸管', rarity: 1, where: ['shore', 'camp', 'fire'], model: 'stick', color: 0xff8ab0 },
  { id: 'chopsticks', icon: '🥢', zh: '免洗筷', rarity: 1, where: ['camp', 'fire'], model: 'stick', color: 0xe8c890 },
  { id: 'paper_cup', icon: '🥛', zh: '紙杯', rarity: 1, where: ['camp', 'fire'], model: 'cup', color: 0xffffff },
  { id: 'lunchbox', icon: '🍱', zh: '便當盒', rarity: 2, where: ['camp', 'fire'], model: 'box', color: 0xe8dcc8 },
  { id: 'styrofoam', icon: '⬜', zh: '保麗龍碎片', rarity: 1, where: ['lake', 'shore'], model: 'box', color: 0xffffff },
  { id: 'cigarette', icon: '🚬', zh: '菸蒂', rarity: 1, where: ['shore', 'camp', 'fire'], model: 'stick', color: 0xf0e0c0 },
  { id: 'mask', icon: '😷', zh: '口罩', rarity: 1, where: ['shore', 'camp', 'fire'], model: 'flat', color: 0x9fd0f0 },
  { id: 'lighter', icon: '🔥', zh: '打火機', rarity: 2, where: ['camp', 'fire'], model: 'box', color: 0xf2c14e },
  { id: 'battery', icon: '🔋', zh: '廢電池', rarity: 2, where: ['camp', 'shore'], model: 'can', color: 0x3a3a3a },
  { id: 'fishing_line', icon: '🧵', zh: '釣魚線', rarity: 2, where: ['lake', 'shore'], model: 'tangle', color: 0xd8f0ff },
  { id: 'net_scrap', icon: '🕸️', zh: '漁網碎片', rarity: 2, where: ['lake', 'shore'], model: 'tangle', color: 0x6a9a7a },
  { id: 'float', icon: '🎈', zh: '舊浮標', rarity: 2, where: ['lake', 'shore'], model: 'ball', color: 0xf08a3c },
  { id: 'slipper', icon: '🩴', zh: '單隻拖鞋', rarity: 2, where: ['lake', 'shore'], model: 'flat', color: 0x4a74b5 },
  { id: 'glove', icon: '🧤', zh: '工作手套', rarity: 2, where: ['camp', 'shore'], model: 'flat', color: 0xe8e0cc },
  { id: 'glass_bottle', icon: '🍾', zh: '玻璃瓶', rarity: 2, where: ['lake', 'shore', 'fire'], model: 'bottle', color: 0x5a9a5a },
  { id: 'bottle_cap', icon: '⚪', zh: '瓶蓋', rarity: 1, where: ['shore', 'camp', 'fire'], model: 'ball', color: 0x4a74b5 },
  { id: 'balloon', icon: '🎈', zh: '洩氣的氣球', rarity: 2, where: ['lake', 'camp'], model: 'flat', color: 0xe0443c },
  { id: 'toothbrush', icon: '🪥', zh: '舊牙刷', rarity: 2, where: ['shore', 'lake'], model: 'stick', color: 0x7ac0e0 },
  { id: 'umbrella', icon: '☂️', zh: '壞掉的雨傘', rarity: 3, where: ['camp', 'shore'], model: 'stick', color: 0x3a3a5a },
  { id: 'cup_lid', icon: '🧋', zh: '飲料杯蓋', rarity: 1, where: ['camp', 'fire', 'shore'], model: 'flat', color: 0xf6f3ec },
  { id: 'tire', icon: '🛞', zh: '舊輪胎', rarity: 3, where: ['lake'], model: 'tire', color: 0x2a2a2a },
];
export const TRASH_BY_ID = Object.fromEntries(TRASH.map((x) => [x.id, x]));
/** 每種地方同時最多幾件垃圾（同一分流） */
export const TRASH_MAX = { shore: 3, camp: 4, fire: 2 };
/** 垃圾出現在哪個房間 */
export const TRASH_ROOM = { shore: 'lake_dock', camp: 'campground', fire: 'forest_main' };
/** 丟回收桶：每件換幾顆松果、每天最多換幾顆 */
export const RECYCLE_GAIN = 1;
export const RECYCLE_DAILY_CAP = 20;
/** 撿到新的一種：送松果；全部收集完的獎勵造型 */
export const TRASH_FIRST_GAIN = [0, 1, 2, 4];
export const TRASH_DEX_OUTFIT = 'eco_bandana';

/** 在某個地方隨機抽一種垃圾（常見的比較多） */
export function pickTrash(where, rand = Math.random) {
  const pool = TRASH.filter((x) => x.where.includes(where));
  const w = (x) => [0, 8, 3, 1][x.rarity];
  let r = rand() * pool.reduce((a, x) => a + w(x), 0);
  for (const x of pool) if ((r -= w(x)) <= 0) return x;
  return pool[0];
}
