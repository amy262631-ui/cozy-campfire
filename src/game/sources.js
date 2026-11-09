/**
 * 來源統計：旅人是從哪裡來的（前端判斷、伺服器記數字；不記錄個人資料）。
 * 網址可以直接帶 ?src=代號（例如貼在 Threads 的連結用 ?src=threads），沒帶就看「從哪個網站點過來」。
 */
export const SOURCES = [
  { id: '4388', zh: '4388', match: ['4388'] },
  { id: '9453', zh: '9453', match: ['9453'] },
  { id: 'foundplay', zh: 'Foundplay', match: ['foundplay'] },
  { id: 'indielisted', zh: 'Indielisted', match: ['indielisted'] },
  { id: 'gyebo', zh: '韓國 gyebo', match: ['gyebo', 'aroido'] },
  { id: 'threads', zh: 'Threads', match: ['threads'] },
  { id: 'ig', zh: 'Instagram', match: ['instagram'] },
  { id: 'line', zh: 'LINE', match: ['line.me', 'line.naver'] },
  { id: 'fb', zh: 'Facebook', match: ['facebook', 'fb.com'] },
  { id: 'search', zh: '搜尋引擎', match: ['google.', 'bing.', 'yahoo.', 'duckduckgo', 'naver.com', 'daum.net'] },
  { id: 'pwa', zh: '📲 手機桌面捷徑', match: [] },
  { id: 'invite', zh: '朋友邀請連結', match: [] },
  { id: 'other', zh: '其他網站', match: [] },
  { id: 'direct', zh: '直接進來', match: [] },
];
const IDS = new Set(SOURCES.map((s) => s.id));

/** 伺服器收到的代號：只接受清單裡的，其他一律算「其他網站」 */
export const cleanSource = (raw) => {
  const s = String(raw ?? '').toLowerCase().slice(0, 20);
  return IDS.has(s) ? s : s ? 'other' : 'direct';
};

/** 文字（網址參數、網域）對到哪個來源；都沒有回傳 null */
export function matchSource(text) {
  const s = String(text ?? '').toLowerCase();
  if (!s) return null;
  if (IDS.has(s)) return s;
  return SOURCES.find((x) => x.match.some((m) => s.includes(m)))?.id ?? null;
}

/**
 * 從線索判斷來源（前端、伺服器共用）
 *   tag：網址的 ?src=／utm_source　invite：有沒有帶邀請碼　host：網頁自己的網域　ref：從哪個網域點過來
 */
export function sourceFrom({ tag, invite, host, ref } = {}) {
  if (tag) return matchSource(tag) ?? 'other';
  if (invite) return 'invite';
  const own = matchSource(host); // 上架平台的版本放在平台自己的網址上
  if (own) return own;
  if (!ref || ref === host) return 'direct';
  return matchSource(ref) ?? 'other';
}

/** 前端：判斷這次是從哪裡來的 */
export function detectSource(loc = location, referrer = document.referrer) {
  const q = new URLSearchParams(loc.search);
  let ref = '';
  try {
    ref = referrer ? new URL(referrer).hostname : '';
  } catch {
    /* 壞掉的 referrer */
  }
  return sourceFrom({ tag: q.get('src') || q.get('utm_source') || q.get('ref'), invite: !!q.get('with'), host: loc.hostname, ref });
}

/** 📱 是不是在 App 內建瀏覽器（LINE、IG、FB、Threads、微信）或被嵌在別的網站裡（iframe）；伺服器端沒有 navigator 就回空字串 */
export function inAppKind() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return '';
  const ua = navigator.userAgent || '';
  if (/\bLine\//i.test(ua)) return 'line';
  if (/Instagram/i.test(ua)) return 'ig';
  if (/Barcelona|Threads/i.test(ua)) return 'threads';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'fb';
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  try {
    if (window.top !== window.self) return 'iframe';
  } catch {
    return 'iframe';
  }
  return '';
}

/** 📲 是不是從手機桌面的圖示打開的（加到主畫面後，會用全螢幕模式開） */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
  } catch {
    return false;
  }
}
/** 這台裝置要怎麼加到桌面：'ios'（iPhone/iPad Safari）、'android'、'desktop'；在 App 裡要先用瀏覽器打開 */
export function installKind() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
