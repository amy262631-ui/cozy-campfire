/**
 * 🎄 季節活動（前端、伺服器共用）。
 * 聖誕：台北時間 11/27～隔年 1/6 自動換上，1/7 自動換回（作者 11/10 同意；11/19 改成從 11/27 開始）。
 * 測試：網址加 ?xmas=1 強制打開、?xmas=0 強制關掉（只影響自己的畫面）。
 */
/** 🎄 聖誕從幾號開始（作者 11/19：原本 12/1 的全部提早到 11/27） */
export const XMAS_FROM = { m: 11, d: 27 };
const inXmasStart = (m, d) => (m === XMAS_FROM.m && d >= XMAS_FROM.d) || m === 12;
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
  return inXmasStart(m, d) || (m === 1 && d <= 6);
}
/** 'YYYY-MM-DD'（台北日期）是不是聖誕期間（11/27～1/6）；伺服器、前端算每日造型用，跟網址參數無關 */
export function isXmasDay(dayKey) {
  const [, m, d] = String(dayKey).split('-').map(Number);
  return inXmasStart(m, d) || (m === 1 && d <= 6);
}

/** 🛒 聖誕商品賣到幾號（作者 11/16：直接賣到 1/15；造景、音樂、聖誕造型還是 1/6 結束） */
export const XMAS_SHOP_END = 15;
/** 'YYYY-MM-DD' 是不是聖誕商品還在賣（11/27～1/15） */
export function isXmasShopDay(dayKey) {
  const [, m, d] = String(dayKey).split('-').map(Number);
  return inXmasStart(m, d) || (m === 1 && d <= XMAS_SHOP_END);
}
/** 前端：現在聖誕商品還在賣嗎（網址 ?xmas=1／0 一樣有用） */
export function isXmasShop(now = new Date()) {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('xmas') : null;
    if (q === '1') return true;
    if (q === '0') return false;
  } catch {
    /* 伺服器 */
  }
  const { m, d } = taipeiMD(now);
  return inXmasStart(m, d) || (m === 1 && d <= XMAS_SHOP_END);
}
