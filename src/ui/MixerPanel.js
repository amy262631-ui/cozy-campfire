import { CHANNELS } from '../audio/AudioEngine.js';
import { t } from '../i18n/i18n.js';

/**
 * 右上角的抽屜式混音面板：四條音軌各自調整，一鍵靜音。
 */
export class MixerPanel {
  constructor(audio, root = document.getElementById('ui')) {
    this.audio = audio;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="mixer" id="mixer">
        <button class="mixer-toggle" id="mixer-toggle" type="button" title="${t('聲音設定')}">
          <span id="mixer-icon">🎧</span><span>${t('聲音')}</span>
        </button>
        <div class="mixer-panel">
          <div class="mixer-note" id="mixer-note"></div>
          ${CHANNELS.map(
            (c) => `
            <label class="mixer-row">
              <span class="mixer-label">${c.icon} ${c.label}</span>
              <input type="range" min="0" max="100" step="1" data-key="${c.key}" />
            </label>`,
          ).join('')}
          <div class="mixer-song" id="mixer-song"></div>
          <button class="mixer-mute" id="mixer-mute" type="button"></button>
          <button class="mixer-test" id="mixer-test" type="button">${t('🔔 測試聲音')}</button>
          <div class="mixer-status" id="mixer-status"></div>
        </div>
      </div>
      `,
    );
    this.el = root.querySelector('#mixer');
    this.sliders = [...this.el.querySelectorAll('input[type="range"]')];
    this.muteBtn = this.el.querySelector('#mixer-mute');
    this.note = this.el.querySelector('#mixer-note');
    this.songEl = this.el.querySelector('#mixer-song');
    this.icon = this.el.querySelector('#mixer-icon');
    this.statusEl = this.el.querySelector('#mixer-status');
    this.el.querySelector('#mixer-test').addEventListener('click', () => {
      audio.testTone();
      this.refresh();
    });

    this.el.querySelector('#mixer-toggle').addEventListener('click', () => {
      audio.start(); // 點按也算是使用者操作，順便解鎖音訊
      this.el.classList.toggle('open');
    });
    for (const s of this.sliders) {
      s.addEventListener('input', () => {
        audio.start();
        if (audio.muted) audio.setMuted(false);
        audio.setVolume(s.dataset.key, Number(s.value) / 100);
      });
      s.addEventListener('change', () => s.blur()); // 放開後把鍵盤還給遊戲
    }
    this.muteBtn.addEventListener('click', () => {
      audio.start();
      audio.setMuted(!audio.muted);
    });
    // 面板內的按鍵不要觸發遊戲動作
    this.el.addEventListener('keydown', (e) => e.stopPropagation());
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());

    audio.onChange(() => this.refresh());
    this.refresh();
  }

  setNote(text) {
    this.note.textContent = text ?? '';
    this.note.style.display = text ? '' : 'none';
  }

  refresh() {
    const a = this.audio;
    for (const s of this.sliders) s.value = Math.round((a.prefs[s.dataset.key] ?? 0) * 100);
    this.muteBtn.textContent = a.muted ? t('🔈 取消靜音') : t('🔇 一鍵靜音');
    this.icon.textContent = a.muted ? '🔇' : '🎧';
    this.el.classList.toggle('muted', a.muted);
    this.songEl.textContent = !a.music
      ? ''
      : a.prefs.music > 0
        ? t('正在播放：{song}', { song: a.songName })
        : t('背景音樂已關閉（往右拉就會播放）');
    this.statusEl.textContent = a.statusText;
  }
}
