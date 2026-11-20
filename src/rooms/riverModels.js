/**
 * 🔥 營火河畔的新玩法（作者 11/20，模擬圖階段）：小鴨鴨、蝦籠、蝦籠撈到的東西、打水漂的扁石頭
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const add = (g, geo, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
};

/** 🦆 小鴨鴨（big：鴨媽媽）：圓滾滾、黃色（媽媽白色）、橘色扁嘴、黑豆眼、小翅膀、翹尾巴 */
export function buildDuck(big = false) {
  const g = new THREE.Group();
  const body = std(big ? 0xfaf6ec : 0xffd84a);
  const beak = std(0xf59a2a);
  const b = add(g, new THREE.SphereGeometry(0.22, 18, 14), body, 0, 0.16, 0);
  b.scale.set(1, 0.85, 1.25);
  add(g, new THREE.SphereGeometry(0.15, 16, 12), body, 0, 0.36, 0.18);
  const bk = add(g, new THREE.SphereGeometry(0.06, 12, 8), beak, 0, 0.33, 0.33);
  bk.scale.set(1.3, 0.45, 1.3);
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.022, 8, 6), std(0x1a1410, { roughness: 0.2 }), s * 0.07, 0.4, 0.29);
    add(g, new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.068, 0.41, 0.31);
    const bl = add(g, new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa8b8 }), s * 0.1, 0.35, 0.27);
    bl.scale.set(1, 0.6, 0.4);
    const w = add(g, new THREE.SphereGeometry(0.1, 12, 8), body, s * 0.2, 0.18, -0.02);
    w.scale.set(0.35, 0.65, 1.1);
    w.rotation.z = s * 0.3;
  }
  const tail = add(g, new THREE.ConeGeometry(0.07, 0.14, 8), body, 0, 0.24, -0.27);
  tail.rotation.x = -0.9;
  if (big) {
    // 鴨媽媽：頭上一小撮毛、脖子上淡藍色小領巾
    add(g, new THREE.ConeGeometry(0.03, 0.08, 6), body, 0, 0.53, 0.16);
    const sc = add(g, new THREE.TorusGeometry(0.11, 0.025, 6, 16), std(0x9fd0f0), 0, 0.27, 0.16);
    sc.rotation.x = Math.PI / 2;
    g.scale.setScalar(0.85); // 作者 11/20：迷你小鴨 → 鴨媽媽也小一點
  } else g.scale.setScalar(0.5); // 作者 11/20：迷你小鴨
  return g;
}

/** 🦀 蝦籠：竹編圓筒＋漏斗口、綁在岸邊木樁的繩子、浮在水面的紅白浮球 */
export function buildShrimpTrap() {
  const g = new THREE.Group();
  const bamboo = std(0xc9a86a, { side: THREE.DoubleSide });
  const cage = add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.8, 14, 4, true), bamboo, 0, 0, 0);
  cage.rotation.z = Math.PI / 2;
  cage.material = new THREE.MeshStandardMaterial({ color: 0xc9a86a, wireframe: true });
  for (const x of [-0.4, 0, 0.4]) {
    const r = add(g, new THREE.TorusGeometry(0.28, 0.02, 6, 20), std(0xa8864a), x, 0, 0);
    r.rotation.y = Math.PI / 2;
  }
  const funnel = add(g, new THREE.ConeGeometry(0.27, 0.3, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8945a, wireframe: true }), 0.5, 0, 0);
  funnel.rotation.z = Math.PI / 2;
  // 浮球＋繩子＋木樁
  const fl = add(g, new THREE.SphereGeometry(0.11, 14, 10), std(0xe8463c), 0.1, 0.55, 0.5);
  add(g, new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI / 3), std(0xffffff), 0.1, 0.551, 0.5);
  void fl;
  const rope = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.4, 0.1, 0), new THREE.Vector3(-0.9, 0.5, 0.3), new THREE.Vector3(-1.5, 0.7, 0.5)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(rope, 12, 0.012, 5), std(0xe8dcc0)));
  add(g, new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8), std(0x6b4a2e), -1.55, 0.4, 0.5);
  return g;
}

/** 🦐 溪蝦 */
export function buildShrimp() {
  const g = new THREE.Group();
  const m = std(0xf0a070, { roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const s = add(g, new THREE.SphereGeometry(0.07 - i * 0.008, 10, 8), m, Math.cos(i * 0.45) * 0.12 * i * 0.5, Math.sin(i * 0.45) * 0.06 * i * 0.4, 0);
    s.scale.set(1.2, 0.9, 0.8);
  }
  const fan = add(g, new THREE.ConeGeometry(0.05, 0.08, 4), m, 0.3, 0.14, 0);
  fan.rotation.z = -1.2;
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), m);
    a.position.set(-0.17, 0.08, s * 0.03);
    a.rotation.z = 1.1;
    g.add(a);
    add(g, new THREE.SphereGeometry(0.012, 6, 4), std(0x1a1410), -0.06, 0.04, s * 0.04);
  }
  return g;
}

/** 🦀 毛蟹（gold：金色毛蟹） */
export function buildCrab(gold = false) {
  const g = new THREE.Group();
  const shell = std(gold ? 0xffd04d : 0x7a5a3a, gold ? { emissive: 0xffa000, emissiveIntensity: 0.35, roughness: 0.35 } : {});
  const b = add(g, new THREE.SphereGeometry(0.16, 16, 10), shell, 0, 0.08, 0);
  b.scale.set(1.2, 0.55, 1);
  const fur = std(gold ? 0xfff0a0 : 0x3a2a20);
  for (const s of [-1, 1]) {
    const cl = add(g, new THREE.SphereGeometry(0.07, 10, 8), shell, s * 0.2, 0.1, 0.13);
    cl.scale.set(1, 0.8, 1.2);
    add(g, new THREE.SphereGeometry(0.045, 8, 6), fur, s * 0.22, 0.1, 0.11); // 毛毛的大螯
    for (let k = 0; k < 3; k++) {
      const leg = add(g, new THREE.CylinderGeometry(0.012, 0.01, 0.16, 5), shell, s * 0.2, 0.04, -0.06 + k * 0.06);
      leg.rotation.z = s * 1.0;
    }
    const st = add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5), shell, s * 0.05, 0.16, 0.1);
    void st;
    add(g, new THREE.SphereGeometry(0.02, 8, 6), std(0x1a1410, { roughness: 0.2 }), s * 0.05, 0.2, 0.1);
  }
  return g;
}

/** 🐌 田螺 */
export function buildRiverSnail() {
  const g = new THREE.Group();
  const shell = std(0x5e6a4a);
  const pts = [];
  for (let i = 0; i < 10; i++) pts.push(new THREE.Vector2(0.11 * Math.sin((i / 9) * Math.PI * 0.95) + 0.005, i * 0.025));
  add(g, new THREE.LatheGeometry(pts, 16), shell, 0, 0.02, 0);
  const sp = new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => new THREE.Vector3(Math.cos(i * 0.6) * (0.1 - i * 0.003), 0.03 + i * 0.006, Math.sin(i * 0.6) * (0.1 - i * 0.003))));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(sp, 60, 0.01, 5), std(0x3a4430)));
  return g;
}

/** 🪨 打水漂用的扁石頭 */
export function buildFlatStone() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), std(0x8a8680));
  m.scale.set(1.2, 0.3, 1);
  return m;
}
