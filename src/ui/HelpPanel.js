import { t } from '../i18n/i18n.js';

/**
 * ❓ 常見問題＋📖 營地手冊（11/07：有小學生在玩，一定要簡單）
 * - 常見問題：玩家最常問的 6 題，大字一句話回答，每題有「👉 帶我去」
 * - 營地手冊：一頁一件事，一個大圖示＋一句話；想知道更多再按「看更多」
 *
 * ctx（main.js 給的）：
 *   modal                     共用的大視窗
 *   tentPrice, coins()        帳篷價格、現在有幾顆松果
 *   home()                    我的帳篷資料（沒有就是 null）
 *   plotName(plot)            「A 區 5 號」
 *   go: { shop, home, pine, look, friends, place(id) }   帶我去
 */
/** ✨ 小精靈規則（手冊、小精靈視窗共用，作者 11/11：大家要看得懂） */
export const spiritRuleLines = () => [
  t('在小舖「✨ 小精靈」買蛋：第一顆 100 🌰，馬上孵出來'),
  t('3 個階段：小光點 → 小精靈（親密度 60）→ 長大（親密度 400，有翅膀和光環）'),
  t('釣魚、添柴、煮菜、採集、休息、聊天、看星星、許願、種菜收成都會加親密度，一天最多 +40'),
  t('餵料理一天 3 次（不算在 40 裡），它最喜歡的料理長更快；小光點還沒有最喜歡的料理，吃什麼都一樣'),
  t('變成小精靈時，看你最常做什麼：釣魚 💧、添柴煮菜 🔥、採集 🍃、休息聊天 ☁️、看星星許願 ⭐、迷霧森林採蘑菇 🍄（晚上或營火時間玩，星星會多算一點）'),
  t('長大後花 300 🌰 可以換成 6 種裡的任何一種'),
  t('想多養一隻：孵蛋器 300 🌰，10 分鐘孵好（下線也會孵，下次進來就好了）；一次帶 1 隻出門，最多養 12 隻'),
  t('只有帶出門的那隻會長大，收起來的會停在原本的樣子；在「✨ 小精靈」視窗按「帶出門」換一隻'),
  t('在遊戲裡直接點小精靈就能摸摸，每次反應不一樣（害羞、轉圈、蹭臉頰、打噴嚏）'),
  t('🎮 可以跟它玩小遊戲，每種小精靈的遊戲都不一樣：小光點跳舞、水滴追泡泡、火苗撿火花、葉子躲貓貓、雲朵接雨滴、星星連星座、蘑菇彈跳；每天 3 次，玩完加親密度'),
  t('可以取名字：走到旁邊或點它時，頭上會出現名字，別人也看得到'),
  t('它會跟著你做的事換表情：釣到魚會驚訝、營火時間會跳舞、晚上會打瞌睡'),
  t('可以先收起來（大家都看不到），想帶出來再叫它；沒來玩也不會生病或離開'),
  t('🎄 聖誕期間（12/1～1/6）可以買小精靈配件：聖誕帽、紅色雪人圍巾、綠色雪人圍巾，每個 60 🌰；買了每隻小精靈都能戴，過了聖誕也能繼續戴'),
  t('小精靈、孵蛋器、配件只能用松果買，不用花錢'),
];

export class HelpPanel {
  constructor(ctx) {
    this.ctx = ctx;
    this.page = 0;
  }

  #faq() {
    const { tentPrice, coins, home, plotName } = this.ctx;
    const h = home();
    const n = coins() ?? 0;
    return [
      {
        q: t('⛺ 帳篷哪裡買？'),
        a: h?.tent ? t('你已經有帳篷了！小舖還可以買家具 🪑') : t('營火旁的「🏪 營地小舖」。帳篷 {p} 顆松果，你有 {n} 顆。', { p: tentPrice, n }),
        btn: t('👉 打開小舖'),
        go: 'shop',
      },
      {
        q: t('🏠 我家怎麼去？'),
        a: h?.tent ? t('點上面「🧭 去哪裡」→「🏠 我的帳篷」。') : t('要先買帳篷，才會有自己的家喔。'),
        btn: h?.tent ? t('👉 帶我回家') : t('👉 打開小舖'),
        go: h?.tent ? 'home' : 'shop',
      },
      {
        q: t('🚚 怎麼搬家？'),
        a: h?.tent
          ? t('在帳篷營地點右邊「🏕️ A 區」→「🚚 搬家」，挑一個空營位。第一次免費，之後 100 顆松果。')
          : t('要先買帳篷，才有營位可以搬喔。'),
        btn: h?.tent ? t('👉 打開搬家地圖') : t('👉 打開小舖'),
        go: h?.tent ? 'move' : 'shop',
      },
      {
        q: t('⏳ 很久沒來，營位會不見嗎？'),
        a: t('7 天沒上線，營位會先空出來給新朋友。帳篷、家具、菜園都會幫你留著，下次回來會自動分一個空營位（優先原本那一區），也可以再搬回喜歡的位置。'),
        btn: h?.tent ? t('👉 打開搬家地圖') : t('👉 打開小舖'),
        go: h?.tent ? 'move' : 'shop',
      },
      {
        q: t('🌰 松果怎麼拿？'),
        a: t('做任務、釣魚、坐在營火旁，都會拿到松果。'),
        btn: t('👉 看全部方法'),
        go: 'pine',
      },
      {
        q: t('✨ 小精靈怎麼養？'),
        a: t('到小舖「✨ 小精靈」買小精靈蛋（第一顆 100 🌰，馬上孵出來）。它會跟在你身邊，玩遊戲、餵料理就會長大。'),
        btn: t('👉 看小精靈'),
        go: 'spirit',
      },
      {
        q: t('✨ 小精靈會變成哪一種？'),
        a: t('變成小精靈時，看你最常做什麼：釣魚 💧、添柴煮菜 🔥、採集 🍃、休息聊天 ☁️、看星星許願 ⭐、迷霧森林採蘑菇 🍄。長大後也可以花 300 🌰 換。'),
        btn: t('👉 看規則'),
        go: 'spiritRules',
      },
      {
        q: t('📣 大聲公怎麼用？'),
        a: t('在聊天框打字，按旁邊的 📣，花 30 🌰，全營地的人都會在畫面上方看到你說的話。每人 3 分鐘可以用一次。'),
        btn: t('👉 打開聊天'),
        go: 'chat',
      },
      {
        q: t('👒 怎麼換衣服？'),
        a: t('點上面「👒 造型」，可以換帽子、圍巾、毛色。'),
        btn: t('👉 打開造型'),
        go: 'look',
      },
      {
        q: t('👫 怎麼加好友？'),
        a: t('點下面「👫 好友」，按旁邊的人，或輸入對方的玩家編號。'),
        btn: t('👉 打開好友'),
        go: 'friends',
      },
      {
        q: t('📲 怎麼把遊戲放到手機桌面？'),
        a: t('放好之後桌面會多一個 🔥 圖示，下次一點就進來。'),
        btn: t('👉 教我怎麼放'),
        go: 'install',
      },
      ...(this.ctx.payOn?.()
        ? [
            {
              q: t('🎫 月票是什麼？'),
              a: t('上方「💝 支持營地」可以買。每天多拿松果、可以買月票家具；不會自動續扣，不買也能玩。'),
              btn: t('👉 看月票'),
              go: 'pass',
            },
          ]
        : []),
      {
        q: t('🔢 我家在幾區幾號？'),
        a: h?.tent && h.plot ? t('你家在 {p}。', { p: plotName(h.plot) }) : h?.tent ? t('你家在帳篷營地裡。') : t('還沒有帳篷，買了就會有門牌喔。'),
        btn: h?.tent ? t('👉 帶我回家') : t('👉 打開小舖'),
        go: h?.tent ? 'home' : 'shop',
      },
    ];
  }

  /** 營地手冊：每頁一個大圖示、一句話；more＝「看更多」 */
  #pages() {
    return [
      { ic: '🔥', title: t('營火'), line: t('坐在營火旁，可以添柴、烤棉花糖。'), more: [t('走到圓木旁，按「坐下」'), t('烤到金黃色就收回，最好吃'), t('冷了可以裹毯子 🧣'), t('按「✨ 星空」躺下來看星星')], go: ['forest_main', t('👉 帶我去營火')] },
      { ic: '🌰', title: t('松果'), line: t('松果可以買帳篷、家具和衣服。'), more: [t('每日任務：每個 5 顆'), t('釣魚：1～15 顆'), t('坐在營火旁：每 5 分鐘 2 顆'), t('撿垃圾回收：每件 1 顆'), t('早上、晚上 9 點半：松果變兩倍！')], go: ['pine', t('👉 看全部方法')] },
      { ic: '🎣', title: t('釣魚'), line: t('去湖邊，浮標沉下去就拉竿！'), more: [t('有 50 種魚，越稀有松果越多'), t('只點一下是魚在試探，先別拉'), t('釣到的魚可以放進帳篷的魚缸')], go: ['lake_dock', t('👉 帶我去湖邊')] },
      { ic: '🍄', title: t('採集'), line: t('迷霧森林裡可以採蘑菇、果子和花。'), more: [t('湖邊可以撿石頭和貝殼'), t('第一次採到新東西有松果'), t('採到的東西可以煮料理、做家具')], go: ['mist_forest', t('👉 帶我去森林')] },
      { ic: '⛺', title: t('帳篷'), line: t('買了帳篷，就有自己的家！'), more: [t('用松果買家具，慢慢布置'), t('可以換帳篷外型和花色'), t('開放參觀，朋友就能來玩')], go: ['shop', t('👉 打開小舖')] },
      { ic: '🏕️', title: t('帳篷營地'), line: t('大家的帳篷都在這裡。'), more: [t('每頂帳篷都有門牌，像「A 區 5 號」'), t('走過木頭拱門，可以去別區'), t('想換位置可以搬家，第一次免費'), t('7 天沒上線營位會空出來，回來自動分新營位，東西都還在')], go: ['camp', t('👉 帶我去營地')] },
      { ic: '🍲', title: t('料理和手作'), line: t('用採到的東西煮料理、做家具。'), more: [t('營火旁的「營火料理」鍋子可以煮'), t('煮好的料理在下面「🎒 背包」裡吃'), t('「📖 圖鑑」裡的「🔨 手作」可以做家具'), t('帳篷門口可以種菜 🥕')] },
      { ic: '✨', title: t('小精靈'), line: t('小精靈會跟在你身邊，玩遊戲就會長大。'), more: spiritRuleLines(), go: ['spirit', t('👉 看我的小精靈')] },
      { ic: '👫', title: t('朋友'), line: t('加好友，就可以聊天、送禮物。'), more: [t('點下面「👫 好友」'), t('邀朋友來玩，可以拿到造型')], go: ['friends', t('👉 打開好友')] },
      { ic: '🌙', title: t('晚上活動'), line: t('晚上 7～11 點，每半小時有小活動。'), more: [t('疊石接力、找金松果⋯⋯'), t('晚上 8～10 點營火旁會有寶藏 ✨'), t('營火時間有流星雨 🌠')] },
      ...(this.ctx.payOn?.()
        ? [{ ic: '🎫', title: t('月票'), line: t('支持營地，每天多拿一點松果。'), more: [t('🔥 小營火：每天多 20 顆'), t('✨ 星空：每天多 40 顆'), t('可以買月票家具、跳色'), t('1 個月或 3 個月，不會自動續扣'), t('未成年請先問爸爸媽媽')], go: ['pass', t('👉 看月票')] }]
        : []),
      { ic: '📖', title: t('圖鑑'), line: t('收集到的魚和東西，都會收在圖鑑裡。'), more: [t('第一次收集到新東西有松果'), t('全部收集完還有獎勵 🎁')] },
    ];
  }

  #go(id) {
    const { modal, go } = this.ctx;
    if (id === 'spiritRules') return this.openManual(this.#pages().findIndex((p) => p.ic === '✨'));
    modal.close();
    if (go[id]) return go[id]();
    go.place(id);
  }

  /** ❓ 常見問題 */
  openFaq() {
    const { modal } = this.ctx;
    const faq = this.#faq();
    modal.open(
      t('❓ 常見問題'),
      `<div class="help-faq">
        ${faq.map((f, i) => `<div class="hf-row"><b class="hf-q">${f.q}</b><div class="hf-a">${f.a}</div><button type="button" class="mini-btn hf-go" data-hgo="${i}">${f.btn}</button></div>`).join('')}
        <button type="button" class="help-manual-btn" id="help-manual">${t('📖 看營地手冊')}</button>
      </div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-hgo]')) b.addEventListener('click', () => this.#go(faq[Number(b.dataset.hgo)].go));
        body.querySelector('#help-manual').addEventListener('click', () => this.openManual());
      },
    );
  }

  /** 📖 營地手冊（一頁一頁翻） */
  openManual(page = this.page) {
    const { modal } = this.ctx;
    const pages = this.#pages();
    this.page = Math.max(0, Math.min(pages.length - 1, page));
    const p = pages[this.page];
    modal.open(
      t('📖 營地手冊'),
      `<div class="help-manual">
        <div class="hm-tabs">${pages.map((x, i) => `<button type="button" class="hm-tab${i === this.page ? ' on' : ''}" data-page="${i}" title="${x.title}">${x.ic}</button>`).join('')}</div>
        <div class="hm-page">
          <div class="hm-ic">${p.ic}</div>
          <div class="hm-title">${p.title}</div>
          <div class="hm-line">${p.line}</div>
          ${p.go ? `<button type="button" class="mini-btn hm-go" id="hm-go">${p.go[1]}</button>` : ''}
          <details class="hm-more"><summary>${t('看更多')}</summary><ul>${p.more.map((m) => `<li>${m}</li>`).join('')}</ul></details>
        </div>
        <div class="hm-nav">
          <button type="button" class="mini-btn" id="hm-prev" ${this.page === 0 ? 'disabled' : ''}>◀</button>
          <span>${this.page + 1} / ${pages.length}</span>
          <button type="button" class="mini-btn" id="hm-next" ${this.page === pages.length - 1 ? 'disabled' : ''}>▶</button>
        </div>
        <button type="button" class="help-manual-btn" id="hm-faq">${t('❓ 常見問題')}</button>
      </div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-page]')) b.addEventListener('click', () => this.openManual(Number(b.dataset.page)));
        body.querySelector('#hm-prev').addEventListener('click', () => this.openManual(this.page - 1));
        body.querySelector('#hm-next').addEventListener('click', () => this.openManual(this.page + 1));
        body.querySelector('#hm-go')?.addEventListener('click', () => this.#go(p.go[0]));
        body.querySelector('#hm-faq').addEventListener('click', () => this.openFaq());
      },
    );
  }
}
