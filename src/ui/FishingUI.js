import { FISH, stars } from '../fishing/fishData.js';
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
        <button type="button" id="fish-creel-btn">${t('🐟 我的魚簍')}</button>
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
    $('#fish-board-btn').addEventListener('click', () => this.openBoard());
    $('#fish-modal-close').addEventListener('click', () => {
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
    if (visible) this.el.alertTimer.style.transform = `scaleX(${Math.max(0, ratio)})`;
  }

  showReel(visible) {
    this.el.reel.classList.toggle('show', visible);
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
    const title = f.junk ? t('撈到了垃圾⋯') : f.rarity >= 4 ? t('🎉 大豐收！') : t('🎣 釣到了！');
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
    if (this.el.modal.classList.contains('show') && this._modal === 'board') this.openBoard();
  }

  openCreel() {
    this._modal = 'creel';
    const total = Object.values(this.creel).reduce((s, e) => s + e.count, 0);
    const found = FISH.filter((f, i) => !f.junk && this.creel[i]).length;
    const realFish = FISH.filter((f) => !f.junk).length;
    this.el.modalTitle.textContent = t('🐟 我的魚簍（圖鑑 {found}／{total}）', { found, total: realFish });
    this.el.modalBody.innerHTML =
      FISH.map((f, i) => {
        const e = this.creel[i];
        if (!e) return `<div class="creel-row unknown"><span>${t('？？？')}</span><small>${f.rarity ? stars(f.rarity) : t('雜物')}</small></div>`;
        return `<div class="creel-row"><span>${f.name}</span><small>${f.rarity ? stars(f.rarity) : t('雜物')}</small><em>×${e.count}${f.junk ? '' : t('・最大 {size} 公分', { size: e.best })}</em></div>`;
      }).join('') + `<div class="creel-total">${t('總共釣了 {n} 次（每條魚都放回湖裡了）', { n: total })}</div>`;
    this.el.modal.classList.add('show');
  }

  openBoard() {
    this._modal = 'board';
    this.el.modalTitle.textContent = t('🏆 湖畔排行（今天最大的魚）');
    const rows = this.boardOnline ? this.board : this.#localBoard();
    this.el.modalBody.innerHTML = rows.length
      ? rows
          .map(
            (r, i) =>
              `<div class="board-row"><b>${['🥇', '🥈', '🥉'][i] ?? i + 1}</b><span>${escapeHtml(r.name)}</span><small>${FISH[r.fish]?.name ?? ''}</small><em>${t('{size} 公分', { size: r.size })}</em></div>`,
          )
          .join('') + (this.boardOnline ? '' : '<div class="creel-total">' + t('單人模式：只顯示自己的紀錄') + '</div>')
      : '<div class="creel-total">' + t('今天還沒有人釣到魚，當第一個吧！') + '</div>';
    this.el.modal.classList.add('show');
  }

  #localBoard() {
    return Object.entries(this.creel)
      .filter(([i]) => !FISH[i].junk)
      .map(([i, e]) => ({ name: t('我'), fish: Number(i), size: e.best }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
