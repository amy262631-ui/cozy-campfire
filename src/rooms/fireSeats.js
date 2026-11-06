import * as THREE from 'three';
import { lowpoly } from './shared.js';

/**
 * 🪵 營火旁的圓木座位：低低的圓木切面，按 E 坐下，坐著按 F 就能直接烤棉花糖
 * 一圈分散開來（作者：分散一點、不要有一區空很大），但不排成工整的圓：離火堆前後交錯、角度和大小都稍微不同
 * 座位之間留得夠寬，從營火往各條小路都走得過去
 *   [角度, 離火堆中心, 半徑, 高度]（角度跟 polar() 一樣：sin＝x、cos＝z）
 */
export const FIRE_SEATS = [
  [0.12, 1.78, 0.29, 0.18],
  [0.9, 1.58, 0.3, 0.17],
  [1.6, 1.9, 0.27, 0.16],
  [2.38, 1.6, 0.33, 0.2],
  [3.08, 1.85, 0.28, 0.17],
  [-2.42, 1.56, 0.3, 0.19],
  [-1.62, 1.88, 0.31, 0.16],
  [-0.8, 1.6, 0.27, 0.18]
].map(([a, r, rr, h], i) => ({ i, x: Math.sin(a) * r, z: Math.cos(a) * r, rr, h, face: Math.atan2(-Math.sin(a), -Math.cos(a)) }));

export function buildFireSeats(world) {
  const group = new THREE.Group();
  const bark = lowpoly(0x5b3d26);
  const ring = lowpoly(0xb08a5e);
  const ring2 = new THREE.MeshStandardMaterial({ color: 0x8a6a48, flatShading: true, roughness: 1 });
  for (const s of FIRE_SEATS) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(s.rr, s.rr * 1.06, s.h, 9), bark);
    body.position.y = s.h / 2;
    g.add(body);
    // 年輪切面：淺色的面＋一圈深色的年輪
    const top = new THREE.Mesh(new THREE.CircleGeometry(s.rr * 0.92, 9), ring);
    top.rotation.x = -Math.PI / 2;
    top.position.y = s.h + 0.004;
    g.add(top);
    const inner = new THREE.Mesh(new THREE.RingGeometry(s.rr * 0.42, s.rr * 0.5, 9), ring2);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = s.h + 0.008;
    g.add(inner);
    g.position.set(s.x, 0, s.z);
    g.rotation.set((s.i % 3) * 0.02 - 0.02, s.i * 1.3, 0); // 每個角度都不太一樣，看起來像隨手擺的
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    group.add(g);
    world.colliders.push({ x: s.x, z: s.z, r: s.rr * 0.6 }); // 碰撞圈小一點，座位之間比較好走
  }
  /** 離 pos 最近的座位（maxD 公尺內），沒有回傳 null */
  const near = (pos, maxD = 0.95) => {
    let best = null;
    let bd = maxD;
    for (const s of FIRE_SEATS) {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      if (d < bd) [best, bd] = [s, d];
    }
    return best;
  };
  return { group, seats: FIRE_SEATS, near };
}
