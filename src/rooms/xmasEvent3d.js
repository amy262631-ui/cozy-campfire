import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { SNOWMAN, SNOWMAN_POS } from '../game/xmasEvent.js';

/**
 * 🎄 12/24～27 聖誕 4 天活動的場景物件（營火廣場）：
 *   createXevBox：大聖誕樹下「自己的」禮物盒（每個人只看得到自己的，今天拆過就收起來）
 *   createSnowman：⛄ 大家一起堆的大雪人（12/25 開始，堆完留到 1/6）
 */

/** 頭上的小字牌（canvas 字，跟名字牌一樣面向鏡頭） */
function makeLabel(text, w = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = 64;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set((w / 64) * 0.32, 0.32, 1);
  sp.renderOrder = 10;
  sp.userData.set = (s) => {
    if (sp.userData.text === s) return;
    sp.userData.text = s;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.font = 'bold 34px "Noto Sans TC", sans-serif';
    const tw = Math.min(c.width - 8, g.measureText(s).width + 28);
    g.fillStyle = 'rgba(40, 24, 14, 0.72)';
    g.beginPath();
    g.roundRect((c.width - tw) / 2, 6, tw, 52, 24);
    g.fill();
    g.fillStyle = '#fff4dc';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s, c.width / 2, 33);
    tex.needsUpdate = true;
  };
  sp.userData.set(text);
  return sp;
}

/** 🎁 大聖誕樹下自己的禮物盒 */
export function createXevBox(group, treePos) {
  // 放在聖誕樹靠營火那一側（走過來就看得到）
  const d = Math.hypot(treePos.x, treePos.z) || 1;
  const x = treePos.x - (treePos.x / d) * 2.5;
  const z = treePos.z - (treePos.z / d) * 2.5;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.visible = false;
  const W = 0.62;
  const H = 0.5;
  const red = new THREE.MeshStandardMaterial({ color: 0xd8433a, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14a, roughness: 0.35, metalness: 0.5, emissive: 0x4a3000 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, W), red);
  body.position.y = H / 2;
  body.castShadow = true;
  g.add(body);
  for (const [sx, sz] of [[1.02, 0.16], [0.16, 1.02]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W * sx, H * 1.01, W * sz), gold);
    r.position.y = H / 2;
    g.add(r);
  }
  // 蓋子（拆的時候會彈起來）
  const lid = new THREE.Group();
  lid.position.y = H;
  const lidBox = new THREE.Mesh(new THREE.BoxGeometry(W * 1.08, 0.1, W * 1.08), red);
  lidBox.position.y = 0.05;
  lid.add(lidBox);
  for (const [sx, sz] of [[1.1, 0.16], [0.16, 1.1]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W * sx, 0.11, W * sz), gold);
    r.position.y = 0.05;
    lid.add(r);
  }
  for (const a of [0.7, -0.7]) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), gold);
    bow.position.set(Math.sin(a) * 0.08, 0.16, 0);
    bow.rotation.set(0, Math.PI / 2, a);
    lid.add(bow);
  }
  g.add(lid);
  const label = makeLabel(t('🎁 給你的'));
  label.position.y = 1.15;
  g.add(label);
  group.add(g);
  let opening = 0;
  return {
    group: g,
    pos: { x, z },
    get visible() {
      return g.visible && !opening;
    },
    /** 今天的還沒拆＝顯示 */
    set(on) {
      if (opening) return;
      g.visible = !!on;
      lid.position.y = H;
      lid.rotation.set(0, 0, 0);
      g.scale.setScalar(1);
      label.userData.set(t('🎁 給你的'));
    },
    near: (p) => g.visible && !opening && Math.hypot(p.x - x, p.z - z) < 1.9,
    /** 拆開：蓋子彈起來，1.2 秒後收起來 */
    open() {
      opening = 0.0001;
    },
    update(dt, time) {
      if (!g.visible) return;
      if (opening) {
        opening += dt;
        lid.position.y = H + Math.min(1, opening * 3) * 0.6;
        lid.rotation.z = Math.min(1, opening * 2) * 0.9;
        if (opening > 0.8) g.scale.setScalar(Math.max(0.01, 1 - (opening - 0.8) * 2.5));
        if (opening > 1.2) {
          g.visible = false;
          opening = 0;
        }
        return;
      }
      body.position.y = H / 2 + Math.abs(Math.sin(time * 2.2)) * 0.04;
      lid.position.y = H + Math.abs(Math.sin(time * 2.2)) * 0.04;
      label.position.y = 1.15 + Math.sin(time * 1.5) * 0.04;
    },
  };
}

/** ⛄ 大家一起堆的大雪人：身體 → 頭 → 帽子圍巾（三段），堆的時候慢慢長大 */
export function createSnowman(group, world) {
  const { x, z } = SNOWMAN_POS;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z); // 臉朝營火
  g.visible = false;
  const snow = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.85 });
  // 地上的雪堆（開始堆之前就在）
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), snow);
  mound.scale.y = 0.18;
  mound.receiveShadow = true;
  g.add(mound);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), snow);
  body.castShadow = true;
  g.add(body);
  const headG = new THREE.Group();
  g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 22, 16), snow);
  head.castShadow = true;
  headG.add(head);
  // 臉（第 2 段完成就有）：煤炭眼睛、紅蘿蔔鼻子、笑嘴、腮紅
  const face = new THREE.Group();
  const coal = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), coal);
    e.position.set(s * 0.22, 0.15, 0.6);
    face.add(e);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), new THREE.MeshBasicMaterial({ color: 0xffa0a8, transparent: true, opacity: 0.6 }));
    blush.position.set(s * 0.36, -0.04, 0.57);
    blush.rotation.y = s * 0.55;
    face.add(blush);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0xf08a3c, roughness: 0.6 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, 0.82);
  face.add(nose);
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.25;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), coal);
    m.position.set(Math.sin(a) * 0.32, -0.2 - Math.cos(a) * 0.08 + 0.08, 0.6);
    face.add(m);
  }
  headG.add(face);
  // 帽子、圍巾、鈕扣、樹枝手（第 3 段）
  const deco = new THREE.Group();
  const hatM = new THREE.MeshStandardMaterial({ color: 0xd8433a, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 18), hatM);
  hat.position.set(0, 0.85, -0.05);
  hat.rotation.z = 0.25;
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.11, 8, 20), white);
  brim.rotation.x = Math.PI / 2;
  brim.position.set(0, 0.42, -0.05);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), white);
  pom.position.set(0.24, 1.3, -0.05);
  const hatG = new THREE.Group();
  hatG.add(hat, brim, pom);
  deco.add(hatG);
  const scarfM = new THREE.MeshStandardMaterial({ color: 0x2f9a5a, roughness: 0.8 });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.15, 8, 24), scarfM);
  scarf.rotation.x = Math.PI / 2;
  deco.add(scarf);
  const tailS = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.1), scarfM);
  tailS.position.set(0.32, -0.35, 0.55);
  tailS.rotation.z = 0.15;
  deco.add(tailS);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.3, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 1 }));
    arm.position.set(s * 1.35, 0, 0);
    arm.rotation.z = s * -1.0;
    deco.add(arm);
  }
  const buttons = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), coal);
    b.position.set(0, 0.45 - i * 0.35, 0.96 - Math.abs(i - 1) * 0.06);
    buttons.add(b);
  }
  g.add(buttons);
  g.add(deco);
  const label = makeLabel('', 384);
  g.add(label);
  group.add(g);
  const col = { x, z, r: 1.2 };
  let shown = false;
  let st = { on: false, n: 0, stage: 0, steps: SNOWMAN.steps };
  let pulse = 0;
  const lerpSize = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  const layout = () => {
    const [s1, s2, s3] = st.steps;
    const n = st.n;
    // 身體：0 → s1 慢慢長大（最小也有一顆小雪球）
    const bs = lerpSize(0.3, 1.25, n / s1);
    body.scale.setScalar(bs);
    body.position.y = bs * 0.92;
    const top = bs * 1.84;
    // 頭：s1 → s2
    const hk = (n - s1) / (s2 - s1);
    headG.visible = n >= s1;
    const hs = lerpSize(0.35, 1, hk);
    headG.scale.setScalar(hs);
    headG.position.y = top + 0.68 * hs * 0.9;
    face.visible = n >= s2;
    buttons.visible = n >= s1;
    buttons.position.set(0, body.position.y, 0);
    buttons.scale.setScalar(bs);
    // 帽子圍巾：s2 → s3，堆到一半圍巾、堆完戴帽子
    deco.visible = n >= s2 + (s3 - s2) / 2;
    deco.position.y = headG.position.y;
    hatG.visible = n >= s3;
    for (const c of deco.children) if (c.geometry?.type === 'CylinderGeometry') c.position.y = top - headG.position.y + 0.1 - (bs - 1) * 0.2;
    scarf.position.y = -0.62;
    tailS.position.y = -0.95;
    const done = st.stage >= st.steps.length;
    label.position.y = headG.visible ? headG.position.y + (hatG.visible ? 1.9 : 1.1) : top + 0.6;
    const goal = st.steps[Math.min(st.stage, st.steps.length - 1)];
    label.userData.set(done ? t('⛄ 大家一起堆的大雪人') : t('⛄ 一起堆大雪人 {n}／{goal}', { n, goal }));
  };
  return {
    group: g,
    pos: { x, z },
    get state() {
      return st;
    },
    get canBuild() {
      return st.on && st.build !== false && st.stage < st.steps.length;
    },
    set(v) {
      if (!v) v = { on: false };
      const grew = shown && v.n > st.n;
      st = { ...st, ...v };
      g.visible = !!st.on;
      if (g.visible !== shown) {
        shown = g.visible;
        const i = world.colliders.indexOf(col);
        if (shown && i < 0) world.colliders.push(col);
        if (!shown && i >= 0) world.colliders.splice(i, 1);
      }
      if (g.visible) layout();
      if (grew) pulse = 0.35;
    },
    near: (p) => g.visible && Math.hypot(p.x - x, p.z - z) < 3.2,
    update(dt, time) {
      if (!g.visible) return;
      if (pulse > 0) {
        pulse = Math.max(0, pulse - dt);
        const k = 1 + Math.sin((pulse / 0.35) * Math.PI) * 0.05;
        g.scale.set(k, 1 / k, k);
      }
      label.position.y += Math.sin(time * 1.5) * 0.0015;
    },
  };
}
