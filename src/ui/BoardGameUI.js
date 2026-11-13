import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { BOARD_GAMES, BOARD_MIN, BOARD_MAX, BOARD_WIN, boardOn } from '../game/boardGames.js';
import { makeStick, makeBubble } from '../player/boardProps.js';

/**
 * 🎲 營火桌遊的畫面（作者 11/13：坐在營火圓木上發起，不放桌椅）
 *   畫面下方一個小視窗（不擋營火）：發起 → 邀請（加入／先不要）→ 抽樹枝／吹泡泡 → 結果
 *   抽到的樹枝、吹的泡泡出現在每個人頭上（自己的、別人的都看得到）
 * 🐸 青蛙跳出來：像「戳戳樂」，小視窗裡一格一格的紙洞，輪流戳一個；沒有 3D 模型（作者 11/13：無實體、在遊戲畫面內就好）
 * 伺服器規則在 server/index.js 的「🎲 營火桌遊」，事件名稱 'bgame'（'bg' 是切到背景用的，不能共用）
 */
const RATE = 0.16; // 泡泡每秒長多大（跟伺服器一樣）
const GAME = Object.fromEntries(BOARD_GAMES.map((g) => [g.id, g]));

export class BoardGameUI {
  /**
   * @param o.net 連線
   * @param o.scene 3D 場景（頭上的道具放這裡）
   * @param o.hud toast 用
   * @param o.self () => ({ id, pos, sitting, inForest, name })
   * @param o.remotes 別人（get(id).group.position）
   */
  constructor({ net, scene, hud, self, remotes, audio, root = document.getElementById('ui') }) {
    this.net = net;
    this.scene = scene;
    this.hud = hud;
    this.self = self;
    this.remotes = remotes;
    this.audio = audio;
    this.g = null; // 現在這一局（伺服器送來的）
    this.picking = false; // 正在選要玩哪一個
    this.dismissed = null; // 按了「先不要」的那一局
    this.props = new Map(); // socket id → { obj, kind }
    this.blowing = false;
    this.mySize = 0;
    this.sentAt = 0;
    // 🔕 桌遊聲音開關（作者 11/13：噹噹噹太吵）；記在這台裝置
    try {
      this.quiet = localStorage.getItem('cozy-bg-quiet') === '1';
    } catch {
      this.quiet = false;
    }
    this.el = document.createElement('div');
    this.el.className = 'bg-panel';
    this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => this.#click(e));
    // 吹泡泡：按住吹、放開停
    const down = (e) => {
      if (!e.target.closest('[data-blow]')) return;
      e.preventDefault();
      this.blowing = true;
      this.el.querySelector('[data-blow]')?.classList.add('on');
    };
    const up = () => {
      if (!this.blowing) return;
      this.blowing = false;
      this.el.querySelector('[data-blow]')?.classList.remove('on');
      this.#sendBlow(true);
    };
    this.el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    net.on('bgame', (v) => this.#onGame(v));
    this._key = '';
  }

  get on() {
    return boardOn();
  }

  /** 走到營火（或重新連線）：問一下有沒有正在玩的 */
  async peek() {
    if (!this.on || !this.net.online) return;
    const r = await this.net.request('bgame', { op: 'peek' });
    if (r?.ok) this.#onGame(r.game ?? { state: 'gone' });
  }

  #sfx(name) {
    if (!this.quiet) this.audio?.sfx?.(name);
  }

  #mine() {
    const me = this.self();
    return this.g?.players?.find((p) => p.id === me.id) ?? null;
  }

  #onGame(v) {
    if (!v || v.state === 'gone') {
      if (!v || !this.g || v.id === this.g.id) {
        this.g = null;
        this.#clearProps();
      }
      this._key = '';
      return;
    }
    const prev = this.g;
    if (!prev || prev.id !== v.id) {
      this.#clearProps();
      this.mySize = 0;
      this.blowing = false;
    }
    // 音效（作者 11/13：小聲一點、只在跟自己有關時響）：坐著的人收到邀請、輪到我、我有玩的那局結束、我戳的那一下
    const me = this.self();
    const inIt = v.players?.some((p) => p.id === me.id);
    if (v.state === 'invite' && (!prev || prev.id !== v.id) && v.host.id !== me.id && me.sitting) this.#sfx('ding');
    if (v.state === 'play' && v.turn === me.id && prev?.turn !== me.id) this.#sfx('ding');
    if (v.game === 'frog' && prev?.id === v.id && (v.holes ?? []).some((h, i) => h === me.id && prev.holes?.[i] !== me.id)) this.#sfx('tap'); // 我戳了一下
    if (v.state === 'done' && prev?.state !== 'done') {
      if (inIt) this.#sfx('ding');
      const gain = v.gain?.[me.id];
      if (v.game === 'frog' && v.loser === me.id) this.hud.toast(t('🐸 啵！青蛙跳到你頭上了 😆'), 4000);
      if (v.winners?.includes(me.id)) this.hud.toast(gain ? t('🏆 你贏了！+{n} 🌰', { n: gain }) : t('🏆 你贏了！（今天桌遊的松果拿滿了）'), 4000);
    }
    this.g = v;
    this.#syncProps();
    this._key = '';
  }

  #clearProps() {
    for (const p of this.props.values()) this.scene.remove(p.obj);
    this.props.clear();
  }

  /** 頭上的道具：樹枝抽到才出現；泡泡開始就出現 */
  #syncProps() {
    const g = this.g;
    if (!g || g.state === 'invite') return this.#clearProps();
    const me = this.self();
    if (g.game === 'frog') return this.#clearProps(); // 🐸 只在小視窗裡玩，頭上不放東西
    for (const p of g.players) {
      let pr = this.props.get(p.id);
      if (g.game === 'stick') {
        if (!p.len) continue;
        if (pr && pr.len === p.len) continue;
        if (pr) this.scene.remove(pr.obj);
        const obj = makeStick(p.len);
        pr = { obj, kind: 'stick', len: p.len, t: 0 };
        this.scene.add(obj);
        this.props.set(p.id, pr);
      } else {
        if (!pr) {
          const obj = makeBubble();
          pr = { obj, kind: 'bubble', popped: false };
          this.scene.add(obj);
          this.props.set(p.id, pr);
        }
        if (p.id !== me.id || !this.blowing) pr.obj.userData.setSize(p.id === me.id ? Math.max(p.size, this.mySize) : p.size);
        if (p.popped && !pr.popped) {
          pr.popped = true;
          pr.obj.userData.pop();
          if (p.id === me.id) {
            this.blowing = false;
            this.#sfx('splash');
          }
        }
      }
    }
    // 離開的人：拿掉道具
    for (const [id, pr] of this.props) {
      if (!g.players.some((p) => p.id === id)) {
        this.scene.remove(pr.obj);
        this.props.delete(id);
      }
    }
    // 贏家的樹枝／泡泡：發亮
    if (g.state === 'done')
      for (const id of g.winners ?? []) {
        const pr = this.props.get(id);
        if (pr && !pr.glow) {
          pr.glow = true;
          pr.obj.scale.multiplyScalar(1.15);
          // 🏆 贏家：頭上多一顆小星星
          const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
          star.position.y = (pr.len ?? 0.9) + 0.25;
          star.userData.spin = true;
          pr.obj.add(star);
        }
      }
  }

  #sendBlow(done = false) {
    const g = this.g;
    if (!g || g.game !== 'bubble' || g.state !== 'play') return;
    this.sentAt = performance.now();
    this.net.request('bgame', { op: 'blow', size: Math.round(this.mySize * 1000) / 1000, done }).then((r) => {
      if (r?.popped) this.blowing = false;
    });
  }

  async #click(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    const req = async (op, extra = {}) => {
      const r = await this.net.request('bgame', { op, ...extra });
      if (!r?.ok) {
        const why = { far: t('要坐在營火旁的圓木上才能玩喔'), busy: t('營火這邊已經有人在玩了，等這局結束'), tooFast: t('等一下再發起'), full: t('這局人滿了'), started: t('這局已經開始了'), few: t('還要再 1 個人才能開始') };
        this.hud.toast(why[r?.reason] ?? t('沒有成功，再試一次'));
      }
      return r;
    };
    if (act === 'snd') {
      this.quiet = !this.quiet;
      try {
        localStorage.setItem('cozy-bg-quiet', this.quiet ? '1' : '0');
      } catch {
        /* 存不了就算了 */
      }
      this.hud.toast(this.quiet ? t('🔕 桌遊聲音關掉了') : t('🔔 桌遊聲音打開了'));
      this._key = '';
    } else if (act === 'open') {
      this.picking = true;
      this._key = '';
    } else if (act === 'close') {
      this.picking = false;
      this._key = '';
    } else if (act === 'pick') {
      this.picking = false;
      await req('invite', { game: b.dataset.game });
    } else if (act === 'join') await req('join');
    else if (act === 'no') {
      this.dismissed = this.g?.id;
      this._key = '';
    } else if (act === 'leave') {
      await req('leave');
      this.dismissed = this.g?.id;
      this._key = '';
    } else if (act === 'start') await req('start');
    else if (act === 'draw') await req('draw');
    else if (act === 'poke') await req('poke', { hole: Number(b.dataset.hole) });
    else if (act === 'again') await req('invite', { game: this.g?.game ?? 'stick' });
    else if (act === 'done') {
      this.dismissed = this.g?.id;
      this._key = '';
    }
  }

  #render(me) {
    const g = this.g;
    const mine = this.#mine();
    const name = (p) => (p.id === me.id ? t('你') : p.name);
    const chips = (fmt) => `<div class="bg-chips">${g.players.map((p) => `<span class="${g.turn === p.id ? 'on' : ''}${g.winners?.includes(p.id) ? ' win' : ''}">${name(p)}${fmt ? ` ${fmt(p)}` : ''}</span>`).join('')}</div>`;
    const left = g?.endsAt ? Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000)) : 0;
    // 沒有在玩：坐在營火旁 → 「🎲 桌遊」按鈕
    if (!g || (g.state === 'done' && this.dismissed === g.id)) {
      if (!me.sitting) return '';
      if (!this.picking) return `<button type="button" class="bg-open" data-act="open">🎲 ${t('桌遊')}</button>`;
      return `<div class="bg-card"><div class="bg-head">${t('🎲 玩什麼？')}<button type="button" class="bg-x" data-act="close">✕</button></div><div class="bg-games">${BOARD_GAMES.map((x) => `<button type="button" data-act="pick" data-game="${x.id}"><span>${x.icon}</span><b>${t(x.zh)}</b><small>${t(x.how)}</small></button>`).join('')}</div><small class="bg-note">${t('坐在營火旁的人都可以加入，{a}～{b} 人；贏的人 +{n} 🌰', { a: BOARD_MIN, b: BOARD_MAX, n: BOARD_WIN })}</small></div>`;
    }
    const G = GAME[g.game];
    const title = `${G.icon} ${t(G.zh)}`;
    if (g.state === 'invite') {
      if (mine) {
        const host = g.host.id === me.id;
        return `<div class="bg-card"><div class="bg-head">${title}・${t('等大家加入（{n} 秒）', { n: left })}</div>${chips()}${host ? `<button type="button" class="bg-go" data-act="start" ${g.players.length < BOARD_MIN ? 'disabled' : ''}>${g.players.length < BOARD_MIN ? t('還要 1 個人') : t('開始（{n} 人）', { n: g.players.length })}</button><button type="button" class="bg-sub" data-act="leave">${t('取消')}</button>` : `<small class="bg-note">${t('等 {name} 按開始⋯', { name: g.host.name })}</small><button type="button" class="bg-sub" data-act="leave">${t('退出')}</button>`}</div>`;
      }
      if (this.dismissed === g.id) return me.sitting ? '' : '';
      if (!me.sitting) return me.inForest ? `<div class="bg-card bg-mini">🎲 ${t('{name} 在營火邊邀大家玩 {game}，坐到圓木上就能加入', { name: g.host.name, game: title })}</div>` : '';
      return `<div class="bg-card"><div class="bg-head">🎲 ${t('{name} 邀大家玩 {game}', { name: g.host.name, game: title })}</div>${chips()}<small class="bg-note">${t(G.how)}</small><button type="button" class="bg-go" data-act="join" ${g.players.length >= BOARD_MAX ? 'disabled' : ''}>${t('加入')}</button><button type="button" class="bg-sub" data-act="no">${t('先不要')}</button></div>`;
    }
    // 🐸 戳戳樂的格子：戳過的破一個洞（🌿＝沒事）；結束時青蛙躲的那格「啵」跳出來
    const frogBoard = (myTurn) =>
      `<div class="bg-frog">${(g.holes ?? []).map((h, i) => {
        const pop = g.state === 'done' && i === g.trap;
        const cls = pop ? 'pop' : h ? 'x' : '';
        const who = h ? g.players.find((p) => p.id === h) : null;
        return `<button type="button" class="${cls}" ${myTurn && !h ? `data-act="poke" data-hole="${i}"` : 'disabled'}>${pop ? '<i>🐸</i>' : h ? '🌿' : ''}${who && !pop ? `<small>${name(who)}</small>` : ''}</button>`;
      }).join('')}</div>`;
    if (g.state === 'play') {
      if (g.game === 'frog') {
        const myTurn = g.turn === me.id;
        const turnP = g.players.find((p) => p.id === g.turn);
        return `<div class="bg-card"><div class="bg-head">${title}・${myTurn ? t('輪到你了！') : t('輪到 {name}', { name: turnP ? name(turnP) : '' })}（${left}）</div>${chips()}${frogBoard(myTurn)}<small class="bg-note">${myTurn ? t('點一格戳下去 👆 沒點的話會自動幫你戳') : mine ? t('青蛙躲在其中一格，等 {name} 戳⋯', { name: turnP ? name(turnP) : '' }) : t('在旁邊看大家戳戳樂 👀')}</small></div>`;
      }
      if (g.game === 'stick') {
        const myTurn = g.turn === me.id;
        return `<div class="bg-card"><div class="bg-head">${title}${myTurn ? `・${t('輪到你了！')}` : ''}</div>${chips((p) => (p.len ? `🪵 ${p.len.toFixed(2)}` : g.turn === p.id ? '⏳' : '…'))}${myTurn ? `<button type="button" class="bg-go" data-act="draw">🪵 ${t('抽一根')}（${left}）</button><small class="bg-note">${t('沒抽的話會自動幫你抽')}</small>` : mine ? `<small class="bg-note">${t('等其他人抽⋯')}</small>` : `<small class="bg-note">${t('在旁邊看大家抽樹枝 👀')}</small>`}</div>`;
      }
      const meP = mine;
      const can = meP && !meP.done && !meP.popped;
      return `<div class="bg-card"><div class="bg-head">${title}・${t('還有 {n} 秒', { n: left })}</div>${chips((p) => (p.popped ? '💥' : p.done ? '✋' : '🫧'))}${can ? `<button type="button" class="bg-blow" data-blow="1">${t('按住吹')}<small>🫧</small></button><div class="bg-meter"><i style="width:${Math.min(100, this.mySize * 100)}%"></i></div><small class="bg-note">${t('放開就停；吹太大會破')}</small>` : meP ? `<small class="bg-note">${meP.popped ? t('💥 破掉了！下次小心一點') : t('✋ 吹好了，等大家⋯')}</small>` : `<small class="bg-note">${t('在旁邊看大家吹泡泡 👀')}</small>`}</div>`;
    }
    // 結果
    const wins = g.players.filter((p) => g.winners?.includes(p.id));
    if (g.game === 'frog') {
      const lp = g.players.find((p) => p.id === g.loser);
      const fline = lp ? t('🐸 啵！青蛙跳到 {name} 頭上了 😆', { name: name(lp) }) : t('這局沒有人戳到青蛙 🐸');
      return `<div class="bg-card"><div class="bg-head">${title}・${t('結果')}</div>${frogBoard(false)}<div class="bg-result">${fline}</div>${chips((p) => (p.id === g.loser ? '🐸' : g.winners?.includes(p.id) ? '🏆' : ''))}${mine && me.sitting ? `<button type="button" class="bg-go" data-act="again">${t('再來一局')}</button>` : ''}<button type="button" class="bg-sub" data-act="done">${t('關掉')}</button></div>`;
    }
    const line = wins.length ? t('🏆 {names} 贏了！', { names: wins.map(name).join('、') }) : t('這局沒有人贏 🫧');
    return `<div class="bg-card"><div class="bg-head">${title}・${t('結果')}</div>${chips((p) => (g.game === 'stick' ? `🪵 ${(p.len ?? 0).toFixed(2)}` : p.popped ? '💥' : `🫧 ${Math.round(p.size * 100)}`))}<div class="bg-result">${line}</div>${mine && me.sitting ? `<button type="button" class="bg-go" data-act="again">${t('再來一局')}</button>` : ''}<button type="button" class="bg-sub" data-act="done">${t('關掉')}</button></div>`;
  }

  update(dt, time) {
    if (!this.on) {
      if (!this.el.hidden) this.el.hidden = true;
      return;
    }
    const me = this.self();
    // 走到營火、或剛連上：問伺服器有沒有正在玩的
    const live = me.inForest && this.net.online;
    if (live && !this._live) this.peek();
    this._live = live;
    // 頭上的道具跟著人
    for (const [id, pr] of this.props) {
      const pos = id === me.id ? me.pos : this.remotes.get(id)?.group.position;
      if (!pos) {
        pr.obj.visible = false;
        continue;
      }
      pr.obj.visible = true;
      pr.obj.position.set(pos.x, (pos.y ?? 0) + 1.5, pos.z);
      if (pr.kind === 'bubble') pr.obj.userData.update(dt, time);
      else pr.obj.rotation.z = Math.sin(time * 2 + pr.len * 9) * 0.05;
      for (const c of pr.obj.children) if (c.userData.spin) c.rotation.y = time * 3;
    }
    // 吹泡泡：按住就長大，每 0.25 秒告訴伺服器
    const g = this.g;
    if (g?.game === 'bubble' && g.state === 'play' && this.blowing) {
      this.mySize = Math.min(1.2, this.mySize + RATE * dt);
      const pr = this.props.get(me.id);
      pr?.obj.userData.setSize(this.mySize);
      if (performance.now() - this.sentAt > 250) this.#sendBlow(false);
      const bar = this.el.querySelector('.bg-meter i');
      if (bar) bar.style.width = `${Math.min(100, this.mySize * 100)}%`;
    }
    // 小視窗：內容變了才重畫（倒數秒數也算）
    const left = g?.endsAt && g.state !== 'done' ? Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000)) : 0; // 結束後不再倒數（不然每秒重畫，青蛙動畫一直重來）
    const key = JSON.stringify([g?.id, g?.state, g?.turn, g?.players?.map((p) => [p.id, p.len, p.popped, p.done]), g?.holes, left, me.sitting, me.inForest, this.picking, this.dismissed, g?.winners, this.quiet]);
    if (key !== this._key && !this.blowing) {
      this._key = key;
      const html = me.inForest ? this.#render(me) : '';
      this.el.innerHTML = html;
      this.el.hidden = !html;
      // 🔔／🔕 每個小視窗標題右邊都有（✕ 的左邊）
      const head = this.el.querySelector('.bg-head');
      if (head) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bg-x bg-snd';
        b.dataset.act = 'snd';
        b.title = t('桌遊聲音');
        b.textContent = this.quiet ? '🔕' : '🔔';
        head.insertBefore(b, head.querySelector('.bg-x'));
      }
    }
    // 站起來就不能選遊戲了
    if (!me.sitting && this.picking) this.picking = false;
  }
}
