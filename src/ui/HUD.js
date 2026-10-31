import { t } from '../i18n/i18n.js';

/**
 * 畫面上的介面：營火火力表、互動提示、烤棉花糖進度條、小提示訊息（toast）。
 */
export class HUD {
  constructor(root = document.getElementById('ui')) {
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="fire-meter" id="fire-meter">
        <span class="fire-meter-label">${t('營火')}</span>
        <div class="fire-meter-track"><div class="fire-meter-fill" id="fire-fill"></div></div>
      </div>

      <div class="toasts" id="toasts"></div>

      <div class="roast" id="roast">
        <div class="roast-label" id="roast-label">${t('烤棉花糖中⋯')}</div>
        <div class="roast-track">
          <div class="roast-zone"></div>
          <div class="roast-fill" id="roast-fill"></div>
          <div class="roast-marker" id="roast-marker"></div>
        </div>
        <div class="roast-scale"><span>${t('生')}</span><span>${t('金黃 ✨')}</span><span>${t('焦')}</span></div>
      </div>

      <div class="prompt" id="prompt"></div>

      <div class="online" id="online"><i></i><span id="online-text">${t('連線中⋯')}</span><button type="button" class="ch-chip" id="ch-chip" hidden></button><button type="button" class="me-chip" id="me-chip"></button><span class="pc-chip" id="pc-chip" hidden></span></div>
      <div class="today" id="today" hidden></div>

      <button type="button" class="sound-unlock" id="sound-unlock">${t('🔈 輕點這裡開啟聲音')}</button>
      `,
    );
    this.el = {
      fireFill: root.querySelector('#fire-fill'),
      fireMeter: root.querySelector('#fire-meter'),
      toasts: root.querySelector('#toasts'),
      roast: root.querySelector('#roast'),
      roastFill: root.querySelector('#roast-fill'),
      roastMarker: root.querySelector('#roast-marker'),
      roastLabel: root.querySelector('#roast-label'),
      prompt: root.querySelector('#prompt'),
      online: root.querySelector('#online'),
      soundUnlock: root.querySelector('#sound-unlock'),
      onlineText: root.querySelector('#online-text'),
      chChip: root.querySelector('#ch-chip'),
      meChip: root.querySelector('#me-chip'),
      today: root.querySelector('#today'),
      pcChip: root.querySelector('#pc-chip'),
    };
    this.onMeClick = null;
    this.el.meChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.meChip.addEventListener('click', () => this.onMeClick?.());
    /** 點「分流 N」時呼叫（main.js 設定） */
    this.onChannelClick = null;
    this.el.chChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.chChip.addEventListener('click', () => this.onChannelClick?.());
    this._prompt = null;
    this._fire = -1;
  }

  setFire(ratio) {
    const pct = Math.round(ratio * 100);
    if (pct === this._fire) return;
    this._fire = pct;
    this.el.fireFill.style.width = `${pct}%`;
    this.el.fireMeter.classList.toggle('low', pct < 20);
  }

  setPrompt(html) {
    if (html === this._prompt) return;
    this._prompt = html;
    this.el.prompt.innerHTML = html ?? '';
    this.el.prompt.classList.toggle('show', !!html);
  }

  /**
   * 連線狀態與人數
   * @param {'connecting'|'online'|'offline'|'full'} status
   * @param {number} count 含自己
   */
  setOnline(status, count = 1, place = t('營火旁')) {
    const key = `${status}:${count}:${place}`;
    if (key === this._online) return;
    this._online = key;
    const el = this.el.online;
    el.classList.toggle('is-online', status === 'online');
    el.classList.toggle('is-connecting', status === 'connecting');
    this.el.onlineText.textContent =
      status === 'online'
        ? t('{place} {count} 人', { place: t(place), count })
        : status === 'connecting'
          ? t('連線中⋯')
          : status === 'full'
            ? t('營地客滿，單人模式')
            : t('單人模式（未連上伺服器）');
  }

  /** 左上角自己的名字（點了可以改名字、換動物） */
  setMe(name) {
    this.el.meChip.textContent = `${name} ✏️`;
    this.el.meChip.title = t('改名字・換動物');
  }

  /** 松果數（null＝單人模式不顯示）；delta ＞ 0 時飄出「+n」 */
  setPinecones(n, delta = 0) {
    const el = this.el.pcChip;
    el.hidden = n == null;
    if (n == null) return;
    el.textContent = `🌰 ${n}`;
    if (delta > 0) {
      const f = document.createElement('span');
      f.className = 'pc-float';
      f.textContent = `+${delta}`;
      el.appendChild(f);
      setTimeout(() => f.remove(), 1400);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  /** 「今天有 N 位旅人來過 · 疊了 N 顆石頭」：就算現在只有你一個人，也知道有人來過 */
  setToday({ visitors = 0, stones = 0 } = {}) {
    this.el.today.hidden = !visitors;
    this.el.today.textContent = stones
      ? t('今天有 {n} 位旅人來過 · 疊了 {s} 顆石頭', { n: visitors, s: stones })
      : t('今天有 {n} 位旅人來過', { n: visitors });
  }

  /** 顯示目前分流（0 ＝單人模式，不顯示） */
  setChannel(ch) {
    this.el.chChip.hidden = !ch;
    if (ch) this.el.chChip.textContent = t('分流 {n} ▾', { n: ch });
  }

  /** 手機上聲音被瀏覽器擋住時顯示的按鈕（點了就會解鎖，見 main.js 的 unlockAudio） */
  setSoundBlocked(blocked) {
    if (blocked === this._soundBlocked) return;
    this._soundBlocked = blocked;
    this.el.soundUnlock.classList.toggle('show', blocked);
  }

  showRoast(visible) {
    this.el.roast.classList.toggle('show', visible);
  }

  setRoast(doneness) {
    const p = Math.min(doneness, 1.1) / 1.1; // 條長 = 0 ~ 1.1（多一點空間顯示焦黑）
    this.el.roastFill.style.width = `${p * 100}%`;
    this.el.roastMarker.style.left = `${p * 100}%`;
    let label;
    if (doneness < 0.35) label = t('烤棉花糖中⋯ 還是白白的');
    else if (doneness < 0.75) label = t('✨ 金黃微焦！現在按 F 收回最好吃');
    else if (doneness < 1.0) label = t('有點焦了⋯ 快收回！');
    else label = t('🔥 焦黑了！');
    if (label !== this._roastLabel) {
      this._roastLabel = label;
      this.el.roastLabel.textContent = label;
    }
  }

  toast(message, ms = 2600) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.el.toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 500);
    }, ms);
    // 最多同時 3 則
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
  }
}
