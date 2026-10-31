import * as THREE from 'three';
import { createRoastStick, createLogProp, createBlanket, createFishingRod } from '../props.js';
import { FUR_PALETTES } from './furPalettes.js';
import { SPECIES } from './species.js';
import { buildAccessory } from '../accessories.js';
import { createFishMesh, fishScale } from '../../fishing/fishModel.js';

/**
 * 內建角色：用平滑球體拼成的圓滾滾 Q 版小狐狸（大頭、短身、短腳），五官是平面畫上去的。
 * 沒有 .glb 模型時使用；所有動作都是程序動畫。
 *
 * 角色共同介面（GltfCharacter 也實作同一套）：
 *   root                     THREE.Object3D
 *   setPose(name)            'idle' | 'walk' | 'run' | 'sit' | 'throw' | 'roast' | 'blanket' | 'lookUp'
 *   setProp(name, visible)   'log' | 'stick' | 'blanket'
 *   stick.setDoneness(p)     棉花糖熟度 0 ~ 1+
 *   getHeadWorldPosition(v)
 *   getHandWorldPosition(v)
 *   update(dt, elapsed, speed)
 */

const SIT_POSES = new Set(['sit', 'roast', 'blanket', 'lookUp', 'reel']);

// 兩隻腳（像小人一樣站著，手是另外兩顆小丸子）
const FEET_STAND = [[-0.13, 0.07, 0.04], [0.13, 0.07, 0.04]];
const FEET_SIT = [[-0.14, 0.07, 0.3], [0.14, 0.07, 0.3]]; // 坐下時腳伸到前面
const ARMS_REST = [[-0.29, 0.36, 0.1], [0.29, 0.36, 0.1]];
const ARMS_ROAST = [[-0.1, 0.42, 0.3], [0.17, 0.44, 0.3]];
const ARMS_HOLD = [[-0.2, 0.5, 0.28], [0.2, 0.5, 0.28]];
const ARMS_WINDUP = [[-0.2, 0.68, 0.06], [0.2, 0.68, 0.06]];
const ARMS_TOSS = [[-0.18, 0.6, 0.38], [0.18, 0.6, 0.38]];
const ARMS_BLANKET = [[-0.16, 0.4, 0.3], [0.16, 0.4, 0.3]];
const ARMS_REEL = [[-0.12, 0.5, 0.2], [0.15, 0.52, 0.2]]; // 拉竿：手往胸口收
const ARMS_SHOW = [[-0.2, 1.02, 0.06], [0.2, 1.02, 0.06]]; // 舉魚：雙手高舉

const v3 = (a) => new THREE.Vector3(...a);

/**
 * 畫在臉上的五官（平面貼圖，不凸起）：小豆豆眼、腮紅、小鼻子、ω 嘴，以及下半臉的奶油色。
 * 回傳睜眼與閉眼兩張貼圖，眨眼／打瞌睡時直接換圖。
 */
const faceCache = new Map();
function makeFaceTextures(kind = 'fox') {
  if (faceCache.has(kind)) return faceCache.get(kind);
  const S = 512;
  const draw = (eyesClosed) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    // 熊貓：眼睛外圍的黑色眼圈（先畫，眼睛疊在上面）
    if (kind === 'panda') {
      g.fillStyle = 'rgba(40, 36, 36, 0.95)';
      for (const [x, rot] of [[146, 0.55], [366, -0.55]]) {
        g.beginPath();
        g.ellipse(x, 246, 70, 88, rot, 0, Math.PI * 2);
        g.fill();
      }
    }

    // 下半臉奶油色（邊緣柔化，和毛色自然融合）；熊的嘴巴是一圈小圓
    const muzzle =
      kind === 'bear'
        ? g.createRadialGradient(256, 330, 20, 256, 330, 105)
        : g.createRadialGradient(256, 372, 40, 256, 372, 190);
    muzzle.addColorStop(0, 'rgba(255, 248, 236, 1)');
    muzzle.addColorStop(0.62, 'rgba(255, 248, 236, 0.95)');
    muzzle.addColorStop(1, 'rgba(255, 248, 236, 0)');
    g.fillStyle = muzzle;
    g.beginPath();
    if (kind === 'bear') g.ellipse(256, 330, 110, 85, 0, 0, Math.PI * 2);
    else g.ellipse(256, 372, 200, 150, 0, 0, Math.PI * 2);
    g.fill();

    // 柴犬的「麻呂眉」：眼睛上方兩顆奶油色小圓點
    if (kind === 'dog') {
      g.fillStyle = 'rgba(255, 246, 230, 0.95)';
      for (const x of [168, 344]) {
        g.beginPath();
        g.ellipse(x, 172, 20, 13, 0, 0, Math.PI * 2);
        g.fill();
      }
    }

    // 腮紅
    for (const x of [108, 404]) {
      const b = g.createRadialGradient(x, 300, 0, x, 300, 52);
      b.addColorStop(0, 'rgba(255, 140, 140, 0.75)');
      b.addColorStop(1, 'rgba(255, 150, 150, 0)');
      g.fillStyle = b;
      g.beginPath();
      g.arc(x, 300, 52, 0, Math.PI * 2);
      g.fill();
    }

    // 眼睛：睜眼＝小豆豆，閉眼＝彎彎的線（熊貓的眼圈是黑的，閉眼線改用白色）
    const eyeColor = kind === 'panda' ? '#141010' : '#3a2824';
    g.fillStyle = g.strokeStyle = eyeColor;
    if (kind === 'panda' && eyesClosed) g.strokeStyle = '#f6f3ec';
    g.lineCap = 'round';
    for (const x of [158, 354]) {
      if (eyesClosed) {
        g.lineWidth = 11;
        g.beginPath();
        g.arc(x, 226, 26, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      } else {
        g.beginPath();
        g.ellipse(x, 236, 22, 27, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255, 255, 255, 0.9)'; // 小小的反光點（也是平面畫上去的）
        g.beginPath();
        g.arc(x - 7, 226, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = eyeColor;
      }
    }

    // 小鼻子（貓、兔子是粉紅色的小三角；熊、熊貓大一點）
    const pinkNose = kind === 'cat' || kind === 'rabbit';
    const bigNose = kind === 'bear' || kind === 'panda';
    g.fillStyle = pinkNose ? '#f08f9a' : '#3a2824';
    g.beginPath();
    if (pinkNose) {
      g.moveTo(240, 290);
      g.lineTo(272, 290);
      g.lineTo(256, 308);
      g.closePath();
    } else g.ellipse(256, 298, bigNose ? 22 : 16, bigNose ? 15 : 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = g.strokeStyle = '#3a2824';

    // 貓和兔子的鬍鬚
    if (pinkNose) {
      g.strokeStyle = 'rgba(80, 60, 55, 0.55)';
      g.lineWidth = 4;
      for (const side of [-1, 1]) {
        for (const dy of [-12, 6, 24]) {
          g.beginPath();
          g.moveTo(256 + side * 70, 312 + dy * 0.4);
          g.lineTo(256 + side * 150, 300 + dy);
          g.stroke();
        }
      }
      g.strokeStyle = '#3a2824';
    }

    // ω 嘴
    g.lineWidth = 7;
    g.beginPath();
    g.arc(240, 314, 16, Math.PI * 0.1, Math.PI * 0.9);
    g.arc(272, 314, 16, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const pair = { open: draw(false), closed: draw(true) };
  faceCache.set(kind, pair);
  return pair;
}

export class ProceduralFox {
  /**
   * @param {{ fur?: number, species?: number }} [options]
   *   fur = 毛色索引（furPalettes.js）、species = 動物種類（species.js）
   */
  constructor({ fur = 0, species = 0 } = {}) {
    this._furIndex = fur;
    this.speciesIndex = SPECIES[species] ? species : 0;
    this.species = SPECIES[this.speciesIndex];
    this.root = new THREE.Group();
    this.pose = 'idle';
    this.poseTime = 0;

    this.#build();

    this._walkPhase = 0;
    this._blinkTimer = 2 + Math.random() * 3;
    this._earTimer = 4;
    this._tmp = new THREE.Vector3();
    this._feetTarget = FEET_STAND.map(v3);
    this._armsTarget = ARMS_REST.map(v3);
  }

  #build() {
    // 柔和的杏桃色系，霧面材質（不反光），整體更溫暖療癒
    const mat = (color, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });
    const sp = this.species;
    const palette = sp.fixed ?? FUR_PALETTES[this._furIndex] ?? FUR_PALETTES[0];
    const fur = mat(palette.fur);
    const furDark = mat(palette.dark);
    this.furMat = fur;
    this.furDarkMat = furDark;
    const cream = mat(0xfff6ea);
    const pink = mat(0xffc9c2);

    const ball = (r) => new THREE.SphereGeometry(r, 32, 24);
    const add = (parent, r, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], shadow = true) => {
      const m = new THREE.Mesh(ball(r), material);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.castShadow = shadow;
      parent.add(m);
      return m;
    };

    // 兩隻小腳
    this.feet = FEET_STAND.map((p) => add(this.root, 0.1, furDark, p, [1, 0.72, 1.25]));

    // 身體
    const torso = new THREE.Group();
    this.root.add(torso);
    add(torso, 0.34, fur, [0, 0.36, 0], [1.02, 0.88, 0.95]);
    add(torso, 0.24, cream, [0, 0.31, 0.215], [0.95, 1, 0.5], false);
    // 熊貓的手是黑的
    this.arms = ARMS_REST.map((p) => add(torso, 0.08, sp.fixed ? furDark : fur, p, [0.85, 1.1, 0.85]));

    // 頭：一顆完整的圓球，五官是畫上去的平面貼圖
    const head = new THREE.Group();
    head.position.set(0, 0.82, 0.02);
    torso.add(head);
    const HEAD_R = 0.37;
    const HEAD_SCALE = [1.1, 0.95, 1];
    add(head, HEAD_R, fur, [0, 0, 0], HEAD_SCALE);

    this.faceTextures = makeFaceTextures(sp.face);
    this.faceMat = new THREE.MeshStandardMaterial({
      map: this.faceTextures.open,
      transparent: true,
      depthWrite: false,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    // 只覆蓋臉部的一塊球面，半徑幾乎相同 → 完全貼合、沒有凸起
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_R * 1.003, 48, 32, Math.PI / 2 - 0.85, 1.7, 0.95, 1.45),
      this.faceMat,
    );
    face.scale.set(...HEAD_SCALE);
    head.add(face);
    this.eyesClosed = false;

    this.#buildEars(head, add, { fur, furDark, pink, cream });
    this.#buildTail(torso, add, { fur, furDark, cream });

    this.torso = torso;
    this.head = head;

    // ---- 道具 ----
    this.stick = createRoastStick();
    this.stick.group.position.set(0.16, 0.44, 0.3);
    this.stick.group.rotation.x = -0.3; // 往前上方伸向火堆
    this.stick.group.visible = false;
    torso.add(this.stick.group);

    // 釣竿（湖畔碼頭）：往前上方翹起
    this.rod = createFishingRod();
    this.rod.group.position.set(0.16, 0.44, 0.28);
    this.rod.group.rotation.x = -0.55;
    this.rod.group.visible = false;

    // 舉在頭上炫耀的魚（setHeldFish 換魚）
    this.heldFish = new THREE.Group();
    this.heldFish.position.set(0, 1.42, 0.06);
    this.heldFish.visible = false;
    torso.add(this.heldFish);
    torso.add(this.rod.group);

    this.log = createLogProp();
    this.log.position.set(0, 0.52, 0.34);
    this.log.visible = false;
    torso.add(this.log);

    const blanket = createBlanket();
    blanket.body.position.set(0, 0.38, 0.02);
    blanket.hood.position.set(0, 0.04, -0.03);
    blanket.body.visible = blanket.hood.visible = false;
    torso.add(blanket.body);
    head.add(blanket.hood);
    this.blanket = blanket;
  }

  /** 依動物種類做耳朵；userData.baseZ 記住原本的角度（抖耳朵用） */
  #buildEars(head, add, { fur, furDark, pink, cream }) {
    const type = this.species.ears;
    const earMat = this.species.fixed ? furDark : fur; // 熊貓黑耳朵
    this.ears = [];
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      head.add(ear);
      if (type === 'fox') {
        ear.position.set(0.2 * side, 0.27, -0.03);
        ear.rotation.z = -0.38 * side;
        add(ear, 0.12, earMat, [0, 0.05, 0], [0.82, 1.05, 0.45]);
        add(ear, 0.078, pink, [0, 0.045, 0.035], [0.75, 0.95, 0.3], false);
      } else if (type === 'cat' || type === 'dog') {
        // 圓圓的三角耳（柴犬大一點、裡面是奶油色）
        const big = type === 'dog';
        ear.position.set((big ? 0.21 : 0.2) * side, big ? 0.27 : 0.26, -0.02);
        ear.rotation.z = -(big ? 0.3 : 0.35) * side;
        const outer = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.13 : 0.11, big ? 0.24 : 0.21, 20), earMat);
        outer.scale.z = 0.55;
        outer.position.y = 0.06;
        outer.castShadow = true;
        ear.add(outer);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.08 : 0.065, big ? 0.16 : 0.14, 16), big ? cream : pink);
        inner.scale.z = 0.3;
        inner.position.set(0, 0.045, 0.04);
        ear.add(inner);
      } else if (type === 'round') {
        // 熊、熊貓：圓圓的小耳朵
        ear.position.set(0.25 * side, 0.24, -0.02);
        ear.rotation.z = -0.5 * side;
        add(ear, 0.105, earMat, [0, 0.04, 0], [1, 1, 0.55]);
        add(ear, 0.06, furDark, [0, 0.04, 0.04], [1, 1, 0.3], false);
      } else if (type === 'long') {
        // 兔子：長長的耳朵，微微往外張
        ear.position.set(0.11 * side, 0.3, -0.04);
        ear.rotation.z = -0.15 * side;
        add(ear, 0.085, earMat, [0, 0.2, 0], [0.8, 2.6, 0.45]);
        add(ear, 0.055, pink, [0, 0.2, 0.035], [0.75, 2.5, 0.3], false);
      }
      ear.userData.baseZ = ear.rotation.z;
      this.ears.push(ear);
    }
  }

  /** 依動物種類做尾巴（尾巴整組會左右擺） */
  #buildTail(torso, add, { fur, furDark, cream }) {
    const type = this.species.tail;
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.28, -0.3);
    torso.add(this.tail);
    if (type === 'fox') {
      add(this.tail, 0.14, fur, [0, 0, -0.02]);
      add(this.tail, 0.13, fur, [0, 0.09, -0.14]);
      add(this.tail, 0.1, cream, [0, 0.18, -0.21]);
    } else if (type === 'cat') {
      // 細長、往上捲的貓尾巴
      const pts = [[0, 0, -0.02], [0, 0.03, -0.1], [0, 0.08, -0.17], [0, 0.16, -0.21], [0, 0.25, -0.22], [0, 0.33, -0.19], [0, 0.38, -0.13]];
      pts.forEach((p, i) => add(this.tail, 0.055 - i * 0.002, fur, p));
    } else if (type === 'stub') {
      add(this.tail, 0.08, this.species.fixed ? fur : furDark, [0, 0, 0]);
    } else if (type === 'cotton') {
      add(this.tail, 0.1, cream, [0, 0, 0]);
    } else if (type === 'curl') {
      // 柴犬的捲尾巴：在背上捲一圈
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.055, 12, 24, Math.PI * 1.6), fur);
      curl.rotation.y = Math.PI / 2;
      curl.position.set(0, 0.12, -0.04);
      curl.castShadow = true;
      this.tail.add(curl);
      add(this.tail, 0.05, cream, [0, 0.03, 0.03]);
    }
  }

  /** 更換毛色（進場選色後呼叫） */
  setFur(index) {
    if (this.species.fixed) return; // 熊貓固定黑白
    const palette = FUR_PALETTES[index] ?? FUR_PALETTES[0];
    this._furIndex = index;
    this.furMat.color.setHex(palette.fur);
    this.furDarkMat.color.setHex(palette.dark);
  }

  setPose(name) {
    if (name === this.pose) return;
    this.pose = name;
    this.poseTime = 0;
  }

  setProp(name, visible) {
    if (name === 'stick') this.stick.group.visible = visible;
    else if (name === 'rod') this.rod.group.visible = visible;
    else if (name === 'fish') this.heldFish.visible = visible;
    else if (name === 'log') this.log.visible = visible;
    else if (name === 'blanket') this.blanket.body.visible = this.blanket.hood.visible = visible;
  }

  getHeadWorldPosition(target = new THREE.Vector3()) {
    return this.head.getWorldPosition(target);
  }

  /** 贊助者頭飾：0 無、1 小黃花、2 四葉草（插在頭頂右側） */
  setAccessory(code) {
    if (this._accCode === code) return;
    this._accCode = code;
    if (this.accessory) this.head.remove(this.accessory);
    this.accessory = buildAccessory(code);
    if (this.accessory) {
      this.accessory.position.set(0.13, 0.3, 0.03);
      this.accessory.rotation.z = -0.25;
      this.head.add(this.accessory);
    }
  }

  /** 換成要炫耀的魚（魚種索引、公分） */
  setHeldFish(index, size) {
    const key = `${index}:${size}`;
    if (this._heldKey === key) return;
    this._heldKey = key;
    this.heldFish.clear();
    const mesh = createFishMesh(index);
    mesh.scale.setScalar(Math.max(0.42, fishScale(size) * 1.5)); // 炫耀用：放大一點比較看得清楚
    mesh.traverse((o) => o.isMesh && (o.castShadow = true));
    this.heldFish.add(mesh);
  }

  getHandWorldPosition(target = new THREE.Vector3()) {
    return this.log.getWorldPosition(target);
  }

  update(dt, t, speed) {
    this.poseTime += dt;
    const k = 1 - Math.exp(-12 * dt);
    const P = this.pose;
    const moving = (P === 'walk' || P === 'run') && speed > 0.3;
    const sitting = SIT_POSES.has(P);

    // 目標值（每個姿勢覆寫自己關心的部分）
    let torsoY = 0;
    let torsoRX = 0;
    let torsoRZ = 0;
    let headRX = 0;
    let headRZ = 0;
    let scaleY = 1 + Math.sin(t * 2.2) * 0.022; // 呼吸
    let tailWag = Math.sin(t * 1.6) * 0.3;
    let eyesOpen = 1.12;
    const feetT = this._feetTarget;
    const armsT = this._armsTarget;
    FEET_STAND.forEach((p, i) => feetT[i].set(...p));
    ARMS_REST.forEach((p, i) => armsT[i].set(...p));

    if (moving) {
      this._walkPhase += dt * (5 + speed * 2.6);
      const ph = this._walkPhase;
      const hop = Math.abs(Math.sin(ph));
      torsoY = hop * 0.07;
      scaleY = 1 - (1 - hop) * 0.07;
      torsoRZ = Math.sin(ph) * 0.07;
      torsoRX = 0.06;
      this.feet.forEach((f, i) => {
        const s = Math.sin(ph + (i === 0 ? 0 : Math.PI));
        feetT[i].z += s * 0.07;
        feetT[i].y += Math.max(0, s) * 0.06;
      });
      // 手跟腳反方向前後擺，像小人走路
      armsT[0].z += -Math.sin(ph) * 0.07;
      armsT[1].z += Math.sin(ph) * 0.07;
      tailWag = Math.sin(ph * 0.5) * 0.45;
    } else if (sitting) {
      torsoY = -0.1;
      torsoRX = -0.12;
      FEET_SIT.forEach((p, i) => feetT[i].set(...p));

      if (P === 'roast') {
        ARMS_ROAST.forEach((p, i) => armsT[i].set(...p));
        headRX = 0.12;
        this.stick.group.rotation.x = -0.3 + Math.sin(t * 1.3) * 0.03; // 手微微晃動
        this.stick.group.rotation.y = Math.sin(t * 0.9) * 0.04;
        this.rod.group.rotation.x = -0.55 + Math.sin(t * 1.1) * 0.025; // 釣魚等待時竿子也輕輕晃
      } else if (P === 'reel') {
        // 拉竿：身體往後仰、竿子高高翹起、全身用力抖
        ARMS_REEL.forEach((p, i) => armsT[i].set(...p));
        torsoRX = -0.3 + Math.sin(t * 19) * 0.04;
        headRX = -0.08;
        this.rod.group.rotation.x = -1.0 + Math.sin(t * 23) * 0.07;
        this.rod.group.rotation.y = Math.sin(t * 9) * 0.08;
        tailWag = Math.sin(t * 9) * 0.5;
      } else if (P === 'blanket') {
        ARMS_BLANKET.forEach((p, i) => armsT[i].set(...p));
        headRX = 0.18;
        headRZ = Math.sin(t * 0.5) * 0.12; // 打瞌睡左右晃
        scaleY = 1 + Math.sin(t * 1.1) * 0.035; // 呼吸變慢變深
        eyesOpen = 0.12;
        tailWag = Math.sin(t * 0.6) * 0.1;
      } else if (P === 'lookUp') {
        torsoRX = -0.22;
        headRX = -0.55;
        tailWag = Math.sin(t * 1.0) * 0.2;
      }
    } else if (P === 'wave') {
      // 打招呼：右手高高舉起快速揮動、開心瞇眼
      armsT[1].set(0.34 + Math.sin(t * 14) * 0.07, 0.98, 0.1);
      headRZ = Math.sin(t * 5) * 0.12;
      torsoY = Math.abs(Math.sin(this.poseTime * 5)) * 0.03;
      eyesOpen = 0.12;
      tailWag = Math.sin(t * 12) * 0.6;
    } else if (P === 'salute') {
      // 敬禮：站直、右手貼額頭
      armsT[1].set(0.2, 0.98, 0.27);
      torsoRX = -0.06;
      headRX = -0.06;
      tailWag = 0;
    } else if (P === 'bye') {
      // 掰掰：右手舉在旁邊慢慢左右揮、頭微微歪
      armsT[1].set(0.3 + Math.sin(t * 6) * 0.1, 0.86, 0.16);
      headRZ = -0.15;
      tailWag = Math.sin(t * 4) * 0.4;
    } else if (P === 'pray') {
      // 拜拜：雙手合十在胸前、低頭鞠躬、閉眼
      armsT[0].set(-0.045, 0.6, 0.3);
      armsT[1].set(0.045, 0.6, 0.3);
      const bow = Math.min(1, this.poseTime / 0.6);
      torsoRX = 0.18 * bow;
      headRX = 0.3 * bow;
      eyesOpen = 0.12;
      tailWag = Math.sin(t * 1.2) * 0.1;
    } else if (P === 'showOff') {
      // 舉魚炫耀：雙手高舉、開心瞇眼、一跳一跳
      const bounce = Math.abs(Math.sin(this.poseTime * 6.5));
      torsoY = bounce * 0.06;
      torsoRX = -0.08;
      headRX = -0.22;
      ARMS_SHOW.forEach((p, i) => armsT[i].set(...p));
      eyesOpen = 0.12; // 閉眼貼圖是彎彎的笑眼
      tailWag = Math.sin(t * 11) * 0.6;
      this.heldFish.rotation.z = Math.sin(t * 9) * 0.15; // 魚在手上扭來扭去
      this.heldFish.position.y = 1.42 + bounce * 0.03;
    } else if (P === 'throw') {
      // 0~0.5 抱起木柴、0.5~0.9 往後蓄力、0.9~1.1 丟出、之後回復
      const pt = this.poseTime;
      if (pt < 0.5) {
        ARMS_HOLD.forEach((p, i) => armsT[i].set(...p));
      } else if (pt < 0.9) {
        ARMS_WINDUP.forEach((p, i) => armsT[i].set(...p));
        torsoRX = -0.2;
        headRX = -0.1;
      } else if (pt < 1.2) {
        ARMS_TOSS.forEach((p, i) => armsT[i].set(...p));
        torsoRX = 0.25;
        torsoY = 0.04;
      }
      this.log.position.copy(armsT[0]).add(armsT[1]).multiplyScalar(0.5);
      this.log.position.y += 0.02;
      this.log.position.z += 0.06;
    } else {
      headRZ = Math.sin(t * 0.7) * 0.06; // idle 歪頭晃晃
    }

    // 套用（插值讓姿勢切換平滑）
    const tor = this.torso;
    tor.position.y += (torsoY - tor.position.y) * (moving ? 1 : k);
    tor.rotation.x += (torsoRX - tor.rotation.x) * k;
    tor.rotation.z += (torsoRZ - tor.rotation.z) * (moving ? 1 : k);
    const sxz = moving ? 2 - scaleY : 1;
    tor.scale.set(sxz, scaleY, sxz);
    this.head.rotation.x += (headRX - this.head.rotation.x) * k;
    this.head.rotation.z += (headRZ - this.head.rotation.z) * k;
    this.tail.rotation.y = tailWag;
    this.feet.forEach((f, i) => f.position.lerp(feetT[i], moving ? 1 : k));
    this.arms.forEach((a, i) => a.position.lerp(armsT[i], P === 'throw' ? 1 - Math.exp(-20 * dt) : k));

    // 眨眼（裹毯時閉眼）：直接換成閉眼貼圖
    this._blinkTimer -= dt;
    let closed = eyesOpen < 0.5;
    if (!closed && this._blinkTimer < 0) {
      closed = true;
      if (this._blinkTimer < -0.13) this._blinkTimer = 2.5 + Math.random() * 3.5;
    }
    if (closed !== this.eyesClosed) {
      this.eyesClosed = closed;
      this.faceMat.map = closed ? this.faceTextures.closed : this.faceTextures.open;
    }

    // 偶爾抖耳朵
    this._earTimer -= dt;
    const twitch = this._earTimer < 0 ? Math.sin(-this._earTimer * 40) * 0.25 : 0;
    if (this._earTimer < -0.3) this._earTimer = 3 + Math.random() * 5;
    this.ears[1].rotation.z = this.ears[1].userData.baseZ + twitch;

    // 頭上的小花跟著動作輕輕搖晃（走路時晃得比較大，像被風吹）
    if (this.accessory) {
      const walk = moving ? Math.sin(this._walkPhase) * 0.28 : 0;
      this.accessory.rotation.z = -0.25 + Math.sin(t * 2.4) * 0.1 + walk;
      this.accessory.rotation.x += ((moving ? -0.3 : 0) + Math.sin(t * 1.7) * 0.05 - this.accessory.rotation.x) * k;
    }
  }
}
