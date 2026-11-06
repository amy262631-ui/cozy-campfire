import { SONGS } from '../audio/music.js';
import { t } from '../i18n/i18n.js';
import { addCloseX } from './CloseX.js';

/**
 * 樹屋點唱機的選歌面板。onPick(index) 由主程式決定要送給伺服器或直接播放。
 */
export class JukeboxPanel {
  constructor({ onPick, root = document.getElementById('ui') }) {
    this.onPick = onPick;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="jukebox" id="jukebox">
        <div class="jukebox-card">
          <div class="jukebox-title">${t('🎵 森林點唱機')}</div>
          <div class="jukebox-sub">${t('選一首歌，樹屋裡的大家都會聽到')}</div>
          <div class="jukebox-list">
            ${SONGS.map(
              (s, i) => `
              <button type="button" class="jukebox-song" data-i="${i}">
                <span class="jukebox-play">▶</span>
                <span class="jukebox-name">${s.name}</span>
                <small>${s.desc ?? ''}</small>
              </button>`,
            ).join('')}
            <button type="button" class="jukebox-song jukebox-stop" data-i="-1">
              <span class="jukebox-play">■</span>
              <span class="jukebox-name">${t('停止音樂')}</span>
              <small>${t('只聽大自然')}</small>
            </button>
          </div>
          <button type="button" class="jukebox-close" id="jukebox-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    this.el = root.querySelector('#jukebox');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.querySelectorAll('.jukebox-song').forEach((b) =>
      b.addEventListener('click', () => {
        this.onPick?.(Number(b.dataset.i));
        this.close();
      }),
    );
    this.el.querySelector('#jukebox-close').addEventListener('click', () => this.close());
    addCloseX(this.el.querySelector('#jukebox-close'), '.jukebox-card'); // 右上角 ✕
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  open(current) {
    this.el.querySelectorAll('.jukebox-song').forEach((b) =>
      b.classList.toggle('current', Number(b.dataset.i) === current),
    );
    this.el.classList.add('show');
  }

  close() {
    this.el.classList.remove('show');
    // 把鍵盤還給遊戲（不然游標還留在剛剛的輸入框，按 E 會沒反應）
    if (this.el.contains(document.activeElement)) document.activeElement.blur();
  }
}
