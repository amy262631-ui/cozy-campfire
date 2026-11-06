import * as THREE from 'three';
import { GlowLight } from '../scene/GlowLight.js'; // 裝飾小燈用光暈代替真的光源（效能）
import { makeSign, lowpoly } from './shared.js';
import { POND, POND_U, POND_V, pondQ, pondLocal, pondWorld } from '../game/pondShape.js';
import { t } from '../i18n/i18n.js';

/**
 * 🎣 營火河畔：中央營火旁的湖（橢圓形），不用跑去湖畔就能釣魚，人少的時候大家聚在一起。
 * 湖邊一圈小蠟燭，晚上很溫馨。走到水邊按 F 坐下，玩夜釣浮標。
 */
export const POND_WATER_Y = 0.03;
const ROT = Math.atan2(POND_V[0], POND_V[1]); // 讓幾何的 x 軸對齊長軸

export function buildPond(world, forestGroup) {
  const group = new THREE.Group();
  group.name = 'pond';
  const { a, b } = POND;
  const flat = (mesh, y) => {
    mesh.rotation.set(-Math.PI / 2, 0, ROT - Math.PI / 2);
    mesh.position.set(POND.x, y, POND.z);
    group.add(mesh);
    return mesh;
  };

  // 水面：深藍、帶一點月光反光；岸邊一圈泥土
  const water = flat(new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x0c1b30, roughness: 0.08, metalness: 0.55, emissive: 0x050c18 })), POND_WATER_Y);
  water.scale.set(a, b, 1);
  const bank = flat(new THREE.Mesh(new THREE.RingGeometry(0.98, 1.1, 64), lowpoly(0x3d3326)), 0.012);
  bank.scale.set(a, b, 1);
  // 月亮倒影
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.16, depthWrite: false }));
  moon.rotation.x = -Math.PI / 2;
  moon.scale.set(1, 2.2, 1);
  const [mx, mz] = pondWorld(-1.5, 1.2);
  moon.position.set(mx, POND_WATER_Y + 0.003, mz);
  group.add(moon);

  /** 沿著岸邊（k＝1 在水邊，>1 往外）取一個點 */
  const edge = (theta, k = 1) => pondWorld(Math.cos(theta) * a * k, Math.sin(theta) * b * k);
  // 朝營火那一側（q < 0）少放東西，方便坐下來釣
  const facingFire = (theta) => Math.sin(theta) < -0.55;

  // 石頭
  const stoneMat = lowpoly(0x6f6c66);
  for (let i = 0; i < 30; i++) {
    const th = (i / 30) * Math.PI * 2 + 0.1;
    if (facingFire(th) && i % 3) continue;
    const [x, z] = edge(th, 1.06);
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + (i % 3) * 0.06, 0), stoneMat);
    s.position.set(x, 0.06, z);
    s.rotation.set(i, i * 2, 0);
    group.add(s);
  }
  // 蘆葦（遠離營火那側）
  const reedMat = lowpoly(0x3f5a32);
  for (let i = 0; i < 60; i++) {
    const th = 0.15 + (i / 60) * (Math.PI - 0.3);
    const [x, z] = edge(th, 0.97 - (i % 4) * 0.025);
    const h = 0.6 + ((i * 37) % 10) * 0.06;
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, h, 4), reedMat);
    reed.position.set(x, h / 2, z);
    reed.rotation.z = Math.sin(i) * 0.12;
    group.add(reed);
  }
  // 🕯️ 湖邊的小蠟燭：火焰會微微晃動，晚上很溫馨
  const flameCanvas = document.createElement('canvas');
  flameCanvas.width = flameCanvas.height = 64;
  const fg = flameCanvas.getContext('2d');
  const grad = fg.createRadialGradient(32, 36, 0, 32, 36, 30);
  grad.addColorStop(0, 'rgba(255,240,190,1)');
  grad.addColorStop(0.3, 'rgba(255,180,80,0.55)');
  grad.addColorStop(1, 'rgba(255,140,40,0)');
  fg.fillStyle = grad;
  fg.fillRect(0, 0, 64, 64);
  const flameTex = new THREE.CanvasTexture(flameCanvas);
  const waxMat = new THREE.MeshStandardMaterial({ color: 0xf3e6cc, roughness: 0.8, emissive: 0x3a2a10 });
  const candles = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + 0.05;
    const [x, z] = edge(th, 1.14 + (i % 2) * 0.05);
    const h = 0.1 + (i % 3) * 0.04;
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, h, 8), waxMat);
    wax.position.set(x, h / 2, z);
    group.add(wax);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flame.position.set(x, h + 0.05, z);
    flame.scale.set(0.18, 0.24, 1);
    group.add(flame);
    candles.push({ flame, base: h + 0.05, ph: i * 1.7 });
  }
  // 只放幾顆真的光源（省效能），其他蠟燭靠火焰發光
  const candleLights = [0.5, 2.1, 3.7, 5.3].map((th) => {
    const [x, z] = edge(th, 1.15);
    const l = new GlowLight(0xffb565, 1.6, 4.5);
    l.position.set(x, 0.4, z);
    group.add(l);
    return l;
  });

  // 木牌與燈（靠營火那側）
  const [sx, sz] = edge(-Math.PI / 2 + 0.9, 1.3);
  const sign = makeSign(t('🎣 營火河畔'), { height: 0.34 });
  sign.position.set(sx, 1.9, sz);
  group.add(sign);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6), lowpoly(0x5a3c26));
  post.position.set(sx, 0.75, sz);
  group.add(post);

  // 碰撞：沿長軸排幾個圓，近似橢圓（水不能走進去）
  for (let i = 0; i < 9; i++) {
    const p = -a + 1.2 + (i / 8) * (2 * a - 2.4);
    const r = b * Math.sqrt(Math.max(0, 1 - (p / a) ** 2)) - 0.15;
    const [x, z] = pondWorld(p, 0);
    if (r > 0.3) world.colliders.push({ x, z, r });
  }
  // 原本落在湖裡的零星石頭：拿掉碰撞、藏起來
  for (let i = world.colliders.length - 1; i >= 0; i--) {
    const c = world.colliders[i];
    if (c.r < 0.6 && pondQ(c.x, c.z, 0.4) < 1) world.colliders.splice(i, 1);
  }
  forestGroup?.traverse((o) => {
    if (o.isMesh && o.geometry?.type === 'DodecahedronGeometry' && o.parent === forestGroup && pondQ(o.position.x, o.position.z, 0.4) < 1) o.visible = false;
  });

  /**
   * 這個位置能不能釣魚？可以的話回傳釣點（面向湖心）
   * 回傳格式給 FishingGame.start 用：{ x, z, dir, face, reach, side, group, waterY }
   */
  function spotAt(pos) {
    const q = pondQ(pos.x, pos.z);
    if (q < 0.9) return null;
    const dx = POND.x - pos.x;
    const dz = POND.z - pos.z;
    const d = Math.hypot(dx, dz);
    const toEdge = d * (1 - 1 / q); // 到水邊大概多遠
    if (toEdge > 1.3) return null;
    const dir = [dx / d, dz / d];
    return {
      x: pos.x,
      z: pos.z,
      dir,
      face: Math.atan2(dir[0], dir[1]),
      reach: [Math.max(0.9, toEdge + 1.2), toEdge + 2.8], // 浮標落在離岸 1～3 公尺的水面
      side: 1.2,
      group,
      waterY: POND_WATER_Y,
      place: 'pond',
    };
  }

  function update(dt, time) {
    for (const c of candles) {
      const f = 0.85 + Math.sin(time * 9 + c.ph) * 0.08 + Math.sin(time * 23 + c.ph * 2) * 0.05;
      c.flame.scale.set(0.18 * f, 0.26 * f, 1);
      c.flame.position.y = c.base + (f - 0.85) * 0.05;
    }
    candleLights.forEach((l, i) => (l.intensity = 1.5 + Math.sin(time * 7 + i * 2) * 0.15 + Math.sin(time * 17 + i) * 0.1));
  }

  return { group, sign, spotAt, update, local: pondLocal };
}
