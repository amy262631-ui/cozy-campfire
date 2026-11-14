import { FURNITURE_BY_ID, TENT_PRICE } from './furniture.js';
import { TENT_STYLE_BY_ID } from './tentStyles.js';
import { TENT_SHAPE_BY_ID } from './tentShapes.js';
import { canStackOn, stackAt, gridOf, expandPrice, maxItems, MAX_STACK, moveStack } from './furnitureCatalog.js';

/**
 * 試玩版（沒有伺服器，例如放在 Claude 的預覽頁）：
 * 小舖、帳篷、布置都在瀏覽器裡模擬，資料只存在這台裝置。
 * 只有用 VITE_DEMO=1 建置時才會啟用，正式網站不受影響。
 */
const KEY = 'cozy-campfire-demo';

export function createDemoHome() {
  let st = null;
  try {
    st = JSON.parse(localStorage.getItem(KEY));
  } catch {
    /* 沒存過 */
  }
  if (!st?.home) st = { pc: 150, home: { tent: false, inv: {}, items: [], open: true, style: 'classic', shape: 'bell', shapes: ['bell'] } };
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* 存不了也沒關係 */
    }
  };
  const copy = () => JSON.parse(JSON.stringify(st.home));
  const h = () => st.home;

  function request(ev, data = {}) {
    const home = h();
    if (ev === 'buy') {
      const id = data.id;
      if (id.startsWith('shape_')) {
        const sh = TENT_SHAPE_BY_ID[id.slice(6)];
        if (!sh?.price) return { ok: false, reason: 'unknown' };
        if (!home.tent) return { ok: false, reason: 'noTent' };
        home.shapes ??= ['bell'];
        if (home.shapes.includes(sh.id)) return { ok: false, reason: 'owned' };
        if (st.pc < sh.price) return { ok: false, reason: 'poor' };
        st.pc -= sh.price;
        home.shapes.push(sh.id);
        home.shape = sh.id;
        if (sh.style) home.style = sh.style;
        save();
        return { ok: true, pc: st.pc, delta: -sh.price, home: copy() };
      }
      if (id === 'expand') {
        if (!home.tent) return { ok: false, reason: 'noTent' };
        const price = expandPrice(home);
        if (!price) return { ok: false, reason: 'maxed' };
        if (st.pc < price) return { ok: false, reason: 'poor' };
        st.pc -= price;
        // 跟伺服器 server/homes.js 的 expandHome 一樣：家具跟著挪到新地板中間
        const g = gridOf(home);
        const shift = g % 2 === 0 ? 1 : 0;
        for (const it of home.items) {
          it.x += shift;
          it.z += shift;
        }
        home.grid = g + 1;
        save();
        return { ok: true, pc: st.pc, delta: -price, home: copy() };
      }
      const price = id === 'tent' ? TENT_PRICE : FURNITURE_BY_ID[id]?.price;
      if (!price) return { ok: false, reason: 'unknown' };
      if (id === 'tent' && home.tent) return { ok: false, reason: 'owned' };
      if (id !== 'tent' && !home.tent) return { ok: false, reason: 'noTent' };
      if (id !== 'tent' && (home.inv[id] ?? 0) >= 20) return { ok: false, reason: 'tooMany' };
      if (st.pc < price) return { ok: false, reason: 'poor' };
      st.pc -= price;
      if (id === 'tent') home.tent = true;
      else home.inv[id] = (home.inv[id] ?? 0) + 1;
      save();
      return { ok: true, pc: st.pc, delta: -price, home: copy() };
    }
    if (ev === 'homeOpen') {
      home.open = !!data.open;
      save();
      return { ok: true, open: home.open };
    }
    if (ev === 'homeEdit') {
      if (!home.tent) return { ok: false, reason: 'noTent' };
      if (data.op === 'style') {
        if (!TENT_STYLE_BY_ID[data.s]) return { ok: false, reason: 'unknown' };
        home.style = data.s;
        save();
        return { ok: true, home: copy() };
      }
      if (data.op === 'shape') {
        if (!(home.shapes ?? ['bell']).includes(data.s)) return { ok: false, reason: 'locked' };
        home.shape = data.s;
        save();
        return { ok: true, home: copy() };
      }
      if (data.op === 'clearAll') {
        home.items = [];
        save();
        return { ok: true, home: copy() };
      }
      const x = Number(data.x);
      const z = Number(data.z);
      const grid = gridOf(home);
      if (!(Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < grid && z < grid)) return { ok: false, reason: 'cell' };
      const stack = stackAt(home.items, x, z);
      const lv = data.l == null ? stack.length - 1 : Number(data.l);
      const target = stack[lv] ?? null;
      if (data.op === 'place') {
        const i = data.i;
        const left = (home.inv[i] ?? 0) - home.items.filter((it) => it.i === i).length;
        const below = stack[stack.length - 1]?.i ?? null;
        if (stack.length >= MAX_STACK) return { ok: false, reason: 'stackFull' };
        if (!canStackOn(below, i)) return { ok: false, reason: below ? 'noStack' : 'taken' };
        if (left <= 0) return { ok: false, reason: 'none' };
        if (home.items.length >= maxItems(grid)) return { ok: false, reason: 'tooMany' };
        home.items.push({ i, x, z, r: 0, l: stack.length });
      } else if (data.op === 'rotate') {
        if (!target) return { ok: false, reason: 'empty' };
        target.r = ((target.r ?? 0) + 1) % 4;
      } else if (data.op === 'move') {
        const tx = Number(data.tx);
        const tz = Number(data.tz);
        if (!(Number.isInteger(tx) && Number.isInteger(tz) && tx >= 0 && tz >= 0 && tx < grid && tz < grid)) return { ok: false, reason: 'cell' };
        if (!target) return { ok: false, reason: 'empty' };
        const why = moveStack(home.items, x, z, lv, tx, tz);
        if (why) return { ok: false, reason: why };
      } else if (data.op === 'remove') {
        if (!target) return { ok: false, reason: 'empty' };
        const drop = new Set(stack.slice(lv));
        home.items = home.items.filter((it) => !drop.has(it));
      } else return { ok: false, reason: 'op' };
      save();
      return { ok: true, home: copy() };
    }
    return null;
  }

  return {
    request,
    get pc() {
      return st.pc;
    },
    get home() {
      return copy();
    },
  };
}
