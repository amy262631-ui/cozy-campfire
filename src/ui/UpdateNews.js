import { t } from '../i18n/i18n.js';

/**
 * 📰 重大更新公告：圖文小卡片，每次更新只出現一次（看過就記在這台裝置上）。
 * 要發新的公告：改 NEWS.id（例如換成新的日期）和 items 就好。
 */
export const NEWS = {
  id: '2026-11-08',
  title: () => t('🏕️ 營地大更新！'),
  items: () => [
    { pic: '🪧', title: t('帳篷有門牌了'), text: t('固定位置（例：A 區 7 號）；第一次搬家免費，走過拱門可以去別區') },
    { pic: '🚙', title: t('門口可以擺更多'), text: t('大型 1 個＋小型 3 個，原本擺的都還在') },
    { pic: '🛋️', title: t('家具會動了'), text: t('書架、鬧鐘、燈、魚缸⋯按 E 試試看；小舖多了 7 種新魚缸') },
    { pic: '🔨', title: t('手作多了 15 種'), text: t('回收桶可以選「留著做手作」，寶特瓶、輪胎也能做成家具') },
    { pic: '🪨', title: t('圖鑑變多了'), text: t('湖邊石頭、貝殼、垃圾都有新的；11 月限定：🍿 爆米花、🎞️ 膠捲貝殼') },
    { pic: '🎒', title: t('多了「🎒 背包」'), text: t('在表情、聊天旁邊：料理直接在這裡吃，也能看採集籃和造型') },
    { pic: '🎁', title: t('可以送禮給好友'), text: t('在好友的密頻按「🎁 送禮」（要有帳號、玩滿 7 天）') },
    { pic: '❓', title: t('有問題按「❓ 問題」'), text: t('帳篷哪裡買、我家怎麼去⋯都有「👉 帶我去」，還有營地手冊') },
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
