import * as THREE from 'three';
import { createLogProp } from './props.js';
import { EMOTES, EMOTE_IDS } from '../social/emotes.js';
import { t } from '../i18n/i18n.js';

const INTERACT_DIST = 2.9; // 離營火中心多近可以互動
const ROAST_DIST = 1.9; // 烤棉花糖時自動站到的位置
const ROAST_SECONDS = 7; // 從生到焦黑（doneness = 1）需要的秒數
const WOOD_FUEL = 25;

const SIT_STATES = new Set(['roast', 'blanket', 'stargaze', 'fish', 'sofa', 'sleep', 'eat']);
const EAT_SECONDS = 2.6; // 🍡 吃棉花糖的動作長度
/** 短短的動作：採摘、揮網、種菜、澆水 */
const PERFORMS = new Set(['pick', 'catch', 'plant', 'water']);

const PROMPTS = {
  near: t('<kbd>E</kbd> 添柴火　<kbd>F</kbd> 烤棉花糖'),
  roast: t('<kbd>F</kbd> 收回享用　·　移動＝收起'),
  blanket: t('<kbd>Z</kbd> 起身　·　或直接移動'),
  stargaze: t('<kbd>空白鍵</kbd> 回到營火旁　·　或直接移動'),
  fish: t('盯著浮標：整個沉下去時按 <kbd>F</kbd> 拉竿　·　<kbd>E</kbd> 或移動就收竿'),
  sofa: t('坐著休息中　·　移動就起身'),
  sleep: t('躺著睡一下 💤　·　移動就起身'),
  seat: t('<kbd>F</kbd> 烤棉花糖　·　<kbd>E</kbd> 或移動＝起身'),
};
/** 手機畫面小：提示短一點（按鍵會換成按鈕圖示） */
const PROMPTS_SHORT = {
  near: PROMPTS.near,
  roast: t('<kbd>F</kbd> 收回享用'),
  blanket: t('<kbd>Z</kbd> 起身'),
  stargaze: t('<kbd>空白鍵</kbd> 起身'),
  fish: t('浮標整個沉下去就按 <kbd>F</kbd>'),
  sofa: t('移動就起身'),
  sleep: t('💤 移動就起身'),
  seat: t('<kbd>F</kbd> 烤棉花糖'),
};

/**
 * 角色動作狀態機
 *
 *            ┌── E（靠近營火）──► addWood ──（約 1.7 秒後自動）──┐
 *   free ────┼── F（靠近營火）──► roast ── F 收回 / 移動取消 ────┤
 *            ├── Z ─────────────► blanket ── Z / 移動 ──────────┤
 *            └── Space ─────────► stargaze ── Space / 移動 ─────┴──► free
 *
 * 坐著的狀態（roast / blanket / stargaze）之間可以直接互相切換。
 */
export class ActionStateMachine {
  constructor({ player, campfire, world, cameraRig, hud, zzz, scene }) {
    Object.assign(this, { player, campfire, world, cameraRig, hud, zzz, scene });
    this.state = 'free';
    this.t = 0;
    this.doneness = 0;
    /** 目前所在的房間（RoomManager 設定）；房間可以攔截動作、提供提示 */
    this.room = null;
    this.eaten = 0;
    /** 🪵 坐在營火旁的圓木上（{ x, z, h, face }）；坐著烤棉花糖不會被挪到火邊，吃完繼續坐 */
    this.seat = null;
    this._result = { locked: false, pose: null, faceAngle: null, state: 'free' };

    // 丟出去的木柴
    this.flyingLog = createLogProp();
    this.flyingLog.visible = false;
    scene.add(this.flyingLog);
    this._logFrom = new THREE.Vector3();
    this._logSpawned = false;
    this._logLanded = false;

    this._zzzTimer = 0;
    this._meteorSeen = false;
    world.onMeteor = () => {
      if (this.state === 'stargaze' && !this._meteorSeen) {
        this._meteorSeen = true;
        this.onMeteor?.(); // 每日任務「看見流星」
        hud.toast(t('🌠 流星！快許個願吧'));
      }
    };
  }

  get character() {
    return this.player.character;
  }

  get fireDistance() {
    return Math.hypot(this.player.position.x, this.player.position.z);
  }

  get nearFire() {
    return !!this.campfire && this.fireDistance < INTERACT_DIST;
  }

  /** 給房間用：進入某個動作狀態 */
  start(state) {
    this.#enter(state);
  }

  /**
   * 表情動作（打招呼、敬禮、掰掰、拜拜）：播完自動結束，移動也會中斷
   * @param {string} id
   */
  emote(id) {
    if (!EMOTE_IDS.has(id) || this.state === 'addWood') return;
    if (this.state !== 'free') this.#exit(true);
    this.state = id;
    this.t = 0;
    this.emoteDuration = EMOTES.find((e) => e.id === id).duration;
  }

  /**
   * 短短的動作（採摘 pick、揮網 catch、種菜 plant、澆水 water）：播完自動結束，播的時候不能動
   * @returns {boolean} 有沒有開始（正在做別的事就不行）
   */
  perform(id, duration, faceAngle = null) {
    if (this.state !== 'free') return false;
    this.state = id;
    this.t = 0;
    this.performDuration = duration;
    this.performFace = faceAngle;
    return true;
  }

  /** 🛋️ 坐沙發（sofa）、躺床（sleep）：一移動就起身 */
  rest(kind, faceAngle) {
    if (this.state !== 'free') this.#exit(true);
    this.state = kind;
    this.t = 0;
    this.restFace = faceAngle;
    this._zzzTimer = 1.2;
  }

  /** 🪵 坐到營火旁的圓木上 */
  sit(seat) {
    this.rest('sofa', seat.face);
    this.seat = seat;
  }

  /** 給房間用：結束目前動作 */
  stop() {
    if (this.state !== 'free') this.#exit(true);
  }

  /** 切換房間前：不留提示地回到自由狀態 */
  forceFree() {
    if (this.state !== 'free') this.#exit(true);
    this.flyingLog.visible = false;
  }

  /** 由 InputController 的動作事件呼叫 */
  handleAction(name) {
    const s = this.state;
    if (s === 'addWood') return; // 丟木柴中不接受其他指令
    if (this.room?.onAction?.(name, this)) return; // 子房間自己的規則

    switch (name) {
      case 'interact':
        if (s === 'roast') return;
        if (this.nearFire) this.#enter('addWood');
        else this.hud.toast(t('走近營火再按 E 添柴火 🪵'));
        break;

      case 'roast':
        if (s === 'roast') this.#finishRoast();
        else if (this.nearFire) this.#enter('roast');
        else this.hud.toast(t('走近營火才能烤棉花糖 🍡'));
        break;

      case 'blanket':
        if (s === 'blanket') this.#exit();
        else this.#enter('blanket');
        break;

      case 'stargaze':
        if (s === 'stargaze') this.#exit();
        else this.#enter('stargaze');
        break;
    }
  }

  #enter(state) {
    const keepSeat = state === 'roast' ? this.seat : null; // 坐在圓木上烤棉花糖：還是坐在同一個位置
    if (this.state !== 'free') this.#exit(true);
    this.seat = keepSeat;
    this.state = state;
    this.t = 0;
    const c = this.character;

    if (state === 'addWood') {
      c.setProp('log', true);
      this._logSpawned = false;
      this._logLanded = false;
    } else if (state === 'roast') {
      this.doneness = 0;
      c.stick.setDoneness(0);
      c.setProp('stick', true);
      this.hud.showRoast(true);
      this.hud.setRoast(0);
    } else if (state === 'blanket') {
      c.setProp('blanket', true);
      this._zzzTimer = 0.6;
    } else if (state === 'fish') {
      c.setProp('rod', true);
    } else if (state === 'stargaze') {
      this._meteorSeen = false;
      this.cameraRig.lookUp = true;
      this.world.meteorMode = 'shower';
    }
  }

  #exit(silent = false) {
    const c = this.character;
    c.setProp('log', false);
    c.setProp('stick', false);
    c.setProp('blanket', false);
    c.setProp('rod', false);
    this.hud.showRoast(false);
    this.cameraRig.lookUp = false;
    this.world.meteorMode = 'rare';
    if (this.state === 'roast' && !silent) this.hud.toast(t('先把棉花糖收起來了'));
    this.state = 'free';
    this.seat = null;
    this.t = 0;
  }

  #finishRoast() {
    const d = this.doneness;
    this.eaten++;
    let msg;
    if (d < 0.35) msg = t('還有點生⋯ 不過軟軟的也很好吃 🤍');
    else if (d < 0.75) msg = t('完美金黃 ✨ 外酥內軟！');
    else if (d < 1.0) msg = t('有點焦，但焦香味很讚 👍');
    else msg = t('烤成黑炭了⋯ 還是勇敢吃掉 😵');
    this.hud.toast(t('{msg}（已吃掉 {n} 顆）', { msg, n: this.eaten }));
    this.onRoastDone?.(d); // 每日任務「完美棉花糖」
    this.character.setProp('stick', false);
    this.hud.showRoast(false);
    // 🍡 吃棉花糖的動作（其他人也看得到）；吃完：坐在圓木上就繼續坐著，不然站起來
    this.eatDone = d;
    this.character.setEat?.(d);
    this.state = 'eat'; // 不走 #exit，避免「收起來了」提示
    this.t = 0;
  }

  /**
   * 每幀呼叫。回傳給 Player 的控制資訊。
   * @param {number} dt
   * @param {boolean} hasMoveInput
   */
  update(dt, hasMoveInput) {
    this.t += dt;
    const p = this.player.position;
    const faceFire = Math.atan2(-p.x, -p.z);
    const r = this._result;
    r.state = this.state;
    r.locked = false;
    r.pose = null;
    r.faceAngle = null;

    // 坐著時一移動就起身
    const fishingLocked = this.state === 'fish' && this.room?.fishing?.lockMove;
    if (SIT_STATES.has(this.state) && hasMoveInput && !fishingLocked) {
      this.#exit();
      r.state = 'free';
    }

    // 表情動作
    if (EMOTE_IDS.has(this.state)) {
      if (hasMoveInput || this.t > this.emoteDuration) {
        this.state = 'free';
        this.t = 0;
      } else {
        r.locked = true;
        r.pose = this.state;
        r.state = this.state;
        return r;
      }
    }

    // 採摘、揮網：播完自動結束
    if (PERFORMS.has(this.state)) {
      if (this.t > this.performDuration) {
        this.state = 'free';
        this.t = 0;
      } else {
        r.locked = true;
        r.pose = this.state;
        r.state = this.state;
        r.faceAngle = this.performFace;
        return r;
      }
    }

    switch (this.state) {
      case 'addWood':
        r.locked = true;
        r.pose = 'throw';
        r.faceAngle = faceFire;
        this.#updateThrow();
        break;

      case 'roast': {
        r.locked = true;
        r.pose = 'roast';
        r.faceAngle = faceFire;
        // 自動挪到剛好的距離（坐在圓木上就不動，竹籤伸得到火）
        if (!this.seat) {
          const d = this.fireDistance || 1;
          const target = THREE.MathUtils.lerp(d, ROAST_DIST, 1 - Math.exp(-6 * dt));
          p.x *= target / d;
          p.z *= target / d;
        }
        // 火越旺烤越快
        this.doneness += (dt / ROAST_SECONDS) * (0.6 + this.campfire.strength * 0.4);
        this.character.stick.setDoneness(this.doneness);
        this.hud.setRoast(this.doneness);
        break;
      }

      case 'eat':
        r.locked = true;
        r.pose = 'eat';
        r.faceAngle = this.seat ? this.seat.face : faceFire;
        if (this.t > EAT_SECONDS) {
          this.state = this.seat ? 'sofa' : 'free';
          if (this.seat) this.restFace = this.seat.face;
          this.t = 0;
        }
        break;

      case 'blanket':
        r.locked = true;
        r.pose = 'blanket';
        this._zzzTimer -= dt;
        if (this._zzzTimer <= 0) {
          this._zzzTimer = 1.1 + Math.random() * 0.4;
          this.zzz.spawn(this.character.getHeadWorldPosition(new THREE.Vector3()));
        }
        break;

      case 'stargaze':
        r.locked = true;
        r.pose = 'lookUp';
        break;

      case 'sofa':
      case 'sleep':
        r.locked = true;
        r.pose = this.state === 'sleep' ? 'sleep' : 'sit';
        r.faceAngle = this.restFace;
        if (this.state === 'sleep') {
          this._zzzTimer -= dt;
          if (this._zzzTimer <= 0) {
            this._zzzTimer = 1.4 + Math.random() * 0.5;
            this.zzz.spawn(this.character.getHeadWorldPosition(new THREE.Vector3()));
          }
        }
        break;

      case 'fish': {
        // 坐到碼頭盡頭、面向湖心
        const spot = this.room?.fishSpot;
        r.locked = true;
        r.pose = this.room?.fishing?.pose ?? 'roast'; // 平常和烤棉花糖同一個姿勢；拉竿、炫耀另外的姿勢
        if (spot) {
          r.faceAngle = spot.face;
          const k = 1 - Math.exp(-5 * dt);
          p.x += (spot.x - p.x) * k;
          p.z += (spot.z - p.z) * k;
        }
        break;
      }
    }

    r.state = this.state;
    return r;
  }

  #updateThrow() {
    const time = this.t; // 不能叫 t：會蓋掉翻譯函式 t()
    if (time >= 0.95 && !this._logSpawned) {
      this._logSpawned = true;
      this.character.setProp('log', false);
      this.character.getHandWorldPosition(this._logFrom);
      this.flyingLog.position.copy(this._logFrom);
      this.flyingLog.visible = true;
    }
    if (this._logSpawned && !this._logLanded) {
      // 拋物線飛向火堆中心
      const u = Math.min((time - 0.95) / 0.45, 1);
      const L = this.flyingLog;
      L.position.x = THREE.MathUtils.lerp(this._logFrom.x, 0, u);
      L.position.z = THREE.MathUtils.lerp(this._logFrom.z, 0, u);
      L.position.y = THREE.MathUtils.lerp(this._logFrom.y, 0.35, u) + Math.sin(u * Math.PI) * 0.7;
      L.rotation.y = u * 4;
      L.rotation.z = u * 2.5;
      if (u >= 1) {
        this._logLanded = true;
        L.visible = false;
        this.campfire.addFuel(WOOD_FUEL);
        this.onAddWood?.(); // M3：通知伺服器
        this.hud.toast(t('劈啪！火燒得更旺了 🔥'));
      }
    }
    if (time > 1.75) this.#exit(true);
  }

  /** 目前該顯示的互動提示（HTML）或 null */
  get prompt() {
    if (EMOTE_IDS.has(this.state)) return null;
    if (this.state === 'fish' && this.room?.fishing?.phase === 'show') return this.compact ? t('<kbd>F</kbd> 繼續釣　·　走開就舉著魚炫耀') : t('<kbd>F</kbd> 繼續釣魚　·　直接走開，就舉著魚到處炫耀 🐟');
    if (this.state === 'fish' && this.room?.fishing?.busy) return null;
    if (this.state === 'sofa' && this.seat) return (this.compact ? PROMPTS_SHORT : PROMPTS).seat;
    if (this.state === 'free') {
      if (this.room?.prompt) return this.room.prompt(this);
      return this.nearFire ? PROMPTS.near : null;
    }
    return (this.compact ? PROMPTS_SHORT : PROMPTS)[this.state] ?? null;
  }
}
