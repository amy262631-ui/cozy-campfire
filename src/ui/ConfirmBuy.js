import { t } from '../i18n/i18n.js';

/**
 * 🛒 買東西前的確認視窗：點商品先看預覽（圖片、名字、價格），按「確定購買」才真的買。
 *   ask({ icon, name, price, img?, desc?, coins?, money? }) → Promise<boolean>（money：真錢的金額文字，例如「NT$ 60」）
 */
export class ConfirmBuy {
  constructor(root = document.getElementById('ui')) {
    root.insertAdjacentHTML('beforeend', `<div class="cbuy" id="cbuy" hidden><div class="cbuy-card"></div></div>`);
    this.el = root.querySelector('#cbuy');
    this.card = this.el.querySelector('.cbuy-card');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.#done(false);
      const b = e.target.closest('[data-cb]');
      if (b) this.#done(b.dataset.cb === 'yes');
    });
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden) return;
      if (e.code === 'Escape') {
        e.stopImmediatePropagation();
        this.#done(false);
      }
    }, true);
  }

  get isOpen() {
    return !this.el.hidden;
  }

  ask({ icon = '', name = '', price = 0, img = '', desc = '', coins = null, money = '', title = '', yes = '' }) {
    this.#done(false); // 前一個還開著就當取消
    const poor = coins != null && coins < price;
    this.card.innerHTML = `
      <div class="cbuy-title">${title || t('🛒 要買這個嗎？')}</div>
      ${img ? `<img class="cbuy-img" src="${img}" alt="">` : `<div class="cbuy-icon">${icon}</div>`}
      <div class="cbuy-name">${icon && img ? `${icon} ` : ''}${name}</div>
      ${desc ? `<div class="cbuy-desc">${desc}</div>` : ''}
      ${yes ? '' : `<div class="cbuy-price">${money ? `💳 ${money}` : `🌰 ${price}`}`}${yes ? '' : `${!money && coins != null ? `<small>${t('（你有 {n} 顆）', { n: coins })}</small>` : ''}</div>`}
      ${poor ? `<div class="cbuy-poor">${t('松果還差 {n} 顆', { n: price - coins })}</div>` : ''}
      <div class="cbuy-btns">
        <button type="button" data-cb="no" class="cbuy-no">${t('再想想')}</button>
        <button type="button" data-cb="yes" class="cbuy-yes" ${poor ? 'disabled' : ''}>${yes || (money ? t('前往付款') : t('確定購買'))}</button>
      </div>`;
    this.el.hidden = false;
    return new Promise((resolve) => (this.resolve = resolve));
  }

  #done(v) {
    if (this.el.hidden) return;
    this.el.hidden = true;
    const r = this.resolve;
    this.resolve = null;
    r?.(v);
  }
}
