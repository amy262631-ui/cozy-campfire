import * as THREE from 'three';
import { createCarriedStone } from '../../rooms/cairns.js';
import { createRoastStick, createLogProp, createBlanket, createFishingRod } from '../props.js';
import { createFishMesh, fishScale } from '../../fishing/fishModel.js';
import { buildAccessory } from '../accessories.js';

const TARGET_HEIGHT = 1.2; // 統一縮放到約 1.2m，與營火、長椅比例一致

/**
 * 把 GLB 動畫名稱對應到遊戲姿勢。名稱不分大小寫、包含關鍵字即可，
 * 例如 "Armature|Idle_A"、"walk_cycle"、"Sitting" 都能被找到。
 */
const CLIP_KEYWORDS = {
  idle: ['idle', 'stand', 'breath'],
  walk: ['walk'],
  run: ['run', 'gallop', 'jog'],
  sit: ['sit', 'rest', 'seat'],
  throw: ['throw', 'interact', 'pick', 'toss', 'attack'],
  sleep: ['sleep', 'lie', 'lay'],
  wave: ['wave', 'hello', 'greet'],
};

/** 遊戲姿勢 → 實際要播的動畫（沒有就往後找替代） */
const POSE_FALLBACK = {
  idle: ['idle'],
  walk: ['walk', 'run', 'idle'],
  run: ['run', 'walk', 'idle'],
  sit: ['sit', 'idle'],
  roast: ['sit', 'idle'],
  reel: ['sit', 'idle'],
  showOff: ['idle'],
  wave: ['wave', 'idle'],
  salute: ['idle'],
  bye: ['wave', 'idle'],
  pray: ['sit', 'idle'],
  lookUp: ['sit', 'idle'],
  blanket: ['sleep', 'sit', 'idle'],
  throw: ['throw', 'idle'],
};

/**
 * 以 GLTFLoader 載入的角色。介面與 ProceduralFox 相同（見該檔註解）。
 * 模型規範：面向 +Z、Y 軸朝上、腳底在原點附近；動畫至少要有 Idle 與 Walk。
 */
export class GltfCharacter {
  constructor(gltf) {
    this.root = new THREE.Group();
    this.pose = null;
    this.poseTime = 0;

    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // 正規化尺寸
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = TARGET_HEIGHT / (size.y || 1);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    this.root.add(model);
    this.height = TARGET_HEIGHT;
    this.width = Math.max(size.x, size.z) * s;

    // 動畫
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {};
    for (const [key, words] of Object.entries(CLIP_KEYWORDS)) {
      const clip = gltf.animations.find((c) => words.some((w) => c.name.toLowerCase().includes(w)));
      if (clip) this.clips[key] = this.mixer.clipAction(clip);
    }
    if (!this.clips.idle && gltf.animations[0]) this.clips.idle = this.mixer.clipAction(gltf.animations[0]);
    if (this.clips.throw) {
      this.clips.throw.setLoop(THREE.LoopOnce, 1);
      this.clips.throw.clampWhenFinished = true;
    }
    this.current = null;

    // 頭部參考點（Zzz 泡泡用）：找名字有 head 的骨頭，找不到就用頭頂高度
    this.headBone = null;
    model.traverse((o) => {
      if (!this.headBone && /head/i.test(o.name) && !/end|top/i.test(o.name)) this.headBone = o;
    });
    this.headAnchor = new THREE.Object3D();
    this.headAnchor.position.set(0, TARGET_HEIGHT * 0.85, 0);
    this.root.add(this.headAnchor);
    this.headStone = createCarriedStone();
    this.headStone.position.set(0, 0.2, 0);
    this.headStone.visible = false;
    this.headAnchor.add(this.headStone);

    // 道具：掛在 root 上（不依賴骨架命名，任何模型都能用）
    const chestY = TARGET_HEIGHT * 0.42;
    const front = this.width * 0.45;

    this.stick = createRoastStick();
    this.stick.group.position.set(0.12, chestY, front);
    this.stick.group.rotation.x = -0.3;
    this.stick.group.visible = false;
    this.root.add(this.stick.group);

    // 釣竿（湖畔碼頭）：往前上方翹起
    this.rod = createFishingRod();
    this.rod.group.position.set(0.12, chestY, front);
    this.rod.group.rotation.x = -0.55;
    this.rod.group.visible = false;

    this.heldFish = new THREE.Group();
    this.heldFish.position.set(0, TARGET_HEIGHT + 0.25, 0);
    this.heldFish.visible = false;
    this.root.add(this.heldFish);
    this.root.add(this.rod.group);

    this.log = createLogProp();
    this.log.position.set(0, chestY + 0.1, front + 0.05);
    this.log.visible = false;
    this.root.add(this.log);

    const blanket = createBlanket();
    const bs = Math.max(this.width / 0.8, 0.8);
    blanket.body.scale.multiplyScalar(bs);
    blanket.body.position.set(0, chestY * 0.9, 0);
    blanket.hood.visible = false; // GLB 頭部位置不固定，只用身體毛毯
    blanket.body.visible = false;
    this.root.add(blanket.body);
    this.blanket = blanket;

    this.setPose('idle');
  }

  setPose(name) {
    if (name === this.pose) return;
    this.pose = name;
    this.poseTime = 0;

    const key = (POSE_FALLBACK[name] || ['idle']).find((k) => this.clips[k]);
    const next = key && this.clips[key];
    if (!next || next === this.current) return;

    next.reset().setEffectiveWeight(1).fadeIn(0.25).play();
    if (this.current) this.current.fadeOut(0.25);
    this.current = next;
  }

  setProp(name, visible) {
    if (name === 'stick') this.stick.group.visible = visible;
    else if (name === 'rod') this.rod.group.visible = visible;
    else if (name === 'fish') this.heldFish.visible = visible;
    else if (name === 'log') this.log.visible = visible;
    else if (name === 'stone') this.headStone.visible = visible;
    else if (name === 'blanket') this.blanket.body.visible = visible;
  }

  /** 自訂模型不支援造型（只有內建動物有） */
  setOutfit() {}

  setAccessory(code) {
    if (this.accessory) this.headAnchor.remove(this.accessory);
    this.accessory = buildAccessory(code);
    if (this.accessory) {
      this.accessory.position.set(0.1, 0.15, 0);
      this.headAnchor.add(this.accessory);
    }
  }

  setHeldFish(index, size) {
    this.heldFish.clear();
    const mesh = createFishMesh(index);
    mesh.scale.setScalar(Math.max(0.42, fishScale(size) * 1.5));
    this.heldFish.add(mesh);
  }

  getHeadWorldPosition(target = new THREE.Vector3()) {
    return (this.headBone || this.headAnchor).getWorldPosition(target);
  }

  getHandWorldPosition(target = new THREE.Vector3()) {
    return this.log.getWorldPosition(target);
  }

  update(dt, t, speed) {
    this.poseTime += dt;
    // 走路動畫速度跟著移動速度
    if (this.current && (this.pose === 'walk' || this.pose === 'run')) {
      this.current.timeScale = THREE.MathUtils.clamp(speed / 3, 0.6, 1.8);
    } else if (this.current) {
      this.current.timeScale = 1;
    }
    this.mixer.update(dt);
  }
}
