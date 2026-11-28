// 🌐 聊天翻譯（作者 11/28）：改成伺服器幫大家翻，同一句只翻一次（大家共用快取）。
// 用 MyMemory 免費翻譯。沒設 email 時這台伺服器一天約 5000 字；額度用完就回 quota，
// 前端會改回用自己的瀏覽器翻（跟以前一樣），所以不會比以前差。
// Render 可以選擇加 MYMEMORY_EMAIL（任何一個 email，額度變約 5 萬字／天）；不設也能用。

const LANGS = new Set(['zh-TW', 'en', 'ja', 'ko', 'ru']);
const MAX_LEN = 300;
const CACHE_MAX = 4000;
const TIMEOUT_MS = 6000;

const cache = new Map(); // key → 翻譯（''＝翻出來一樣，不用顯示）
const inflight = new Map(); // key → Promise，同一句同時有很多人要，只送一次
let quotaUntil = 0; // 額度用完到什麼時候
let failStreak = 0;
const stats = { day: '', hit: 0, call: 0, chars: 0, fail: 0, quota: 0 };

const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const bumpStat = (k, n = 1) => {
  const d = today();
  if (stats.day !== d) Object.assign(stats, { day: d, hit: 0, call: 0, chars: 0, fail: 0, quota: 0 });
  stats[k] += n;
};

function remember(k, v) {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

/** MyMemory 的額度是照 UTC 一天算 → 用完就等到下一個 UTC 0 點（台灣早上 8 點） */
const nextUtcDay = () => {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) + 60e3;
};

async function callApi(text, src, to) {
  const email = (process.env.MYMEMORY_EMAIL ?? '').trim();
  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${to}` +
    (email ? `&de=${encodeURIComponent(email)}` : '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    let out = data?.responseData?.translatedText ?? '';
    const warn = /MYMEMORY WARNING|USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT/i.test(out);
    if (res.status === 429 || data?.quotaFinished || (warn && /FREE TRANSLATIONS|WARNING/i.test(out))) {
      if (Date.now() >= quotaUntil) console.log('[翻譯] 伺服器今天的免費額度用完了，先改用玩家自己的瀏覽器翻');
      quotaUntil = nextUtcDay();
      bumpStat('quota');
      return { fail: 'quota' };
    }
    if (Number(data?.responseStatus) !== 200 || !out) return { fail: 'err' };
    out = out
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
    return { out: out.toLowerCase() === text.toLowerCase() ? '' : out };
  } catch {
    return { fail: 'err' };
  } finally {
    clearTimeout(timer);
  }
}

/** 翻一句：回傳 { out }（''＝不用顯示）或 { fail: 'quota' | 'err' | 'bad' } */
export async function translate(text, src, to) {
  text = String(text ?? '').trim().slice(0, MAX_LEN);
  if (!text || !LANGS.has(src) || !LANGS.has(to) || src === to) return { fail: 'bad' };
  const k = `${src}|${to}|${text}`;
  if (cache.has(k)) return bumpStat('hit'), { out: cache.get(k) };
  if (Date.now() < quotaUntil) return { fail: 'quota' };
  if (inflight.has(k)) return inflight.get(k);
  const p = (async () => {
    bumpStat('call');
    bumpStat('chars', text.length);
    const r = await callApi(text, src, to);
    if ('out' in r) (failStreak = 0), remember(k, r.out);
    else if (r.fail === 'err') {
      bumpStat('fail');
      // 連續失敗太多次（MyMemory 掛了）：先休息 2 分鐘，前端自己翻
      if (++failStreak >= 8) (quotaUntil = Date.now() + 120e3), (failStreak = 0);
    }
    return r;
  })().finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/** /stats 用：今天翻了幾句、快取命中幾次 */
export const translateStats = () => ({ ...stats, cache: cache.size, quotaOut: Date.now() < quotaUntil });
