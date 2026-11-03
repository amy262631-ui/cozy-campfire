import { t } from '../i18n/i18n.js';

/**
 * 進來時的歡迎卡：告訴大家這裡可以開著網頁陪自己讀書、工作、聽環境音。
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
        <p>${t('這裡很適合把網頁開著：讀書、工作、發呆都好，營火劈啪聲、蟲鳴和湖水聲會陪著你。')}</p>
        <p class="welcome-sub">${t('想動就去釣魚、疊石頭；想靜就在火邊坐著。每小時 30 分還有小活動 🎣')}</p>
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
