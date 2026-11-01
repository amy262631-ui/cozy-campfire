import { LANGS, lang, setLang } from '../i18n/i18n.js';

/**
 * 語言切換：右上角「🌐」按鈕（在聲音按鈕左邊），點開選單選語言。
 * 選了會記住並重新整理頁面。
 */
export class LanguagePicker {
  constructor(root = document.getElementById('ui')) {
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="lang" id="lang">
        <button type="button" class="lang-toggle" id="lang-toggle">🌐<span class="lang-label"> ${LANGS.find((l) => l.id === lang)?.label ?? ''}</span></button>
        <div class="lang-menu">
          ${LANGS.map((l) => `<button type="button" data-lang="${l.id}" class="${l.id === lang ? 'current' : ''}">${l.label}</button>`).join('')}
        </div>
      </div>
      `,
    );
    const el = root.querySelector('#lang');
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('#lang-toggle').addEventListener('click', () => el.classList.toggle('open'));
    el.querySelectorAll('[data-lang]').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.lang !== lang) setLang(b.dataset.lang);
        el.classList.remove('open');
      }),
    );
  }
}

/** 進場畫面用的語言列（四個按鈕） */
export function languageRowHtml() {
  return `<div class="join-langs">${LANGS.map(
    (l) => `<button type="button" data-lang="${l.id}" class="${l.id === lang ? 'selected' : ''}">${l.label}</button>`,
  ).join('')}</div>`;
}

export function bindLanguageRow(container) {
  container.querySelectorAll('.join-langs [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.lang !== lang) setLang(b.dataset.lang);
    }),
  );
}
