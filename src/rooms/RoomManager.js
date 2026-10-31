import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

const FADE_MS = 450;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 房間（地點）管理：
 * - 玩家走進入口 → 黑幕淡出 → 換場景資料（Group、霧、燈光、碰撞、聲音）→ 通知伺服器換房 → 淡入
 * - 森林的星空會搬到戶外的子房間（樹屋、湖畔）共用
 */
export class RoomManager {
  /**
   * @param {object} o
   * @param {THREE.Scene} o.scene
   * @param {Record<string, any>} o.rooms   id → room
   * @param {string} o.start                起始房間
   */
  constructor({ scene, rooms, start, player, cameraRig, actions, input, hud, audio, onEnter }) {
    Object.assign(this, { scene, rooms, player, cameraRig, actions, input, hud, audio, onEnter });
    this.forest = rooms.forest_main;
    this.current = null;
    this.busy = false;

    for (const room of Object.values(rooms)) {
      room.group.visible = false;
      scene.add(room.group);
    }

    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    document.body.appendChild(this.fadeEl);

    this.#activate(rooms[start]);
  }

  /** 立刻切到某個房間（不含淡出淡入與網路） */
  #activate(room, from = null) {
    if (this.current) this.current.group.visible = false;
    this.current = room;
    room.group.visible = true;
    this.scene.fog = room.fog ?? null;
    this.scene.background = room.background ?? null;

    // 星空：戶外房間共用森林那片天空
    const sky = this.forest.world.sky;
    if (room.outdoor) room.group.add(sky);
    sky.visible = !!room.outdoor;

    // 玩家位置
    const spawn = (from && room.returnSpawn?.[from]) || room.spawn;
    if (spawn) {
      this.player.position.set(spawn.x, 0, spawn.z);
      this.player.rotationY = spawn.ry;
    }
    this.player.velocity.set(0, 0, 0);

    // 動作與相機
    this.actions.room = room;
    this.actions.campfire = room.campfire ?? null;
    this.cameraRig.occluders = room.occluders ?? [];
    this.#snapCamera(room.cameraDistance ?? 7, spawn);

    this.audio.setRoomPreset(room.audio, { focusMode: !!room.focusMode });
    if (room.campfire) this.audio.setFirePosition({ x: 0, y: 0.5, z: 0 });
    this.onEnter?.(room, from);
  }

  #snapCamera(distance, spawn) {
    const rig = this.cameraRig;
    // 在角色背後；房間可以指定稍微偏一點的角度（避開招牌、看到更多場景）
    const yaw = this.player.rotationY + Math.PI + (spawn?.camYaw ?? 0);
    rig.pitch = rig.target.pitch = spawn?.camPitch ?? 0.36;
    rig.yaw = rig.target.yaw = yaw;
    rig.distance = rig.target.distance = distance;
    rig.blockedDistance = Infinity;
    rig.focus.copy(this.player.position).add(new THREE.Vector3(0, 1, 0));
  }

  /**
   * 換房間（含黑幕與伺服器通知）
   * @param {string} id
   * @param {(id: string) => Promise<any>} [network] 回傳伺服器的房間資料
   */
  async switchTo(id, network) {
    const target = this.rooms[id];
    if (!target || this.busy || target === this.current) return;
    this.busy = true;
    const from = this.current.id;

    this.input.enabled = false;
    this.actions.forceFree();
    this.fadeEl.textContent = target.label;
    this.fadeEl.classList.add('show');
    await wait(FADE_MS);

    this.#activate(target, from);
    let netResult = null;
    try {
      netResult = await network?.(id);
    } catch {
      /* 離線或逾時：當作單人模式 */
    }
    this.onSwitched?.(target, netResult);

    await wait(250);
    this.fadeEl.classList.remove('show');
    this.input.enabled = true;
    this.input.markActive();
    this.busy = false;
    this.hud.toast(t('來到了 {place}', { place: target.label }));
  }

  /** 每幀：檢查是否走進入口、更新房間動畫 */
  update(dt, elapsed, camera) {
    const room = this.current;
    // 森林的天空與火持續運作（星空在戶外房間共用，火勢多人同步）
    this.forest.world.update(dt, elapsed, camera);
    this.forest.campfire.update(dt, elapsed);
    room.update?.(dt, elapsed, camera, this.actions);

    if (this.busy || this.actions.state !== 'free') return null;
    const p = this.player.position;
    for (const e of room.entrances ?? []) {
      if (Math.hypot(p.x - e.x, p.z - e.z) < e.r) return e.to;
    }
    return null;
  }
}
