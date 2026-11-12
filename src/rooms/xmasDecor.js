import * as THREE from 'three';
import { lowpoly } from './shared.js';

/**
 * 🎄 營火廣場的聖誕造景（作者 11/10、11/12）：只在聖誕期間（12/1～1/6，season.js）顯示。
 *   地上薄雪、飄雪、營火旁一圈小燈串（掛著聖誕襪）、兩個小雪人。
 *   大聖誕樹＝心願大樹變身（wishTree.js），不在這裡。
 * 都是裝飾、沒有碰撞（不會擋路）。
 */
export function buildXmasDecor() {
  const g = new THREE.Group();
  const rnd = (() => {
    let s = 1225;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();

  // ❄️ 地上一片一片的薄雪
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf3f7ff, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 4.5 + rnd() * 24;
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rnd() * 1.4, 9), snowMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd() * 6;
    m.scale.set(1, 0.55 + rnd() * 0.6, 1);
    m.position.set(Math.sin(a) * r, 0.02 + i * 0.0004, Math.cos(a) * r);
    g.add(m);
  }

  // ✨ 營火旁一圈小燈串：矮木樁圍一圈，中間的燈泡垂下來，有些掛著聖誕襪
  const stakeMat = lowpoly(0x6b4a2e);
  const R = 5.2;
  const N = 10;
  const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const cols = [0xffd27a, 0xff7a7a, 0x9fe39f, 0xffd27a, 0x8ac4ff];
  const bulbs = [];
  const stockRed = lowpoly(0xc9483c);
  const stockWhite = lowpoly(0xf6f2ea);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 + 0.2;
    const a1 = ((i + 1) / N) * Math.PI * 2 + 0.2;
    const p0 = new THREE.Vector3(Math.sin(a0) * R, 1.15, Math.cos(a0) * R);
    const p1 = new THREE.Vector3(Math.sin(a1) * R, 1.15, Math.cos(a1) * R);
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), stakeMat);
    stake.position.set(p0.x, 0.6, p0.z);
    g.add(stake);
    // 木樁頂上一個小花圈
    if (i % 2 === 0) {
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 12), lowpoly(0x2f7a45));
      wreath.position.set(p0.x, 1.32, p0.z);
      wreath.lookAt(0, 1.32, 0);
      const bow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), lowpoly(0xd8433a));
      bow.position.set(0, -0.12, 0.03);
      wreath.add(bow);
      g.add(wreath);
    }
    // 垂下來的燈串（兩個木樁之間）
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      const p = p0.clone().lerp(p1, f);
      p.y -= Math.sin(f * Math.PI) * 0.28;
      const b = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: cols[(i * 8 + k) % cols.length] }));
      b.position.copy(p);
      b.userData.ph = i * 1.3 + k;
      g.add(b);
      bulbs.push(b);
    }
    // 聖誕襪（每隔一段掛一隻）
    if (i % 3 === 1) {
      const mid = p0.clone().lerp(p1, 0.5);
      mid.y -= 0.28;
      const sock = new THREE.Group();
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.08), stockRed);
      leg.position.y = -0.17;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.08), stockRed);
      foot.position.set(0.04, -0.3, 0);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.1), stockWhite);
      cuff.position.y = -0.04;
      sock.add(leg, foot, cuff);
      sock.position.copy(mid);
      sock.lookAt(0, mid.y, 0);
      g.add(sock);
    }
  }

  // ⛄ 兩個小雪人
  const white = lowpoly(0xf6f9ff);
  const coal = lowpoly(0x2a2a2a);
  const carrot = lowpoly(0xf08a3c);
  for (const [x, z, ry, sc] of [[-6.5, 4.5, 2.4, 1], [3.2, -7.2, -0.5, 0.8]]) {
    const s = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), white);
    b1.position.y = 0.42;
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), white);
    b2.position.y = 1.02;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.04, 0.33);
    s.add(b1, b2, nose);
    for (const ex of [-0.1, 0.1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), coal);
      e.position.set(ex, 1.13, 0.28);
      s.add(e);
    }
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 14), lowpoly(0xd8433a));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.78;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), lowpoly(0xd8433a));
    hat.position.y = 1.42;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), white);
    pom.position.y = 1.64;
    s.add(scarf, hat, pom);
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    s.scale.setScalar(sc);
    g.add(s);
  }

  // 🌨️ 飄雪（跟著鏡頭的一小團，看起來整個營地都在下雪）
  const FLAKES = 500;
  const pos = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES; i++) {
    pos[i * 3] = (rnd() - 0.5) * 30;
    pos[i * 3 + 1] = rnd() * 12;
    pos[i * 3 + 2] = (rnd() - 0.5) * 30;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false }));
  flakes.frustumCulled = false;
  g.add(flakes);

  g.traverse((o) => {
    if (o.isMesh && o.material !== snowMat && !o.material.isMeshBasicMaterial) o.castShadow = true;
  });

  return {
    group: g,
    /** center：跟著誰下雪（鏡頭或玩家的位置） */
    update(dt, time, center) {
      for (const b of bulbs) b.visible = Math.sin(time * 2 + b.userData.ph) > -0.5;
      const a = geo.attributes.position;
      for (let i = 0; i < FLAKES; i++) {
        let y = a.getY(i) - dt * (0.6 + (i % 5) * 0.12);
        if (y < 0) y += 12;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(time * 0.7 + i) * dt * 0.15);
      }
      a.needsUpdate = true;
      if (center) flakes.position.set(center.x, 0, center.z);
    },
  };
}
