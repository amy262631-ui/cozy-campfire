/**
 * 🏛️ 營地標本櫃（前端、伺服器共用的資料）。
 *
 * - 大家一起把東西捐進標本櫃，每一格寫上「第一個捐的人」
 * - 每個人每天只能捐一件（慢慢一起填滿，不會一下子就滿了）
 * - 分類：迷霧森林的蘑菇、果實、野花、蟲蟲，湖邊的石頭、貝殼，營火寶藏，還有魚拓（釣過的魚）
 *   採集品捐出去會從採集籃拿走一個；魚拓只要釣過那種魚就能捐（魚都放回湖裡了）
 */
import { GATHER_ITEMS, GATHER_TYPES } from './gathering.js';
import { FISH } from '../fishing/fishData.js';

/** 每個人每天能捐幾件 */
export const DONATE_PER_DAY = 1;

const fishIcon = (f) => (f.legend ? '🐉' : f.rarity >= 5 ? '🐠' : f.rarity >= 4 ? '🐡' : '🐟');
export const MUSEUM_FISH = FISH.map((f, i) => ({ f, i }))
  .filter(({ f }) => !f.junk)
  .map(({ f, i }) => ({ id: `fish_${i}`, fish: i, type: 'fish', icon: fishIcon(f), name: f.name, rarity: Math.min(3, Math.max(1, Math.ceil((f.rarity || 1) / 2))) }));

export const MUSEUM_CATS = [...GATHER_TYPES.map((x) => ({ id: x.id, icon: x.icon, zh: x.zh })), { id: 'fish', icon: '🎣', zh: '魚拓' }];
/** 標本櫃全部的格子（順序＝櫃子上的位置） */
export const MUSEUM_ITEMS = [...GATHER_ITEMS.map((x) => ({ ...x })), ...MUSEUM_FISH];
export const MUSEUM_BY_ID = Object.fromEntries(MUSEUM_ITEMS.map((x) => [x.id, x]));
