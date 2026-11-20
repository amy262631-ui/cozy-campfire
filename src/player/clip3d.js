/**
 * 📎 髮夾（月票本月造型，12 月起）：戴在頭的右前側，任何假髮、沒假髮、戴帽子都能一起戴。
 *   buildClip(kind)  做出髮夾（面向 +z，中心在原點）
 *   clipFit(g, hair, hat)  依照頭髮蓬度放到頭上的位置（g 加在 character.head 底下）
 */
import * as THREE from 'three';
import { HAIR_VOLUME } from './hair3d.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...o });

let _felt = null;
/** 毛氈的細細毛點（灰階，乘在顏色上） */
function feltTex() {
  if (_felt) return _felt;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 700; i++) {
    const v = 200 + Math.floor(Math.random() * 55);
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 2, 1);
  }
  _felt = new THREE.CanvasTexture(c);
  _felt.wrapS = _felt.wrapT = THREE.RepeatWrapping;
  _felt.colorSpace = THREE.SRGBColorSpace;
  return _felt;
}

export function buildClip(kind) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  // 後面一根細細的金色夾子
  const bar = add(new THREE.CapsuleGeometry(0.01, 0.07, 4, 8), std(0xe8c46a, { metalness: 0.5, roughness: 0.3 }), 0, 0, -0.02);
  bar.rotation.z = Math.PI / 2 + 0.35;
  if (kind === 'snow') {
    // ❄️ 雪花：6 根枝＋每根兩個小叉，冰藍白、微微發光
    const m = std(0xeaf6ff, { emissive: 0x9fd6ff, emissiveIntensity: 0.35, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const arm = new THREE.Group();
      arm.rotation.z = a;
      g.add(arm);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.09, 0.014), m);
      s.position.y = 0.045;
      arm.add(s);
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.012), m);
        b.position.set(side * 0.012, 0.06, 0);
        b.rotation.z = -side * 0.75;
        arm.add(b);
      }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), m);
      tip.position.y = 0.093;
      arm.add(tip);
    }
    add(new THREE.SphereGeometry(0.022, 12, 8), std(0xffffff, { emissive: 0xbfe6ff, emissiveIntensity: 0.4 }), 0, 0, 0.008);
  } else if (kind === 'deer') {
    // 🦌 羊毛氈小麋鹿：奶茶色圓頭、深咖啡鹿角、大紅鼻子、黑豆眼睛（作者 11/20 照片）
    g.userData.s = 1.2;
    const felt = (c) => std(c, { roughness: 1, map: feltTex() });
    const fur = felt(0xd9a77a);
    const head = add(new THREE.SphereGeometry(0.055, 18, 14), fur, 0, 0, 0);
    head.scale.set(1, 0.95, 0.8);
    add(new THREE.SphereGeometry(0.03, 14, 10), felt(0xe6bc92), 0, -0.022, 0.032).scale.set(1.2, 0.85, 0.8); // 嘴巴
    add(new THREE.SphereGeometry(0.019, 14, 10), felt(0xe23a3a), 0, -0.016, 0.06); // 紅鼻子
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.007, 8, 6), std(0x1a1410, { roughness: 0.2 }), sx * 0.024, 0.008, 0.045); // 黑豆眼
      const ear = add(new THREE.SphereGeometry(0.018, 10, 8), fur, sx * 0.058, 0.02, -0.005);
      ear.scale.set(1.3, 0.75, 0.55);
      ear.rotation.z = sx * -0.35;
      // 鹿角：一根主幹＋兩個小叉，圓圓的毛氈
      const am = felt(0x6a4a38);
      const ant = new THREE.Group();
      ant.position.set(sx * 0.03, 0.045, -0.005);
      ant.rotation.z = sx * -0.35;
      g.add(ant);
      const seg = (x, y, h, rz) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, h, 4, 8), am);
        m.position.set(x, y, 0);
        m.rotation.z = rz;
        ant.add(m);
      };
      seg(0, 0.02, 0.035, 0);
      seg(sx * 0.014, 0.03, 0.02, sx * -0.9);
      seg(sx * -0.01, 0.045, 0.018, sx * 0.7);
    }
  } else {
    // 🌸 花朵：5 片粉色花瓣＋黃色花心＋一片小葉子
    const pm = std(0xffb3cc);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
      const p = add(new THREE.SphereGeometry(0.03, 12, 8), pm, Math.cos(a) * 0.034, Math.sin(a) * 0.034, 0);
      p.scale.set(1, 0.8, 0.45);
      p.rotation.z = a;
    }
    add(new THREE.SphereGeometry(0.019, 12, 8), std(0xffd54a), 0, 0, 0.012).scale.z = 0.7;
    const leaf = add(new THREE.SphereGeometry(0.025, 10, 6), std(0x6ab86a), 0.055, -0.045, -0.008);
    leaf.scale.set(1.3, 0.55, 0.35);
    leaf.rotation.z = -0.6;
  }
  return g;
}

/** 放到頭的右前側（耳朵前面一點），頭髮越蓬放越外面；戴帽子時往下一點避開帽簷 */
export function clipFit(g, hair = '', hat = false) {
  const vol = hair ? (HAIR_VOLUME[hair] ?? 0.04) : 0;
  const dir = new THREE.Vector3(hat ? 0.86 : 0.72, hat ? 0.05 : 0.48, hat ? 0.4 : 0.5).normalize();
  // 頭是 0.37 的球、縮放 [1.1, 0.95, 1]
  const R = 0.37;
  const p = new THREE.Vector3(dir.x * R * 1.1, dir.y * R * 0.95, dir.z * R);
  const out = 0.03 + vol * 1.2 + (hair ? 0.025 : 0);
  p.addScaledVector(dir, out);
  g.position.copy(p);
  g.lookAt(p.clone().add(dir));
  g.rotateZ(-0.3);
  g.scale.setScalar(1.5 * (g.userData.s ?? 1));
  return g;
}
