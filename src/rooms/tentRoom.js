import * as THREE from 'three';
import { makeResolver, lowpoly, shadowAll } from './shared.js';
import { t } from '../i18n/i18n.js';

/**
 * 專注帳篷（tent_focus）：昏黃煤油燈、地毯、靠墊、矮桌。
 * 進來時全場預設靜音，畫面上方出現 25 分鐘番茄鐘。
 */
export function createTentRoom() {
  const group = new THREE.Group();
  group.name = 'tent_focus';

  const W = 3.0; // 半寬
  const H = 3.3;
  const D = 7.2;
  const canvas = new THREE.MeshStandardMaterial({ color: 0xd8c29a, roughness: 1, side: THREE.DoubleSide });
  const occluders = [];

  // 斜屋頂兩片
  const slant = Math.hypot(W, H);
  const lean = Math.atan2(W, H);
  for (const side of [-1, 1]) {
    const holder = new THREE.Group();
    holder.position.set((side * W) / 2, H / 2, 0);
    holder.rotation.z = side * lean;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(D, slant), canvas);
    p.rotation.y = Math.PI / 2;
    holder.add(p);
    group.add(holder);
    occluders.push(p);
  }
  // 後牆
  const triShape = new THREE.Shape([new THREE.Vector2(-W, 0), new THREE.Vector2(W, 0), new THREE.Vector2(0, H)]);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(triShape), canvas);
  back.position.z = -D / 2;
  group.add(back);
  occluders.push(back);
  // 前牆：中間留門
  for (const side of [-1, 1]) {
    const half = new THREE.Shape([
      new THREE.Vector2(side * 0.55, 0),
      new THREE.Vector2(side * W, 0),
      new THREE.Vector2(0, H),
      new THREE.Vector2(side * 0.12, H * 0.94),
    ]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(half), canvas);
    m.position.z = D / 2;
    group.add(m);
    occluders.push(m);
  }
  // 屋脊木桿
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, D, 6).rotateX(Math.PI / 2), lowpoly(0x6b4a2e));
  ridge.position.y = H - 0.03;
  group.add(ridge);

  // 地板與地毯
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D), lowpoly(0x5c4733));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28), new THREE.MeshStandardMaterial({ color: 0x9c4f3e, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -1.7);
  rug.receiveShadow = true;
  group.add(rug);
  const rugRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 28), new THREE.MeshStandardMaterial({ color: 0xe8c58f, roughness: 1 }));
  rugRing.rotation.x = -Math.PI / 2;
  rugRing.position.set(0, 0.012, -1.7);
  group.add(rugRing);

  // 靠墊
  const cushionColors = [0xe6a57e, 0x8fb2a4, 0xe9d2a6];
  const cushionSpots = [[-1.35, -2.5], [1.35, -2.6], [-1.6, -0.6]];
  cushionSpots.forEach(([x, z], i) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), new THREE.MeshStandardMaterial({ color: cushionColors[i], roughness: 1 }));
    c.scale.set(1, 0.42, 1);
    c.position.set(x, 0.15, z);
    group.add(c);
  });

  // 矮桌＋馬克杯＋筆記本
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), lowpoly(0x8a6240));
  top.position.y = 0.36;
  table.add(top);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 5), lowpoly(0x6d4b30));
    leg.position.set(x, 0.17, z);
    table.add(leg);
  }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 }));
  mug.position.set(0.18, 0.45, 0.05);
  table.add(mug);
  const cocoa = new THREE.Mesh(new THREE.CircleGeometry(0.052, 12), new THREE.MeshStandardMaterial({ color: 0x5a3320 }));
  cocoa.rotation.x = -Math.PI / 2;
  cocoa.position.set(0.18, 0.505, 0.05);
  table.add(cocoa);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), new THREE.MeshStandardMaterial({ color: 0xfaf3e3, roughness: 1 }));
  book.position.set(-0.12, 0.405, -0.02);
  book.rotation.y = 0.3;
  table.add(book);
  table.position.set(0, 0, -1.7);
  group.add(table);

  // 捲起的睡袋
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.1, 14).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5f7f9a, roughness: 1 }));
  bag.position.set(1.4, 0.26, -3.1);
  group.add(bag);

  // 煤油燈（掛在屋脊）
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0, 2.45, -1.2);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
  glass.scale.y = 1.3;
  lampGroup.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 10), lowpoly(0x3a3a38));
  cap.position.y = 0.18;
  lampGroup.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 10), lowpoly(0x3a3a38));
  base.position.y = -0.16;
  lampGroup.add(base);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, H - 2.65, 4), lowpoly(0x222222));
  wire.position.y = 0.2 + (H - 2.65) / 2;
  lampGroup.add(wire);
  group.add(lampGroup);

  const lamp = new THREE.PointLight(0xffa858, 7, 9, 1.5);
  lamp.position.set(0, 2.3, -1.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.bias = -0.002;
  lamp.shadow.normalBias = 0.03;
  group.add(lamp);
  group.add(new THREE.HemisphereLight(0x6a5444, 0x241a12, 1.0));
  // 門口附近的柔和補光，讓角色背面不會太暗
  const fill = new THREE.PointLight(0xffc89a, 2.2, 7, 1.6);
  fill.position.set(0.6, 1.6, 2.4);
  group.add(fill);

  // 門口的隱形牆：只給相機用，讓鏡頭留在帳篷裡（不會被拉到門外）
  const doorBlock = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), new THREE.MeshBasicMaterial({ visible: false }));
  doorBlock.position.set(0, H / 2, D / 2 - 0.05);
  group.add(doorBlock);
  occluders.push(doorBlock);

  shadowAll(group);
  floor.castShadow = rug.castShadow = false;

  const colliders = [
    { x: 0, z: -1.7, r: 0.55 }, // 矮桌
    { x: 1.4, z: -3.1, r: 0.45 }, // 睡袋
    { x: 0.85, z: -3.1, r: 0.3 },
  ];
  const resolveCollision = makeResolver(colliders, { type: 'rect', minX: -2.3, maxX: 2.3, minZ: -3.4, maxZ: 3.55 });

  return {
    id: 'tent_focus',
    label: t('⛺ 專注帳篷'),
    group,
    fog: new THREE.FogExp2(0x140e0a, 0.03),
    background: new THREE.Color(0x0b0806),
    outdoor: false,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: 3.55, r: 0.6, label: t('回到營火') }],
    spawn: { x: 0, z: 0.4, ry: Math.PI, camYaw: 0.45, camPitch: 0.42 },
    cameraDistance: 3.4,
    focusMode: true, // 進入時預設靜音、顯示番茄鐘
    noStargaze: true,
    audio: { fire: 0.12, wind: 0.5, ambient: 0.5, water: 0, music: 0.6, song: 1 },
    resolveCollision,

    onAction(name, actions) {
      if (name === 'stargaze' && actions.state !== 'stargaze') {
        actions.hud.toast(t('帳篷裡看不到星星，到外面去吧 ✨'));
        return true;
      }
      if (actions.state === 'free' && (name === 'interact' || name === 'roast')) {
        actions.hud.toast(t('帳篷裡不能生火喔，在這裡專心一下吧 📖'));
        return true;
      }
      return false;
    },

    update(dt, t) {
      // 煤油燈輕微搖曳
      lamp.intensity = 7 * (0.93 + Math.sin(t * 2.3) * 0.04 + Math.sin(t * 7.1) * 0.03);
      lampGroup.rotation.z = Math.sin(t * 0.6) * 0.03;
    },
  };
}
