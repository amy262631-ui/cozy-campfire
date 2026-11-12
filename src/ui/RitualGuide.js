import * as THREE from 'three';
import { GlowLight } from '../scene/GlowLight.js'; // 裝飾小燈用光暈代替真的光源（效能）
import { t } from '../i18n/i18n.js';

const FIRST_KEY = 'cozy-campfire-first-quest';
const LAST_KEY = 'cozy-campfire-last-quest';
/** 按過 ✕：這台裝置之後不再自動跳出任務卡（改按「💡 今日小靈感」） */
const QUIET_KEY = 'cozy-campfire-quest-quiet';
/**
 * 🌱 新手小任務（11/07 改版，有小學生在玩：一次一件事、大字、每句 12 字內）
 * 1 走到營火旁邊 → 2 坐在木頭上 → 3 丟一根木頭 → 4 烤一個棉花糖 → 5 去湖邊釣一條魚 → 6 去小舖看帳篷
 * 做完 6 步送 20 松果。之後買了帳篷，再跳第 7 步「去我的帳篷」。
 */
const INTRO = ['k_fire', 'k_sit', 'k_wood', 'k_roast', 'k_fish', 'k_shop'];
const INTRO_KEY = 'cozy-kid-intro';
/** 第 7 步（有帳篷之後）做過了沒 */
const HOME_KEY = 'cozy-kid-home';
const store = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {
    /* 無痕模式 */
  }
  return null;
};

/** 到某個點的距離（扣掉一點互動範圍） */
const dist = (a, b, pad = 0) => Math.max(0, Math.hypot(a.x - b.x, a.z - b.z) - pad);

/**
 * 小任務：每次進來都會隨機給一個小任務，並且一步一步帶你做。
 * 第一次來的新玩家固定是「疊石許願」（最簡單、最有感覺）。
 * 完成後告訴你「你是今天第 N 位完成的旅人」，可以再來一個或分享。
 *
 * 每個任務：
 *   guide(s) → { step, text, target }   目前第幾步、提示文字、光柱指引位置（null＝不顯示）
 *   on       完成的事件名稱（main.js 呼叫 guide.event(name, data)）
 */
function buildTasks(touch) {
  const k = (key, btn) => (touch ? btn : key); // 電腦顯示按鍵、手機顯示按鈕

  const back = { step: 0, text: t('回到營火旁，就能開始囉'), target: null };
  const walk = (s, target, near, farText, nearText) => {
    const d = dist(s.pos, target, 1.2);
    return d > near ? { step: 0, text: t(farText, { n: Math.ceil(d) }), target } : { step: 1, text: nearText, target };
  };

  // 🌱 新手小任務：text＝大字（12 字內），sub＝小字操作提示（手機、電腦各自的）
  const kidWalk = (s, target, near, big) => {
    const d = dist(s.pos, target, 0.6);
    return { step: d > near ? 0 : 1, text: big, sub: d > near ? t('還有 {n} 公尺', { n: Math.ceil(d) }) + '・' + k(t('用 WASD 走路'), t('用左下角搖桿走路')) : null, target };
  };
  const kidBack = (s) => ({ step: 0, text: t('先回到營火旁'), sub: t('點「🧭 去哪裡」→「🔥 中央營火」'), target: null, go: true });
  const kid = {
    k_fire: {
      icon: '👉',
      name: t('走到營火旁邊'),
      auto: (s) => s.inForest && dist(s.pos, s.fire) < 3.2,
      guide(s) {
        if (!s.inForest) return kidBack(s);
        return kidWalk(s, s.fire, 2.6, t('走到營火旁邊'));
      },
    },
    k_sit: {
      icon: '🪵',
      name: t('坐在木頭上'),
      auto: (s) => s.seatFire,
      guide(s) {
        if (!s.inForest) return kidBack(s);
        const seat = s.freeSeat();
        const d = dist(s.pos, seat, 0.3);
        return { step: d > 0.6 ? 0 : 1, text: t('坐在木頭上'), sub: d > 0.6 ? t('走到發光的圓木旁') : k(t('按 E 坐下'), t('點右下「🪵 坐下」')), target: seat };
      },
    },
    k_wood: {
      icon: '🔥',
      name: t('丟一根木頭'),
      on: 'wood',
      guide(s) {
        if (!s.inForest) return kidBack(s);
        if (dist(s.pos, s.fire, 1.6) > 0.3) return kidWalk(s, s.fire, 0.3, t('丟一根木頭進營火'));
        return { step: 1, text: t('丟一根木頭進營火'), sub: k(t('按 E 添柴'), t('點右下「🪵 添柴」')), target: null };
      },
    },
    k_roast: {
      icon: '🍡',
      name: t('烤一個棉花糖'),
      on: 'roast',
      guide(s) {
        if (!s.inForest) return kidBack(s);
        if (s.state === 'roast') return { step: 2, text: t('變金黃色就收回！'), sub: k(t('再按一次 F'), t('再點一次「🍡 烤」')), target: null };
        if (dist(s.pos, s.fire, 1.6) > 0.3) return kidWalk(s, s.fire, 0.3, t('烤一個棉花糖'));
        return { step: 1, text: t('烤一個棉花糖'), sub: k(t('按 F 開始烤'), t('點右下「🍡 烤」')), target: null };
      },
    },
    k_fish: {
      icon: '🎣',
      name: t('去湖邊釣一條魚'),
      on: 'fish',
      guide(s) {
        if (s.roomId === 'lake_dock') {
          if (s.state === 'fish') return { step: 2, text: t('浮標沉下去就拉！'), sub: k(t('浮標整個沉下去時按 F'), t('浮標整個沉下去時點「🎣」')), target: null };
          return { step: 1, text: t('走到碼頭盡頭'), sub: k(t('按 F 開始釣魚'), t('點右下「🎣 釣魚」')), target: s.dockEnd };
        }
        if (!s.inForest) return kidBack(s);
        const d = dist(s.pos, s.lakeGate, 0.5);
        return { step: 0, text: t('去湖邊釣一條魚'), sub: t('走進發光的路口（{n} 公尺）', { n: Math.ceil(d) }), target: s.lakeGate };
      },
    },
    k_shop: {
      icon: '🛒',
      name: t('去小舖看帳篷'),
      on: 'shop',
      guide(s) {
        const sub = t('帳篷 {p} 顆，你有 {n} 顆 🌰', { p: s.tentPrice, n: s.coins ?? 0 });
        if (!s.inForest) return { step: 0, text: t('去小舖看帳篷'), sub: t('點右邊「🛒 小舖」'), target: null };
        const d = dist(s.pos, s.shopFront, 0.8);
        return { step: d > 1 ? 0 : 1, text: t('去小舖看帳篷'), sub: d > 1 ? sub : k(t('按 E 打開小舖'), t('點右下「🏪 小舖」')), target: s.shopFront };
      },
    },
    k_home: {
      icon: '🏠',
      name: t('去我的帳篷'),
      auto: (s) => s.inMyHome,
      guide: () => ({ step: 0, text: t('去我的帳篷'), sub: t('點「🧭 去哪裡」→「🏠 我的帳篷」'), target: null, go: true }),
    },
  };
  for (const v of Object.values(kid)) v.kid = true;

  return {
    ...kid,
    stone: {
      icon: '🪨',
      name: t('疊石許願'),
      steps: 3,
      on: 'stone',
      guide(s) {
        if (!s.inForest) return back;
        if (!s.carrying) {
          const d = dist(s.pos, s.pile, 1.2);
          return {
            step: 0,
            text: d > 0.5 ? t('走到<b>發光的石頭堆</b>，撿一顆石頭（還有 {n} 公尺）', { n: Math.ceil(d) }) : k(t('按 <b>E</b> 撿一顆石頭'), t('點右下角的 <b>🪨 撿石頭</b>')),
            target: s.pile,
          };
        }
        const near = s.nearCairn >= 0;
        return {
          step: near ? 2 : 1,
          text: near ? k(t('按 <b>E</b> 把石頭疊上去，許個願 🙏'), t('點右下角的 <b>🗿 疊上去</b>，許個願 🙏')) : t('頂著石頭，走到<b>發光的石塔</b>旁'),
          target: s.cairnTop(near ? s.nearCairn : s.nearestCairn),
        };
      },
    },

    wood: {
      icon: '🔥',
      name: t('守護營火'),
      steps: 2,
      on: 'wood',
      guide(s) {
        if (!s.inForest) return back;
        return walk(s, s.fire, 1.6, '走到<b>營火</b>旁（還有 {n} 公尺）', k(t('按 <b>E</b> 幫營火添一根柴'), t('點右下角的 <b>🪵 添柴</b>')));
      },
    },

    roast: {
      icon: '🍡',
      name: t('完美棉花糖'),
      steps: 3,
      on: 'roast',
      guide(s) {
        if (!s.inForest) return back;
        if (s.state === 'roast') {
          return { step: 2, text: k(t('烤到<b>金黃色</b>時，再按一次 <b>F</b> 收回 ✨'), t('烤到<b>金黃色</b>時，再點一次 <b>🍡 烤</b> 收回 ✨')), target: null };
        }
        return walk(s, s.fire, 1.6, '走到<b>營火</b>旁（還有 {n} 公尺）', k(t('按 <b>F</b> 開始烤棉花糖'), t('點右下角的 <b>🍡 烤</b>')));
      },
    },

    kuji: {
      icon: '🎋',
      name: t('抽籤問運勢'),
      steps: 2,
      on: 'kuji',
      guide(s) {
        if (!s.inForest) return back;
        return walk(s, s.shrine, 1.2, '走到<b>地藏祈福處</b>（還有 {n} 公尺）', k(t('按 <b>E</b>，選「🎋 抽籤」'), t('點 <b>⛩️ 祈福</b>，選「🎋 抽籤」')));
      },
    },

    ema: {
      icon: '📝',
      name: t('掛一塊繪馬'),
      steps: 2,
      on: 'ema',
      guide(s) {
        if (!s.inForest) return back;
        return walk(s, s.shrine, 1.2, '走到<b>地藏祈福處</b>（還有 {n} 公尺）', k(t('按 <b>E</b>，選「📝 寫繪馬」寫下一個願望'), t('點 <b>⛩️ 祈福</b>，選「📝 寫繪馬」寫下一個願望')));
      },
    },

    note: {
      icon: '📌',
      name: t('留言給陌生人'),
      steps: 2,
      on: 'note',
      guide(s) {
        if (!s.inForest) return back;
        return walk(s, s.board, 1.0, '走到<b>營火告示牌</b>（還有 {n} 公尺）', k(t('按 <b>E</b> 打開告示牌，貼一張便條給之後來的人'), t('點 <b>📌 告示牌</b>，貼一張便條給之後來的人')));
      },
    },

    fish: {
      icon: '🎣',
      name: t('湖邊釣一條魚'),
      steps: 3,
      on: 'fish',
      guide(s) {
        if (s.roomId === 'lake_dock') {
          if (s.state === 'fish') return { step: 2, text: k(t('發光的浮標整個沉下去時，快按 <b>F</b> 拉竿！（只點一下是魚在試探，先別拉）'), t('發光的浮標整個沉下去時，快點 <b>🎣</b> 拉竿！（只點一下是魚在試探，先別拉）')), target: null };
          return { step: 1, text: k(t('走到<b>碼頭盡頭</b>或岸邊，按 <b>F</b> 坐下釣魚'), t('走到<b>碼頭盡頭</b>或岸邊，點 <b>🎣 釣魚</b>')), target: s.dockEnd };
        }
        if (!s.inForest) return back;
        const d = dist(s.pos, s.lakeGate, 0.5);
        return { step: 0, text: t('走進<b>湖畔碼頭</b>的入口（還有 {n} 公尺）', { n: Math.ceil(d) }), target: s.lakeGate };
      },
    },

    hang: {
      icon: '🌳',
      name: t('裝飾心願大樹'),
      steps: 2,
      on: 'hang',
      guide(s) {
        if (!s.inForest) return back;
        return walk(s, s.tree, 1.8, '走到<b>心願大樹</b>下（還有 {n} 公尺）', k(t('按 <b>E</b>，用松果換一個裝飾掛上去'), t('點 <b>🌳 大樹</b>，用松果換一個裝飾掛上去')));
      },
    },

    meteor: {
      icon: '🌠',
      name: t('看見一顆流星'),
      steps: 2,
      on: 'meteor',
      guide(s) {
        if (!s.outdoor) return { step: 0, text: t('走到戶外，才看得到星空'), target: null };
        if (s.state === 'stargaze') return { step: 1, text: t('靜靜等一顆<b>流星</b>劃過 🌠'), target: null };
        return { step: 0, text: k(t('按 <b>空白鍵</b> 躺下來仰望星空'), t('點右下角的 <b>✨ 星空</b>')), target: null };
      },
    },
  };
}

export class RitualGuide {
  /** 這台裝置還沒完成過任何小任務（新來的旅人） */
  static isNewbie() {
    try {
      return !localStorage.getItem(FIRST_KEY);
    } catch {
      return false;
    }
  }

  /**
   * @param {{ scene, hud, touch?: boolean, onDone?: (id) => Promise<number|null> }} opts
   *   onDone：任務完成時呼叫，回傳「今天第幾位完成」（單人模式回傳 null）
   */
  constructor({ scene, hud, touch = false, onDone, canPick, onShare, onComplete, onIntroDone, onKidStep, root = document.getElementById('ui') }) {
    this.onKidStep = onKidStep;
    this.onIntroDone = onIntroDone;
    this.hud = hud;
    /** 任務完成時通知 main.js（第一次來的人完成第一個任務後，才跳出歡迎卡） */
    this.onComplete = onComplete;
    /** 第一次來（還沒完成過任何小任務）：一進來就直接開始任務，不先擋一張歡迎卡 */
    this.newbie = RitualGuide.isNewbie();
    /** 分享（做成圖片卡）；沒有的話就只分享文字 */
    this.onShare = onShare;
    /** 某個任務現在能不能出（例如松果不夠就不出「裝飾心願大樹」） */
    this.canPick = canPick ?? (() => true);
    this.touch = touch;
    this.onDone = onDone;
    this.tasks = buildTasks(touch);
    this.active = true;
    this.done = false;
    this._v = new THREE.Vector3();

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="ritual" id="ritual" hidden>
        <button type="button" class="ritual-x" id="ritual-x" aria-label="close">×</button>
        <div class="ritual-title" id="ritual-title"></div>
        <div class="ritual-text" id="ritual-text"></div>
        <div class="ritual-sub" id="ritual-sub" hidden></div>
        <div class="ritual-dots" id="ritual-dots"></div>
        <div class="ritual-actions" id="ritual-actions" hidden>
          <button type="button" id="ritual-next">${t('🎲 再來一個')}</button>
          <button type="button" id="ritual-share">${t('📤 分享')}</button>
        </div>
      </div>
      <div class="ritual-arrow" id="ritual-arrow" hidden>➤</div>
      `,
    );
    this.el = root.querySelector('#ritual');
    this.titleEl = root.querySelector('#ritual-title');
    this.textEl = root.querySelector('#ritual-text');
    this.subEl = root.querySelector('#ritual-sub');
    this.goChip = document.getElementById('go-chip');
    this.dotsEl = root.querySelector('#ritual-dots');
    this.actionsEl = root.querySelector('#ritual-actions');
    this.arrow = root.querySelector('#ritual-arrow');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.querySelector('#ritual-x').addEventListener('click', () => {
      if (!this.task?.kid) store(QUIET_KEY, '1'); // 新手小任務按 ✕ 只是先收起來，角落按鈕還能叫回來
      this.finish();
    });
    // 角落的「💡 今日小靈感」：任務卡收起來時才出現，按了就給一個小任務
    this.ideaBtn = document.createElement('button');
    this.ideaBtn.type = 'button';
    this.ideaBtn.className = 'home-chip idea-chip';
    this.ideaBtn.textContent = t('💡 今日小靈感');
    this.ideaBtn.hidden = true;
    this.ideaBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.ideaBtn.addEventListener('click', () => this.open());
    (document.getElementById('online') ?? root).append(this.ideaBtn);
    root.querySelector('#ritual-next').addEventListener('click', () => this.#start(this.#pick()));
    root.querySelector('#ritual-share').addEventListener('click', () => this.#share());

    // 3D 指引：目標上方一道淡淡的光柱＋上下飄的光點
    this.beacon = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.5, 7, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd28a,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    pillar.position.y = 3.5;
    this.beacon.add(pillar);
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
    this.beacon.add(this.orb);
    const glow = new GlowLight(0xffc77a, 1.4, 4);
    glow.position.y = 1.2;
    this.beacon.add(glow);
    this.beacon.visible = false;
    scene.add(this.beacon);

    // 👣 新手小任務：地上一串發亮的小腳印，從自己腳邊一路指向目標（11/09 作者：不讀字也知道往哪走）
    this.feet = new THREE.Group();
    const soleGeo = new THREE.CircleGeometry(1, 14);
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const foot = new THREE.Group();
      const sole = new THREE.Mesh(soleGeo, mat);
      sole.scale.set(0.11, 0.17, 1);
      const toe = new THREE.Mesh(soleGeo, mat);
      toe.scale.set(0.07, 0.07, 1);
      toe.position.y = 0.23;
      foot.add(sole, toe);
      foot.rotation.x = -Math.PI / 2;
      foot.userData.mat = mat;
      this.feet.add(foot);
    }
    this.feet.visible = false;
    scene.add(this.feet);

    // 第一次來：直接帶新手小任務（之前做到一半的，下次進來接著做）；老玩家不自動跳出，改按角落的「💡 今日小靈感」
    const intro = this.nextIntro();
    if (intro) this.#start(intro);
    else this.finish();
  }

  /** 老玩家換新裝置（伺服器說玩超過一天）：還沒開始做的新手小任務就不跑了 */
  skipIntroIfVeteran() {
    if (this.#introDone().length || !this.task?.kid || this.id !== INTRO[0]) return;
    store(INTRO_KEY, JSON.stringify([...INTRO]));
    store(HOME_KEY, '1');
    store(FIRST_KEY, '1');
    this.newbie = false;
    this.done = true;
    this.finish();
  }

  /** 新手小任務做完了的清單 */
  #introDone() {
    try {
      const v = JSON.parse(localStorage.getItem(INTRO_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  /** 新手小任務還在進行中（第一次來，或之前做到一半） */
  get kidMode() {
    const done = this.#introDone();
    return (this.newbie || done.length > 0) && INTRO.some((id) => !done.includes(id));
  }

  /** 🏠 第 7 步：新手小任務做完、買了帳篷，還沒進過自己的帳篷 → 帶他去（main.js 在帳篷資料更新時呼叫） */
  checkHome(hasTent, inMyHome) {
    if (!hasTent || store(HOME_KEY)) return;
    const done = this.#introDone();
    if (!done.includes('k_shop')) return;
    if (inMyHome) {
      store(HOME_KEY, '1');
      return;
    }
    if (this.active && !this.done && this.task) return; // 正在做別的任務，先不要打斷
    this.#start('k_home');
  }

  /** 按「💡 今日小靈感」：還有沒做完的就叫回來，不然換一個新的 */
  open() {
    if (this.task && this.active && !this.done) {
      this.el.hidden = false;
      this.ideaBtn.hidden = true;
      return;
    }
    this.#start(this.task && !this.done ? this.id : this.#pick()); // 做到一半按 ✕ 的，接著做同一個
  }

  /** 隨機挑一個任務（不要跟上一個一樣） */
  #pick() {
    let last = this.id;
    try {
      last ??= localStorage.getItem(LAST_KEY);
    } catch {
      /* 無痕模式 */
    }
    const intro = this.nextIntro();
    if (intro) return intro;
    const ids = Object.keys(this.tasks).filter((id) => id !== last && !this.tasks[id].kid && this.canPick(id));
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /** 新手還沒做完的教學任務（第一次來的那幾天才有） */
  nextIntro() {
    if (!this.kidMode) return null;
    const done = this.#introDone();
    return INTRO.find((id) => !done.includes(id) && this.tasks[id]) ?? null;
  }

  #start(id) {
    if (id === INTRO[0] && !this.#introDone().length) this.onKidStep?.('start'); // 📊 統計：新朋友看到第 1 步
    this.id = id;
    this.task = this.tasks[id];
    this.active = true;
    this.done = false;
    this._key = null;
    // 🌱 新手小任務：標題只寫第幾步，大字在下面；卡片亮一點
    const kid = !!this.task.kid;
    const i = INTRO.indexOf(id);
    this.titleEl.textContent = kid
      ? i >= 0
        ? `🌱 ${t('新手小任務 {i}/{n}', { i: i + 1, n: INTRO.length })}`
        : `🌱 ${t('最後一步！')}`
      : `${this.task.icon} ${t('小任務：{name}', { name: this.task.name })}`;
    this.el.classList.toggle('first', kid);
    this.el.classList.toggle('kid', kid);
    this.dotsEl.innerHTML = kid ? '' : '<i></i>'.repeat(this.task.steps);
    this.subEl.hidden = true;
    this.#glowGo(false);
    this.ideaBtn.textContent = kid ? t('🌱 新手小任務') : t('💡 今日小靈感');
    this.ideaBtn.classList.toggle('kid-chip', kid);
    this.actionsEl.hidden = true;
    this.el.classList.remove('done');
    this.el.hidden = false;
    if (this.ideaBtn) this.ideaBtn.hidden = true;
    try {
      localStorage.setItem(LAST_KEY, id);
    } catch {
      /* 無痕模式 */
    }
  }

  update(dt, time, s) {
    if (!this.active || this.done) {
      this.beacon.visible = false;
      if (this.feet) this.feet.visible = false;
      this.arrow.hidden = true;
      return;
    }
    if (this.task.auto?.(s)) {
      this.done = true;
      this.#complete(null);
      return;
    }
    const g = this.task.guide(s);
    const key = `${g.step}|${g.text}|${g.sub ?? ''}`;
    if (key !== this._key) {
      this._key = key;
      this.textEl.innerHTML = this.task.kid ? `${this.task.icon} ${g.text}` : g.text;
      this.subEl.hidden = !g.sub;
      this.subEl.textContent = g.sub ?? '';
      [...this.dotsEl.children].forEach((d, i) => d.classList.toggle('on', i <= g.step));
      this.#glowGo(!!g.go && !this.el.hidden);
    }
    this.#walkFeet(s, g, time);
    if (!g.target) {
      this.beacon.visible = false;
      if (this.feet) this.feet.visible = false;
      this.arrow.hidden = true;
      return;
    }
    this.beacon.visible = true;
    this.beacon.position.set(g.target.x, 0, g.target.z);
    this.orb.position.y = 1.4 + Math.sin(time * 2.2) * 0.18;
    if (s.camera) this.#pointArrow(s.camera, g.target, time);
  }

  /**
   * 遊戲裡發生的事（main.js 呼叫）：剛好是目前任務要的，就完成
   * @param {string} name  stone | wood | roast | kuji | ema | note | fish | meteor
   * @param {any} [data]   stone：伺服器給的「今天第幾位」；roast：熟度；fish：是不是垃圾
   */
  async event(name, data) {
    if (!this.active || this.done || this.task.on !== name) return;
    if (name === 'roast' && !this.task.kid && !(data >= 0.35 && data < 0.75)) {
      this.hud.toast(t('差一點！要在金黃色的時候收回，再烤一顆試試 🍡'), 3500);
      return;
    }
    if (name === 'fish' && data?.junk) {
      this.hud.toast(t('這個不算魚啦 😆 再甩一次竿'), 3000);
      return;
    }
    this.done = true;
    const n = name === 'stone' ? data : await this.onDone?.(name);
    this.#complete(n ?? null);
  }

  /** 👣 新手小任務才有：目標還在 1.5 公尺外時，腳印從腳邊往目標一閃一閃（像有人走在前面帶路） */
  #walkFeet(s, g, time) {
    const p = s.pos;
    const tg = g.target;
    const d = tg && p ? Math.hypot(tg.x - p.x, tg.z - p.z) : 0;
    if (!this.task?.kid || !tg || d < 1.5) {
      this.feet.visible = false;
      return;
    }
    this.feet.visible = true;
    const dx = (tg.x - p.x) / d;
    const dz = (tg.z - p.z) / d;
    const ang = Math.atan2(dx, dz);
    const gap = 0.75;
    const n = Math.min(this.feet.children.length, Math.floor((d - 0.6) / gap));
    const wave = (time * 3) % (n + 3);
    this.feet.children.forEach((f, i) => {
      if (i >= n) return (f.userData.mat.opacity = 0);
      const along = 0.7 + i * gap;
      const side = i % 2 ? 0.13 : -0.13;
      f.position.set(p.x + dx * along + dz * side, 0.06, p.z + dz * along - dx * side);
      f.rotation.z = ang + Math.PI;
      const near = Math.max(0, 1 - Math.abs(wave - i) / 2.2);
      f.userData.mat.opacity = 0.4 + near * 0.55;
    });
  }

  /** 「🧭 去哪裡」按鈕閃一閃（要玩家去點它的時候） */
  #glowGo(on) {
    this.goChip ??= document.getElementById('go-chip');
    this.goChip?.classList.toggle('tut-glow', on);
  }

  /** 🌱 新手小任務完成一步：大大的「做到了！」，自動接下一步 */
  #completeKid() {
    this.beacon.visible = false;
    if (this.feet) this.feet.visible = false;
    this.arrow.hidden = true;
    this.#glowGo(false);
    this.subEl.hidden = true;
    this.textEl.innerHTML = `🎉 ${t('做到了！')}`;
    this.el.classList.add('done');
    this.completed = true;
    store(FIRST_KEY, '1');
    if (this.id === 'k_home') {
      store(HOME_KEY, '1');
      this.subEl.hidden = false;
      this.subEl.textContent = t('可以買家具布置你的家 🪑');
      setTimeout(() => this.done && this.id === 'k_home' && this.finish(), 6000);
      return;
    }
    const done = this.#introDone();
    if (!done.includes(this.id)) done.push(this.id);
    store(INTRO_KEY, JSON.stringify(done));
    const firstTime = done.length === 1;
    this.onComplete?.(this.task, firstTime, this.id);
    const next = this.nextIntro();
    if (next) {
      setTimeout(() => this.done && this.id !== next && this.#start(next), 1800);
      return;
    }
    // 6 步都做完了：送 20 顆松果（main.js 問伺服器）
    this.titleEl.textContent = `🌱 ${t('新手小任務完成！')}`;
    this.subEl.hidden = false;
    this.subEl.textContent = t('送你 20 顆松果 🌰');
    this.onIntroDone?.();
    setTimeout(() => this.done && this.id === 'k_shop' && this.finish(), 7000);
  }

  #complete(n) {
    if (this.task.kid) return this.#completeKid();
    this.n = n;
    this.beacon.visible = false;
    if (this.feet) this.feet.visible = false;
    this.arrow.hidden = true;
    [...this.dotsEl.children].forEach((d) => d.classList.add('on'));
    this.textEl.innerHTML = n
      ? t('完成了！你是今天第 <b>{n}</b> 位完成「{name}」的旅人 ✨', { n, name: this.task.name })
      : t('完成了！「{name}」✨', { name: this.task.name });
    this.actionsEl.hidden = false;
    this.el.classList.add('done');
    this.el.classList.remove('first');
    const firstTime = this.newbie && !this.completed;
    this.completed = true;
    this.onComplete?.(this.task, firstTime);
    try {
      localStorage.setItem(FIRST_KEY, '1');
    } catch {
      /* 無痕模式 */
    }
  }

  /** 這次先不做任務（下次進來還會有新的） */
  finish() {
    this.active = false;
    this.el.hidden = true;
    this.#glowGo(false);
    // 新手小任務做到一半收起來：角落按鈕變「🌱 新手小任務」，按了接著做
    const kidLeft = this.task?.kid && !this.done;
    this.ideaBtn.textContent = kidLeft ? t('🌱 新手小任務') : t('💡 今日小靈感');
    this.ideaBtn.classList.toggle('kid-chip', !!kidLeft);
    // 11/07 作者：「💡 今日小靈感」拿掉（有 ❓ 營地手冊就好）；只剩新手小任務做到一半時的「🌱 新手小任務」
    this.ideaBtn.hidden = !kidLeft;
    this.beacon.visible = false;
    if (this.feet) this.feet.visible = false;
    this.arrow.hidden = true;
  }

  /** 目標在畫面外時，在畫面邊緣顯示一個指向它的箭頭 */
  #pointArrow(camera, target, time) {
    const v = this._v.set(target.x, 1.2, target.z).project(camera);
    let { x, y } = v;
    const behind = v.z > 1;
    if (!behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.8) {
      this.arrow.hidden = true;
      return;
    }
    if (behind) {
      x = -x;
      y = -y;
    }
    const W = window.innerWidth / 2;
    const H = window.innerHeight / 2;
    let dx = x * W;
    let dy = -y * H;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) dy = 1;
    const k = Math.min((W - 44) / Math.abs(dx || 1e-6), (H - 70) / Math.abs(dy || 1e-6));
    dx *= k;
    dy *= k;
    const bob = Math.sin(time * 5) * 5;
    const ang = Math.atan2(dy, dx);
    this.arrow.hidden = false;
    this.arrow.style.transform = `translate(${W + dx - Math.cos(ang) * bob}px, ${H + dy - Math.sin(ang) * bob}px) translate(-50%, -50%) rotate(${ang}rad)`;
  }

  async #share() {
    if (this.onShare) {
      this.onShare({ icon: this.task.icon, name: this.task.name, n: this.n });
      return;
    }
    const url = location.origin + location.pathname;
    const text = this.n
      ? t('我是今天第 {n} 位在迷霧森林露營地完成「{name}」的旅人 {icon} 沒力氣出門的夜晚，一起來營火旁坐一下吧', { n: this.n, name: this.task.name, icon: this.task.icon })
      : t('沒力氣出門的夜晚，一起來迷霧森林露營地的營火旁坐一下吧 🔥');
    try {
      if (navigator.share) {
        await navigator.share({ title: t('迷霧森林露營地'), text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      this.hud.toast(t('已複製分享文字和網址 📋'));
    } catch {
      /* 使用者取消分享 */
    }
  }
}
