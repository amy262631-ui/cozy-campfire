import * as THREE from 'three';

/**
 * 💇 贊助限定假髮的 3D 模型：有體積的頭髮（雲朵、一撮一撮有厚度、柔順有光澤），
 * 貼著頭（半徑 0.37，縮放 [1.1, 0.95, 1]，臉朝 +z）。kind 對應 outfits.js 的 hair 造型。
 */
const PI = Math.PI;
const TAU = PI * 2;
const HS = [1.1, 0.95, 1];
const R = 0.372;
const FRONT = PI / 2;

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 球面座標 → 頭上的點（phi：π/2＝臉、3π/2＝後腦；theta：從頭頂往下） */
const sph = (phi, th, r) => [-r * Math.cos(phi) * Math.sin(th) * HS[0], r * Math.cos(th) * HS[1], r * Math.sin(phi) * Math.sin(th) * HS[2]];

/** 參數曲面 (u, v) → 點，做成一片網格 */
function sheet(fn, nu, nv) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...fn(i / nu, j / nv));
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      const b = a + nv + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 角度距離（球面上兩點） */
const angDist = (p1, t1, p2, t2) => {
  const a = sph(p1, t1, 1);
  const b = sph(p2, t2, 1);
  return Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0]) / 1.21 + (a[1] * b[1]) / 0.9025 + a[2] * b[2])));
};

/** 每種髮型大概多蓬（帽子要放大、抬高多少才戴得上去） */
export const HAIR_VOLUME = { cloudcurl: 0.1, cloudshort: 0.08, bob: 0.06, spiky: 0.05, fluffy: 0.05, bowl: 0.05 };

export function buildHair(kind, c1, c2, fit = {}) {
  const g = new THREE.Group();
  const hm = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.45, side: THREE.DoubleSide });
  const hm2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(c1).multiplyScalar(0.86), roughness: 0.5, side: THREE.DoubleSide });
  const acc = new THREE.MeshStandardMaterial({ color: c2, roughness: 0.5 });
  const add = (geo, m = hm) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };

  /**
   * 頭頂到後腦的髮量：從頭頂長到 bottom(phi)，邊緣往頭收（看起來有厚度）
   *   lift：髮量多厚　puffs：雲朵泡泡 [[phi, th, 大小, 高度]]　groove：一撮一撮的溝
   */
  const cap = ({ bottom, lift = 0.035, puffs = [], groove = 0, grooveN = 22 }) =>
    add(
      sheet(
        (u, v) => {
          const phi = u * TAU;
          const th = v * bottom(phi);
          const tuck = v < 0.8 ? 1 : Math.cos(((v - 0.8) / 0.2) * (PI / 2)) ** 0.7;
          let bump = 0;
          for (const [pp, pt, s, h] of puffs) {
            const d = angDist(phi, th, pp, pt);
            bump += h * Math.exp(-(d * d) / (2 * s * s));
          }
          const gr = groove * Math.abs(Math.sin((phi * grooveN) / 2));
          return sph(phi, th, R + (lift + bump + gr) * tuck + 0.004);
        },
        96,
        28,
      ),
    );

  /** 一撮頭髮：根部粗、尾巴尖，有厚度（鼓鼓的），sweep 往旁邊彎、curl 尾巴往外翹 */
  const lock = ({ phi, th0, len, w, thick = 0.035, sweep = 0, curl = 0, m = hm }) =>
    add(
      sheet(
        (u, v) => {
          const p = phi + (u - 0.5) * w * (1 - 0.8 * v) + sweep * v * v;
          const th = th0 + len * v;
          const body = Math.sin(PI * u) ** 0.8 * (1 - v) ** 0.45;
          return sph(p, th, R + 0.008 + thick * body + curl * v * v);
        },
        14,
        16,
      ),
      m,
    );

  /** 沿著曲線的一束頭髮（馬尾）：有好幾條髮束的紋路，尾巴變細 */
  const tail = (points, w, twist = 0) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const nv = 40;
    const nu = 24;
    const frames = curve.computeFrenetFrames(nv, false);
    const geo = sheet(
      (u, v) => {
        const k = Math.round(v * nv);
        const c = curve.getPointAt(Math.min(1, v));
        const a = u * TAU + twist * v;
        const prof = w * Math.sin(PI * Math.min(1, v * 1.15 + 0.12)) ** 0.6 * (1 - v * 0.55);
        const rr = prof * (1 + 0.12 * Math.abs(Math.sin(a * 3)));
        const N = frames.normals[k];
        const B = frames.binormals[k];
        return [c.x + (N.x * Math.cos(a) + B.x * Math.sin(a)) * rr, c.y + (N.y * Math.cos(a) + B.y * Math.sin(a)) * rr, c.z + (N.z * Math.cos(a) + B.z * Math.sin(a)) * rr];
      },
      nu,
      nv,
    );
    return add(geo);
  };

  const bow = (x, y, z, s = 1, ry = 0) => {
    const b = new THREE.Group();
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 16, 12), acc);
      r.position.x = sx * 0.05 * s;
      r.scale.set(1.25, 0.8, 0.55);
      r.rotation.z = sx * 0.25;
      b.add(r);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.025 * s, 12, 8), acc);
    b.add(knot);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    g.add(b);
  };

  /** 瀏海：一排長短不一的髮束（n 撮、從 phiA 到 phiB） */
  const fringe = ({ n, phiA = FRONT - 0.85, phiB = FRONT + 0.85, th0 = PI * 0.2, len = PI * 0.16, w = 0.42, thick = 0.035, sweep = 0, seed = 1, curl = 0 }) => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const phi = phiA + (phiB - phiA) * u;
      const L = len * (0.7 + 0.3 * hash(i + seed)) * (1 - Math.abs(u - 0.5) * 0.35);
      lock({ phi, th0, len: L, w: w * (0.9 + 0.2 * hash(i + seed + 9)), thick: thick * (0.85 + 0.3 * hash(i + seed + 3)), sweep, curl, m: i % 2 ? hm : hm2 });
    }
  };

  // 後腦往下的長度：臉那邊短（到額頭），後面長
  const back = (front, rear) => (phi) => {
    const d = Math.abs(((phi - FRONT + PI) % TAU + TAU) % TAU - PI); // 0＝臉、π＝後腦
    const k = Math.min(1, Math.max(0, (d - 0.7) / 1.0));
    return front + (rear - front) * (k * k * (3 - 2 * k));
  };

  if (kind === 'twin') {
    // 雙馬尾：斜瀏海、頭頂有髮流，兩邊的馬尾是一束一束捲起來的
    cap({ bottom: back(PI * 0.23, PI * 0.5), lift: 0.03, groove: 0.012, grooveN: 26 });
    fringe({ n: 7, sweep: 0.25, len: PI * 0.17, seed: 11, thick: 0.04 });
    for (const sx of [-1, 1]) {
      lock({ phi: FRONT - sx * 1.0, th0: PI * 0.25, len: PI * 0.3, w: 0.3, thick: 0.035, curl: 0.03 });
      tail(
        [
          [sx * 0.36, 0.2, -0.12],
          [sx * 0.5, 0.1, -0.16],
          [sx * 0.54, -0.1, -0.12],
          [sx * 0.48, -0.32, -0.06],
          [sx * 0.52, -0.46, -0.08],
        ],
        0.085,
        3,
      );
      bow(sx * 0.37, 0.21, -0.1, 0.95, sx * 1.2);
    }
  } else if (kind === 'bun') {
    // 包包頭：頭髮往上梳到頭頂的丸子，丸子有一圈一圈的紋路
    cap({ bottom: back(PI * 0.22, PI * 0.46), lift: 0.028, groove: 0.01, grooveN: 30 });
    fringe({ n: 6, len: PI * 0.14, seed: 21, thick: 0.033 });
    for (const sx of [-1, 1]) lock({ phi: FRONT - sx * 1.02, th0: PI * 0.27, len: PI * 0.22, w: 0.18, thick: 0.025, curl: 0.02 });
    if (fit.hat) return g; // 戴帽子：丸子收進帽子裡
    const bun = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.085 - k * 0.025, 0.045, 14, 28), k % 2 ? hm2 : hm);
      t.rotation.x = PI / 2;
      t.position.y = k * 0.04;
      bun.add(t);
    }
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), hm);
    top.position.y = 0.09;
    bun.add(top);
    bun.position.set(0, 0.38, -0.12);
    bun.rotation.x = -0.45;
    g.add(bun);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 10, 28), acc);
    band.rotation.x = PI / 2 - 0.45;
    band.position.set(0, 0.36, -0.11);
    g.add(band);
  } else if (kind === 'wavy') {
    // 波浪長髮：中分，兩側一撮一撮波浪垂下來，後面是一大片有份量的捲髮
    cap({ bottom: back(PI * 0.22, PI * 0.62), lift: 0.035, groove: 0.014, grooveN: 20 });
    fringe({ n: 3, phiA: FRONT - 0.85, phiB: FRONT - 0.25, len: PI * 0.17, sweep: -0.2, seed: 31, thick: 0.035 });
    fringe({ n: 3, phiA: FRONT + 0.25, phiB: FRONT + 0.85, len: PI * 0.17, sweep: 0.2, seed: 34, thick: 0.035 });
    for (let i = 0; i < 9; i++) {
      const a = -0.95 + (i / 8) * 1.9; // 後面左右
      const x = Math.sin(a) * 0.4;
      const z = -Math.cos(a) * 0.36;
      tail(
        [
          // 背背包時後面的長髮收短一點，停在背包上面
          [x * 0.95, 0.05, z * 0.95],
          [x * 1.05, fit.back ? -0.06 : -0.12, z * 1.02],
          [x * 1.0 + Math.sin(i) * 0.03, fit.back ? -0.14 : -0.3, z * (fit.back ? 1.12 : 1.08)],
          [x * 1.06, (fit.back ? -0.22 : -0.46) - 0.05 * hash(i), z * (fit.back ? 1.15 : 1.05)],
        ],
        0.075,
        2,
      );
    }
    for (const sx of [-1, 1]) {
      tail(
        [
          // 圍圍巾時前面兩撮收短，垂在圍巾上面
          [sx * 0.39, 0.1, 0.12],
          [sx * 0.43, -0.08, 0.14],
          [sx * 0.42, fit.neck ? -0.18 : -0.26, 0.1],
          [sx * 0.45, fit.neck ? -0.24 : -0.42, 0.06],
        ],
        0.065,
        2,
      );
    }
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), acc);
    f.position.set(-0.28, 0.26, 0.17);
    g.add(f);
  } else if (kind === 'bob') {
    // 妹妹頭：圓圓蓬蓬的蘑菇頭，瀏海厚厚的、尾巴往內收
    cap({ bottom: back(PI * 0.2, PI * 0.66), lift: 0.05, groove: 0.01, grooveN: 34 });
    fringe({ n: 9, len: PI * 0.17, w: 0.3, seed: 41, thick: 0.045 });
    for (const sx of [-1, 1]) lock({ phi: FRONT - sx * 1.05, th0: PI * 0.22, len: PI * 0.45, w: 0.55, thick: 0.06, curl: -0.02 });
    bow(0.28, 0.25, 0.14, 0.75, 0.6);
  } else if (kind === 'pony') {
    // 高馬尾：瀏海往一邊撥，頭頂後面綁一束蓬蓬又柔順的馬尾
    cap({ bottom: back(PI * 0.22, PI * 0.5), lift: 0.03, groove: 0.012, grooveN: 26 });
    fringe({ n: 6, len: PI * 0.17, sweep: -0.3, seed: 51, thick: 0.038 });
    for (const sx of [-1, 1]) lock({ phi: FRONT - sx * 1.0, th0: PI * 0.26, len: PI * 0.28, w: 0.16, thick: 0.022, curl: 0.03 });
    tail(
      [
        [0, 0.3, -0.33],
        [0, 0.36, -0.48],
        [0, 0.2, -0.58],
        // 背背包時馬尾短一點、往外翹，不會插進背包
        ...(fit.back
          ? [
              [0, 0.02, -0.64],
              [0.02, -0.1, -0.68],
            ]
          : [
              [0, -0.05, -0.55],
              [0.03, -0.28, -0.5],
            ]),
      ],
      0.11,
      3,
    );
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 10, 24), acc);
    band.position.set(0, 0.32, -0.36);
    band.rotation.x = 0.6;
    g.add(band);
  }
  // ---------------- v3：雲朵頭、麻花辮、男生短髮 ----------------
  /**
   * 雲朵：整顆圓圓軟軟、一團一團鼓起來的頭髮（像動森那種柔順有光澤），下緣是圓圓的波浪
   *   lobes：幾團　amp：鼓多高　sig：每團多大　scallop：下緣幾個圓弧
   */
  const cloud = ({ bottom, lift = 0.04, lobes = 26, amp = 0.05, sig = 0.32, scallop = 14, scAmp = 0.12, seed = 1 }) => {
    const pts = [];
    for (let i = 0; i < lobes; i++) {
      const y = 1 - (i / (lobes - 1)) * 1.25;
      pts.push([(i * 2.39996 + seed) % TAU, Math.acos(Math.max(-1, Math.min(1, y))), amp * (0.75 + 0.5 * hash(i + seed))]);
    }
    return add(
      sheet(
        (u, v) => {
          const phi = u * TAU;
          const s2 = u * scallop;
          const f = s2 - Math.floor(s2);
          const tb = bottom(phi) + scAmp * Math.sin(PI * f) ** 0.5;
          const th = v * tb;
          const tuck = v < 0.72 ? 1 : Math.cos(((v - 0.72) / 0.28) * (PI / 2)) ** 0.55;
          let bump = 0;
          for (const [pp, pt, h] of pts) {
            const d = angDist(phi, th, pp, pt);
            bump = Math.max(bump, h * Math.exp(-(d * d) / (2 * sig * sig)));
          }
          return sph(phi, th, R + (lift + bump) * tuck + 0.004);
        },
        160,
        40,
      ),
    );
  };
  /** 麻花辮：一節一節交錯的小橢圓，尾巴綁髮圈 */
  const braid = (x0, y0, z0, n, sx) => {
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.003, 16, 12), i % 2 ? hm : hm2);
      b.position.set(x0 + sx * (i % 2 ? 0.018 : -0.018) + sx * i * 0.006, y0 - i * 0.07, z0 + i * 0.008);
      b.scale.set(1, 1.25, 0.85);
      b.rotation.z = (i % 2 ? 0.4 : -0.4) * sx;
      g.add(b);
    }
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 8, 16), acc);
    tie.rotation.x = PI / 2;
    tie.position.set(x0 + sx * n * 0.006, y0 - n * 0.07 + 0.02, z0 + n * 0.008);
    g.add(tie);
    const end = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 12), hm);
    end.rotation.x = PI;
    end.position.set(x0 + sx * n * 0.006, y0 - n * 0.07 - 0.03, z0 + n * 0.008);
    g.add(end);
  };

  if (kind === 'cloudcurl') {
    // QQ 雲朵捲（女）：整顆軟綿綿的雲（跟男生款同一種），但兩側、後面再往下長一些，比短髮款長
    const bottomQQ = (phi) => {
      const d = Math.abs((((phi - FRONT + PI) % TAU) + TAU) % TAU - PI); // 0＝臉、π＝後腦
      const k = Math.min(1, Math.max(0, (d - 0.7) / 0.6));
      const side = PI * 0.27 + (PI * 0.64 - PI * 0.27) * (k * k * (3 - 2 * k));
      const k2 = Math.min(1, Math.max(0, (d - 1.6) / 1.0));
      return side + (fit.back ? 0 : PI * 0.08) * (k2 * k2 * (3 - 2 * k2)); // 後面再長一點（背背包時不加）
    };
    cloud({ bottom: bottomQQ, lift: 0.05, lobes: 30, amp: 0.06, sig: 0.3, scallop: 16, scAmp: 0.11, seed: 2 });
    bow(0.27, 0.28, 0.15, 0.8, 0.6);
  } else if (kind === 'cloudshort') {
    // 雲朵微捲短髮（男）：短短蓬蓬的雲，下緣只到耳朵上
    cloud({ bottom: back(PI * 0.25, PI * 0.47), lift: 0.04, lobes: 22, amp: 0.05, sig: 0.32, scallop: 13, scAmp: 0.08, seed: 6 });
  } else if (kind === 'braids') {
    // 麻花雙辮（女）：齊瀏海、柔順有光澤，兩條麻花辮垂在肩膀前
    cloud({ bottom: back(PI * 0.24, PI * 0.5), lift: 0.03, lobes: 8, amp: 0.02, sig: 0.6, scallop: 1, scAmp: 0, seed: 9 });
    fringe({ n: 9, len: PI * 0.15, w: 0.3, seed: 61, thick: 0.035 });
    for (const sx of [-1, 1]) braid(sx * (fit.neck ? 0.41 : 0.37), 0.02, 0.0, fit.neck ? 4 : 6, sx); // 圍圍巾時辮子短一點
  } else if (kind === 'spiky') {
    // 刺刺頭（男）：頭頂一撮一撮往上翹的軟刺
    cap({ bottom: back(PI * 0.24, PI * 0.46), lift: 0.03, groove: 0.01, grooveN: 22 });
    fringe({ n: 5, len: PI * 0.1, w: 0.4, seed: 71, thick: 0.035, sweep: 0.2 });
    for (let i = 0; i < (fit.hat ? 0 : 9); i++) {
      const phi = (i / 9) * TAU + 0.3;
      const th = PI * (0.08 + 0.12 * (i % 3) / 2);
      const p = sph(phi, th, R + 0.02);
      const prof = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        prof.push(new THREE.Vector2(0.07 * Math.sqrt(Math.max(0, 1 - u)) * (1 - u * 0.35) + 0.004, u * 0.15));
      }
      const sp = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), i % 2 ? hm : hm2);
      sp.position.set(...p);
      sp.lookAt(new THREE.Vector3(...sph(phi, th - 0.35, 1.5)));
      sp.rotateX(PI / 2);
      sp.position.multiplyScalar(0.97);
      g.add(sp);
    }
  } else if (kind === 'manbun') {
    // 小揪揪（男）：兩側短短的，後腦綁一個小揪揪
    cap({ bottom: back(PI * 0.25, PI * 0.45), lift: 0.025, groove: 0.012, grooveN: 28 });
    fringe({ n: 4, phiA: FRONT - 0.7, phiB: FRONT + 0.4, len: PI * 0.12, sweep: 0.35, seed: 81, thick: 0.03 });
    if (fit.hat) return g;
    const bn = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), hm2);
    bn.position.set(0, 0.32, -0.3);
    bn.scale.set(1, 0.85, 1);
    g.add(bn);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 18), acc);
    band.position.set(0, 0.29, -0.27);
    band.rotation.x = 1.0;
    g.add(band);
  } else if (kind === 'quiff') {
    // 側分油頭（男）：瀏海往上往後梳，前面翹起一個小波浪
    cap({ bottom: back(PI * 0.24, PI * 0.46), lift: 0.03, groove: 0.014, grooveN: 20, puffs: [[FRONT - 0.25, PI * 0.18, 0.28, 0.07]] });
    for (let i = 0; i < 4; i++) lock({ phi: FRONT - 0.7 + i * 0.12, th0: PI * 0.17, len: PI * 0.1, w: 0.25, thick: 0.03, sweep: 0.5, curl: 0.03 });
  } else if (kind === 'bowl') {
    // 西瓜頭（男）：圓圓的鍋蓋，齊齊的短瀏海、耳朵上面剪平
    cap({ bottom: back(PI * 0.3, PI * 0.44), lift: 0.045, groove: 0.008, grooveN: 40 });
    fringe({ n: 10, len: PI * 0.06, w: 0.25, seed: 91, thick: 0.04 });
  } else if (kind === 'fluffy') {
    // 蓬鬆短髮（男）：自然蓬蓬的短髮，瀏海隨意蓋在額頭
    cap({ bottom: back(PI * 0.24, PI * 0.47), lift: 0.04, groove: 0.012, grooveN: 24 });
    fringe({ n: 6, len: PI * 0.13, w: 0.4, seed: 101, thick: 0.04, sweep: -0.15 });
    for (const sx of [-1, 1]) lock({ phi: FRONT - sx * 1.0, th0: PI * 0.26, len: PI * 0.16, w: 0.22, thick: 0.03 });
  }
  return g;
}
