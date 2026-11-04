import { t } from '../i18n/i18n.js';

/** 分流的熱鬧程度：顏色＋文字 */
export function crowd(count, max) {
  const r = count / max;
  if (count >= max) return { cls: 'full', text: t('客滿') };
  if (r >= 0.8) return { cls: 'busy', text: t('擁擠') };
  if (r >= 0.4) return { cls: 'lively', text: t('熱鬧') };
  if (count > 0) return { cls: 'cozy', text: t('舒適') };
  return { cls: 'empty', text: t('空曠') };
}

/** 一格分流按鈕（進場畫面與遊戲中共用） */
export function channelButtonHtml(c, { selected = false, current = false } = {}) {
  const cr = crowd(c.count, c.max);
  const pct = Math.min(100, Math.round((c.count / c.max) * 100));
  return `
    <button type="button" class="ch-btn ch-${cr.cls}${selected ? ' selected' : ''}${current ? ' current' : ''}" data-ch="${c.ch}" ${c.count >= c.max && !current ? 'disabled' : ''}>
      <span class="ch-name">${t('分流 {n}', { n: c.ch })}${current ? ` <em>${t('目前')}</em>` : ''}</span>
      <span class="ch-bar"><i style="width:${pct}%"></i></span>
      <span class="ch-meta"><b>${cr.text}</b> ${c.count}/${c.max}</span>
    </button>`;
}

/** 取得分流列表；單人模式（沒有伺服器）回傳 null */
export async function fetchChannels() {
  try {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL ? import.meta.env.VITE_SERVER_URL.replace(/\/$/, '') + '/' : ''}api/channels`, { cache: 'no-store' });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) && list.length ? list : null;
  } catch {
    return null;
  }
}

/**
 * 遊戲中換分流的視窗（點左上角「分流 N」打開）。
 *   onSwitch(ch) → Promise<boolean>
 */
export class ChannelPanel {
  constructor({ onSwitch, root = document.getElementById('ui') }) {
    this.onSwitch = onSwitch;
    this.current = 0;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="chpanel" id="chpanel">
        <div class="chpanel-card">
          <div class="chpanel-title">${t('🏕️ 選擇分流')}</div>
          <div class="chpanel-sub">${t('每個分流最多 {n} 人，換分流會留在同一個地方', { n: 100 })}</div>
          <div class="ch-grid" id="chpanel-grid"></div>
          <div class="chpanel-note">${t('繪馬、告示牌留言和釣魚排行，所有分流都看得到 ✨')}</div>
          <button type="button" class="chpanel-close" id="chpanel-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    this.el = root.querySelector('#chpanel');
    this.grid = root.querySelector('#chpanel-grid');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    root.querySelector('#chpanel-close').addEventListener('click', () => this.close());
    this.grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-ch]');
      if (!btn || btn.disabled) return;
      const ch = Number(btn.dataset.ch);
      if (ch === this.current) return this.close();
      this.grid.classList.add('busy');
      const ok = await this.onSwitch?.(ch);
      this.grid.classList.remove('busy');
      if (ok) this.close();
      else this.#load();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  open(current) {
    this.current = current;
    this.el.classList.add('show');
    this.grid.innerHTML = `<div class="ch-loading">${t('讀取中⋯')}</div>`;
    this.#load();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.isOpen && this.#load(), 4000);
  }

  close() {
    this.el.classList.remove('show');
    clearInterval(this.timer);
  }

  async #load() {
    const list = await fetchChannels();
    if (!this.isOpen) return;
    this.grid.innerHTML = list
      ? list.map((c) => channelButtonHtml(c, { current: c.ch === this.current })).join('')
      : `<div class="ch-loading">${t('目前是單人模式，沒有分流')}</div>`;
  }
}
