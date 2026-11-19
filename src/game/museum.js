/**
 * 🏛️ 營地標本櫃（前端、伺服器共用的資料）。
 *
 * - 大家一起把東西捐進標本櫃，每一格寫上「第一個捐的人」
 * - 每個人每天只能捐一件（慢慢一起填滿，不會一下子就滿了）
 * - 分類：迷霧森林的蘑菇、果實、野花、蟲蟲，湖邊的石頭、貝殼，營火寶藏，還有魚拓（釣過的魚）
 *   採集品捐出去會從採集籃拿走一個；魚拓只要釣過那種魚就能捐（魚都放回湖裡了）
 * - 11/19 作者：快滿了 → 擴充（11/20 開）：🥕 菜園蔬菜（捐 1 個收成的）、✨ 異色魚拓（釣過那種的異色魚）、♻️ 怪東西展（捐 1 件垃圾）
 *   12/1 再加 🍳 料理展示、🌟 傳說目擊牆（還沒做）
 */
import { GATHER_ITEMS, GATHER_TYPES } from './gathering.js';
import { FISH } from '../fishing/fishData.js';
import { CROPS } from './garden.js';
import { TRASH } from './trash.js';
import { isOpen } from './dailySpecial.js';

/** 每個人每天能捐幾件 */
export const DONATE_PER_DAY = 1;
/** 11/22 擴充的分類哪天打開 */
export const MUSEUM_MORE = '2026-11-19'; // 作者 11/19：改成跟 11/20 更新一起開

const fishIcon = (f) => (f.legend ? '🐉' : f.rarity >= 5 ? '🐠' : f.rarity >= 4 ? '🐡' : '🐟');
export const MUSEUM_FISH = FISH.map((f, i) => ({ f, i }))
  .filter(({ f }) => !f.junk)
  .map(({ f, i }) => ({ id: `fish_${i}`, fish: i, type: 'fish', icon: fishIcon(f), name: f.name, rarity: Math.min(3, Math.max(1, Math.ceil((f.rarity || 1) / 2))) }));
const MORE = { from: MUSEUM_MORE };
/** 🥕 菜園蔬菜（id 就是蔬菜的 id，捐了從採集籃拿走一個） */
const MUSEUM_VEG = CROPS.map((c) => ({ id: c.id, type: 'veg', icon: c.icon, zh: c.zh, rarity: c.seed <= 1 ? 1 : c.seed <= 2 ? 2 : 3, ...MORE, ...(c.from ? { from: c.from } : {}) }));
/** ✨ 異色魚拓（每月限定的魚沒有算） */
const MUSEUM_SHINY = FISH.map((f, i) => ({ f, i }))
  .filter(({ f }) => !f.junk && !f.month)
  .map(({ f, i }) => ({ id: `shiny_${i}`, fish: i, type: 'shiny', icon: '✨', name: f.name, rarity: 3, ...MORE }));
/** ♻️ 怪東西展（捐了從垃圾袋拿走一件） */
const MUSEUM_TRASH = TRASH.map((x) => ({ id: `trash_${x.id}`, trash: x.id, type: 'trash', icon: x.icon, zh: x.zh, rarity: x.rarity, ...MORE }));

const ALL_CATS = [
  ...GATHER_TYPES.map((x) => ({ id: x.id, icon: x.icon, zh: x.zh })),
  { id: 'fish', icon: '🎣', zh: '魚拓' },
  { id: 'veg', icon: '🥕', zh: '菜園蔬菜', ...MORE },
  { id: 'shiny', icon: '✨', zh: '異色魚拓', ...MORE },
  { id: 'trash', icon: '♻️', zh: '怪東西展', ...MORE },
];
const ALL_ITEMS = [...GATHER_ITEMS.map((x) => ({ ...x })), ...MUSEUM_FISH, ...MUSEUM_VEG, ...MUSEUM_SHINY, ...MUSEUM_TRASH];
/** 現在打開的分類、格子（11/22 前不含新的三類） */
export const museumCats = () => ALL_CATS.filter((x) => isOpen(x));
export const museumItems = () => ALL_ITEMS.filter((x) => isOpen(x));
/** 舊的名字：全部（伺服器查 id 用；能不能捐另外看 isOpen） */
export const MUSEUM_ITEMS = ALL_ITEMS;
export const MUSEUM_CATS = ALL_CATS;
export const MUSEUM_BY_ID = Object.fromEntries(ALL_ITEMS.map((x) => [x.id, x]));
