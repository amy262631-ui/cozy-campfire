import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

const FIRST_KEY = 'cozy-campfire-first-quest';
const LAST_KEY = 'cozy-campfire-last-quest';

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

  return {
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
  /**
   * @param {{ scene, hud, touch?: boolean, onDone?: (id) => Promise<number|null> }} opts
   *   onDone：任務完成時呼叫，回傳「今天第幾位完成」（單人模式回傳 null）
   */
  constructor({ scene, hud, touch = false, onDone, canPick, onShare, root = document.getElementById('ui') }) {
    this.hud = hud;
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
    this.dotsEl = root.querySelector('#ritual-dots');
    this.actionsEl = root.querySelector('#ritual-actions');
    this.arrow = root.querySelector('#ritual-arrow');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.querySelector('#ritual-x').addEventListener('click', () => this.finish());
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
    const glow = new THREE.PointLight(0xffc77a, 1.4, 4, 1.8);
    glow.position.y = 1.2;
    this.beacon.add(glow);
    this.beacon.visible = false;
    scene.add(this.beacon);

    // 第一次來：疊石許願；之後每次進來隨機
    let first = true;
    try {
      first = !localStorage.getItem(FIRST_KEY);
    } catch {
      /* 無痕模式 */
    }
    this.#start(first ? 'stone' : this.#pick());
  }

  /** 隨機挑一個任務（不要跟上一個一樣） */
  #pick() {
    let last = this.id;
    try {
      last ??= localStorage.getItem(LAST_KEY);
    } catch {
      /* 無痕模式 */
    }
    const ids = Object.keys(this.tasks).filter((id) => id !== last && this.canPick(id));
    return ids[Math.floor(Math.random() * ids.length)];
  }

  #start(id) {
    this.id = id;
    this.task = this.tasks[id];
    this.active = true;
    this.done = false;
    this._key = null;
    this.titleEl.textContent = `${this.task.icon} ${t('小任務：{name}', { name: this.task.name })}`;
    this.dotsEl.innerHTML = '<i></i>'.repeat(this.task.steps);
    this.actionsEl.hidden = true;
    this.el.classList.remove('done');
    this.el.hidden = false;
    try {
      localStorage.setItem(LAST_KEY, id);
    } catch {
      /* 無痕模式 */
    }
  }

  update(dt, time, s) {
    if (!this.active || this.done) {
      this.beacon.visible = false;
      this.arrow.hidden = true;
      return;
    }
    const g = this.task.guide(s);
    const key = `${g.step}|${g.text}`;
    if (key !== this._key) {
      this._key = key;
      this.textEl.innerHTML = g.text;
      [...this.dotsEl.children].forEach((d, i) => d.classList.toggle('on', i <= g.step));
    }
    if (!g.target) {
      this.beacon.visible = false;
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
    if (name === 'roast' && !(data >= 0.35 && data < 0.75)) {
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

  #complete(n) {
    this.n = n;
    this.beacon.visible = false;
    this.arrow.hidden = true;
    [...this.dotsEl.children].forEach((d) => d.classList.add('on'));
    this.textEl.innerHTML = n
      ? t('完成了！你是今天第 <b>{n}</b> 位完成「{name}」的旅人 ✨', { n, name: this.task.name })
      : t('完成了！「{name}」✨', { name: this.task.name });
    this.actionsEl.hidden = false;
    this.el.classList.add('done');
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
    this.beacon.visible = false;
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
