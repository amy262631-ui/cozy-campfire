import { t } from '../i18n/i18n.js';

/** 翻頁：留言板、繪馬共用。page 0 是最新的一頁 */
export const PAGE_SIZE = 20;

/** 沒有伺服器時，在手上的清單裡分頁（list：新的在前） */
export function localPage(list, page) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const p = Math.min(pages - 1, Math.max(0, page));
  return { ok: true, page: p, pages, items: list.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE) };
}

export function pagerHtml(page, pages) {
  if (pages <= 1) return '';
  return `<div class="pager">
    <button type="button" data-pg="-1" ${page <= 0 ? 'disabled' : ''}>${t('‹ 較新')}</button>
    <span>${t('第 {n} / {m} 頁', { n: page + 1, m: pages })}</span>
    <button type="button" data-pg="1" ${page >= pages - 1 ? 'disabled' : ''}>${t('較舊 ›')}</button>
  </div>`;
}

/** 綁定翻頁按鈕：go(delta) */
export function bindPager(root, go) {
  root.querySelectorAll('.pager [data-pg]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      go(Number(b.dataset.pg));
    }),
  );
}
