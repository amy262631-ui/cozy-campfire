import { t } from '../i18n/i18n.js';

/**
 * 畫面上的介面：營火火力表、互動提示、烤棉花糖進度條、小提示訊息（toast）。
 */
/** 手機（觸控、畫面窄或橫放很矮）：文字用短版 */
export const compactScreen = () => document.body.classList.contains('touch') && Math.min(innerWidth, innerHeight) < 600;

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

      <div class="roast" id="roast" title="${t('烤棉花糖中⋯')}">
        <span class="roast-icon">🍡</span>
        <div class="roast-track">
          <div class="roast-zone"></div>
          <div class="roast-fill" id="roast-fill"></div>
          <div class="roast-marker" id="roast-marker"></div>
        </div>
        <span class="roast-state" id="roast-label">🤍</span>
      </div>

      <div class="prompt" id="prompt"></div>

      <div class="online" id="online"><i></i><span id="online-text">${t('連線中⋯')}</span><button type="button" class="ch-chip" id="ch-chip" hidden></button><button type="button" class="me-chip" id="me-chip"></button><span class="pc-chip" id="pc-chip" hidden></span><button type="button" class="date-chip" id="date-chip" hidden>${t('🔥 約朋友')}</button><button type="button" class="invite-chip" id="invite-chip" hidden>${t('🎁 邀朋友送禮')}</button><button type="button" class="go-chip" id="go-chip">${t('🧭 去哪裡')} ▾</button><button type="button" class="home-chip fire-chip" id="fire-chip" hidden>${t('🔥 回營火')}</button><button type="button" class="home-chip" id="home-chip" hidden>${t('🏠 回家')}</button><button type="button" class="dex-chip" id="dex-chip">${t('📖 圖鑑')}</button><button type="button" class="look-chip" id="look-chip">${t('👒 造型')}</button><button type="button" class="pass-chip" id="pass-chip" hidden>${t('🎫 月票')}</button><button type="button" class="acct-chip" id="acct-chip" hidden>${t('👤 存檔')}</button><a class="shopinfo-chip" href="/shop.html" target="_blank" rel="noopener">${t('ℹ️ 商店資訊・聯絡')}</a></div>
      <div class="go-menu" id="go-menu" hidden></div>
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
      fireChip: root.querySelector('#fire-chip'),
      acctChip: root.querySelector('#acct-chip'),
      dexChip: root.querySelector('#dex-chip'),
      dateChip: root.querySelector('#date-chip'),
      lookChip: root.querySelector('#look-chip'),
      passChip: root.querySelector('#pass-chip'),
      goChip: root.querySelector('#go-chip'),
      goMenu: root.querySelector('#go-menu'),
      eventLine: root.querySelector('#event-line'),
      miniLine: root.querySelector('#mini-line'),
    };
    this.onMeClick = null;
    this.onInvite = null;
    this.onHome = null;
    this.el.homeChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.homeChip.addEventListener('pointerup', () => this.onHome?.());
    this.el.homeChip.addEventListener('click', () => this.onHome?.());
    this.onFire = null;
    this.el.fireChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    // 手機上有些瀏覽器點了不會送 click：放開手指時也觸發（重複觸發沒關係，換房中會自動忽略）
    this.el.fireChip.addEventListener('pointerup', () => this.onFire?.());
    this.el.fireChip.addEventListener('click', () => this.onFire?.());
    this.el.dexChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.dexChip.addEventListener('click', () => this.onDex?.());
    /** 🔥 約朋友今晚 9:30、👒 造型（main.js 設定） */
    this.onDate = null;
    this.onLook = null;
    this.onPass = null;
    for (const [el, fn] of [[this.el.dateChip, () => this.onDate?.()], [this.el.lookChip, () => this.onLook?.()], [this.el.passChip, () => this.onPass?.()]]) {
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('click', fn);
    }
    // 🧭 去哪裡：回營火、回家、湖邊、迷霧森林⋯ 全部收在一個下拉選單
    this.onGo = null;
    this.goState = { room: 'forest_main', home: false };
    this.el.goChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.goMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.goChip.addEventListener('click', () => (this.el.goMenu.hidden ? this.#openGo() : this.closeGo()));
    this.el.goMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (!b || b.disabled) return;
      this.closeGo();
      this.onGo?.(b.dataset.go);
    });
    window.addEventListener('pointerdown', () => this.closeGo());
    window.addEventListener('keydown', (e) => e.code === 'Escape' && this.closeGo());
    this.el.acctChip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.acctChip.addEventListener('click', () => this.onMeClick?.({ focusAccount: true }));
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
    this._meName = name;
    this.el.meChip.textContent = `${this.passBadge ? `${this.passBadge} ` : ''}${name} ✏️`;
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
  /** 還沒建立帳號、但已經有東西值得保存時，顯示「👤 存檔」提醒 */
  setAccountVisible(v) {
    this.el.acctChip.hidden = !v;
  }

  /** 去哪裡選單：現在在哪、有沒有自己的帳篷 */
  setGoState(st) {
    Object.assign(this.goState, st);
    if (!this.el.goMenu.hidden) this.#openGo();
  }

  #openGo() {
    const { room, home } = this.goState;
    const PLACES = [
      ['forest_main', t('🔥 中央營火')],
      ['lake_dock', t('🎣 湖畔碼頭')],
      ['mist_forest', t('🍄 迷霧森林')],
      ['campground', t('🏕️ 帳篷營地')],
      ['home', t('🏠 我的帳篷')],
      ['treehouse_music', t('🎵 森林樹屋')],
      ['tent_social', t('☕ 交流帳篷')],
      ['tent_focus', t('⛺ 專注帳篷')],
    ];
    this.el.goMenu.innerHTML = PLACES.map(([id, label]) => {
      const here = id === room;
      const off = id === 'home' && !home;
      // 👣 各區現在幾個人（伺服器的 areas；我的帳篷不顯示）
      const n = id !== 'home' && this.areas ? this.areas[id] ?? 0 : null;
      const cnt = n == null ? '' : `<span class="go-n${n ? '' : ' zero'}">${t('{n} 人', { n })}</span>`;
      return `<button type="button" data-go="${id}" ${here ? 'disabled' : ''} class="${here ? 'here' : ''}${off ? ' off' : ''}">${cnt}${label}${here ? `<small>${t('目前在這裡')}</small>` : off ? `<small>${t('先到小舖買帳篷')}</small>` : ''}</button>`;
    }).join('');
    const r = this.el.goChip.getBoundingClientRect();
    const w = Math.min(300, innerWidth - 16);
    this.el.goMenu.style.width = `${w}px`;
    this.el.goMenu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    this.el.goMenu.style.top = `${r.bottom + 6}px`;
    this.el.goMenu.hidden = false;
    this.el.goChip.classList.add('on');
  }

  /** 各區人數（選單開著的話馬上更新） */
  setAreas(a) {
    this.areas = a;
    if (!this.el.goMenu.hidden) this.#openGo();
  }

  closeGo() {
    if (this.el.goMenu.hidden) return;
    this.el.goMenu.hidden = true;
    this.el.goChip.classList.remove('on');
  }

  /** 「🔥 回營火」：不在營火區時才出現 */
  setFireVisible(v) {
    this.el.fireChip.hidden = !v;
  }

  setHomeVisible(v) {
    this.el.homeChip.hidden = !v;
  }

  /** 連上伺服器才顯示「邀朋友」 */
  setInviteVisible(v) {
    this.el.invite.hidden = true; // 「邀朋友送禮」已經併進「🔥 約朋友」
    this.el.dateChip.hidden = !v;
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
    // 手機：短短一行；營火時間快到了（1 小時內）或進行中才顯示
    if (compactScreen()) {
      if (ev.active) el.textContent = t('🌠 營火時間・剩 {m} 分', { m: Math.max(1, Math.ceil(ev.endsIn / 60)) });
      else if (ev.startsIn < 3600) el.textContent = t('🌙 營火時間 {m} 分後開始', { m: Math.max(1, Math.ceil(ev.startsIn / 60)) });
      else el.hidden = true;
      return;
    }
    if (ev.active) {
      el.textContent = t('🌠 營火時間・流星雨中！松果加倍・限定流星吊飾（還剩 {m} 分）', { m: Math.max(1, Math.ceil(ev.endsIn / 60)) });
    } else if (ev.startsIn < 3 * 3600) {
      const h = Math.floor(ev.startsIn / 3600);
      const m = Math.ceil((ev.startsIn % 3600) / 60);
      const when = ev.slot === 'am' ? t('早上 9:30') : t('晚上 9:30');
      el.textContent = h
        ? t('🌙 {when} 營火時間・還有 {h} 小時 {m} 分', { when, h, m })
        : t('🌙 {when} 營火時間・還有 {m} 分鐘', { when, m: Math.max(1, m) });
    } else {
      el.textContent = t('🌙 每天早上、晚上 9:30 營火時間：流星雨、松果加倍');
    }
  }

  /** 晚上的小活動（19:00～23:00 每半小時）：進行中顯示倒數（釣魚大賽加上目前第一名），沒有的話顯示下一場 */
  setMini(m) {
    const el = this.el.miniLine;
    el.hidden = !m;
    if (!m) return;
    el.classList.toggle('active', !!m.active);
    const NAME = { fish: t('🎣 釣魚大賽'), stone: t('🪨 疊石接力'), wood: t('🔥 添柴時光'), race: t('🏃 燈籠賽跑'), hunt: t('✨ 找金松果') };
    if (compactScreen()) {
      // 手機：短短一行
      if (m.active) {
        const top = m.top?.[0];
        const lead = m.kind === 'fish' && top ? ` · 🥇${top.name} ${top.size}cm` : m.kind === 'race' && top ? ` · 🥇${top.name} ${top.time}s` : m.kind === 'hunt' ? ` · ${t('還有 {n} 顆', { n: m.left ?? 0 })}` : '';
        el.textContent = t('{name}中・剩 {m} 分', { name: NAME[m.kind] ?? '', m: Math.max(1, Math.ceil(m.endsIn / 60)) }) + lead;
      } else if (m.startsIn > 2 * 3600) {
        el.hidden = true; // 白天：離晚上的活動還很久，手機不佔位置
      } else {
        el.textContent = t('下一場 {time} {name}', { name: NAME[m.kind] ?? '', time: `${m.hour}:${String(m.minute ?? 0).padStart(2, '0')}` });
      }
      return;
    }
    if (m.active) {
      const left = Math.max(1, Math.ceil(m.endsIn / 60));
      const RULE = {
        fish: t('🎣 釣魚大賽中！到營火河畔或湖邊比誰的魚最大，前三名送松果（還剩 {m} 分）', { m: left }),
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
    } else if (m.startsIn > 2 * 3600) {
      el.textContent = t('🌙 每晚 7 點～11 點，每半小時一場小活動（早晚 9:30 營火時間有魚王）');
    } else {
      const mins = Math.max(1, Math.ceil(m.startsIn / 60));
      el.textContent = t('下一場 {name}：{time}（{m} 分鐘後）', { name: NAME[m.kind] ?? '', time: `${m.hour}:${String(m.minute ?? 0).padStart(2, '0')}`, m: mins });
    }
  }

  /** 「今天有 N 位旅人來過 · 疊了 N 顆石頭」：就算現在只有你一個人，也知道有人來過 */
  setToday({ visitors = 0, stones = 0, allVisitors = 0, allStones = 0 } = {}) {
    const all = Math.max(allVisitors, visitors);
    const st = Math.max(allStones, stones);
    this.el.today.hidden = !all;
    const fmt = (n) => n.toLocaleString();
    this.el.today.textContent = st
      ? t('累計 {n} 位旅人來過 · 疊了 {s} 顆石頭（今天 {d} 位）', { n: fmt(all), s: fmt(st), d: visitors })
      : t('累計 {n} 位旅人來過（今天 {d} 位）', { n: fmt(all), d: visitors });
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
    if (visible) this.#placeRoast();
  }

  /** 火候條放在互動提示正上方（電腦、平板、手機的提示位置都不一樣，直接量） */
  #placeRoast() {
    const pr = this.el.prompt?.getBoundingClientRect();
    if (pr && pr.height > 0) this.el.roast.style.bottom = `${Math.round(innerHeight - pr.top + 8)}px`;
    else this.el.roast.style.bottom = '';
  }

  setRoast(doneness) {
    const p = Math.min(doneness, 1.1) / 1.1; // 條長 = 0 ~ 1.1（多一點空間顯示焦黑）
    this.el.roastFill.style.width = `${p * 100}%`;
    this.el.roastMarker.style.left = `${p * 100}%`;
    // 細細一條就好：右邊的小圖示代表火候（白白的 → 金黃 → 有點焦 → 焦黑）
    const label = doneness < 0.35 ? '🤍' : doneness < 0.75 ? '✨' : doneness < 1.0 ? '⚠️' : '🔥';
    if (label !== this._roastLabel) {
      this._roastLabel = label;
      this.el.roastLabel.textContent = label;
      this.el.roast.classList.toggle('golden', label === '✨');
      this.#placeRoast();
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
