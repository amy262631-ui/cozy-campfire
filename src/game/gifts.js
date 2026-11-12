/**
 * 🎁 送禮給好友（11/07 作者確認，前端、伺服器共用）
 *
 * - 互為好友才能送；送的人要有帳號、玩滿 7 天（防止開小帳洗東西）；同一個網路也可以送
 * - 每個人每天「收到」的禮物，總價值最多 50 松果（價值照下面的 value 算）
 * - 依「分類」設計：採集、蔬菜、回收材料、料理、家具。圖鑑之後新加的東西自動可以送，不用另外登記
 * - 送出的東西會從自己身上拿走，直接放進對方的採集籃／料理／帳篷背包，並在密頻留一句「🎁 送你⋯」
 */
import { GATHER_BY_ID } from './gathering.js';
import { CROP_BY_ID } from './garden.js';
import { TRASH_BY_ID } from './trash.js';
import { DISH_BY_ID } from './cooking.js';
import { CATALOG_BY_ID } from './furnitureCatalog.js';

export const GIFT_DAILY_CAP = 50; // 每人每天收禮總價值上限（松果）
export const GIFT_MIN_DAYS = 0; // 送禮的人要玩滿幾天（作者 11/12：加好友就能送，不用等 7 天）
export const GIFT_SEND_MAX = 20; // 每人每天最多送幾次（防洗版）
export const GIFT_MAX_N = 10; // 一次最多送幾個

export const GIFT_CATS = [
  { id: 'gather', icon: '🍄', zh: '採集' },
  { id: 'veg', icon: '🥕', zh: '蔬菜' },
  { id: 'trash', icon: '♻️', zh: '回收材料' },
  { id: 'dish', icon: '🍲', zh: '料理' },
  { id: 'furn', icon: '🪑', zh: '家具' },
];

/** 這個東西能不能送、值多少松果：{ icon, zh, value } 或 null */
export function giftInfo(cat, id) {
  if (cat === 'gather') {
    const x = GATHER_BY_ID[id];
    return x ? { icon: x.icon, zh: x.zh, value: [0, 1, 3, 8][x.rarity] ?? 1 } : null;
  }
  if (cat === 'veg') {
    const x = CROP_BY_ID[id];
    return x ? { icon: x.icon, zh: x.zh, value: (x.seed ?? 1) + 1 } : null;
  }
  if (cat === 'trash') {
    const x = TRASH_BY_ID[id];
    return x ? { icon: x.icon, zh: x.zh, value: [0, 1, 2, 5][x.rarity] ?? 1 } : null;
  }
  if (cat === 'dish') {
    const x = DISH_BY_ID[id];
    return x ? { icon: x.icon, zh: x.zh, value: x.big ? 10 : 5 } : null;
  }
  if (cat === 'furn') {
    const x = CATALOG_BY_ID[id];
    if (!x || x.gift || x.pass || x.box) return null; // 分享禮物家具不能轉送；🎫 月票家具、🎁 限定禮盒家具也不能送（作者 11/09：保持專屬）
    return { icon: x.icon, zh: x.zh, value: x.price ?? 10 }; // 手作家具算 10
  }
  return null;
}

/** 採集籃裡的東西是哪一類（gather／veg／trash） */
export const basketCat = (id) => (GATHER_BY_ID[id] ? 'gather' : CROP_BY_ID[id] ? 'veg' : TRASH_BY_ID[id] ? 'trash' : null);
