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
export async function translateChat(text, force = false) {
  if (!force && !translateEnabled()) return null;
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

// ---------- 留言板、繪馬：點 🌐 才翻譯那一則（不自動翻，免得一次送出太多請求） ----------
const attr = (x) => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** 這則留言不是你的語言 → 回傳一顆 🌐 按鈕的 HTML；是你的語言就回傳空字串 */
export function trButton(text) {
  const src = detectLang(text);
  if (!src || src === TARGET) return '';
  return `<button type="button" class="tr-btn" title="翻譯" data-tr="${attr(text)}">🌐</button>`;
}

/** 在列表容器上掛一次：點 🌐 就翻譯，譯文顯示在那一則下面 */
export function bindTranslate(root) {
  if (!root || root.dataset.trBound) return;
  root.dataset.trBound = '1';
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest?.('.tr-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '⋯';
    const out = await translateChat(btn.dataset.tr, true);
    const box = btn.closest('.notice-note, .ema-item') ?? btn.parentElement;
    const line = document.createElement('div');
    line.className = 'tr-out';
    line.textContent = out ?? '翻譯失敗，稍後再試';
    box.appendChild(line);
    btn.remove();
  });
}
