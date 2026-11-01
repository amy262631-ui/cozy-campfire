import { FURNITURE_BY_ID, TENT_PRICE } from './furniture.js';
import { TENT_STYLE_BY_ID } from './tentStyles.js';
import { TENT_SHAPE_BY_ID } from './tentShapes.js';

/**
 * 試玩版（沒有伺服器，例如放在 Claude 的預覽頁）：
 * 小舖、帳篷、布置都在瀏覽器裡模擬，資料只存在這台裝置。
 * 只有用 VITE_DEMO=1 建置時才會啟用，正式網站不受影響。
 */
const KEY = 'cozy-campfire-demo';
const GRID = 6;
const MAX_ITEMS = 36;

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
      const x = Number(data.x);
      const z = Number(data.z);
      if (!(Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < GRID && z < GRID)) return { ok: false, reason: 'cell' };
      const at = home.items.findIndex((it) => it.x === x && it.z === z);
      if (data.op === 'place') {
        const i = data.i;
        const left = (home.inv[i] ?? 0) - home.items.filter((it) => it.i === i).length;
        if (at >= 0) return { ok: false, reason: 'taken' };
        if (left <= 0) return { ok: false, reason: 'none' };
        if (home.items.length >= MAX_ITEMS) return { ok: false, reason: 'tooMany' };
        home.items.push({ i, x, z, r: 0 });
      } else if (data.op === 'rotate') {
        if (at < 0) return { ok: false, reason: 'empty' };
        home.items[at].r = (home.items[at].r + 1) % 4;
      } else if (data.op === 'remove') {
        if (at < 0) return { ok: false, reason: 'empty' };
        home.items.splice(at, 1);
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
