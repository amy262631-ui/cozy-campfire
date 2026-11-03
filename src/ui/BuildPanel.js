import { t } from '../i18n/i18n.js';
import { ALL_FURNITURE, FURNITURE_BY_ID } from '../game/furniture.js';
import { TENT_STYLES } from '../game/tentStyles.js';
import { TENT_SHAPES } from '../game/tentShapes.js';
import { CATALOG_BY_ID, canStackOn, stackAt, gridOf, expandPrice, MAX_STACK } from '../game/furnitureCatalog.js';

/**
 * 布置帳篷：畫面下方的一條面板。
 *   點地板的格子 → 空格：選背包裡的家具放上去；有東西：每一層都能轉向或收起，上面還能再疊
 *   getHome()        { inv, items, grid }
 *   onEdit(op, data) → Promise<boolean>（op：place / rotate / remove / move；rotate、remove、move 帶 l＝第幾層，move 再帶 tx、tz）
 *   ✋ 移動：按了之後再點另一格，那一層（連同上面疊的）就搬過去
 *   onExpand()       📐 擴建帳篷（用松果買）
 *   onExit()         結束布置
 *   onToggleOpen()   開放／關閉參觀
 */
export class BuildPanel {
  constructor({ getHome, onEdit, onExit, onToggleOpen, onExpand, root = document.getElementById('ui') }) {
    Object.assign(this, { getHome, onEdit, onExit, onToggleOpen, onExpand });
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
        <button type="button" id="home-exit">${t('🚪 出去')}</button>
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
    $('#home-exit').addEventListener('click', () => this.onLeave?.());
    this.openBtn.addEventListener('click', () => this.onToggleOpen?.());
    this.body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-expand]') && !this.busy) {
        this.busy = true;
        await this.onExpand?.();
        this.busy = false;
        this.render();
        return;
      }
      const sb = e.target.closest('[data-style],[data-shape]');
      if (sb && !this.busy) {
        this.busy = true;
        await this.onEdit?.(sb.dataset.shape ? 'shape' : 'style', { s: sb.dataset.shape ?? sb.dataset.style });
        this.busy = false;
        this.render();
        return;
      }
      if (e.target.closest('[data-cancel-move]')) {
        this.moving = null;
        this.render();
        return;
      }
      const b = e.target.closest('[data-op]');
      if (!b || !this.cell || this.busy) return;
      if (b.dataset.op === 'move') {
        const it = stackAt(this.getHome()?.items, this.cell.x, this.cell.z)[Number(b.dataset.l)];
        this.moving = { ...this.cell, l: Number(b.dataset.l), i: it?.i };
        this.render();
        return;
      }
      this.busy = true;
      await this.onEdit?.(b.dataset.op, { ...this.cell, i: b.dataset.i, l: b.dataset.l != null ? Number(b.dataset.l) : undefined });
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
    this.moving = null;
  }

  select(cell) {
    this.cell = cell;
    this.render();
  }

  /** 搬家模式中點了一格：搬過去。成功就選到新的那格，回傳新的格子；失敗留在搬家模式（可以再點別格） */
  async moveTo(cell) {
    const m = this.moving;
    if (!m || this.busy) return null;
    if (cell.x === m.x && cell.z === m.z) {
      this.moving = null;
      this.render();
      return cell;
    }
    this.busy = true;
    const ok = await this.onEdit?.('move', { x: m.x, z: m.z, l: m.l, tx: cell.x, tz: cell.z });
    this.busy = false;
    if (!ok) return null;
    this.moving = null;
    this.cell = { x: cell.x, z: cell.z };
    this.render();
    return this.cell;
  }

  render() {
    if (!this.active) return;
    const home = this.getHome() ?? { inv: {}, items: [] };
    if (this.moving) {
      const f = FURNITURE_BY_ID[this.moving.i];
      const above = stackAt(home.items, this.moving.x, this.moving.z).length - 1 - this.moving.l;
      this.title.textContent = t('✋ 搬「{name}」：點要放的格子', { name: `${f?.icon ?? ''} ${f?.name ?? ''}` });
      this.body.innerHTML = `<div class="build-tip">${above > 0 ? t('上面疊的東西會一起搬過去') : t('可以搬到空格，也可以疊到桌子、櫃子或地墊上')}</div>
        <button type="button" class="build-act" data-cancel-move="1">${t('取消')}</button>`;
      return;
    }
    if (!this.cell) {
      const total = Object.values(home.inv ?? {}).reduce((a, b) => a + b, 0);
      this.title.textContent = t('🛠️ 布置模式：點地板上的格子');
      const cur = home.style ?? 'classic';
      const g = gridOf(home);
      const price = expandPrice(home);
      this.body.innerHTML =
        (total
          ? `<div class="build-tip">${t('點一格放家具；桌子、櫃子上還能再疊小東西')}</div>`
          : `<div class="build-tip">${t('背包是空的，先到營火旁的「🏪 營地小舖」買家具吧')}</div>`) +
        `<div class="build-styles"><span class="build-styles-label">${t('📐 地板 {n}×{n}', { n: g })}</span>${
          price
            ? `<button type="button" class="build-style build-expand" data-expand="1">${t('擴建成 {n}×{n}', { n: g + 1 })} 🌰 ${price}</button>`
            : `<span class="build-styles-label">${t('已經是最大的帳篷了 🎉')}</span>`
        }</div>` +
        ((home.shapes ?? ['bell']).length > 1
          ? `<div class="build-styles"><span class="build-styles-label">${t('⛺ 造型')}</span>${TENT_SHAPES.filter((x) => (home.shapes ?? ['bell']).includes(x.id))
              .map((x) => `<button type="button" class="build-style${x.id === (home.shape ?? 'bell') ? ' on' : ''}" data-shape="${x.id}"><span>${x.icon}</span>${x.name}</button>`)
              .join('')}</div>`
          : '') +
        `<div class="build-styles"><span class="build-styles-label">${t('🎨 帳篷風格')}</span>${TENT_STYLES.filter((st) => !st.gift || (home.gifts ?? []).includes(st.id)).map(
          (st) => `<button type="button" class="build-style${st.id === cur ? ' on' : ''}" data-style="${st.id}" title="${st.name}"><span>${st.icon}</span>${st.name}</button>`,
        ).join('')}</div>`;
      return;
    }
    const stack = stackAt(home.items, this.cell.x, this.cell.z).filter((it) => FURNITURE_BY_ID[it.i]);
    const top = stack.at(-1) ?? null;
    const avail = ALL_FURNITURE.map((f) => ({ f, n: (home.inv?.[f.id] ?? 0) - home.items.filter((x) => x.i === f.id).length })).filter((x) => x.n > 0);
    const fits = stack.length < MAX_STACK ? avail.filter(({ f }) => canStackOn(top?.i ?? null, f.id)) : [];
    const list = fits.map(({ f, n }) => `<button type="button" class="build-item" data-op="place" data-i="${f.id}"><span>${f.icon}</span>${f.name}<small>×${n}</small></button>`).join('');
    if (!stack.length) {
      this.title.textContent = t('要在這格放什麼？');
      this.body.innerHTML = list || `<div class="build-tip">${t('背包裡的家具都擺出來了，到「🏪 營地小舖」買更多吧')}</div>`;
      return;
    }
    const f0 = FURNITURE_BY_ID[top.i];
    this.title.textContent = stack.length > 1 ? t('這一格疊了 {n} 層', { n: stack.length }) : `${f0?.icon ?? ''} ${f0?.name ?? ''}`;
    // 每一層（上面的排前面）：轉向、收起
    const layers = stack
      .map((it, lv) => {
        const f = FURNITURE_BY_ID[it.i];
        const above = stack.length - 1 - lv;
        return `<div class="build-layer">
          <span class="bl-name">${f.icon} ${f.name}</span>
          <button type="button" class="build-act" data-op="move" data-l="${lv}">${t('✋ 移動')}</button>
          <button type="button" class="build-act" data-op="rotate" data-l="${lv}">${t('🔄 轉向')}</button>
          <button type="button" class="build-act" data-op="remove" data-l="${lv}" ${above ? `title="${t('上面的東西也會一起收回')}"` : ''}>${t('📦 收起')}${above ? ' ⤴' : ''}</button>
        </div>`;
      })
      .reverse()
      .join('');
    const c = CATALOG_BY_ID[top.i];
    let more = '';
    if (list) more = `<div class="build-tip build-sub">${t('⬆️ 可以疊在上面：')}</div>${list}`;
    else if (stack.length >= MAX_STACK) more = `<div class="build-tip build-sub">${t('這一格已經疊滿了')}</div>`;
    else if (c?.kind === 'mat') more = `<div class="build-tip build-sub">${t('地墊上可以放任何家具，背包裡沒有可以放的了')}</div>`;
    else if (c?.top) more = `<div class="build-tip build-sub">${t('上面可以放小東西（燈、盆栽、玩偶⋯），到小舖買一些吧')}</div>`;
    else more = `<div class="build-tip build-sub">${t('這件上面不能再疊東西了')}</div>`;
    this.body.innerHTML = layers + more;
  }
}
