/**
 * 🍲 營火料理：把菜園的蔬菜、採集品拿到營火旁的料理鍋煮。
 * 料理可以吃（頭上冒出料理的小圖示）、送給同一區的朋友。前端、伺服器共用。
 * ⚠️ id 存檔用，不能改。
 */
import { RESERVED, materialOf } from './materials.js';

export const DISHES = [
  { id: 'roast_corn', icon: '🌽', zh: '烤玉米', need: [{ id: 'corn', n: 1 }] },
  { id: 'roast_sweetpotato', icon: '🍠', zh: '烤地瓜', need: [{ id: 'sweetpotato', n: 1 }] },
  { id: 'veg_skewer', icon: '🍢', zh: '蔬菜串燒', need: [{ type: 'veg', n: 3 }] },
  { id: 'pumpkin_soup', icon: '🎃', zh: '南瓜濃湯', need: [{ id: 'pumpkin', n: 1 }, { id: 'potato', n: 1 }] },
  { id: 'mush_soup', icon: '🍄', zh: '蘑菇濃湯', need: [{ type: 'mush', n: 2 }, { id: 'potato', n: 1 }] },
  { id: 'tomato_stew', icon: '🍅', zh: '番茄燉菜', need: [{ id: 'tomato', n: 2 }, { id: 'cabbage', n: 1 }] },
  { id: 'mush_stirfry', icon: '🥘', zh: '野菇炒時蔬', need: [{ type: 'mush', n: 1 }, { id: 'pepper', n: 1 }, { id: 'carrot', n: 1 }] },
  { id: 'cabbage_roll', icon: '🥬', zh: '高麗菜捲', need: [{ id: 'cabbage', n: 1 }, { type: 'mush', n: 1 }, { id: 'carrot', n: 1 }] },
  { id: 'berry_pie', icon: '🥧', zh: '莓果派', need: [{ type: 'fruit', n: 3 }] },
  { id: 'carrot_cake', icon: '🍰', zh: '紅蘿蔔蛋糕', need: [{ id: 'carrot', n: 2 }, { type: 'fruit', n: 1 }] },
  { id: 'flower_tea', icon: '🍵', zh: '野花草茶', need: [{ type: 'flower', n: 2 }] },
  { id: 'big_pot', icon: '🍲', zh: '營火大鍋菜', need: [{ type: 'veg', n: 5 }, { type: 'mush', n: 2 }], big: true },
];
export const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
/** 第一次煮出某道料理送的松果（大鍋菜特別多） */
export const dishFirstGain = (d) => (d.big ? 10 : 3);
for (const d of DISHES) for (const s of d.need) if (s.id && materialOf(s.id)?.type !== 'veg') RESERVED.add(s.id); // 蔬菜不保留：「任意蔬菜」都可以用
