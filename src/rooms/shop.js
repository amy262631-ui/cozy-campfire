import * as THREE from 'three';
import { makeSign, lowpoly, shadowAll } from './shared.js';
import { t } from '../i18n/i18n.js';

const polar = (angle, r) => ({ x: Math.sin(angle) * r, z: Math.cos(angle) * r });
const ANGLE = 1.62;
const POS = polar(ANGLE, 6.4);
/** 站在這裡買東西（攤子前面，朝向營火那一側） */
export const SHOP_FRONT = polar(ANGLE, 5.1);
export const SHOP_CLEARING = { ...POS, r: 2.4 };

/** 營地小舖：木頭攤子、條紋遮雨棚、掛著的小燈 */
export function buildShop(world) {
  const g = new THREE.Group();
  g.position.set(POS.x, 0, POS.z);
  g.rotation.y = ANGLE + Math.PI; // 正面朝向營火
  const wood = lowpoly(0x8a5a36);
  const dark = lowpoly(0x5e3d24);

  // 櫃台
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.7), wood);
  counter.position.set(0, 0.45, 0.35);
  g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.08, 0.85), dark);
  top.position.set(0, 0.92, 0.35);
  g.add(top);
  // 柱子
  for (const x of [-1.0, 1.0]) {
    for (const z of [0.0, 0.75]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), dark);
      post.position.set(x, 1.1, z);
      g.add(post);
    }
  }
  // 條紋遮雨棚
  const colors = [0xe2574c, 0xf3ead8];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 1.2), lowpoly(colors[i % 2]));
    s.position.set(-0.9 + i * 0.36, 2.25, 0.45);
    s.rotation.x = 0.28;
    g.add(s);
  }
  // 櫃台上的小東西
  const goods = [[0xb5553f, -0.6], [0x4f9a5a, -0.2], [0xffd28a, 0.25], [0x7cc3ff, 0.65]];
  for (const [c, x] of goods) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), lowpoly(c));
    box.position.set(x, 1.06, 0.4);
    box.rotation.y = x;
    g.add(box);
  }
  // 掛燈
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
  lamp.position.set(0, 1.85, 0.8);
  g.add(lamp);
  const light = new THREE.PointLight(0xffc27a, 1.8, 5, 1.6);
  light.position.copy(lamp.position);
  g.add(light);
  shadowAll(g);
  light.castShadow = false;

  const sign = makeSign(t('🏪 營地小舖'), { height: 0.26 });
  sign.position.set(POS.x, 2.85, POS.z);

  world.colliders.push({ x: POS.x, z: POS.z, r: 1.1 });
  return { group: g, sign };
}

export const nearShop = (pos) => Math.hypot(pos.x - SHOP_FRONT.x, pos.z - SHOP_FRONT.z) < 1.7;
