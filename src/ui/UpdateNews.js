import { t } from '../i18n/i18n.js';

/**
 * 📰 重大更新公告：圖文小卡片，每次更新只出現一次（看過就記在這台裝置上）。
 * 要發新的公告：改 NEWS.id（例如換成新的日期）和 items 就好。
 */
export const NEWS = {
  id: '2026-11-05',
  title: () => t('🔥 營地更新了！'),
  items: () => [
    { pic: '🌅', title: t('營火時間變成早晚兩場'), text: t('每天早上 9:30、晚上 9:30 各一場：魚王、流星雨、松果加倍，開始前 5 分鐘會提醒你') },
    { pic: '🏡', title: t('雙層小木屋＋擴建到 20×20'), text: t('小舖新帳篷「雙層小木屋」，二樓也能擺家具；帳篷最大可以擴建到 20×20') },
    { pic: '🛋️', title: t('新家具：配色、隔間牆、魚缸、展示櫃'), text: t('買家具可以選顏色；用隔間牆分房間；魚缸放自己釣的魚（魚王要巨型水族箱）；沙發、床按 E 可以坐下、躺下') },
    { pic: '🐾', title: t('動物外型'), text: t('「👒 造型 → 🐾 外型」可以買特殊毛色（橘貓、三花⋯）、換尾巴和耳朵形狀') },
    { pic: '🚙', title: t('門口擺設'), text: t('小舖「🚙 門口擺設」：露營車、越野車、吊床⋯擺在帳篷營地的家門口') },
    { pic: '🧭', title: t('一鍵「去哪裡」'), text: t('上面的「🧭 去哪裡」可以直接到湖邊、迷霧森林、帳篷營地，或回自己的帳篷') },
  ],
};

const KEY = 'cozy-news';

export class UpdateNews {
  constructor(root = document.getElementById('ui')) {
    root.insertAdjacentHTML('beforeend', `<div class="upd-news" id="upd-news" hidden><div class="upd-card"></div></div>`);
    this.el = root.querySelector('#upd-news');
    this.card = this.el.querySelector('.upd-card');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el || e.target.closest('[data-upd]')) this.hide();
    });
    window.addEventListener('keydown', (e) => e.code === 'Escape' && this.visible && this.hide());
  }

  get visible() {
    return !this.el.hidden;
  }

  /** 還沒看過這次的公告？ */
  get unseen() {
    try {
      return localStorage.getItem(KEY) !== NEWS.id;
    } catch {
      return false;
    }
  }

  /** 第一次來的新朋友不用看「更新了什麼」，直接記成看過 */
  markSeen() {
    try {
      localStorage.setItem(KEY, NEWS.id);
    } catch {
      /* 無痕模式 */
    }
  }

  show() {
    this.markSeen();
    this.card.innerHTML = `
      <div class="upd-title">${NEWS.title()}</div>
      <div class="upd-list">${NEWS.items()
        .map((x) => `<div class="upd-item"><div class="upd-pic">${x.pic}</div><div><b>${x.title}</b><p>${x.text}</p></div></div>`)
        .join('')}</div>
      <button type="button" class="upd-ok" data-upd="ok">${t('好，去逛逛 ✨')}</button>`;
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
