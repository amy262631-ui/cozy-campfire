import { FISH, stars, dexGain, DEX_BONUS } from '../fishing/fishData.js';
import { t } from '../i18n/i18n.js';

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
      this.onPress?.();
    };
    this.el.alert.addEventListener('pointerdown', press);
    $('#fish-reel-btn').addEventListener('pointerdown', press);
    for (const el of [this.el.reel, this.el.tools, this.el.modal]) el.addEventListener('pointerdown', (e) => e.stopPropagation());

    $('#fish-creel-btn').addEventListener('click', () => this.openCreel());
    $('#fish-board-btn').addEventListener('click', () => this.openBoard('all'));
    $('#fish-modal-close').addEventListener('click', () => {
      this.el.modal.classList.remove('show');
      document.activeElement?.blur?.();
    });
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

  showCard(index, size, { newRecord, firstTime, rank } = {}) {
    const f = FISH[index];
    const badges = [];
    if (firstTime && !f.junk) badges.push('<b class="badge new">' + t('第一次釣到') + '</b>');
    else if (newRecord && !f.junk) badges.push('<b class="badge record">' + t('個人新紀錄') + '</b>');
    if (rank) badges.push(`<b class="badge rank">${t('湖畔排行第 {rank} 名', { rank })}</b>`);
    const title = f.junk ? t('撈到了垃圾⋯') : f.legend ? t('🐉 傳說之魚現身！') : f.rarity >= 4 ? t('🎉 大豐收！') : t('🎣 釣到了！');
    this.el.card.className = `fish-card show rarity-${f.rarity}`;
    this.el.card.innerHTML = `
      <div class="fish-card-row">
        <span class="fish-card-title">${title}</span>
        <span class="fish-card-name">${f.name}</span>
        ${f.rarity ? `<span class="fish-card-stars">${stars(f.rarity)}</span>` : ''}
      </div>
      <div class="fish-card-size">${f.junk ? t('順手帶走，讓湖更乾淨 ♻️') : t('{size} 公分', { size })}${f.note ? `<small>・${f.note}</small>` : ''}</div>
      ${badges.length ? `<div class="fish-card-badges">${badges.join('')}</div>` : ''}
    `;
    clearTimeout(this._cardTimer);
    this._cardTimer = setTimeout(() => this.el.card.classList.remove('show'), 4200);
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
    return FISH.filter((f, i) => this.creel[i]?.count).length;
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
  openCreel(tab = 'fish') {
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
    const total = Object.values(this.creel).reduce((s, e) => s + e.count, 0);
    const found = this.dexCount;
    this.el.modalTitle.textContent = t('📖 魚類圖鑑 {found}／{total}', { found, total: FISH.length });
    const hex = (c) => `#${(c ?? 0x888888).toString(16).padStart(6, '0')}`;
    const rank = (f) => (f.legend ? t('🐉 傳說') + ' ' + stars(f.rarity) : f.rarity ? stars(f.rarity) : t('雜物'));
    const cards = FISH.map((f, i) => {
      const e = this.creel[i];
      const gain = dexGain(f);
      if (!e?.count) {
        return `<div class="dex-card unknown${f.legend ? ' legend' : ''}"><i class="dex-fish" style="background:#2a3140"></i><b>${t('？？？')}</b><small>${rank(f)}</small><em>${f.note && (f.where || f.when) ? f.note : t('第一次釣到 +{n} 🌰', { n: gain })}</em></div>`;
      }
      const glow = f.glow ? `box-shadow:0 0 10px ${hex(f.glow)};` : '';
      const patch = f.patch ? `background:linear-gradient(135deg, ${hex(f.color)} 55%, ${hex(f.patch)} 55%);` : `background:${hex(f.color)};`;
      return `<div class="dex-card rarity-${f.rarity}${f.legend ? ' legend' : ''}"><i class="dex-fish" style="${patch}${glow}"></i><b>${f.name}</b><small>${rank(f)}</small><em>${f.junk ? `×${e.count}` : t('最大 {size} 公分・×{n}', { size: e.best, n: e.count })}</em></div>`;
    }).join('');
    this.el.modalBody.innerHTML = `
      ${this.#tabsHtml('fish')}
      <div class="dex-note">${t('第一次釣到新的魚會收進圖鑑，送松果（★ 越多送越多）；全部 {n} 種收集完再送 {b} 顆 🌰', { n: FISH.length, b: DEX_BONUS })}</div>
      <div class="dex-grid">${cards}</div>
      <div class="creel-total">${t('總共釣了 {n} 次（每條魚都放回湖裡了）', { n: total })}</div>`;
    this.#bindTabs();
    this.el.modal.classList.add('show');
  }

  /** 外面接上：打開排行時跟伺服器要最新的大家排行（main.js 設定） */
  onBoardOpen = null;

  /** 🏆 湖畔排行：tab = all（大家，今天）或 me（自己的最大紀錄） */
  openBoard(tab = this._btab ?? 'all', fetch = true) {
    this._modal = 'board';
    this._btab = tab;
    if (fetch && tab === 'all') this.onBoardOpen?.();
    this.el.modalTitle.textContent = tab === 'all' ? t('🏆 湖畔排行（歷史最大的魚）') : t('🏆 我的最大紀錄');
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
