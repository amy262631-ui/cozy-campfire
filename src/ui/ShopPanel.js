import { t } from '../i18n/i18n.js';
import { FURNITURE, TENT_PRICE, CATS } from '../game/furniture.js';
import { gridOf, expandPrice, EXPAND_PRICES, GRID_MAX } from '../game/furnitureCatalog.js';
import { TENT_SHAPES, TENT_SHAPE_BY_ID } from '../game/tentShapes.js';
import { TENT_STYLES } from '../game/tentStyles.js';
import { TentPreview } from './TentPreview.js';

/**
 * 營地小舖：用松果買帳篷、家具。
 *   getCoins()  松果（單人模式 null）
 *   getHome()   { tent, inv, items }
 *   onBuy(id)   → Promise<boolean>
 *   onGoHome()  回到我的帳篷
 *   onEdit(op, data) 換帳篷造型／花色（op：shape / style）→ Promise
 */
export class ShopPanel {
  constructor({ getCoins, getHome, onBuy, onGoHome, onEdit, onGift, root = document.getElementById('ui') }) {
    Object.assign(this, { getCoins, getHome, onBuy, onGoHome, onEdit, onGift });
    this.busy = false;
    this.tab = 'look';
    this.cat = 'all'; // 家具分類
    this.pick = null; // 預覽中的造型（還沒買的也能先看）
    this.preview = new TentPreview(360, 190);
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="shop-panel" id="shop-panel">
        <div class="shop-card">
          <div class="shop-title">${t('🏪 營地小舖')}</div>
          <div class="shop-coins" id="shop-coins"></div>
          <div class="shop-body" id="shop-body"></div>
          <div class="shop-foot">
            <button type="button" class="shop-home" id="shop-home" hidden>${t('⛺ 回到我的帳篷')}</button>
            <button type="button" class="shop-close" id="shop-close">${t('關閉')}</button>
          </div>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#shop-panel');
    this.body = $('#shop-body');
    this.coinsEl = $('#shop-coins');
    this.homeBtn = $('#shop-home');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#shop-close').addEventListener('click', () => this.close());
    this.homeBtn.addEventListener('click', () => {
      this.close();
      this.onGoHome?.();
    });
    this.body.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        this.tab = tab.dataset.tab;
        return this.render();
      }
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        this.cat = cat.dataset.cat;
        return this.render();
      }
      const home = this.getHome() ?? {};
      const sh = e.target.closest('[data-shape]');
      if (sh) {
        this.pick = sh.dataset.shape;
        // 已經有的造型：直接換上
        if ((home.shapes ?? ['bell']).includes(this.pick) && this.pick !== (home.shape ?? 'bell') && !this.busy) {
          this.busy = true;
          await this.onEdit?.('shape', { s: this.pick });
          this.busy = false;
        }
        return this.render();
      }
      if (e.target.closest('[data-gift]')) {
        this.close();
        return this.onGift?.();
      }
      const sty = e.target.closest('[data-style]');
      if (sty && !this.busy) {
        this.busy = true;
        await this.onEdit?.('style', { s: sty.dataset.style });
        this.busy = false;
        return this.render();
      }
      const btn = e.target.closest('[data-buy]');
      if (!btn || btn.disabled || this.busy) return;
      this.busy = true;
      this.body.classList.add('busy');
      await this.onBuy?.(btn.dataset.buy);
      this.busy = false;
      this.body.classList.remove('busy');
      this.render();
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
    this.pick = null;
    this.render();
  }

  close() {
    this.el.classList.remove('show');
    this.preview.stop();
  }

  /** 把預覽畫面放進目前畫面上的位置 */
  #mountPreview(shape, style) {
    const slot = this.body.querySelector('.shop-pv');
    if (!slot) return this.preview.stop();
    slot.appendChild(this.preview.canvas);
    this.preview.set(shape, style);
    this.preview.start();
  }

  refresh() {
    if (this.isOpen) this.render();
  }

  render() {
    const coins = this.getCoins();
    const home = this.getHome() ?? { tent: false, inv: {}, items: [] };
    this.coinsEl.innerHTML = coins == null ? t('目前是單人模式，連上伺服器後才能買東西') : t('你有 <b>🌰 {n}</b> 顆松果', { n: coins });
    this.homeBtn.hidden = !home.tent;
    if (!home.tent) {
      this.body.innerHTML = `
        <div class="shop-tent">
          <div class="shop-pv"></div>
          <div class="shop-tent-name">${t('我的小帳篷')}</div>
          <p>${t('買下之後，你就有一個自己的家：可以買家具慢慢布置，關掉網頁再回來也都還在。')}</p>
          <button type="button" class="shop-buy-tent" data-buy="tent" ${coins == null || coins < TENT_PRICE ? 'disabled' : ''}>${t('買下帳篷 🌰 {n}', { n: TENT_PRICE })}</button>
          ${coins != null && coins < TENT_PRICE ? `<div class="shop-hint">${t('還差 {n} 顆松果：做小任務、釣魚、每天來營火旁都能撿到 🌰', { n: TENT_PRICE - coins })}</div>` : ''}
          <div class="shop-hint">${t('買下後還能用松果解鎖馬戲團大帳、蘑菇小屋等造型 🎪🍄')}</div>
        </div>`;
      return this.#mountPreview('bell', 'classic');
    }
    const tabs = `
      <div class="shop-tabs">
        <button type="button" data-tab="look" class="${this.tab === 'look' ? 'on' : ''}">${t('⛺ 帳篷外觀')}</button>
        <button type="button" data-tab="furn" class="${this.tab === 'furn' ? 'on' : ''}">${t('🪑 家具')}</button>
        <button type="button" data-tab="expand" class="${this.tab === 'expand' ? 'on' : ''}">${t('📐 擴建')}</button>
      </div>`;
    if (this.tab === 'look') {
      const owned = home.shapes ?? ['bell'];
      const cur = home.shape ?? 'bell';
      const pick = TENT_SHAPE_BY_ID[this.pick] ? this.pick : cur;
      const sh = TENT_SHAPE_BY_ID[pick];
      const has = owned.includes(pick);
      // 還沒買的造型，預覽用它的招牌花色
      const style = has ? home.style ?? 'classic' : sh.style ?? home.style ?? 'classic';
      const action = has
        ? `<div class="shop-using">${pick === cur ? t('✅ 使用中') : ''}</div>`
        : `<button type="button" class="shop-buy-tent" data-buy="shape_${pick}" ${coins == null || coins < sh.price ? 'disabled' : ''}>${t('解鎖「{name}」🌰 {n}', { name: sh.name, n: sh.price })}</button>
           ${coins != null && coins < sh.price ? `<div class="shop-hint">${t('還差 {n} 顆松果', { n: sh.price - coins })}</div>` : ''}`;
      this.body.innerHTML = `${tabs}
        <div class="shop-pv"></div>
        <div class="shop-pv-name">${sh.icon} ${sh.name}</div>
        <div class="shop-shapes">
          ${TENT_SHAPES.map(
            (x) => `<button type="button" class="shop-shape${x.id === pick ? ' on' : ''}${x.id === cur ? ' cur' : ''}" data-shape="${x.id}">
              <span class="ss-icon">${x.icon}</span><span class="ss-name">${x.name}</span>
              <span class="ss-price">${owned.includes(x.id) ? '✓' : `🌰 ${x.price}`}</span></button>`,
          ).join('')}
        </div>
        ${action}
        ${has ? `<div class="shop-sub">${t('🎨 花色（免費換）')}</div>
        <div class="shop-styles">${TENT_STYLES.map((x) =>
          x.gift && !(home.gifts ?? []).includes(x.id)
            ? `<button type="button" class="build-style shop-style-locked" data-gift="${x.id}" title="${x.pass ? t('營火月票限定') : t('分享送禮才拿得到')}"><span>🔒</span>${x.name}</button>`
            : `<button type="button" class="build-style${x.id === style ? ' on' : ''}" data-style="${x.id}"><span>${x.icon}</span>${x.name}</button>`,
        ).join('')}</div>` : ''}`;
      return this.#mountPreview(pick, style);
    }
    this.preview.stop();
    if (this.tab === 'expand') {
      const g = gridOf(home);
      const price = expandPrice(home);
      const next = g + 1;
      // 小小的格子圖：現在的地板＋擴建後多出來的一圈
      const n = price ? next : g;
      const off = g % 2 === 0 ? 1 : 0; // 跟伺服器一樣：舊地板在新地板裡的位置
      let cells = '';
      for (let z = 0; z < n; z++)
        for (let x = 0; x < n; x++) {
          const old = !price || (x - off >= 0 && z - off >= 0 && x - off < g && z - off < g);
          cells += `<i class="${old ? '' : 'new'}"></i>`;
        }
      const later = Object.entries(EXPAND_PRICES)
        .filter(([k]) => Number(k) > next)
        .map(([k, v]) => `${k}×${k} 🌰 ${v}`)
        .join('・');
      this.body.innerHTML = `${tabs}
        <div class="shop-expand">
          <div class="se-grid" style="grid-template-columns: repeat(${n}, 1fr)">${cells}</div>
          <div class="shop-pv-name">${t('現在的地板：{n}×{n}（{c} 格）', { n: g, c: g * g })}</div>
          ${
            price
              ? `<button type="button" class="shop-buy-tent" data-buy="expand" ${coins == null || coins < price ? 'disabled' : ''}>${t('擴建成 {n}×{n}（多 {m} 格）🌰 {p}', { n: next, m: next * next - g * g, p: price })}</button>
                 ${coins != null && coins < price ? `<div class="shop-hint">${t('還差 {n} 顆松果', { n: price - coins })}</div>` : ''}
                 ${later ? `<div class="shop-hint">${t('之後還能再擴建：{list}', { list: later })}</div>` : ''}`
              : `<div class="shop-using">${t('已經是最大的帳篷了 🎉')}（${GRID_MAX}×${GRID_MAX}）</div>`
          }
          <div class="shop-hint">${t('擴建後整頂帳篷會變大一圈，原本的家具會挪到新地板的中間。')}</div>
        </div>`;
      return;
    }
    const cats = `<div class="shop-cats">
      <button type="button" data-cat="all" class="${this.cat === 'all' ? 'on' : ''}">${t('全部')}</button>
      ${CATS.map((c) => `<button type="button" data-cat="${c.id}" class="${this.cat === c.id ? 'on' : ''}">${c.icon} ${c.name}</button>`).join('')}
    </div>`;
    const list = this.cat === 'all' ? FURNITURE : FURNITURE.filter((f) => f.cat === this.cat);
    const tag = (f) => (f.kind === 'small' ? t('可放桌上') : f.kind === 'mat' ? t('可墊底') : f.top ? t('上面可放') : '');
    this.body.innerHTML = `${tabs}
      <div class="shop-sub">${t('買了會放進背包，回帳篷按「🛠️ 布置」擺出來')}</div>
      ${cats}
      <div class="shop-grid">
        ${list.map((f) => {
          const owned = home.inv?.[f.id] ?? 0;
          const tg = tag(f);
          return `
          <button type="button" class="shop-item" data-buy="${f.id}" ${coins == null || coins < f.price || owned >= 20 ? 'disabled' : ''}>
            <span class="si-icon">${f.icon}</span>
            <span class="si-name">${f.name}</span>
            <span class="si-price">🌰 ${f.price}</span>
            ${tg ? `<span class="si-tag">${tg}</span>` : ''}
            ${owned ? `<span class="si-owned">${t('有 {n} 個', { n: owned })}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
      <div class="shop-hint">${t('💡 地墊上可以放家具；桌子、櫃子、床上可以再放「可放桌上」的小東西')}</div>`;
  }
}
