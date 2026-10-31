import { t } from '../i18n/i18n.js';

/**
 * 番茄鐘：25 分鐘專注 → 5 分鐘休息，循環。
 * 只在專注帳篷裡顯示；離開帳篷時計時會繼續，時間到時一樣會提醒。
 */
const FOCUS = 25 * 60;
const BREAK = 5 * 60;

export class PomodoroPanel {
  constructor({ audio, hud, root = document.getElementById('ui') }) {
    this.audio = audio;
    this.hud = hud;
    this.mode = 'focus';
    this.remaining = FOCUS;
    this.running = false;
    this.rounds = 0;

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="pomodoro" id="pomodoro">
        <div class="pomo-mode" id="pomo-mode">${t('專注時間')}</div>
        <div class="pomo-time" id="pomo-time">25:00</div>
        <div class="pomo-bar"><i id="pomo-fill"></i></div>
        <div class="pomo-buttons">
          <button type="button" id="pomo-start">${t('開始')}</button>
          <button type="button" id="pomo-reset">${t('重設')}</button>
        </div>
        <div class="pomo-rounds" id="pomo-rounds"></div>
      </div>
      `,
    );
    this.el = root.querySelector('#pomodoro');
    this.$ = (id) => root.querySelector(id);
    this.$('#pomo-start').addEventListener('click', () => this.toggle());
    this.$('#pomo-reset').addEventListener('click', () => this.reset());
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.render();
  }

  show(visible) {
    this.el.classList.toggle('show', visible);
  }

  toggle() {
    this.audio.start();
    this.running = !this.running;
    this.render();
  }

  reset() {
    this.running = false;
    this.mode = 'focus';
    this.remaining = FOCUS;
    this.render();
  }

  update(dt) {
    if (!this.running) return;
    const before = Math.ceil(this.remaining);
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.audio.chime();
      if (this.mode === 'focus') {
        this.rounds++;
        this.mode = 'break';
        this.remaining = BREAK;
        this.hud.toast(t('🍅 完成第 {n} 個番茄鐘！休息 5 分鐘吧', { n: this.rounds }), 4500);
      } else {
        this.mode = 'focus';
        this.remaining = FOCUS;
        this.hud.toast(t('☕ 休息結束，再專心 25 分鐘'), 4500);
      }
      this.render();
    } else if (Math.ceil(this.remaining) !== before) {
      this.render();
    }
  }

  render() {
    const sec = Math.max(0, Math.ceil(this.remaining));
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.$('#pomo-time').textContent = `${mm}:${ss}`;
    this.$('#pomo-mode').textContent = this.mode === 'focus' ? t('專注時間') : t('休息一下');
    this.$('#pomo-start').textContent = this.running ? t('暫停') : this.remaining < (this.mode === 'focus' ? FOCUS : BREAK) ? t('繼續') : t('開始');
    const total = this.mode === 'focus' ? FOCUS : BREAK;
    this.$('#pomo-fill').style.width = `${(1 - this.remaining / total) * 100}%`;
    this.$('#pomo-rounds').textContent = this.rounds ? '🍅'.repeat(Math.min(this.rounds, 8)) : '';
    this.el.classList.toggle('break', this.mode === 'break');
  }
}
