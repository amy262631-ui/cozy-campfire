import * as THREE from 'three';
import { createCarriedStone } from '../../rooms/cairns.js';
import { createRoastStick, createLogProp, createBlanket, createFishingRod, donenessColor } from '../props.js';
import { FUR_PALETTES } from './furPalettes.js';
import { SPECIES } from './species.js';
import { buildAccessory } from '../accessories.js';
import { buildOutfit, animateOutfit } from '../outfit3d.js';
import { OUTFIT_BY_ID } from '../../game/outfits.js';
import { HAIR_VOLUME } from '../hair3d.js';
import { createFishMesh, fishScale } from '../../fishing/fishModel.js';
import { buildYard } from '../../rooms/yardModels.js';

/**
 * 內建角色：用平滑球體拼成的圓滾滾 Q 版小狐狸（大頭、短身、短腳），五官是平面畫上去的。
 * 沒有 .glb 模型時使用；所有動作都是程序動畫。
 *
 * 角色共同介面（GltfCharacter 也實作同一套）：
 *   root                     THREE.Object3D
 *   setPose(name)            'idle' | 'walk' | 'run' | 'sit' | 'throw' | 'roast' | 'blanket' | 'lookUp'
 *   setProp(name, visible)   'log' | 'stick' | 'blanket' | 'stone'
 *   stick.setDoneness(p)     棉花糖熟度 0 ~ 1+
 *   getHeadWorldPosition(v)
 *   getHandWorldPosition(v)
 *   update(dt, elapsed, speed)
 */

const UP_Y = new THREE.Vector3(0, 1, 0);
const SIT_POSES = new Set(['sit', 'roast', 'blanket', 'lookUp', 'reel', 'sleep', 'eat', 'ride']);

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
const ARMS_REACH = [[-0.12, 0.2, 0.36], [0.12, 0.2, 0.36]]; // 採摘：彎腰伸手到地上
const ARMS_PULL = [[-0.14, 0.62, 0.24], [0.14, 0.62, 0.24]]; // 用力拔起來
const ARMS_NET = [[0.05, 0.95, 0.12], [0.2, 0.98, 0.1]]; // 揮網：雙手舉高

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
  constructor({ fur = 0, species = 0, tail = '', ears = '' } = {}) {
    this._furIndex = fur;
    this.speciesIndex = SPECIES[species] ? species : 0;
    // 🐾 可以換別的尾巴、耳朵形狀（looks.js）
    this.species = { ...SPECIES[this.speciesIndex], ...(tail ? { tail } : {}), ...(ears ? { ears } : {}) };
    this.tailId = tail;
    this.earId = ears;
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

    // 球的細緻度依大小：頭、身體 28×20，手腳尾巴這些小球 16×12（畫面上看不出差別，三角形少很多，營火區人多時比較順）
    const ball = (r) => (r >= 0.2 ? new THREE.SphereGeometry(r, 28, 20) : r >= 0.1 ? new THREE.SphereGeometry(r, 20, 14) : new THREE.SphereGeometry(r, 16, 12));
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
      new THREE.SphereGeometry(HEAD_R * 1.003, 36, 24, Math.PI / 2 - 0.85, 1.7, 0.95, 1.45),
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
    this.#buildEat(torso, head);

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

    // 石塔祈願：頂在頭上的小石頭
    this.headStone = createCarriedStone();
    this.headStone.position.set(0, 0.4, 0);
    this.headStone.visible = false;
    head.add(this.headStone);

    // 🦋 捕蟲網（揮網時才出現）
    this.netProp = new THREE.Group();
    const netPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.75, 6), mat(0xb08a5a));
    netPole.position.y = 0.37;
    const netRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 18), mat(0xe8e0cc));
    netRing.position.y = 0.86;
    const netBag = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 1 }));
    netBag.position.set(0, 0.86, -0.12);
    netBag.rotation.x = -Math.PI / 2;
    this.netProp.add(netPole, netRing, netBag);
    this.netProp.visible = false;
    torso.add(this.netProp);

    // 🚿 小澆水壺（澆水時才出現），壺嘴灑出小水滴
    this.canProp = new THREE.Group();
    const canMat = new THREE.MeshStandardMaterial({ color: 0x7ab8d8, roughness: 0.5, metalness: 0.2 });
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.13, 14), canMat);
    const canHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), canMat);
    canHandle.position.set(0, 0.06, -0.04);
    canHandle.rotation.y = Math.PI / 2;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.16, 6), canMat);
    spout.position.set(0, 0.03, 0.12);
    spout.rotation.x = 1.0;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.025, 10), canMat);
    rose.position.set(0, 0.085, 0.19);
    rose.rotation.x = 1.0;
    this.canProp.add(canBody, canHandle, spout, rose);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85 });
    this.drops = Array.from({ length: 8 }, (_, i) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), dropMat);
      d.userData.p = i / 8;
      d.scale.y = 1.6;
      this.canProp.add(d);
      return d;
    });
    this.canProp.visible = false;
    torso.add(this.canProp);

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
      } else if (type === 'fold') {
        // 折耳：小小的耳朵往前折下來
        ear.position.set(0.17 * side, 0.27, 0.02);
        ear.rotation.set(0.9, 0, -0.5 * side);
        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 16), earMat);
        outer.scale.z = 0.55;
        outer.position.y = 0.04;
        outer.castShadow = true;
        ear.add(outer);
      } else if (type === 'droopy') {
        // 垂耳：長長軟軟地垂在臉頰兩邊
        ear.position.set(0.25 * side, 0.12, -0.01);
        ear.rotation.z = 0.25 * side;
        add(ear, 0.09, furDark, [0, -0.1, 0], [0.75, 1.9, 0.4]);
      } else if (type === 'fennec') {
        // 大耳狐：又大又尖的耳朵
        ear.position.set(0.21 * side, 0.29, -0.03);
        ear.rotation.z = -0.45 * side;
        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 20), earMat);
        outer.scale.z = 0.45;
        outer.position.y = 0.12;
        outer.castShadow = true;
        ear.add(outer);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 16), pink);
        inner.scale.z = 0.3;
        inner.position.set(0, 0.1, 0.04);
        ear.add(inner);
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
    } else if (type === 'sleek') {
      // 滑順的長尾巴：一條平滑的弧線往上翹
      const curve = new THREE.CatmullRomCurve3([[0, 0, -0.02], [0, 0.04, -0.14], [0, 0.14, -0.22], [0, 0.28, -0.24], [0, 0.4, -0.17], [0, 0.44, -0.09]].map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 10), fur);
      tube.castShadow = true;
      this.tail.add(tube);
      add(this.tail, 0.047, fur, [0, 0.44, -0.09]);
    } else if (type === 'lion') {
      // 獅子尾：細細的尾巴，尾端一撮深色毛球
      const curve = new THREE.CatmullRomCurve3([[0, 0, -0.02], [0, -0.02, -0.16], [0, 0.04, -0.28], [0, 0.14, -0.34]].map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.03, 8), fur);
      tube.castShadow = true;
      this.tail.add(tube);
      add(this.tail, 0.075, furDark, [0, 0.17, -0.36], [1, 1.2, 1]);
    } else if (type === 'fluffy') {
      // 大蓬蓬尾：比狐狸尾巴更大更蓬
      add(this.tail, 0.17, fur, [0, 0.02, -0.04]);
      add(this.tail, 0.18, fur, [0, 0.16, -0.18]);
      add(this.tail, 0.15, fur, [0, 0.3, -0.24]);
      add(this.tail, 0.11, cream, [0, 0.42, -0.25]);
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

  /** 🍡 吃棉花糖用的小道具：手上的棉花糖、金黃的小星星、焦黑的黑煙、生的牽絲 */
  #buildEat(torso, head) {
    this.eatMallow = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: 0.7 }));
    this.eatMallow.visible = false;
    torso.add(this.eatMallow);
    // 🍲 吃料理用的小碗（左手捧著，右手一口一口送到嘴邊）（11/07）
    this.eatBowl = new THREE.Group();
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.6 });
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMat);
    bowl.material.side = THREE.DoubleSide;
    this.eatFood = new THREE.Mesh(new THREE.CircleGeometry(0.068, 14), new THREE.MeshStandardMaterial({ color: 0xe8a050, roughness: 0.8 }));
    this.eatFood.rotation.x = -Math.PI / 2;
    this.eatFood.position.y = -0.012;
    this.eatBowl.add(bowl, this.eatFood);
    this.eatBowl.visible = false;
    torso.add(this.eatBowl);
    this.eatString = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfff6e6 }));
    this.eatString.visible = false;
    torso.add(this.eatString);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, fog: false, toneMapped: false });
    this.eatStars = Array.from({ length: 5 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), starMat);
      m.userData.a = (i / 5) * Math.PI * 2;
      m.visible = false;
      head.add(m);
      return m;
    });
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x5a5250, transparent: true, depthWrite: false, fog: false });
    this.eatSmoke = Array.from({ length: 3 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11 + i * 0.03, 8, 6), smokeMat);
      m.visible = false;
      head.add(m);
      return m;
    });
    this.eatKind = 1;
  }

  /**
   * 吃棉花糖：依烤的程度有不同反應（d＝熟度）
   *   生的（< 0.35）牽絲拉長、金黃（< 0.75）冒星星＋開心轉圈、有點焦（< 1）點頭讚、黑炭 冒黑煙＋搖頭
   */
  setEat(d) {
    this.eatDish = false;
    this.eatKind = d < 0.35 ? 0 : d < 0.75 ? 1 : d < 1 ? 2 : 3;
    donenessColor(Math.min(d, 1.2), this.eatMallow.material.color);
  }

  /** 🍲 吃一道料理：捧著小碗吃，吃完開心轉圈（color＝碗裡食物的顏色） */
  setEatDish(color = 0xe8a050) {
    this.eatDish = true;
    this.eatKind = 1;
    this.eatFood.material.color.set(color);
  }

  setPose(name) {
    if (name === this.pose) return;
    this.pose = name;
    this.poseTime = 0;
  }

  setProp(name, visible) {
    if (name === 'bike') {
      // 🚲 騎門口的腳踏車：腳踏車放在腳下（角色整個抬高坐在座墊上）
      if (visible && !this.bike) {
        this.bike = buildYard('bike');
        this.bike.scale.setScalar(0.8);
        this.bike.rotation.y = -Math.PI / 2;
        this.bike.position.set(0, -0.4, 0.06);
        this.root.add(this.bike);
      }
      if (this.bike) this.bike.visible = visible;
      return;
    }
    if (name === 'stick') this.stick.group.visible = visible;
    else if (name === 'rod') this.rod.group.visible = visible;
    else if (name === 'fish') this.heldFish.visible = visible;
    else if (name === 'log') this.log.visible = visible;
    else if (name === 'stone') this.headStone.visible = visible;
    else if (name === 'blanket') {
      this.blanket.body.visible = this.blanket.hood.visible = visible;
      if (this.outfit?.back) this.outfit.back.visible = !visible;
      if (this.outfit?.head) this.outfit.head.visible = !visible;
      if (this.outfit?.hair) this.outfit.hair.visible = !visible;
    }
  }

  getHeadWorldPosition(target = new THREE.Vector3()) {
    return this.head.getWorldPosition(target);
  }

  /** 贊助者頭飾：0 無、1 小黃花、2 四葉草（插在頭頂右側；戴帽子時插在帽子上，不會被蓋掉） */
  setAccessory(code) {
    if (this._accCode === code) return;
    this._accCode = code;
    if (this.accessory) this.head.remove(this.accessory);
    this.accessory = buildAccessory(code);
    if (this.accessory) this.head.add(this.accessory);
    this.#placeAccessory();
  }

  #placeAccessory() {
    if (!this.accessory) return;
    const top = this.outfit?.head?.userData.hatTop ?? 0;
    if (top) {
      // 帽子：插在帽子右側外面一點，往上翹，整朵露出來
      this.accessory.position.set(0.24, Math.max(0.3, top - 0.1), 0.06);
      this.accessory.rotation.z = -0.55;
    } else {
      this.accessory.position.set(0.13, 0.3, 0.03);
      this.accessory.rotation.z = -0.25;
    }
  }

  /** 造型：{ head, back, neck }（造型代號，沒穿是 null） */
  setOutfit(wear = {}) {
    const key = `${wear.head ?? ''}|${wear.back ?? ''}|${wear.neck ?? ''}|${wear.hair ?? ''}`;
    if (this._outfitKey === key) return;
    this._outfitKey = key;
    this.outfit ??= {};
    // 💇 頭髮會看同時戴了什麼：戴帽子就收起頭頂的丸子、刺刺；背背包、圍圍巾就把長髮收短一點
    const fit = { hat: !!wear.head, back: !!wear.back, neck: !!wear.neck };
    for (const slot of ['head', 'back', 'neck', 'hair']) {
      const old = this.outfit[slot];
      if (old) old.parent?.remove(old);
      const g = wear[slot] ? buildOutfit(wear[slot], slot === 'hair' ? fit : undefined) : null;
      this.outfit[slot] = g;
      if (g) (slot === 'head' || slot === 'hair' ? this.head : this.torso).add(g);
    }
    // 耳朵太長（兔耳）時帽子稍微往上
    if (this.outfit.head && this.species.ears === 'long') this.outfit.head.position.y = 0.03;
    // 🎒 背了背包、翅膀、披風：尾巴往後下方翹開，不會插進背上的東西
    const backOn = !!this.outfit.back;
    this.tail.rotation.x = backOn ? -0.75 : 0;
    this.tail.position.set(0, backOn ? 0.2 : 0.28, backOn ? -0.34 : -0.3);
    // 有頭髮的時候，帽子跟著頭髮的蓬度放大、往上一點，戴在頭髮上面（不會陷進頭髮裡）
    const vol = this.outfit.hair ? (HAIR_VOLUME[OUTFIT_BY_ID[wear.hair]?.hair] ?? 0.04) : 0;
    if (this.outfit.head && vol) {
      this.outfit.head.scale.setScalar(1 + vol * 1.5);
      this.outfit.head.position.y += vol * 0.6;
    }
    // 🦌 馴鹿角：耳朵收起來（耳朵變成鹿角）；紅鼻子不管帽子怎麼縮放、移動，都對準臉上的鼻子
    const hideEars = !!this.outfit.head?.userData.hideEars;
    for (const e of this.ears ?? []) e.visible = !hideEars;
    const nose = this.outfit.head?.getObjectByName('rednose');
    if (nose) {
      const h = this.outfit.head;
      nose.position.set(-h.position.x / h.scale.x, (-0.078 - h.position.y) / h.scale.y, (0.37 - h.position.z) / h.scale.z);
      nose.scale.set(1.1 / h.scale.x, 0.9 / h.scale.y, 0.75 / h.scale.z);
    }
    // 🪨 頂石頭：戴帽子時放在帽子頂上（不然石頭會陷在帽子裡、看起來像不見了）；有頭髮就放在頭髮上面
    const hat = this.outfit.head;
    const hatTop = hat?.userData.hatTop ?? 0;
    this.headStone.position.y = hatTop ? hat.position.y + hatTop * hat.scale.y + 0.07 : 0.4 + vol;
    // 🐟 舉魚炫耀：戴帽子（尤其大大的蘑菇帽）時魚舉高一點，不會卡在帽子裡（作者 11/12 回報）
    this.fishY = Math.max(1.42, 0.82 + (hatTop ? hat.position.y + hatTop * hat.scale.y + 0.3 : 0.4 + vol + 0.2));
    this.#placeAccessory();
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

  #updateEat(P, armsT, t) {
    const on = P === 'eat';
    const pt = this.poseTime;
    const kind = this.eatKind;
    // 手上的棉花糖：咬一口小一點，咬第二口就吃完了
    // 🍲 吃料理：碗捧在左手，吃到 1.4 秒（開始開心反應）才收起來；不拿棉花糖
    this.eatBowl.visible = on && this.eatDish && pt < 1.45;
    if (this.eatBowl.visible) this.eatBowl.position.copy(this.arms[0].position).add(this._bowlOff ?? (this._bowlOff = new THREE.Vector3(0.06, 0.04, 0.06)));
    const left = !on || this.eatDish ? 0 : pt < 0.5 ? 1 : pt < 0.9 ? 0.62 : pt < (kind === 0 ? 1.25 : 1.15) ? 0.4 : 0;
    this.eatMallow.visible = left > 0;
    if (left > 0) {
      this.eatMallow.position.copy(this.arms[1].position).add(this._eatOff ?? (this._eatOff = new THREE.Vector3(-0.02, 0.07, 0.05)));
      this.eatMallow.scale.setScalar(left);
    }
    // 生的：嘴巴和手之間牽一條白白的絲
    const str = on && kind === 0 && pt > 0.55 && pt < 1.25;
    this.eatString.visible = str;
    if (str) {
      const a = this._eatMouth ?? (this._eatMouth = new THREE.Vector3(0.02, 0.7, 0.4));
      const b = this.eatMallow.visible ? this.eatMallow.position : this.arms[1].position;
      const mid = this._eatMid ?? (this._eatMid = new THREE.Vector3());
      mid.copy(a).add(b).multiplyScalar(0.5);
      this.eatString.position.copy(mid);
      const len = a.distanceTo(b);
      this.eatString.scale.set(1, Math.max(0.01, len), 1);
      const dir = (this._eatDir ?? (this._eatDir = new THREE.Vector3())).copy(b).sub(a).normalize();
      this.eatString.quaternion.setFromUnitVectors(UP_Y, dir);
    }
    // 金黃：頭上冒出小星星，整個人開心轉一圈
    const r = pt - 1.4;
    const stars = on && kind === 1 && r > 0 && r < 1.1;
    for (const m of this.eatStars) {
      m.visible = stars;
      if (!stars) continue;
      const a = m.userData.a + r * 2.5;
      const rad = 0.3 + r * 0.25;
      m.position.set(Math.cos(a) * rad, 0.3 + r * 0.35, Math.sin(a) * rad);
      m.rotation.y = t * 6;
      m.material.opacity = Math.max(0, 1 - r / 1.1);
    }
    const spin = on && kind === 1 && r > 0.05 && r < 0.75 ? ((r - 0.05) / 0.7) * Math.PI * 2 : 0;
    this.root.rotation.y = spin;
    // 黑炭：頭上冒一小團黑煙，搖搖頭
    const smoke = on && kind === 3 && pt > 1.0 && pt < 2.5;
    this.eatSmoke.forEach((m, i) => {
      m.visible = smoke;
      if (!smoke) return;
      const s = pt - 1.0 - i * 0.15;
      m.position.set((i - 1) * 0.1, 0.32 + Math.max(0, s) * 0.35, 0.05);
      m.scale.setScalar(Math.max(0.01, Math.min(1, s * 2.2)) * (1 + Math.max(0, s) * 0.5));
      m.material.opacity = Math.max(0, 0.8 - Math.max(0, s) * 0.55);
    });
    this.head.rotation.y = on && kind === 3 && r > 0 && r < 1.0 ? Math.sin(r * 16) * 0.35 * (1 - r) : 0;
  }

  update(dt, t, speed) {
    this.poseTime += dt;
    if (this.outfit?.back) animateOutfit(this.outfit.back, t);
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
      } else if (P === 'sleep') {
        // 躺在床上睡覺：閉眼、慢慢呼吸（整個人躺平在下面處理）
        headRX = -0.1;
        eyesOpen = 0.12;
        scaleY = 1 + Math.sin(t * 1.0) * 0.03;
        tailWag = Math.sin(t * 0.5) * 0.08;
      } else if (P === 'lookUp') {
        torsoRX = -0.22;
        headRX = -0.55;
        tailWag = Math.sin(t * 1.0) * 0.2;
      } else if (P === 'ride') {
        armsT[0].set(-0.16, 0.5, 0.32);
        armsT[1].set(0.16, 0.5, 0.32);
        torsoRX = 0.12;
        headRX = -0.05;
      } else if (P === 'eat') {
        // 🍡 拿到嘴邊（0～0.45 秒）→ 小口咬兩下（0.5、0.9 秒）→ 依熟度的反應（1.4 秒之後）
        const pt = this.poseTime;
        const kind = this.eatKind;
        const reacting = pt > 1.4;
        armsT[0].set(-0.12, 0.5, 0.3);
        const pull = kind === 0 && pt > 0.55 && pt < 1.25 ? Math.min(1, (pt - 0.55) / 0.4) : 0; // 生的：咬了往外拉，牽出一條絲
        armsT[1].set(0.07 + pull * 0.26, reacting ? 0.42 : 0.64 - pull * 0.16, reacting ? 0.3 : 0.38 + pull * 0.12);
        const bite = (at) => Math.max(0, 1 - Math.abs(pt - at) / 0.12);
        headRX = 0.1 + (bite(0.5) + bite(0.9)) * 0.12 + (pt > 0.5 && pt < 1.4 ? Math.sin(pt * 22) * 0.025 : 0); // 咬＋嚼嚼
        if (reacting) {
          const r = pt - 1.4;
          if (kind === 1) {
            eyesOpen = 0.12; // 開心瞇眼
            tailWag = Math.sin(t * 12) * 0.6;
            torsoY = -0.1 + Math.abs(Math.sin(r * 9)) * 0.03;
          } else if (kind === 0) {
            eyesOpen = 0.12;
            torsoRZ = Math.sin(r * 8) * 0.1; // 軟綿綿地晃一晃
            tailWag = Math.sin(t * 8) * 0.4;
          } else if (kind === 2) {
            headRX = 0.1 + Math.max(0, Math.sin(r * 9)) * 0.28; // 點頭讚
            eyesOpen = 0.12;
          } else {
            headRZ = 0;
            tailWag = Math.sin(t * 3) * 0.1;
          }
        }
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
      this.heldFish.position.y = (this.fishY ?? 1.42) + bounce * 0.03;
    } else if (P === 'pick') {
      // 0~0.4 蹲下伸手、0.4~0.75 用力往上拔（身體往後仰一下）、之後開心地拿起來
      const pt = this.poseTime;
      if (pt < 0.4) {
        ARMS_REACH.forEach((p, i) => armsT[i].set(...p));
        torsoY = -0.1;
        torsoRX = 0.5;
        headRX = 0.25;
      } else if (pt < 0.75) {
        ARMS_PULL.forEach((p, i) => armsT[i].set(...p));
        const w = Math.sin(pt * 40) * 0.04; // 拔的時候抖一抖
        torsoY = -0.04;
        torsoRX = -0.18 + w;
        torsoRZ = w;
        headRX = -0.1;
        eyesOpen = 0.1;
      } else {
        ARMS_HOLD.forEach((p, i) => armsT[i].set(...p));
        torsoY = Math.abs(Math.sin((pt - 0.75) * 9)) * 0.06; // 開心跳一下
        headRX = -0.15;
        eyesOpen = 0.12;
        tailWag = Math.sin(t * 12) * 0.6;
      }
    } else if (P === 'plant') {
      // 種菜：蹲下、兩手輪流挖土，最後拍拍土
      const pt = this.poseTime;
      torsoY = -0.1;
      torsoRX = 0.5;
      headRX = 0.3;
      const dig = Math.sin(pt * 14);
      armsT[0].set(-0.12, 0.2 + Math.max(0, dig) * 0.1, 0.36);
      armsT[1].set(0.12, 0.2 + Math.max(0, -dig) * 0.1, 0.36);
      if (pt > 1.1) {
        // 拍拍土、開心
        torsoY = -0.06 + Math.abs(Math.sin(pt * 10)) * 0.02;
        eyesOpen = 0.12;
        tailWag = Math.sin(t * 12) * 0.6;
      }
    } else if (P === 'water') {
      // 澆水：拿著小水壺往前傾，水滴灑下去，尾巴搖搖
      const pt = this.poseTime;
      const tilt = Math.min(1, pt / 0.35);
      ARMS_HOLD.forEach((p, i) => armsT[i].set(p[0] * 0.6, p[1] - 0.04, p[2] + 0.06));
      torsoRX = 0.18 * tilt;
      headRX = 0.2;
      eyesOpen = 0.12;
      tailWag = Math.sin(t * 10) * 0.5;
      this.canProp.position.set(0, 0.48, 0.42);
      this.canProp.rotation.x = 0.9 * tilt + Math.sin(pt * 6) * 0.06;
      for (const d of this.drops) {
        const u = (pt * 1.8 + d.userData.p) % 1;
        d.visible = tilt > 0.9;
        d.position.set(Math.sin(d.userData.p * 20) * 0.03, 0.06 - u * 0.35, 0.22 + u * 0.08);
      }
    } else if (P === 'catch') {
      // 揮網：舉高 → 往前撲 → 收回來
      const pt = this.poseTime;
      this.netProp.position.copy(this.arms[1].position);
      this.netProp.rotation.x = pt < 0.35 ? -0.3 : pt < 0.7 ? 1.1 : 0.4;
      if (pt < 0.35) {
        ARMS_NET.forEach((p, i) => armsT[i].set(...p));
        torsoRX = -0.15;
        headRX = -0.3;
      } else if (pt < 0.7) {
        ARMS_TOSS.forEach((p, i) => armsT[i].set(...p));
        torsoRX = 0.3;
        torsoY = 0.05;
      } else {
        ARMS_HOLD.forEach((p, i) => armsT[i].set(...p));
        eyesOpen = 0.12;
        tailWag = Math.sin(t * 12) * 0.6;
      }
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

    this.#updateEat(P, armsT, t);
    this.netProp.visible = P === 'catch';
    this.canProp.visible = P === 'water';

    // 舉著魚到處走：雙手一直舉高，魚在頭上扭來扭去
    if (this.heldFish.visible && P !== 'showOff' && !sitting) {
      ARMS_SHOW.forEach((p, i) => armsT[i].set(...p));
      this.heldFish.rotation.z = Math.sin(t * 9) * 0.15;
      this.heldFish.position.y = this.fishY ?? 1.42;
    }

    // 😴 掛機打瞌睡（坐著、釣魚、看星星時沒操作）：頭慢慢垂下、一點一點，眼睛閉起來
    if (this.doze && !moving) {
      headRX += 0.34 + Math.sin(t * 1.2) * 0.06;
      eyesOpen = 0.1;
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
    // 🛏️ 躺平：整個人往後倒，頭朝後面（床頭）
    const lie = P === 'sleep';
    this.root.rotation.x += ((lie ? -Math.PI / 2 : 0) - this.root.rotation.x) * k;
    const riding = P === 'ride';
    this.root.position.y += ((lie ? 0.2 : riding ? 0.4 : 0) - this.root.position.y) * k;
    if (riding) {
      // 踩腳踏車：腳一上一下（手握把手在上面的姿勢裡）
      const ph = t * 9 * Math.min(1, speed / 2);
      this.feet[0].position.y = 0.12 + Math.max(0, Math.sin(ph)) * 0.08;
      this.feet[1].position.y = 0.12 + Math.max(0, Math.sin(ph + Math.PI)) * 0.08;
    }

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
