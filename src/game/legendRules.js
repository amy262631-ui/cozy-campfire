/**
 * 🌟 森林傳說（作者 11/19）：很少很少才會在背景經過的大大守護神。前端、伺服器共用。
 * 伺服器每 30 秒幫每個有人的房間擲一次骰子；出現時同一區的人一起看到。
 *   rooms  在哪些地方出現    hours  台北時間幾點到幾點（[22, 5]＝晚上 10 點到清晨 5 點）
 *   chance 每分鐘出現的機率  dur    經過多久（毫秒）    xmas  只在聖誕期間
 * ⚠️ id 存檔用，不能改。
 */
export const LEGENDS = [
  { id: 'tortoise', icon: '🐢', zh: '星空大龜爺爺', rooms: ['mist_forest'], hours: [22, 5], chance: 0.015, dur: 55000 },
  { id: 'whale', icon: '🐋', zh: '霧中雲鯨', rooms: ['lake_dock'], hours: [22, 5], chance: 0.015, dur: 50000 },
  { id: 'sleigh', icon: '🛷', zh: '聖誕老人雪橇', rooms: ['forest_main', 'campground', 'lake_dock'], hours: [19, 24], chance: 0.04, dur: 30000, xmas: true },
];
export const LEGEND_BY_ID = Object.fromEntries(LEGENDS.map((x) => [x.id, x]));
/** 第一次看到送幾顆松果 */
export const LEGEND_GAIN = 20;
/** 台北時間現在幾點（0～23） */
export const taipeiHour = (now = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: 'numeric', hourCycle: 'h23' }).format(now));
/** 這個時間在不在出現的時段 */
export const legendHour = (L, h = taipeiHour()) => (L.hours[0] < L.hours[1] ? h >= L.hours[0] && h < L.hours[1] : h >= L.hours[0] || h < L.hours[1]);
