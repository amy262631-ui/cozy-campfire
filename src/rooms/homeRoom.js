import * as THREE from 'three';
import { makeResolver, lowpoly, shadowAll } from './shared.js';
import { buildFurniture, FURNITURE_BY_ID } from '../game/furniture.js';
import { CATALOG_BY_ID, stackAt, stackY, gridOf, GRID_BASE } from '../game/furnitureCatalog.js';
import { styleOf, tentTexture } from '../game/tentStyles.js';
import { shapeOf, buildTentShell, buildTentFloor, tentBounds, tentDoorZ } from '../game/tentShapes.js';
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
    for (let i = -20; i <= 19; i++) {
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
  }
  let hasPole = true;

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
  const resolveCollision = makeResolver(colliders, bounds); // bounds[1]：門口走道
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
    applyStyle(home.style);
    furnitureGroup.clear();
    buildShape(home.shape, gridOf(home));
    colliders.length = hasPole ? 1 : 0;
    if (hasPole) colliders[0] = { x: 0, z: 0, r: 0.12 };
    const cells = new Map();
    for (const it of home.items ?? []) {
      if (!FURNITURE_BY_ID[it.i] || it.x >= grid || it.z >= grid) continue;
      const k = `${it.x},${it.z}`;
      if (!cells.has(k)) cells.set(k, { x: it.x, z: it.z });
    }
    for (const { x, z } of cells.values()) {
      const stack = stackAt(home.items, x, z).filter((it) => FURNITURE_BY_ID[it.i]);
      const c = cellCenter(x, z, grid);
      stack.forEach((it, lv) => {
        const m = buildFurniture(it.i);
        m.position.set(c.x, stackY(stack, lv), c.z);
        m.rotation.y = (it.r ?? 0) * (Math.PI / 2);
        m.userData.cell = { x, z };
        furnitureGroup.add(m);
      });
      // 門口那條走道（最前排中間）的家具不擋路，免得把門堵住出不去
      const doorLane = z === grid - 1 && Math.abs(c.x) < 0.85;
      if (!doorLane && stack.some((it) => !CATALOG_BY_ID[it.i]?.walk)) colliders.push({ x: c.x, z: c.z, r: 0.34 });
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
    for (const h of raycaster.intersectObject(furnitureGroup, true)) {
      let o = h.object;
      while (o && !o.userData.cell) o = o.parent;
      if (o) return { ...o.userData.cell };
    }
    const hit = floor && raycaster.intersectObject(floor, false)[0];
    if (!hit) return null;
    const half = (grid * CELL) / 2;
    const gx = Math.floor((hit.point.x + half) / CELL);
    const gz = Math.floor((hit.point.z + half) / CELL);
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
    },
    get exitTo() {
      return entrance.to;
    },
    cameraDistance: 4.6,
    noStargaze: true,
    audio: { fire: 0.1, wind: 0.35, ambient: 0.4, water: 0, music: 0.6, song: 1 },
    resolveCollision,
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
      gridLines.visible = on;
      if (!on) selector.visible = false;
    },
    select(cell) {
      selector.visible = !!cell;
      if (cell) {
        const c = cellCenter(cell.x, cell.z, grid);
        selector.position.x = c.x;
        selector.position.z = c.z;
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
      return mine ? ['🛠️', t('布置')] : null;
    },
    prompt() {
      return mine ? t('<kbd>E</kbd> 布置帳篷') : null;
    },
    update(dt, time) {
      light.intensity = lightBase * (0.96 + Math.sin(time * 1.7) * 0.03);
    },
  };
}
