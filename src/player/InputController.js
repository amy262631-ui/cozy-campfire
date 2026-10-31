/**
 * 鍵盤輸入 + 玩家活動偵測（用於判斷是否進入掛機巡航鏡頭）。
 * 手機虛擬搖桿寫入 this.virtualMove，動作按鈕呼叫 emitAction()，與鍵盤走同一條路。
 */
const MOVE_KEYS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

/** 單次觸發的動作鍵 */
const ACTION_KEYS = {
  KeyE: 'interact', // 添柴火（M5 起也用來看木牌）
  KeyF: 'roast', // 烤棉花糖
  KeyZ: 'blanket', // 裹毯發呆
  Space: 'stargaze', // 仰望星空
};

export class InputController {
  constructor() {
    this.state = { forward: false, backward: false, left: false, right: false, run: false };
    this.virtualMove = { x: 0, y: 0 };
    this.lastActivity = performance.now();
    this._actionListeners = [];

    window.addEventListener('keydown', (e) => this.#onKey(e, true));
    window.addEventListener('keyup', (e) => this.#onKey(e, false));
    window.addEventListener('blur', () => this.#releaseAll());
    document.addEventListener('visibilitychange', () => document.hidden && this.#releaseAll());

    const bump = () => this.markActive();
    window.addEventListener('pointerdown', bump);
    window.addEventListener('pointermove', bump);
    window.addEventListener('wheel', bump, { passive: true });
    window.addEventListener('touchstart', bump, { passive: true });
  }

  #onKey(e, pressed) {
    // 暫停輸入時只忽略「按下」，放開一定要記錄，否則角色會一直往前走
    if (!this.enabled && pressed) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const action = ACTION_KEYS[e.code];
    if (action) {
      e.preventDefault();
      if (pressed && !e.repeat) this.emitAction(action);
      return;
    }

    const move = MOVE_KEYS[e.code];
    if (!move) return;
    if (e.code.startsWith('Arrow')) e.preventDefault();
    this.state[move] = pressed;
    this.markActive();
  }

  #releaseAll() {
    for (const k of Object.keys(this.state)) this.state[k] = false;
    this.virtualMove.x = this.virtualMove.y = 0;
  }

  /** 註冊動作回呼：cb('interact' | 'roast' | 'blanket' | 'stargaze') */
  onAction(cb) {
    this._actionListeners.push(cb);
  }

  emitAction(name) {
    if (!this.enabled) return;
    this.markActive();
    for (const cb of this._actionListeners) cb(name);
  }

  /** 設為 false 時忽略所有輸入（例如進場畫面開著時） */
  get enabled() {
    return this._enabled ?? true;
  }

  set enabled(v) {
    this._enabled = v;
    if (!v) this.#releaseAll(); // 暫停（換房間、進場畫面）時，清掉所有按住的鍵
  }

  markActive() {
    this.lastActivity = performance.now();
  }

  /** 距離上次操作經過幾秒 */
  get idleSeconds() {
    return (performance.now() - this.lastActivity) / 1000;
  }

  get isRunning() {
    return this.state.run || Math.hypot(this.virtualMove.x, this.virtualMove.y) > 0.95;
  }

  /** 是否有移動輸入（用來取消坐著的動作） */
  get hasMoveInput() {
    const v = this.getMoveVector();
    return Math.hypot(v.x, v.y) > 0.2;
  }

  /**
   * 回傳正規化的移動向量：x = 右(+)/左(-)，y = 前(+)/後(-)
   */
  getMoveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0) + this.virtualMove.x;
    let y = (this.state.forward ? 1 : 0) - (this.state.backward ? 1 : 0) + this.virtualMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }
}
