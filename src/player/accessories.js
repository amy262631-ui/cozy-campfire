import * as THREE from 'three';

/**
 * 贊助者的頭飾：1 = 小黃花、2 = 四葉草。
 * 回傳的 Group 底部（莖的根部）在原點，方便以根部為支點搖晃。
 */
export function buildAccessory(code) {
  if (!code) return null;
  const g = new THREE.Group();
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const stemMat = mat(0x5f9e4a);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.16, 6), stemMat);
  stem.position.y = 0.08;
  g.add(stem);

  // 莖上的小葉子
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), stemMat);
  leaf.scale.set(1.6, 0.35, 0.8);
  leaf.position.set(0.025, 0.07, 0);
  leaf.rotation.z = 0.5;
  g.add(leaf);

  const head = new THREE.Group();
  head.position.y = 0.17;
  g.add(head);

  if (code === 1) {
    // 小黃花：五片花瓣＋橘色花心，花面朝前
    const petalMat = mat(0xffd84a, { emissive: 0x3a2a00, emissiveIntensity: 0.25 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), petalMat);
      petal.scale.set(1, 1.35, 0.45);
      petal.position.set(Math.sin(a) * 0.04, Math.cos(a) * 0.04, 0);
      petal.rotation.z = -a;
      head.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), mat(0xf09a2a));
    center.scale.z = 0.6;
    center.position.z = 0.012;
    head.add(center);
    head.rotation.x = -0.35; // 稍微朝上，看得到花
  } else {
    // 四葉草：四片愛心形的葉子（每片由兩顆小球組成）
    const cloverMat = mat(0x5fbf5a, { emissive: 0x0f2a0a, emissiveIntensity: 0.3 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leafG = new THREE.Group();
      leafG.rotation.z = -a;
      for (const side of [-1, 1]) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), cloverMat);
        lobe.scale.set(1, 1.1, 0.4);
        lobe.position.set(side * 0.016, 0.04, 0);
        leafG.add(lobe);
      }
      head.add(leafG);
    }
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(0x3f8f3a));
    head.add(dot);
    head.rotation.x = -0.6;
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
