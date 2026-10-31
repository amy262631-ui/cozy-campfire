import * as THREE from 'three';
import { makeResolver, makeSign, lowpoly, shadowAll } from './shared.js';
import { seededRandom } from '../scene/textures.js';
import { FOG_COLOR } from '../scene/World.js';
import { t } from '../i18n/i18n.js';

const DECK_R = 4.6;
const JUKEBOX = { x: 2.35, z: -2.2 };

/** 復古點唱機：木頭櫃子＋黑膠唱盤＋喇叭，會發出暖光 */
function buildJukebox() {
  const g = new THREE.Group();
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.6), lowpoly(0x7b4f31));
  cabinet.position.y = 0.375;
  g.add(cabinet);
  const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 1 }));
  grill.position.set(0, 0.36, 0.301);
  g.add(grill);
  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.015, 0.01), lowpoly(0x6b4529));
    bar.position.set(0, 0.2 + i * 0.08, 0.305);
    g.add(bar);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.56), lowpoly(0x5a3a24));
  deck.position.y = 0.78;
  g.add(deck);
  const record = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 28), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.35 }));
  record.position.set(-0.12, 0.818, 0);
  g.add(record);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 18), new THREE.MeshStandardMaterial({ color: 0xe0864a }));
  label.position.set(-0.12, 0.82, 0);
  g.add(label);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.3), lowpoly(0xc9c4b8));
  arm.position.set(0.2, 0.84, 0.02);
  arm.rotation.y = 0.5;
  g.add(arm);
  // 喇叭花
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }));
  horn.position.set(0.25, 1.15, -0.1);
  horn.rotation.set(-0.9, 0, -0.5);
  g.add(horn);
  const light = new THREE.PointLight(0xffb46a, 2.5, 4, 1.5);
  light.position.set(0, 1.0, 0.5);
  g.add(light);
  shadowAll(g);
  return { group: g, record };
}

/**
 * 森林樹屋（treehouse_music）：樹冠上的木頭平台、燈串、點唱機。
 * 靠近點唱機按 E 可以點歌（同房間的人聽到同一首）。
 */
export function createTreehouseRoom() {
  const group = new THREE.Group();
  group.name = 'treehouse_music';
  const rand = seededRandom(77);
  const occluders = [];

  // 燈光
  group.add(new THREE.HemisphereLight(0x5a74a8, 0x2a2618, 1.3));
  const moon = new THREE.DirectionalLight(0x9db4ff, 0.8);
  moon.position.set(-15, 22, -13);
  group.add(moon);
  const warm = new THREE.PointLight(0xffcf8a, 9, 12, 1.4);
  warm.position.set(0, 2.6, 0);
  warm.castShadow = true;
  warm.shadow.mapSize.set(512, 512);
  warm.shadow.normalBias = 0.03;
  group.add(warm);

  // 平台
  const plank = lowpoly(0x86603d);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(DECK_R, DECK_R - 0.1, 0.25, 20), plank);
  deck.position.y = -0.125;
  deck.receiveShadow = true;
  group.add(deck);
  // 木板縫
  for (let i = -4; i <= 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, Math.sqrt(Math.max(0, DECK_R ** 2 - (i * 0.5) ** 2)) * 2), lowpoly(0x5e4128));
    line.position.set(i * 0.5, 0.003, 0);
    group.add(line);
  }

  // 主幹穿過平台後方，往上長成樹冠
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 12, 10), lowpoly(0x4a3322));
  trunk.position.set(0, 3, -3.4);
  group.add(trunk);
  occluders.push(trunk);
  for (const [x, y, z, r] of [[0, 6.5, -3.2, 3.6], [2.6, 5.6, -2.0, 2.2], [-2.6, 5.8, -1.8, 2.4], [0.8, 8.2, -3.0, 2.6]]) {
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.4, 8), lowpoly(0x223d2b));
    leaves.position.set(x, y, z);
    leaves.castShadow = true;
    group.add(leaves);
  }

  // 欄杆
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6);
  const POSTS = 18;
  const postPos = [];
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * Math.PI * 2;
    if (Math.abs(a) < 0.25 || Math.abs(a - Math.PI * 2) < 0.25) continue; // 前方留梯子口
    const p = new THREE.Mesh(postGeo, plank);
    p.position.set(Math.sin(a) * (DECK_R - 0.15), 0.5, Math.cos(a) * (DECK_R - 0.15));
    p.castShadow = true;
    group.add(p);
    postPos.push(p.position.clone());
  }
  for (let i = 0; i < postPos.length - 1; i++) {
    const a = postPos[i];
    const b = postPos[i + 1];
    const len = a.distanceTo(b);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, len), plank);
    rail.position.copy(a).add(b).multiplyScalar(0.5).setY(0.98);
    rail.lookAt(b.x, 0.98, b.z);
    group.add(rail);
  }

  // 燈串：從樹幹拉到欄杆
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x3a3028 });
  const bulbs = [];
  for (let i = 0; i < postPos.length; i += 3) {
    const from = new THREE.Vector3(0, 3.2, -3.0);
    const to = postPos[i].clone().setY(1.05);
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const p = from.clone().lerp(to, u);
      p.y -= Math.sin(u * Math.PI) * 0.55; // 自然下垂
      pts.push(p);
      if (k > 0 && k < 12 && k % 2 === 0) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), bulbMat);
        bulb.position.copy(p).y -= 0.05;
        bulbs.push(bulb);
        group.add(bulb);
      }
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // 靠墊、小桌
  [[-1.8, 1.2, 0xe6a57e], [-2.3, -0.4, 0x8fb2a4], [1.2, 1.9, 0xe9d2a6]].forEach(([x, z, c]) => {
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    cushion.scale.set(1, 0.4, 1);
    cushion.position.set(x, 0.15, z);
    cushion.castShadow = true;
    group.add(cushion);
  });

  // 點唱機
  const jukebox = buildJukebox();
  jukebox.group.position.set(JUKEBOX.x, 0, JUKEBOX.z);
  jukebox.group.rotation.y = Math.atan2(-JUKEBOX.x, -JUKEBOX.z); // 面向平台中央
  group.add(jukebox.group);
  const sign = makeSign(t('🎵 點唱機'), { height: 0.24 });
  sign.position.set(JUKEBOX.x, 1.75, JUKEBOX.z);
  group.add(sign);

  // 梯子口
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), plank);
    rail.position.set(side * 0.3, 0.3, DECK_R - 0.05);
    group.add(rail);
  }
  const exitSign = makeSign(t('🪜 下樹回營火'), { height: 0.18 });
  exitSign.position.set(0, 0.85, DECK_R + 0.1);
  group.add(exitSign);

  // 周圍更低處的樹梢（營造「在樹上」的感覺）
  const tops = [];
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 26;
    tops.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, y: -7 + rand() * 5, s: 1.2 + rand() * 1.2 });
  }
  const coneMat = lowpoly(0x1f3a2a);
  const coneGeo = new THREE.ConeGeometry(1.4, 3.2, 7).translate(0, 1.6, 0);
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, tops.length * 2);
  const d = new THREE.Object3D();
  tops.forEach((t, i) => {
    d.position.set(t.x, t.y, t.z);
    d.scale.setScalar(t.s);
    d.updateMatrix();
    cones.setMatrixAt(i * 2, d.matrix);
    d.position.y += 1.6 * t.s;
    d.scale.setScalar(t.s * 0.7);
    d.updateMatrix();
    cones.setMatrixAt(i * 2 + 1, d.matrix);
  });
  group.add(cones);

  // 播放時從點唱機飄出的音符
  const noteTextures = ['♪', '♫', '♬'].map((ch, i) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 52px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = ['#ffd9a0', '#ffb6c8', '#b9e2ff'][i];
    g.shadowColor = 'rgba(255, 220, 160, 0.9)';
    g.shadowBlur = 10;
    g.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  const notes = [];
  let nextNote = 0;
  const jukeTop = new THREE.Vector3(JUKEBOX.x, 1.25, JUKEBOX.z);

  const colliders = [
    { x: 0, z: -3.4, r: 0.75 },
    { x: JUKEBOX.x, z: JUKEBOX.z, r: 0.55 },
  ];
  const resolveCollision = makeResolver(colliders, { type: 'circle', r: DECK_R - 0.25 });

  const nearJukebox = (actions) =>
    Math.hypot(actions.player.position.x - JUKEBOX.x, actions.player.position.z - JUKEBOX.z) < 1.7;

  return {
    id: 'treehouse_music',
    label: t('🎵 森林樹屋'),
    group,
    fog: new THREE.FogExp2(FOG_COLOR, 0.04),
    background: new THREE.Color(FOG_COLOR),
    outdoor: true,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: DECK_R - 0.35, r: 0.55, label: t('回到營火') }],
    spawn: { x: 0, z: 2.6, ry: Math.PI, camYaw: 0.75, camPitch: 0.45 },
    cameraDistance: 5.5,
    audio: { fire: 0, wind: 0.5, ambient: 0.5, water: 0, music: 1, song: null }, // song 由點唱機決定
    resolveCollision,

    onAction(name, actions) {
      if (actions.state !== 'free') return false;
      if (name === 'interact') {
        if (nearJukebox(actions)) actions.onJukebox?.();
        else actions.hud.toast(t('走到點唱機旁邊按 E 點歌 🎵'));
        return true;
      }
      if (name === 'roast') {
        actions.hud.toast(t('樹屋是木頭做的，這裡不能烤火喔 🌲'));
        return true;
      }
      return false;
    },

    prompt(actions) {
      return nearJukebox(actions) ? t('<kbd>E</kbd> 點播音樂') : null;
    },

    update(dt, t) {
      jukebox.record.rotation.y += dt * (this.musicPlaying ? 3.5 : 0);

      // 音符
      nextNote -= dt;
      if (this.musicPlaying && nextNote <= 0) {
        nextNote = 0.45 + Math.random() * 0.4;
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: noteTextures[Math.floor(Math.random() * 3)], transparent: true, depthWrite: false, fog: false }),
        );
        sp.position.copy(jukeTop);
        group.add(sp);
        notes.push({ sp, life: 0, drift: (Math.random() - 0.5) * 0.6, phase: Math.random() * 6 });
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.life += dt / 2.4;
        if (n.life >= 1) {
          group.remove(n.sp);
          n.sp.material.dispose();
          notes.splice(i, 1);
          continue;
        }
        n.sp.position.set(
          jukeTop.x + n.drift * n.life + Math.sin(t * 2 + n.phase) * 0.12,
          jukeTop.y + n.life * 1.5,
          jukeTop.z + Math.cos(t * 1.6 + n.phase) * 0.1,
        );
        const sc = 0.22 + Math.min(1, n.life * 4) * 0.1;
        n.sp.scale.set(sc, sc, 1);
        n.sp.material.opacity = Math.min(1, n.life * 5) * (1 - n.life);
      }
      for (let i = 0; i < bulbs.length; i++) {
        const b = 0.85 + Math.sin(t * 1.5 + i * 0.9) * 0.15;
        bulbs[i].scale.setScalar(b);
      }
    },
    musicPlaying: true,
  };
}
