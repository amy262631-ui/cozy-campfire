/**
 * ⛵ 租船（作者 11/19，模擬圖階段）：小木船、藍鯨帳篷的外型。
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

/** 🚣 小木船：船身、兩條木板座位、兩支槳、船頭小燈 */
export function buildRowboat() {
  const g = new THREE.Group();
  const wood = std(0xb8794a);
  const dark = std(0x7a4a2a);
  // 船身：拉長的半顆球（挖空看不出來，用上緣一圈當船舷）
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xb8794a, { side: THREE.DoubleSide }));
  hull.scale.set(0.62, 0.32, 1.25);
  hull.position.y = 0.3;
  g.add(hull);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 28), std(0x9a6238));
  inner.rotation.x = -Math.PI / 2;
  inner.scale.set(0.6, 1.23, 1);
  inner.position.y = 0.255; // 作者 11/20：小船不要鏤空 → 船底板墊高到快跟船舷一樣高，看起來是實心的
  g.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 40), dark);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.62, 1.25, 1);
  rim.position.y = 0.3;
  g.add(rim);
  // 一圈藍白條紋
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), std(0x4a8ad0));
  stripe.rotation.x = Math.PI / 2;
  stripe.scale.set(0.6, 1.21, 1);
  stripe.position.y = 0.2;
  g.add(stripe);
  for (const z of [-0.45, 0.35]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.22), dark);
    seat.position.set(0, 0.29, z);
    g.add(seat);
  }
  for (const s of [-1, 1]) {
    const oar = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), std(0xd8b080));
    shaft.rotation.z = Math.PI / 2;
    oar.add(shaft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.14), std(0xd8b080));
    blade.position.x = 0.7;
    oar.add(blade);
    oar.position.set(s * 0.55, 0.32, -0.05);
    oar.rotation.set(0, s > 0 ? 0 : Math.PI, -0.35);
    g.add(oar);
  }
  // 船頭小燈籠
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), dark);
  pole.position.set(0, 0.5, 1.05);
  g.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
  lamp.position.set(0, 0.74, 1.05);
  g.add(lamp);
  // ⚡ 11/20：不放真的燈光（每多一盞燈，手機上整個畫面都要多算一次），船頭燈用會發亮的顏色就好
  // 作者 11/19：可愛一點 → 船邊一圈彩色小花＋兩側畫愛心
  const cols = [0xff9fc0, 0xfff2a0, 0xffffff, 0xa8d8ff];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), std(cols[k % 4]));
    f.position.set(Math.sin(a) * 0.62, 0.34, Math.cos(a) * 1.25);
    g.add(f);
  }
  for (const s2 of [-1, 1]) {
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.06);
    heart.bezierCurveTo(0.09, 0.01, 0.06, 0.08, 0, 0.04);
    heart.bezierCurveTo(-0.06, 0.08, -0.09, 0.01, 0, -0.06);
    const h = new THREE.Mesh(new THREE.ShapeGeometry(heart), new THREE.MeshBasicMaterial({ color: 0xff7aa0, side: THREE.DoubleSide }));
    h.scale.setScalar(1.6);
    h.position.set(s2 * 0.6, 0.18, 0.3);
    h.rotation.y = s2 * Math.PI / 2;
    g.add(h);
  }
  return g;
}

/** 🐳 藍鯨帳篷（超稀有魚換的外觀）：藍鯨形狀的圓頂帳篷，頭頂噴水、尾巴翹起來、肚子白白的、門在嘴巴 */
export function buildWhaleTent() {
  const g = new THREE.Group();
  const blue = std(0x4a7fc8, { roughness: 0.6 });
  const belly = std(0xf2f4fa);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), blue);
  body.scale.set(1.55, 1.45, 1.95);
  g.add(body);
  // 白肚子：前面下半部一片白白的
  const bl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), belly);
  bl.scale.set(1.05, 0.55, 0.7);
  bl.position.set(0, 0, 1.45);
  g.add(bl);
  // 門（嘴巴的位置）
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24, 0, Math.PI), std(0x2a3a5a));
  door.position.set(0, 0.02, 2.13);
  g.add(door);
  const doorLight = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  doorLight.position.set(0, 0.02, 2.135);
  g.add(doorLight);
  // 眼睛＋腮紅
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a1a2a }));
    e.position.set(s * 0.72, 0.95, 1.5);
    e.scale.set(0.6, 1, 0.6);
    g.add(e);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.set(s * 0.74, 1.0, 1.58);
    g.add(hi);
    const bk = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: 0xff9fb8, transparent: true, opacity: 0.7 }));
    bk.position.set(s * 0.98, 0.72, 1.42);
    bk.lookAt(bk.position.clone().add(new THREE.Vector3(s, 0, 0.6)));
    g.add(bk);
    // 胸鰭
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), blue);
    fin.scale.set(0.9, 0.12, 0.45);
    fin.position.set(s * 1.55, 0.25, 0.5);
    fin.rotation.z = s * -0.5;
    g.add(fin);
  }
  // 尾巴：從後面翹起來
  const tail = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 1.2, 14), blue);
  stem.rotation.x = -0.9;
  stem.position.set(0, 0.55, -0.4);
  tail.add(stem);
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), blue);
    fl.scale.set(1, 0.14, 0.55);
    fl.position.set(s * 0.45, 1.05, -0.95);
    fl.rotation.set(-0.5, s * 0.35, s * 0.3);
    tail.add(fl);
  }
  tail.position.z = -1.5;
  g.add(tail);
  // 頭頂噴水
  const spout = new THREE.Group();
  const wm = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.85 });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 10), wm);
  col.position.y = 0.3;
  spout.add(col);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), wm);
    d.position.set(Math.cos(a) * 0.25, 0.62 - Math.abs(Math.sin(a)) * 0.05, Math.sin(a) * 0.25);
    spout.add(d);
  }
  spout.position.set(0, 1.42, 0.3);
  g.add(spout);
  return g;
}

/** 🛶 小獨木舟（1 人）：細長、兩頭尖，一支雙頭槳 */
export function buildCanoe() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xe8a23a, { side: THREE.DoubleSide }));
  hull.scale.set(0.38, 0.26, 1.3);
  hull.position.y = 0.24;
  g.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 36), std(0x8a5a2a));
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.38, 1.3, 1);
  rim.position.y = 0.24;
  g.add(rim);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 24), std(0x7a4a2a));
  inner.rotation.x = -Math.PI / 2;
  inner.scale.set(0.37, 1.28, 1);
  inner.position.y = 0.2; // 作者 11/20：不要鏤空
  g.add(inner);
  const paddle = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6), std(0xd8b080));
  shaft.rotation.z = Math.PI / 2;
  paddle.add(shaft);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), std(0xd2524a));
    b.position.x = s * 0.75;
    paddle.add(b);
  }
  paddle.position.set(0, 0.42, 0.1);
  paddle.rotation.z = 0.25;
  g.add(paddle);
  // 作者 11/19：可愛一點 → 船頭畫兩顆大眼睛＋腮紅、船尾插一面小三角旗
  for (const s2 of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    e.position.set(s2 * 0.25, 0.2, 0.95);
    e.lookAt(e.position.clone().add(new THREE.Vector3(s2, 0, 0.35)));
    g.add(e);
    const hi = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.copy(e.position).add(new THREE.Vector3(s2 * 0.006, 0.02, 0.012));
    hi.quaternion.copy(e.quaternion);
    g.add(hi);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), new THREE.MeshBasicMaterial({ color: 0xff9fb8, transparent: true, opacity: 0.8 }));
    bl.position.set(s2 * 0.28, 0.12, 0.82);
    bl.lookAt(bl.position.clone().add(new THREE.Vector3(s2, 0, 0.2)));
    g.add(bl);
  }
  const fpole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), std(0x8a5a2a));
  fpole.position.set(0, 0.45, -1.0);
  g.add(fpole);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 3), std(0xff9fc0));
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.1, 0.62, -1.0);
  g.add(flag);
  return g;
}

/** 🦢 天鵝船（4 人）：白白圓圓的船身、長脖子天鵝頭、翅膀當船舷、小頂棚 */
export function buildSwanBoat() {
  const g = new THREE.Group();
  const white = std(0xfbfaf6);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white);
  hull.scale.set(0.9, 0.38, 1.55);
  hull.position.y = 0.36;
  g.add(hull);
  // 白白胖胖的身體：船邊一圈粗粗的圓邊（作者 11/19：要可愛）
  const plump = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 14, 40), white);
  plump.rotation.x = Math.PI / 2;
  plump.scale.set(0.88, 1.5, 1.4);
  plump.position.y = 0.4;
  g.add(plump);
  const deck = new THREE.Mesh(new THREE.CircleGeometry(1, 28), std(0xc8a070));
  deck.rotation.x = -Math.PI / 2;
  deck.scale.set(0.82, 1.45, 1);
  deck.position.y = 0.3;
  g.add(deck);
  // 翅膀：兩邊微微翹起來
  for (const s2 of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), white);
    w.scale.set(0.12, 0.2, 0.55); // 11/20：小一點、低一點，才不會擋到坐在船上的人
    w.position.set(s2 * 0.95, 0.52, -0.45);
    w.rotation.set(-0.35, 0, s2 * 0.3);
    g.add(w);
  }
  // 脖子（作者 11/19：要可愛一點）：短短胖胖、往上再往前彎；大大圓圓的頭
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 1.18),
    new THREE.Vector3(0, 0.72, 1.36),
    new THREE.Vector3(0, 1.0, 1.32),
    new THREE.Vector3(0, 1.18, 1.26),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.14, 12, false), white));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), white);
  head.position.set(0, 1.32, 1.34);
  g.add(head);
  // 小小圓圓的橘色嘴
  const beak = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), std(0xf6a04a));
  beak.scale.set(1.1, 0.7, 1.3);
  beak.position.set(0, 1.27, 1.6);
  g.add(beak);
  // 大眼睛＋亮點＋腮紅
  for (const s2 of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    e.scale.set(1, 1.2, 0.7);
    e.position.set(s2 * 0.1, 1.37, 1.55);
    g.add(e);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi.position.set(s2 * 0.1 + 0.015, 1.395, 1.585);
    g.add(hi);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.055, 14), new THREE.MeshBasicMaterial({ color: 0xff9fb8, transparent: true, opacity: 0.75 }));
    bl.position.set(s2 * 0.17, 1.28, 1.5);
    bl.lookAt(bl.position.clone().add(new THREE.Vector3(s2 * 0.6, 0, 1)));
    g.add(bl);
  }
  // 頭上的粉紅小蝴蝶結
  const bowM = std(0xff9fc0);
  for (const s2 of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bowM);
    b.scale.set(1.2, 0.8, 0.55);
    b.position.set(s2 * 0.08, 1.56, 1.28);
    b.rotation.z = s2 * 0.4;
    g.add(b);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bowM);
  knot.position.set(0, 1.56, 1.29);
  g.add(knot);
  // 船尾蓬蓬的尾巴毛
  for (let k = 0; k < 3; k++) {
    const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.16 - k * 0.03, 12, 10), white);
    t2.position.set((k - 1) * 0.12, 0.5 + k * 0.06, -1.5 - k * 0.04);
    g.add(t2);
  }
  // 小頂棚：四根細柱＋圓角平頂（粉藍色，邊上一圈白色荷葉邊）
  for (const x of [-0.6, 0.6]) for (const z of [-1.0, 0.35]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 6), std(0xe8d8b8));
    p.position.set(x, 0.8, z);
    g.add(p);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 1.6), std(0x9fd0e8));
  roof.position.set(0, 1.3, -0.33);
  g.add(roof);
  for (let k = 0; k < 10; k++) {
    for (const zz of [-1.13, 0.47]) {
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xffffff));
      sc.position.set(-0.65 + k * 0.145, 1.27, zz);
      g.add(sc);
    }
  }
  // 四個座位（兩排）
  for (const z of [-0.65, 0.05]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), std(0xd2524a));
    seat.position.set(0, 0.42, z);
    g.add(seat);
  }
  return g;
}
