import { t } from '../i18n/i18n.js';
import { FURNITURE, FURNITURE_BY_ID } from '../game/furniture.js';
import { TENT_STYLES } from '../game/tentStyles.js';
import { TENT_SHAPES } from '../game/tentShapes.js';

/**
 * 布置帳篷：畫面下方的一條面板。
 *   點地板的格子 → 空格：選背包裡的家具放上去；有東西：轉向或收起
 *   getHome()        { inv, items }
 *   onEdit(op, data) → Promise（op：place / rotate / remove）
 *   onExit()         結束布置
 *   onToggleOpen()   開放／關閉參觀
 */
export class BuildPanel {
  constructor({ getHome, onEdit, onExit, onToggleOpen, root = document.getElementById('ui') }) {
    Object.assign(this, { getHome, onEdit, onExit, onToggleOpen });
    this.cell = null;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="build-bar" id="build-bar" hidden>
        <div class="build-head">
          <span id="build-title">${t('🛠️ 布置模式：點地板上的格子')}</span>
          <button type="button" class="build-done" id="build-done">${t('完成')}</button>
        </div>
        <div class="build-body" id="build-body"></div>
      </div>
      <div class="home-tools" id="home-tools" hidden>
        <button type="button" id="home-build">${t('🛠️ 布置')}</button>
        <button type="button" id="home-open"></button>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#build-bar');
    this.body = $('#build-body');
    this.title = $('#build-title');
    this.tools = $('#home-tools');
    this.openBtn = $('#home-open');
    for (const el of [this.el, this.tools]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
    $('#build-done').addEventListener('click', () => this.onExit?.());
    $('#home-build').addEventListener('click', () => this.onEnter?.());
    this.openBtn.addEventListener('click', () => this.onToggleOpen?.());
    this.body.addEventListener('click', async (e) => {
      const sb = e.target.closest('[data-style],[data-shape]');
      if (sb && !this.busy) {
        this.busy = true;
        await this.onEdit?.(sb.dataset.shape ? 'shape' : 'style', { s: sb.dataset.shape ?? sb.dataset.style });
        this.busy = false;
        this.render();
        return;
      }
      const b = e.target.closest('[data-op]');
      if (!b || !this.cell || this.busy) return;
      this.busy = true;
      await this.onEdit?.(b.dataset.op, { ...this.cell, i: b.dataset.i });
      this.busy = false;
      this.render();
    });
  }

  get active() {
    return !this.el.hidden;
  }

  /** 在自己的帳篷裡才顯示「布置」「開放參觀」按鈕 */
  showTools(show, open) {
    this.tools.hidden = !show;
    this.openBtn.textContent = open ? t('🚪 開放參觀中') : t('🔒 休息中（不開放）');
    this.openBtn.classList.toggle('closed', !open);
  }

  start() {
    this.el.hidden = false;
    this.tools.hidden = true;
    this.cell = null;
    this.render();
  }

  stop() {
    this.el.hidden = true;
    this.cell = null;
  }

  select(cell) {
    this.cell = cell;
    this.render();
  }

  render() {
    if (!this.active) return;
    const home = this.getHome() ?? { inv: {}, items: [] };
    if (!this.cell) {
      const total = Object.values(home.inv ?? {}).reduce((a, b) => a + b, 0);
      this.title.textContent = t('🛠️ 布置模式：點地板上的格子');
      const cur = home.style ?? 'classic';
      this.body.innerHTML =
        (total
          ? `<div class="build-tip">${t('點一個空格放家具，點家具可以轉向或收起')}</div>`
          : `<div class="build-tip">${t('背包是空的，先到營火旁的「🏪 營地小舖」買家具吧')}</div>`) +
        ((home.shapes ?? ['bell']).length > 1
          ? `<div class="build-styles"><span class="build-styles-label">${t('⛺ 造型')}</span>${TENT_SHAPES.filter((x) => (home.shapes ?? ['bell']).includes(x.id))
              .map((x) => `<button type="button" class="build-style${x.id === (home.shape ?? 'bell') ? ' on' : ''}" data-shape="${x.id}"><span>${x.icon}</span>${x.name}</button>`)
              .join('')}</div>`
          : '') +
        `<div class="build-styles"><span class="build-styles-label">${t('🎨 帳篷風格')}</span>${TENT_STYLES.map(
          (st) => `<button type="button" class="build-style${st.id === cur ? ' on' : ''}" data-style="${st.id}" title="${st.name}"><span>${st.icon}</span>${st.name}</button>`,
        ).join('')}</div>`;
      return;
    }
    const item = home.items.find((it) => it.x === this.cell.x && it.z === this.cell.z);
    if (item) {
      const f = FURNITURE_BY_ID[item.i];
      this.title.textContent = `${f?.icon ?? ''} ${f?.name ?? ''}`;
      this.body.innerHTML = `
        <button type="button" class="build-act" data-op="rotate">${t('🔄 轉個方向')}</button>
        <button type="button" class="build-act" data-op="remove">${t('📦 收回背包')}</button>`;
      return;
    }
    this.title.textContent = t('要在這格放什麼？');
    const avail = FURNITURE.map((f) => ({ f, n: (home.inv?.[f.id] ?? 0) - home.items.filter((x) => x.i === f.id).length })).filter((x) => x.n > 0);
    this.body.innerHTML = avail.length
      ? avail.map(({ f, n }) => `<button type="button" class="build-item" data-op="place" data-i="${f.id}"><span>${f.icon}</span>${f.name}<small>×${n}</small></button>`).join('')
      : `<div class="build-tip">${t('背包裡的家具都擺出來了，到「🏪 營地小舖」買更多吧')}</div>`;
  }
}
