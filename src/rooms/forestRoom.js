import * as THREE from 'three';
import { GlowLight } from '../scene/GlowLight.js'; // 裝飾小燈用光暈代替真的光源（效能）
import { createWorld } from '../scene/World.js';
import { Campfire } from '../scene/Campfire.js';
import { makeSign, lowpoly, shadowAll } from './shared.js';
import { buildShrine } from './shrine.js';
import { buildCairnGarden, CAIRN_GARDEN_CLEARING } from './cairns.js';
import { buildMiniLayer } from './miniLayer.js';
import { buildPond } from './pond.js';
import { ENTRANCE_GEO } from '../game/entrances.js';
import { POND_CLEARINGS } from '../game/pondShape.js';
import { buildWishTree, WISH_TREE_CLEARING } from './wishTree.js';
import { buildXmasDecor } from './xmasDecor.js';
import { isXmas } from '../game/season.js';
import { buildShop, nearShop, SHOP_FRONT, SHOP_CLEARING } from './shop.js';
import { buildCampExtras, createTreasures, EXTRA_CLEARINGS } from './campExtras.js';
import { buildFireSeats, SEAT_LIFT } from './fireSeats.js';
import { createTrashLayer } from './trashLayer.js';
import { EMOTE_IDS } from '../social/emotes.js';
import { t } from '../i18n/i18n.js';

/** 三個子房間入口在森林裡的方位（角度＝從營火看出去的方向） */
const ENTRANCES = [
  { to: 'tent_focus', angle: 2.6, label: t('⛺ 專注帳篷') },
  { to: 'treehouse_music', angle: -2.2, label: t('🎵 森林樹屋') },
  { to: 'lake_dock', angle: 1.15, label: t('🎣 湖畔碼頭') },
  // ☕ 交流帳篷：作者 11/13 拿掉（桌遊改放營火旁）
  { to: 'campground', angle: -2.95, label: t('🏕️ 帳篷營地') },
  { to: 'mist_forest', angle: 0.8, label: t('🍄 迷霧森林') },
];
/** 地藏祈福處的方位（不用換房間，就在森林裡） */
const SHRINE_ANGLE = -0.15;
const SHRINE_R = 13.2;
/** 營火告示牌：插在營火旁（兩張長椅之間），正面朝向營火 */
const BOARD_ANGLE = 2.1;
const BOARD_R = 4.4;
/** 便條紙顏色（與 NoticePanel 一致） */
const NOTE_COLORS = ['#fff3b0', '#ffd6dc', '#d4f0d0', '#d6e6ff'];

/** 木頭告示牌：軟木板上釘著大家的便條紙（畫在畫布上） */
function buildNoticeBoard() {
  const g = new THREE.Group();
  const wood = lowpoly(0x6d4a2e);
  for (const x of [-0.66, 0.66]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.65, 6), wood);
    post.position.set(x, 0.82, 0);
    g.add(post);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.94, 0.06), [
    lowpoly(0x8a6240), lowpoly(0x8a6240), lowpoly(0x8a6240), lowpoly(0x8a6240),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), // 正面
    lowpoly(0x7a5638),
  ]);
  board.position.y = 1.1;
  g.add(board);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.34), lowpoly(0x4f3524));
  roof.position.set(0, 1.62, 0.02);
  roof.rotation.x = 0.12;
  g.add(roof);
  // 底下的小花
  for (const [x, c] of [[-0.45, 0xffd84a], [-0.3, 0xf7f2ea], [0.38, 0xffd84a], [0.52, 0xf2b8c6]]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    f.position.set(x, 0.12, 0.12);
    g.add(f);
  }
  const lamp = new GlowLight(0xffc27a, 1.6, 3.5);
  lamp.position.set(0, 1.5, 0.45);
  g.add(lamp);
  shadowAll(g);
  lamp.castShadow = false;

  const FONT = '"Noto Sans TC", "PingFang TC", "Hiragino Sans", "Malgun Gothic", sans-serif';
  /** 文字太長就截斷，畫成最多兩行 */
  function wrap(c, text, width) {
    const lines = [''];
    for (const ch of String(text)) {
      const cur = lines[lines.length - 1];
      if (c.measureText(cur + ch).width > width) {
        if (lines.length === 2) {
          lines[1] = lines[1].slice(0, -1) + '…';
          break;
        }
        lines.push(ch);
      } else lines[lines.length - 1] = cur + ch;
    }
    return lines;
  }

  /** 畫軟木板＋最新四張便條 */
  function draw(notes = []) {
    const c = canvas.getContext('2d');
    // 軟木底
    c.fillStyle = '#b98a58';
    c.fillRect(0, 0, 512, 340);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${90 + ((i * 53) % 60)}, ${55 + ((i * 31) % 40)}, 30, 0.25)`;
      c.fillRect((i * 97) % 512, (i * 61) % 340, 3, 2);
    }
    c.strokeStyle = '#6d4a2e';
    c.lineWidth = 14;
    c.strokeRect(0, 0, 512, 340);
    c.fillStyle = '#3a2214';
    c.textAlign = 'center';
    c.font = `bold 34px ${FONT}`;
    c.fillText(t('📌 營火告示牌'), 256, 50);

    const shown = notes.slice(-4).reverse();
    if (!shown.length) {
      c.font = `26px ${FONT}`;
      c.fillText(t('按 E 留言'), 256, 190);
    }
    shown.forEach((n, i) => {
      const x = 22 + (i % 2) * 240;
      const y = 72 + Math.floor(i / 2) * 130;
      c.save();
      c.translate(x + 110, y + 58);
      c.rotate((((i * 37) % 5) - 2) * 0.02);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(-104, -50, 216, 116);
      c.fillStyle = NOTE_COLORS[n.color | 0] ?? NOTE_COLORS[0];
      c.fillRect(-108, -56, 216, 116);
      // 圖釘
      c.fillStyle = '#e25b4f';
      c.beginPath();
      c.arc(0, -48, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3a2a20';
      c.textAlign = 'left';
      c.font = `24px ${FONT}`;
      wrap(c, n.text, 192).forEach((line, li) => c.fillText(line, -96, -10 + li * 30));
      c.font = `18px ${FONT}`;
      c.fillStyle = '#7a6250';
      c.textAlign = 'right';
      c.fillText(`— ${String(n.name).slice(0, 8)}`, 98, 50);
      c.restore();
    });
    tex.needsUpdate = true;
  }
  draw([]);
  return { group: g, draw };
}
const TRIGGER_R = 13.6; // 觸發點離營火的距離
const BUILD_R = 15.3; // 建築物中心離營火的距離

const polar = (angle, r) => ({ x: Math.sin(angle) * r, z: Math.cos(angle) * r });

// ---------- 入口建築 ----------

/** 帆布小帳篷（門朝 +Z），裡面透出煤油燈的暖光 */
function buildTent() {
  const g = new THREE.Group();
  const canvas = lowpoly(0xd9c49c, { side: THREE.DoubleSide });
  const W = 1.25;
  const H = 1.9;
  const D = 2.6;
  const slant = Math.hypot(W, H);
  const lean = Math.atan2(W, H);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, slant, D), canvas);
    panel.position.set((side * W) / 2, H / 2, 0);
    panel.rotation.z = side * lean;
    g.add(panel);
  }
  // 後牆三角形
  const tri = new THREE.Shape([new THREE.Vector2(-W, 0), new THREE.Vector2(W, 0), new THREE.Vector2(0, H)]);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(tri), canvas);
  back.position.z = -D / 2;
  g.add(back);
  // 前面兩片往外翻開的門簾
  for (const side of [-1, 1]) {
    const flap = new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(side * W * 0.9, 0),
      new THREE.Vector2(0, H * 0.98),
    ]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(flap), lowpoly(0xc9b48a, { side: THREE.DoubleSide }));
    m.position.set(side * W * 0.95, 0, D / 2);
    m.rotation.y = side * 0.9;
    g.add(m);
  }
  // 地布與內部暖光
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D), lowpoly(0x5a4632));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  g.add(floor);
  const lamp = new GlowLight(0xffb066, 5, 7);
  lamp.position.set(0, 1.1, 0);
  g.add(lamp);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd08a }),
  );
  glow.position.copy(lamp.position);
  g.add(glow);
  // 營繩與營釘
  const rope = new THREE.LineBasicMaterial({ color: 0xbfae8a });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pts = [new THREE.Vector3(0, H, (sz * D) / 2), new THREE.Vector3(sx * 1.6, 0, sz * (D / 2 + 0.6))];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rope));
  }
  shadowAll(g);
  lamp.castShadow = false;
  return { group: g, lamp, colliderR: 1.35 };
}

/** 大樹＋樹上小屋＋梯子（梯子朝 +Z） */
function buildTreehouse() {
  const g = new THREE.Group();
  const bark = lowpoly(0x4a3322);
  const plank = lowpoly(0x7a5638);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 7, 9), bark);
  trunk.position.y = 3.5;
  g.add(trunk);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.18, 12), plank);
  deck.position.y = 3.1;
  g.add(deck);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 1.7), lowpoly(0x8f6a45));
  hut.position.set(0, 3.95, -0.2);
  g.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.0, 4), lowpoly(0x5a3a2a));
  roof.position.set(0, 5.2, -0.2);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // 窗戶暖光
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45), new THREE.MeshBasicMaterial({ color: 0xffc777 }));
  win.position.set(0, 4.05, 0.66);
  g.add(win);
  const light = new GlowLight(0xffc477, 4, 8);
  light.position.set(0, 4.0, 1.2);
  g.add(light);
  // 樹冠
  for (const [x, y, z, r] of [[0, 7.2, 0, 2.4], [1.3, 6.4, -0.6, 1.6], [-1.2, 6.6, 0.4, 1.7]]) {
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.6, 7), lowpoly(0x24412d));
    leaves.position.set(x, y, z);
    g.add(leaves);
  }
  // 梯子
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.3, 0.07), plank);
    rail.position.set(side * 0.28, 1.6, 2.15);
    rail.rotation.x = -0.12;
    g.add(rail);
  }
  for (let i = 0; i < 9; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.06), plank);
    rung.position.set(0, 0.25 + i * 0.35, 2.15 + (0.25 + i * 0.35 - 1.6) * 0.12);
    g.add(rung);
  }
  // 小燈串
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe1a0 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), bulbMat);
    bulb.position.set(Math.sin(a) * 2.05, 3.55 + Math.sin(i * 1.7) * 0.06, Math.cos(a) * 2.05);
    g.add(bulb);
  }
  shadowAll(g);
  return { group: g, colliderR: 0.95 };
}

/** 往湖邊的小路：指示牌、提燈、踏腳石（路朝 -Z 延伸出去） */
function buildLakePath() {
  const g = new THREE.Group();
  const wood = lowpoly(0x6d4a2e);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.7, 6), wood);
  post.position.set(-0.9, 0.85, 0);
  g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.06), lowpoly(0x8c6644));
  board.position.set(-0.55, 1.35, 0);
  g.add(board);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 3), lowpoly(0x8c6644));
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(-0.02, 1.35, 0);
  g.add(arrow);
  // 提燈
  const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6), wood);
  lanternPost.position.set(0.9, 0.75, 0.2);
  g.add(lanternPost);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xffcf86 }));
  lantern.position.set(0.9, 1.6, 0.2);
  g.add(lantern);
  const light = new GlowLight(0xffc073, 3.5, 7);
  light.position.set(0.9, 1.6, 0.4);
  g.add(light);
  // 踏腳石
  for (let i = 0; i < 6; i++) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 7), lowpoly(0x77746d));
    stone.position.set(Math.sin(i * 1.3) * 0.25, 0.04, -0.6 - i * 0.75);
    g.add(stone);
  }
  // 遠方湖面的藍光（在霧裡暗示那邊有水）
  const hint = new GlowLight(0x6fa4ff, 3, 10);
  hint.position.set(0, 1.2, -5);
  g.add(hint);
  shadowAll(g);
  return { group: g, colliderR: 0.3 };
}

/** 交流帳篷外觀：圓圓的鐘形帳篷，門口透出暖光、掛著燈串 */
function buildBellTent() {
  const g = new THREE.Group();
  const canvas = lowpoly(0xe6d3ad, { side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.1, 18, 1, true, 0.5, Math.PI * 2 - 1.0), canvas);
  wall.position.y = 0.55;
  g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.7, 18), canvas);
  roof.position.y = 1.95;
  g.add(roof);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 3), lowpoly(0xe58b6b));
  flag.position.set(0.12, 3.0, 0);
  flag.rotation.z = -Math.PI / 2;
  g.add(flag);
  const poleTop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), lowpoly(0x6d4b30));
  poleTop.position.y = 2.95;
  g.add(poleTop);
  // 門口裡的暖光
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), new THREE.MeshBasicMaterial({ color: 0xffc27a }));
  glow.position.set(0, 0.5, 1.5);
  g.add(glow);
  const light = new GlowLight(0xffb870, 5, 8);
  light.position.set(0, 0.9, 2.2);
  g.add(light);
  // 門口兩側的燈串
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  for (let i = 0; i < 12; i++) {
    const a = 0.55 + (i / 11) * (Math.PI * 2 - 1.1);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), bulbMat);
    b.position.set(Math.sin(a) * 1.95, 1.08 + Math.sin(i * 1.3) * 0.04, Math.cos(a) * 1.95);
    g.add(b);
  }
  shadowAll(g);
  light.castShadow = false;
  return { group: g, colliderR: 1.9 };
}

/**
 * 營火旁的「各區人數」小木牌（人高，不會擋到天空）：兩排三格，寫各區現在幾個人
 * 以前是飄在營火上方 3.7 公尺的大看板，抬頭看星星會擋住
 */
function buildAreaSign() {
  const g = new THREE.Group();
  const wood = lowpoly(0x6d4a2e);
  for (const sx of [-0.78, 0.78]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.9, 6), wood);
    post.position.set(sx, 0.95, 0);
    g.add(post);
  }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.98, 0.07), lowpoly(0x8a6240));
  plank.position.set(0, 1.42, 0);
  g.add(plank);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.07, 0.26), wood);
  roof.position.set(0, 1.97, 0.02);
  roof.rotation.x = 0.1;
  g.add(roof);
  const c = document.createElement('canvas');
  c.width = 560;
  c.height = 310;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  face.position.set(0, 1.42, 0.04);
  g.add(face);
  const AREAS = [
    ['lake_dock', '🎣', t('湖畔')],
    ['campground', '🏕️', t('營地')],
    ['mist_forest', '🍄', t('迷霧')],
    ['treehouse_music', '🎵', t('樹屋')],
    ['tent_focus', '📚', t('專注')],
  ];
  const font = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  function draw(a = {}) {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(30, 20, 12, 0.55)';
    ctx.beginPath();
    ctx.roundRect(6, 6, c.width - 12, c.height - 12, 22);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 30px ${font}`;
    ctx.fillStyle = '#ffd28a';
    ctx.fillText(t('👣 現在各區人數'), c.width / 2, 42);
    AREAS.forEach(([id, icon, name], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 30 + ((c.width - 60) / 3) * (col + 0.5);
      const y = 112 + row * 108;
      const n = a[id] ?? 0;
      ctx.font = `700 38px ${font}`;
      ctx.fillStyle = n ? '#fff1d6' : 'rgba(255, 233, 200, 0.5)';
      ctx.fillText(`${icon} ${n}`, x, y);
      ctx.font = `500 24px ${font}`;
      ctx.fillStyle = n ? '#ffd28a' : 'rgba(255, 233, 200, 0.45)';
      ctx.fillText(name, x, y + 40);
    });
    tex.needsUpdate = true;
  }
  draw();
  shadowAll(g);
  face.castShadow = false;
  return { group: g, draw, plank };
}

/** 帳篷營地的入口：木頭拱門＋兩頂迷你帳篷 */
function buildCampGate() {
  const g = new THREE.Group();
  const wood = lowpoly(0x6d4a2e);
  for (const sx of [-1.3, 1.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6), wood);
    post.position.set(sx, 1.3, 0);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.22), wood);
  beam.position.set(0, 2.55, 0);
  g.add(beam);
  // 拱門上的小彩旗
  const flagColors = [0xd2453c, 0xf2c14e, 0x7d9a68, 0x6f86a8, 0xf3c9d2];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 3), lowpoly(flagColors[i % flagColors.length]));
    f.rotation.x = Math.PI;
    f.position.set(-1.05 + i * 0.35, 2.3, 0.08);
    g.add(f);
  }
  for (const [x, z, c] of [[-2.1, -1.4, 0xe6d2ac], [2.2, -1.6, 0xd2453c]]) {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 6), lowpoly(c));
    tent.position.set(x, 0.55, z);
    g.add(tent);
  }
  const light = new GlowLight(0xffc073, 3, 7);
  light.position.set(0, 2.2, 0.6);
  g.add(light);
  return { group: g, colliderR: 0.6 };
}

/** 迷霧森林的入口：兩棵彎彎的老樹搭成拱門，地上幾朵發光小蘑菇，霧氣從裡面飄出來 */
function buildMistGate() {
  const g = new THREE.Group();
  const bark = lowpoly(0x3d2c22);
  for (const s of [-1, 1]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 3.0, 7), bark);
    trunk.position.set(s * 1.25, 1.45, 0);
    trunk.rotation.z = s * 0.18;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), lowpoly(0x1f3a2c));
    crown.position.set(s * 0.75, 3.0, 0);
    crown.scale.set(1.2, 0.8, 1);
    g.add(crown);
  }
  const glow = new THREE.MeshBasicMaterial({ color: 0x9ff0e0 });
  const stem = lowpoly(0xe8e0cc);
  for (const [x, z, sc] of [[-1.7, 0.4, 1], [-1.45, 0.7, 0.7], [1.6, 0.5, 0.9], [1.9, 0.1, 0.6], [-0.9, -0.6, 0.8]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * sc, 0.05 * sc, 0.2 * sc, 6), stem);
    st.position.set(x, 0.1 * sc, z);
    g.add(st);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13 * sc, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glow);
    cap.position.set(x, 0.19 * sc, z);
    cap.scale.y = 0.7;
    g.add(cap);
  }
  // 霧：幾片半透明的圓
  const fogMat = new THREE.MeshBasicMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.12, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(1.4 - i * 0.2, 16), fogMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set((i - 1.5) * 0.4, 0.15 + i * 0.12, -0.4 - i * 0.3);
    g.add(f);
  }
  return { group: g, colliderR: 0.6 };
}

const BUILDERS = { tent_focus: buildTent, treehouse_music: buildTreehouse, lake_dock: buildLakePath, tent_social: buildBellTent, campground: buildCampGate, mist_forest: buildMistGate };

// ---------- 森林房間 ----------

export function createForestRoom() {
  const group = new THREE.Group();
  group.name = 'forest_main';

  const defs = ENTRANCES.map((e) => {
    const g = ENTRANCE_GEO[e.to] ?? { trigger: TRIGGER_R, build: BUILD_R };
    return { ...e, tr: g.trigger, trigger: polar(e.angle, g.trigger), build: polar(e.angle, g.build) };
  });
  const shrinePos = polar(SHRINE_ANGLE, SHRINE_R);
  const world = createWorld(group, {
    clearings: [...defs.map((d) => ({ x: d.build.x, z: d.build.z, r: 3.2 })), { x: shrinePos.x, z: shrinePos.z, r: 4.2 }, CAIRN_GARDEN_CLEARING, WISH_TREE_CLEARING, SHOP_CLEARING, ...POND_CLEARINGS, ...EXTRA_CLEARINGS],
  });

  const campfire = new Campfire();
  group.add(campfire.group);
  world.colliders.push({ x: 0, z: 0, r: campfire.radius });
  // 🪵 營火旁的圓木座位（按 E 坐下，坐著按 F 烤棉花糖）
  const fireSeats = buildFireSeats(world);
  group.add(fireSeats.group);
  let lastActions = null; // 坐著的時候，位置固定在座位上（resolveCollision 用）
  const seatedOn = () => {
    const a = lastActions;
    return a?.seat && ['sofa', 'roast', 'eat', 'addWood', 'blanket'].includes(a.state) ? a.seat : null;
  };

  const occluders = [...world.occluders];
  const entrances = [];
  const returnSpawn = {};
  const signs = [];

  for (const d of defs) {
    const built = BUILDERS[d.to]();
    built.group.position.set(d.build.x, 0, d.build.z);
    built.group.rotation.y = d.angle + Math.PI; // 入口朝向營火
    group.add(built.group);
    built.group.traverse((o) => o.isMesh && occluders.push(o)); // 相機遮擋只看實體網格
    world.colliders.push({ x: d.build.x, z: d.build.z, r: built.colliderR });

    const sign = makeSign(d.label);
    sign.position.set(d.trigger.x, d.to === 'treehouse_music' ? 2.6 : 2.4, d.trigger.z);
    group.add(sign);
    signs.push(sign);

    entrances.push({ to: d.to, x: d.trigger.x, z: d.trigger.z, r: 0.9, label: d.label });
    // 從子房間回來時，站在入口前面一點、面向營火
    const back = polar(d.angle, d.tr - 2.2);
    returnSpawn[d.to] = { x: back.x, z: back.z, ry: d.angle + Math.PI };
  }

  // ---------- 營火告示牌 ----------
  const noticeBoard = buildNoticeBoard();
  const boardPos = polar(BOARD_ANGLE, BOARD_R);
  noticeBoard.group.position.set(boardPos.x, 0, boardPos.z);
  noticeBoard.group.rotation.y = BOARD_ANGLE + Math.PI; // 正面朝向營火
  group.add(noticeBoard.group);
  world.colliders.push({ x: boardPos.x, z: boardPos.z, r: 0.75 });
  const boardFront = polar(BOARD_ANGLE, BOARD_R - 0.9);
  const nearBoard = (actions) => Math.hypot(actions.player.position.x - boardFront.x, actions.player.position.z - boardFront.z) < 2.0;
  const boardSign = makeSign(t('📌 營火告示牌'), { height: 0.22 });
  boardSign.position.set(boardPos.x, 2.0, boardPos.z);
  group.add(boardSign);

  // ---------- 地藏祈福處 ----------
  const shrine = buildShrine();
  shrine.group.position.set(shrinePos.x, 0, shrinePos.z);
  shrine.group.rotation.y = SHRINE_ANGLE + Math.PI; // 鳥居朝向營火
  group.add(shrine.group);
  group.updateMatrixWorld(true);
  for (const c of shrine.colliders) {
    const v = new THREE.Vector3(c.x, 0, c.z).applyMatrix4(shrine.group.matrixWorld);
    world.colliders.push({ x: v.x, z: v.z, r: c.r });
  }
  shrine.group.traverse((o) => o.isMesh && o.geometry.type !== 'ExtrudeGeometry' && occluders.push(o));
  const shrineFront = shrine.front.clone().applyMatrix4(shrine.group.matrixWorld);
  const nearShrine = (actions) =>
    Math.hypot(actions.player.position.x - shrineFront.x, actions.player.position.z - shrineFront.z) < 2.2;

  // ---------- 營地小舖（用松果買帳篷、家具） ----------
  const shop = buildShop(world);
  group.add(shop.group);
  group.add(shop.sign);
  // 從自己的帳篷出來時，站在小舖前面
  returnSpawn.home = { x: SHOP_FRONT.x * 0.92, z: SHOP_FRONT.z * 0.92, ry: Math.atan2(-SHOP_FRONT.x, -SHOP_FRONT.z) + Math.PI };

  // ---------- 心願大樹（大家用松果換裝飾掛上去） ----------
  const wishTree = buildWishTree(world);
  group.add(wishTree.group);
  // 🎄 聖誕造景（12/1～1/6 自動出現；網址 ?xmas=1 可以先看）
  const xmas = buildXmasDecor();
  group.add(xmas.group);
  const xmasCheck = () => {
    const on = isXmas();
    xmas.group.visible = on;
    if (wishTree.xmas !== on) wishTree.setXmas(on);
  };
  xmasCheck();
  setInterval(xmasCheck, 10 * 60 * 1000); // 跨日（12/1、1/7）不用重新整理也會換

  // ---------- 石塔祈願（祈福處步道旁） ----------
  const cairnGarden = buildCairnGarden(world);
  group.add(cairnGarden.group);
  // （營火旁的人數小木牌 11/06 拿掉了：營火周邊太擠。各區人數看「🧭 去哪裡」選單）

  // ---------- 營火河畔：在營火旁就能釣魚 ----------
  const pond = buildPond(world, group);
  group.add(pond.group);

  // ---------- 🏛️ 營地標本櫃、🍲 營火料理鍋、✨ 營火寶藏 ----------
  const extras = buildCampExtras(group, world);
  extras.occluders.forEach((g) => g.traverse((o) => o.isMesh && occluders.push(o)));
  const treasures = createTreasures(group);
  const trash = createTrashLayer(group);

  // ---------- 整點小活動的道具（燈籠賽跑、金松果） ----------
  const mini = buildMiniLayer();
  group.add(mini.group);

  /** 頭上是不是頂著一顆石頭 */
  let carrying = false;
  const setCarry = (character, v) => {
    carrying = v;
    character?.setProp('stone', v);
  };

  return {
    id: 'forest_main',
    label: t('🔥 中央大營火'),
    group,
    fog: group.fog,
    background: group.background,
    outdoor: true,
    world,
    campfire,
    occluders,
    entrances,
    returnSpawn,
    cameraDistance: 7,
    audio: { fire: 1, wind: 1, ambient: 1, water: 0, music: 0.55, song: 0 },
    resolveCollision(pos, r) {
      const s = seatedOn();
      if (s) {
        // 坐在圓木上：固定在座位，身體底部剛好在木頭上面（作者 11/14：原本會陷進木頭裡，烤棉花糖時更低）
        pos.set(s.x, s.h + SEAT_LIFT, s.z);
        return;
      }
      world.resolveCollision(pos, r);
      pos.y = 0;
    },
    /** 這個座位有沒有別人坐（main.js 用其他玩家的位置判斷） */
    seatTaken: null,
    shrine,
    shrineFront,
    noticeBoard,
    boardFront,
    cairnGarden,
    wishTree,
    mini,
    pond,
    fishSpot: null, // 坐下釣魚時記錄（ActionStateMachine 用來固定位置與面向）
    fishing: null, // 由 main.js 放入 FishingGame（和湖畔共用）
    setAreas: () => {}, // 人數小木牌拿掉了（各區人數在「🧭 去哪裡」選單）
    drawMuseum: extras.drawMuseum,
    nearPot: extras.nearPot,
    treasures,
    trash,
    /** 手機的 F 按鈕：在水邊變成「釣魚」、釣魚中變成「拉竿」 */
    roastHint(actions) {
      if (actions.state === 'fish') return this.fishing?.phase === 'show' ? ['🎣', t('繼續')] : ['🎣', t('拉竿')];
      return actions.state === 'free' && pond.spotAt(actions.player.position) ? ['🎣', t('釣魚')] : null;
    },
    get carrying() {
      return carrying;
    },
    /** 離開森林、換角色時：頭上的石頭放下 */
    dropStone(character) {
      setCarry(character, false);
    },

    onAction(name, actions) {
      lastActions = actions;
      // 🪵 坐在圓木上：E＝坐著添柴火、F＝直接在座位上烤棉花糖、Z＝坐著裹毯子；移動＝起身
      if (seatedOn()) {
        if (name === 'interact') {
          if (actions.state === 'sofa' || actions.state === 'blanket') actions.start('addWood');
          return true;
        }
        if (name === 'roast' && actions.state === 'sofa') {
          actions.start('roast');
          return true;
        }
      }
      // 營火河畔釣魚：F＝拉竿、E＝收竿；在水邊按 F 坐下
      if (actions.state === 'fish') {
        if (name === 'roast') {
          this.fishing?.press();
          return true;
        }
        if (name === 'interact') {
          actions.stop();
          return true;
        }
      }
      if (name === 'roast' && actions.state === 'free' && !carrying) {
        const spot = pond.spotAt(actions.player.position);
        if (spot) {
          this.fishSpot = { x: spot.x, z: spot.z, face: spot.face };
          actions.start('fish');
          this.fishing?.start(actions, spot);
          return true;
        }
      }
      // 頂著石頭時去做別的事（烤棉花糖、裹毯⋯），石頭先放下
      if (carrying && name !== 'interact') setCarry(actions.character, false);
      // 正在打招呼、合十時按 E：先結束動作再互動
      if (name === 'interact' && EMOTE_IDS.has(actions.state)) actions.stop();
      if (name === 'interact' && actions.state === 'free' && !carrying) {
        const pos = actions.player.position;
        const tr = treasures.near(pos);
        if (tr) {
          actions.onTreasure?.(tr);
          return true;
        }
        const tb = trash.near(pos);
        if (tb) {
          actions.onTrash?.(tb);
          return true;
        }
        if (extras.nearBin(pos)) {
          actions.onRecycle?.();
          return true;
        }
        if (extras.nearMuseum(pos)) {
          actions.onMuseum?.();
          return true;
        }
        if (extras.nearPot(pos)) {
          actions.onCook?.();
          return true;
        }
      }
      // 走到空的圓木旁按 E：坐下（比添柴火優先；離座位遠一點按 E 才是添柴）
      if (name === 'interact' && actions.state === 'free' && !carrying) {
        const s = fireSeats.near(actions.player.position, 0.75);
        if (s) {
          if (this.seatTaken?.(s)) actions.hud.toast(t('這個位置有人坐了，找旁邊的圓木吧 🪵'));
          else actions.sit(s);
          return true;
        }
      }
      if (name === 'interact' && actions.state === 'free' && !carrying && nearShop(actions.player.position)) {
        actions.onShop?.();
        return true;
      }
      if (name === 'interact' && actions.state === 'free' && !carrying && wishTree.near(actions.player.position)) {
        actions.onTree?.();
        return true;
      }
      if (name === 'interact' && actions.state === 'free') {
        const pos = actions.player.position;
        const ci = cairnGarden.nearCairn(pos);
        if (carrying && ci >= 0) {
          setCarry(actions.character, false);
          actions.onStack?.(ci);
          return true;
        }
        if (cairnGarden.nearPile(pos)) {
          setCarry(actions.character, !carrying);
          actions.onPickStone?.(carrying);
          return true;
        }
        if (carrying) {
          setCarry(actions.character, false);
          actions.hud.toast(t('把石頭輕輕放下了'));
          return true;
        }
        if (ci >= 0) {
          actions.onCairn?.(ci);
          return true;
        }
      }
      if (name === 'interact' && actions.state === 'free' && nearShrine(actions)) {
        actions.onShrine?.();
        return true;
      }
      // 告示牌比營火優先（站在告示牌前按 E 是看留言，不是添柴）
      if (name === 'interact' && actions.state === 'free' && nearBoard(actions)) {
        actions.onNoticeBoard?.();
        return true;
      }
      return false;
    },

    /** 手機的互動按鈕要顯示什麼（null ＝預設的「添柴」） */
    interactHint(actions) {
      lastActions = actions;
      const p0 = actions.player.position;
      if (seatedOn()) return ['🪵', t('添柴')];
      if (!carrying && fireSeats.near(p0, 0.75)) return ['🪵', t('坐下')];
      if (!carrying && treasures.near(p0)) return ['✨', t('撿寶藏')];
      if (!carrying && trash.near(p0)) return ['♻️', t('撿起來')];
      if (extras.nearBin(p0)) return ['♻️', t('回收')];
      if (extras.nearMuseum(p0)) return ['🏛️', t('標本櫃')];
      if (extras.nearPot(p0)) return ['🍲', t('料理')];
      if (nearShrine(actions)) return ['⛩️', t('祈福')];
      if (nearBoard(actions)) return ['📌', t('告示牌')];
      const pos = actions.player.position;
      const ci = cairnGarden.nearCairn(pos);
      if (carrying) {
        if (ci >= 0) return ['🗿', t('疊上去')];
        if (cairnGarden.nearPile(pos)) return ['🪨', t('放回去')];
        return ['🪨', t('放下')];
      }
      if (cairnGarden.nearPile(pos)) return ['🪨', t('撿石頭')];
      if (ci >= 0) return ['🗿', t('石塔')];
      if (wishTree.near(pos)) return ['🌳', t('大樹')];
      if (nearShop(pos)) return ['🏪', t('小舖')];
      return null;
    },

    prompt(actions) {
      const p0 = actions.player.position;
      if (!carrying && treasures.near(p0)) return t('<kbd>E</kbd> ✨ 撿起閃閃發光的東西');
      if (!carrying && trash.near(p0)) return t('<kbd>E</kbd> ♻️ 撿起垃圾');
      if (extras.nearBin(p0)) return t('<kbd>E</kbd> ♻️ 把垃圾丟進回收桶');
      if (extras.nearMuseum(p0)) return t('<kbd>E</kbd> 🏛️ 營地標本櫃・捐出採集到的東西');
      if (extras.nearPot(p0)) return t('<kbd>E</kbd> 🍲 營火料理');
      if (!carrying && fireSeats.near(p0, 0.75)) return t('<kbd>E</kbd> 坐下　<kbd>F</kbd> 烤棉花糖');
      if (nearShrine(actions)) return t('<kbd>E</kbd> 參拜・擲筊・抽籤・寫繪馬');
      if (nearBoard(actions)) return t('<kbd>E</kbd> 看告示牌・留言　<kbd>F</kbd> 烤棉花糖');
      const pos = actions.player.position;
      const ci = cairnGarden.nearCairn(pos);
      if (carrying) {
        if (ci >= 0) return t('<kbd>E</kbd> 把石頭疊上去・許個願');
        if (cairnGarden.nearPile(pos)) return t('<kbd>E</kbd> 把石頭放回去');
        return actions.compact ? t('🪨 走到石塔旁按 <kbd>E</kbd>') : t('🪨 頭上頂著石頭，走到石塔旁按 <kbd>E</kbd> 疊上去');
      }
      if (pond.spotAt(pos)) return actions.compact ? t('<kbd>F</kbd> 坐下釣魚') : t('<kbd>F</kbd> 坐下釣魚・盯著發光的浮標');
      if (cairnGarden.nearPile(pos)) return t('<kbd>E</kbd> 撿一顆石頭');
      if (ci >= 0) return t('<kbd>E</kbd> 看石塔紀錄（{n} 顆）', { n: cairnGarden.cairns[ci].stones.length });
      if (wishTree.near(pos)) return t('<kbd>E</kbd> 心願大樹・掛一個裝飾');
      if (nearShop(pos)) return t('<kbd>E</kbd> 營地小舖・買帳篷和家具');
      return actions.nearFire ? t('<kbd>E</kbd> 添柴火　<kbd>F</kbd> 烤棉花糖') : null;
    },

    update(dt, t, camera, actions) {
      if (actions) lastActions = actions;
      extras.update(dt, t);
      treasures.update(dt, t, actions?.player?.position);
      shrine.update(dt, t);
      cairnGarden.update(dt, t);
      wishTree.update(dt, t);
      if (xmas.group.visible) xmas.update(dt, t, camera?.position);
      mini.update(dt, t);
      pond.update(dt, t);
      // 營火河畔的釣魚：離開釣魚狀態（移動、換房間）就收竿
      if (this.fishing?.group === pond.group) {
        if (actions?.state !== 'fish' && this.fishing.active) this.fishing.stop();
        this.fishing.update(dt, t);
      }
      // world / campfire 由 RoomManager 另外更新（星空與火勢要持續運作）
      // 招牌離鏡頭太近時淡出，避免擋住畫面
      for (const sgn of signs) {
        const d = camera.position.distanceTo(sgn.position);
        sgn.material.opacity = Math.min(1, Math.max(0, (d - 3) / 4));
      }
    },
  };
}
