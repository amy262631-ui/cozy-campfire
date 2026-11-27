import { FISH, stars, dexGain, DEX_BONUS, DEX_TOTAL, SHINY_TOTAL, SHINY_DEX_GAIN, SHINY_BONUS, fishMonth, isLimitedFish } from '../fishing/fishData.js';
import { monthOn } from '../game/season.js';
import { shinyLook } from '../fishing/fishModel.js';
import { t } from '../i18n/i18n.js';
import { isOpen } from '../game/dailySpecial.js';
import { addCloseX } from './CloseX.js';

const CREEL_KEY = 'cozy-campfire-creel';

function loadCreel() {
  try {
    return JSON.parse(localStorage.getItem(CREEL_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * 釣魚相關畫面：
 * - 咬鉤警示（大大的「快拉竿！」，手機可直接點）
 * - 連點拉竿的進度條
 * - 釣到魚的卡片
 * - 湖邊左上角的「魚簍」「排行」按鈕與面板
 */
export class FishingUI {
  constructor({ onPress, root = document.getElementById('ui') }) {
    this.onPress = onPress;
    this.creel = loadCreel(); // { [魚種索引]: { count, best } }
    this.board = []; // 伺服器的湖畔排行
    this.boardOnline = false;

    root.insertAdjacentHTML(
      'beforeend',
      `
      <button type="button" class="fish-alert" id="fish-alert">
        <span class="fish-alert-big">${t('🎣 魚上鉤了！')}</span>
        <span class="fish-alert-small only-desktop">${t('快拉竿！按')} <kbd>F</kbd> ${t('或點這裡')}</span>
        <span class="fish-alert-small only-touch">${t('快點這裡拉竿！')}</span>
        <i class="fish-alert-timer" id="fish-alert-timer"></i>
      </button>

      <div class="fish-reel" id="fish-reel">
        <div class="fish-reel-title" id="fish-reel-title">${t('連點拉竿！')}</div>
        <div class="fish-reel-track"><i id="fish-reel-fill"></i></div>
        <div class="fish-reel-time"><i id="fish-reel-time"></i></div>
        <button type="button" class="fish-reel-btn" id="fish-reel-btn">${t('💪 拉！')}</button>
        <div class="fish-reel-hint">${t('連續點按鈕，或一直按')} <kbd>F</kbd></div>
      </div>

      <div class="fish-card" id="fish-card"></div>

      <div class="fish-tools" id="fish-tools">
        <button type="button" id="fish-creel-btn">${t('📖 魚類圖鑑')}</button>
        <button type="button" id="fish-board-btn">${t('🏆 湖畔排行')}</button>
      </div>

      <div class="fish-modal" id="fish-modal">
        <div class="fish-modal-card">
          <div class="fish-modal-title" id="fish-modal-title"></div>
          <div class="fish-modal-body" id="fish-modal-body"></div>
          <button type="button" class="fish-modal-close" id="fish-modal-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    const $ = (id) => root.querySelector(id);
    this.el = {
      alert: $('#fish-alert'),
      alertTimer: $('#fish-alert-timer'),
      reel: $('#fish-reel'),
      reelTitle: $('#fish-reel-title'),
      reelFill: $('#fish-reel-fill'),
      reelTime: $('#fish-reel-time'),
      card: $('#fish-card'),
      tools: $('#fish-tools'),
      modal: $('#fish-modal'),
      modalTitle: $('#fish-modal-title'),
      modalBody: $('#fish-modal-body'),
    };

    // 手機點按：用 pointerdown 反應最快
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 🤝 幫別人拉河神大鯉魚時，同一顆「💪 拉！」算幫忙
      if (this.el.reel.classList.contains('coop')) this.onCoopPress?.();
      else this.onPress?.();
    };
    // 「！」只會是自己的魚咬鉤 → 一定是自己收竿（作者 11/24：幫別人拉的時候自己的魚咬鉤，點了變成幫別人拉）
    this.el.alert.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onPress?.();
    });
    $('#fish-reel-btn').addEventListener('pointerdown', press);
    for (const el of [this.el.reel, this.el.tools, this.el.modal]) el.addEventListener('pointerdown', (e) => e.stopPropagation());

    $('#fish-creel-btn').addEventListener('click', () => this.openCreel());
    $('#fish-board-btn').addEventListener('click', () => this.openBoard('all'));
    $('#fish-modal-close').addEventListener('click', () => {
      this.el.modal.classList.remove('show');
      document.activeElement?.blur?.();
    });
    addCloseX($('#fish-modal-close'), '.fish-modal-card'); // 右上角 ✕
    // ESC 關閉（圖鑑、排行、標本櫃、菜園、料理⋯ 都是這個視窗）；正在打字時不搶
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !this.el.modal.classList.contains('show')) return;
      if (e.target?.matches?.('input, textarea')) return;
      this.el.modal.classList.remove('show');
      document.activeElement?.blur?.();
    });
  }

  /** 只在湖邊顯示魚簍／排行按鈕 */
  showTools(visible) {
    this.el.tools.classList.toggle('show', visible);
    if (!visible) this.el.modal.classList.remove('show');
  }

  showAlert(visible, ratio = 1) {
    this.el.alert.classList.toggle('show', visible);
    this.#busy();
    if (visible) this.el.alertTimer.style.transform = `scaleX(${Math.max(0, ratio)})`;
  }

  showReel(visible) {
    this.el.reel.classList.toggle('show', visible);
    this.#busy();
  }

  /** 魚上鉤、拉竿中：body 加上 fish-busy（手機版把擋路的東西先收起來） */
  #busy() {
    document.body.classList.toggle('fish-busy', this.el.alert.classList.contains('show') || this.el.reel.classList.contains('show'));
  }

  setReel(progress, timeRatio, pulled) {
    this.el.reelFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    this.el.reelTime.style.transform = `scaleX(${Math.max(0, timeRatio)})`;
    this.el.reelTitle.textContent = progress > 0.75 ? t('快上來了！再加油！') : pulled ? t('魚在掙扎⋯ 繼續拉！') : t('連點拉竿！');
  }

  /**
   * 釣到後的卡片，同時記錄到魚簍
   * @returns {{ newRecord: boolean, firstTime: boolean }}
   */
  record(index, size) {
    const entry = (this.creel[index] ??= { count: 0, best: 0 });
    const firstTime = entry.count === 0;
    const newRecord = size > entry.best;
    entry.count++;
    entry.best = Math.max(entry.best, size);
    try {
      localStorage.setItem(CREEL_KEY, JSON.stringify(this.creel));
    } catch {
      /* 存不了就算了 */
    }
    return { newRecord, firstTime };
  }

  showCard(index, size, { newRecord, firstTime, rank, shiny } = {}) {
    const f = FISH[index];
    const badges = [];
    if (shiny) badges.push('<b class="badge shiny">' + t('✨ 異色') + '</b>');
    if (firstTime && !f.junk) badges.push('<b class="badge new">' + t('第一次釣到') + '</b>');
    else if (newRecord && !f.junk) badges.push('<b class="badge record">' + t('個人新紀錄') + '</b>');
    if (rank) badges.push(`<b class="badge rank">${t('釣魚排行第 {rank} 名', { rank })}</b>`);
    const title = f.junk ? t('撈到了垃圾⋯') : shiny ? t('✨ 哇！異色的！') : f.legend ? t('🐉 傳說之魚現身！') : f.rarity >= 4 ? t('🎉 大豐收！') : t('🎣 釣到了！');
    this.el.card.className = `fish-card show rarity-${f.rarity}${shiny ? ' shiny' : ''}`;
    this.el.card.innerHTML = `
      <div class="fish-card-row">
        <span class="fish-card-title">${title}</span>
        <span class="fish-card-name">${f.name}</span>
        ${f.rarity ? `<span class="fish-card-stars">${stars(f.rarity)}</span>` : ''}
      </div>
      <div class="fish-card-size">${f.junk ? t('順手帶走，讓湖更乾淨 ♻️') : t('{size} 公分', { size })}${f.note ? `<small>・${f.note}</small>` : ''}</div>
      ${badges.length ? `<div class="fish-card-badges">${badges.join('')}</div>` : ''}
      <div class="fish-card-coin" hidden></div>
    `;
    // 作者 11/22：「釣到魚撿到 1 顆松果」跟魚卡片重疊 → 寫進卡片裡
    if (this._coin && performance.now() - this._coin.at < 6000) this.#showCoin(this._coin.n);
    this._coin = null;
    clearTimeout(this._cardTimer);
    this._cardTimer = setTimeout(() => this.el.card.classList.remove('show'), 4200);
  }

  #showCoin(n) {
    const el = this.el.card.querySelector('.fish-card-coin');
    if (!el) return;
    el.hidden = false;
    el.textContent = t('🌰 還撿到 {n} 顆松果', { n });
  }
  /** 釣到魚順便撿到的松果：卡片在顯示就寫進卡片，還沒出來就等卡片出來再寫；回傳 true＝不用再跳提示 */
  addCoin(n, fishingNow) {
    if (this.el.card.classList.contains('show')) return this.#showCoin(n), true;
    if (!fishingNow) return false;
    this._coin = { n, at: performance.now() };
    return true;
  }

  setBoard(board, online) {
    this.board = board ?? [];
    this.boardOnline = online;
    if (this.el.modal.classList.contains('show') && this._modal === 'board') this.openBoard(this._btab, false);
  }

  /** 伺服器的圖鑑紀錄（換手機登入也會回來）合併進魚簍：{ 魚種: 最大公分 } */
  mergeDex(dex) {
    let changed = false;
    for (const [i, best] of Object.entries(dex ?? {})) {
      const e = (this.creel[i] ??= { count: 0, best: 0 });
      if (!e.count) e.count = 1;
      if (best > e.best) e.best = best;
      changed = true;
    }
    if (changed) {
      try {
        localStorage.setItem(CREEL_KEY, JSON.stringify(this.creel));
      } catch {
        /* 存不了就算了 */
      }
      if (this.el.modal.classList.contains('show') && this._modal === 'creel') this.openCreel(this._tab);
    }
  }

  get dexCount() {
    return FISH.filter((f, i) => !isLimitedFish(f) && this.creel[i]?.count).length;
  }

  /** ✨ 異色圖鑑：{ 魚種: 最大公分 }（伺服器給） */
  shiny = {};
  setShiny(map) {
    this.shiny = { ...(map ?? {}) };
    if (this.el.modal.classList.contains('show') && this._modal === 'creel' && this._tab === 'fish') this.openCreel('fish');
  }

  /** 📖 魚類圖鑑：釣過的顯示名字與最大紀錄；沒釣過的是剪影，附上出現提示 */
  /**
   * 圖鑑的其他分頁（main.js 加進來）：{ id, label, title(), render() → html, bind?(body) }
   * @type {Array<{ id: string, label: string, title: () => string, render: () => string, bind?: (body: HTMLElement) => void }>}
   */
  extraTabs = [];

  #tabsHtml(cur) {
    const tabs = [{ id: 'fish', label: t('🐟 魚') }, ...this.extraTabs];
    return `<div class="dex-tabs">${tabs.map((x) => `<button type="button" data-tab="${x.id}" class="${x.id === cur ? 'on' : ''}">${x.label}</button>`).join('')}</div>`;
  }

  #bindTabs() {
    for (const b of this.el.modalBody.querySelectorAll('.dex-tabs [data-tab]')) {
      b.addEventListener('click', () => this.openCreel(b.dataset.tab));
    }
  }

  /** 打開圖鑑；tab：fish（預設）或其他分頁的 id */
  openCreel(tab = 'fish', sub0 = null) {
    const extra = this.extraTabs.find((x) => x.id === tab);
    if (extra) {
      this._modal = 'creel';
      this._tab = tab;
      this.el.modalTitle.textContent = extra.title();
      this.el.modalBody.innerHTML = this.#tabsHtml(tab) + extra.render();
      this.#bindTabs();
      extra.bind?.(this.el.modalBody);
      this.el.modal.classList.add('show');
      return;
    }
    this._tab = 'fish';
    this._modal = 'creel';
    const sub = (this._fsub = sub0 ?? this._fsub ?? 'all'); // all＝一般、shiny＝✨ 異色、month＝🗓️ 每月限定
    const total = Object.values(this.creel).reduce((s, e) => s + e.count, 0);
    const found = this.dexCount;
    const hex = (c) => `#${(c ?? 0x888888).toString(16).padStart(6, '0')}`;
    const rank = (f) => (f.legend ? t('🐉 傳說') + ' ' + stars(f.rarity) : f.rarity ? stars(f.rarity) : t('雜物'));
    const look = (f) => {
      const glow = f.glow ? `box-shadow:0 0 10px ${hex(f.glow)};` : '';
      const patch = f.patch ? `background:linear-gradient(135deg, ${hex(f.color)} 55%, ${hex(f.patch)} 55%);` : `background:${hex(f.color)};`;
      return patch + glow;
    };
    const unknown = (f, em) => `<div class="dex-card unknown${f.legend ? ' legend' : ''}"><i class="dex-fish" style="background:#2a3140"></i><b>${t('？？？')}</b><small>${rank(f)}</small><em>${em}</em></div>`;
    const subs = `<div class="dex-sub">${[
      ['all', t('🐟 一般')],
      ['shiny', t('✨ 異色')],
      ['month', t('🗓️ 限定')],
    ]
      .map(([id, label]) => `<button type="button" data-fsub="${id}" class="${id === sub ? 'on' : ''}">${label}</button>`)
      .join('')}</div>`;
    let body;
    if (sub === 'shiny') {
      const sFound = Object.keys(this.shiny).filter((k) => FISH[k] && !isLimitedFish(FISH[k])).length;
      this.el.modalTitle.textContent = t('✨ 異色魚圖鑑 {found}／{total}', { found: sFound, total: SHINY_TOTAL });
      const cards = FISH.map((f, i) => [f, i])
        .filter(([f, i]) => !f.junk && (!(f.boat || f.fire || f.coop) || isOpen(f) || this.shiny[i]))
        .map(([f, i]) => {
          const best = this.shiny[i];
          if (!best) return unknown(f, f.month ? t('{m} 月限定', { m: f.month }) : f.boat ? t('⛵ 船釣限定') : f.fire || f.coop ? f.note : t('第一次釣到 +{n} 🌰', { n: SHINY_DEX_GAIN }));
          return `<div class="dex-card shiny rarity-${f.rarity}${f.legend ? ' legend' : ''}"><i class="dex-fish" style="${look({ ...f, ...shinyLook(f) })}"></i><b>${f.name}</b><small>${rank(f)}</small><em>${t('最大 {size} 公分', { size: best })}</em></div>`;
        })
        .join('');
      body = `<div class="dex-note">${t('每條魚有 1% 機會是異色（顏色不一樣、身邊有亮片）。第一次釣到某種異色 +{n} 🌰；全部 {t} 種收集完再送 {b} 顆 🌰（每月限定的不算）', { n: SHINY_DEX_GAIN, t: SHINY_TOTAL, b: SHINY_BONUS })}</div><div class="dex-grid">${cards}</div>`;
    } else if (sub === 'month') {
      this.el.modalTitle.textContent = t('🗓️ 每月限定的魚');
      const now = fishMonth();
      const cards = FISH.map((f, i) => [f, i])
        .filter(([f, i]) => f.month || ((f.boat || f.fire || f.coop) && (isOpen(f) || this.creel[i]?.count)))
        .map(([f, i]) => {
          const e = this.creel[i];
          const tag = f.boat || f.fire || f.coop ? (f.note ?? t('⛵ 船釣限定')) : monthOn(f.month) ? t('🟢 這個月釣得到') : t('{m} 月限定', { m: f.month });
          if (!e?.count) return unknown(f, tag);
          return `<div class="dex-card rarity-${f.rarity}"><i class="dex-fish" style="${look(f)}"></i><b>${f.name}</b><small>${rank(f)}</small><em>${t('最大 {size} 公分・×{n}', { size: e.best, n: e.count })}<br>${tag}</em></div>`;
        })
        .join('');
      body = `<div class="dex-note">${t('那個月才釣得到，隔年同一個月會再出現。不算進全收集。')}${FISH.some((f) => f.boat && isOpen(f)) ? `<br>${t('⛵ 船釣限定：在湖畔碼頭租船，坐在船上才釣得到。')}<br>${t('🔥 營火河畔限定：營火越旺，河裡的稀有魚越多。')}` : ''}</div><div class="dex-grid">${cards}</div>`;
    } else {
      this.el.modalTitle.textContent = t('📖 魚類圖鑑 {found}／{total}', { found, total: DEX_TOTAL });
      const cards = FISH.filter((f) => !isLimitedFish(f))
        .map((f) => {
          const i = FISH.indexOf(f);
          const e = this.creel[i];
          const gain = dexGain(f);
          if (!e?.count) return unknown(f, f.note && (f.where || f.when) ? f.note : t('第一次釣到 +{n} 🌰', { n: gain }));
          return `<div class="dex-card rarity-${f.rarity}${f.legend ? ' legend' : ''}"><i class="dex-fish" style="${look(f)}"></i><b>${f.name}</b><small>${rank(f)}</small><em>${f.junk ? `×${e.count}` : t('最大 {size} 公分・×{n}', { size: e.best, n: e.count })}</em></div>`;
        })
        .join('');
      body = `<div class="dex-note">${t('第一次釣到新的魚會收進圖鑑，送松果（★ 越多送越多）；全部 {n} 種收集完再送 {b} 顆 🌰', { n: DEX_TOTAL, b: DEX_BONUS })}</div><div class="dex-grid">${cards}</div>`;
    }
    this.el.modalBody.innerHTML = `
      ${this.#tabsHtml('fish')}
      ${subs}
      ${body}
      <div class="creel-total">${t('總共釣了 {n} 次（11/20 起釣到的魚會放進保冷箱，可以拿去「🍳 自由料理鍋」煮）', { n: total })}</div>`;
    this.#bindTabs();
    for (const b of this.el.modalBody.querySelectorAll('[data-fsub]')) b.addEventListener('click', () => this.openCreel('fish', b.dataset.fsub));
    this.el.modal.classList.add('show');
  }

  /** 外面接上：打開排行時跟伺服器要最新的大家排行（main.js 設定） */
  onBoardOpen = null;

  /** 🏆 湖畔排行：tab = all（大家，今天）或 me（自己的最大紀錄） */
  openBoard(tab = this._btab ?? 'all', fetch = true) {
    this._modal = 'board';
    this._btab = tab;
    if (fetch && tab === 'all') this.onBoardOpen?.();
    this.el.modalTitle.textContent = tab === 'all' ? t('🏆 釣魚排行（歷史最大的魚）') : t('🏆 我的最大紀錄');
    const tabs = `<div class="dex-tabs">${[
      ['all', t('🌍 大家')],
      ['me', t('🙋 自己')],
    ]
      .map(([id, label]) => `<button type="button" data-btab="${id}" class="${id === tab ? 'on' : ''}">${label}</button>`)
      .join('')}</div>`;
    const rows = tab === 'all' ? this.board : this.#localBoard();
    const list = rows.length
      ? rows
          .map(
            (r, i) =>
              `<div class="board-row"><b>${['🥇', '🥈', '🥉'][i] ?? i + 1}</b><span>${escapeHtml(r.name)}</span><small>${FISH[r.fish]?.name ?? ''}</small><em>${t('{size} 公分', { size: r.size })}</em></div>`,
          )
          .join('')
      : '<div class="creel-total">' + (tab === 'all' ? t('還沒有人釣到魚，當第一個吧！') : t('還沒有釣到魚，去湖邊試試看吧！')) + '</div>';
    const note =
      tab === 'all'
        ? this.boardOnline
          ? t('歷史紀錄・前 {n} 名', { n: 15 })
          : t('沒有連線，看不到大家的排行')
        : t('每種魚只算你釣過最大的一條');
    this.el.modalBody.innerHTML = tabs + list + `<div class="creel-total">${note}</div>`;
    for (const b of this.el.modalBody.querySelectorAll('[data-btab]')) b.addEventListener('click', () => this.openBoard(b.dataset.btab));
    this.el.modal.classList.add('show');
  }

  #localBoard() {
    return Object.entries(this.creel)
      .filter(([i]) => !FISH[i].junk)
      .map(([i, e]) => ({ name: t('我'), fish: Number(i), size: e.best }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 15);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
