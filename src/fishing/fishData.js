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
  // ---- 圖鑑擴充到 50 種 ----
  { name: t('石斑仔'), rarity: 1, min: 12, max: 24, color: 0x8c8f80, patch: 0x5a5d50, weight: 14, pull: 7, fight: 0.05, window: 1.6 },
  { name: t('小蝦虎'), rarity: 1, min: 6, max: 14, color: 0xb8a07a, weight: 14, pull: 6, fight: 0.05, window: 1.6 },
  { name: t('泥鰍'), rarity: 1, min: 12, max: 25, color: 0x7a6a4e, weight: 12, pull: 7, fight: 0.05, window: 1.6 },
  { name: t('大肚魚'), rarity: 1, min: 4, max: 8, color: 0x9fb0a8, weight: 12, pull: 5, fight: 0.04, window: 1.6 },
  { name: t('苦花'), rarity: 2, min: 16, max: 32, color: 0x6f7f8a, weight: 8, pull: 10, fight: 0.07, window: 1.4 },
  { name: t('鯰魚'), rarity: 2, min: 30, max: 70, color: 0x5e5a50, weight: 7, pull: 12, fight: 0.08, window: 1.4 },
  { name: t('七星鱧'), rarity: 2, min: 25, max: 50, color: 0x4e5a48, patch: 0x2a2a20, weight: 6, pull: 11, fight: 0.07, window: 1.4 },
  { name: t('金魚'), rarity: 2, min: 8, max: 18, color: 0xff9a3a, weight: 6, pull: 8, fight: 0.06, window: 1.4, where: 'pond', note: t('只在營火河畔出現') },
  { name: t('藍鰓太陽魚'), rarity: 2, min: 12, max: 24, color: 0x5f88b0, patch: 0xffb050, weight: 6, pull: 10, fight: 0.07, window: 1.4 },
  { name: t('銀鱗白條'), rarity: 2, min: 12, max: 26, color: 0xdfe8ef, weight: 7, pull: 9, fight: 0.07, window: 1.4, where: 'lake', note: t('只在湖畔碼頭出現') },
  { name: t('抹茶鯉'), rarity: 2, min: 20, max: 40, color: 0x8fb070, weight: 6, pull: 11, fight: 0.07, window: 1.4 },
  { name: t('鱸魚'), rarity: 3, min: 30, max: 65, color: 0x7c8a6a, weight: 4, pull: 14, fight: 0.09, window: 1.25 },
  { name: t('鱘龍魚'), rarity: 3, min: 60, max: 120, color: 0x8a8d90, weight: 2.5, pull: 16, fight: 0.1, window: 1.25, where: 'lake', note: t('只在湖畔碼頭出現') },
  { name: t('河豚寶寶'), rarity: 3, min: 8, max: 18, color: 0xf2e3a0, patch: 0x6a5a3a, weight: 3, pull: 12, fight: 0.08, window: 1.25, note: t('一緊張就鼓起來') },
  { name: t('薄荷鯉'), rarity: 3, min: 25, max: 50, color: 0xbff5dc, weight: 3.5, pull: 13, fight: 0.09, window: 1.25 },
  { name: t('櫻桃燈魚'), rarity: 3, min: 6, max: 12, color: 0xff4d6a, glow: 0xff8aa0, weight: 3, pull: 12, fight: 0.08, window: 1.25, where: 'pond', note: t('只在營火河畔出現') },
  { name: t('栗子鯽'), rarity: 3, min: 20, max: 38, color: 0xa86b3a, weight: 3.5, pull: 13, fight: 0.09, window: 1.25 },
  { name: t('晚霞鯉'), rarity: 3, min: 30, max: 60, color: 0xff9e7a, patch: 0xb07aff, weight: 3, pull: 14, fight: 0.09, window: 1.25, where: 'lake', note: t('只在湖畔碼頭出現') },
  { name: t('蜂蜜鱒'), rarity: 4, min: 30, max: 55, color: 0xffc25a, weight: 1.4, pull: 18, fight: 0.11, window: 1.15 },
  { name: t('森林鱷雀鱔'), rarity: 4, min: 60, max: 110, color: 0x6d7a55, weight: 1, pull: 20, fight: 0.12, window: 1.1, where: 'lake', note: t('長得像小恐龍') },
  { name: t('雲朵魚'), rarity: 4, min: 25, max: 50, color: 0xffffff, glow: 0xe8f2ff, weight: 1.2, pull: 18, fight: 0.11, window: 1.15, note: t('摸起來軟綿綿的') },
  { name: t('極光魚'), rarity: 4, min: 30, max: 60, color: 0x7affd0, glow: 0x7ab0ff, weight: 3, pull: 18, fight: 0.11, window: 1.15, when: 'event', note: t('只在每晚 9 點營火時間出現') },
  { name: t('琥珀鯰'), rarity: 4, min: 50, max: 95, color: 0xd99a3a, glow: 0xffc070, weight: 1, pull: 19, fight: 0.11, window: 1.1, where: 'pond', note: t('只在營火河畔出現') },
  { name: t('熊貓魚'), rarity: 4, min: 20, max: 40, color: 0xffffff, patch: 0x222222, weight: 1, pull: 18, fight: 0.11, window: 1.15, note: t('黑白配色超可愛') },
  { name: t('松果魚'), rarity: 4, min: 15, max: 30, color: 0x8a5a30, patch: 0xc88a50, weight: 1.2, pull: 18, fight: 0.11, window: 1.15, note: t('營地的吉祥物？') },
  { name: t('銀河鯨鯉'), rarity: 5, min: 90, max: 128, color: 0x1a2050, glow: 0xc8a0ff, weight: 1.2, pull: 26, fight: 0.14, window: 1.0, when: 'event', note: t('只在每晚 9 點營火時間出現') },
  { name: t('鳳凰鯉'), rarity: 5, min: 80, max: 125, color: 0xff5030, glow: 0xffd060, weight: 1.2, pull: 26, fight: 0.14, window: 1.0, when: 'contest', note: t('只在整點釣魚大賽時出現') },
  { name: t('彩虹獨角魚'), rarity: 5, min: 50, max: 90, color: 0xffb0e0, glow: 0xa0e0ff, weight: 0.25, pull: 26, fight: 0.14, window: 1.0, note: t('看過的人都說會帶來好運') },
  { name: t('漂流瓶'), rarity: 0, junk: 'bottle', min: 18, max: 22, color: 0xd8f0ff, weight: 1.5, pull: 4, fight: 0.02, window: 1.6, note: t('裡面有一張紙條') },
  { name: t('生鏽罐頭'), rarity: 0, junk: 'can', min: 10, max: 12, color: 0x9a8a7a, weight: 1.5, pull: 4, fight: 0.02, window: 1.6 },
  // ---- 🐉 傳說之魚：超大、超稀有，釣到時整個伺服器都會看到公告 ----
  { name: t('遠古湖神鯨'), rarity: 5, legend: true, min: 180, max: 299, color: 0x2d4a6a, glow: 0x7ad8ff, weight: 0.12, pull: 34, fight: 0.17, window: 0.95, where: 'lake', note: t('傳說中住在湖底最深處') },
  { name: t('熔岩火龍魚'), rarity: 5, legend: true, min: 160, max: 260, color: 0xff4a1a, glow: 0xffb000, weight: 0.12, pull: 34, fight: 0.17, window: 0.95, where: 'pond', note: t('被營火的光吸引而來') },
  { name: t('星河龍王'), rarity: 5, legend: true, min: 220, max: 320, color: 0x241a5a, glow: 0xffe28a, weight: 0.25, pull: 38, fight: 0.18, window: 0.9, when: 'event', note: t('只在每晚 9 點，從星空游下來') },
];
/** 第一次釣到某種魚（收進圖鑑）送的松果，依星等（伺服器 server/index.js 的 DEX_GAIN 相同） */
export const DEX_GAIN = [1, 2, 3, 5, 10, 20];
export const DEX_BONUS = 100; // 圖鑑全部收集完
export const LEGEND_DEX_GAIN = 50; // 第一次釣到傳說之魚
/** 第一次釣到這種魚送幾顆松果 */
export const dexGain = (f) => (f.legend ? LEGEND_DEX_GAIN : DEX_GAIN[f.rarity] ?? 1);
/** 每釣一次送的松果（傳說之魚特別多） */
export const catchGain = (f) => (f.legend ? 30 : [0, 1, 2, 3, 6, 15][f.rarity] ?? 0);
/** 伺服器檢查尺寸用 */
export const FISH_MAX_CM = Math.max(...FISH.map((f) => f.max));

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
