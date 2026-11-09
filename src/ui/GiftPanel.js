import { t } from '../i18n/i18n.js';
import { GIFT_FURNITURE } from '../game/furniture.js';
import { TENT_STYLE_BY_ID } from '../game/tentStyles.js';
import { OUTFIT_BY_ID } from '../game/outfits.js';
import { CHALLENGE_BY_ID } from '../game/dailyChallenge.js';
import { addCloseX } from './CloseX.js';

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
  constructor({ getInfo, getUrl, onCopy, onShareLink, onShareImage, onContact, onPreview, root = document.getElementById('ui') }) {
    Object.assign(this, { getInfo, getUrl, onCopy, onShareLink, onShareImage, onContact, onPreview });
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
          <details class="gift-rules" id="gift-rules" open><summary>${t('📜 怎麼拿？看圖就懂')}</summary><div id="gift-rules-body"></div></details>
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
    this.rules = $('#gift-rules-body');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    this.urlEl.addEventListener('focus', () => this.urlEl.select());
    $('#gift-close').addEventListener('click', () => this.close());
    addCloseX($('#gift-close'), '.shop-card'); // 右上角 ✕
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen) this.close(); // 電腦版按 Esc 關閉
    });
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
    const R = info.rules ?? {};
    // 11/09 作者：文字規則看不懂 → 改成圖文流程卡（一步一個小圖示＋箭頭），細節收在最下面
    const step = (icon, txt) => `<span class="flow-step"><i>${icon}</i><small>${txt}</small></span>`;
    const arrow = '<span class="flow-arrow">➜</span>';
    const flow = (...steps) => `<div class="flow">${steps.join(arrow)}</div>`;
    const card = (cls, title, sub, body) => `<div class="flow-card ${cls}"><div class="flow-title">${title}<small>${sub}</small></div>${body}</div>`;
    // 11/09 作者：同一個網路要 5 分鐘那條，放在卡片裡看得到（原本只收在小細節）
    const netNote = `<div class="flow-note">${t('🏢 同一個網路（共用 Wi‑Fi）要玩 {m} 分鐘', { m: R.net ?? 5 })}</div>`;
    this.rules.innerHTML = [
      card(
        'fc-daily',
        t('👒 每日造型'),
        t('每天換一款，兩種方法選一種'),
        flow(step('📤', t('傳連結')), step('👆', t('朋友點進來')), step('⏱️', t('玩 {m} 分鐘', { m: R.share ?? 1 })), step('🎁', t('你拿到'))) +
          netNote +
          `<div class="flow-or">${t('或')}</div>` +
          flow(step('🎯', t('今日挑戰 3 題')), step('✅', t('全部做完')), step('🎁', t('你拿到'))),
      ),
      card(
        'fc-new',
        t('🌟 邀請新朋友'),
        t('只算第一次來營地的人'),
        flow(step('📤', t('傳連結')), step('🆕', t('新朋友點進來')), step('⏱️', t('玩 {m} 分鐘', { m: info.stay })), step('🎁', t('+{g} 🌰＋每週造型', { g: info.gain }))) +
          netNote +
          `<div class="flow-tiers"><span>${t('累積')}</span><b>1 ${t('位')} 🏮</b><b>3 ${t('位')} 🌈</b><b>5 ${t('位')} 🔭</b></div>`,
      ),
      card(
        'fc-date',
        t('🔥 營火之約'),
        t('早上、晚上 9:30～10:00'),
        flow(step('🕤', t('營火時間')), step('👆', t('朋友點連結')), step('⏱️', t('玩 {m} 分鐘', { m: R.date ?? 1 })), step('🎁🎁', t('兩個人都拿到'))) + netNote,
      ),
      `<details class="flow-more"><summary>${t('📌 小細節（同一個網路、中途離開、不算的情況）')}</summary><ul>${[
        t('🏢 同一個網路（家人、同事共用 Wi‑Fi）：要玩 {m} 分鐘、而且要真的玩一下（釣魚、採集、撿垃圾、做任務），每天最多算 {n} 位', { m: R.net ?? 5, n: R.netDaily ?? 3 }),
        t('⏳ 朋友中途跳出去沒關係，30 分鐘內回來還是算'),
        t('❌ 不算：自己點自己的連結、只傳圖片沒掃 QR、光按分享沒人點進來'),
        t('🔁 每日造型一天只能拿一次；營火之約同一對朋友一天算一次'),
        t('📌 獎勵都是系統自動發的，沒有符合條件就不會拿到，作者不另外補發'),
      ]
        .map((x) => `<li>${x}</li>`)
        .join('')}</ul></details>`,
    ].join('');
    // 11/09 作者：點獎勵（例如貝雷帽）就跳預覽圖 → 每一列都可以點（prev＝'outfit:id'／'furn:id'／'style:id'）
    const row = (icon, name, how, done, prog = '', prev = '') => `
        <div class="gift-row${done ? ' got' : ''}${prev ? ' can-prev' : ''}"${prev ? ` data-prev="${prev}" data-how="${esc(how.replace(/<[^>]+>/g, ''))}"` : ''}>
          <span class="gift-icon">${icon}</span>
          <span class="gift-text"><b>${esc(name)}</b><small>${how}</small></span>
          ${done ? `<span class="gift-done">${t('✅ 已拿到')}</span>` : prog}
        </div>`;
    const o = (id) => OUTFIT_BY_ID[id];
    const rows = [];
    if (o(info.daily)) {
      rows.push(row(o(info.daily).icon, t(o(info.daily).zh), t('👒 今天的每日造型・朋友點你的連結進來玩 1 分鐘，或完成下面的「今日挑戰」'), info.dailyGot, '', `outfit:${info.daily}`));
      // 🎯 今日挑戰：不想分享的人，做完今天 3 題也能拿
      if (!info.dailyGot && info.chal?.length) {
        rows.push(
          `<div class="chal-box"><div class="chal-title">${t('🎯 今日挑戰（3 題都做完就拿到今天的每日造型）')}</div>${info.chal
            .map((c) => {
              const d = CHALLENGE_BY_ID[c.id];
              const ok = c.have >= c.need;
              return `<div class="chal-row${ok ? ' ok' : ''}"><span>${d?.icon ?? ''} ${t(d?.zh ?? '')}</span><b>${ok ? '✅' : `${c.have}/${c.need}`}</b></div>`;
            })
            .join('')}</div>`,
        );
      }
    }
    if (o(info.weekly)) rows.push(row(o(info.weekly).icon, t(o(info.weekly).zh), t('🌟 這週限定造型・朋友第一次透過你的連結來玩，待滿 {m} 分鐘', { m: info.stay }), info.weeklyGot, '', `outfit:${info.weekly}`));
    if (o(info.dateNext)) rows.push(row(o(info.dateNext).icon, t(o(info.dateNext).zh), t('🔥 營火之約限定・早上或晚上 9:30～10:00 朋友透過你的連結進來，兩個人都拿到'), false, '', `outfit:${info.dateNext}`));
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
      rows.push(row(g.icon, g.name, how, info.gifts.includes(r.id), prog, `${GIFT_FURNITURE.some((x) => x.id === r.id) ? 'furn' : 'style'}:${r.id}`));
    }
    this.list.innerHTML = rows.join('');
    for (const el of this.list.querySelectorAll('[data-prev]')) {
      el.addEventListener('click', () => {
        const [kind, id] = el.dataset.prev.split(':');
        this.onPreview?.(kind, id, el.dataset.how);
      });
    }
    this.note.innerHTML = `${esc(t('已經有 {n} 位朋友透過你的連結來玩。每位朋友第一次來、待滿 {m} 分鐘，你就多 {g} 顆松果。只傳圖片的話，請朋友掃圖上的 QR Code 才算喔', { m: info.stay, g: info.gain, n: info.refs }))}<div class="gift-id">${esc(t('🆔 你的玩家編號：{id}（找作者補發東西時，請給這組編號）', { id: info.code }))}</div>`;
  }
}
