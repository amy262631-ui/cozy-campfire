import { lang } from '../i18n/i18n.js';

/**
 * 聊天自動翻譯：別人用其他語言打字時，翻成你現在的介面語言。
 * 用 MyMemory 免費翻譯（不用金鑰，在每個人自己的瀏覽器裡呼叫；每人每天約 5000 字的額度）。
 */
const TARGET = { 'zh-Hant': 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' }[lang] ?? 'en';
const KEY = 'cozy-translate';
const cache = new Map();

export function translateEnabled() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}
export function setTranslateEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* 無痕模式 */
  }
}

/** 從文字猜語言：有假名＝日文、有韓文字＝韓文、有漢字＝中文、有英文字母＝英文 */
export function detectLang(text) {
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[가-힯ᄀ-ᇿ]/.test(text)) return 'ko';
  if (/[一-鿿]/.test(text)) return 'zh-TW';
  if (/[a-zA-Z]{2,}/.test(text)) return 'en';
  return null; // 只有表情、數字之類，不用翻
}

/** 翻成自己的語言；不用翻或翻不了回傳 null */
export async function translateChat(text) {
  if (!translateEnabled()) return null;
  const src = detectLang(text);
  if (!src || src === TARGET) return null;
  const k = `${src}|${TARGET}|${text}`;
  if (cache.has(k)) return cache.get(k);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${TARGET}`;
    const res = await fetch(url, { signal: ctrl.signal });
    const data = await res.json();
    let out = data?.responseData?.translatedText;
    if (data?.responseStatus !== 200 || !out || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
    out = out.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
    if (out.toLowerCase() === text.toLowerCase()) return null;
    cache.set(k, out);
    return out;
  } catch {
    return null; // 沒網路、額度用完：就只顯示原文
  } finally {
    clearTimeout(timer);
  }
}
