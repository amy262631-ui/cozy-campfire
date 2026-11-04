/**
 * 🔨 手作家具：用採集籃裡的東西（採集品、菜園的蔬菜）做家具，做好放進帳篷的背包。
 * 家具本身的資料（名字、疊放規則）在 furnitureCatalog.js（craft: true，小舖買不到）。
 * 前端、伺服器共用。
 */
import { RESERVED, materialOf } from './materials.js';

export const RECIPES = [
  { id: 'shellchime', need: [{ type: 'shell', n: 3 }, { id: 'driftwood', n: 1 }] },
  { id: 'stonetower', need: [{ type: 'stone', n: 3 }] },
  { id: 'wreath', need: [{ type: 'flower', n: 4 }] },
  { id: 'jam', need: [{ type: 'fruit', n: 3 }] },
  { id: 'terrarium', need: [{ type: 'mush', n: 2 }, { type: 'stone', n: 1 }] },
  { id: 'pumpkinlamp', need: [{ id: 'pumpkin', n: 1 }, { type: 'bug', n: 1 }] },
  { id: 'cornhang', need: [{ id: 'corn', n: 3 }] },
  { id: 'vegbasket', need: [{ type: 'veg', n: 4 }] },
  { id: 'driftshelf', need: [{ id: 'driftwood', n: 2 }, { type: 'stone', n: 2 }] },
  { id: 'shellframe', need: [{ type: 'shell', n: 2 }, { type: 'flower', n: 1 }] },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
for (const r of RECIPES) for (const s of r.need) if (s.id && materialOf(s.id)?.type !== 'veg') RESERVED.add(s.id); // 蔬菜不保留：「任意蔬菜」都可以用
