/**
 * 🎄 季節活動（前端、伺服器共用）。
 * 聖誕：台北時間 12/1～隔年 1/6 自動換上，1/7 自動換回（作者 11/10 同意）。
 * 測試：網址加 ?xmas=1 強制打開、?xmas=0 強制關掉（只影響自己的畫面）。
 */
const taipeiMD = (now = new Date()) => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' }).formatToParts(now);
  return { m: Number(p.find((x) => x.type === 'month').value), d: Number(p.find((x) => x.type === 'day').value) };
};
export function isXmas(now = new Date()) {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('xmas') : null;
    if (q === '1') return true;
    if (q === '0') return false;
  } catch {
    /* 伺服器沒有 location */
  }
  const { m, d } = taipeiMD(now);
  return m === 12 || (m === 1 && d <= 6);
}
/** 'YYYY-MM-DD'（台北日期）是不是聖誕期間（12/1～1/6）；伺服器、前端算每日造型用，跟網址參數無關 */
export function isXmasDay(dayKey) {
  const [, m, d] = String(dayKey).split('-').map(Number);
  return m === 12 || (m === 1 && d <= 6);
}
