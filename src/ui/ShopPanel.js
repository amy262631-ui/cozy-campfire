import { t } from '../i18n/i18n.js';
import { FURNITURE, TENT_PRICE, CATS } from '../game/furniture.js';
import { gridOf, expandPrice, EXPAND_PRICES, GRID_MAX, ALL_COLORS, hasColors } from '../game/furnitureCatalog.js';
import { TENT_SHAPES, TENT_SHAPE_BY_ID, PASS_SHAPES, FRAME_COLORS } from '../game/tentShapes.js';
import { TENT_STYLES } from '../game/tentStyles.js';
import { TentPreview } from './TentPreview.js';
import { YARD_ITEMS, normYard, isBigYard, YARD_SMALL_MAX } from '../game/yardCatalog.js';
import { SIGNS } from '../game/signCatalog.js';
import { addCloseX } from './CloseX.js';

/**
 * 營地小舖：用松果買帳篷、家具。
 *   getCoins()  松果（單人模式 null）
 *   getHome()   { tent, inv, items }
 *   onBuy(id)   → Promise<boolean>
 *   onGoHome()  回到我的帳篷
 *   onEdit(op, data) 換帳篷造型／花色（op：shape / style）→ Promise
 */
export class ShopPanel {
  constructor({ getCoins, getHome, onBuy, onGoHome, onEdit, onGift, root = document.getElementById('ui') }) {
    Object.assign(this, { getCoins, getHome, onBuy, onGoHome, onEdit, onGift });
    this.busy = false;
    this.tab = 'look';
    this.cat = 'all'; // 家具分類
    this.pick = null; // 預覽中的造型（還沒買的也能先看）
    this.preview = new TentPreview(360, 190);
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="shop-panel" id="shop-panel">
        <div class="shop-card">
          <div class="shop-title">${t('🏪 營地小舖')}</div>
          <div class="shop-coins" id="shop-coins"></div>
          <div class="shop-body" id="shop-body"></div>
          <div class="shop-foot">
            <button type="button" class="shop-home" id="shop-home" hidden>${t('⛺ 回到我的帳篷')}</button>
            <button type="button" class="shop-close" id="shop-close">${t('關閉')}</button>
          </div>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#shop-panel');
    this.body = $('#shop-body');
    this.coinsEl = $('#shop-coins');
    this.homeBtn = $('#shop-home');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#shop-close').addEventListener('click', () => this.close());
    addCloseX($('#shop-close'), '.shop-card'); // 右上角 ✕
    this.homeBtn.addEventListener('click', () => {
      this.close();
      this.onGoHome?.();
    });
    this.body.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        this.tab = tab.dataset.tab;
        return this.render();
      }
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        this.cat = cat.dataset.cat;
        return this.render();
      }
      const home = this.getHome() ?? {};
      const sh = e.target.closest('[data-shape]');
      if (sh) {
        this.pick = sh.dataset.shape;
        // 已經有的造型：直接換上
        if ((home.shapes ?? ['bell']).includes(this.pick) && this.pick !== (home.shape ?? 'bell') && !this.busy) {
          this.busy = true;
          await this.onEdit?.('shape', { s: this.pick });
          this.busy = false;
        }
        return this.render();
      }
      if (e.target.closest('[data-gift]')) {
        this.close();
        return this.onGift?.();
      }
      const sty = e.target.closest('[data-style]');
      if (sty && !this.busy) {
        this.busy = true;
        await this.onEdit?.('style', { s: sty.dataset.style });
        this.busy = false;
        return this.render();
      }
      const sgb = e.target.closest('[data-sign]');
      if (sgb && !this.busy) {
        this.busy = true;
        await this.onEdit?.('sign', { s: sgb.dataset.sign });
        this.busy = false;
        return this.render();
      }
      const yd = e.target.closest('[data-yard]');
      if (yd && !this.busy) {
        this.busy = true;
        await this.onEdit?.('yard', { s: yd.dataset.yard, on: yd.dataset.on === '1' });
        this.busy = false;
        return this.render();
      }
      if (e.target.closest('[data-egg]') && !this.busy) {
        this.busy = true;
        await this.onEgg?.();
        this.busy = false;
        return this.render();
      }
      if (e.target.closest('[data-spgo]')) {
        this.close();
        return this.onSpirit?.();
      }
      if (e.target.closest('[data-needpass]')) return this.onNeedPass?.(); // 🎫 沒有月票：跳說明＋去看月票
      const fr = e.target.closest('[data-frame]');
      if (fr && !this.busy) {
        // 🔭 星空圓頂屋的骨架顏色（免費換）
        this.busy = true;
        await this.onEdit?.('frame', { s: fr.dataset.frame });
        this.busy = false;
        return this.render();
      }
      const hg = e.target.closest('[data-housego]');
      if (hg) {
        // 🎫 月票分頁的小屋卡片 → 到「⛺ 帳篷外觀」看預覽、買
        this.tab = 'look';
        this.pick = hg.dataset.housego;
        return this.render();
      }
      const fb = e.target.closest('[data-free]');
      if (fb && !this.busy) {
        // 🎁 星空月票每月免費挑 1 件月票家具
        this.busy = true;
        await this.onFree?.(fb.dataset.free, this.color ?? 0);
        this.busy = false;
        return this.render();
      }
      const col = e.target.closest('[data-color]');
      if (col) {
        this.color = Number(col.dataset.color);
        return this.render();
      }
      const btn = e.target.closest('[data-buy]');
      if (!btn || btn.disabled || this.busy) return;
      // 🛒 先看預覽、按「確定購買」才買
      if (this.onConfirm) {
        this.busy = true;
        const ok = await this.onConfirm(btn.dataset.buy, btn.dataset.c ? Number(btn.dataset.c) : 0);
        this.busy = false;
        if (!ok) return;
      }
      this.busy = true;
      this.body.classList.add('busy');
      await this.onBuy?.(btn.dataset.buy, btn.dataset.c ? Number(btn.dataset.c) : 0);
      this.busy = false;
      this.body.classList.remove('busy');
      this.render();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  /** @param {string} [tab] 從哪裡打開就跳到相關分頁：帳篷布置→furn（家具）、營火區攤位→照舊 */
  open(tab) {
    if (tab) this.tab = tab;
    this.el.classList.add('show');
    this.pick = null;
    this.render();
  }

  close() {
    this.el.classList.remove('show');
    this.preview.stop();
  }

  /** 把預覽畫面放進目前畫面上的位置 */
  #mountPreview(shape, style, frame) {
    const slot = this.body.querySelector('.shop-pv');
    if (!slot) return this.preview.stop();
    slot.appendChild(this.preview.canvas);
    this.preview.set(shape, style, frame);
    this.preview.start();
  }

  refresh() {
    if (this.isOpen) this.render();
  }

  /** ✨ 小精靈分類：🥚 孵蛋器（第一隻免費；買一個孵一隻新的小光點） */
  #renderSpirit(coins, hasTent) {
    this.preview.stop();
    const sp = this.spirit?.() ?? null;
    const none = !!sp?.none; // 還沒有小精靈：第一顆便宜、馬上孵
    const price = sp?.eggPrice ?? 300;
    const total = !sp || none ? 0 : 1 + (sp.box?.length ?? 0);
    const max = sp?.max ?? 12;
    const block = sp?.egg ? t('🥚 蛋正在孵，大約再 {n} 分鐘', { n: Math.max(1, Math.ceil(sp.egg.left / 60000)) }) : total >= max ? t('已經養滿 {n} 隻了', { n: max }) : coins != null && coins < price ? t('還差 {n} 顆松果', { n: price - coins }) : '';
    const tabs = hasTent
      ? `<div class="shop-tabs"><button type="button" data-tab="look">${t('⛺ 帳篷外觀')}</button><button type="button" data-tab="furn">${t('🪑 家具')}</button><button type="button" data-tab="expand">${t('📐 擴建')}</button><button type="button" data-tab="yard">${t('🚙 門口擺設')}</button>${this.passOn?.() ? `<button type="button" data-tab="pass">${t('🎫 月票')}</button>` : ''}<button type="button" data-tab="spirit" class="on">${t('✨ 小精靈')}</button></div>`
      : `<div class="shop-tabs"><button type="button" data-tab="look">${t('⛺ 帳篷')}</button><button type="button" data-tab="spirit" class="on">${t('✨ 小精靈')}</button></div>`;
    this.body.innerHTML = `${tabs}
      <div class="shop-egg">
        <div class="egg-pic">🥚</div>
        <div class="shop-pv-name">${none ? t('🥚 小精靈蛋（附孵蛋器）') : t('🥚 孵蛋器')}</div>
        <div class="shop-hint">${none ? t('買了馬上孵出一顆小光點，飄在你肩膀旁邊；玩遊戲、餵料理就會慢慢長大。') : t('放一顆小精靈蛋，10 分鐘後孵出一顆新的小光點，再靠玩遊戲把它養大。')}</div>
        <button type="button" class="shop-buy-tent" data-egg ${!sp || block ? 'disabled' : ''}>${none ? t('買小精靈蛋 🌰 {p}', { p: price }) : t('買孵蛋器 🌰 {p}', { p: price })}</button>
        ${block ? `<div class="shop-hint">${block}</div>` : ''}
        <div class="shop-hint">${none ? t('第一顆 {a} 🌰，之後想多養一隻，每顆 {b} 🌰（10 分鐘孵好）。', { a: price, b: 300 }) : t('現在養了 {n}／{m} 隻。', { n: total, m: max })}</div>
        <div class="shop-hint">${t('養好幾隻可以收起來，挑一隻帶在身邊；每一隻都可以取名字。')}</div>
        ${none ? '' : `<button type="button" class="mini-btn" data-spgo>${t('✨ 看我的小精靈')}</button>`}
      </div>`;
  }

  render() {
    const coins = this.getCoins();
    const home = this.getHome() ?? { tent: false, inv: {}, items: [] };
    this.coinsEl.innerHTML = coins == null ? t('目前是單人模式，連上伺服器後才能買東西') : t('你有 <b>🌰 {n}</b> 顆松果', { n: coins });
    this.homeBtn.hidden = !home.tent;
    // ✨ 小精靈分類：還沒買帳篷也能買孵蛋器
    if (this.tab === 'spirit') return this.#renderSpirit(coins, home.tent);
    if (!home.tent) {
      this.body.innerHTML = `
        <div class="shop-tent">
          <div class="shop-pv"></div>
          <div class="shop-tent-name">${t('我的小帳篷')}</div>
          <p>${t('買下之後，你就有一個自己的家：可以買家具慢慢布置，關掉網頁再回來也都還在。')}</p>
          <button type="button" class="shop-buy-tent" data-buy="tent" ${coins == null || coins < TENT_PRICE ? 'disabled' : ''}>${t('買下帳篷 🌰 {n}', { n: TENT_PRICE })}</button>
          ${coins != null && coins < TENT_PRICE ? `<div class="shop-hint">${t('還差 {n} 顆松果：做小任務、釣魚、每天來營火旁都能撿到 🌰', { n: TENT_PRICE - coins })}</div>` : ''}
          <div class="shop-hint">${t('買下後還能用松果解鎖馬戲團大帳、蘑菇小屋等造型 🎪🍄')}</div>
        </div>`;
      return this.#mountPreview('bell', 'classic');
    }
    const tabs = `
      <div class="shop-tabs">
        <button type="button" data-tab="look" class="${this.tab === 'look' ? 'on' : ''}">${t('⛺ 帳篷外觀')}</button>
        <button type="button" data-tab="furn" class="${this.tab === 'furn' ? 'on' : ''}">${t('🪑 家具')}</button>
        <button type="button" data-tab="expand" class="${this.tab === 'expand' ? 'on' : ''}">${t('📐 擴建')}</button>
        <button type="button" data-tab="yard" class="${this.tab === 'yard' ? 'on' : ''}">${t('🚙 門口擺設')}</button>
        ${this.passOn?.() ? `<button type="button" data-tab="pass" class="${this.tab === 'pass' ? 'on' : ''}">${t('🎫 月票')}</button>` : ''}
        <button type="button" data-tab="spirit">${t('✨ 小精靈')}</button>
      </div>`;
    if (this.tab === 'pass' && !this.passOn?.()) this.tab = 'furn';
    if (this.tab === 'yard') {
      this.preview.stop();
      const yd = normYard({ ...(home.yard ?? {}), sm: [...(home.yard?.sm ?? [])] });
      const own = yd.own ?? [];
      const smFull = yd.sm.length >= YARD_SMALL_MAX;
      const row = (y) => {
        const has = own.includes(y.id);
        const placed = yd.on === y.id || yd.sm.includes(y.id);
        const act = has
          ? placed
            ? `<button type="button" data-yard="${y.id}" data-on="0">${t('✅ 擺著中・收起來')}</button>`
            : !isBigYard(y.id) && smFull
              ? `<button type="button" disabled>${t('小型已滿 3 個')}</button>`
              : `<button type="button" data-yard="${y.id}" data-on="1">${isBigYard(y.id) && yd.on ? t('換成這個') : t('擺出來')}</button>`
          : `<button type="button" data-buy="yard_${y.id}" ${coins == null || coins < y.price ? 'disabled' : ''}>🌰 ${y.price}</button>`;
        return `<div class="yard-row${placed ? ' on' : ''}"><span class="yr-icon">${y.icon}</span><div class="yr-txt"><b>${t(y.zh)}</b><small>${t(y.note)}</small></div>${act}</div>`;
      };
      // 🪧 門牌：買過的可以隨時換；星空門牌（月票限定）月票還沒開放前先不顯示，有星空月票的人才看得到
      const ownSigns = home.signs ?? ['wood'];
      const curSign = home.sign ?? 'wood';
      const signRow = (sg) => {
        const using = curSign === sg.id;
        const has = sg.pass ? !!this.passStar?.() : ownSigns.includes(sg.id);
        const act = using
          ? `<button type="button" disabled>${t('✅ 使用中')}</button>`
          : has
            ? `<button type="button" data-sign="${sg.id}">${t('換上')}</button>`
            : sg.pass
              ? `<button type="button" disabled>${t('星空月票限定')}</button>`
              : `<button type="button" data-buy="sign_${sg.id}" ${coins == null || coins < sg.price ? 'disabled' : ''}>🌰 ${sg.price}</button>`;
        return `<div class="yard-row${using ? ' on' : ''}"><span class="yr-icon">${sg.icon}</span><div class="yr-txt"><b>${t(sg.zh)}</b><small>${t(sg.note)}</small></div>${act}</div>`;
      };
      // 大型一次 1 個、小型最多 3 個（11/07 改版）
      this.body.innerHTML = `${tabs}
        <div class="shop-sub">${t('擺在帳篷營地裡、你家門口，大家經過都看得到。大型擺設 1 個、小型擺設最多 3 個，買過的可以隨時換')}</div>
        <div class="yard-sec">${t('🚙 大型擺設（擺 1 個）')}</div>
        <div class="yard-list">${YARD_ITEMS.filter((y) => isBigYard(y.id)).map(row).join('')}</div>
        <div class="yard-sec">${t('🪑 小型擺設（最多 3 個，現在 {n} 個）', { n: yd.sm.length })}</div>
        <div class="yard-list">${YARD_ITEMS.filter((y) => !isBigYard(y.id)).map(row).join('')}</div>
        <div class="yard-sec">${t('🪧 門牌（寫著你的營位和名字）')}</div>
        <div class="yard-list">${SIGNS.filter((sg) => !sg.pass || this.passStar?.()).map(signRow).join('')}</div>`;
      return;
    }
    if (this.tab === 'look') {
      const owned = home.shapes ?? ['bell'];
      const cur = home.shape ?? 'bell';
      const pick = TENT_SHAPE_BY_ID[this.pick] ? this.pick : cur;
      const sh = TENT_SHAPE_BY_ID[pick];
      const has = owned.includes(pick);
      // 還沒買的造型，預覽用它的招牌花色
      const style = has ? home.style ?? 'classic' : sh.style ?? home.style ?? 'classic';
      const rank = this.passRank?.() ?? 0;
      const passLocked = sh.pass && rank < sh.pass; // 🎫 月票小屋：月票等級不夠
      const action = has
        ? `<div class="shop-using">${pick === cur ? t('✅ 使用中') : ''}</div>`
        : passLocked
          ? `<button type="button" class="shop-buy-tent pass-lock" data-needpass="1">${sh.pass >= 2 ? t('🔒 星空月票才可買') : t('🔒 有月票才可買（🔥 小營火、✨ 星空都可以）')}</button>`
          : `<button type="button" class="shop-buy-tent" data-buy="shape_${pick}" ${coins == null || coins < sh.price ? 'disabled' : ''}>${t('解鎖「{name}」🌰 {n}', { name: sh.name, n: sh.price })}</button>
           ${coins != null && coins < sh.price ? `<div class="shop-hint">${t('還差 {n} 顆松果', { n: sh.price - coins })}</div>` : ''}`;
      this.body.innerHTML = `${tabs}
        <div class="shop-pv"></div>
        <div class="shop-pv-name">${sh.icon} ${sh.name}</div>
        <div class="shop-shapes">
          ${[...TENT_SHAPES, ...(this.passOn?.() || PASS_SHAPES.some((x) => owned.includes(x.id)) ? PASS_SHAPES : [])].map(
            (x) => `<button type="button" class="shop-shape${x.id === pick ? ' on' : ''}${x.id === cur ? ' cur' : ''}${x.pass ? ' pass-item' : ''}" data-shape="${x.id}">
              <span class="ss-icon">${x.icon}</span><span class="ss-name">${x.name}</span>
              <span class="ss-price">${owned.includes(x.id) ? '✓' : `${x.pass ? '🎫 ' : ''}🌰 ${x.price}`}</span></button>`,
          ).join('')}
        </div>
        ${action}
        ${sh.pass && !has ? `<div class="shop-hint">${sh.id === 'stardome' ? t('🔭 屋頂是玻璃，屋裡永遠是星空；骨架顏色可以換，也能擴建') : t('🌳 大樹上的小木屋，有二樓、繩梯、陽台，屋裡有樹幹穿過')}</div><div class="shop-hint">${t('🎫 月票限定：買了永久是你的，月票到期也能繼續住')}</div>` : ''}
        ${pick === 'stardome' && has ? `<div class="shop-sub">${t('🔭 骨架顏色（免費換）')}</div>
        <div class="shop-styles">${FRAME_COLORS.map((f) => `<button type="button" class="build-style${f.id === (home.frame ?? 'gold') ? ' on' : ''}" data-frame="${f.id}"><span>${f.icon}</span>${t(f.zh)}</button>`).join('')}</div>` : ''}
        ${has ? `<div class="shop-sub">${t('🎨 花色（免費換）')}</div>
        <div class="shop-styles">${TENT_STYLES.map((x) =>
          x.gift && !(home.gifts ?? []).includes(x.id)
            ? `<button type="button" class="build-style shop-style-locked" data-gift="${x.id}" title="${x.pass ? t('營火月票限定') : t('分享送禮才拿得到')}"><span>🔒</span>${x.name}</button>`
            : `<button type="button" class="build-style${x.id === style ? ' on' : ''}" data-style="${x.id}"><span>${x.icon}</span>${x.name}</button>`,
        ).join('')}</div>` : ''}`;
      return this.#mountPreview(pick, style, home.frame ?? 'gold');
    }
    this.preview.stop();
    if (this.tab === 'expand') {
      const g = gridOf(home);
      const price = expandPrice(home);
      const next = g + 1;
      // 小小的格子圖：現在的地板＋擴建後多出來的一圈
      const n = price ? next : g;
      const off = g % 2 === 0 ? 1 : 0; // 跟伺服器一樣：舊地板在新地板裡的位置
      let cells = '';
      for (let z = 0; z < n; z++)
        for (let x = 0; x < n; x++) {
          const old = !price || (x - off >= 0 && z - off >= 0 && x - off < g && z - off < g);
          cells += `<i class="${old ? '' : 'new'}"></i>`;
        }
      const later = Object.entries(EXPAND_PRICES)
        .filter(([k]) => Number(k) > next)
        .map(([k, v]) => `${k}×${k} 🌰 ${v}`)
        .join('・');
      this.body.innerHTML = `${tabs}
        <div class="shop-expand">
          <div class="se-grid" style="grid-template-columns: repeat(${n}, 1fr)">${cells}</div>
          <div class="shop-pv-name">${t('現在的地板：{n}×{n}（{c} 格）', { n: g, c: g * g })}</div>
          ${
            price
              ? `<button type="button" class="shop-buy-tent" data-buy="expand" ${coins == null || coins < price ? 'disabled' : ''}>${t('擴建成 {n}×{n}（多 {m} 格）🌰 {p}', { n: next, m: next * next - g * g, p: price })}</button>
                 ${coins != null && coins < price ? `<div class="shop-hint">${t('還差 {n} 顆松果', { n: price - coins })}</div>` : ''}
                 ${later ? `<div class="shop-hint">${t('之後還能再擴建：{list}', { list: later })}</div>` : ''}`
              : `<div class="shop-using">${t('已經是最大的帳篷了 🎉')}（${GRID_MAX}×${GRID_MAX}）</div>`
          }
          <div class="shop-hint">${t('擴建後整頂帳篷會變大一圈，原本的家具會挪到新地板的中間。')}</div>
        </div>`;
      return;
    }
    const cats = `<div class="shop-cats">
      <button type="button" data-cat="all" class="${this.cat === 'all' ? 'on' : ''}">${t('全部')}</button>
      ${CATS.map((c) => `<button type="button" data-cat="${c.id}" class="${this.cat === c.id ? 'on' : ''}">${c.icon} ${c.name}</button>`).join('')}
    </div>`;
    const isPass = this.tab === 'pass';
    const pool = FURNITURE.filter((f) => !!f.pass === isPass); // 🎫 月票家具只在「月票」分頁
    const list = isPass || this.cat === 'all' ? pool : pool.filter((f) => f.cat === this.cat);
    const rank = this.passRank?.() ?? 0;
    // 🐟 魚缸：卡片上直接標能放幾星的魚（不用點開就看得到）
    const tag = (f) => (f.fish ? (f.fish >= 6 ? t('👑 魚王也行') : t('⭐{n} 以下', { n: f.fish })) : f.kind === 'small' ? t('可放桌上') : f.kind === 'mat' ? t('可墊底') : f.top ? t('上面可放') : '');
    const color = this.color ?? 0;
    // 🎫 月票跳色：月票開通後才列出來；沒有月票的人看得到、按了跳說明
    const colors = `<div class="shop-colors"><span>${t('🎨 顏色')}</span>${ALL_COLORS.filter((c) => !c.pass || this.passOn?.()).map(
      (c) => c.pass && rank < c.pass
        ? `<button type="button" data-needpass="1" class="pass-lock">🔒 ${c.icon} ${t(c.zh)}</button>`
        : `<button type="button" data-color="${c.id}" class="${c.id === color ? 'on' : ''}${c.pass ? ' pass-c' : ''}">${c.icon} ${t(c.zh)}</button>`,
    ).join('')}</div>`;
    // 🎁 星空月票：每月免費挑 1 件月票家具（free＝現在可以拿；freeNext＝下次可以拿的時間）
    const fr = isPass ? this.passFree?.() : null;
    const freeNow = !!fr?.ok;
    const houses = isPass
      ? `<div class="shop-sub">${t('🏠 月票小屋')}</div><div class="shop-houses">${PASS_SHAPES.map((x) => `<button type="button" class="shop-house pass-item" data-housego="${x.id}"><span class="si-icon">${x.icon}</span><b>${x.name}</b><small>${(home.shapes ?? []).includes(x.id) ? t('✓ 已經有了') : `🌰 ${x.price}・${x.pass >= 2 ? t('✨ 星空月票') : t('🔥✨ 月票')}`}</small><small class="sh-go">${t('👀 看樣子')}</small></button>`).join('')}</div><div class="shop-sub">${t('🪑 月票家具')}</div>`
      : '';
    const freeNote = isPass && fr?.star ? `<div class="shop-free${freeNow ? ' on' : ''}">${freeNow ? t('🎁 星空月票：這個月可以免費挑 1 件月票家具！按家具下面的「🎁 免費拿」') : t('🎁 這個月的免費家具已經拿了，{date} 可以再挑一件', { date: fr.next })}</div>` : '';
    this.body.innerHTML = `${tabs}
      <div class="shop-sub">${isPass ? t('🎫 月票限定：有月票的人用松果買，買了永久是你的（月票到期也不會收回）') : t('買了會放進背包，回帳篷按「🛠️ 布置」擺出來；買之前可以先選顏色')}</div>
      ${houses}${freeNote}
      ${isPass ? '' : cats}
      ${this.cat === 'fish' && !isPass ? `<div class="shop-hint">${t('🐟 每個魚缸放 1 條你釣過的魚；星星越多，放得下越稀有的魚')}</div>` : colors}
      <div class="shop-grid">
        ${list.map((f) => {
          const owned = home.inv?.[f.id] ?? 0;
          const tg = tag(f);
          const c = hasColors(f) ? color : 0;
          const locked = f.pass && rank < f.pass;
          return `
          <button type="button" class="shop-item${f.pass ? ' pass-item' : ''}" ${locked ? 'data-needpass="1"' : `data-buy="${f.id}"`} ${c ? `data-c="${c}"` : ''} ${!locked && !(freeNow && f.pass) && (coins == null || coins < f.price || owned >= (f.kind === 'wall' ? 80 : 20)) ? 'disabled' : ''}>
            ${c ? `<span class="si-color">${ALL_COLORS[c].icon}</span>` : ''}
            <span class="si-icon">${f.icon}</span>
            <span class="si-name">${f.name}</span>
            <span class="si-price">🌰 ${f.price}</span>
            ${tg ? `<span class="si-tag${f.fish ? ' fish' : ''}">${tg}</span>` : ''}
            ${owned ? `<span class="si-owned">${t('有 {n} 個', { n: owned })}</span>` : ''}
            ${f.pass ? `<span class="si-pass">${f.pass >= 2 ? t('✨ 星空月票才可買') : t('🔥✨ 月票才可買')}</span>` : ''}
            ${freeNow && f.pass ? `<span class="shop-free-btn" data-free="${f.id}" role="button">${t('🎁 免費拿')}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
      <div class="shop-hint">${t('💡 地墊上可以放家具；桌子、櫃子、床上可以再放「可放桌上」的小東西')}</div>`;
  }
}
