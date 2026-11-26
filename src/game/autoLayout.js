/**
 * ✨ 一鍵布置（作者 11/24、11/25）：把勾選的家具自動擺進帳篷（只擺勾的，已經擺好的不動）
 *   擺法：床、衣櫃、書櫃、魚缸、廚房靠後牆（廚房集中在右後角）；地毯放中間；桌子放地毯上、椅子沙發圍著桌子（面向桌子）；
 *         植物、燈放角落和牆邊；其他大東西沿著左右牆；小東西疊到桌子、櫃子上；門口走道一定留空（二樓留樓梯口）
 *   只算位置，前端拿結果送伺服器的 homeEdit setFloor，伺服器會再一件一件檢查
 *
 * 格子座標：x 0～grid-1（左→右），z 0～grid-1（後→前，前面是門）；二樓 z＝LOFT_Z＋排數（0＝最後面，最大＝靠欄杆）
 * 旋轉 r：0＝面向前（門）、1＝面向右、2＝面向後、3＝面向左（座位的朝向 a＝r×90°，sin a 是 x、cos a 是 z）
 */
import { CATALOG_BY_ID, LOFT_Z, loftRows, stackAt, canAddTo } from './furnitureCatalog.js';

const catOf = (f) => f.cat2 ?? f.cat;
/** 家具佔哪幾格（wide 往右多一格、long 往前多一格，照旋轉轉過去） */
function footprint(f, x, z, r = 0) {
  const cells = [[x, z]];
  const a = (r * Math.PI) / 2;
  const wx = Math.round(Math.cos(a));
  const wz = Math.round(-Math.sin(a));
  const lx = Math.round(Math.sin(a));
  const lz = Math.round(Math.cos(a));
  if (f?.wide) cells.push([x + wx, z + wz]);
  if (f?.long) cells.push([x + lx, z + lz]);
  if (f?.wide && f?.long) cells.push([x + wx + lx, z + wz + lz]);
  return cells;
}

/** 這件家具屬於哪一種擺法 */
function roleOf(f) {
  if (!f) return 'skip';
  if (f.kind === 'mat') return 'rug';
  if (f.kind === 'wall') return 'wall';
  if (f.kind === 'small') return 'small';
  const c = catOf(f);
  if (f.sleep || f.shelf || /櫃|衣櫥|書架|書櫃/.test(f.zh ?? '') || c === 'fish') return 'back';
  if (c === 'kitchen' && !f.dine) return 'kitchen';
  if (f.dine || (f.top && c === 'table')) return 'table';
  if (f.seat != null) return 'seat';
  if (c === 'plant' || c === 'light') return 'corner';
  return 'side';
}
const ORDER = ['back', 'kitchen', 'wall', 'rug', 'table', 'seat', 'corner', 'side', 'small'];

/**
 * @param {object} o
 * @param {Array} o.items   現在帳篷裡全部的家具（兩層都有）
 * @param {Array} o.picks   要擺的：[{ i, c }]（一件一筆）
 * @param {number} o.grid   地板幾格
 * @param {number} o.floor  1 一樓、2 二樓
 * @param {(x:number,z:number)=>{x:number,z:number}} [o.cellWorld] 格子的世界座標（算門口走道用；沒給就用格子中間那幾排）
 * @param {number} [o.cap]  最多幾件
 * @returns {{ items: Array, placed: number, left: Array }} items＝這一層擺好後的全部（照疊的順序），left＝沒地方擺的
 */
export function autoLayout({ items, picks, grid, floor, cellWorld, cap = Infinity }) {
  const up = floor === 2;
  const rows = up ? loftRows(grid) : grid;
  const Z = (r) => (up ? LOFT_Z + r : r);
  const onFloor = (it) => (up ? it.z >= LOFT_Z : it.z < LOFT_Z);
  const mine = items.filter(onFloor).map((it) => ({ ...it }));
  const all = [...items.filter((it) => !onFloor(it)), ...mine];
  const added = [];
  const key = (x, z) => `${x},${z}`;
  const inside = (x, r) => x >= 0 && x < grid && r >= 0 && r < rows;
  // 🚪 門口走道（一樓最前面兩排、門前那幾格）、二樓樓梯口（靠欄杆那排最右邊）一定留空
  const keep = new Set();
  if (!up) {
    for (let x = 0; x < grid; x++) {
      const w = cellWorld?.(x, Z(grid - 1));
      const doorCol = w ? Math.abs(w.x) < 0.85 : Math.abs(x - (grid - 1) / 2) <= 1.05;
      if (doorCol) for (const r of [grid - 1, grid - 2]) keep.add(key(x, Z(r)));
    }
  } else for (const r of [rows - 1, rows - 2]) if (r >= 0) keep.add(key(grid - 1, Z(r)));
  // 已經有東西（含寬家具多佔的那一格）
  const used = new Set();
  const mark = (f, x, z, r) => footprint(f, x, z, r).forEach(([a, b]) => used.add(key(a, b)));
  for (const it of mine) mark(CATALOG_BY_ID[it.i], it.x, it.z, it.r ?? 0);
  const freeFor = (f, x, r, rot = 0) =>
    footprint(f, x, Z(r), rot).every(([a, b]) => inside(a, up ? b - LOFT_Z : b) && !used.has(key(a, b)) && !keep.has(key(a, b)));
  const total = () => all.length + added.length;
  const put = (p, f, x, r, rot = 0) => {
    const z = Z(r);
    const it = { i: p.i, x, z, r: rot, l: stackAt([...all, ...added], x, z).length };
    if (p.c) it.c = p.c;
    added.push(it);
    mark(f, x, z, rot);
    return it;
  };
  // 候選格子（照順序試）
  const cellsBy = (fn) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let x = 0; x < grid; x++) out.push([x, r]);
    return out.sort((a, b) => fn(a) - fn(b));
  };
  const midX = (grid - 1) / 2;
  const midR = (rows - 1) / 2;
  const corners = cellsBy(([x, r]) => Math.min(x, grid - 1 - x) + Math.min(r, rows - 1 - r) * 1.01 + (r === rows - 1 ? 0.5 : 0));
  const sides = cellsBy(([x, r]) => Math.min(x, grid - 1 - x) * 10 + r);
  const center = cellsBy(([x, r]) => Math.hypot(x - midX, (r - midR) * 1.1));
  const tables = []; // 擺好的桌子（椅子要圍著）
  const rugs = [];
  const left = [];
  const sorted = picks
    .map((p) => ({ p, f: CATALOG_BY_ID[p.i], role: roleOf(CATALOG_BY_ID[p.i]) }))
    .filter((x) => x.f && x.role !== 'skip')
    .sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role) || (b.f.wide ? 1 : 0) - (a.f.wide ? 1 : 0));
  let backL = 0; // 後牆從左邊排過去
  let backR = grid - 1; // 廚房從右邊排過來
  for (const { p, f, role } of sorted) {
    if (total() >= cap) {
      left.push(p);
      continue;
    }
    let ok = null;
    if (role === 'back' || role === 'kitchen' || role === 'wall') {
      // 後牆一排（滿了就往前一排，靠左右牆）
      const fromRight = role === 'kitchen';
      for (let r = 0; r < rows && !ok; r++) {
        const xs = [...Array(grid).keys()];
        if (fromRight) xs.reverse();
        for (const x of xs) {
          if (r > 0 && x !== 0 && x !== grid - 1 && role !== 'kitchen') continue; // 第二排以後只靠左右牆
          if (r > 1 && role === 'kitchen' && x < grid - 2) continue;
          if (freeFor(f, x, r)) {
            ok = put(p, f, x, r, r === 0 ? 0 : x === 0 ? 1 : 3);
            break;
          }
        }
      }
      if (ok && !fromRight) backL = Math.max(backL, ok.x + 1);
      if (ok && fromRight) backR = Math.min(backR, ok.x - 1);
    } else if (role === 'rug') {
      for (const [x, r] of center) if (freeFor(f, x, r)) {
        ok = put(p, f, x, r);
        rugs.push(ok);
        break;
      }
    } else if (role === 'table') {
      // 優先放在地毯上（地毯那格還沒疊東西），再來中間的空格
      for (const rg of rugs) {
        const st = stackAt([...all, ...added], rg.x, rg.z);
        const side = !f.wide || (inside(rg.x + 1, rg.z - Z(0)) && !used.has(key(rg.x + 1, rg.z)) && !keep.has(key(rg.x + 1, rg.z)));
        if (st.length === 1 && canAddTo(st, p.i) && side) {
          ok = put(p, f, rg.x, rg.z - Z(0));
          break;
        }
      }
      if (!ok) for (const [x, r] of center) if (freeFor(f, x, r)) {
        ok = put(p, f, x, r);
        break;
      }
      if (ok) tables.push(ok);
    } else if (role === 'seat') {
      // 圍著桌子：左、右、前、後，面向桌子
      for (const tb of tables) {
        const tf = CATALOG_BY_ID[tb.i];
        const r0 = tb.z - Z(0);
        const spots = [
          [tb.x - 1, r0, 1],
          [tb.x + (tf?.wide ? 2 : 1), r0, 3],
          [tb.x, r0 + 1, 2],
          [tb.x, r0 - 1, 0],
        ];
        for (const [x, r, rot] of spots) if (inside(x, r) && freeFor(f, x, r, rot)) {
          ok = put(p, f, x, r, rot);
          break;
        }
        if (ok) break;
      }
      // 沒有桌子：靠左右牆，面向中間
      if (!ok) for (const [x, r] of sides) if (freeFor(f, x, r, x < midX ? 1 : 3)) {
        ok = put(p, f, x, r, x < midX ? 1 : 3);
        break;
      }
    } else if (role === 'corner') {
      for (const [x, r] of corners) if (freeFor(f, x, r)) {
        ok = put(p, f, x, r);
        break;
      }
    } else if (role === 'side') {
      for (const [x, r] of sides) if (freeFor(f, x, r, x < midX ? 1 : x > midX ? 3 : 0)) {
        ok = put(p, f, x, r, x < midX ? 1 : x > midX ? 3 : 0);
        break;
      }
    } else if (role === 'small') {
      // 小東西：先疊到桌子、櫃子上（新擺的、原本的都可以），再放牆邊空格
      const tops = [...added, ...mine]
        .filter((it) => CATALOG_BY_ID[it.i]?.top || CATALOG_BY_ID[it.i]?.shelf)
        .sort((a, b) => (CATALOG_BY_ID[a.i]?.kind === 'mat' ? 1 : 0) - (CATALOG_BY_ID[b.i]?.kind === 'mat' ? 1 : 0)); // 桌子、櫃子優先，地毯最後
      for (const tp of tops) {
        const st = stackAt([...all, ...added], tp.x, tp.z);
        if (st.at(-1) !== tp && !CATALOG_BY_ID[st[0]?.i]?.shelf && !CATALOG_BY_ID[st[1]?.i]?.shelf) continue;
        if (canAddTo(st, p.i)) {
          const it = { i: p.i, x: tp.x, z: tp.z, r: 0, l: st.length };
          if (p.c) it.c = p.c;
          added.push(it);
          ok = it;
          break;
        }
      }
      if (!ok) for (const [x, r] of sides) if (freeFor(f, x, r)) {
        ok = put(p, f, x, r);
        break;
      }
    }
    if (!ok) left.push(p);
  }
  // 這一層全部（原本的照疊的順序在前面，新的接在後面），伺服器照這個順序一件一件疊
  const floorItems = [...mine.sort((a, b) => (a.l ?? 0) - (b.l ?? 0)), ...added].map(({ i, x, z, r, c, fish }) => ({ i, x, z, r: r ?? 0, ...(c ? { c } : {}), ...(fish != null ? { fish } : {}) }));
  return { items: floorItems, placed: added.length, left };
}
