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
        <button type="button" class="chat-peek" id="chat-peek" hidden></button>
        <div class="social-buttons">
          <button type="button" class="social-btn" id="emote-btn">😊<small>${t('表情')}</small></button>
          <button type="button" class="social-btn" id="chat-btn">💬<small>${t('聊天')}</small></button>
          <button type="button" class="social-btn" id="bag-btn">🎒<small>${t('背包')}</small></button>
          <button type="button" class="social-btn" id="friend-btn">👫<small>${t('好友')}</small><i class="social-badge" id="friend-badge" hidden></i></button>
          <button type="button" class="social-btn" id="photo-btn">📷<small>${t('拍照')}</small></button>
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
        <button type="button" class="chat-tr-toggle chat-emote" id="chat-emote" title="${t('表情')}">😊</button>
        <button type="button" class="chat-tr-toggle" id="chat-tr-toggle" title="${t('自動翻譯其他語言的聊天')}">🌐</button>
        <button type="button" class="chat-tr-toggle" id="chat-feed-toggle" title="${t('顯示大家釣魚、煮料理的消息')}">🎣</button>
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
      peek: $('#chat-peek'),
    };
    // 📱 作者 11/24（手機畫面太滿）：手機直放聊天紀錄平常收起來，最新一句在「💬」小條淡淡出現 5 秒；點一下展開紀錄
    this.unread = 0;
    this.el.peek.addEventListener('click', () => this.openLog());
    this.el.peek.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.log.addEventListener('pointerdown', () => this.#keepLog());
    this.el.log.addEventListener('scroll', () => this.#keepLog(), { passive: true });
    // 玩家自己用手指／滾輪往上滑才算「在看舊的」；滑回最下面就恢復自動捲動
    const markUser = () =>
      requestAnimationFrame(() => {
        const l = this.el.log;
        this._userUp = l.scrollHeight - l.scrollTop - l.clientHeight > 30;
      });
    for (const ev of ['wheel', 'touchmove', 'pointerup']) this.el.log.addEventListener(ev, markUser, { passive: true });
    // 打字框旁邊的 😊：手機上「表情」按鈕收起來，改從這裡開
    $('#chat-emote').addEventListener('click', () => this.el.menu.classList.toggle('show'));
    setTimeout(() => this.#peek(), 0);
    addEventListener('resize', () => this.#peek());

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
    this.unread = 0;
    this.el.peek.hidden = true;
    this._userUp = false;
    requestAnimationFrame(() => (this.el.log.scrollTop = this.el.log.scrollHeight)); // 📜 聊天紀錄：打開時捲到最新，往上滑看更早的
    setTimeout(() => this.el.input.focus(), 30);
    // 鍵盤是慢慢滑上來的，多量幾次
    for (const ms of [150, 400, 800]) setTimeout(() => this.fitKeyboard(), ms);
  }

  closeChat() {
    this.el.form.classList.remove('show');
    document.body.classList.remove('chatting');
    this.el.input.blur();
    this.fitKeyboard();
    // 作者 11/25：打完字收起來後，紀錄要停在最新（打字時別人說的話要看得到），不要停在打字前那幾句
    this._userUp = false;
    const log = this.el.log;
    requestAnimationFrame(() => requestAnimationFrame(() => (log.scrollTop = log.scrollHeight)));
    this.#peek(); // 手機直放：收回「💬 聊天紀錄」小條
  }

  get typing() {
    return this.el.form.classList.contains('show');
  }

  /** 手機直放、或正在釣魚：聊天紀錄平常收起來 */
  get compact() {
    // 作者 11/24：電腦、平板釣魚時聊天也擋畫面 → 釣魚時一樣收起來
    return (document.body.classList.contains('touch') && innerWidth < 600 && innerHeight > innerWidth) || document.body.classList.contains('fishing');
  }

  openLog() {
    document.body.classList.add('chat-open');
    this.unread = 0;
    this.#peek();
    requestAnimationFrame(() => (this.el.log.scrollTop = this.el.log.scrollHeight));
    this.#keepLog();
  }

  /** 不再收起來的時候（例如釣完魚）：數字歸零 */
  resetPeek() {
    this.unread = 0;
    this.closeLog();
  }

  closeLog() {
    document.body.classList.remove('chat-open');
    this.#peek();
  }

  /** 展開的紀錄 10 秒沒碰就收起來（打字時不收） */
  #keepLog() {
    clearTimeout(this._logT);
    this._logT = setTimeout(() => (this.typing ? this.#keepLog() : this.closeLog()), 10000);
  }

  /** 「💬」小條：剛來的一句淡淡顯示 5 秒，之後變成「💬 N」（沒讀的幾則） */
  #peek(name = null, text = null) {
    const el = this.el.peek;
    clearTimeout(this._peekT);
    if (!this.compact || document.body.classList.contains('chat-open') || this.typing) return (el.hidden = true);
    if (text != null) {
      el.hidden = false;
      el.classList.add('line');
      el.innerHTML = `💬 ${name ? `<b>${esc(name)}</b>` : ''}${esc(text)}`;
      this._peekT = setTimeout(() => {
        this._lineMsg = false;
        this.#peek();
      }, 5000);
      return;
    }
    el.classList.remove('line');
    // 作者 11/25：沒有新訊息時小條原本會整個藏起來，就看不到聊天紀錄了 → 一直留一顆「💬」，點了就能看以前的聊天
    el.hidden = false;
    el.innerHTML = this.unread ? `💬 <i class="social-badge in">${this.unread > 9 ? '9+' : this.unread}</i>` : `💬 ${t('聊天紀錄')}`;
  }

  /** 加一則聊天紀錄（會慢慢淡掉；畫面上大約 6 則的高度，往上滑看最近 80 則） */
  addLog(name, text, { system = false, feed = false, big = false, seen = false } = {}) {
    const log = this.el.log;
    // 正在往上看舊的，就不要硬拉回最新。作者 11/25：打字時新訊息不會往上跑 → 改成看「玩家自己有沒有往上滑」
    //（鍵盤打開、輸入框移位時版面會變，原本用位置判斷常常誤判成「在看舊的」）
    const atBottom = !this._userUp || log.scrollHeight - log.scrollTop - log.clientHeight < 30;
    const line = document.createElement('div');
    line.className = `chat-line${system ? ' system' : ''}${feed ? ' feed' : ''}${big ? ' big' : ''}`;
    line.innerHTML = system ? esc(text) : `<b>${esc(name)}</b>${esc(text)}`;
    this.el.log.appendChild(line);
    while (this.el.log.children.length > 80) this.el.log.firstChild.remove();
    if (atBottom) {
      log.scrollTop = log.scrollHeight;
      requestAnimationFrame(() => (log.scrollTop = log.scrollHeight)); // 版面算好後再捲一次
    }
    setTimeout(() => line.classList.add('old'), 15000);
    // 📣 大聲公（作者 11/26）：畫面上方已經有大大的橫幅顯示 8 秒，看到了就不算「沒看過」（螢幕關著時來的才算）
    if (seen && this.compact && !document.body.classList.contains('chat-open') && !this.typing) {
      if (document.hidden) this.unread++;
      this.#peek();
      return line;
    }
    if (this.compact && !document.body.classList.contains('chat-open') && !this.typing) {
      // 作者 11/25：小條上已經顯示過、看過的話，不要再算成紅色「沒看過」。
      // 只有這兩種才算沒看過：切到別的分頁／螢幕關著時來的；或上一句才出現不到 2 秒就被下一句蓋掉（來不及看）。
      const now = performance.now();
      if (document.hidden) this.unread++;
      else if (this._lineMsg && now - this._lineAt < 2000) this.unread++;
      this._lineMsg = !document.hidden;
      this._lineAt = now;
      this.#peek(system ? '' : name, text);
    }
    return line;
  }

  /** 在某一行聊天下面加上翻譯 */
  addTranslation(line, text) {
    if (!line?.isConnected) return;
    const tr = document.createElement('div');
    tr.className = 'chat-tr';
    tr.textContent = `🌐 ${text}`;
    const log = this.el.log;
    const atBottom = !this._userUp || log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    line.appendChild(tr);
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  /** 翻譯失敗：那一行後面放一顆 🌐，按了再翻一次（作者 11/28） */
  addTrRetry(line, retry) {
    if (!line?.isConnected || line.querySelector('.tr-retry')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tr-retry';
    b.textContent = '🌐';
    b.title = t('翻譯失敗，按一下再試');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      b.remove();
      retry();
    });
    line.appendChild(b);
  }

  clearLog() {
    this.el.log.innerHTML = '';
  }
}
