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

      <div class="online" id="online"><i></i><span id="online-text">${t('連線中⋯')}</span><button type="button" class="ch-chip" id="ch-chip" hidden></button><button type="button" class="me-chip" id="me-chip"></button><span class="pc-chip" id="pc-chip" hidden></span><button type="button" class="invite-chip" id="invite-chip" hidden>${t('👫 邀朋友')}</button><button type="button" class="home-chip" id="home-chip" hidden>${t('🏠 回家')}</button></div>
      <div class="today" id="today" hidden></div>
      <div class="event-line" id="event-line" hidden></div>
      <div class="mini-line" id="mini-line" hidden></div>

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
      invite: root.querySelector('#invite-chip'),
      homeChip: root.querySelector('#home-chip'),
      eventLine: root.querySelector('#event-line'),
      miniLine: root.querySelector('#mini-line'),
    };
    this.onMeClick = null;
    this.onInvite = null;
    this.onHome = null;
    this.el.homeChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.homeChip.addEventListener('click', () => this.onHome?.());
    this.el.invite.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.invite.addEventListener('click', () => this.onInvite?.());
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

  /** 有帳篷、而且不在帳篷裡時，顯示「🏠 回家」 */
  setHomeVisible(v) {
    this.el.homeChip.hidden = !v;
  }

  /** 連上伺服器才顯示「邀朋友」 */
  setInviteVisible(v) {
    this.el.invite.hidden = !v;
  }

  /**
   * 每晚的營火時間：進行中顯示倒數；還沒開始顯示「今晚 9 點」
   * @param {{ active: boolean, endsIn?: number, startsIn?: number } | null} ev 秒數
   */
  setEvent(ev) {
    const el = this.el.eventLine;
    el.hidden = !ev;
    if (!ev) return;
    el.classList.toggle('active', ev.active);
    if (ev.active) {
      el.textContent = t('🌠 營火時間・流星雨中！松果加倍・限定流星吊飾（還剩 {m} 分）', { m: Math.max(1, Math.ceil(ev.endsIn / 60)) });
    } else if (ev.startsIn < 3 * 3600) {
      const h = Math.floor(ev.startsIn / 3600);
      const m = Math.ceil((ev.startsIn % 3600) / 60);
      el.textContent = h
        ? t('🌙 今晚 9 點營火時間・還有 {h} 小時 {m} 分', { h, m })
        : t('🌙 今晚 9 點營火時間・還有 {m} 分鐘', { m: Math.max(1, m) });
    } else {
      el.textContent = t('🌙 每晚 9 點營火時間：流星雨、松果加倍');
    }
  }

  /** 每小時小活動：進行中顯示倒數（釣魚大賽加上目前第一名），沒有的話顯示下一場 */
  setMini(m) {
    const el = this.el.miniLine;
    el.hidden = !m;
    if (!m) return;
    el.classList.toggle('active', !!m.active);
    const NAME = { fish: t('🎣 釣魚大賽'), stone: t('🪨 疊石接力'), wood: t('🔥 添柴時光'), race: t('🏃 燈籠賽跑'), hunt: t('✨ 找金松果') };
    if (m.active) {
      const left = Math.max(1, Math.ceil(m.endsIn / 60));
      const RULE = {
        fish: t('🎣 釣魚大賽中！到湖邊比誰的魚最大，前三名送松果（還剩 {m} 分）', { m: left }),
        stone: t('🪨 疊石接力中！每疊一顆石頭多 1 顆松果（還剩 {m} 分）', { m: left }),
        wood: t('🔥 添柴時光！每添一根柴多 1 顆松果（還剩 {m} 分）', { m: left }),
        race: t('🏃 燈籠賽跑中！依序跑過 1→5 號燈籠，最快前三名送松果（還剩 {m} 分）', { m: left }),
        hunt: t('✨ 找金松果！森林裡還藏著 {n} 顆，找到一顆 +5 松果（還剩 {m} 分）', { n: m.left ?? 0, m: left }),
      };
      const top = m.top?.[0];
      const lead =
        m.kind === 'fish' && top
          ? ` · ${t('目前第一：{name} {size} 公分', { name: top.name, size: top.size })}`
          : m.kind === 'race' && top
            ? ` · ${t('目前最快：{name} {s} 秒', { name: top.name, s: top.time })}`
            : '';
      el.textContent = (RULE[m.kind] ?? '') + lead;
    } else {
      const mins = Math.max(1, Math.ceil(m.startsIn / 60));
      el.textContent = t('下一場 {name}：{h}:00（{m} 分鐘後）', { name: NAME[m.kind] ?? '', h: m.hour, m: mins });
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
