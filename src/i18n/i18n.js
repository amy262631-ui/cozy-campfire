import { DICT } from './dict.js';

/**
 * 多國語言：用「繁體中文原文」當作翻譯的索引。
 *   t('營火旁')                         → 依目前語言回傳翻譯（找不到就顯示中文）
 *   t('{name} 添了一根柴 🔥', { name })  → 大括號裡的變數會被替換
 * 切換語言時記住選擇並重新整理頁面（所有介面、招牌、名牌都會用新語言重畫）。
 */
export const LANGS = [
  { id: 'zh-Hant', label: '繁體中文' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
];

const STORE_KEY = 'cozy-campfire-lang';

function detect() {
  if (typeof location === 'undefined') return 'zh-Hant'; // 伺服器端（只用到中文原文）
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGS.some((l) => l.id === fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.some((l) => l.id === saved)) return saved;
  } catch {
    /* 無痕模式 */
  }
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('zh')) return 'zh-Hant';
  if (nav.startsWith('en')) return 'en';
  // 11/09：中英日韓以外的國家（泰文、法文、印尼文⋯）先給英文，比看不懂的中文好
  return nav ? 'en' : 'zh-Hant';
}

export const lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

const missing = new Set();

export function t(zh, vars) {
  let s = zh;
  if (lang !== 'zh-Hant') {
    const tr = DICT[lang]?.[zh];
    if (tr != null) s = tr;
    else if (import.meta.env?.DEV && !missing.has(zh)) {
      missing.add(zh);
      console.warn(`[翻譯缺漏] ${lang}: ${zh}`);
    }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

/** 把 HTML 裡有 data-i18n 的元素換成目前語言（原文寫在元素裡） */
export function translateStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.dataset.i18nSrc ??= el.textContent.trim();
    el.textContent = t(el.dataset.i18nSrc);
  });
  document.title = t('迷霧森林露營地');
}

export function setLang(id) {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* 存不了就只用網址參數 */
  }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url.toString());
}

/** 開發測試用：列出目前缺少翻譯的字串 */
export const missingKeys = () => [...missing];
