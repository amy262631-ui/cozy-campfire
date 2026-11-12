import { EMOTES, EMOJIS } from '../social/emotes.js';
import { t } from '../i18n/i18n.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * 社交介面：
 *  - 😊 表情：四個動作（打招呼、敬禮、掰掰、拜拜）＋表情符號
 *  - 💬 聊天：輸入框（電腦按 Enter 開啟）、左下角聊天紀錄
 */
export class SocialPanel {
  constructor({ onEmote, onEmoji, onChat, onFriends, root = document.getElementById('ui') }) {
    Object.assign(this, { onEmote, onEmoji, onChat, onFriends });
    this.chatEnabled = true;

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="social" id="social">
        <div class="chat-log" id="chat-log"></div>
        <div class="social-buttons">
          <button type="button" class="social-btn" id="emote-btn">😊<small>${t('表情')}</small></button>
          <button type="button" class="social-btn" id="chat-btn">💬<small>${t('聊天')}</small></button>
          <button type="button" class="social-btn" id="bag-btn">🎒<small>${t('背包')}</small></button>
          <button type="button" class="social-btn" id="friend-btn">👫<small>${t('好友')}</small><i class="social-badge" id="friend-badge" hidden></i></button>
        </div>
      </div>

      <div class="emote-menu" id="emote-menu">
        <div class="emote-actions">
          ${EMOTES.map((e) => `<button type="button" data-emote="${e.id}"><span>${e.icon}</span><small>${e.label}</small></button>`).join('')}
        </div>
        <div class="emote-emojis">
          ${EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}
        </div>
      </div>

      <form class="chat-input" id="chat-input" autocomplete="off">
        <input id="chat-text" maxlength="40" placeholder="${t('說點什麼⋯（最多 40 字）')}" enterkeyhint="send" />
        <button type="button" class="chat-tr-toggle" id="chat-tr-toggle" title="${t('自動翻譯其他語言的聊天')}">🌐</button>
        <button type="button" class="chat-shout" id="chat-shout" title="${t('📣 大聲公：全營地都看得到（30 🌰）')}"><span class="cs-ic">📣</span><span class="cs-tx">${t('大聲公')}</span></button>
        <button type="submit">${t('送出')}</button>
      </form>
      `,
    );
    const $ = (id) => root.querySelector(id);
    this.el = {
      root: $('#social'),
      log: $('#chat-log'),
      menu: $('#emote-menu'),
      form: $('#chat-input'),
      input: $('#chat-text'),
      chatBtn: $('#chat-btn'),
    };

    // 📱 手機、平板打字時：鍵盤跳出來，輸入框就貼在鍵盤正上方，聊天訊息顯示在它上面（像 LINE 一樣）
    //    沒偵測到鍵盤（例如平板接實體鍵盤）就留在畫面上方
    this.fitKeyboard = () => {
      const vv = window.visualViewport;
      if (!vv || !document.body.classList.contains('touch')) return;
      const kb = Math.round(window.innerHeight - (vv.offsetTop + vv.height));
      const open = this.typing && kb > 100;
      document.body.classList.toggle('kb', open);
      document.body.style.setProperty('--kb', `${Math.max(0, kb)}px`);
    };
    window.visualViewport?.addEventListener('resize', this.fitKeyboard);
    window.visualViewport?.addEventListener('scroll', this.fitKeyboard);

    // 點這些介面時不要觸發遊戲（轉鏡頭等）
    for (const el of [this.el.root, this.el.menu, this.el.form]) el.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.badgeEl = $('#friend-badge');
    $('#friend-btn').addEventListener('click', () => {
      this.closeChat();
      this.el.menu.classList.remove('show');
      this.onFriends?.();
    });
    $('#emote-btn').addEventListener('click', () => {
      this.closeChat();
      this.el.menu.classList.toggle('show');
    });
    this.el.chatBtn.addEventListener('click', () => (this.el.form.classList.contains('show') ? this.closeChat() : this.openChat()));

    this.el.menu.querySelectorAll('[data-emote]').forEach((b) =>
      b.addEventListener('click', () => {
        this.onEmote?.(b.dataset.emote);
        this.el.menu.classList.remove('show');
      }),
    );
    this.el.menu.querySelectorAll('[data-emoji]').forEach((b) =>
      b.addEventListener('click', () => {
        this.onEmoji?.(b.dataset.emoji);
        this.el.menu.classList.remove('show');
      }),
    );

    this.el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.el.input.value.trim();
      if (text) this.onChat?.(text);
      this.el.input.value = '';
      this.closeChat();
    });
    // 📣 大聲公：把輸入框的字用大聲公送出（全營地都看得到，30 松果）
    root.querySelector('#chat-shout').addEventListener('click', () => {
      const text = this.el.input.value.trim();
      this.onShout?.(text, () => {
        this.el.input.value = '';
        this.closeChat();
      });
    });
    this.el.input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // 打字時不要觸發遊戲按鍵
      if (e.key === 'Escape') this.closeChat();
    });

    // 電腦：Enter 開聊天、Esc 關選單
    window.addEventListener('keydown', (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter' && !document.body.classList.contains('joining')) {
        e.preventDefault();
        this.openChat();
      } else if (e.key === 'Escape') {
        this.el.menu.classList.remove('show');
      }
    });
  }

  /** 專注帳篷裡關掉聊天 */
  setChatEnabled(enabled) {
    this.chatEnabled = enabled;
    this.el.chatBtn.classList.toggle('disabled', !enabled);
    if (!enabled) this.closeChat();
  }

  /** 👫 好友按鈕上的紅點：未讀密頻＋好友邀請＋作者回覆 */
  setBadge(n) {
    this.badgeEl.hidden = !n;
    this.badgeEl.textContent = n > 9 ? '9+' : String(n);
    // 有新的好友邀請／密頻：整顆按鈕紅底閃爍（打開好友視窗看過就停）
    this.badgeEl.closest('.social-btn')?.classList.toggle('alert', !!n);
  }

  openChat() {
    if (!this.chatEnabled) {
      this.onDisabled?.();
      return;
    }
    this.el.menu.classList.remove('show');
    this.el.form.classList.add('show');
    document.body.classList.add('chatting'); // 手機打字時先把左上的資訊收起來，免得重疊
    setTimeout(() => this.el.input.focus(), 30);
    // 鍵盤是慢慢滑上來的，多量幾次
    for (const ms of [150, 400, 800]) setTimeout(() => this.fitKeyboard(), ms);
  }

  closeChat() {
    this.el.form.classList.remove('show');
    document.body.classList.remove('chatting');
    this.el.input.blur();
    this.fitKeyboard();
  }

  get typing() {
    return this.el.form.classList.contains('show');
  }

  /** 加一則聊天紀錄（會慢慢淡掉；最多保留 6 則） */
  addLog(name, text, { system = false } = {}) {
    const line = document.createElement('div');
    line.className = `chat-line${system ? ' system' : ''}`;
    line.innerHTML = system ? esc(text) : `<b>${esc(name)}</b>${esc(text)}`;
    this.el.log.appendChild(line);
    while (this.el.log.children.length > 6) this.el.log.firstChild.remove();
    setTimeout(() => line.classList.add('old'), 15000);
    return line;
  }

  /** 在某一行聊天下面加上翻譯 */
  addTranslation(line, text) {
    if (!line?.isConnected) return;
    const tr = document.createElement('div');
    tr.className = 'chat-tr';
    tr.textContent = `🌐 ${text}`;
    line.appendChild(tr);
  }

  clearLog() {
    this.el.log.innerHTML = '';
  }
}
