import { t } from '../i18n/i18n.js';

/**
 * 📰 重大更新公告：圖文小卡片，每次更新只出現一次（看過就記在這台裝置上）。
 * 要發新的公告：改 NEWS.id（例如換成新的日期）和 items 就好。
 */
export const NEWS = {
  id: '2026-11-12',
  title: () => t('✨ 小精靈來了！'),
  items: () => [
    { pic: '✨', title: t('可以養小精靈了'), text: t('到小舖「✨ 小精靈」買小精靈蛋（第一顆 100 🌰，馬上孵出來），小光點會飄在你肩膀旁邊，別人也看得到') },
    { pic: '🌱', title: t('玩遊戲會長大'), text: t('釣魚、添柴、煮菜、採集、餵料理都會長大：小光點 → 小精靈 → 長大（翅膀＋光環）') },
    { pic: '💧', title: t('看你怎麼玩決定樣子'), text: t('釣魚 💧、顧火煮菜 🔥、採集 🍃、休息聊天 ☁️、看星星許願 ⭐、迷霧森林採蘑菇 🍄') },
    { pic: '🥚', title: t('想多養幾隻'), text: t('再買孵蛋器（300 🌰，10 分鐘孵好）；可以取名字、收起來換一隻帶，一次帶 1 隻') },
    { pic: '🌟', title: t('長大後可以換樣子'), text: t('花 300 🌰 換成 6 種裡的任何一種') },
    { pic: '🎮', title: t('跟小精靈玩小遊戲'), text: t('每種小精靈的遊戲都不一樣：跳舞、追泡泡、躲貓貓、連星座⋯多養幾隻都玩玩看') },
    { pic: '💛', title: t('不會生病、不會離開'), text: t('沒來也沒關係，好幾天沒來它還會衝過來找你') },
    { pic: '❓', title: t('上方「✨ 小精靈」'), text: t('看它、摸摸它、餵它吃料理（喜歡的料理長更快）') },
    { pic: '📣', title: t('大聲公'), text: t('聊天框旁邊的 📣：花 30 🌰，說的話全營地都看得到') },
    { pic: '🚲', title: t('公用腳踏車'), text: t('帳篷營地每區入口都有一台，大家都能騎，按 E 騎、再按 E 下車') },
    { pic: '📢', title: t('以前的更新也看得到'), text: t('按上方「📢 更新」，可以往前翻以前的更新') },
  ],
};

/** 💝 月票開賣的公告（伺服器 PASS_ON 開了才用這份，沒開之前還是上面那份） */
export const NEWS_PASS = {
  id: '2026-11-14',
  title: () => t('💝 支持營地開放了！'),
  items: () => [
    { pic: '✨', title: t('小精靈來了'), text: t('小舖「✨ 小精靈」買小精靈蛋（第一顆 100 🌰），玩遊戲會長大，可以餵它、取名字') },
    { pic: '🎮', title: t('跟小精靈玩小遊戲'), text: t('每種小精靈的遊戲都不一樣：跳舞、追泡泡、躲貓貓、連星座⋯多養幾隻都玩玩看') },
    { pic: '📣', title: t('大聲公'), text: t('聊天框旁邊的 📣：花 30 🌰，說的話全營地都看得到') },
    { pic: '🚲', title: t('公用腳踏車'), text: t('帳篷營地每區入口都有一台，大家都能騎，按 E 騎、再按 E 下車') },
    { pic: '💝', title: t('上方多了「💝 支持營地」'), text: t('喜歡這座營地，可以在這裡支持作者') },
    { pic: '🎫', title: t('營火月票'), text: t('🔥 小營火、✨ 星空，1 個月或 3 個月；每天多拿松果，不會自動續扣') },
    { pic: '💇', title: t('11 月支持營地'), text: t('贊助就送 11 月限定假髮（2 選 1）') },
    { pic: '🪺', title: t('月票家具、跳色'), text: t('小舖「🎫 月票」分頁：吊籃椅、雲朵地毯、水晶吊燈⋯') },
    { pic: '🏡', title: t('月票小屋'), text: t('🔭 玻璃星空圓頂屋、🌳 私人樹屋（有二樓、鞦韆）；星空月票每月還能免費挑 1 件家具') },
    { pic: '🔞', title: t('未成年請先問爸爸媽媽'), text: t('付款前要勾選確認；可用台灣的信用卡、Apple Pay、ATM、超商條碼') },
    { pic: '🌱', title: t('不買也能玩'), text: t('遊戲裡的東西用松果都拿得到，月票只是拿得快一點') },
  ],
};

/** 📚 以前的公告：按「📢 更新」可以往前翻（新的在前面；只往後加，不要刪） */
export const NEWS_OLD = [
  {
    id: '2026-11-08',
    title: () => t('🏕️ 營地大更新！'),
    items: () => [
      { pic: '🪧', title: t('帳篷有門牌了'), text: t('固定位置（例：A 區 7 號）；第一次搬家免費，走過拱門可以去別區') },
      { pic: '🚙', title: t('門口可以擺更多'), text: t('大型 1 個＋小型 3 個，原本擺的都還在') },
      { pic: '🛋️', title: t('家具會動了'), text: t('書架、鬧鐘、燈、魚缸⋯按 E 試試看；小舖多了 7 種新魚缸') },
      { pic: '🔨', title: t('手作多了 15 種'), text: t('回收桶可以選「留著做手作」，寶特瓶、輪胎也能做成家具') },
      { pic: '🪨', title: t('圖鑑變多了'), text: t('湖邊石頭、貝殼、垃圾都有新的；11 月限定：🍿 爆米花、🎞️ 膠捲貝殼') },
      { pic: '🎒', title: t('多了「🎒 背包」'), text: t('在表情、聊天旁邊：料理直接在這裡吃，也能看採集籃和造型') },
      { pic: '🎁', title: t('可以送禮給好友'), text: t('在好友的密頻按「🎁 送禮」（要有帳號）') },
      { pic: '❓', title: t('有問題按「❓ 問題」'), text: t('帳篷哪裡買、我家怎麼去⋯都有「👉 帶我去」，還有營地手冊') },
    ],
  },
  {
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
  },
];

const KEY = 'cozy-news';

export class UpdateNews {
  constructor(root = document.getElementById('ui')) {
    /** main.js 設定：月票開通了沒（開了才顯示月票的公告） */
    this.payOn = () => false;
    root.insertAdjacentHTML('beforeend', `<div class="upd-news" id="upd-news" hidden><div class="upd-card"></div></div>`);
    this.el = root.querySelector('#upd-news');
    this.card = this.el.querySelector('.upd-card');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      const pg = e.target.closest('[data-page]');
      if (pg) return this.show(Number(pg.dataset.page));
      if (e.target === this.el || e.target.closest('[data-upd]')) this.hide();
    });
    window.addEventListener('keydown', (e) => e.code === 'Escape' && this.visible && this.hide());
  }

  /** 現在要顯示的公告 */
  get news() {
    return this.payOn() ? NEWS_PASS : NEWS;
  }

  get visible() {
    return !this.el.hidden;
  }

  /** 還沒看過這次的公告？ */
  get unseen() {
    try {
      return localStorage.getItem(KEY) !== this.news.id;
    } catch {
      return false;
    }
  }

  /** 第一次來的新朋友不用看「更新了什麼」，直接記成看過 */
  markSeen() {
    try {
      localStorage.setItem(KEY, this.news.id);
    } catch {
      /* 無痕模式 */
    }
  }

  /** 全部的公告（新的在前面）：月票開了才有月票那份 */
  get pages() {
    return [...(this.payOn() ? [NEWS_PASS] : []), NEWS, ...NEWS_OLD];
  }

  /** page：0＝最新；往前翻看以前的更新 */
  show(page = 0) {
    this.markSeen();
    const list = this.pages;
    page = Math.max(0, Math.min(list.length - 1, page));
    const n = list[page];
    const date = n.id.slice(5).replace('-', '/');
    this.card.innerHTML = `
      <div class="upd-title">${n.title()}</div>
      <div class="upd-date">${date}${page ? t('・以前的更新') : ''}</div>
      <div class="upd-list">${n.items()
        .map((x) => `<div class="upd-item"><div class="upd-pic">${x.pic}</div><div><b>${x.title}</b><p>${x.text}</p></div></div>`)
        .join('')}</div>
      <div class="upd-pager">
        <button type="button" data-page="${page + 1}" ${page >= list.length - 1 ? 'disabled' : ''}>${t('◀ 更早的更新')}</button>
        <span>${page + 1}／${list.length}</span>
        <button type="button" data-page="${page - 1}" ${page <= 0 ? 'disabled' : ''}>${t('較新的 ▶')}</button>
      </div>
      <button type="button" class="upd-ok" data-upd="ok">${t('好，去逛逛 ✨')}</button>`;
    this.el.hidden = false;
    this.card.scrollTop = 0; // 翻頁後從最上面開始看
  }

  hide() {
    this.el.hidden = true;
  }
}
