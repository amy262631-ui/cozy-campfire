import * as THREE from 'three';

/**
 * 🏕️ 中間價位的小屋（作者 11/12：100～300 之間多幾種）
 *   🐌 蝸牛殼屋 120、🌸 花園溫室 200、🏮 和風小屋 250、🎃 南瓜屋 180（萬聖節才上架）
 * 都只有一層。顏色是固定的（不跟帳篷花色），門口一律朝 +z。
 * 屋裡：鏡頭那一側的牆要看得穿 → 圓頂用 BackSide、平面牆只做朝內的那一面。
 */
const mm = {};
const mat = (k, color, extra = {}) => (mm[k] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
const glow = (k, color) => (mm[k] ??= new THREE.MeshBasicMaterial({ color }));

export function buildMidShape(sh, add, outside) {
  if (sh.id === 'snail') return buildSnail(sh, add, outside), true;
  if (sh.id === 'greenhouse') return buildGreenhouse(sh, add, outside), true;
  if (sh.id === 'wafu') return buildWafu(sh, add, outside), true;
  if (sh.id === 'pumpkin') return buildPumpkin(sh, add, outside), true;
  return false;
}

/** 圓頂＋拱門（雪屋、蝸牛、南瓜共用） */
function domeWithDoor(R, H, add, outside, shellMat, doorMat, frameMat) {
  const dome = add(new THREE.SphereGeometry(R, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
  dome.scale.y = H;
  const dz = R - 0.05;
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0);
  s.lineTo(0.75, 0);
  s.lineTo(0.75, 1.15);
  s.absarc(0, 1.15, 0.75, 0, Math.PI, false);
  s.closePath();
  const door = add(new THREE.ShapeGeometry(s), doorMat, 0, 0, dz + (outside ? 0.08 : -0.06));
  if (!outside) door.rotation.y = Math.PI;
  if (outside && frameMat) {
    const arch = add(new THREE.TorusGeometry(0.75, 0.09, 8, 24, Math.PI), frameMat, 0, 1.15, dz + 0.1);
    void arch;
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.18, 1.15, 0.18), frameMat, sx * 0.75, 0.575, dz + 0.1);
  }
  return dz;
}
/** 圓頂表面上的一點（a：水平角度、y：高度），回傳位置和朝外的法線 */
function onDome(R, H, a, y, out = 0) {
  const k = Math.min(0.98, y / (R * H));
  const rr = R * Math.sqrt(1 - k * k);
  const p = new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr);
  const n = new THREE.Vector3(p.x / (R * R), p.y / (R * H * R * H), p.z / (R * R)).normalize();
  return { p: p.addScaledVector(n, out), n };
}

// ───────────── 🐌 蝸牛殼屋 ─────────────
// 作者 11/12 參考圖：直立的圓圓珊瑚色大殼（正面一圈螺旋）＋粉灰色的身體、閉眼微笑的頭、兩根觸角
function buildSnail(sh, add, outside) {
  const R = sh.R;
  const coral = 0xf08062;
  if (!outside) {
    // 屋裡：珊瑚色的圓頂，天花板一圈螺旋紋
    const H = 0.95;
    const shell = mat('snailIn', 0xf6b39e, { side: THREE.BackSide });
    domeWithDoor(R, H, add, false, shell, mat('snailDoor', 0xe6d8d3), null);
    const sp = mat('snailSpIn', 0xc9654a, { side: THREE.DoubleSide });
    const pts = [];
    for (let t = 0; t <= 1; t += 0.01) {
      const a = t * Math.PI * 6;
      const r = 0.3 + t * (R - 0.8);
      const y = R * H * Math.sqrt(Math.max(0, 1 - (r / R) ** 2)) - 0.08;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.05, 5, false), sp);
    return;
  }
  const body = mat('snailBody', 0xe6d8d3);
  const bodyDark = mat('snailBodyDark', 0xc9b2a8);
  // 身體（腳）：左右方向一長條，左邊是頭、右邊尾巴尖尖
  const foot = add(new THREE.CapsuleGeometry(0.7, 6.2, 6, 16), body, 0.1, 0.55, 0.1);
  foot.rotation.z = Math.PI / 2;
  foot.scale.set(1, 1, 2.0);
  const tail = add(new THREE.ConeGeometry(0.65, 1.3, 16), body, 3.9, 0.35, 0.1);
  tail.rotation.z = -Math.PI / 2 - 0.15;
  tail.scale.z = 2.0;
  for (const [x, z] of [[2.6, 1.42], [3.2, 1.3], [-1.9, 1.42]]) {
    const d = add(new THREE.CapsuleGeometry(0.035, 0.16, 4, 6), bodyDark, x, 0.75, z);
    d.rotation.z = 0.5;
  }
  // 脖子＋頭（左邊往上），臉朝前面
  const neck = add(new THREE.CapsuleGeometry(0.62, 1.3, 6, 14), body, -3.25, 1.35, 0.25);
  neck.rotation.z = 0.25;
  const hx = -3.5;
  const hy = 2.45;
  const hz = 0.35;
  add(new THREE.SphereGeometry(0.9, 20, 16), body, hx, hy, hz);
  // 閉著眼睛笑：兩條彎彎的線、小嘴巴、腮紅
  const ink = mat('snailInk', 0x5a3a32);
  for (const sx of [-1, 1]) {
    const e = add(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), ink, hx + sx * 0.3, hy + 0.12, hz + 0.84);
    e.rotation.z = Math.PI;
    const bl = add(new THREE.CircleGeometry(0.13, 14), mat('snailBlush', 0xf2a3a8), hx + sx * 0.5, hy - 0.08, hz + 0.76);
    bl.rotation.y = sx * 0.55;
  }
  const mouth = add(new THREE.TorusGeometry(0.08, 0.022, 6, 10, Math.PI), ink, hx, hy - 0.12, hz + 0.88);
  mouth.rotation.z = Math.PI;
  // 兩根觸角，頂端是會發光的小圓燈
  const lamp = glow('snailLamp', 0xfff1d0);
  for (const sx of [-1, 1]) {
    const base = new THREE.Vector3(hx + sx * 0.35, hy + 0.7, hz);
    const tip = base.clone().add(new THREE.Vector3(sx * 0.35, 1.0, 0.05));
    const st = add(new THREE.CylinderGeometry(0.06, 0.09, base.distanceTo(tip), 8), body, (base.x + tip.x) / 2, (base.y + tip.y) / 2, (base.z + tip.z) / 2);
    st.rotation.z = -sx * Math.atan2(0.35, 1.0);
    add(new THREE.SphereGeometry(0.17, 14, 10), lamp, tip.x, tip.y + 0.05, tip.z);
  }
  // 🐚 直立的大殼（珊瑚色），正面、背面各一圈螺旋
  const SR = 2.9;
  const SC = 2.55; // 殼的中心高度
  const SZ = 0.7; // 前後壓扁
  const shell = add(new THREE.SphereGeometry(SR, 40, 28), mat('snailShell', coral), 0.4, SC, 0);
  shell.scale.z = SZ;
  const line = mat('snailLine', 0xb5523b);
  const surfZ = (x, y) => SZ * Math.sqrt(Math.max(0, SR * SR - (x - 0.4) ** 2 - (y - SC) ** 2));
  for (const sz of [1, -1]) {
    let seg = [];
    const flush = () => {
      if (seg.length > 3) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seg), seg.length * 2, 0.085, 6, false), line);
      seg = [];
    };
    for (let t = 0; t <= 1; t += 0.004) {
      const a = t * Math.PI * 5.2;
      const r = 0.25 + t * 2.3;
      const x = 0.4 + Math.cos(a) * r;
      const y = SC + 0.2 + Math.sin(a) * r;
      // 正面門的位置不畫
      if (sz > 0 && Math.abs(x) < 1.05 && y < 2.25) {
        flush();
        continue;
      }
      seg.push(new THREE.Vector3(x, y, sz * (surfZ(x, y) + 0.04)));
    }
    flush();
  }
  // 門：殼的正面下方，圓拱門＋門框、小台階
  const DZ = surfZ(0, 1.9) + 0.06;
  const ds = new THREE.Shape();
  ds.moveTo(-0.7, 0);
  ds.lineTo(0.7, 0);
  ds.lineTo(0.7, 1.25);
  ds.absarc(0, 1.25, 0.7, 0, Math.PI, false);
  ds.closePath();
  add(new THREE.ShapeGeometry(ds), mat('snailDoor', 0xe6d8d3), 0, 0.05, DZ);
  const fr = mat('snailFrame', 0xb5523b);
  add(new THREE.TorusGeometry(0.7, 0.08, 8, 24, Math.PI), fr, 0, 1.3, DZ + 0.02);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.16, 1.25, 0.16), fr, sx * 0.7, 0.67, DZ + 0.02);
  add(new THREE.SphereGeometry(0.06, 8, 6), mat('snailKnob', 0xe8b04a), 0.42, 0.95, DZ + 0.06);
  // 門下面墊一塊木平台，接到地上（殼下半部是往內收的）
  add(new THREE.BoxGeometry(1.8, 0.14, DZ + 0.6), mat('snailStep', 0xb88a5a), 0, 0.07, (DZ + 0.6) / 2 - 0.1);
}

// ───────────── 🌸 花園溫室 ─────────────
function buildGreenhouse(sh, add, outside) {
  const { W, D } = sh;
  const WALL = 2.3;
  const RH = 1.4; // 屋頂再高多少
  const glass = (mm.ghGlass ??= new THREE.MeshStandardMaterial({ color: 0xcdeedd, roughness: 0.05, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  const frame = mat('ghFrame', 0xfbfaf4);
  const quad = (a, b, c, d, m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    geo.computeVertexNormals();
    return add(geo, m);
  };
  // 作者 11/12：不要跟月票的玻璃星空圓頂屋一樣 → 英式小溫室：下半截紅磚矮牆、上面白框玻璃、尖尖的屋頂＋屋脊上一排白色雕花
  const BASE = 0.8;
  const brick = mat(`ghBrick${outside}`, 0xc7654a);
  const brickLine = mat('ghBrickLine', 0xe7c9b0);
  const bwall = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (outside) {
      const b = add(new THREE.BoxGeometry(len, BASE, 0.16), brick, cx, BASE / 2, cz);
      b.rotation.y = ry;
      for (const y of [0.27, 0.54]) {
        const l = add(new THREE.BoxGeometry(len + 0.01, 0.025, 0.17), brickLine, cx, y, cz);
        l.rotation.y = ry;
      }
      const cap = add(new THREE.BoxGeometry(len + 0.06, 0.06, 0.24), mat('ghCap', 0xfbfaf4), cx, BASE + 0.03, cz);
      cap.rotation.y = ry;
    } else {
      // 屋裡只做朝內的一面
      const pl = add(new THREE.PlaneGeometry(len, BASE), brick, cx, BASE / 2, cz);
      pl.rotation.y = ry + Math.PI;
    }
  };
  bwall(W, D, W, -D);
  bwall(W, -D, -W, -D);
  bwall(-W, -D, -W, D);
  if (outside) {
    bwall(-W, D, -0.8, D);
    bwall(0.8, D, W, D);
  }
  // 玻璃牆、玻璃屋頂（淡綠透明）
  quad([W, 0, D], [W, 0, -D], [W, WALL, -D], [W, WALL, D], glass);
  quad([-W, 0, -D], [-W, 0, D], [-W, WALL, D], [-W, WALL, -D], glass);
  quad([-W, 0, -D], [W, 0, -D], [W, WALL, -D], [-W, WALL, -D], glass);
  quad([W, WALL, D], [W, WALL, -D], [0, WALL + RH, -D], [0, WALL + RH, D], glass);
  quad([-W, WALL, -D], [-W, WALL, D], [0, WALL + RH, D], [0, WALL + RH, -D], glass);
  for (const z of [D, -D]) {
    const g = new THREE.Shape();
    g.moveTo(-W, WALL);
    g.lineTo(W, WALL);
    g.lineTo(0, WALL + RH);
    g.closePath();
    add(new THREE.ShapeGeometry(g), glass, 0, 0, z);
  }
  if (outside) {
    quad([-W, 0, D], [-0.8, 0, D], [-0.8, WALL, D], [-W, WALL, D], glass);
    quad([0.8, 0, D], [W, 0, D], [W, WALL, D], [0.8, WALL, D], glass);
  }
  // 白色窗框：直的柱子＋橫的兩道＋屋頂斜梁
  const bar = (w, h, d, x, y, z) => add(new THREE.BoxGeometry(w, h, d), frame, x, y, z);
  const T = 0.07;
  for (let x = -W; x <= W + 1e-6; x += W / 2) {
    bar(T, WALL, T, x, WALL / 2, -D);
    if (outside && Math.abs(x) > 0.85) bar(T, WALL, T, x, WALL / 2, D); // 屋裡不放前面的框（擋鏡頭）
  }
  for (let z = -D; z <= D + 1e-6; z += D / 2) for (const sx of [-1, 1]) bar(T, WALL, T, sx * W, WALL / 2, z);
  for (const y of [0.9, WALL]) {
    for (const sx of [-1, 1]) bar(T, T, D * 2, sx * W, y, 0);
    bar(W * 2, T, T, 0, y, -D);
    if (outside) for (const sx of [-1, 1]) bar(W - 0.8, T, T, sx * (W + 0.8) / 2, y, D);
  }
  if (outside) bar(1.6, T, T, 0, 2.1, D); // 門楣
  bar(T, T, D * 2, 0, WALL + RH, 0);
  if (outside) {
    // 屋脊上一排白色小雕花（小圓球＋尖尖），兩端各一根尖頂
    for (let z = -D; z <= D + 1e-6; z += 0.45) add(new THREE.SphereGeometry(0.07, 8, 6), frame, 0, WALL + RH + 0.1, z);
    for (const z of [-D, D]) {
      add(new THREE.ConeGeometry(0.08, 0.5, 8), frame, 0, WALL + RH + 0.3, z);
      add(new THREE.SphereGeometry(0.09, 8, 6), frame, 0, WALL + RH + 0.08, z);
    }
  }
  const slope = Math.atan2(RH, W);
  const len = Math.hypot(W, RH);
  for (let z = -D; z <= (outside ? D + 1e-6 : D / 2 + 1e-6); z += D / 2)
    for (const sx of [-1, 1]) {
      const r = bar(len, T, T, (sx * W) / 2, WALL + RH / 2, z);
      r.rotation.z = -sx * slope;
    }
  // 🌿 爬藤：沿著屋簷和屋脊垂下來的小葉子（屋裡、外面都看得到）
  const leaf = mat('ghLeaf', 0x6fb06a, { side: THREE.DoubleSide });
  const flower = [mat('ghF1', 0xf6a5c0), mat('ghF2', 0xfff1a8), mat('ghF3', 0xc8b6ff)];
  let n = 0;
  for (const sx of [-1, 1])
    for (let z = -D + 0.2; z < D; z += 0.32) {
      const y = WALL - 0.05 - (n % 3) * 0.12;
      const l = add(new THREE.CircleGeometry(0.1, 5), leaf, sx * (W - 0.06), y, z);
      l.rotation.y = sx * Math.PI / 2;
      if (n % 4 === 0) add(new THREE.SphereGeometry(0.06, 8, 6), flower[n % 3], sx * (W - 0.1), y - 0.08, z);
      n++;
    }
  if (!outside) {
    // 🌸 屋裡：後牆一排花架（兩層木板＋小花盆），貼牆不擋路
    const wood = mat('ghWood', 0xb88a5a);
    for (const y of [0.55, 1.15]) add(new THREE.BoxGeometry(W * 1.6, 0.06, 0.4), wood, 0, y, -D + 0.25);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.06, 1.2, 0.4), wood, sx * W * 0.8, 0.6, -D + 0.25);
    for (const y of [0.58, 1.18])
      for (let i = 0; i < 7; i++) {
        const x = -W * 0.7 + (i * W * 1.4) / 6;
        add(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 8), mat('ghPot', 0xd9774f), x, y + 0.08, -D + 0.25);
        add(new THREE.SphereGeometry(0.11, 8, 6), (i + (y > 1 ? 1 : 0)) % 2 ? leaf : flower[i % 3], x, y + 0.24, -D + 0.25);
      }
    return;
  }
  // 外面：門口兩盆花、地上一圈小花
  for (const sx of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.24, 0.18, 0.4, 10), mat('ghPot', 0xd9774f), sx * 1.25, 0.2, D + 0.45);
    for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.1, 8, 6), flower[i % 3], sx * 1.25 + Math.cos(i * 1.3) * 0.14, 0.48 + (i % 2) * 0.06, D + 0.45 + Math.sin(i * 1.3) * 0.14);
  }
}

// ───────────── 🏮 和風小屋 ─────────────
// 作者 11/12 參考圖：深色舊木板牆、木條格子窗透出暖黃的燈光、前面一道小屋簷、波浪瓦屋頂、架高的木頭平台
function buildWafu(sh, add, outside) {
  const { W, D } = sh;
  const WALL = 2.5;
  const DOOR = 0.9;
  const wood = mat('wafuWood', 0x5a4433, { flatShading: true });
  const dark = mat('wafuDark', 0x2e241c);
  const light = glow('wafuLight', 0xffbf6a);
  if (!outside) {
    // 屋裡：木板牆只做朝內的面（鏡頭那邊看得穿），天花板木梁、牆邊兩盞紙燈、後牆一扇透光的格子窗
    const inWood = mat('wafuIn', 0x8a6a4c);
    const wall = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const pl = add(new THREE.PlaneGeometry(len, WALL), inWood, (x0 + x1) / 2, WALL / 2, (z0 + z1) / 2);
      pl.rotation.y = Math.atan2(-(z1 - z0), x1 - x0) + Math.PI;
    };
    wall(W, D, W, -D);
    wall(W, -D, -W, -D);
    wall(-W, -D, -W, D);
    for (let z = -D + 0.8; z < D; z += 1.6) add(new THREE.BoxGeometry(W * 2, 0.14, 0.14), dark, 0, WALL - 0.07, z);
    add(new THREE.PlaneGeometry(1.6, 1.0), light, 0, 1.5, -D + 0.02);
    for (let x = -0.8; x <= 0.81; x += 0.2) add(new THREE.BoxGeometry(0.04, 1.0, 0.04), dark, x, 1.5, -D + 0.04);
    const paper = glow('wafuLampIn', 0xfff0cf);
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(0.3, 0.45, 0.3), paper, sx * (W - 0.35), 0.35, -D + 0.35);
      add(new THREE.BoxGeometry(0.36, 0.05, 0.36), dark, sx * (W - 0.35), 0.6, -D + 0.35);
    }
    return;
  }
  const L = 0.35; // 架高
  // 架高的木平台＋腳
  add(new THREE.BoxGeometry(W * 2 + 1.0, 0.16, D * 2 + 1.6), mat('wafuDeck', 0x4a3a2c, { flatShading: true }), 0, L - 0.08, 0.3);
  for (const [x, z] of [[-W - 0.4, -D - 0.4], [W + 0.4, -D - 0.4], [-W - 0.4, D + 1.0], [W + 0.4, D + 1.0], [0, D + 1.0]]) add(new THREE.BoxGeometry(0.22, L, 0.22), dark, x, L / 2 - 0.08, z);
  for (let x = -W - 0.4; x < W + 0.5; x += 0.45) add(new THREE.BoxGeometry(0.02, 0.01, D * 2 + 1.6), dark, x, L + 0.005, 0.3);
  // 木板牆（直的木板，一條一條深色縫）
  const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const T = 0.12;
  box(T, WALL, D * 2, wood, W, L + WALL / 2, 0);
  box(T, WALL, D * 2, wood, -W, L + WALL / 2, 0);
  box(W * 2, WALL, T, wood, 0, L + WALL / 2, -D);
  box(W - DOOR, WALL, T, wood, -(W + DOOR) / 2, L + WALL / 2, D);
  box(W - DOOR, WALL, T, wood, (W + DOOR) / 2, L + WALL / 2, D);
  box(DOOR * 2, WALL - 2.05, T, wood, 0, L + 2.05 + (WALL - 2.05) / 2, D);
  for (let x = -W; x <= W + 1e-6; x += 0.3) {
    if (Math.abs(x) < DOOR) continue;
    box(0.02, WALL, 0.02, dark, x, L + WALL / 2, D + T / 2 + 0.005);
  }
  for (let z = -D; z <= D + 1e-6; z += 0.3) for (const sx of [-1, 1]) box(0.02, WALL, 0.02, dark, sx * (W + T / 2 + 0.005), L + WALL / 2, z);
  // 四個角的粗木柱
  for (const [x, z] of [[-W, D], [W, D], [-W, -D], [W, -D]]) box(0.22, WALL + 0.1, 0.22, dark, x, L + WALL / 2, z);
  // 暖黃燈光的格子窗：左邊橫格窗、門是直條拉門（燈光從縫透出來）、兩側各一扇
  const win = (cx, cy, w, h, z, rows, cols, ry = 0) => {
    const g = add(new THREE.PlaneGeometry(w, h), light, cx, cy, z);
    g.rotation.y = ry;
    const f = (bw, bh, x, y) => {
      const b = add(new THREE.BoxGeometry(bw, bh, 0.05), dark, x, y, z);
      b.rotation.y = ry;
      if (ry) b.position.set(cx + (z - cx) * 0, y, z);
      return b;
    };
    void f;
    const nx = Math.cos(ry);
    const nz = -Math.sin(ry);
    for (let i = 0; i <= cols; i++) {
      const o = -w / 2 + (i * w) / cols;
      const b = add(new THREE.BoxGeometry(i === 0 || i === cols ? 0.08 : 0.035, h, 0.05), dark, cx + nx * o, cy, z + nz * o);
      b.rotation.y = ry;
    }
    for (let j = 0; j <= rows; j++) {
      const b = add(new THREE.BoxGeometry(w, j === 0 || j === rows ? 0.08 : 0.035, 0.05), dark, cx, cy - h / 2 + (j * h) / rows, z);
      b.rotation.y = ry;
    }
  };
  const fz = D + T / 2 + 0.02;
  win(-2.1, L + 1.35, 1.2, 1.2, fz, 4, 2);
  win(0, L + 1.0, DOOR * 2 - 0.1, 1.95, fz, 2, 9); // 拉門
  win(2.1, L + 1.35, 1.0, 1.1, fz, 1, 5);
  for (const sx of [-1, 1]) {
    const g = add(new THREE.PlaneGeometry(1.2, 1.0), light, sx * (W + T / 2 + 0.02), L + 1.4, 0);
    g.rotation.y = sx * Math.PI / 2;
    for (let i = 0; i <= 6; i++) add(new THREE.BoxGeometry(0.05, 1.0, 0.035), dark, sx * (W + T / 2 + 0.04), L + 1.4, -0.6 + i * 0.2);
    for (const y of [0.9, 1.9]) add(new THREE.BoxGeometry(0.05, 0.07, 1.25), dark, sx * (W + T / 2 + 0.04), L + y, 0);
  }
  // 屋頂：深灰的波浪瓦（一排一排半圓瓦）
  const tile = mat('wafuTile', 0x4a4a4c, { flatShading: true });
  const tileDark = mat('wafuTile2', 0x343436, { flatShading: true });
  const roofSlab = (x0, y0, x1, y1, zLen, zc, rowGap = 0.28) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const slab = add(new THREE.BoxGeometry(len, 0.08, zLen), tileDark, (x0 + x1) / 2, (y0 + y1) / 2, zc);
    slab.rotation.z = ang;
    // 一條一條順著斜面的半圓瓦
    const dx = (x1 - x0) / len;
    const dy = (y1 - y0) / len;
    const [nx, ny] = dx > 0 ? [-dy, dx] : [dy, -dx]; // 斜面朝上的方向
    for (let z = zc - zLen / 2 + 0.12; z < zc + zLen / 2; z += rowGap) {
      const c = add(new THREE.CylinderGeometry(0.085, 0.085, len, 6), tile, (x0 + x1) / 2 + nx * 0.05, (y0 + y1) / 2 + ny * 0.05, z);
      c.rotation.z = ang - Math.PI / 2;
    }
    // 屋簷前緣一排圓瓦頭
    return slab;
  };
  const top = L + WALL;
  const RH = 1.5;
  const OV = 0.6;
  for (const sx of [-1, 1]) roofSlab(sx * (W + OV), top - 0.25, 0, top + RH, D * 2 + OV * 2, 0);
  add(new THREE.BoxGeometry(0.3, 0.26, D * 2 + OV * 2 + 0.1), tileDark, 0, top + RH + 0.05, 0);
  // 山牆（屋頂下的三角，舊舊的白灰泥）
  for (const z of [D, -D]) {
    const g = new THREE.Shape();
    g.moveTo(-W, 0);
    g.lineTo(W, 0);
    g.lineTo(0, RH * 0.92);
    g.closePath();
    add(new THREE.ShapeGeometry(g), mat('wafuPlaster', 0xd8cdb8, { side: THREE.DoubleSide }), 0, top, z + (z > 0 ? 0.07 : -0.07));
  }
  // 前面的小屋簷（門窗上方一道斜斜的瓦簷＋木頭斜撐）
  const ey = L + 2.2;
  const eave = add(new THREE.BoxGeometry(W * 2 + 0.8, 0.07, 1.0), tileDark, 0, ey, D + 0.5);
  eave.rotation.x = 0.32;
  for (let x = -W - 0.3; x <= W + 0.31; x += 0.24) {
    const c = add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), tile, x, ey + 0.05, D + 0.5);
    c.rotation.x = Math.PI / 2 + 0.32;
  }
  for (const sx of [-1, 1]) {
    const br = add(new THREE.BoxGeometry(0.07, 0.07, 0.75), dark, sx * (W + 0.15), ey - 0.3, D + 0.35);
    br.rotation.x = -0.75;
  }
  // 門口一棵小小的盆栽（細細的枯枝）＋石頭盆
  add(new THREE.CylinderGeometry(0.28, 0.22, 0.35, 10), mat('wafuPot', 0x6e6e68), -1.0, L + 0.17, D + 0.55);
  const twig = mat('wafuTwig', 0x9a8a6a);
  for (const [rz, rx, h] of [[0.15, 0.1, 1.6], [-0.35, -0.05, 1.2], [0.5, 0.2, 1.0], [-0.1, -0.25, 1.4]]) {
    const b = add(new THREE.CylinderGeometry(0.015, 0.03, h, 5), twig, -1.0 + Math.sin(rz) * h * 0.5, L + 0.35 + Math.cos(rz) * h * 0.5, D + 0.55 + Math.sin(rx) * h * 0.5);
    b.rotation.set(rx, 0, -rz);
  }
}

// ───────────── 🎃 南瓜屋 ─────────────
function buildPumpkin(sh, add, outside) {
  const R = sh.R;
  const H = 0.9;
  const side = outside ? THREE.FrontSide : THREE.BackSide;
  const orange = mat(`pumpkin${outside}`, 0xf08a3a, { side });
  if (!outside) {
    domeWithDoor(R, H, add, outside, orange, mat('pumpDoor', 0x7a4a2a), null);
    // 屋裡：天花板一條一條的南瓜紋
    const rib = mat('pumpRibIn', 0xd9702a, { side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.35) continue;
      const arc = add(new THREE.TorusGeometry(R - 0.04, 0.04, 6, 24, Math.PI / 2), rib, 0, 0, 0);
      arc.scale.set(1, H, 1);
      arc.rotation.y = -a + Math.PI / 2;
    }
    return;
  }
  // 作者 11/12 參考圖：一瓣一瓣鼓鼓的南瓜（扁扁圓圓）、彎彎的綠褐色蒂頭
  // 外面不用上面那顆光滑圓頂，改成 12 瓣鼓起來的瓣（藏在瓣裡面）
  const lobe = mat('pumpLobe', 0xf0862e);
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / N; // 正前方剛好是兩瓣中間 → 門開在凹處
    const l = add(new THREE.SphereGeometry(1.5, 20, 16), lobe, Math.sin(a) * 2.35, 1.75, Math.cos(a) * 2.35);
    l.scale.set(1, 1.2, 1); // 作者 11/12：整顆往上，底部圓圓收進去，不要陷在地板裡
    l.rotation.y = a;
    l.scale.x = 0.95;
  }
  const core = add(new THREE.SphereGeometry(2.6, 28, 18), mat('pumpCore', 0xe9781f), 0, 1.6, 0);
  core.scale.y = 0.72;
  // 蒂頭：粗粗的、往旁邊彎
  const stem = mat('pumpStem', 0x6f6a32);
  const sc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 3.45, 0), new THREE.Vector3(0.05, 3.9, 0), new THREE.Vector3(0.3, 4.25, 0.05), new THREE.Vector3(0.65, 4.35, 0.1)]);
  add(new THREE.TubeGeometry(sc, 20, 0.18, 8, false), stem);
  add(new THREE.SphereGeometry(0.3, 10, 8), stem, 0, 3.45, 0).scale.y = 0.5;
  // 門（凹處、圓拱）＋小石階
  const dz = 3.95;
  const ds = new THREE.Shape();
  ds.moveTo(-0.7, 0);
  ds.lineTo(0.7, 0);
  ds.lineTo(0.7, 1.2);
  ds.absarc(0, 1.2, 0.7, 0, Math.PI, false);
  ds.closePath();
  add(new THREE.ShapeGeometry(ds), mat('pumpDoor', 0x6a4226), 0, 0.02, dz);
  const fr = mat('pumpFrame', 0x4a2e1a);
  add(new THREE.TorusGeometry(0.7, 0.09, 8, 24, Math.PI), fr, 0, 1.22, dz + 0.02);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.17, 1.22, 0.6), fr, sx * 0.7, 0.61, dz - 0.2); // 深一點：接到南瓜的凹處
  const archBack = add(new THREE.CylinderGeometry(0.79, 0.79, 0.6, 20, 1, true, -Math.PI / 2, Math.PI), fr, 0, 1.22, dz - 0.2);
  archBack.rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.06, 8, 6), mat('pumpKnob', 0xe8b04a), 0.42, 0.9, dz + 0.06);
  add(new THREE.BoxGeometry(1.8, 0.12, 1.6), mat('pumpStep', 0x8a6a48), 0, 0.06, dz - 0.5); // 門下面的木頭小平台
  // 左右兩扇發光的小圓窗（暖黃）
  const lit = glow('pumpLit', 0xffd36a);
  for (const sx of [-1, 1]) {
    const a = sx * (Math.PI / N) * 3; // 隔一瓣
    const r = 2.35 + 1.53;
    const w = add(new THREE.CircleGeometry(0.32, 16), lit, Math.sin(a) * r, 2.0, Math.cos(a) * r);
    w.rotation.y = a;
    const ring = add(new THREE.TorusGeometry(0.33, 0.06, 6, 16), fr, Math.sin(a) * r, 2.0, Math.cos(a) * r);
    ring.rotation.y = a;
  }
  // 門口兩顆小南瓜
  for (const [x, sz] of [[-1.4, 0.35], [1.45, 0.28]]) {
    const pk = add(new THREE.SphereGeometry(sz, 14, 10), mat('pumpSmall', 0xf39a48), x, sz * 0.8, dz + 0.5);
    pk.scale.y = 0.8;
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), stem, x, sz * 1.45, dz + 0.5);
  }
}
