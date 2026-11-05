import { t } from '../i18n/i18n.js';
import { SPONSOR_URL } from '../config.js';
import { trButton, bindTranslate } from '../network/chatTranslate.js';
import { localPage, pagerHtml, bindPager } from './pager.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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
 *  - ☕ 支持營地：單純支持這個遊戲（不綁名字、沒有名冊）
 *  - 最下面不起眼的小字：☕ 請作者喝杯熱可可
 *
 *   onPost(text, color)  貼出留言
 */
export class NoticePanel {
  constructor({ hud, onPost, onIdea, onHistory, root = document.getElementById('ui') }) {
    this.hud = hud;
    this.onHistory = onHistory;
    this.page = 0;
    this.reqId = 0;
    this.onPost = onPost;
    this.onIdea = onIdea;
    this.notes = [];
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
            <button type="button" data-tab="idea">${t('💡 給建議')}</button>
            <button type="button" data-tab="support">${t('☕ 支持營地')}</button>
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

          <div class="notice-page" data-page="idea" hidden>
            <div class="notice-idea">
              <p>${t('想要什麼新功能？哪裡不好玩、哪裡怪怪的？直接告訴作者 💌')}</p>
              <textarea id="idea-text" maxlength="200" rows="4" placeholder="${t('例如：希望多一種魚、手機按鈕太小⋯（200 字內）')}"></textarea>
              <button type="button" class="notice-post" id="idea-send">${t('💡 送出建議（每天第一則送 3 顆松果）')}</button>
              <div class="notice-hint" id="idea-msg">${t('只有作者看得到，不會公開')}</div>
            </div>
          </div>

          <div class="notice-page" data-page="support" hidden>
            <div class="notice-support">
              <div class="support-wig" id="support-wig" hidden></div>
              <div class="support-cup">☕</div>
              <p>${t('這座小營地是一個人慢慢做出來的。')}<br />${t('伺服器和網址都需要一點費用。')}</p>
              <p>${t('如果你喜歡在這裡坐一下，可以請我喝杯熱可可，讓這團營火繼續燒下去 🔥')}</p>
              <a class="support-btn" id="notice-cocoa" href="${SPONSOR_URL ? esc(SPONSOR_URL) : '#'}" ${SPONSOR_URL ? 'target="_blank" rel="noopener"' : ''}>☕ ${t('請作者喝杯熱可可')}</a>
              <div class="notice-hint">${t('支援信用卡、ATM、超商代碼 · 金額隨意，心意最重要 💛')}</div>
            </div>
          </div>

          <div class="notice-foot">
            <span></span>
            <button type="button" class="notice-close" id="notice-close">${t('關閉')}</button>
          </div>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#notice');
    this.listEl = $('#notice-list');
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

    $('#idea-text').addEventListener('keydown', (e) => e.stopPropagation());
    $('#idea-send').addEventListener('click', async () => {
      const box = $('#idea-text');
      const text = box.value.trim();
      const msg = $('#idea-msg');
      if (text.length < 4) {
        msg.textContent = t('多寫幾個字吧 🙂');
        return;
      }
      if (this.ideaBusy) return;
      this.ideaBusy = true;
      const res = await this.onIdea?.(text);
      this.ideaBusy = false;
      if (res?.ok) {
        box.value = '';
        msg.textContent = res.gain ? t('謝謝你的建議！送你 {n} 顆松果 🌰', { n: res.gain }) : t('謝謝你的建議！作者會認真看 💌');
      } else msg.textContent = res?.reason === 'tooFast' ? t('慢慢來，一分鐘後再送一則 🙂') : res?.reason === 'offline' ? t('連上伺服器後才能送出') : t('沒送成，再試一次吧');
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
    this.page = 0;
    this.#renderNotes();
  }

  close() {
    this.el.classList.remove('show');
    this.text.blur();
  }

  /** 伺服器（或單人模式）傳來最新留言 */
  setNotes(list) {
    this.notes = list ?? [];
    if (this.isOpen && this.page === 0) this.#renderNotes(); // 翻到舊的頁面時不要突然跳走
  }

  #setTab(tab) {
    this.tab = tab;
    if (tab === 'support') this.onSupport?.(this.el.querySelector('#support-wig'));
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    this.el.querySelectorAll('[data-page]').forEach((p) => (p.hidden = p.dataset.page !== tab));
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

  async #renderNotes() {
    bindTranslate(this.listEl);
    const id = ++this.reqId;
    let res = (await this.onHistory?.('notes', this.page)) ?? null;
    if (id !== this.reqId) return; // 已經翻到別頁了
    if (!res?.ok) res = localPage([...this.notes].reverse(), this.page);
    this.page = res.page;
    const list = res.items;
    this.listEl.innerHTML = pagerHtml(res.page, res.pages) + (list.length
      ? list
          .map(
            (n, i) => `
          <div class="notice-note" style="background:${NOTE_COLORS[n.color | 0] ?? NOTE_COLORS[0]};--tilt:${((i * 37) % 5) - 2}deg">
            <div class="notice-note-text">${esc(n.text)}</div>
            <div class="notice-note-by">— ${esc(n.name)} · ${ago(n.at)}${trButton(n.text)}</div>
          </div>`,
          )
          .join('')
      : `<div class="notice-empty">${t('還沒有人留言，來貼第一張吧 📌')}</div>`) + pagerHtml(res.page, res.pages);
    bindPager(this.listEl, (d) => {
      this.page = Math.max(0, this.page + d);
      this.listEl.scrollTop = 0;
      this.listEl.closest('.notice-page')?.scrollTo?.(0, 0);
      this.#renderNotes();
    });
  }
}
