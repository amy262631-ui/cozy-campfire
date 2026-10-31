import * as THREE from 'three';
import { makeResolver, makeSign, lowpoly, shadowAll } from './shared.js';
import { t } from '../i18n/i18n.js';

const R = 5; // 帳篷半徑
const WALL_H = 1.7;
const ROOF_H = 2.6;
const DOOR_GAP = 0.55; // 門口的開口角度（弧度）

/**
 * 交流帳篷（tent_social）：大大的圓形鐘形帳篷，圍成一圈的坐墊、中間的茶几、燈串和提燈。
 * 這裡可以聊天、用表情，大家坐在一起聊天。
 */
export function createSocialTentRoom() {
  const group = new THREE.Group();
  group.name = 'tent_social';
  const occluders = [];
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xe6d3ad, roughness: 1, side: THREE.DoubleSide });

  // 圓牆（門口朝 +Z 留開口）
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, WALL_H, 40, 1, true, DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP),
    canvasMat,
  );
  wall.position.y = WALL_H / 2;
  group.add(wall);
  occluders.push(wall);
  // 圓錐屋頂
  const roof = new THREE.Mesh(new THREE.ConeGeometry(R, ROOF_H, 40, 1, true), canvasMat);
  roof.position.y = WALL_H + ROOF_H / 2;
  group.add(roof);
  occluders.push(roof);
  // 門口上方的橫楣（讓門看起來像門）
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), lowpoly(0x8a6240));
  lintel.position.set(0, WALL_H, R - 0.05);
  group.add(lintel);
  // 門口的隱形牆：只擋相機
  const doorBlock = new THREE.Mesh(new THREE.PlaneGeometry(3, WALL_H + 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  doorBlock.position.set(0, (WALL_H + 0.5) / 2, R - 0.1);
  group.add(doorBlock);
  occluders.push(doorBlock);

  // 中柱
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, WALL_H + ROOF_H, 8), lowpoly(0x6d4b30));
  pole.position.y = (WALL_H + ROOF_H) / 2;
  group.add(pole);

  // 地板與大地毯
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 40), lowpoly(0x6a5038));
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshStandardMaterial({ color: 0x8e4a3a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.01;
  group.add(rug);
  for (const [r1, r2, c] of [[2.9, 3.05, 0xf0cf98], [1.6, 1.7, 0xf0cf98], [3.3, 3.4, 0x5d7f8f]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 40), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    group.add(ring);
  }

  // 中間的圓茶几＋茶具＋點心
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.07, 28), lowpoly(0x8a6240));
  top.position.y = 0.36;
  table.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.33, 16), lowpoly(0x6d4b30));
  leg.position.y = 0.165;
  table.add(leg);
  const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5f8f86, roughness: 0.5 }));
  teapot.scale.y = 0.8;
  teapot.position.set(0.3, 0.5, 0.25);
  table.add(teapot);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.14, 8), teapot.material);
  spout.position.set(0.43, 0.53, 0.25);
  spout.rotation.z = -0.9;
  table.add(spout);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 12), new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.6 }));
    cup.position.set(Math.sin(a) * 0.62, 0.43, Math.cos(a) * 0.62);
    table.add(cup);
  }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xf4efe4 }));
  plate.position.set(-0.25, 0.41, -0.15);
  table.add(plate);
  for (let i = 0; i < 5; i++) {
    const cookie = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xd49a5a }));
    cookie.position.set(-0.25 + Math.sin(i * 1.3) * 0.09, 0.43 + i * 0.006, -0.15 + Math.cos(i * 1.3) * 0.09);
    table.add(cookie);
  }
  group.add(table);

  // 圍成一圈的坐墊
  const cushionColors = [0xe6a57e, 0x8fb2a4, 0xe9d2a6, 0xc98a9a, 0x9fb3d8, 0xe0c27a, 0xa6c48a, 0xd9a0c0];
  cushionColors.forEach((c, i) => {
    const a = (i / cushionColors.length) * Math.PI * 2 + Math.PI / 8;
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    cushion.scale.set(1, 0.38, 1);
    cushion.position.set(Math.sin(a) * 2.4, 0.15, Math.cos(a) * 2.4);
    group.add(cushion);
  });

  // 燈串：從中柱頂端拉到牆邊
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const wire = new THREE.LineBasicMaterial({ color: 0x5a4636 });
  const bulbs = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const from = new THREE.Vector3(0, WALL_H + ROOF_H - 0.3, 0);
    const to = new THREE.Vector3(Math.sin(a) * (R - 0.15), WALL_H + 0.05, Math.cos(a) * (R - 0.15));
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const p = from.clone().lerp(to, k / 10);
      p.y -= Math.sin((k / 10) * Math.PI) * 0.35;
      pts.push(p);
      if (k > 0 && k < 10 && k % 2 === 0) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), bulbMat);
        b.position.copy(p);
        b.position.y -= 0.04;
        group.add(b);
        bulbs.push(b);
      }
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire));
  }

  // 三角旗串（沿著牆）
  const flagColors = [0xe58b6b, 0xf0cf6e, 0x8fc2a4, 0x9fb3d8];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < DOOR_GAP) continue;
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 3), lowpoly(flagColors[i % 4]));
    flag.rotation.x = Math.PI;
    flag.position.set(Math.sin(a) * (R - 0.08), WALL_H - 0.18, Math.cos(a) * (R - 0.08));
    flag.lookAt(0, flag.position.y, 0);
    flag.rotateX(Math.PI / 2);
    group.add(flag);
  }

  // 燈光：中柱上的提燈＋柔和補光
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
  lantern.position.set(0, 2.5, 0.2);
  group.add(lantern);
  const lamp = new THREE.PointLight(0xffb870, 9, 12, 1.4);
  lamp.position.set(0, 2.5, 0.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.normalBias = 0.03;
  group.add(lamp);
  const fill = new THREE.PointLight(0xffc89a, 2.5, 8, 1.6);
  fill.position.set(0, 1.6, 3.6);
  group.add(fill);
  group.add(new THREE.HemisphereLight(0x6a5444, 0x241a12, 1.0));

  // 門口的招牌
  const sign = makeSign(t('🌲 回到營火'), { height: 0.18 });
  sign.position.set(0, 1.95, R - 0.2);
  group.add(sign);

  shadowAll(table);
  const colliders = [
    { x: 0, z: 0, r: 0.95 }, // 茶几＋中柱
  ];
  const resolveCollision = makeResolver(colliders, { type: 'circle', r: R - 0.3 });
  const nearTable = (actions) => Math.hypot(actions.player.position.x, actions.player.position.z) < 2.1;

  return {
    id: 'tent_social',
    label: t('☕ 交流帳篷'),
    group,
    fog: new THREE.FogExp2(0x140e0a, 0.02),
    background: new THREE.Color(0x0b0806),
    outdoor: false,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: R - 0.25, r: 0.6, label: t('回到營火') }],
    spawn: { x: 0, z: 3.4, ry: Math.PI, camYaw: 0.35, camPitch: 0.45 },
    cameraDistance: 4.2,
    noStargaze: true,
    audio: { fire: 0.1, wind: 0.3, ambient: 0.35, water: 0, music: 0.6, song: null },
    resolveCollision,

    onAction(name, actions) {
      if (name === 'stargaze' && actions.state !== 'stargaze') {
        actions.hud.toast(t('帳篷裡看不到星星，到外面去吧 ✨'));
        return true;
      }
      if (actions.state !== 'free') return false;
      if (name === 'interact') {
        if (nearTable(actions)) {
          const drinks = [t('☕ 倒了一杯熱可可，暖暖的'), t('🍵 喝了一口熱茶，好放鬆'), t('🍪 拿了一塊餅乾，香香的')];
          actions.hud.toast(drinks[Math.floor(Math.random() * drinks.length)]);
          actions.emote('pray'); // 雙手捧著杯子的樣子
        } else actions.hud.toast(t('走到中間的茶几旁邊按 E 喝杯茶 ☕'));
        return true;
      }
      if (name === 'roast') {
        actions.hud.toast(t('帳篷裡不能生火喔，大家坐下來聊聊天吧 💬'));
        return true;
      }
      return false;
    },

    prompt(actions) {
      return nearTable(actions) ? t('<kbd>E</kbd> 喝杯熱飲　·　<kbd>⏎</kbd> 聊天') : null;
    },

    update(dt, t) {
      lamp.intensity = 9 * (0.95 + Math.sin(t * 2.1) * 0.03 + Math.sin(t * 6.3) * 0.02);
      bulbs.forEach((b, i) => b.scale.setScalar(0.85 + Math.sin(t * 1.4 + i * 0.8) * 0.15));
    },
  };
}
