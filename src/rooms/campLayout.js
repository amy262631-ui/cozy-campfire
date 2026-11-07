/**
 * 🏕️ 帳篷營地的配置（純數學，不碰 three.js，方便單獨測試）
 *
 * 一條彎彎曲曲的環形小路繞著中間的小草原（草原中央有營火小爐），
 * 入口再接一段蜿蜒的小徑。帳篷沿著小路兩側錯落排列、門口朝向小路，
 * 每頂帳篷門口旁邊留一塊「小菜園」空地（garden），之後放菜園用。
 *
 * plots 依照離入口的距離排序：第 0 格離入口最近（伺服器把「自己的帳篷」放在第 0 格）。
 */
import { seededRandom } from '../scene/textures.js';

export const CAMP_SIZE = 24; // 11/07：每區 24 頂（營位放大，門口擺得下大型 1 個＋小型 3 個）
export const ENTRY_Z = 31;
export const BOUNDS = { minX: -37, maxX: 37, minZ: -36, maxZ: ENTRY_Z + 0.6 };
export const LOOP_CENTER = { x: 0, z: -3 };

/** 環形小路的半徑（隨角度起伏，才不會是死板的圓） */
const loopR = (a) => 18 + 2.6 * Math.sin(2 * a + 0.7) + 1.3 * Math.sin(3 * a + 2.1) + 0.6 * Math.sin(5 * a + 0.3);

function sampleLoop(step = 0.5) {
  const pts = [];
  const N = 720;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = loopR(a);
    pts.push({ x: LOOP_CENTER.x + Math.sin(a) * r, z: LOOP_CENTER.z + Math.cos(a) * r });
  }
  return resample([...pts, pts[0]], step);
}

/** 入口小徑：從營地門口蜿蜒接到環形小路的最南端 */
function sampleEntry(step = 0.5) {
  const z1 = LOOP_CENTER.z + loopR(0) - 0.4;
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const z = ENTRY_Z + 0.5 + (z1 - ENTRY_Z - 0.5) * u;
    const x = Math.sin(u * Math.PI * 1.6) * 3.2 * Math.sin(u * Math.PI);
    pts.push({ x, z });
  }
  return resample(pts, step);
}

function resample(pts, step) {
  const out = [{ ...pts[0] }];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    let t = step - acc;
    while (t <= seg) {
      out.push({ x: a.x + ((b.x - a.x) * t) / seg, z: a.z + ((b.z - a.z) * t) / seg });
      t += step;
    }
    acc = seg - (t - step);
  }
  // 方向（切線）
  for (let i = 0; i < out.length; i++) {
    const p = out[Math.max(0, i - 1)];
    const n = out[Math.min(out.length - 1, i + 1)];
    const l = Math.hypot(n.x - p.x, n.z - p.z) || 1;
    out[i].tx = (n.x - p.x) / l;
    out[i].tz = (n.z - p.z) / l;
  }
  return out;
}

const TENT_GAP = 8.5; // 帳篷中心之間至少這麼遠（含菜園、門口擺設；11/07 從 6.3 放大）
const OFFSET = 6.3; // 帳篷中心離小路中線的距離
const PATH_CLEAR = 5.4; // 帳篷中心離任何一段小路至少這麼遠

function minDistTo(pts, x, z) {
  let d = Infinity;
  for (const p of pts) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
  return d;
}

function buildLayout() {
  const rand = seededRandom(2611);
  const loop = sampleLoop();
  const entry = sampleEntry();
  const allPath = [...loop, ...entry];
  const plots = [];
  const inside = (x, z, m) => x > BOUNDS.minX + m && x < BOUNDS.maxX - m && z > BOUNDS.minZ + m && z < BOUNDS.maxZ - m - 3;
  const tryPlace = (pts, side, phase) => {
    for (let i = phase; i < pts.length; i += 2) {
      const p = pts[i];
      // 法線（左手邊 = side 1）
      const nx = -p.tz * side;
      const nz = p.tx * side;
      const off = OFFSET + (rand() - 0.5) * 1.1;
      const along = (rand() - 0.5) * 0.8;
      const x = p.x + nx * off + p.tx * along;
      const z = p.z + nz * off + p.tz * along;
      if (!inside(x, z, 3.2)) continue;
      if (plots.some((q) => Math.hypot(q.x - x, q.z - z) < TENT_GAP)) continue;
      if (minDistTo(allPath, x, z) < PATH_CLEAR) continue;
      if (Math.hypot(x - LOOP_CENTER.x, z - LOOP_CENTER.z) < 7.2) continue; // 中央草原留給營火小爐
      // 門口朝向小路（再轉一點點，看起來比較隨性）
      const ry = Math.atan2(-nx, -nz) + (rand() - 0.5) * 0.35;
      const gardenSide = rand() < 0.5 ? -1 : 1;
      plots.push({ x, z, ry, gardenSide, pathIdx: i, pts });
    }
  };
  // 先沿著入口小徑兩側，再沿著環形小路外側、內側
  tryPlace(entry, 1, 0);
  tryPlace(entry, -1, 1);
  tryPlace(loop, 1, 0);
  tryPlace(loop, -1, 2);

  // 依「從入口走過去的距離」排序
  const entryLen = entry.length;
  const loopLen = loop.length;
  const dist = (p) => {
    if (p.pts === entry) return entryLen - p.pathIdx; // 入口小徑：越靠門口越前面
    const i = p.pathIdx;
    return entryLen + Math.min(i, loopLen - i);
  };
  plots.sort((a, b) => dist(a) - dist(b));
  return {
    loop,
    entry,
    plots: plots.slice(0, CAMP_SIZE).map(({ x, z, ry, gardenSide }) => ({ x, z, ry, gardenSide })),
    total: plots.length,
  };
}

export const LAYOUT = buildLayout();

/** 帳篷前方（門口方向）與右手方向的單位向量 */
export function frame(ry) {
  return { fx: Math.sin(ry), fz: Math.cos(ry), rx: Math.cos(ry), rz: -Math.sin(ry) };
}

/** 帳篷門口、出門站的位置、小菜園的位置（front：帳篷前緣離中心多遠） */
export function plotSpots(p, front) {
  const f = frame(p.ry);
  const at = (fwd, right = 0) => ({ x: p.x + f.fx * fwd + f.rx * right, z: p.z + f.fz * fwd + f.rz * right });
  return {
    door: at(front + 0.55),
    out: { ...at(front + 1.25), ry: p.ry },
    garden: { ...at(3.75, 1.75 * p.gardenSide), ry: p.ry, w: 1.7, d: 1.3 },
    lantern: at(front + 0.5, -1.25 * p.gardenSide),
  };
}
