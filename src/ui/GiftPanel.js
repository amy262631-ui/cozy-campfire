import { t } from '../i18n/i18n.js';
import { GIFT_FURNITURE } from '../game/furniture.js';
import { TENT_STYLE_BY_ID } from '../game/tentStyles.js';
import { OUTFIT_BY_ID } from '../game/outfits.js';

/**
 * 🔥 約朋友・分享送禮（同一個地方）：
 * - 上面是自己的邀請連結：複製、分享連結、做一張有 QR Code 的邀請圖
 * - 下面是所有能拿到的獎勵（每日造型、每週限定、營火之約、分享禮物家具），一眼看到拿到了沒
 * 朋友要「點你的連結」或「掃邀請圖上的 QR Code」進來才算數（連結裡帶著你的邀請代號）。
 *
 *   getInfo()     → Promise<{ code, refs, gifts, gain, stay, daily, dailyGot, weekly, weeklyGot, dateNext } | null>
 *   getUrl()      → 邀請連結
 *   onCopy()      → Promise<boolean>
 *   onShareLink() → Promise<boolean>
 *   onShareImage()
 */
const GIFTS = [
  { id: 'postcard', need: 'share' },
  { id: 'foxlamp', need: 1 },
  { id: 'rainbow', need: 3 },
  { id: 'telescope', need: 5 },
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class GiftPanel {
  constructor({ getInfo, getUrl, onCopy, onShareLink, onShareImage, root = document.getElementById('ui') }) {
    Object.assign(this, { getInfo, getUrl, onCopy, onShareLink, onShareImage });
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="shop-panel gift-panel" id="gift-panel">
        <div class="shop-card">
          <div class="shop-title">${t('🔥 約朋友・分享送禮')}</div>
          <div class="shop-sub">${t('朋友要「點你的連結」或「掃邀請圖上的 QR Code」進來才算數')}</div>
          <div class="invite-box">
            <input type="text" id="invite-url" readonly />
            <div class="invite-btns">
              <button type="button" id="invite-copy">${t('📋 複製連結')}</button>
              <button type="button" id="invite-share">${t('📤 分享連結')}</button>
              <button type="button" id="invite-image">${t('🖼️ QR 邀請圖')}</button>
            </div>
          </div>
          <div class="gift-list" id="gift-list"></div>
          <div class="gift-note" id="gift-note"></div>
          <div class="shop-foot">
            <button type="button" class="shop-close" id="gift-close">${t('關閉')}</button>
          </div>
        </div>
      </div>`,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#gift-panel');
    this.list = $('#gift-list');
    this.note = $('#gift-note');
    this.urlEl = $('#invite-url');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    this.urlEl.addEventListener('focus', () => this.urlEl.select());
    $('#gift-close').addEventListener('click', () => this.close());
    const run = (fn) => async () => {
      if (this.busy) return;
      this.busy = true;
      await fn?.();
      this.busy = false;
      this.refresh();
    };
    $('#invite-copy').addEventListener('click', run(() => this.onCopy?.()));
    $('#invite-share').addEventListener('click', run(() => this.onShareLink?.()));
    $('#invite-image').addEventListener('click', () => {
      this.close();
      this.onShareImage?.();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  async open() {
    this.el.classList.add('show');
    this.urlEl.value = this.getUrl?.() ?? location.href;
    this.list.innerHTML = `<div class="gift-loading">${t('讀取中⋯')}</div>`;
    await this.refresh();
  }

  close() {
    this.el.classList.remove('show');
  }

  async refresh() {
    if (!this.isOpen) return;
    this.urlEl.value = this.getUrl?.() ?? location.href;
    const info = await this.getInfo?.();
    if (!info) {
      this.list.innerHTML = `<div class="gift-loading">${t('連上伺服器後才能領禮物')}</div>`;
      this.note.textContent = '';
      return;
    }
    const row = (icon, name, how, done, prog = '') => `
        <div class="gift-row${done ? ' got' : ''}">
          <span class="gift-icon">${icon}</span>
          <span class="gift-text"><b>${esc(name)}</b><small>${how}</small></span>
          ${done ? `<span class="gift-done">${t('✅ 已拿到')}</span>` : prog}
        </div>`;
    const o = (id) => OUTFIT_BY_ID[id];
    const rows = [];
    if (o(info.daily)) rows.push(row(o(info.daily).icon, t(o(info.daily).zh), t('👒 今天的每日造型・今天分享一次（複製或分享連結都算）'), info.dailyGot));
    if (o(info.weekly)) rows.push(row(o(info.weekly).icon, t(o(info.weekly).zh), t('🌟 這週限定造型・朋友第一次透過你的連結來玩，待滿 {m} 分鐘', { m: info.stay }), info.weeklyGot));
    if (o(info.dateNext)) rows.push(row(o(info.dateNext).icon, t(o(info.dateNext).zh), t('🔥 營火之約限定・晚上 9:30～10:00 朋友透過你的連結進來，兩個人都拿到'), false));
    const nameOf = (id) => {
      const f = GIFT_FURNITURE.find((x) => x.id === id);
      if (f) return { icon: f.icon, name: f.name, kind: t('家具') };
      const st = TENT_STYLE_BY_ID[id];
      return { icon: st?.icon ?? '🎁', name: st?.name ?? id, kind: t('帳篷花色') };
    };
    for (const r of GIFTS) {
      const g = nameOf(r.id);
      const how = r.need === 'share' ? t('{kind}・第一次分享', { kind: g.kind }) : t('{kind}・{n} 位朋友透過你的連結來玩', { kind: g.kind, n: r.need });
      const prog = r.need === 'share' ? '' : `<span class="gift-prog">${Math.min(info.refs, r.need)}/${r.need}</span>`;
      rows.push(row(g.icon, g.name, how, info.gifts.includes(r.id), prog));
    }
    this.list.innerHTML = rows.join('');
    this.note.textContent = t('已經有 {n} 位朋友透過你的連結來玩。每位朋友第一次來、待滿 {m} 分鐘，你就多 {g} 顆松果。只傳圖片的話，請朋友掃圖上的 QR Code 才算喔', { m: info.stay, g: info.gain, n: info.refs });
  }
}
