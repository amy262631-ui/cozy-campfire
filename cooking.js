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
  // ---- 11/06 擴充（加在最後面）----
  { id: 'summer_salad', icon: '🥗', zh: '夏日沙拉', need: [{ id: 'cucumber', n: 1 }, { id: 'tomato', n: 1 }, { id: 'cabbage', n: 1 }] },
  { id: 'melon_smoothie', icon: '🍉', zh: '西瓜冰沙', need: [{ id: 'watermelon', n: 1 }, { type: 'fruit', n: 1 }] },
  { id: 'berry_daifuku', icon: '🍡', zh: '草莓栗子大福', need: [{ id: 'garden_strawberry', n: 2 }, { id: 'chestnut', n: 1 }] },
  { id: 'onion_rings', icon: '🧅', zh: '洋蔥圈', need: [{ id: 'onion', n: 2 }] },
  { id: 'salted_edamame', icon: '🫛', zh: '鹽水毛豆', need: [{ id: 'edamame', n: 2 }] },
  { id: 'roast_eggplant', icon: '🍆', zh: '烤茄子', need: [{ id: 'eggplant', n: 1 }, { id: 'chili', n: 1 }] },
  { id: 'forest_curry', icon: '🍛', zh: '森林咖哩', need: [{ id: 'potato', n: 1 }, { id: 'carrot', n: 1 }, { id: 'onion', n: 1 }, { type: 'mush', n: 1 }] },
  { id: 'roast_chestnut', icon: '🌰', zh: '糖炒栗子', need: [{ id: 'chestnut', n: 2 }] },
  { id: 'honey_cookie', icon: '🍪', zh: '榛果蜂蜜餅乾', need: [{ id: 'hazelnut', n: 2 }, { type: 'flower', n: 1 }] },
  { id: 'lavender_tea', icon: '🍵', zh: '薰衣草奶茶', need: [{ id: 'lavender', n: 2 }] },
  { id: 'petal_jelly', icon: '🌸', zh: '花瓣果凍', need: [{ type: 'flower', n: 3 }, { type: 'fruit', n: 1 }] },
  { id: 'lions_mane_soup', icon: '🍲', zh: '猴頭菇燉湯', need: [{ id: 'lions_mane', n: 1 }, { id: 'potato', n: 1 }, { id: 'onion', n: 1 }] },
  { id: 'star_pudding', icon: '🍮', zh: '星砂布丁', need: [{ id: 'star_sand', n: 1 }, { type: 'fruit', n: 2 }] },
  { id: 'gold_tart', icon: '🥧', zh: '金色漿果塔', need: [{ id: 'gold_berry', n: 1 }, { type: 'fruit', n: 2 }] },
  { id: 'moon_soup', icon: '🌙', zh: '月光蘿蔔湯', need: [{ id: 'moon_radish', n: 1 }, { id: 'glow_mush', n: 1 }] },
  { id: 'spicy_pot', icon: '🌶️', zh: '營火麻辣鍋', need: [{ id: 'chili', n: 2 }, { type: 'veg', n: 3 }, { type: 'mush', n: 1 }], big: true }, // 大菜：像大鍋菜一樣分給附近的人
  // 🍖 只能用自家門口的烤肉爐做（grill）
  { id: 'camp_skewer', icon: '🍢', zh: '營地烤肉串', need: [{ type: 'veg', n: 2 }, { type: 'mush', n: 2 }], grill: true },
  { id: 'grill_platter', icon: '🔥', zh: '炭烤拼盤', need: [{ id: 'corn', n: 1 }, { id: 'sweetpotato', n: 1 }, { id: 'onion', n: 1 }], grill: true },
];
export const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
/** 第一次煮出某道料理送的松果（大鍋菜特別多） */
export const dishFirstGain = (d) => (d.big ? 10 : 3);
for (const d of DISHES) for (const s of d.need) if (s.id && materialOf(s.id)?.type !== 'veg') RESERVED.add(s.id); // 蔬菜不保留：「任意蔬菜」都可以用
