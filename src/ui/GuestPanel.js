import { t } from '../i18n/i18n.js';

/**
 * 帳篷裡的「按讚」「留言本」：拜訪別人的帳篷時可以按讚、留一句話；主人看得到大家的留言。
 *   onLike()      → Promise<{ liked, likes } | null>
 *   onNote(text)  → Promise<string | null>（錯誤訊息）
 */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class GuestPanel {
  constructor({ onLike, onNote, onLeave, root = document.getElementById('ui') }) {
    this.root = root;
    Object.assign(this, { onLike, onNote, onLeave });
    this.home = null;
    this.mine = false;
    this.liked = false;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="guest-tools" id="guest-tools" hidden>
        <button type="button" id="guest-like"></button>
        <button type="button" id="guest-book"></button>
        <button type="button" id="guest-exit">${t('🚪 出去')}</button>
      </div>
      <div class="guest-panel" id="guest-panel">
        <div class="guest-card">
          <div class="guest-title" id="guest-title"></div>
          <div class="guest-list" id="guest-list"></div>
          <form class="guest-form" id="guest-form">
            <input class="join-input" id="guest-input" maxlength="60" autocomplete="off" placeholder="${t('留一句話給主人（60 字內）')}" />
            <button type="submit" class="acct-btn">${t('留言')}</button>
          </form>
          <div class="acct-msg" id="guest-msg"></div>
          <button type="button" class="shop-close" id="guest-close">${t('關閉')}</button>
        </div>
      </div>`,
    );
    const $ = (s) => root.querySelector(s);
    this.tools = $('#guest-tools');
    this.likeBtn = $('#guest-like');
    this.bookBtn = $('#guest-book');
    this.panel = $('#guest-panel');
    this.list = $('#guest-list');
    this.titleEl = $('#guest-title');
    this.input = $('#guest-input');
    this.msg = $('#guest-msg');
    for (const el of [this.tools, this.panel]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.input.addEventListener('keydown', (e) => e.stopPropagation()); // 打字時不要走路
    this.likeBtn.addEventListener('click', async () => {
      if (this.mine || this.busy) return;
      this.busy = true;
      const res = await this.onLike?.();
      this.busy = false;
      if (res) {
        this.liked = res.liked;
        if (this.home) this.home.likes = res.likes;
        this.render();
      }
    });
    this.bookBtn.addEventListener('click', () => this.open());
    root.querySelector('#guest-exit').addEventListener('click', () => this.onLeave?.());
    $('#guest-close').addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (e) => e.target === this.panel && this.close());
    $('#guest-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text || this.busy) return;
      this.busy = true;
      const err = await this.onNote?.(text);
      this.busy = false;
      this.msg.textContent = err ?? '';
      if (!err) this.input.value = '';
    });
  }

  /** 進出帳篷時呼叫；home 為 null 表示不在帳篷裡 */
  set(home, { mine = false, liked } = {}) {
    this.home = home;
    this.mine = mine;
    if (liked != null) this.liked = liked;
    this.tools.hidden = !home;
    // 主人在自己帳篷：讚、留言本排進布置那一欄的最上面，才不會和「布置／開放參觀／出去」疊在一起
    const homeTools = document.getElementById('home-tools');
    if (mine && home && homeTools) {
      if (this.tools.parentElement !== homeTools) homeTools.prepend(this.tools);
    } else if (this.tools.parentElement !== this.root) this.root.append(this.tools);
    this.tools.classList.toggle('stacked', this.tools.parentElement === homeTools);
    if (!home) this.close();
    this.render();
  }

  update(home) {
    if (!this.home) return;
    this.home = home;
    this.render();
  }

  open() {
    this.panel.classList.add('show');
    this.msg.textContent = '';
    this.render();
  }

  close() {
    this.panel.classList.remove('show');
  }

  render() {
    const h = this.home;
    if (!h) return;
    const notes = h.notes ?? [];
    this.likeBtn.textContent = this.mine ? t('❤️ {n} 個讚', { n: h.likes ?? 0 }) : this.liked ? t('❤️ 已按讚 {n}', { n: h.likes ?? 0 }) : t('🤍 按讚 {n}', { n: h.likes ?? 0 });
    this.likeBtn.classList.toggle('on', this.liked && !this.mine);
    this.bookBtn.textContent = t('📖 留言本 {n}', { n: notes.length });
    this.tools.querySelector('#guest-exit').hidden = this.mine; // 主人用布置那排的「出去」
    if (!this.panel.classList.contains('show')) return;
    this.titleEl.textContent = this.mine ? t('📖 我的帳篷留言本') : t('📖 {name} 的留言本', { name: h.name || t('旅人') });
    this.list.innerHTML = notes.length
      ? [...notes]
          .reverse()
          .map((n) => `<div class="guest-note"><b>${esc(n.n)}</b><span>${esc(n.t)}</span></div>`)
          .join('')
      : `<div class="guest-empty">${this.mine ? t('還沒有人留言，開放參觀後旅人就能來留言') : t('還沒有人留言，當第一個吧')}</div>`;
  }
}
