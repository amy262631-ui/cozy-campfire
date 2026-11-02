import * as THREE from 'three';
import { FISH } from './fishData.js';

/**
 * 圓滾滾的小魚模型（長度 1，頭朝 +X）。舊靴子與寶特瓶另外做。
 * 使用時依尺寸縮放：mesh.scale.setScalar(公分 / 100 * 1.3)
 */
export function createFishMesh(index) {
  const f = FISH[index] ?? FISH[0];
  const g = new THREE.Group();
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const glow = f.glow ? { emissive: f.glow, emissiveIntensity: 0.55 } : {};

  if (f.junk === 'boot') {
    const leather = mat(f.color);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.55, 10), leather);
    leg.position.set(-0.1, 0.12, 0);
    leg.rotation.z = Math.PI / 2;
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.3), leather);
    foot.position.set(0.25, -0.02, 0);
    g.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.32), mat(0x2a2018));
    sole.position.set(0.25, -0.14, 0);
    g.add(sole);
    const weed = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), mat(0x5c8a3a));
    weed.position.set(-0.36, 0.25, 0.05);
    g.add(weed);
    return g;
  }
  if (f.junk === 'bottle') {
    const plastic = mat(f.color, { transparent: true, opacity: 0.6, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 14), plastic);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.16, 12), plastic);
    neck.rotation.z = -Math.PI / 2;
    neck.position.x = 0.38;
    g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.07, 12), mat(0x3a8fd8));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.49;
    g.add(cap);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.22, 14, 1, true), mat(0x6ec27a, { side: THREE.DoubleSide }));
    label.rotation.z = Math.PI / 2;
    g.add(label);
    return g;
  }

  if (f.junk === 'can') {
    const tin = mat(f.color, { metalness: 0.6, roughness: 0.5 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 14), tin);
    can.rotation.z = Math.PI / 2;
    g.add(can);
    const rust = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.16, 14, 1, true), mat(0xa0522d, { side: THREE.DoubleSide }));
    rust.rotation.z = Math.PI / 2;
    rust.position.x = -0.06;
    g.add(rust);
    return g;
  }

  // 身體（圓圓的橢球）
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), mat(f.color, glow));
  body.scale.set(1, 0.48, 0.3);
  g.add(body);
  // 淺色肚子
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 10),
    mat(new THREE.Color(f.color).lerp(new THREE.Color(0xffffff), 0.55).getHex(), glow),
  );
  belly.scale.set(0.9, 0.3, 0.27);
  belly.position.set(0.02, -0.08, 0);
  g.add(belly);
  // 錦鯉的花紋
  if (f.patch) {
    for (const [x, y, s] of [[0.18, 0.1, 0.17], [-0.15, 0.08, 0.2], [0.0, 0.14, 0.12]]) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), mat(f.patch));
      spot.scale.set(1.2, 0.6, 0.32);
      spot.position.set(x, y, 0);
      g.add(spot);
    }
  }
  // 尾巴（扁扁的三角）
  const finColor = new THREE.Color(f.color).multiplyScalar(0.85).getHex();
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 4), mat(finColor, glow));
  tail.rotation.z = Math.PI / 2;
  tail.scale.set(1, 1, 0.22);
  tail.position.x = -0.6;
  g.add(tail);
  // 背鰭
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 3), mat(finColor, glow));
  fin.scale.set(1.3, 1, 0.2);
  fin.position.set(0.02, 0.27, 0);
  g.add(fin);
  // 眼睛（小黑點＋反光）
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0x1c1410, { roughness: 0.2 }));
    eye.position.set(0.33, 0.05, 0.135 * side);
    g.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(0.35, 0.07, 0.17 * side);
    g.add(shine);
  }
  // 🐉 傳說之魚：長鬍鬚＋頭上一對小角，發光更強
  if (f.legend) {
    const gold = mat(f.glow ?? 0xffd060, { emissive: f.glow ?? 0xffd060, emissiveIntensity: 0.9 });
    for (const side of [-1, 1]) {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.55, 5), gold);
      whisker.rotation.z = Math.PI / 2 + 0.35;
      whisker.rotation.y = 0.5 * side;
      whisker.position.set(0.55, -0.05, 0.15 * side);
      g.add(whisker);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 6), gold);
      horn.rotation.z = -0.5;
      horn.position.set(0.28, 0.27, 0.06 * side);
      g.add(horn);
    }
    body.material.emissiveIntensity = 0.9;
  }
  g.userData.tail = tail;
  return g;
}

/** 依公分數算出模型縮放（比真實略大一點，比較看得清楚） */
// 超過 130 公分的傳說之魚放大得慢一點，不然會把整個畫面擋住
export const fishScale = (cm) => (cm <= 130 ? Math.max(0.18, (cm / 100) * 1.3) : 1.69 + ((cm - 130) / 100) * 0.55);
