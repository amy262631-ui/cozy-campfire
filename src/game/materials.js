/**
 * 採集籃裡的材料（手作家具、營火料理共用的規則；前端、伺服器共用）。
 *
 * 材料寫法：
 *   { id: 'corn', n: 2 }        指定某一種（玉米 2 根）
 *   { type: 'flower', n: 3 }    某一類都可以（任意野花 3 朵）
 * 用「某一類」的材料時：先用數量最多、最常見的；稀有（★★★）的和配方裡會指定的材料（例如南瓜、漂流木）不會被拿去用。
 */
import { GATHER_BY_ID, GATHER_TYPES } from './gathering.js';
import { CROPS, CROP_BY_ID } from './garden.js';
import { TRASH, TRASH_BY_ID } from './trash.js';

/** ♻️ 回收材料（11/07）：回收桶選「留著做手作」，垃圾就放進採集籃，可以做回收手作家具 */
export const MATERIAL_TYPES = [...GATHER_TYPES, { id: 'veg', icon: '🥕', zh: '蔬菜' }, { id: 'trash', icon: '♻️', zh: '回收材料' }];
export const MATERIAL_TYPE_BY_ID = Object.fromEntries(MATERIAL_TYPES.map((x) => [x.id, x]));

/** 材料的資料（採集品或蔬菜） */
export const materialOf = (id) =>
  GATHER_BY_ID[id] ?? (CROP_BY_ID[id] ? { ...CROP_BY_ID[id], type: 'veg', rarity: 1 } : TRASH_BY_ID[id] ? { ...TRASH_BY_ID[id], type: 'trash' } : null);
export const ALL_MATERIAL_IDS = [...Object.keys(GATHER_BY_ID), ...CROPS.map((c) => c.id), ...TRASH.map((x) => x.id)];

/** 這些材料只能被「指定」使用，不會被「某一類」拿走（在 crafting.js、cooking.js 裡登記） */
export const RESERVED = new Set();

/** 某一類材料可以用的有哪些（數量多的、常見的排前面） */
function poolOf(basket, type) {
  return Object.entries(basket ?? {})
    .filter(([id, n]) => n > 0 && !RESERVED.has(id) && materialOf(id)?.type === type && (materialOf(id).rarity ?? 1) < 3)
    .sort((a, b) => (materialOf(a[0]).rarity ?? 1) - (materialOf(b[0]).rarity ?? 1) || b[1] - a[1]);
}

/** 採集籃裡有幾個可以當這個材料 */
export function haveOf(basket, spec) {
  if (spec.id) return basket?.[spec.id] ?? 0;
  return poolOf(basket, spec.type).reduce((a, [, n]) => a + n, 0);
}

/** 材料夠不夠 */
export const canMake = (basket, need) => need.every((spec) => haveOf(basket, spec) >= spec.n);

/** 把材料從採集籃拿走（會改 basket）；回傳用掉了哪些 { id: 數量 } */
export function takeMaterials(basket, need) {
  if (!canMake(basket, need)) return null;
  const used = {};
  const use = (id, n) => {
    basket[id] -= n;
    if (basket[id] <= 0) delete basket[id];
    used[id] = (used[id] ?? 0) + n;
  };
  // 先拿指定的，再拿某一類的
  for (const spec of need.filter((s) => s.id)) use(spec.id, spec.n);
  for (const spec of need.filter((s) => !s.id)) {
    let left = spec.n;
    for (const [id, n] of poolOf(basket, spec.type)) {
      const k = Math.min(n, left);
      use(id, k);
      left -= k;
      if (!left) break;
    }
  }
  return used;
}

/** 材料的名字（給畫面用；tr 是翻譯函式） */
export function specLabel(spec, tr = (s) => s) {
  if (spec.id) {
    const m = materialOf(spec.id);
    return `${m?.icon ?? ''} ${tr(m?.zh ?? spec.id)}`;
  }
  const ty = MATERIAL_TYPE_BY_ID[spec.type];
  return `${ty?.icon ?? ''} ${tr('任意{name}', { name: tr(ty?.zh ?? spec.type) })}`;
}
