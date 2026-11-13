import * as THREE from 'three';

/**
 * 🎲 營火桌遊頭上的道具（作者 11/13：抽到的樹枝、吹的泡泡出現在每個人頭上，旁邊的人也看得到）
 *   makeStick(len)：一根小樹枝（直直的，len 公尺，越長越好），頂端兩片小葉子
 *   makeBubble()：一顆彩虹泡泡；setSize(0～1) 變大，pop() 破掉
 */
const mats = {};
const m = (k, make) => (mats[k] ??= make());

export function makeStick(len = 0.5) {
  const g = new THREE.Group();
  const bark = m('bark', () => new THREE.MeshStandardMaterial({ color: 0xe0b27a, roughness: 0.9, flatShading: true, emissive: 0x6a4020, emissiveIntensity: 0.45 }));
  const leaf = m('leaf', () => new THREE.MeshStandardMaterial({ color: 0x8fd46a, roughness: 1, side: THREE.DoubleSide, emissive: 0x2f6a20, emissiveIntensity: 0.4 }));
  // 粗一點、亮一點：晚上遠遠也看得到
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, len, 7), bark);
  s.position.y = len / 2;
  g.add(s);
  // 中間一個小分岔，看起來比較像樹枝
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, Math.min(0.18, len * 0.3), 5), bark);
  twig.position.set(0.035, len * 0.55, 0);
  twig.rotation.z = -0.7;
  g.add(twig);
  for (const sx of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.075, 6), leaf);
    l.position.set(sx * 0.03, len + 0.02, 0);
    l.rotation.z = sx * 0.6;
    l.scale.y = 1.6;
    g.add(l);
  }
  g.userData.len = len;
  return g;
}

export function makeBubble() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.42, emissive: 0x9fd6ff, emissiveIntensity: 0.25, depthWrite: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
  g.add(ball);
  // 亮亮的反光點
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  shine.position.set(-0.45, 0.45, 0.65);
  ball.add(shine);
  // 一圈淡淡的彩虹
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffc8f0, transparent: true, opacity: 0.5 }));
  ball.add(rim);
  let size = 0;
  let popT = 0;
  const drops = [];
  g.userData = {
    setSize(s) {
      size = Math.max(0, s);
      const r = 0.06 + size * 0.42; // 最大大約一顆頭那麼大
      ball.scale.setScalar(r);
      ball.position.y = r;
      ball.visible = !popT;
    },
    get size() {
      return size;
    },
    /** 破掉：泡泡消失、噴出幾顆小水滴 */
    pop() {
      popT = 0.6;
      ball.visible = false;
      for (let i = 0; i < 8; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mat);
        const a = (i / 8) * Math.PI * 2;
        d.userData.v = new THREE.Vector3(Math.cos(a), 0.6 + Math.random() * 0.6, Math.sin(a)).multiplyScalar(1.2);
        d.position.y = ball.position.y;
        g.add(d);
        drops.push(d);
      }
    },
    update(dt, t) {
      if (!popT) {
        ball.rotation.y = t * 0.6;
        ball.position.x = Math.sin(t * 2.3) * 0.015;
        return;
      }
      popT = Math.max(0, popT - dt);
      for (const d of drops) {
        d.position.addScaledVector(d.userData.v, dt);
        d.userData.v.y -= dt * 4;
        d.scale.setScalar(popT / 0.6);
      }
    },
  };
  g.userData.setSize(0);
  return g;
}
