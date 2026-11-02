import { t } from '../i18n/i18n.js';

/**
 * 魚的種類。前端與伺服器共用索引（伺服器只檢查索引範圍與尺寸上限）。
 *   rarity  0 = 垃圾，1~5 = 星等
 *   weight  出現機率權重
 *   pull    需要連點幾下才拉得上來
 *   fight   魚掙扎時，進度每秒倒退多少
 *   window  咬鉤後有幾秒可以拉竿
 */
export const FISH = [
  { name: t('小溪哥'), rarity: 1, min: 10, max: 22, color: 0xa9c3d3, weight: 30, pull: 7, fight: 0.05, window: 1.6 },
  { name: t('吳郭魚'), rarity: 1, min: 15, max: 38, color: 0x8a9a78, weight: 26, pull: 9, fight: 0.06, window: 1.5 },
  { name: t('香魚'), rarity: 2, min: 14, max: 28, color: 0xcdbb73, weight: 15, pull: 10, fight: 0.07, window: 1.4 },
  { name: t('鯽魚'), rarity: 2, min: 18, max: 42, color: 0xb59c66, weight: 12, pull: 11, fight: 0.07, window: 1.4 },
  { name: t('錦鯉'), rarity: 3, min: 35, max: 78, color: 0xf7f2ea, patch: 0xe8642c, weight: 6, pull: 15, fight: 0.09, window: 1.25 },
  { name: t('櫻花鉤吻鮭'), rarity: 4, min: 25, max: 48, color: 0xe9adb9, weight: 3, pull: 18, fight: 0.11, window: 1.15, note: t('台灣的國寶魚') },
  { name: t('月光魚'), rarity: 4, min: 30, max: 62, color: 0xc4e6ff, glow: 0x5fb0ff, weight: 2.2, pull: 19, fight: 0.11, window: 1.1, note: t('只在月光下出現') },
  { name: t('黃金鯉魚王'), rarity: 5, min: 70, max: 120, color: 0xffd04d, glow: 0xffa000, weight: 0.6, pull: 26, fight: 0.14, window: 1.0, note: t('傳說中的湖之王') },
  { name: t('舊靴子'), rarity: 0, junk: 'boot', min: 26, max: 30, color: 0x5a4030, weight: 2, pull: 5, fight: 0.02, window: 1.6 },
  { name: t('寶特瓶'), rarity: 0, junk: 'bottle', min: 20, max: 25, color: 0xbfe8e0, weight: 2, pull: 4, fight: 0.02, window: 1.6 },
  // ---- 圖鑑追加：特殊魚（where：只在某個水域；when：只在某個時段）----
  { name: t('竹葉魚'), rarity: 2, min: 15, max: 30, color: 0x9ccf7a, weight: 10, pull: 10, fight: 0.07, window: 1.4 },
  { name: t('溪哥王'), rarity: 3, min: 25, max: 45, color: 0x7fb6d6, patch: 0xff8a50, weight: 4, pull: 14, fight: 0.09, window: 1.25 },
  { name: t('螢光燈籠魚'), rarity: 3, min: 18, max: 36, color: 0xe8ffcf, glow: 0xb8ff7a, weight: 6, pull: 13, fight: 0.08, window: 1.25, where: 'pond', note: t('只在營火河畔出現') },
  { name: t('彩虹鱒'), rarity: 3, min: 28, max: 55, color: 0xd9a3ff, patch: 0x6fd0ff, weight: 6, pull: 14, fight: 0.09, window: 1.25, where: 'lake', note: t('只在湖畔碼頭出現') },
  { name: t('星空鯉'), rarity: 4, min: 40, max: 80, color: 0x2b3a7a, glow: 0x9fb8ff, weight: 5, pull: 18, fight: 0.11, window: 1.15, when: 'event', note: t('只在每晚 9 點營火時間出現') },
  { name: t('營火紅鯉'), rarity: 4, min: 35, max: 70, color: 0xff6a3a, patch: 0xffd08a, weight: 1.6, pull: 18, fight: 0.11, window: 1.15, note: t('鱗片像火光一樣') },
  { name: t('雪白龍鯉'), rarity: 5, min: 80, max: 128, color: 0xf6fbff, glow: 0xcfe8ff, weight: 2, pull: 26, fight: 0.14, window: 1.0, when: 'contest', note: t('只在整點釣魚大賽時出現') },
];
/** 第一次釣到某種魚（收進圖鑑）送的松果，依星等（伺服器 server/index.js 的 DEX_GAIN 相同） */
export const DEX_GAIN = [1, 2, 3, 5, 10, 20];
export const DEX_BONUS = 50; // 圖鑑全部收集完

/** 這個水域、這個時段釣得到嗎 */
export const fishAvailable = (f, ctx = {}) =>
  (!f.where || f.where === ctx.place) && (!f.when || (f.when === 'event' && ctx.event) || (f.when === 'contest' && ctx.contest));

/**
 * 依權重隨機挑一種
 * @param {{ place?: 'pond' | 'lake', event?: boolean, contest?: boolean }} ctx 在哪裡釣、是不是營火時間或釣魚大賽
 */
export function rollFish(ctx = {}) {
  const ok = FISH.map((f) => (fishAvailable(f, ctx) ? f.weight : 0));
  const total = ok.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < FISH.length; i++) {
    r -= ok[i];
    if (ok[i] && r <= 0) return i;
  }
  return 0;
}

/** 隨機尺寸：大的比較少見 */
export function rollSize(index) {
  const f = FISH[index];
  return Math.round(f.min + (f.max - f.min) * Math.pow(Math.random(), 1.6));
}

export const stars = (rarity) => (rarity > 0 ? '★'.repeat(rarity) + '☆'.repeat(5 - rarity) : '');

/** 網路傳輸用：把魚種與尺寸壓成一個整數 */
export const packFish = (index, size) => index * 1000 + Math.min(999, Math.max(0, size));
export const unpackFish = (code) => ({ index: Math.floor(code / 1000), size: code % 1000 });
