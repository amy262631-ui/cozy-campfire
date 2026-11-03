import { t } from '../i18n/i18n.js';
import { ORNAMENTS, ORNAMENT_BY_ID } from '../game/ornaments.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return t('剛剛');
  if (m < 60) return t('{n} 分鐘前', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{n} 小時前', { n: h });
  return t('{n} 天前', { n: Math.floor(h / 24) });
}

/**
 * 心願大樹的視窗：用松果換裝飾掛上去、看大家掛了什麼。
 *   getItems()   樹上的裝飾 [{ o, n, at, slot }]
 *   getCoins()   我有幾顆松果（單人模式回傳 null）
 *   onHang(id)   → Promise<boolean>
 */
export class TreePanel {
  constructor({ getItems, getCoins, onHang, getEvent, root = document.getElementById('ui') }) {
    Object.assign(this, { getItems, getCoins, onHang, getEvent });
    this.busy = false;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="tree-panel" id="tree-panel">
        <div class="tree-card">
          <div class="tree-title">${t('🌳 心願大樹')}</div>
          <div class="tree-sub">${t('用松果換一個裝飾，掛在大家一起的樹上')}</div>
          <div class="tree-coins" id="tree-coins"></div>
          <div class="tree-grid" id="tree-grid"></div>
          <div class="tree-stats" id="tree-stats"></div>
          <div class="tree-recent" id="tree-recent"></div>
          <details class="tree-how">
            <summary>${t('🌰 怎麼撿松果？')}</summary>
            <ul>
              <li>${t('每天來營火旁：連續來越多天，送越多顆')}</li>
              <li>${t('完成小任務：+5 顆')}</li>
              <li>${t('湖邊釣到魚：+1～15 顆（越稀有越多）')}</li>
              <li>${t('在營地待著：每 5 分鐘 +2 顆')}</li>
            </ul>
          </details>
          <button type="button" class="tree-close" id="tree-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#tree-panel');
    this.coinsEl = $('#tree-coins');
    this.grid = $('#tree-grid');
    this.statsEl = $('#tree-stats');
    this.recentEl = $('#tree-recent');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#tree-close').addEventListener('click', () => this.close());
    this.grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-o]');
      if (!btn || btn.disabled || this.busy) return;
      this.busy = true;
      this.grid.classList.add('busy');
      const ok = await this.onHang?.(btn.dataset.o);
      this.busy = false;
      this.grid.classList.remove('busy');
      if (ok) this.close();
      else this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  open() {
    this.el.classList.add('show');
    this.render();
  }

  close() {
    this.el.classList.remove('show');
  }

  /** 松果數或樹上的裝飾變了，正在看的話就更新 */
  refresh() {
    if (this.isOpen) this.render();
  }

  render() {
    const coins = this.getCoins();
    const items = this.getItems();
    this.coinsEl.innerHTML =
      coins == null ? t('目前是單人模式，連上伺服器後才能掛裝飾') : t('你有 <b>🌰 {n}</b> 顆松果', { n: coins });
    const eventOn = !!this.getEvent?.()?.active;
    this.grid.innerHTML = ORNAMENTS.map((o) => {
      const locked = o.eventOnly && !eventOn;
      return `
      <button type="button" class="tree-item${o.eventOnly ? ' limited' : ''}" data-o="${o.id}" ${coins == null || coins < o.price || locked ? 'disabled' : ''}>
        <span class="ti-icon">${o.icon}</span>
        <span class="ti-name">${o.name}</span>
        <span class="ti-price">${locked ? t('每晚 9:30') : `🌰 ${o.price}`}</span>
      </button>`;
    }).join('');
    const people = new Set(items.map((x) => x.n)).size;
    this.statsEl.textContent = items.length
      ? t('樹上有 {n} 個裝飾 · {p} 位旅人一起裝飾', { n: items.length, p: people })
      : t('樹上還沒有裝飾，來掛第一個吧 ✨');
    const recent = [...items].sort((a, b) => b.at - a.at).slice(0, 6);
    this.recentEl.innerHTML = recent
      .map((x) => {
        const o = ORNAMENT_BY_ID[x.o];
        return `<div><span>${o?.icon ?? '✨'} ${esc(x.n)} ${t('掛了{name}', { name: o?.name ?? '' })}</span><small>${ago(x.at)}</small></div>`;
      })
      .join('');
  }
}
