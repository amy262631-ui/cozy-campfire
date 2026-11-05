import * as THREE from 'three';
import { makeResolver, lowpoly, shadowAll } from './shared.js';
import { buildFurniture, FURNITURE_BY_ID } from '../game/furniture.js';
import { CATALOG_BY_ID, stackAt, stackY, stackOffset, gridOf, GRID_BASE, LOFT_Z, loftRows, isLoftCell, hasLoft } from '../game/furnitureCatalog.js';
import { styleOf, tentTexture } from '../game/tentStyles.js';
import { shapeOf, buildTentShell, buildTentFloor, tentBounds, tentDoorZ, CABIN } from '../game/tentShapes.js';
import { t } from '../i18n/i18n.js';

/**
 * 我的帳篷（home）：地板一開始 6×6 格，用松果擴建可以到 10×10（整頂帳篷跟著變大）。
 * 每格可以疊放家具（地墊→家具→小東西），規則在 furnitureCatalog.js。
 * 每個人的帳篷都用這個房間來顯示，進來時換上主人的擺設（setHome）。
 */
const CELL = 0.8;
const R = 3.8; // 帳篷半徑（鐘形帳、6×6 格時）

/** 第 (gx, gz) 格的中心（grid：這頂帳篷是幾格見方） */
export const cellCenter = (gx, gz, grid = GRID_BASE) => {
  const half = (grid * CELL) / 2;
  return { x: -half + CELL / 2 + gx * CELL, z: -half + CELL / 2 + gz * CELL };
};

export function createHomeRoom() {
  const group = new THREE.Group();
  group.name = 'home';
  const occluders = [];
  // 只畫內側：鏡頭在帳篷外也看得到裡面（像娃娃屋），布置時才看得清楚
  const canvas = new THREE.MeshStandardMaterial({ color: 0xe6d2ac, roughness: 1, side: THREE.BackSide });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xc9a874, roughness: 1, flatShading: true });
  const mats = {
    canvas,
    accent: accentMat,
    accentDouble: new THREE.MeshStandardMaterial({ color: 0xc9a874, roughness: 1, side: THREE.DoubleSide }),
    wood: lowpoly(0x7a5236),
    trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.BackSide }),
    gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
    // 🏡 小木屋：二樓地板（站在一樓時變半透明，才看得到底下）、閣樓的床和地毯
    loft: new THREE.MeshStandardMaterial({ color: 0x8a5e3a, roughness: 1, flatShading: true, transparent: true }),
    bed: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xe8a0a8, roughness: 1 }),
    rug: new THREE.MeshStandardMaterial({ color: 0xb5655a, roughness: 1 }),
    windowIn: new THREE.MeshBasicMaterial({ color: 0x2a3a6a }),
  };
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a6644, roughness: 1, flatShading: true });
  const plankMat = new THREE.MeshBasicMaterial({ color: 0x6b4a30 });

  // 帳篷本體＋地板：換造型時整組重蓋
  const shell = new THREE.Group();
  group.add(shell);
  let floor = null;
  let shapeKey = null;
  let grid = GRID_BASE;
  let scale = 1; // 擴建後整頂帳篷放大的倍數
  let lightBase = 9;
  const bounds = [tentBounds('bell'), { type: 'rect', minX: -0.6, maxX: 0.6, minZ: 2.6, maxZ: R + 0.2 }];
  const entrance = { to: 'forest_main', x: 0, z: R - 0.05, r: 0.5, label: t('回到營火') };
  const spawn = { x: 0, z: 2.75, ry: Math.PI, camYaw: 0.25, camPitch: 0.62 };
  function buildShape(id, g = GRID_BASE) {
    const sh = shapeOf(id);
    const key = `${sh.id}|${g}`;
    if (key === shapeKey) return;
    shapeKey = key;
    grid = g;
    const k = (scale = g / GRID_BASE);
    for (const c of shell.children) c.traverse((o) => o.geometry?.dispose());
    shell.clear();
    // 奇數格時正中間那格要能擺東西，就不放中柱
    const noPole = g % 2 === 1;
    const body = buildTentShell(sh.id, mats, { noPole });
    body.scale.setScalar(k);
    shell.add(body);
    floor = buildTentFloor(sh.id, floorMat);
    floor.scale.set(k, k, 1);
    floor.receiveShadow = true;
    shell.add(floor);
    const halfX = (sh.kind === 'rect' ? sh.W : sh.R) * k;
    for (let i = -40; i <= 39; i++) {
      const x = i * 0.8 + 0.4;
      if (Math.abs(x) > halfX - 0.05) continue;
      const len = sh.kind === 'rect' ? sh.D * k * 2 : Math.sqrt(Math.max(0, (sh.R * k - 0.05) ** 2 - x * x)) * 2;
      const plank = new THREE.Mesh(new THREE.PlaneGeometry(0.015, len), plankMat);
      plank.rotation.x = -Math.PI / 2;
      plank.position.set(x, 0.004, 0);
      shell.add(plank);
    }
    shadowAll(shell);
    floor.castShadow = false;
    // 走動範圍、門口、燈的高度跟著造型和大小
    const door = (tentDoorZ(sh.id) + 0.05) * k - 0.05;
    const b = tentBounds(sh.id);
    bounds[0] =
      b.type === 'rect'
        ? { type: 'rect', minX: -sh.W * k + 0.3, maxX: sh.W * k - 0.3, minZ: -sh.D * k + 0.3, maxZ: sh.D * k + 0.2 }
        : { type: 'circle', r: sh.R * k - 0.35 };
    // 出口放在門外一點：要真的走出門才算，不會被擠一下就跑出去
    bounds[1].minZ = door - 1.0;
    bounds[1].maxZ = door + 0.55;
    entrance.z = door + 0.15;
    entrance.r = 0.4;
    spawn.z = door - 1.0; // 從門口往裡面一步，免得一進來就踩到出口
    light.position.y = sh.light * k;
    bulb.position.y = sh.light * k;
    light.distance = 9 * k;
    lightBase = 9 * k ** 1.5;
    hasPole = (sh.id === 'bell' || sh.id === 'circus') && !noPole;
    loftShape = sh.loft ? sh : null;
    level = 0;
    // 布置用的格線跟著格數
    gridLines.geometry.dispose();
    group.remove(gridLines);
    const vis = gridLines.visible;
    gridLines = new THREE.GridHelper(g * CELL, g, 0xffd28a, 0xffd28a);
    gridLines.position.y = 0.03;
    gridLines.material.transparent = true;
    gridLines.material.opacity = 0.55;
    gridLines.visible = vis;
    group.add(gridLines);
    // 二樓的格線（只有小木屋）
    if (loftGrid) {
      loftGrid.geometry.dispose();
      group.remove(loftGrid);
      loftGrid = null;
    }
    if (sh.loft) {
      const rows = loftRows(g);
      const half = (g * CELL) / 2;
      const pts = [];
      for (let i = 0; i <= g; i++) pts.push(-half + i * CELL, 0, -half, -half + i * CELL, 0, -half + rows * CELL);
      for (let j = 0; j <= rows; j++) pts.push(-half, 0, -half + j * CELL, half, 0, -half + j * CELL);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      loftGrid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.7 }));
      loftGrid.position.y = CABIN.loftY * k + 0.03;
      group.add(loftGrid);
    }
    showGrid();
  }
  let loftGrid = null;
  function showGrid() {
    gridLines.visible = building && buildFloor === 1;
    if (loftGrid) loftGrid.visible = building && buildFloor === 2;
  }
  let hasPole = true;
  /** 🏡 小木屋才有二樓：0＝一樓、1＝樓梯上、2＝二樓 */
  let loftShape = null;
  let level = 0;
  /** 二樓的家具（站在二樓才會擋路） */
  const colliders2 = [];
  const swimmers = [];
  /** 可以坐、躺的位置；rest＝現在坐在哪（{ x, y, z, kind, actions }） */
  const seats = [];
  let rest = null;
  let lastPos = { x: 0, y: 0, z: 0 };
  /** 離自己最近、按 E 可以坐的家具 */
  const nearSeat = () => {
    let best = null;
    let bd = 0.95;
    for (const s of seats) {
      if (s.loft !== level >= 2) continue;
      const d = Math.hypot(lastPos.x - s.x, lastPos.z - s.z);
      if (d < bd) [best, bd] = [s, d];
    }
    return best;
  };
  /** 布置時正在擺哪一層：1 一樓、2 二樓 */
  let buildFloor = 1;
  let building = false;
  /** 某一格的中心（二樓的格子多一個高度） */
  const cellPos = (x, z) => {
    if (isLoftCell(z)) {
      const c = cellCenter(x, z - LOFT_Z, grid);
      return { x: c.x, z: c.z, y: CABIN.loftY * scale };
    }
    const c = cellCenter(x, z, grid);
    return { x: c.x, z: c.z, y: 0 };
  };

  // 燈：帳篷頂一顆暖黃燈＋淡淡的環境光
  const light = new THREE.PointLight(0xffd9a0, 9, 9, 1.4);
  light.position.set(0, 3.0, 0);
  group.add(light);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  bulb.position.copy(light.position);
  group.add(bulb);
  group.add(new THREE.HemisphereLight(0xffe8cc, 0x3a2a1c, 0.55));

  // ---- 布置模式用的格線與選取框 ----
  let gridLines = new THREE.GridHelper(GRID_BASE * CELL, GRID_BASE, 0xffd28a, 0xffd28a);
  gridLines.position.y = 0.03;
  gridLines.material.transparent = true;
  gridLines.material.opacity = 0.55;
  gridLines.visible = false;
  group.add(gridLines);
  const selector = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL * 0.92, CELL * 0.92),
    new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  selector.rotation.x = -Math.PI / 2;
  selector.position.y = 0.035;
  selector.visible = false;
  group.add(selector);

  shadowAll(group);

  // ---- 家具 ----
  const furnitureGroup = new THREE.Group();
  group.add(furnitureGroup);
  const colliders = [{ x: 0, z: 0, r: 0.12 }]; // 中柱
  const baseResolve = makeResolver(colliders, bounds); // bounds[1]：門口走道
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /**
   * 走動＋高度：一般帳篷就是平地；小木屋多了樓梯和二樓（位置用沒放大前的座標算，再乘上放大倍數）
   * 一樓碰到樓梯側面會被擋住，要從最下面那一階走上去
   */
  function resolveCollision(pos, r) {
    // 坐著／躺著：固定在家具上
    if (rest) {
      if (rest.actions.state === rest.kind) {
        pos.set(rest.x, rest.y, rest.z);
        return;
      }
      rest = null;
    }
    lastPos = pos;
    if (!loftShape) {
      baseResolve(pos, r);
      pos.y = 0;
      return;
    }
    const k = scale;
    const C = CABIN;
    const W = loftShape.W;
    const D = loftShape.D;
    const sx0 = C.stairX0 + 0.12;
    const sx1 = C.stairX1 - 0.12;
    let ux = pos.x / k;
    let uz = pos.z / k;
    const inStairX = ux > C.stairX0 - 0.1 && ux < C.stairX1 + 0.1;
    if (level === 0) {
      baseResolve(pos, r);
      ux = pos.x / k;
      uz = pos.z / k;
      if (ux > C.stairX0 - 0.15 && uz > C.loftFront && uz < C.stairBottom) {
        if (uz > C.stairBottom - 0.45) level = 1; // 從最下面一階走上去
        else pos.x = (C.stairX0 - 0.15) * k; // 樓梯側面：擋住
      }
    }
    if (level === 1) {
      ux = clamp(ux, sx0, sx1);
      if (uz > C.stairBottom) level = 0;
      else if (uz < C.loftFront) level = 2;
      pos.x = ux * k;
    }
    if (level === 2) {
      ux = clamp(ux, -W + 0.3, W - 0.3);
      uz = clamp(uz, -D + 0.3, inStairX ? C.loftFront + 0.2 : C.loftFront - 0.1);
      if (inStairX && uz > C.loftFront) level = 1;
      pos.x = ux * k;
      pos.z = uz * k;
      // 二樓的家具擋路
      for (const c of colliders2) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + r;
        if (d < min && d > 1e-4) {
          pos.x = c.x + (dx / d) * min;
          pos.z = c.z + (dz / d) * min;
        }
      }
    }
    const ramp = clamp((C.stairBottom - pos.z / k) / (C.stairBottom - C.loftFront), 0, 1);
    pos.y = (level === 2 ? C.loftY : level === 1 ? ramp * C.loftY : 0) * k;
    // 站在一樓、而且在二樓底下：二樓地板變半透明，看得到自己
    const under = level === 0 && pos.z / k < C.loftFront + 0.6;
    const want = building ? (buildFloor === 1 ? 0.15 : 1) : under ? 0.25 : 1;
    mats.loft.opacity += (want - mats.loft.opacity) * 0.2;
    mats.loft.depthWrite = mats.loft.opacity > 0.9;
  }
  /** 遠端玩家的高度（不知道他走哪一層，用上一次的高度猜） */
  function heightAt(x, z, prevY = 0) {
    if (!loftShape) return 0;
    const k = scale;
    const C = CABIN;
    const ux = x / k;
    const uz = z / k;
    if (ux > C.stairX0 - 0.1 && uz > C.loftFront && uz < C.stairBottom && (prevY > 0.05 || uz > C.stairBottom - 0.5)) {
      return clamp((C.stairBottom - uz) / (C.stairBottom - C.loftFront), 0, 1) * C.loftY * k;
    }
    if (uz <= C.loftFront && prevY > C.loftY * k * 0.5) return C.loftY * k;
    return 0;
  }
  buildShape('bell');

  let home = { items: [] };
  let mine = false;

  /** 換帳篷風格：帆布顏色＋花樣、門簾、地板 */
  function applyStyle(id) {
    const st = styleOf(id);
    const tex = tentTexture(st);
    canvas.map = tex;
    canvas.color.set(tex ? 0xffffff : st.canvas);
    canvas.needsUpdate = true;
    accentMat.color.set(st.accent);
    mats.accentDouble.color.set(st.accent);
    floorMat.color.setHex(st.floor);
  }

  function setHome(h, isMine) {
    home = h ?? { items: [] };
    mine = !!isMine;
    level = 0;
    applyStyle(home.style);
    furnitureGroup.clear();
    buildShape(home.shape, gridOf(home));
    colliders.length = hasPole ? 1 : 0;
    if (hasPole) colliders[0] = { x: 0, z: 0, r: 0.12 };
    const cells = new Map();
    colliders2.length = 0;
    swimmers.length = 0;
    seats.length = 0;
    rest = null;
    const rows2 = loftShape && hasLoft(home) ? loftRows(grid) : 0;
    for (const it of home.items ?? []) {
      if (!FURNITURE_BY_ID[it.i] || it.x >= grid) continue;
      if (isLoftCell(it.z) ? it.z - LOFT_Z >= rows2 : it.z >= grid) continue;
      const k = `${it.x},${it.z}`;
      if (!cells.has(k)) cells.set(k, { x: it.x, z: it.z });
    }
    for (const { x, z } of cells.values()) {
      const stack = stackAt(home.items, x, z).filter((it) => FURNITURE_BY_ID[it.i]);
      const c = cellPos(x, z);
      stack.forEach((it, lv) => {
        const m = buildFurniture(it.i, { rack: home.rack, color: it.c, fish: it.fish });
        // 展示櫃裡的東西：跟著櫃子的方向排在架子上
        const o = stackOffset(stack, lv);
        const base = stack.find((x) => CATALOG_BY_ID[x.i]?.shelf);
        const ba = base && o.x ? (base.r ?? 0) * (Math.PI / 2) : 0;
        m.position.set(c.x + o.x * Math.cos(ba) + o.z * Math.sin(ba), c.y + o.y, c.z - o.x * Math.sin(ba) + o.z * Math.cos(ba));
        m.rotation.y = (it.r ?? 0) * (Math.PI / 2);
        m.userData.cell = { x, z };
        furnitureGroup.add(m);
        m.traverse((o) => o.userData.swim && swimmers.push(o));
      });
      // 門口那條走道（最前排中間）的家具不擋路，免得把門堵住出不去
      // 🛋️ 可以坐、躺的家具（按 E）
      stack.forEach((it, lv) => {
        const f = CATALOG_BY_ID[it.i];
        if (f?.seat == null) return;
        seats.push({ x: c.x, z: c.z, y: c.y + stackY(stack, lv) + f.seat, a: (it.r ?? 0) * (Math.PI / 2), sleep: !!f.sleep, loft: isLoftCell(z) });
      });
      const list = isLoftCell(z) ? colliders2 : colliders;
      const doorLane = !isLoftCell(z) && z === grid - 1 && Math.abs(c.x) < 0.85;
      if (doorLane) continue;
      // 🧱 隔間牆：沿著格子那一邊放三個小圓，擋住穿越
      for (const it of stack) {
        const f = CATALOG_BY_ID[it.i];
        if (f?.kind !== 'wall' || f.walk) continue;
        const a = (it.r ?? 0) * (Math.PI / 2);
        for (const lx of [-0.28, 0, 0.28]) {
          const lz = -0.36;
          list.push({ x: c.x + lx * Math.cos(a) + lz * Math.sin(a), z: c.z - lx * Math.sin(a) + lz * Math.cos(a), r: 0.13 });
        }
      }
      if (stack.some((it) => !CATALOG_BY_ID[it.i]?.walk && CATALOG_BY_ID[it.i]?.kind !== 'wall')) list.push({ x: c.x, z: c.z, r: 0.34 });
      // 比較長的家具（床）：後面再擋半格
      for (const it of stack) {
        const L = CATALOG_BY_ID[it.i]?.long;
        if (!L) continue;
        const a = (it.r ?? 0) * (Math.PI / 2);
        list.push({ x: c.x - L * Math.sin(a), z: c.z - L * Math.cos(a), r: 0.3 });
      }
    }
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** 螢幕上點的位置 → 地板第幾格（沒點到地板回傳 null） */
  function cellAtScreen(clientX, clientY, camera, dom) {
    const rect = dom.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    // 先看有沒有點到家具（高的櫃子、疊起來的東西，點上面也算那一格）
    const up = buildFloor === 2 && !!loftShape;
    for (const h of raycaster.intersectObject(furnitureGroup, true)) {
      let o = h.object;
      while (o && !o.userData.cell) o = o.parent;
      if (o && isLoftCell(o.userData.cell.z) === up) return { ...o.userData.cell };
    }
    const target = up ? shell.getObjectByProperty('name', 'loft') : floor;
    const hit = target && raycaster.intersectObject(target, false)[0];
    if (!hit) return null;
    const half = (grid * CELL) / 2;
    const gx = Math.floor((hit.point.x + half) / CELL);
    const gz = Math.floor((hit.point.z + half) / CELL);
    if (up) {
      if (gx < 0 || gz < 0 || gx >= grid || gz >= loftRows(grid)) return null;
      return { x: gx, z: LOFT_Z + gz };
    }
    if (gx < 0 || gz < 0 || gx >= grid || gz >= grid) return null;
    return { x: gx, z: gz };
  }

  return {
    id: 'home',
    label: t('⛺ 帳篷'),
    group,
    fog: new THREE.FogExp2(0x1a120c, 0.025),
    background: new THREE.Color(0x0b0806),
    outdoor: false,
    occluders,
    entrances: [entrance],
    spawn,
    get doorZ() {
      return entrance.z;
    },
    /** 出了帳篷要回哪裡（從營地進來就回營地） */
    setExit(to) {
      entrance.to = to;
      entrance.label = to === 'campground' ? t('回到帳篷營地') : t('回到營火');
    },
    get exitTo() {
      return entrance.to;
    },
    cameraDistance: 4.6,
    noStargaze: true,
    audio: { fire: 0.1, wind: 0.35, ambient: 0.4, water: 0, music: 0.6, song: 1 },
    resolveCollision,
    heightAt,
    /** 站在二樓或樓梯上（布置模式、鏡頭用） */
    get upstairs() {
      return level > 0;
    },
    setHome,
    applyStyle,
    cellAtScreen,
    get home() {
      return home;
    },
    get mine() {
      return mine;
    },
    /** 布置模式：顯示格線 */
    setBuild(on) {
      building = on;
      if (!on) buildFloor = 1;
      showGrid();
      if (!on) selector.visible = false;
    },
    /** 🏡 小木屋：布置一樓或二樓 */
    setBuildFloor(f) {
      buildFloor = loftShape ? f : 1;
      selector.visible = false;
      showGrid();
    },
    get buildFloor() {
      return buildFloor;
    },
    get hasLoft() {
      return !!loftShape;
    },
    /** 二樓中間（布置二樓時鏡頭看這裡） */
    get loftCenter() {
      return loftShape ? { x: 0, y: CABIN.loftY * scale, z: ((-loftShape.D + CABIN.loftFront) / 2) * scale } : null;
    },
    select(cell) {
      selector.visible = !!cell;
      if (cell) {
        const c = cellPos(cell.x, cell.z);
        selector.position.set(c.x, c.y + 0.035, c.z);
      }
    },
    /** 這一格最上面的家具 */
    itemAt(cell) {
      return stackAt(home.items, cell.x, cell.z).at(-1) ?? null;
    },
    /** 帳篷地板幾格見方、放大倍數（布置時鏡頭要拉多遠） */
    get grid() {
      return grid;
    },
    get scale() {
      return scale;
    },

    onAction(name, actions) {
      if (name === 'stargaze' && actions.state !== 'stargaze') {
        actions.hud.toast(t('帳篷裡看不到星星，到外面去吧 ✨'));
        return true;
      }
      if (actions.state === 'free' && name === 'interact') {
        const s = nearSeat();
        if (s) {
          // 坐下：坐在家具中間；躺下：腳在床尾、頭朝床頭（家具的後面）
          const kind = s.sleep ? 'sleep' : 'sofa';
          const off = s.sleep ? 0.3 : 0.06;
          rest = { x: s.x + Math.sin(s.a) * off, y: s.y, z: s.z + Math.cos(s.a) * off, kind, actions };
          actions.rest(kind, s.a);
          return true;
        }
        if (mine) actions.onBuild?.();
        return true;
      }
      if (actions.state === 'free' && name === 'roast') {
        actions.hud.toast(t('帳篷裡不能生火喔 🔥'));
        return true;
      }
      return false;
    },
    interactHint() {
      const s = nearSeat();
      if (s) return s.sleep ? ['🛏️', t('躺下')] : ['🛋️', t('坐下')];
      return mine ? ['🛠️', t('布置')] : null;
    },
    prompt() {
      const s = nearSeat();
      if (s) return s.sleep ? t('<kbd>E</kbd> 躺下睡一下') : t('<kbd>E</kbd> 坐下');
      return mine ? t('<kbd>E</kbd> 布置帳篷') : null;
    },
    update(dt, time) {
      light.intensity = lightBase * (0.96 + Math.sin(time * 1.7) * 0.03);
      // 🐠 魚缸裡的魚游來游去
      for (const f of swimmers) {
        const u = time * 0.7 + f.parent.position.x;
        const sw = f.userData.swim;
        f.position.x = Math.sin(u) * sw.range;
        f.position.z = Math.cos(u * 0.8) * sw.range * 0.5;
        f.position.y = sw.y + Math.sin(u * 1.7) * 0.03;
        f.rotation.y = Math.cos(u) > 0 ? 0 : Math.PI;
      }
    },
  };
}
