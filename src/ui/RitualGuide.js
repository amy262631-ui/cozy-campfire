import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

const DONE_KEY = 'cozy-campfire-ritual-day';
const todayKey = () => new Date().toLocaleDateString('sv-SE');

/**
 * 「今晚的小儀式」：第一次進來不知道要做什麼時，帶你做一件 30 秒內完成的事——
 * 撿一顆石頭，疊上石塔，許個願。完成後告訴你「你是今天第 N 位許願的旅人」。
 * 一天只帶一次；按 × 可以略過。
 *
 *   guide.update(dt, time, { inForest, carrying, pos, nearCairn, pile, cairnTop(i), nearestCairn })
 *   guide.complete(n)   疊好了（n＝今天第幾位，單人模式是 null）
 */
export class RitualGuide {
  constructor({ scene, hud, touch = false, root = document.getElementById('ui') }) {
    this.hud = hud;
    this.touch = touch;
    this.active = this.#shouldShow();
    this.step = -1;

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="ritual" id="ritual" hidden>
        <button type="button" class="ritual-x" id="ritual-x" aria-label="close">×</button>
        <div class="ritual-title">${t('🪨 今晚的小儀式')}</div>
        <div class="ritual-text" id="ritual-text"></div>
        <div class="ritual-dots" id="ritual-dots"><i></i><i></i><i></i></div>
        <div class="ritual-actions" id="ritual-actions" hidden>
          <button type="button" id="ritual-share">${t('📤 分享給朋友')}</button>
          <button type="button" id="ritual-ok">${t('好')}</button>
        </div>
      </div>
      <div class="ritual-arrow" id="ritual-arrow" hidden>➤</div>
      `,
    );
    this.el = root.querySelector('#ritual');
    this.textEl = root.querySelector('#ritual-text');
    this.dots = [...root.querySelectorAll('#ritual-dots i')];
    this.arrow = root.querySelector('#ritual-arrow');
    this._v = new THREE.Vector3();
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.querySelector('#ritual-x').addEventListener('click', () => this.finish());
    root.querySelector('#ritual-ok').addEventListener('click', () => this.finish());
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
  }

  #shouldShow() {
    try {
      return localStorage.getItem(DONE_KEY) !== todayKey();
    } catch {
      return true;
    }
  }

  #setStep(step, text) {
    if (step === this.step && text === this._text) return;
    this.step = step;
    this._text = text;
    this.textEl.innerHTML = text;
    this.dots.forEach((d, i) => d.classList.toggle('on', i <= step));
  }

  update(dt, time, s) {
    if (!this.active) {
      this.beacon.visible = false;
      this.arrow.hidden = true;
      return;
    }
    this.el.hidden = false;
    if (this.step === 3) {
      this.arrow.hidden = true;
      return; // 完成畫面停著，等玩家按「好」
    }

    if (!s.inForest) {
      this.beacon.visible = false;
      this.arrow.hidden = true;
      this.#setStep(0, t('回到營火旁，就能開始囉'));
      return;
    }
    let target;
    if (!s.carrying) {
      target = s.pile;
      const d = Math.max(0, Math.hypot(s.pos.x - target.x, s.pos.z - target.z) - 1.2);
      this.#setStep(0, d > 0.5 ? t('走到<b>發光的石頭堆</b>，撿一顆石頭（還有 {n} 公尺）', { n: Math.ceil(d) }) : this.touch ? t('點右下角的 <b>🪨 撿石頭</b>') : t('按 <b>E</b> 撿一顆石頭'));
    } else {
      const i = s.nearCairn >= 0 ? s.nearCairn : s.nearestCairn;
      target = s.cairnTop(i);
      this.#setStep(s.nearCairn >= 0 ? 2 : 1, s.nearCairn >= 0 ? (this.touch ? t('點右下角的 <b>🗿 疊上去</b>，許個願 🙏') : t('按 <b>E</b> 把石頭疊上去，許個願 🙏')) : t('頂著石頭，走到<b>發光的石塔</b>旁'));
    }
    this.beacon.visible = true;
    this.beacon.position.set(target.x, target.y ?? 0, target.z);
    this.orb.position.y = 1.4 + Math.sin(time * 2.2) * 0.18;
    if (s.camera) this.#pointArrow(s.camera, target, time);
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

  /** 疊好了 */
  complete(n) {
    if (!this.active) return;
    this.beacon.visible = false;
    this.arrow.hidden = true;
    this.step = 3;
    this.n = n;
    this.dots.forEach((d) => d.classList.add('on'));
    this.textEl.innerHTML = n
      ? t('完成了！你是今天第 <b>{n}</b> 位在這裡許願的旅人 🙏', { n })
      : t('完成了！願望已經跟著石頭疊上去了 🙏');
    this.el.querySelector('#ritual-actions').hidden = false;
    this.el.classList.add('done');
    try {
      localStorage.setItem(DONE_KEY, todayKey());
    } catch {
      /* 存不了也沒關係 */
    }
  }

  finish() {
    this.active = false;
    this.el.hidden = true;
    this.arrow.hidden = true;
    this.beacon.visible = false;
    try {
      localStorage.setItem(DONE_KEY, todayKey());
    } catch {
      /* 存不了也沒關係 */
    }
  }

  async #share() {
    const url = location.origin + location.pathname;
    const text = this.n
      ? t('我是今天第 {n} 位在迷霧森林露營地疊石頭許願的旅人 🪨 沒力氣出門的夜晚，一起來營火旁坐一下吧', { n: this.n })
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
