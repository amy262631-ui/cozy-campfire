/**
 * 🎄 12/24～27 聖誕 4 天特別活動（作者 11/24 同意方向，11/28 說開始做）。前端、伺服器共用。
 *
 * ① 每天拆禮物：12/17～27 營火廣場大聖誕樹下有「自己的」禮物盒，每天拆一次 +10 🌰
 *    作者 11/28：釣竿提早一週可以拿、**不要綁上線幾天** → 第一次拆就送 🎄 拐杖糖聖誕釣竿（不賣）
 * ② 12/24 晚上 9 點：聖誕老人雪橇一定飛過營火廣場，灑一地小禮物盒（每人最多撿 3 個、每個 +5 🌰）；8:55 先公告
 * ③ 12/25 一整天：大家一起在營火廣場堆大雪人（身體 → 頭 → 帽子圍巾，每段完成有參加的人 +10 🌰），雪人留到 1/6
 * ④ 12/26～27：假日活動「🎁 聖誕交換禮物」（holiday.js 的 xgift；整點聖誕樹下冒一個大禮物 +20 🌰）
 *    原本 12/26、27 輪到大掃除／雞蛋節 → 假日輪替往後挪一週（holiday.js 的 holWeek）
 *
 * ⚠️ 存檔：wal.xev = { d: { 'YYYY-MM-DD': 1 }（哪幾天拆過）, sg: { day, n }（雪橇禮物撿了幾個）}；wal.rods＝拿到的釣竿皮膚、wal.rod＝現在用的
 *    totals.snow = { y: 年, n: 堆了幾下, got: { 0: 1 }, who: { vid: 1 } }
 */
export const XEV_DAYS = ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'];
/** 🎁 樹下禮物盒哪幾天有（作者 11/28：比 4 天活動提早一週開始） */
export const XEV_BOX_FROM = '2026-12-17';
export const XEV_BOX_TO = '2026-12-27';
/** 每天的禮物盒送幾顆松果（底） */
export const XEV_BOX_GAIN = 10;
/**
 * 🎁 每天的禮物不一樣（作者 11/28：每天都想來拆＋日曆格）：每天都有 +10 🌰，再加當天的小禮物
 *   pc＝多給的松果、bk＝採集籃材料 { id: 數量 }（料理用）、furn＝家具 id（放進背包）
 *   第一次拆（不管哪一天）另外送 🎄 聖誕釣竿
 */
export const XEV_GIFTS = {
  '2026-12-17': { pc: 5 },
  '2026-12-18': { bk: { strawberry: 3, blueberry: 3 } },
  '2026-12-19': { furn: 'xm_cane' },
  '2026-12-20': { pc: 10 },
  '2026-12-21': { bk: { poinsettia: 2 } },
  '2026-12-22': { furn: 'xm_wreath' },
  '2026-12-23': { bk: { shiitake: 3, chestnut: 3 } },
  '2026-12-24': { furn: 'box12_ginger' },
  '2026-12-25': { furn: 'box12_stocking', pc: 10 },
  '2026-12-26': { bk: { star_berry: 1, wild_apple: 3 } },
  '2026-12-27': { furn: 'box12_gifts' },
};
/** 連續幾天拆到送釣竿（作者 11/28：不要綁上線天數 → 1＝第一次拆就送；之後想改成連續幾天，改這個數字就好） */
export const XEV_STREAK = 1;
/** 連續拆到送的釣竿皮膚 */
export const XEV_ROD = 'xmas';

/** 🛷 12/24 晚上 9 點雪橇灑禮物 */
export const SLEIGH_DROP = {
  day: '2026-12-24',
  h: 21,
  warnMin: 5, // 前 5 分鐘公告
  n: [20, 30], // 每個分流灑幾個
  gain: 5, // 撿一個 +5 🌰
  cap: 3, // 一個人最多撿 3 個（大家都撿得到）
  dropAt: 9000, // 雪橇出現後幾毫秒開始掉
  keepMin: 30, // 沒人撿的 30 分鐘後收起來
};

/** ⛄ 12/25 一起堆大雪人 */
export const SNOWMAN = {
  day: '2026-12-25',
  until: '2027-01-06', // 雪人留到這天（含）
  steps: [100, 200, 300], // 全營地一起「堆一下」的次數：身體、頭、帽子圍巾
  gain: 10, // 每段完成有參加的人 +10 🌰
  cd: 4000, // 一個人每 4 秒才能堆一下（動作本身 2 秒）
};
/** 雪人放哪（作者 11/28：祈福處的右手邊（從營火往祈福處看）；避開石塔、石燈籠、小雪人） */
export const SNOWMAN_POS = { x: -6.3, z: 12.8 };

const addDay = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
/** 'YYYY-MM-DD' 是 4 天裡的第幾天（0～3），不是就 -1 */
export const xevIndex = (day) => XEV_DAYS.indexOf(day);
/** 禮物盒的每一天（日曆格用） */
export const boxDays = () => {
  const out = [];
  for (let k = XEV_BOX_FROM; k <= XEV_BOX_TO; k = addDay(k, 1)) out.push(k);
  return out;
};
/** 這天樹下有沒有禮物盒 */
export const boxOn = (day) => day >= XEV_BOX_FROM && day <= XEV_BOX_TO;
/** 到 day 為止連續拆了幾天（day 沒拆就從前一天算） */
export function boxStreak(d = {}, day) {
  let k = d[day] ? day : addDay(day, -1);
  let n = 0;
  while (d[k]) {
    n++;
    k = addDay(k, -1);
  }
  return n;
}
/** 今天之後還有幾天有禮物盒 */
export const boxDaysLeft = (day) => Math.max(0, Math.round((Date.parse(`${XEV_BOX_TO}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000));
/** 雪人看不看得到（12/25 開始堆，留到 1/6） */
export const snowmanOn = (day) => day >= SNOWMAN.day && day <= SNOWMAN.until;
/** 堆到第幾段了（0＝還沒、3＝完成） */
export const snowStage = (n) => SNOWMAN.steps.filter((s) => n >= s).length;
