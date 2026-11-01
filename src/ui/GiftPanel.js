import { t } from '../i18n/i18n.js';
import { GIFT_FURNITURE } from '../game/furniture.js';
import { TENT_STYLE_BY_ID } from '../game/tentStyles.js';

/**
 * 🎁 分享送禮：分享一次送明信片牆；朋友透過你的連結來玩（待滿幾分鐘），再送提燈、彩虹帳篷、望遠鏡。
 *   getInfo()   → Promise<{ code, shared, refs, gifts, gain, stay } | null>
 *   onShare(url) → Promise<boolean>（分享成功或複製成功）
 */
const REWARDS = [
  { id: 'postcard', need: 'share' },
  { id: 'foxlamp', need: 1 },
  { id: 'rainbow', need: 3 },
  { id: 'telescope', need: 5 },
];

export class GiftPanel {
  constructor({ getInfo, onShare, root = document.getElementById('ui') }) {
    Object.assign(this, { getInfo, onShare });
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="shop-panel gift-panel" id="gift-panel">
        <div class="shop-card">
          <div class="shop-title">${t('🎁 分享送禮')}</div>
          <div class="shop-sub">${t('這些禮物小舖買不到，只能靠分享和邀朋友拿到')}</div>
          <div class="gift-list" id="gift-list"></div>
          <div class="gift-note" id="gift-note"></div>
          <div class="shop-foot">
            <button type="button" class="shop-home" id="gift-share">${t('📤 分享邀請連結')}</button>
            <button type="button" class="shop-close" id="gift-close">${t('關閉')}</button>
          </div>
        </div>
      </div>`,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#gift-panel');
    this.list = $('#gift-list');
    this.note = $('#gift-note');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#gift-close').addEventListener('click', () => this.close());
    $('#gift-share').addEventListener('click', async () => {
      if (this.busy) return;
      this.busy = true;
      await this.onShare?.();
      this.busy = false;
      this.refresh();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  async open() {
    this.el.classList.add('show');
    this.list.innerHTML = `<div class="gift-loading">${t('讀取中⋯')}</div>`;
    await this.refresh();
  }

  close() {
    this.el.classList.remove('show');
  }

  async refresh() {
    if (!this.isOpen) return;
    const info = await this.getInfo?.();
    if (!info) {
      this.list.innerHTML = `<div class="gift-loading">${t('連上伺服器後才能領禮物')}</div>`;
      this.note.textContent = '';
      return;
    }
    const nameOf = (id) => {
      const f = GIFT_FURNITURE.find((x) => x.id === id);
      if (f) return { icon: f.icon, name: f.name, kind: t('家具') };
      const st = TENT_STYLE_BY_ID[id];
      return { icon: st?.icon ?? '🎁', name: st?.name ?? id, kind: t('帳篷花色') };
    };
    this.list.innerHTML = REWARDS.map((r) => {
      const g = nameOf(r.id);
      const got = info.gifts.includes(r.id);
      const how = r.need === 'share' ? t('分享一次邀請連結') : t('{n} 位朋友透過你的連結來玩', { n: r.need });
      const prog = r.need === 'share' ? '' : `<span class="gift-prog">${Math.min(info.refs, r.need)}/${r.need}</span>`;
      return `
        <div class="gift-row${got ? ' got' : ''}">
          <span class="gift-icon">${g.icon}</span>
          <span class="gift-text"><b>${g.name}</b><small>${g.kind}・${how}</small></span>
          ${got ? `<span class="gift-done">${t('✅ 已拿到')}</span>` : prog}
        </div>`;
    }).join('');
    this.note.textContent = t('每位朋友第一次來、待滿 {m} 分鐘，你就多 {g} 顆松果（目前邀請了 {n} 位）', { m: info.stay, g: info.gain, n: info.refs });
  }
}
