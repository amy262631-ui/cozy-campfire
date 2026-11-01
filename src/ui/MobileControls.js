import { t } from '../i18n/i18n.js';

/**
 * 手機控制：左下虛擬搖桿 + 右下動作按鈕。
 * 只在觸控裝置顯示（網址加 ?touch=1 可在桌機強制開啟測試）。
 */
const RADIUS = 48;

const BUTTONS = [
  { action: 'interact', icon: '🪵', label: t('添柴') },
  { action: 'roast', icon: '🍡', label: t('烤') },
  { action: 'blanket', icon: '🧣', label: t('裹毯') },
  { action: 'stargaze', icon: '✨', label: t('星空') },
];

export function isTouchDevice() {
  const forced = new URLSearchParams(location.search).get('touch') === '1';
  return forced || window.matchMedia('(pointer: coarse)').matches;
}

export class MobileControls {
  constructor(input, root = document.getElementById('ui')) {
    this.input = input;
    document.body.classList.add('touch');

    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="joystick" id="joystick"><div class="joystick-knob" id="joystick-knob"></div></div>
      <div class="action-buttons" id="action-buttons">
        ${BUTTONS.map(
          (b) => `<button class="action-btn" data-action="${b.action}"><span>${b.icon}</span><small>${b.label}</small></button>`,
        ).join('')}
      </div>
      `,
    );

    this.#bindJoystick(root.querySelector('#joystick'), root.querySelector('#joystick-knob'));

    root.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.emitAction(btn.dataset.action);
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
      });
    });
  }

  /**
   * 依房間調整按鈕：湖邊「烤」變「釣魚」、樹屋「添柴」變「點歌」，用不到的按鈕變淡。
   * @param {string} roomId
   */
  setRoom(roomId) {
    const LAYOUT = {
      forest_main: { interact: ['🪵', t('添柴')], roast: ['🍡', t('烤')] },
      treehouse_music: { interact: ['🎵', t('點歌')], roast: null },
      lake_dock: { interact: null, roast: ['🎣', t('釣魚')] },
      tent_focus: { interact: null, roast: null, stargaze: null },
      tent_social: { interact: ['☕', t('喝茶')], roast: null, stargaze: null },
      home: { interact: ['🛠️', t('布置')], roast: null, stargaze: null },
      campground: { interact: ['🚪', t('拜訪')], roast: null, stargaze: null },
    };
    this.layout = LAYOUT[roomId] ?? LAYOUT.forest_main;
    this.override = undefined;
    this.#apply();
  }

  /**
   * 依所在位置換掉「互動」按鈕：走到祈福處變「⛩️ 祈福」、告示牌前變「📌 告示牌」，
   * 並讓按鈕發光提示可以按。傳 null 表示回到房間預設。
   * @param {[string, string] | null} conf
   */
  setInteract(conf) {
    const k = conf ? conf.join('|') : '';
    if (k === this.override) return;
    this.override = k;
    this.overrideConf = conf;
    this.#apply(conf);
  }

  /** 依所在位置換掉 F 按鈕（營火河畔變「🎣 釣魚」、釣魚中變「拉竿」）；null 表示回到房間預設 */
  setRoast(conf) {
    const k = conf ? conf.join('|') : '';
    if (k === this.roastOverride) return;
    this.roastOverride = k;
    this.roastConf = conf;
    this.#apply(this.override ? this.overrideConf : null);
  }

  /** 提示文字裡的按鍵 → 對應手機按鈕的圖示（E、F、Z、空白鍵） */
  keyIcon(key) {
    const map = { E: 'interact', F: 'roast', Z: 'blanket', 空白鍵: 'stargaze' };
    const btn = map[key] && document.querySelector(`.action-btn[data-action="${map[key]}"]`);
    return btn && !btn.classList.contains('disabled') ? btn.querySelector('span').textContent : null;
  }

  #apply(override = null) {
    let layout = override ? { ...this.layout, interact: override } : this.layout;
    if (this.roastConf) layout = { ...layout, roast: this.roastConf };
    document.querySelectorAll('.action-btn').forEach((btn) => {
      const a = btn.dataset.action;
      const def = BUTTONS.find((b) => b.action === a);
      const conf = a in layout ? layout[a] : [def.icon, def.label];
      btn.classList.toggle('disabled', conf === null);
      const [icon, label] = conf ?? [def.icon, def.label];
      btn.querySelector('span').textContent = icon;
      btn.querySelector('small').textContent = label;
      btn.classList.toggle('glow', a === 'interact' && !!override);
    });
  }

  #bindJoystick(base, knob) {
    let id = null;
    let cx = 0;
    let cy = 0;

    const move = (e) => {
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx *= RADIUS / len;
        dy *= RADIUS / len;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.virtualMove.x = dx / RADIUS;
      this.input.virtualMove.y = -dy / RADIUS;
      this.input.markActive();
    };

    base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      id = e.pointerId;
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      base.setPointerCapture(id);
      move(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      this.input.virtualMove.x = this.input.virtualMove.y = 0;
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    base.addEventListener('lostpointercapture', end); // 手指被系統打斷時搖桿也要歸零
  }
}
