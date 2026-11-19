/**
 * 🐔 小肥雞（作者 11/19 想法，還在模擬圖階段）：圓滾滾的小雞＋雞舍。
 *   fat：1～3 胖胖等級（餵越多越圓）  c：毛色 0 白、1 奶茶、2 黑芝麻
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const FUR = [0xfff8ee, 0xe8c79a, 0x4a4040];

export function buildChicken(fat = 1, c = 0) {
  const g = new THREE.Group();
  const k = 1 + (fat - 1) * 0.22;
  const furM = std(FUR[c] ?? FUR[0], { emissive: 0x332a20, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), furM);
  body.scale.set(k, 0.95 * (1 + (k - 1) * 0.6), k * 1.05);
  body.position.y = 0.21 * (1 + (k - 1) * 0.5);
  g.add(body);
  const top = body.position.y + 0.2 * body.scale.y;
  // 雞冠（三顆小圓球）
  const red = std(0xe8463c);
  for (let i = 0; i < 3; i++) {
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.035 - i * 0.004, 10, 8), red);
    comb.position.set(0, top + 0.015 + (i === 1 ? 0.02 : 0), 0.04 - i * 0.04);
    g.add(comb);
  }
  const fz = 0.21 * k * 1.05;
  const fy = body.position.y + 0.04;
  // 眼睛
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    e.position.set(s * 0.075, fy + 0.05, fz * 0.9);
    e.scale.set(1, 1.15, 0.6);
    g.add(e);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.set(s * 0.075 + 0.01, fy + 0.065, fz * 0.96);
    g.add(hi);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.034, 14), new THREE.MeshBasicMaterial({ color: 0xff9fb0, transparent: true, opacity: 0.75 }));
    bl.position.set(s * 0.13, fy + 0.0, fz * 0.86);
    bl.lookAt(bl.position.clone().add(new THREE.Vector3(s * 0.5, 0, 1)));
    g.add(bl);
    // 小翅膀
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), furM);
    w.scale.set(0.35, 0.7, 1);
    w.position.set(s * 0.21 * k, body.position.y - 0.02, -0.01);
    g.add(w);
  }
  // 嘴巴
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 8), std(0xf2a83a));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, fy + 0.015, fz + 0.01);
  g.add(beak);
  // 小尾巴
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), furM);
  tail.rotation.x = -0.9;
  tail.position.set(0, body.position.y + 0.08, -0.2 * k);
  g.add(tail);
  // 腳
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), std(0xf2a83a));
    leg.position.set(s * 0.06, 0.03, 0.02);
    g.add(leg);
  }
  g.userData.tick = (t) => {
    g.position.y = Math.abs(Math.sin(t * 3 + c)) * 0.03;
    g.rotation.z = Math.sin(t * 3 + c) * 0.05;
  };
  return g;
}

export function buildEgg(gold = false) {
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), std(gold ? 0xffd34d : 0xfff2dc, gold ? { emissive: 0x806010, emissiveIntensity: 0.6, metalness: 0.4 } : {}));
  e.scale.set(1, 1.3, 1);
  e.position.y = 0.065;
  return e;
}

/** 雞舍：紅屋頂小木屋＋小門＋稻草窩 */
export function buildCoop() {
  const g = new THREE.Group();
  const wood = std(0xd8b080);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.65), wood);
  box.position.y = 0.42;
  g.add(box);
  for (const x of [-0.38, 0.38]) for (const z of [-0.26, 0.26]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), std(0x8a6040));
    leg.position.set(x, 0.08, z);
    g.add(leg);
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.62, 0.42, 4, 1), std(0xd2524a));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1, 0.85);
  roof.position.y = 0.9;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20, 0, Math.PI), std(0x5a3a26));
  door.position.set(-0.15, 0.3, 0.326);
  g.add(door);
  const doorB = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), std(0x5a3a26));
  doorB.position.set(-0.15, 0.24, 0.326);
  g.add(doorB);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.35), std(0xb08a5a));
  ramp.rotation.x = 0.55;
  ramp.position.set(-0.15, 0.1, 0.48);
  g.add(ramp);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xffe6a0 }));
  win.position.set(0.22, 0.48, 0.326);
  g.add(win);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.02), std(0xfff3e2));
  sign.position.set(0.22, 0.28, 0.33);
  g.add(sign);
  // 稻草窩
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 18), std(0xe8c860));
  nest.rotation.x = Math.PI / 2;
  nest.position.set(0.7, 0.05, 0.2);
  g.add(nest);
  return g;
}

/** 🐔 雞圈（作者 11/19：雞舍改成一圈矮圍籬，小雞在裡面）：橢圓形木柵欄＋稻草窩＋小水盆
 *  大小：寬 PEN_W、深 PEN_D（公尺，放進營地前）；小雞在 PEN_IN 範圍裡走 */
export const PEN_W = 2.3;
export const PEN_D = 1.6;
export const PEN_IN = { w: PEN_W / 2 - 0.22, d: PEN_D / 2 - 0.2 };
export function buildPen() {
  const g = new THREE.Group();
  const post = std(0xc89a6a);
  const rail = std(0xe2c08e);
  const N = 28;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * (PEN_W / 2), 0, Math.sin(a) * (PEN_D / 2)));
  }
  pts.forEach((p, i) => {
    const isGate = false; // 整圈圍起來（小雞不會跑出來）
    if (!isGate) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), post);
      pl.position.set(p.x, 0.15, p.z);
      g.add(pl);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.05, 4), post);
      cap.position.set(p.x, 0.325, p.z);
      g.add(cap);
    }
    const q = pts[(i + 1) % N];
    if (isGate) return;
    for (const y of [0.1, 0.22]) {
      const len = p.distanceTo(q);
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.02), rail);
      r.position.set((p.x + q.x) / 2, y, (p.z + q.z) / 2);
      r.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x);
      g.add(r);
    }
  });
  // 地上一片乾草色
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 28), std(0xc8b878));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(PEN_W / 2 - 0.03, PEN_D / 2 - 0.03, 1);
  floor.position.y = 0.012;
  g.add(floor);
  // 稻草窩（裡面有時候有蛋）＋小水盆
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 18), std(0xe8c860));
  nest.rotation.x = Math.PI / 2;
  nest.position.set(-PEN_W / 2 + 0.3, 0.05, -PEN_D / 2 + 0.28);
  g.add(nest);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.05, 16), std(0x8aa0b8));
  bowl.position.set(PEN_W / 2 - 0.3, 0.03, -PEN_D / 2 + 0.3);
  g.add(bowl);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), std(0x8fd0f0, { roughness: 0.2 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(PEN_W / 2 - 0.3, 0.056, -PEN_D / 2 + 0.3);
  g.add(water);
  g.userData.nest = nest.position.clone();
  return g;
}
