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
  // ---- 11/07 擴充：♻️ 回收手作（用撿來的垃圾；回收桶選「留著做手作」才會放進採集籃）----
  { id: 'bottle_lamp', need: [{ id: 'pet_bottle', n: 2 }, { id: 'firefly', n: 1 }] },
  { id: 'tire_swing', need: [{ id: 'tire', n: 1 }, { id: 'driftwood', n: 2 }] },
  { id: 'bottle_charm', need: [{ id: 'glass_bottle', n: 1 }, { type: 'shell', n: 1 }] },
  { id: 'can_planter', need: [{ id: 'can', n: 2 }, { type: 'flower', n: 1 }] },
  { id: 'net_basket', need: [{ id: 'net_scrap', n: 2 }, { id: 'driftwood', n: 1 }] },
  { id: 'umbrella_lamp', need: [{ id: 'umbrella', n: 1 }, { type: 'bug', n: 1 }] },
  { id: 'slipper_pot', need: [{ id: 'slipper', n: 1 }, { type: 'flower', n: 2 }] },
  { id: 'float_chime', need: [{ id: 'float', n: 2 }, { type: 'shell', n: 1 }] },
  // ---- 🌿 自然手作 ----
  { id: 'log_bench', need: [{ id: 'driftwood', n: 3 }, { type: 'stone', n: 1 }] },
  { id: 'glowmush_lamp', need: [{ id: 'glow_mush', n: 1 }, { type: 'mush', n: 2 }] },
  { id: 'bug_frame', need: [{ type: 'bug', n: 2 }, { id: 'driftwood', n: 1 }] },
  { id: 'pressed_flower', need: [{ type: 'flower', n: 3 }, { id: 'driftwood', n: 1 }] },
  { id: 'crystal_sun', need: [{ id: 'quartz', n: 1 }, { id: 'lake_glass', n: 2 }] },
  { id: 'pearl_lamp', need: [{ id: 'pearl_mussel', n: 1 }, { type: 'shell', n: 2 }] },
  { id: 'meteor_lamp', need: [{ id: 'meteor_shard', n: 1 }, { id: 'glow_crystal', n: 1 }] },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
for (const r of RECIPES) for (const s of r.need) if (s.id && materialOf(s.id)?.type !== 'veg') RESERVED.add(s.id); // 蔬菜不保留：「任意蔬菜」都可以用
