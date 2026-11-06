import { t } from '../i18n/i18n.js';

/**
 * 視窗右上角的 ✕：固定在卡片右上角（卡片捲動時也看得到），按了等於按底部的「關閉」。
 * 新的視窗也照這樣用：addCloseX(底部關閉按鈕, '.卡片的 class')
 */
export function addCloseX(closeBtn, cardSelector) {
  const card = closeBtn?.closest(cardSelector);
  if (!card || card.querySelector(':scope > .x-close')) return null;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'x-close';
  b.setAttribute('aria-label', t('關閉'));
  b.title = t('關閉');
  b.textContent = '✕';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    closeBtn.click();
  });
  card.prepend(b);
  return b;
}
