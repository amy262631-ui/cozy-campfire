import { t } from '../i18n/i18n.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BLESSINGS = [
  t('願你今天也被溫柔地對待 🌸'),
  t('願你睡個好覺，明天醒來神清氣爽 🌙'),
  t('願你在乎的人都平安健康 🍀'),
  t('願你的努力都被看見 ✨'),
  t('願你的心裡一直有一盞小燈 🏮'),
  t('願你遇到的煩惱，都能慢慢變輕 🍃'),
];

const OMIKUJI = [
  { level: t('大吉'), weight: 15, lines: [t('好運正在敲門，勇敢去試試看吧！'), t('想做的事，現在就是最好的時機。'), t('你笑起來的樣子，會帶來好事。')] },
  { level: t('中吉'), weight: 20, lines: [t('一步一步慢慢來，結果會很美好。'), t('身邊有人默默支持著你。'), t('今天適合跟朋友聊聊天。')] },
  { level: t('小吉'), weight: 25, lines: [t('小小的幸福藏在日常裡，記得抬頭看看。'), t('喝杯熱飲，事情會變順利。'), t('休息也是前進的一部分。')] },
  { level: t('吉'), weight: 25, lines: [t('平平安安就是最好的運氣。'), t('保持現在的步調就很好。'), t('整理一下房間，心情也會變清爽。')] },
  { level: t('末吉'), weight: 15, lines: [t('好運來得慢一點，但一定會來。'), t('先照顧好自己，其他的慢慢來。'), t('今天早點睡，明天會更好。')] },
];

const JIAOBEI = {
  holy: { name: t('聖筊'), icon: '🌓', text: t('一正一反——神明同意了！放心去做吧。') },
  laugh: { name: t('笑筊'), icon: '🌝', text: t('兩個都是平面朝上——神明笑而不答，換個方式再問一次吧。') },
  no: { name: t('陰筊'), icon: '🌚', text: t('兩個都是凸面朝上——神明覺得再想一想比較好。') },
};

/**
 * 地藏祈福處的選單：參拜、擲筊、抽籤、寫繪馬、看大家的繪馬。
 *   onPray()            參拜（角色雙手合十＋鈴聲）
 *   onWish(text)        寫好繪馬
 */
export class ShrinePanel {
  constructor({ onPray, onWish, root = document.getElementById('ui') }) {
    Object.assign(this, { onPray, onWish });
    this.wishes = [];
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="shrine" id="shrine">
        <div class="shrine-card">
          <div class="shrine-title">${t('⛩️ 地藏祈福處')}</div>
          <div class="shrine-body" id="shrine-body"></div>
          <button type="button" class="shrine-close" id="shrine-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    this.el = root.querySelector('#shrine');
    this.body = root.querySelector('#shrine-body');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('keydown', (e) => e.stopPropagation());
    root.querySelector('#shrine-close').addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  open() {
    this.#menu();
    this.el.classList.add('show');
  }

  close() {
    this.el.classList.remove('show');
    // 把鍵盤還給遊戲（不然游標還留在剛剛的輸入框，按 E 會沒反應）
    if (this.el.contains(document.activeElement)) document.activeElement.blur();
  }

  setWishes(list) {
    this.wishes = list ?? [];
  }

  #menu() {
    this.body.innerHTML = `
      <div class="shrine-sub">${t('圓圓的地藏們笑瞇瞇地看著你')}</div>
      <div class="shrine-menu">
        <button type="button" data-do="pray"><span>🙏</span>${t('參拜')}<small>${t('雙手合十、搖鈴')}</small></button>
        <button type="button" data-do="jiao"><span>🌙</span>${t('擲筊')}<small>${t('問神明一個問題')}</small></button>
        <button type="button" data-do="kuji"><span>🎋</span>${t('抽籤')}<small>${t('看看今天的運勢')}</small></button>
        <button type="button" data-do="ema"><span>📝</span>${t('寫繪馬')}<small>${t('把願望掛起來')}</small></button>
      </div>
      <button type="button" class="shrine-link" data-do="read">${t('📜 看看大家的繪馬（{n}）', { n: this.wishes.length })}</button>
    `;
    this.body.querySelectorAll('[data-do]').forEach((b) =>
      b.addEventListener('click', () => {
        const d = b.dataset.do;
        if (d === 'pray') {
          this.close();
          this.onPray?.();
          setTimeout(() => this.onBlessing?.(pick(BLESSINGS)), 2600);
        } else if (d === 'jiao') this.#jiao();
        else if (d === 'kuji') this.#kuji();
        else if (d === 'ema') this.#ema();
        else if (d === 'read') this.#read();
      }),
    );
  }

  #back() {
    return '<button type="button" class="shrine-link" data-back>' + t('← 回到選單') + '</button>';
  }

  #bindBack() {
    this.body.querySelector('[data-back]')?.addEventListener('click', () => this.#menu());
  }

  /** 擲筊：兩塊月牙形的筊杯翻轉落下 */
  #jiao() {
    this.body.innerHTML = `
      <div class="shrine-sub">${t('先在心裡默默想好一個問題，')}<br />${t('再雙手捧著筊杯擲出去')}</div>
      <div class="jiao-stage"><i class="jiao a"></i><i class="jiao b"></i></div>
      <div class="shrine-result" id="jiao-result"></div>
      <button type="button" class="shrine-go" id="jiao-go">${t('🌙 擲筊')}</button>
      ${this.#back()}
    `;
    this.#bindBack();
    const go = this.body.querySelector('#jiao-go');
    go.addEventListener('click', () => {
      go.disabled = true;
      this.onPray?.(true);
      this.onSfx?.('jiao');
      const stage = this.body.querySelector('.jiao-stage');
      const result = this.body.querySelector('#jiao-result');
      result.textContent = '';
      stage.classList.remove('done', 'holy', 'laugh', 'no');
      void stage.offsetWidth;
      stage.classList.add('throwing');
      const r = Math.random();
      const kind = r < 0.5 ? 'holy' : r < 0.75 ? 'laugh' : 'no';
      setTimeout(() => {
        stage.classList.remove('throwing');
        stage.classList.add('done', kind);
        const j = JIAOBEI[kind];
        result.innerHTML = `<b>${j.icon} ${j.name}</b><span>${j.text}</span>`;
        go.disabled = false;
        go.textContent = t('🌙 再擲一次');
      }, 1300);
    });
  }

  /** 抽籤（御神籤）：搖一搖籤筒，抽出一支籤 */
  #kuji() {
    this.body.innerHTML = `
      <div class="shrine-sub">${t('搖一搖籤筒，抽一支今天的籤')}</div>
      <div class="kuji-stage"><div class="kuji-tube"><i></i><i></i><i></i></div></div>
      <div class="kuji-paper" id="kuji-paper"></div>
      <button type="button" class="shrine-go" id="kuji-go">${t('🎋 抽籤')}</button>
      ${this.#back()}
    `;
    this.#bindBack();
    const go = this.body.querySelector('#kuji-go');
    go.addEventListener('click', () => {
      go.disabled = true;
      this.onSfx?.('kuji');
      const tube = this.body.querySelector('.kuji-tube');
      const paper = this.body.querySelector('#kuji-paper');
      paper.classList.remove('show');
      tube.classList.add('shaking');
      const total = OMIKUJI.reduce((s, o) => s + o.weight, 0);
      let r = Math.random() * total;
      const o = OMIKUJI.find((x) => (r -= x.weight) <= 0) ?? OMIKUJI[0];
      setTimeout(() => {
        tube.classList.remove('shaking');
        paper.innerHTML = `<b>${o.level}</b><span>${pick(o.lines)}</span>`;
        paper.classList.add('show');
        go.disabled = false;
        go.textContent = t('🎋 再抽一支');
        if (o.level === t('大吉')) this.onSfx?.('daikichi');
        this.onKuji?.(o.level); // 每日任務「抽籤問運勢」
        // 分享這支籤（做成圖片卡）
        let share = this.body.querySelector('#kuji-share');
        if (!share && this.onShareKuji) {
          share = document.createElement('button');
          share.type = 'button';
          share.id = 'kuji-share';
          share.className = 'shrine-go kuji-share';
          share.textContent = t('📤 分享這支籤');
          go.after(share);
        }
        if (share) share.onclick = () => this.onShareKuji(o.level, paper.querySelector('span')?.textContent ?? '');
      }, 1100);
    });
  }

  /** 寫繪馬 */
  #ema() {
    this.body.innerHTML = `
      <div class="shrine-sub">${t('寫下你的願望，掛在繪馬架上，')}<br />${t('來祈福的大家都看得到 🌸')}</div>
      <textarea class="ema-input" id="ema-text" maxlength="30" rows="2" placeholder="${t('例如：希望考試順利（最多 30 字）')}"></textarea>
      <button type="button" class="shrine-go" id="ema-go">${t('📝 掛上繪馬')}</button>
      ${this.#back()}
    `;
    this.#bindBack();
    const input = this.body.querySelector('#ema-text');
    setTimeout(() => input.focus(), 50);
    this.body.querySelector('#ema-go').addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }
      this.onWish?.(text);
      this.close();
    });
  }

  #read() {
    const list = [...this.wishes].reverse();
    this.body.innerHTML = `
      <div class="ema-list">
        ${
          list.length
            ? list.map((w) => `<div class="ema-item"><span>${esc(w.text)}</span><small>— ${esc(w.name)}</small></div>`).join('')
            : '<div class="shrine-sub">' + t('還沒有人掛繪馬，寫下第一個願望吧！') + '</div>'
        }
      </div>
      ${this.#back()}
    `;
    this.#bindBack();
  }
}
