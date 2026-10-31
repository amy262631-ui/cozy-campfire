import * as THREE from 'three';

const WALK_SPEED = 3.0; // m/s
const RUN_MULTIPLIER = 1.7;
const ACCEL = 10; // 速度追隨係數，越大越靈敏
const TURN_SPEED = 12; // 轉向追隨係數

/** 取最短角度差的插值 */
export function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/**
 * 玩家：負責移動、轉向、碰撞；外觀交給 character（ProceduralFox 或 GltfCharacter）。
 */
export class Player {
  constructor(character) {
    this.radius = 0.35; // 碰撞半徑
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotationY = Math.PI; // 面向 -Z（營火方向）
    /** 'idle' | 'walk' | 'run' | 'addWood' | 'roast' | 'blanket' | 'stargaze'（M3 同步給伺服器） */
    this.actionState = 'idle';

    this.character = character;
    this.mesh = new THREE.Group();
    this.mesh.add(character.root);
  }

  /**
   * @param {object} action 來自 ActionStateMachine.update() 的結果
   *   { locked: boolean, pose: string|null, faceAngle: number|null, state: string }
   */
  update(dt, input, cameraYaw, world, elapsed, action) {
    const move = action.locked ? { x: 0, y: 0 } : input.getMoveVector();
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);

    // 以相機為基準的前方 (-sin, -cos) 與右方 (cos, -sin)
    const dirX = move.x * cos - move.y * sin;
    const dirZ = -move.x * sin - move.y * cos;

    const running = input.isRunning;
    const speed = WALK_SPEED * (running ? RUN_MULTIPLIER : 1);
    const k = 1 - Math.exp(-ACCEL * dt);
    this.velocity.x += (dirX * speed - this.velocity.x) * k;
    this.velocity.z += (dirZ * speed - this.velocity.z) * k;

    this.position.addScaledVector(this.velocity, dt);
    world.resolveCollision(this.position, this.radius);

    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const turnK = 1 - Math.exp(-TURN_SPEED * dt);
    if (action.faceAngle != null) {
      this.rotationY = lerpAngle(this.rotationY, action.faceAngle, turnK);
    } else if (planarSpeed > 0.15) {
      this.rotationY = lerpAngle(this.rotationY, Math.atan2(this.velocity.x, this.velocity.z), turnK);
    }

    const locomotion = planarSpeed < 0.3 ? 'idle' : running ? 'run' : 'walk';
    this.actionState = action.state === 'free' ? locomotion : action.state;
    this.character.setPose(action.pose ?? locomotion);
    this.character.update(dt, elapsed, planarSpeed);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;
  }

  /** 換成另一個角色外觀（進場畫面選動物時） */
  setCharacter(character) {
    this.mesh.remove(this.character.root);
    this.character = character;
    this.mesh.add(character.root);
  }

  /** Milestone 3 網路同步用的快照 */
  getNetworkState() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      rotationY: this.rotationY,
      actionState: this.actionState,
    };
  }
}
