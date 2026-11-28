/**
 * 🚣 划船競速（作者 11/28）：湖上的 4 個浮標、出發／終點線
 *   平常收起來；划船競速那一場（10 分鐘）才出現。自己在比賽時，下一個要繞的浮標會亮、上面有箭頭。
 */
import * as THREE from 'three';
import { RACE_BUOYS, RACE_LINE } from '../game/boatRace.js';
import { lowpoly, makeSign } from './shared.js';
import { t } from '../i18n/i18n.js';

export function createBoatRaceLayer(group, waterY) {
  const root = new THREE.Group();
  root.visible = false;
  group.add(root);

  // 🔴 浮標：紅白相間的圓桶＋頂上小旗＋號碼
  const red = lowpoly(0xe04a3c);
  const white = lowpoly(0xf6f1e8);
  const buoys = RACE_BUOYS.map((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.x, waterY, p.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 12), red);
    base.position.y = 0.12;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.28, 12), white);
    band.position.y = 0.5;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.42, 12), red);
    top.position.y = 0.85;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), lowpoly(0x6b5a48));
    pole.position.y = 1.4;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), lowpoly(0xffd04a, { side: THREE.DoubleSide }));
    flag.position.set(0.26, 1.7, 0);
    for (const m of [base, band, top]) m.castShadow = true;
    g.add(base, band, top, pole, flag);
    const label = makeSign(`${i + 1}`, { height: 0.5, bg: 'rgba(200, 60, 40, 0.85)', color: '#fff' });
    label.position.y = 2.35;
    g.add(label);
    // 下一個要繞的：水面上一圈亮亮的、上面一個往下的箭頭
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.4, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.visible = false;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    arrow.rotation.x = Math.PI;
    arrow.position.y = 3.2;
    arrow.visible = false;
    g.add(ring, arrow);
    root.add(g);
    return { g, ring, arrow, flag, bob: i * 1.7 };
  });

  // 🏁 出發／終點線：兩根旗桿＋中間一串三角旗＋水面上一條黑白格子
  const line = new THREE.Group();
  line.position.set(0, waterY, RACE_LINE.z);
  const postM = lowpoly(0xf6f1e8);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3, 8), postM);
    post.position.set(s * RACE_LINE.halfW, 1.4, 0);
    post.castShadow = true;
    const float = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.4, 10), red);
    float.position.set(s * RACE_LINE.halfW, 0.1, 0);
    line.add(post, float);
  }
  // 格子線（canvas 貼圖）
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 16;
  const cg = cv.getContext('2d');
  for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) {
    cg.fillStyle = (i + j) % 2 ? '#1d1d1d' : '#f4f4f4';
    cg.fillRect(i * 8, j * 8, 8, 8);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(RACE_LINE.halfW * 2, 0.35), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.05;
  line.add(strip);
  // 三角旗串
  const COLORS = [0xe04a3c, 0xffd04a, 0x4aa3e0, 0x6cc46a, 0xf6f1e8];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const x = -RACE_LINE.halfW + ((i + 0.5) / n) * RACE_LINE.halfW * 2;
    const sag = 0.45 * (1 - (x / RACE_LINE.halfW) ** 2);
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 3), lowpoly(COLORS[i % COLORS.length]));
    tri.rotation.x = Math.PI;
    tri.position.set(x, 2.75 - sag, 0);
    line.add(tri);
  }
  const banner = makeSign(t('🚣 划船競速 出發／終點'), { height: 0.45, bg: 'rgba(30, 60, 90, 0.85)' });
  banner.position.set(0, 3.45, 0);
  line.add(banner);
  root.add(line);

  let next = -1; // 自己下一個要繞的浮標（0～3），-1＝不亮
  return {
    root,
    /** 這一場有沒有划船競速 */
    setOn(on) {
      root.visible = !!on;
      if (!on) this.setNext(-1);
    },
    /** 亮哪一個浮標（-1＝都不亮；4＝要衝終點線） */
    setNext(i) {
      next = i;
      buoys.forEach((b, k) => {
        b.ring.visible = b.arrow.visible = k === i;
      });
      strip.material.opacity = i === RACE_BUOYS.length ? 1 : 0.9;
    },
    update(dt, time) {
      if (!root.visible) return;
      for (const b of buoys) {
        b.g.position.y = waterY + Math.sin(time * 1.5 + b.bob) * 0.04;
        b.flag.rotation.y = Math.sin(time * 3 + b.bob) * 0.35;
        if (b.arrow.visible) {
          b.arrow.position.y = 3.2 + Math.sin(time * 4) * 0.18;
          b.ring.material.opacity = 0.4 + Math.sin(time * 5) * 0.2;
        }
      }
      if (next === RACE_BUOYS.length) strip.material.opacity = 0.75 + Math.sin(time * 6) * 0.25; // 最後衝終點：格子線閃
    },
  };
}
