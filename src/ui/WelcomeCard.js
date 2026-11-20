import { t } from '../i18n/i18n.js';
import { isOpen } from '../game/dailySpecial.js';

/**
 * 進來時的歡迎卡：告訴大家這裡可以開著網頁陪自己讀書、工作、聽環境音，下面 6 格是能玩什麼（作者 11/20 改）。
 * 每次打開網頁只出現一次（同一個分頁重新整理不再跳）。
 *   onSound()  開啟營火聲
 *   onFocus()  去專注帳篷
 */
export class WelcomeCard {
  constructor({ onSound, onFocus, root = document.getElementById('ui') }) {
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="welcome" id="welcome" hidden>
        <div class="welcome-title">${t('🌲 歡迎來到迷霧森林營地')}</div>
        <p>${t('開著網頁，營火聲陪你讀書、工作、發呆')}</p>
        <div class="welcome-grid">
          ${[
            ['🎣', isOpen({ from: '2026-11-27' }) ? t('釣魚・坐船') : t('釣魚')],
            ['🍄', t('採集・種菜')],
            ['🍳', t('煮料理')],
            ['🏡', t('布置帳篷')],
            ['✨', t('養小精靈')],
            ['🎲', t('跟大家玩')],
          ]
            .map(([ic, s]) => `<div><b>${ic}</b>${s}</div>`)
            .join('')}
        </div>
        <p class="welcome-sub">${t('每晚 7～11 點，每半小時有小活動')}</p>
        <div class="welcome-btns">
          <button type="button" data-w="sound">${t('🎧 開啟營火聲')}</button>
          <button type="button" data-w="focus">${t('📚 去專注帳篷')}</button>
          <button type="button" data-w="ok" class="ghost">${t('隨便逛逛')}</button>
        </div>
      </div>`,
    );
    this.el = root.querySelector('#welcome');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      if (b.dataset.w === 'sound') onSound?.();
      if (b.dataset.w === 'focus') onFocus?.();
      this.hide();
    });
  }

  get visible() {
    return !this.el.hidden;
  }

  /** 這次打開網頁還沒看過才顯示 */
  maybeShow() {
    try {
      if (sessionStorage.getItem('cozy-welcomed')) return false;
      sessionStorage.setItem('cozy-welcomed', '1');
    } catch {
      /* 無痕模式 */
    }
    this.el.hidden = false;
    document.body.classList.add('welcoming');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), 25000);
    return true;
  }

  hide() {
    this.el.hidden = true;
    document.body.classList.remove('welcoming');
  }
}
