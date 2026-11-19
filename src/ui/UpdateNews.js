import { t } from '../i18n/i18n.js';
import { isXmas } from '../game/season.js';
import { isOpen, LAUNCH_1120 } from '../game/dailySpecial.js';

/**
 * 📰 重大更新公告：圖文小卡片，每次更新只出現一次（看過就記在這台裝置上）。
 * 要發新的公告：改 NEWS.id（例如換成新的日期）和 items 就好。
 */
export const NEWS = {
  id: '2026-11-12c', // 11/13 加了桌遊、營地地圖；c：加了🐸 青蛙跳出來（11/15 的更新另外一頁：NEWS_TENTS）
  title: () => t('✨ 小精靈來了！'),
  items: () => [
    ...NEW_1113(),
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

/** 🏕️ 11/15：新帳篷開賣＋🍳 廚房餐桌＋🛠️ 拖曳布置（加在最上面，原本的留著） */
const NEW_1115 = () => [
  { pic: '🍳', title: t('廚房家具'), text: t('瓦斯爐、灶台、小烤箱可以在家煮料理；還有流理台、碗盤架') },
  { pic: '🍽️', title: t('餐桌請客'), text: t('把料理擺上餐桌，朋友來坐下就能吃一份，你也會拿到松果') },
  { pic: '✋', title: t('布置變好用了'), text: t('按住家具直接拖；背包一格一格；一鍵全部收起，可以重新擺') },
  { pic: '✨', title: t('寶藏變多、金松果一顆一顆冒出來'), text: t('營火寶藏 16 種；找金松果活動會不定時冒出下一顆') },
];

/** 🎲 營火桌遊＋🗺️ 營地地圖（作者 11/13：不要另開一頁，加在目前這一頁最上面，原本的內容留著） */
const NEW_1113 = () => [
  { pic: '🐸', title: t('桌遊新玩法：青蛙跳出來'), text: t('像戳戳樂一樣輪流戳一格，戳到青蛙跳出來的人就輸了，小朋友也會玩') },
  { pic: '🎲', title: t('坐在營火旁玩桌遊'), text: t('坐到營火的圓木上，按「🎲 桌遊」邀大家一起玩，2～6 人，贏的人 +2 🌰') },
  { pic: '🗺️', title: t('營地地圖'), text: t('帳篷營地入口的地圖看板、或「🧭 去哪裡 → 🗺️ 營地地圖」：看大家住哪裡，點帳篷就能傳送到他家門口') },
];

/** 🏕️ 11/15 新造型帳篷開賣（作者 11/15：5 間一起開賣，公告要有一欄新造型帳篷）——最新的一則，月票開不開都先給這則 */
export const NEWS_TENTS = {
  id: '2026-11-15f', // f：加了異色魚、每月限定魚（換 id 讓大家再看到一次）
  title: () => t('🏕️ 新造型帳篷開賣！'),
  items: () => [
    { pic: '✨', title: t('異色魚出現了'), text: t('每條魚有 1% 機會是不同顏色、閃閃發亮的異色版！圖鑑多了「✨ 異色」，收集完送 500 🌰') },
    { pic: '🍁', title: t('每月限定魚：楓葉魚'), text: t('11 月才釣得到；12 月還有雪花魚、聖誕紅鰭魚') },
    { pic: '🐌', title: t('蝸牛殼屋　🌰 120'), text: t('直立的大圓殼加上閉眼微笑的蝸牛，觸角上是會發光的小燈') },
    { pic: '🌸', title: t('花園溫室　🌰 200'), text: t('紅磚矮牆、白框玻璃，屋簷掛著爬藤小花，屋裡有一整排花架') },
    { pic: '🏮', title: t('和風小屋　🌰 250'), text: t('深色木板牆、格子窗透出暖暖的燈光，架高的木頭平台') },
    { pic: '🐻‍❄️', title: t('北極熊雪屋　🌰 800'), text: t('胖胖的雪白熊頭、粉嫩小門，屋裡有冰塊燈、雪地毯，窗外會飄雪') },
    { pic: '⛵', title: t('船屋　🎫 月票限定・🌰 1500'), text: t('地中海配色的兩層船屋，有樓梯和閣樓') },
    { pic: '🛒', title: t('到小舖「⛺ 帳篷外觀」看看'), text: t('買了可以隨時換回原本的帳篷，家具都會留著') },
    ...NEW_1115(),
  ],
};

/** 🎄 12/1 聖誕更新（作者 11/16：精靈家具、小精靈造型、每日限定也跟聖誕一起發）。12/1 起（台北時間）才出現；?xmas=1 可以先看 */
const XMAS_AT = Date.parse('2026-11-27T00:00:00+08:00'); // 作者 11/19：提早到 11/27
export const xmasNewsOn = () => Date.now() >= XMAS_AT || isXmas();
export const NEWS_XMAS = {
  id: '2026-12-01',
  title: () => t('🎄 聖誕節來到營地了！'),
  items: (payOn) => [
    { pic: '🎄', title: t('營地變成聖誕風'), text: t('心願大樹變成大聖誕樹，營火廣場四周種滿小聖誕樹；帳篷營地、湖畔、迷霧森林也掛上燈串、下起小雪（到 1/6）') },
    { pic: '🏮', title: t('新家具：日系、歐風、古風'), text: t('小舖「🪑 家具」多了 🏮 日系、🏰 歐風、🐉 古風三區：榻榻米、絨布沙發、太師椅、屏風、拉門⋯一直都有賣') },
    { pic: '⛩️', title: t('門口也有新擺設'), text: t('石燈籠、竹籬笆、枯山水、歐式路燈、玫瑰花拱門、紅燈籠、石獅子、竹林⋯；月票限定：小鳥居、小噴水池、小涼亭') },
    { pic: '🎨', title: t('看得出哪些家具能換顏色'), text: t('選了顏色後，不能換色的家具會標「固定顏色」') },
    { pic: '🎅', title: t('連續上線 3 天送聖誕造型'), text: t('聖誕帽、馴鹿角、紅綠雪人圍巾，連續來 3 天送 1 款，共 4 款') },
    { pic: '🧣', title: t('小精靈聖誕配件'), text: t('聖誕帽、紅色／綠色雪人圍巾，每個 60 🌰，聖誕期間才賣') },
    { pic: '🍪', title: t('12 月限定圖鑑'), text: t('薑餅人（料理）、聖誕紅（野花）、馴鹿角甲蟲（蟲），還有雪花魚、聖誕紅鰭魚') },
    { pic: '🍭', title: t('聖誕家具開賣'), text: t('小舖「🪑 家具」6 件、「🎫 月票」揮手雪人、麋鹿搖搖馬、雪橇椅、燈串拱門，「🚙 門口擺設」還有門口拱門和門上花圈（賣到 1/15）') },
    ...(payOn ? [{ pic: '🌟', title: t('12 月支持營地禮盒'), text: t('贊助送 12 月限定假髮；再加上會閃的豪華聖誕樹、下雪水晶球、聖誕小火車、聖誕壁爐') }] : []),
  ],
};

/** 🗓️ 11/20 更新（作者 11/16：11/20 自動打開＋跳這則）：精靈家具、小精靈造型、每日限定、營火之約新 3 款 */
export const news1120On = () => isOpen({ from: LAUNCH_1120 });
export const NEWS_1120 = {
  id: '2026-11-19',
  title: () => t('🍳 自由料理鍋、小精靈的家來了！'),
  items: () => [
    // 🍳 11/19 作者：料理鍋、森林傳說跟 11/20 小精靈更新一起推；說明要淺顯易懂
    { pic: '🍳', title: t('自由料理鍋'), text: t('「料理」裡多了自由料理鍋：自己挑 1～4 樣材料亂煮，看會煮出什麼！') },
    { pic: '🐟', title: t('釣到的魚可以煮了'), text: t('釣到的魚會放進保冷箱，拿去煮紅燒魚、握壽司⋯') },
    { pic: '🧂', title: t('加調味料變口味'), text: t('加糖變台南口味、加辣椒粉變麻辣口味，5 🌰 一包') },
    { pic: '❓', title: t('隱藏食譜'), text: t('有些要釣很多魚、種很多菜才會打開，去「📖 料理圖鑑」看提示') },
    { pic: '💀', title: t('黑暗料理'), text: t('亂煮會煮失敗，吃了臉會黑黑的 10 分鐘；失敗 10 次送「😵 灰頭土臉」造型') },
    { pic: '🎣', title: t('中午也有釣魚大賽'), text: t('每天中午 12:30，10 分鐘，比誰的魚最大，前三名送松果') },
    { pic: '🏛️', title: t('標本櫃變大了'), text: t('多了菜園蔬菜、異色魚拓、怪東西展，一起把櫃子填滿吧！') },
    { pic: '🌟', title: t('森林傳說'), text: t('深夜的迷霧森林和湖邊，偶爾會有大大的守護神經過；遇見送 20 🌰') },
    { pic: '🧺', title: t('精靈家具'), text: t('小窩、鞦韆、玩具：收起來的小精靈會住在家裡，朋友來玩也看得到；你在家站著不動，身邊那隻也會跑去玩') },
    { pic: '🎀', title: t('小精靈造型'), text: t('蝴蝶結 4 色（60 🌰）、翅膀 5 色（40 🌰，長大的小精靈才有翅膀），一直都有賣') },
    { pic: '🛒', title: t('到小舖「✨ 小精靈」看看'), text: t('孵蛋器、精靈家具、小精靈造型都在這裡') },
    { pic: '📅', title: t('每天都有點不一樣'), text: t('每天有一種魚特別好釣、森林有一種東西特別多；每週六異色魚比較容易出現') },
    { pic: '🔥', title: t('營火之約多了 3 款造型'), text: t('星夜斗篷、營火毛線帽、螢火蟲翅膀：原本 3 款拿完的人，約朋友就會拿到新的') },
  ],
};

/** 💝 月票開賣的公告（伺服器 PASS_ON 開了才用這份，沒開之前還是上面那份） */
export const NEWS_PASS = {
  id: '2026-11-14c', // 11/13 加了桌遊、營地地圖 → 換 id，大家會再看到一次；c：加了🐸 青蛙跳出來（11/15 的更新另外一頁：NEWS_TENTS）
  title: () => t('💝 支持營地開放了！'),
  items: () => [
    ...NEW_1113(),
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
    if (xmasNewsOn()) return NEWS_XMAS; // 🎄 12/1 起先給聖誕這則
    if (news1120On()) return NEWS_1120; // 🗓️ 11/20 起
    return NEWS_TENTS; // 🏕️ 11/15 新造型帳篷開賣：月票開不開都先給這則
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
    return [...(xmasNewsOn() ? [NEWS_XMAS] : []), ...(news1120On() ? [NEWS_1120] : []), NEWS_TENTS, ...(this.payOn() ? [NEWS_PASS] : []), NEWS, ...NEWS_OLD];
  }

  /** page：0＝最新；往前翻看以前的更新 */
  show(page = 0) {
    this.markSeen();
    const list = this.pages;
    page = Math.max(0, Math.min(list.length - 1, page));
    const n = list[page];
    const date = n.id.slice(5, 10).replace('-', '/');
    this.card.innerHTML = `
      <div class="upd-title">${n.title()}</div>
      <div class="upd-date">${date}${page ? t('・以前的更新') : ''}</div>
      <div class="upd-list">${n.items(this.payOn())
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
