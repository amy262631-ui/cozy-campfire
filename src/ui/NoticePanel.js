import { t } from '../i18n/i18n.js';
import { SPONSOR_URL } from '../config.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = { flower: '🌼', clover: '🍀' };
/** 便條紙的顏色（與木牌上畫的一致） */
export const NOTE_COLORS = ['#fff3b0', '#ffd6dc', '#d4f0d0', '#d6e6ff'];
const NOTE_MAX = 60;
const NOTE_COOLDOWN = 20000;

/** 幾分鐘前／幾小時前 */
function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return t('剛剛');
  if (m < 60) return t('{n} 分鐘前', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{n} 小時前', { n: h });
  return t('{n} 天前', { n: Math.floor(h / 24) });
}

/**
 * 營火告示牌（走到木牌前按 E 打開）：
 *  - 💬 留言板：看大家的便條、自己貼一張（所有分流共用）
 *  - 🌼 贊助者：贊助者名冊
 *  - 最下面不起眼的小字：☕ 請作者喝杯熱可可
 *
 *   onPost(text, color)  貼出留言
 */
export class NoticePanel {
  constructor({ hud, onPost, root = document.getElementById('ui') }) {
    this.hud = hud;
    this.onPost = onPost;
    this.notes = [];
    this.sponsors = null;
    this.tab = 'notes';
    this.color = 0;
    this.lastPost = 0;

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="notice" id="notice">
        <div class="notice-card">
          <div class="notice-title">${t('📌 營火告示牌')}</div>
          <div class="notice-tabs">
            <button type="button" data-tab="notes" class="on">${t('💬 留言板')}</button>
            <button type="button" data-tab="sponsors">${t('🌼 贊助者')}</button>
          </div>

          <div class="notice-page" data-page="notes">
            <form class="notice-form" id="notice-form" autocomplete="off">
              <textarea id="notice-text" maxlength="${NOTE_MAX}" rows="2" placeholder="${t('留一句話給之後來烤火的人⋯')}"></textarea>
              <div class="notice-form-row">
                <div class="notice-colors">
                  ${NOTE_COLORS.map((c, i) => `<button type="button" data-color="${i}" class="${i === 0 ? 'on' : ''}" style="background:${c}" aria-label="color ${i + 1}"></button>`).join('')}
                </div>
                <span class="notice-count" id="notice-count">0/${NOTE_MAX}</span>
                <button type="submit" class="notice-post">${t('📌 貼上去')}</button>
              </div>
            </form>
            <div class="notice-list" id="notice-list"></div>
          </div>

          <div class="notice-page" data-page="sponsors" hidden>
            <div class="notice-sub">${t('謝謝每一位讓這團火繼續燒下去的人')}</div>
            <div class="notice-sponsors" id="notice-sponsors"></div>
            <div class="notice-hint">${t('贊助後在進場時輸入同樣的暱稱，頭上就會開出一朵小花 🌼')}</div>
          </div>

          <div class="notice-foot">
            <a class="notice-cocoa" id="notice-cocoa" href="${SPONSOR_URL ? esc(SPONSOR_URL) : '#'}" ${SPONSOR_URL ? 'target="_blank" rel="noopener"' : ''}>☕ ${t('請作者喝杯熱可可')}</a>
            <button type="button" class="notice-close" id="notice-close">${t('關閉')}</button>
          </div>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#notice');
    this.listEl = $('#notice-list');
    this.sponsorEl = $('#notice-sponsors');
    this.text = $('#notice-text');
    this.count = $('#notice-count');

    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('keydown', (e) => e.stopPropagation());
    // 點背景關閉
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#notice-close').addEventListener('click', () => this.close());

    this.el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => this.#setTab(b.dataset.tab)));
    this.el.querySelectorAll('[data-color]').forEach((b) =>
      b.addEventListener('click', () => {
        this.color = Number(b.dataset.color);
        this.el.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b));
      }),
    );
    this.text.addEventListener('input', () => (this.count.textContent = `${this.text.value.length}/${NOTE_MAX}`));
    // Enter 送出、Shift+Enter 換行
    this.text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        $('#notice-form').requestSubmit();
      }
    });
    $('#notice-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.#post();
    });

    $('#notice-cocoa').addEventListener('click', (e) => {
      if (SPONSOR_URL) return;
      e.preventDefault();
      this.hud.toast(t('作者還沒設定贊助連結，謝謝你的心意 💛'));
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
    this.#renderNotes();
    if (this.tab === 'sponsors') this.#loadSponsors();
  }

  close() {
    this.el.classList.remove('show');
    this.text.blur();
  }

  /** 伺服器（或單人模式）傳來最新留言 */
  setNotes(list) {
    this.notes = list ?? [];
    if (this.isOpen) this.#renderNotes();
  }

  #setTab(tab) {
    this.tab = tab;
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    this.el.querySelectorAll('[data-page]').forEach((p) => (p.hidden = p.dataset.page !== tab));
    if (tab === 'sponsors') this.#loadSponsors();
  }

  #post() {
    const text = this.text.value.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
    if (!text) return;
    const wait = NOTE_COOLDOWN - (Date.now() - this.lastPost);
    if (wait > 0) {
      this.hud.toast(t('留言太快了，{n} 秒後再貼一張吧', { n: Math.ceil(wait / 1000) }));
      return;
    }
    this.lastPost = Date.now();
    this.onPost?.(text, this.color);
    this.text.value = '';
    this.count.textContent = `0/${NOTE_MAX}`;
    this.text.blur();
  }

  #renderNotes() {
    const list = [...this.notes].reverse();
    this.listEl.innerHTML = list.length
      ? list
          .map(
            (n, i) => `
          <div class="notice-note" style="background:${NOTE_COLORS[n.color | 0] ?? NOTE_COLORS[0]};--tilt:${((i * 37) % 5) - 2}deg">
            <div class="notice-note-text">${esc(n.text)}</div>
            <div class="notice-note-by">— ${esc(n.name)} · ${ago(n.at)}</div>
          </div>`,
          )
          .join('')
      : `<div class="notice-empty">${t('還沒有人留言，來貼第一張吧 📌')}</div>`;
  }

  async #loadSponsors() {
    if (!this.sponsors) this.sponsorEl.innerHTML = `<div class="notice-empty">${t('翻開名冊中⋯')}</div>`;
    try {
      const res = await fetch('api/sponsors', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      this.sponsors = await res.json();
    } catch {
      this.sponsorEl.innerHTML = `<div class="notice-empty">${t('目前是單人模式，連上伺服器後就能看到贊助名單')}</div>`;
      return;
    }
    this.sponsorEl.innerHTML = this.sponsors.length
      ? this.sponsors
          .map(
            (s) => `
          <div class="notice-sponsor">
            <span>${ICON[s.reward] ?? '🌼'}</span>
            <b>${esc(s.name)}</b>
            <small>${esc(s.date ?? '')}</small>
          </div>`,
          )
          .join('')
      : `<div class="notice-empty">${t('還沒有贊助者')}</div>`;
  }
}
