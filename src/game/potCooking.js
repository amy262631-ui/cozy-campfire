/**
 * 🍳 自由料理鍋（11/19 作者）：自己挑 1～4 樣材料＋調味料，煮出什麼看組合。前端、伺服器共用。
 *
 * 材料（token）：
 *   'm:<id>'  採集籃裡的東西（蔬菜、蘑菇、果實、花、蟲、石頭、貝殼、寶物⋯）
 *   'f:<n>'   保冷箱裡的魚（魚種索引；釣到的魚從 11/20 起會放進保冷箱）
 *   't:<id>'  垃圾袋裡的怪東西（舊皮鞋、破襪子、壞掉的望遠鏡⋯）
 * 調味料：{ sugar: 2, soy: 1 }，一鍋最多 3 份；決定「口味版本」
 *
 * 食譜 need 的寫法（每一格是一樣材料，數量要剛好一樣）：
 *   'carrot'   指定材料      '@veg'  某一類（veg／mush／fruit／flower／bug／stone／shell／treasure）
 *   'f5'       指定魚種      'f*'    任意一條魚    'F'  任意一條魚，而且菜名會帶魚的名字（例如 紅燒{魚}）
 *   't:old_boot' 指定垃圾
 * 種類 kind：''（一般）、'hidden'（隱藏：顯示 ??? 和提示）、'unlock'（要先達成條件才煮得出來）、'survival'（🥾 求生料理）
 * ⚠️ id 存檔用，不能改。
 */
import { FISH } from '../fishing/fishData.js';
import { materialOf } from './materials.js';
import { TRASH_BY_ID } from './trash.js';
import { isOpen } from './dailySpecial.js';

export const SEASONINGS = [
  { id: 'sugar', icon: '🍬', zh: '糖' },
  { id: 'salt', icon: '🧂', zh: '鹽' },
  { id: 'soy', icon: '🫗', zh: '醬油' },
  { id: 'honey', icon: '🍯', zh: '蜂蜜' },
  { id: 'chilipow', icon: '🌶️', zh: '辣椒粉' },
];
export const SEASON_BY_ID = Object.fromEntries(SEASONINGS.map((s) => [s.id, s]));
/** 調味料：5 顆松果一包，一包可以用 5 次（作者 11/19） */
export const SEASON_PRICE = 5;
export const SEASON_USES = 5;
export const SEASON_CAP = 99;
export const POT_MAX = 4;
export const SEASON_MAX = 3;
/** 保冷箱：每種魚最多放幾條 */
export const FISH_KEEP_CAP = 99;
/** 😵 煮失敗（黑暗料理）幾次送「灰頭土臉」造型 */
export const SOOTY_AT = 10;

/** 🧂 口味：一種調味料 → 單一口味；同一種放 3 份 → 誇張版；兩種一樣多 → 混搭口味；三種各一份 → 大雜燴 */
const ONE = { sugar: '台南口味', salt: '海鹽口味', soy: '醬燒口味', honey: '甜蜜蜜口味', chilipow: '麻辣口味' };
const MAX = { sugar: '螞蟻最愛口味', salt: '死鹹口味', soy: '醬油泡澡口味', honey: '蜂蜜淹沒口味', chilipow: '地獄辣口味' };
const PAIR = {
  'soy+sugar': '照燒口味',
  'chilipow+honey': '韓式甜辣口味',
  'chilipow+sugar': '泰式甜辣口味',
  'chilipow+salt': '椒鹽口味',
  'chilipow+soy': '宮保口味',
  'salt+sugar': '鹹甜口味',
  'salt+soy': '古早味',
  'honey+soy': '蜜汁口味',
  'honey+salt': '鹽蜜口味',
  'honey+sugar': '甜上加甜口味',
};
export const FLAVORS = {
  ...Object.fromEntries(Object.entries(ONE).map(([k, v]) => [`s_${k}`, v])),
  ...Object.fromEntries(Object.entries(MAX).map(([k, v]) => [`x_${k}`, v])),
  ...Object.fromEntries(Object.entries(PAIR).map(([k, v]) => [`p_${k.replace('+', '_')}`, v])),
  mix: '大雜燴口味',
};
export const FLAVOR_TOTAL = Object.keys(FLAVORS).length;

/** 調味料 → 口味 id（沒加回傳 ''） */
export function flavorOf(sea = {}) {
  const c = Object.entries(sea)
    .filter(([k, n]) => SEASON_BY_ID[k] && n > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  if (!c.length) return '';
  if (c.length === 1) return c[0][1] >= 3 ? `x_${c[0][0]}` : `s_${c[0][0]}`;
  if (c[0][1] > c[1][1]) return `s_${c[0][0]}`;
  if (c.length === 2) return `p_${[c[0][0], c[1][0]].sort().join('_')}`;
  return 'mix';
}

/**
 * 🔓 解鎖條件（作者 11/19：釣到什麼魚幾次、種什麼菜幾次、烤棉花糖幾次）
 *   fish：某種魚釣到幾次（wal.fc）；crop：某種菜收成幾個（wal.crops）；roast／burnt：烤棉花糖幾次／烤焦幾次（wal.cnt）
 */
export const unlockHave = (w, u) => (u.fish != null ? w?.fc?.[u.fish] ?? 0 : u.crop ? w?.crops?.[u.crop] ?? 0 : w?.cnt?.[u.k] ?? 0);
export const unlockLabel = (u, tr = (s) => s) =>
  u.fish != null
    ? tr('釣到{fish} {n} 次', { fish: FISH[u.fish]?.name ?? '', n: u.n })
    : u.crop
      ? tr('收成{crop} {n} 個', { crop: tr(materialOf(u.crop)?.zh ?? ''), n: u.n })
      : u.k === 'burnt'
        ? tr('把棉花糖烤焦 {n} 次', { n: u.n })
        : tr('烤棉花糖 {n} 次', { n: u.n });

export const POT_RECIPES = [
  // ---- 🐟 魚料理（菜名帶魚的名字，每種魚都算一道）----
  { id: 'grill', icon: '🔥', zh: '炭烤{fish}', need: ['F'], fx: ['fish', 1] },
  { id: 'braise', icon: '🐟', zh: '紅燒{fish}', need: ['F', 'onion', '@veg'], fx: ['fish', 1] },
  { id: 'steam', icon: '♨️', zh: '清蒸{fish}', need: ['F', 'cabbage'], fx: ['fish', 1] },
  { id: 'chips', icon: '🍟', zh: '{fish}炸魚薯條', need: ['F', 'potato'], fx: ['speed', 1] },
  { id: 'fsoup', icon: '🍲', zh: '{fish}蘑菇湯', need: ['F', '@mush'], fx: ['gather', 1] },
  // ---- 🍳 一般 ----
  { id: 'sushi', icon: '🍣', zh: '綜合握壽司', need: ['f*', 'f*', 'cucumber'], fx: ['fish', 2] },
  { id: 'fcurry', icon: '🍛', zh: '鮮魚咖哩', need: ['f*', 'potato', 'carrot', 'onion'], fx: ['fish', 2] },
  { id: 'fruit_salad', icon: '🥗', zh: '繽紛水果沙拉', need: ['@fruit', '@fruit', '@fruit', '@fruit'], fx: ['speed', 2] },
  { id: 'risotto', icon: '🍚', zh: '野菇燉飯', need: ['@mush', '@mush', 'onion'], fx: ['gather', 1] },
  { id: 'ratatouille', icon: '🍆', zh: '普羅旺斯燉菜', need: ['eggplant', 'tomato', 'pepper', 'onion'], fx: ['idle', 2] },
  { id: 'potato_salad', icon: '🥔', zh: '馬鈴薯沙拉', need: ['potato', 'cucumber', 'carrot'], fx: ['speed', 1] },
  { id: 'corn_soup', icon: '🌽', zh: '玉米濃湯', need: ['corn', 'potato', 'onion'], fx: ['idle', 1] },
  { id: 'stuffed_pepper', icon: '🫑', zh: '鑲甜椒', need: ['pepper', '@mush', 'onion'], fx: ['gather', 1] },
  { id: 'jam', icon: '🍯', zh: '花果醬', need: ['@fruit', '@fruit', '@flower'], fx: ['gather', 1] },
  { id: 'garden_salad', icon: '🌼', zh: '花園沙拉', need: ['@flower', '@flower', 'cabbage'], fx: ['speed', 1] },
  { id: 'chestnut_rice', icon: '🌰', zh: '栗子炊飯', need: ['chestnut', '@mush', 'carrot'], fx: ['idle', 1] },
  { id: 'pumpkin_pie', icon: '🥧', zh: '南瓜派', need: ['pumpkin', '@fruit', 'hazelnut'], fx: ['idle', 2] },
  // ---- 🥚 雞蛋、🌾 稻米、🧄 大蒜、🌿 青蔥（11/27 跟小肥雞一起開）----
  { id: 'tomato_egg', icon: '🍳', zh: '番茄炒蛋', need: ['egg', 'tomato'], fx: ['speed', 1], from: '2026-11-27' },
  { id: 'tamagoyaki', icon: '🥚', zh: '玉子燒', need: ['egg', 'egg'], fx: ['idle', 1], from: '2026-11-27' },
  { id: 'egg_soup', icon: '🥣', zh: '蛋花湯', need: ['egg', 'cabbage'], fx: ['gather', 1], from: '2026-11-27' },
  { id: 'omelet', icon: '🍳', zh: '歐姆蛋', need: ['egg', 'tomato', 'onion'], fx: ['speed', 2], from: '2026-11-27' },
  { id: 'pudding', icon: '🍮', zh: '雞蛋布丁', need: ['egg', '@fruit'], fx: ['idle', 1], from: '2026-11-27' },
  { id: 'fried_rice', icon: '🍛', zh: '蛋炒飯', need: ['egg', 'rice', 'scallion'], fx: ['gather', 2], from: '2026-11-27' },
  { id: 'omurice', icon: '🍛', zh: '蛋包飯', need: ['egg', 'rice', 'tomato'], fx: ['speed', 2], from: '2026-11-27' },
  { id: 'onigiri', icon: '🍙', zh: '飯糰', need: ['rice'], fx: ['idle', 1], from: '2026-11-27' },
  { id: 'fish_onigiri', icon: '🍙', zh: '{fish}飯糰', need: ['F', 'rice'], fx: ['fish', 1], from: '2026-11-27' },
  { id: 'scallion_fish', icon: '🐟', zh: '蔥爆{fish}', need: ['F', 'scallion'], fx: ['fish', 1], from: '2026-11-27' },
  { id: 'garlic_fish', icon: '🧄', zh: '蒜香{fish}', need: ['F', 'garlic'], fx: ['fish', 1], from: '2026-11-27' },
  { id: 'garlic_shroom', icon: '🍄', zh: '蒜炒蘑菇', need: ['garlic', '@mush'], fx: ['gather', 1], from: '2026-11-27' },
  { id: 'scallion_pancake', icon: '🥞', zh: '蔥油餅', need: ['scallion', 'scallion', 'egg'], fx: ['speed', 1], from: '2026-11-27' },
  // ---- ❓ 隱藏（顯示 ??? 和提示）----
  { id: 'stargazy', icon: '🥧', zh: '仰望星空派', need: ['f*', 't:telescope'], kind: 'hidden', hint: '任意一條魚＋可以看星星的東西', fx: ['fish', 2] },
  { id: 'king_feast', icon: '👑', zh: '魚王盛宴', need: ['f7', '@veg', '@veg', '@veg'], kind: 'hidden', hint: '魚王＋三種蔬菜', fx: ['fish', 2] },
  { id: 'sakura_chazuke', icon: '🍵', zh: '櫻花鮭魚茶泡飯', need: ['f5', '@flower'], kind: 'hidden', hint: '台灣的國寶魚＋一朵花', fx: ['gather', 2] },
  { id: 'galaxy_jelly', icon: '🌌', zh: '銀河星砂凍', need: ['f14', 'star_sand'], kind: 'hidden', hint: '星空的魚＋星砂', fx: ['idle', 2] },
  { id: 'unicorn_parfait', icon: '🦄', zh: '彩虹獨角魚聖代', need: ['f44', 'gold_berry'], kind: 'hidden', hint: '帶來好運的魚＋金色的果實', fx: ['speed', 2] },
  { id: 'pinecone_bake', icon: '🌰', zh: '焗烤松果魚', need: ['f41', 'acorn', 'hazelnut'], kind: 'hidden', hint: '營地吉祥物魚＋兩種堅果', fx: ['idle', 2] },
  { id: 'panda_bento', icon: '🐼', zh: '熊貓便當', need: ['f40', 'cabbage', 'moon_radish'], kind: 'hidden', hint: '黑白配色的魚＋綠色的菜＋白色的菜', fx: ['gather', 2] },
  { id: 'gold_pudding', icon: '🌟', zh: '黃金布丁', need: ['gold_egg', 'gold_berry'], kind: 'hidden', hint: '很稀有的蛋＋金色的果實', fx: ['speed', 2], from: '2026-11-27' },
  { id: 'shroom_king', icon: '🍄', zh: '菇菇之王鍋', need: ['morel', 'glow_mush', 'lions_mane', 'earthstar'], kind: 'hidden', hint: '四種很難找到的菇', fx: ['gather', 2] },
  // ---- 🔒 解鎖型隱藏食譜（達成條件才煮得出來）----
  { id: 'salmon_set', icon: '🍱', zh: '國寶鮭魚定食', need: ['f5', 'cabbage', 'carrot'], kind: 'unlock', unlock: { fish: 5, n: 5 }, fx: ['fish', 2] },
  { id: 'creek_bites', icon: '🐟', zh: '酥炸小溪哥一口吃', need: ['f0', 'f0', 'f0'], kind: 'unlock', unlock: { fish: 0, n: 30 }, fx: ['speed', 2] },
  { id: 'tilapia_3cup', icon: '🍳', zh: '三杯吳郭魚', need: ['f1', 'onion', 'chili'], kind: 'unlock', unlock: { fish: 1, n: 20 }, fx: ['fish', 2] },
  { id: 'king_sashimi', icon: '🍣', zh: '黃金魚王生魚片', need: ['f7', 'cucumber'], kind: 'unlock', unlock: { fish: 7, n: 3 }, fx: ['fish', 2] },
  { id: 'pumpkin_gratin', icon: '🎃', zh: '南瓜焗烤', need: ['pumpkin', 'potato', '@mush', 'onion'], kind: 'unlock', unlock: { crop: 'pumpkin', n: 20 }, fx: ['idle', 2] },
  { id: 'tomato_fish', icon: '🍅', zh: '番茄燉魚', need: ['tomato', 'tomato', 'f*'], kind: 'unlock', unlock: { crop: 'tomato', n: 30 }, fx: ['fish', 2] },
  { id: 'moon_oden', icon: '🍢', zh: '月光關東煮', need: ['moon_radish', 'f*', '@mush'], kind: 'unlock', unlock: { crop: 'moon_radish', n: 10 }, fx: ['idle', 2] },
  { id: 'smores_pie', icon: '🍫', zh: '營火棉花糖派', need: ['hazelnut', 'chestnut', '@fruit'], kind: 'unlock', unlock: { k: 'roast', n: 30 }, fx: ['speed', 2] },
  { id: 'plush_pie', icon: '🧸', zh: '玩偶棉花糖派', need: ['t:old_plush', '@fruit'], kind: 'unlock', unlock: { k: 'roast', n: 50 }, fx: ['speed', 2] },
  { id: 'charcoal_cake', icon: '⚫', zh: '故意烤焦的焦炭蛋糕', need: ['sweetpotato', '@fruit'], kind: 'unlock', unlock: { k: 'burnt', n: 10 }, fx: ['idle', 1] },
  // ---- 🥾 求生料理（怪東西煮的）----
  { id: 'boiled_boot', icon: '🥾', zh: '水煮牛皮靴', need: ['t:old_boot'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'sock_stew', icon: '🧦', zh: '臭襪燉菇', need: ['t:old_sock', '@mush'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'slipper_fry', icon: '🩴', zh: '洋蔥炒拖鞋', need: ['t:slipper', 'onion'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'can_soup', icon: '🥫', zh: '鋁罐蔬菜湯', need: ['t:can', '@veg'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'bbq_tire', icon: '🛞', zh: '炭烤輪胎', need: ['t:tire'], kind: 'survival', fx: ['burnt', 1] },
  // ---- 🍲 家常：沒有對到食譜、但都是正常食材的時候（不會變黑暗料理）----
  { id: 'stirfry', icon: '🥬', zh: '家常炒時蔬', basic: ['veg', 'mush', 'egg'], need: [], fx: ['speed', 1] },
  { id: 'sweet_soup', icon: '🍧', zh: '花果甜湯', basic: ['fruit', 'flower'], need: [], fx: ['gather', 1] },
  { id: 'homefish', icon: '🐟', zh: '家常煮{fish}', basic: ['veg', 'mush'], fishT: true, need: [], fx: ['fish', 1] },
  // 11/19 作者：怪東西再多 6 樣＋原本的垃圾也能煮（有幾道其實還不錯吃，沒有懲罰）
  { id: 'sponge_cake', icon: '🧽', zh: '真的是海綿的海綿蛋糕', need: ['t:old_sponge', '@fruit'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'yarn_pasta', icon: '🧶', zh: '毛線義大利麵', need: ['t:yarn_ball', 'tomato'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'paper_fish', icon: '📰', zh: '報紙包炸魚', need: ['t:old_newspaper', 'f*'], kind: 'survival', fx: ['fish', 1] },
  { id: 'peel_tea', icon: '🍌', zh: '香蕉皮花茶', need: ['t:banana_peel', '@flower'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'expired_stew', icon: '🥫', zh: '過期罐頭大雜燴', need: ['t:expired_can', '@veg', '@mush'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'coal_potato', icon: '🍠', zh: '烤到全黑的木炭地瓜', need: ['t:charcoal', 'sweetpotato'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'cup_tea', icon: '🥛', zh: '紙杯野花茶', need: ['t:paper_cup', '@flower'], kind: 'survival', fx: ['gather', 1] },
  { id: 'chopstick_skewer', icon: '🥢', zh: '免洗筷蘑菇串', need: ['t:chopsticks', '@mush'], kind: 'survival', fx: ['speed', 1] },
  { id: 'toothpaste_soup', icon: '🪥', zh: '薄荷牙膏口味濃湯', need: ['t:toothbrush', '*'], kind: 'survival', fx: ['burnt', 1] },
  { id: 'dorm_noodle', icon: '🍜', zh: '宿舍加料泡麵', need: ['t:noodle_bowl', '@veg'], kind: 'survival', fx: ['speed', 1] },
];
export const POT_BY_ID = Object.fromEntries(POT_RECIPES.map((r) => [r.id, r]));

/** 💀 黑暗料理：什麼食譜都不是的時候，看鍋子裡放了什麼決定 */
export const DARK = [
  { id: 'bug', icon: '🐛', zh: '蟲蟲蠕動羹' },
  { id: 'stone', icon: '🪨', zh: '真的只有石頭的石頭湯' },
  { id: 'shell', icon: '🐚', zh: '喀滋喀滋貝殼脆片' },
  { id: 'treasure', icon: '💎', zh: '吃了會被詛咒的寶物燉' },
  { id: 'trash', icon: '🗑️', zh: '垃圾桶風味雜燴' },
  { id: 'fishpile', icon: '🐡', zh: '魚頭堆成的小山' },
  { id: 'fruitfish', icon: '🫠', zh: '水果魚湯' },
  { id: 'flowerfish', icon: '🥀', zh: '香到想吐的花瓣醃魚' },
  { id: 'purple', icon: '🟣', zh: '冒泡的紫色糊糊' },
  { id: 'coal', icon: '⚫', zh: '黑到發亮的焦炭' },
  { id: 'potion', icon: '🧪', zh: '不明液體' },
  { id: 'scream', icon: '😱', zh: '會尖叫的濃湯' },
];
export const DARK_BY_ID = Object.fromEntries(DARK.map((d) => [d.id, d]));

/** 把 token 變成材料資料：{ k: 'm'|'f'|'t', id, type, rarity } */
export function parseToken(tok) {
  const [k, id] = String(tok).split(':');
  if (k === 'f') {
    const i = Number(id);
    const f = FISH[i];
    return Number.isInteger(i) && f && !f.junk ? { k, id: i, type: 'fish', rarity: f.rarity } : null;
  }
  if (k === 't') return TRASH_BY_ID[id] ? { k, id, type: 'trash', rarity: TRASH_BY_ID[id].rarity } : null;
  if (k === 'm') {
    const m = materialOf(id);
    return m ? { k, id, type: m.type, rarity: m.rarity ?? 1 } : null;
  }
  return null;
}

/** 一格 need 能不能放這樣材料；回傳分數（越指定分數越高，0 = 不行） */
function slotScore(spec, it) {
  if (spec === '*') return 1; // 任意一樣
  if (spec === 'F' || spec === 'f*') return it.k === 'f' ? 1 : 0;
  if (spec[0] === 'f' && /^f\d+$/.test(spec)) return it.k === 'f' && it.id === Number(spec.slice(1)) ? 3 : 0;
  if (spec.startsWith('t:')) return it.k === 't' && it.id === spec.slice(2) ? 3 : 0;
  if (spec[0] === '@') return it.k === 'm' && it.type === spec.slice(1) ? 1 : 0;
  return it.k === 'm' && it.id === spec ? 3 : 0;
}
/** 材料剛好放滿這個食譜嗎（每格一樣、不多不少）；回傳 { score, fish } 或 null */
function fit(recipe, items) {
  const need = recipe.need;
  if (need.length !== items.length) return null;
  let best = null;
  const used = new Array(items.length).fill(false);
  const go = (si, score, fish) => {
    if (si === need.length) {
      if (!best || score > best.score) best = { score, fish };
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      const s = slotScore(need[si], items[i]);
      if (!s) continue;
      used[i] = true;
      go(si + 1, score + s, need[si] === 'F' ? items[i].id : fish);
      used[i] = false;
    }
  };
  go(0, 0, null);
  return best;
}

/** 💀 黑暗料理挑哪一種 */
function darkOf(items) {
  const has = (ty) => items.some((x) => x.type === ty);
  const fish = items.filter((x) => x.k === 'f').length;
  if (has('bug')) return 'bug';
  if (has('trash')) return 'trash';
  if (has('treasure')) return 'treasure';
  if (has('stone')) return 'stone';
  if (has('shell')) return 'shell';
  if (fish >= 3) return 'fishpile';
  if (fish && has('fruit')) return 'fruitfish';
  if (fish && has('flower')) return 'flowerfish';
  const key = items.map((x) => `${x.k}${x.id}`).sort().join(',');
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['purple', 'coal', 'potion', 'scream'][h % 4];
}

/**
 * 煮煮看會變成什麼（伺服器用這個決定；前端只拿來顯示）
 * @param {string[]} tokens 材料
 * @param {object} sea 調味料
 * @param {object} w 玩家存檔（看解鎖條件）
 * @returns {{ id: string, recipe?: object, dark?: string, locked?: object }}
 */
export function potResult(tokens, sea, w) {
  const items = tokens.map(parseToken);
  if (!items.length || items.length > POT_MAX || items.some((x) => !x)) return null;
  let best = null;
  let locked = null;
  for (const r of POT_RECIPES) {
    if (!isOpen(r)) continue; // 🗓️ 還沒開的食譜
    const f = fit(r, items);
    if (!f) continue;
    const score = f.score + (r.kind === 'hidden' || r.kind === 'unlock' ? 10 : 0);
    if (r.kind === 'unlock' && unlockHave(w, r.unlock) < r.unlock.n) {
      locked ??= r; // 還沒解鎖：煮出來是黑暗料理，但會跟你說「好像差一點點」
      continue;
    }
    if (!best || score > best.score) best = { r, score, fish: f.fish };
  }
  if (!best) {
    // 🍲 家常：都是正常食材（魚料理最多一條魚）就煮成家常菜
    const fishes = items.filter((x) => x.k === 'f');
    const rest = items.filter((x) => x.k !== 'f');
    for (const r of POT_RECIPES) {
      if (!r.basic || (r.fishT ? fishes.length !== 1 || !rest.length : fishes.length)) continue;
      if (!rest.every((x) => x.k === 'm' && r.basic.includes(x.type))) continue;
      const fl = flavorOf(sea);
      const base = r.fishT ? `p.${r.id}.${fishes[0].id}` : `p.${r.id}`;
      return { id: fl ? `${base}~${fl}` : base, recipe: r, locked };
    }
    const d = darkOf(items);
    return { id: `p.d_${d}`, dark: d, locked };
  }
  const fl = flavorOf(sea);
  const base = best.fish != null ? `p.${best.r.id}.${best.fish}` : `p.${best.r.id}`;
  return { id: fl ? `${base}~${fl}` : base, recipe: best.r };
}

/** 料理 id → 料理資料（跟 cooking.js 的 DISHES 長得一樣：{ id, icon, zh, ... }） */
const cache = new Map();
export function potDish(id) {
  if (typeof id !== 'string' || !id.startsWith('p.')) return null;
  if (cache.has(id)) return cache.get(id);
  let d = null;
  const [main, fl = ''] = id.slice(2).split('~');
  if (main.startsWith('d_')) {
    const k = DARK_BY_ID[main.slice(2)];
    if (k && !fl) d = { id, icon: k.icon, zh: k.zh, pot: true, dark: true, base: main, fx: ['burnt', 1], color: 0x6a4a8a };
  } else {
    const [rid, fishS] = main.split('.');
    const r = POT_BY_ID[rid];
    const hasF = !!r && (r.need.includes('F') || !!r.fishT);
    const fi = fishS == null ? null : Number(fishS);
    const okFish = hasF ? Number.isInteger(fi) && FISH[fi] && !FISH[fi].junk : fishS == null;
    if (r && okFish && (!fl || FLAVORS[fl])) {
      // 加了調味料：效果變強一級（求生料理、黑暗料理除外）
      const fx = r.fx[0] === 'burnt' ? r.fx : [r.fx[0], fl ? 2 : r.fx[1]];
      // 稀有魚（★★★★ 以上）做的魚料理也比較強
      if (hasF && FISH[fi].rarity >= 4 && fx[0] !== 'burnt') fx[1] = 2;
      d = { id, icon: r.icon, zh: r.zh, fishI: hasF ? fi : null, fl: fl || null, pot: true, base: hasF ? `${rid}.${fi}` : rid, recipe: rid, kind: r.kind ?? '', fx, color: 0xd88a4a };
    }
  }
  cache.set(id, d);
  return d;
}

/** 料理的名字（tr 是翻譯函式）：紅燒櫻花鉤吻鮭（台南口味） */
export function potName(d, tr = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v?.[k] ?? m)) {
  let s = d.fishI != null ? tr(d.zh, { fish: FISH[d.fishI]?.name ?? '' }) : tr(d.zh);
  if (d.fl) s += tr('（{f}）', { f: tr(FLAVORS[d.fl]) });
  return s;
}
