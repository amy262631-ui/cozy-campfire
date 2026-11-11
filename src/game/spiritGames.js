import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

/**
 * 🎮 跟小精靈玩的小遊戲（作者 11/11：每種小精靈一個，想全玩到就多養幾隻）
 *   light 💃 一起跳舞、drop 🫧 追泡泡、flame ✨ 撿火花、leaf 🙈 躲貓貓、cloud 🌧️ 接雨滴、star 🌌 連星座、mush 🍄 蘑菇彈跳
 * 遊戲都在玩家自己的畫面上（別人看得到你做的動作、小精靈的反應，看不到泡泡、雨滴這些）。
 * 玩完呼叫 onEnd(score)；伺服器那邊（spiritPlay）每種一天 3 次、加一點親密度。
 */
export const SPIRIT_GAMES = {
  light: { icon: '💃', zh: '一起跳舞', how: '跟著畫面上的動作按按鈕，你和小光點會一起跳' },
  drop: { icon: '🫧', zh: '追泡泡', how: '走過去戳破身邊飄的泡泡' },
  flame: { icon: '✨', zh: '撿火花', how: '跑去撿小火苗留下的火花' },
  leaf: { icon: '🙈', zh: '躲貓貓', how: '葉子躲起來了，跟著微光找到它' },
  cloud: { icon: '🌧️', zh: '接雨滴', how: '左右移動，接住雲朵下的小雨滴' },
  star: { icon: '🌌', zh: '連星座', how: '照 1、2、3⋯的順序點星星，連成星座' },
  mush: { icon: '🍄', zh: '蘑菇彈跳', how: '看準力氣條最高的時候按「跳！」' },
};

const rand = (a, b) => a + Math.random() * (b - a);

export class SpiritGames {
  /**
   * @param {object} ctx { scene, player, spirit, actions, audio, root, roomHeight?(x,z) }
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.game = null;
    this.el = document.createElement('div');
    this.el.className = 'spg';
    this.el.hidden = true;
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    (ctx.root ?? document.body).appendChild(this.el);
  }

  get playing() {
    return !!this.game;
  }

  /** 開始一場；onEnd(score, kind) 結束時呼叫（中途按「結束」也會呼叫，分數照算） */
  start(kind, onEnd) {
    if (this.game) this.stop();
    const g = SPIRIT_GAMES[kind];
    if (!g) return false;
    this.kind = kind;
    this.onEnd = onEnd;
    this.score = 0;
    this.time = kind === 'leaf' ? 45 : kind === 'star' ? 40 : kind === 'mush' ? 60 : 25;
    this.objs = [];
    this.group = new THREE.Group();
    this.ctx.scene.add(this.group);
    this.el.hidden = false;
    document.body.classList.add('spg-on'); // 其他視窗先藏起來（style.css）
    this.el.innerHTML = `<div class="spg-top"><b>${g.icon} ${t(g.zh)}</b><span class="spg-score">${t('得分')} 0</span><span class="spg-time"></span><button type="button" class="spg-quit">${t('結束')}</button></div><div class="spg-how">${t(g.how)}</div><div class="spg-body"></div>`;
    this.el.querySelector('.spg-quit').addEventListener('click', () => this.finish());
    this.body = this.el.querySelector('.spg-body');
    this.game = this[`_${kind}`]?.() ?? null;
    this.ctx.spirit.react('happy', 1.5, { hop: true, spin: true });
    return true;
  }

  #setScore(n) {
    this.score = n;
    const s = this.el.querySelector('.spg-score');
    if (s) s.textContent = `${t('得分')} ${n}`;
  }
  #add(n = 1) {
    this.#setScore(this.score + n);
    this.ctx.audio?.sfx?.('pop');
  }

  finish() {
    if (!this.game) return;
    const score = this.score;
    const kind = this.kind;
    this.stop();
    this.ctx.spirit.react('love', 2.5, { hop: true, spin: true });
    this.onEnd?.(score, kind);
  }

  stop() {
    this.game?.stop?.();
    this.game = null;
    if (this.group) {
      this.ctx.scene.remove(this.group);
      this.group.traverse((o) => o.geometry?.dispose?.());
    }
    this.group = null;
    this.el.hidden = true;
    this.el.innerHTML = '';
    document.body.classList.remove('spg-on');
  }

  update(dt) {
    if (!this.game) return;
    this.time -= dt;
    const tm = this.el.querySelector('.spg-time');
    if (tm) tm.textContent = `⏱ ${Math.max(0, Math.ceil(this.time))}`;
    this.game.update?.(dt);
    if (this.time <= 0) this.finish();
  }

  /** 玩家腳下的位置 */
  get #me() {
    return this.ctx.player.position;
  }
  #ground(x, z) {
    return this.ctx.roomHeight?.(x, z) ?? this.#me.y ?? 0;
  }
  #ring(min, max) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(min, max);
    return { x: this.#me.x + Math.cos(a) * r, z: this.#me.z + Math.sin(a) * r };
  }

  // ---------- ✨ 小光點：一起跳舞（照提示按動作，玩家和小光點一起做） ----------
  _light() {
    const MOVES = [
      { id: 'wave', icon: '👋', zh: t('打招呼') },
      { id: 'salute', icon: '🫡', zh: t('敬禮') },
      { id: 'bye', icon: '🙋', zh: t('掰掰') },
      { id: 'pray', icon: '🙏', zh: t('拜拜') },
    ];
    this.body.innerHTML = `<div class="spg-cue"></div><div class="spg-moves">${MOVES.map((m) => `<button type="button" data-mv="${m.id}"><span>${m.icon}</span><small>${m.zh}</small></button>`).join('')}</div>`;
    const cue = this.body.querySelector('.spg-cue');
    let want = null;
    let left = 0;
    const next = () => {
      want = MOVES[Math.floor(Math.random() * MOVES.length)];
      left = 2.6;
      cue.innerHTML = `<span>${want.icon}</span>`;
      cue.classList.remove('ok', 'miss');
    };
    for (const b of this.body.querySelectorAll('[data-mv]'))
      b.addEventListener('click', () => {
        if (!want) return;
        const ok = b.dataset.mv === want.id;
        this.ctx.actions.emote(b.dataset.mv); // 角色也跟著做（別人看得到）
        if (ok) {
          this.#add();
          this.ctx.spirit.react('happy', 1, { hop: true, spin: true });
          cue.classList.add('ok');
        } else {
          this.ctx.spirit.react('wow', 0.8);
          cue.classList.add('miss');
        }
        want = null;
        left = 0.7; // 停一下再出下一個
      });
    next();
    return {
      update: (dt) => {
        left -= dt;
        if (left <= 0) {
          if (want) {
            this.ctx.spirit.react('wow', 0.6);
            cue.classList.add('miss');
            want = null;
            left = 0.6;
          } else next();
        }
      },
    };
  }

  // ---------- 💧 水滴：追泡泡（身邊飄著泡泡，走過去戳破） ----------
  _drop() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0x6ab8ff, emissiveIntensity: 0.25 });
    const spawn = () => {
      const p = this.#ring(1.8, 4.2);
      const m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.16, 0.26), 16, 12), mat);
      m.position.set(p.x, this.#ground(p.x, p.z) + rand(0.5, 1.2), p.z);
      m.userData = { ph: Math.random() * 6, vx: rand(-0.3, 0.3), vz: rand(-0.3, 0.3) };
      this.group.add(m);
      this.objs.push(m);
    };
    for (let i = 0; i < 8; i++) spawn();
    let tt = 0;
    return {
      update: (dt) => {
        tt += dt;
        for (const m of [...this.objs]) {
          const u = m.userData;
          if (u.pop) {
            u.pop += dt;
            m.scale.setScalar(1 + u.pop * 4);
            m.material = mat;
            if (u.pop > 0.15) this.group.remove(m), this.objs.splice(this.objs.indexOf(m), 1), spawn();
            continue;
          }
          m.position.x += u.vx * dt;
          m.position.z += u.vz * dt;
          m.position.y += Math.sin(tt * 2 + u.ph) * 0.004;
          if (Math.hypot(m.position.x - this.#me.x, m.position.z - this.#me.z) < 0.7) {
            u.pop = 0.001;
            this.#add();
            this.ctx.spirit.react('happy', 0.8, { hop: true });
          }
        }
      },
    };
  }

  // ---------- 🔥 火苗：撿火花（一次一顆，撿到再出現下一顆） ----------
  _flame() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.35, depthWrite: false });
    let cur = null;
    const spawn = () => {
      const p = this.#ring(2.2, 4.5);
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), glow);
      g.add(core, halo);
      g.position.set(p.x, this.#ground(p.x, p.z) + 0.35, p.z);
      this.group.add(g);
      cur = g;
      this.ctx.spirit.react('happy', 0.6, { hop: true });
    };
    spawn();
    let tt = 0;
    return {
      update: (dt) => {
        tt += dt;
        if (!cur) return;
        cur.rotation.y += dt * 3;
        cur.children[1].scale.setScalar(1 + Math.sin(tt * 8) * 0.15);
        if (Math.hypot(cur.position.x - this.#me.x, cur.position.z - this.#me.z) < 0.75) {
          this.group.remove(cur);
          cur = null;
          this.#add();
          spawn();
        }
      },
    };
  }

  // ---------- 🍃 葉子：躲貓貓（小精靈躲到附近，頭上一點微光，找到它） ----------
  _leaf() {
    const sp = this.ctx.spirit;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8f5c4, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
    this.group.add(beam);
    let spot = null;
    let found = 0;
    const hide = () => {
      spot = this.#ring(5, 9);
      spot.y = this.#ground(spot.x, spot.z);
      sp.hideAt = spot; // spiritFollower 會飛過去躲著
      beam.position.set(spot.x, spot.y + 1.6, spot.z);
      found = 0;
    };
    hide();
    return {
      update: () => {
        if (found > 0) return;
        if (Math.hypot(spot.x - this.#me.x, spot.z - this.#me.z) < 1.4) {
          found = 1;
          sp.hideAt = null;
          this.#add();
          sp.react('happy', 1.5, { hop: true, spin: true });
          setTimeout(() => this.game && hide(), 1500);
        }
      },
      stop: () => (sp.hideAt = null),
    };
  }

  // ---------- ☁️ 雲朵：接雨滴（頭上下雨，移動接住） ----------
  _cloud() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x9fdcff });
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.35, depthWrite: false });
    let next = 0.3;
    return {
      update: (dt) => {
        next -= dt;
        if (next <= 0) {
          next = rand(0.55, 0.9);
          const p = this.#ring(0.3, 2.0);
          const g = this.#ground(p.x, p.z);
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat);
          d.scale.y = 1.5;
          d.position.set(p.x, g + 4, p.z);
          const sh = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), shadowMat);
          sh.rotation.x = -Math.PI / 2;
          sh.position.set(p.x, g + 0.03, p.z);
          d.userData = { g, sh, v: rand(1.6, 2.2) };
          this.group.add(d, sh);
          this.objs.push(d);
        }
        for (const d of [...this.objs]) {
          d.position.y -= d.userData.v * dt;
          if (d.position.y < d.userData.g + 1.0) {
            const hit = Math.hypot(d.position.x - this.#me.x, d.position.z - this.#me.z) < 0.6;
            if (hit) {
              this.#add();
              this.ctx.spirit.react('happy', 0.6, { hop: true });
            }
            if (hit || d.position.y < d.userData.g + 0.1) {
              this.group.remove(d, d.userData.sh);
              this.objs.splice(this.objs.indexOf(d), 1);
            }
          }
        }
      },
    };
  }

  // ---------- ⭐ 星星：連星座（照順序點星星） ----------
  _star() {
    const SHAPES = [
      [[15, 70], [35, 40], [55, 55], [75, 25], [88, 60]],
      [[20, 30], [45, 20], [70, 30], [60, 60], [35, 70], [20, 50]],
      [[50, 15], [62, 45], [90, 48], [68, 65], [76, 92], [50, 75], [24, 92], [32, 65], [10, 48], [38, 45]],
      [[15, 50], [32, 30], [50, 50], [68, 30], [85, 50], [50, 80]],
    ];
    this.body.innerHTML = `<div class="spg-sky"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div>`;
    const sky = this.body.querySelector('.spg-sky');
    const svg = sky.querySelector('svg');
    let shape = null;
    let i = 0;
    const draw = () => {
      shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      i = 0;
      svg.innerHTML = '';
      for (const b of sky.querySelectorAll('button')) b.remove();
      shape.forEach(([x, y], k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'spg-star';
        b.style.left = `${x}%`;
        b.style.top = `${y}%`;
        b.innerHTML = `<i>⭐</i><small>${k + 1}</small>`;
        b.addEventListener('click', () => {
          if (k !== i) return void (b.classList.add('no'), setTimeout(() => b.classList.remove('no'), 300), this.ctx.spirit.react('wow', 0.6));
          b.classList.add('on');
          if (i > 0) {
            const [ax, ay] = shape[i - 1];
            svg.insertAdjacentHTML('beforeend', `<line x1="${ax}" y1="${ay}" x2="${x}" y2="${y}" />`);
          }
          i++;
          this.ctx.audio?.sfx?.('pop');
          if (i === shape.length) {
            this.#add(shape.length);
            this.ctx.spirit.react('love', 1.5, { hop: true, spin: true });
            sky.classList.add('done');
            setTimeout(() => this.game && (sky.classList.remove('done'), draw()), 900);
          }
        });
        sky.appendChild(b);
      });
    };
    draw();
    return {};
  }

  // ---------- 🍄 蘑菇：蘑菇彈跳（力氣條最高時按「跳！」，5 次） ----------
  _mush() {
    this.body.innerHTML = `<div class="spg-bounce"><div class="spg-bar"><i></i><em></em></div><button type="button" class="spg-jump">${t('跳！')}</button><div class="spg-left"></div></div>`;
    const fill = this.body.querySelector('.spg-bar i');
    const left = this.body.querySelector('.spg-left');
    let p = 0;
    let dir = 1;
    let jumps = 5;
    let cool = 0;
    const show = () => (left.textContent = t('還有 {n} 次', { n: jumps }));
    show();
    this.body.querySelector('.spg-jump').addEventListener('click', () => {
      if (cool > 0 || jumps <= 0) return;
      const h = Math.round(p * 10); // 0～10 分
      this.#add(h);
      jumps--;
      show();
      cool = 0.9;
      this.ctx.player.hopT = 0.8 + p * 0.4; // 角色跳起來（main.js 每幀看這個）
      this.ctx.spirit.react(h >= 9 ? 'love' : h >= 6 ? 'happy' : 'wow', 1, { hop: true, spin: h >= 9 });
      if (jumps <= 0) setTimeout(() => this.finish(), 1200);
    });
    return {
      update: (dt) => {
        if (cool > 0) cool -= dt;
        p += dir * dt * 1.6;
        if (p >= 1) (p = 1), (dir = -1);
        if (p <= 0) (p = 0), (dir = 1);
        fill.style.height = `${p * 100}%`;
      },
    };
  }
}
