/**
 * 家具目錄（前端、伺服器共用；這裡只放資料，不放 3D 模型和翻譯）。
 * 伺服器 server/homes.js 直接讀這份，價格、疊放規則只要改這裡。
 *
 *   id     代號（存檔用，不能改）
 *   icon   小圖示
 *   zh     中文名稱（前端用 t() 翻譯）
 *   price  松果價格（禮物家具沒有價格，小舖買不到）
 *   cat    分類（小舖分頁）
 *   疊放：
 *     kind: 'mat'    地墊類：只能鋪在地上，上面可以再放任何家具（地墊除外）
 *     kind: 'small'  小東西：可以直接放地上，也可以放在有 top 的家具上
 *     top: 高度      上面有平台（公尺），可以放「小東西」
 *   walk   可以踩上去（不擋路）
 *   gift   分享禮物：拿到的方式（share / ref1 / ref5）
 */
export const FURNITURE_CATS = [
  { id: 'rug', icon: '🟫', zh: '地墊' },
  { id: 'sit', icon: '🛋️', zh: '坐臥' },
  { id: 'table', icon: '🗄️', zh: '桌櫃' },
  { id: 'light', icon: '💡', zh: '燈光' },
  { id: 'plant', icon: '🪴', zh: '植物' },
  { id: 'toy', icon: '🧸', zh: '玩偶' },
  { id: 'deco', icon: '🍰', zh: '小物' },
];

export const FURNITURE_CATALOG = [
  // ---- 地墊 ----
  { id: 'rug', icon: '🟫', zh: '小地毯', price: 5, cat: 'rug', kind: 'mat', top: 0.025, walk: true },
  { id: 'roundrug', icon: '🔵', zh: '圓點地毯', price: 6, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  { id: 'grassmat', icon: '🌼', zh: '小花草皮', price: 7, cat: 'rug', kind: 'mat', top: 0.03, walk: true },
  { id: 'heartrug', icon: '💗', zh: '愛心地墊', price: 9, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  { id: 'pawrug', icon: '🐾', zh: '貓掌地毯', price: 10, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  // ---- 坐臥 ----
  { id: 'cushion', icon: '🟠', zh: '坐墊', price: 6, cat: 'sit', walk: true },
  { id: 'pouf', icon: '🍩', zh: '甜甜圈坐墊', price: 8, cat: 'sit', walk: true },
  { id: 'stool', icon: '🍄', zh: '蘑菇凳', price: 9, cat: 'sit', top: 0.32 },
  { id: 'beanbag', icon: '🫘', zh: '懶骨頭', price: 14, cat: 'sit' },
  { id: 'catbed', icon: '🐈', zh: '貓咪窩', price: 16, cat: 'sit' },
  { id: 'rocking', icon: '🪑', zh: '小搖椅', price: 20, cat: 'sit' },
  { id: 'sofa', icon: '🛋️', zh: '雙人小沙發', price: 28, cat: 'sit' },
  { id: 'bed', icon: '🛏️', zh: '睡鋪', price: 30, cat: 'sit', top: 0.235 },
  // ---- 桌櫃 ----
  { id: 'crate', icon: '📦', zh: '木箱', price: 6, cat: 'table', top: 0.36 },
  { id: 'stump', icon: '🌲', zh: '樹墩邊桌', price: 8, cat: 'table', top: 0.33 },
  { id: 'table', icon: '🪵', zh: '小矮桌', price: 10, cat: 'table', top: 0.325 },
  { id: 'roundtable', icon: '⚪', zh: '圓茶几', price: 12, cat: 'table', top: 0.4 },
  { id: 'drawer', icon: '🗄️', zh: '粉彩斗櫃', price: 16, cat: 'table', top: 0.54 },
  { id: 'desk', icon: '✏️', zh: '小書桌', price: 20, cat: 'table', top: 0.56 },
  { id: 'bookshelf', icon: '📚', zh: '書架', price: 20, cat: 'table', top: 0.915 },
  { id: 'fridge', icon: '🧊', zh: '小冰箱', price: 25, cat: 'table', top: 0.66 },
  // ---- 燈光 ----
  { id: 'candles', icon: '🕯️', zh: '蠟燭組', price: 6, cat: 'light', kind: 'small' },
  { id: 'oillamp', icon: '🪔', zh: '煤油燈', price: 10, cat: 'light', kind: 'small' },
  { id: 'lamp', icon: '💡', zh: '檯燈', price: 12, cat: 'light', kind: 'small' },
  { id: 'mushlamp', icon: '✨', zh: '蘑菇夜燈', price: 12, cat: 'light', kind: 'small' },
  { id: 'starlamp', icon: '⭐', zh: '星星燈', price: 14, cat: 'light', kind: 'small' },
  { id: 'moonlamp', icon: '🌙', zh: '月亮燈', price: 16, cat: 'light', kind: 'small' },
  { id: 'jar', icon: '🫙', zh: '螢火蟲燈罐', price: 18, cat: 'light', kind: 'small' },
  // ---- 植物 ----
  { id: 'succulent', icon: '🌱', zh: '多肉小盆', price: 6, cat: 'plant', kind: 'small' },
  { id: 'cactus', icon: '🌵', zh: '仙人掌', price: 7, cat: 'plant', kind: 'small' },
  { id: 'plant', icon: '🪴', zh: '盆栽', price: 8, cat: 'plant', kind: 'small' },
  { id: 'tulips', icon: '🌷', zh: '鬱金香', price: 8, cat: 'plant', kind: 'small' },
  { id: 'sunflower', icon: '🌻', zh: '向日葵', price: 9, cat: 'plant', kind: 'small' },
  { id: 'bonsai', icon: '🌳', zh: '小盆景', price: 12, cat: 'plant', kind: 'small' },
  { id: 'monstera', icon: '🌿', zh: '大龜背芋', price: 16, cat: 'plant' },
  // ---- 玩偶 ----
  { id: 'chick', icon: '🐥', zh: '小雞玩偶', price: 10, cat: 'toy', kind: 'small' },
  { id: 'frog', icon: '🐸', zh: '青蛙玩偶', price: 12, cat: 'toy', kind: 'small' },
  { id: 'whale', icon: '🐳', zh: '鯨魚抱枕', price: 12, cat: 'toy', kind: 'small' },
  { id: 'teddy', icon: '🧸', zh: '小熊玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'bunny', icon: '🐰', zh: '兔兔玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'penguin', icon: '🐧', zh: '企鵝玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'dino', icon: '🦕', zh: '恐龍玩偶', price: 16, cat: 'toy', kind: 'small' },
  { id: 'bigbear', icon: '🐻', zh: '大熊抱枕', price: 26, cat: 'toy' },
  // ---- 小物 ----
  { id: 'mug', icon: '☕', zh: '馬克杯', price: 3, cat: 'deco', kind: 'small' },
  { id: 'books', icon: '📖', zh: '一疊書', price: 5, cat: 'deco', kind: 'small' },
  { id: 'honey', icon: '🍯', zh: '蜂蜜罐', price: 5, cat: 'deco', kind: 'small' },
  { id: 'pumpkin', icon: '🎃', zh: '小南瓜', price: 6, cat: 'deco', kind: 'small' },
  { id: 'basket', icon: '🧺', zh: '野餐籃', price: 7, cat: 'deco', kind: 'small' },
  { id: 'clock', icon: '⏰', zh: '小鬧鐘', price: 7, cat: 'deco', kind: 'small' },
  { id: 'cake', icon: '🍰', zh: '草莓蛋糕', price: 8, cat: 'deco', kind: 'small' },
  { id: 'teapot', icon: '🫖', zh: '茶壺組', price: 9, cat: 'deco', kind: 'small' },
  { id: 'globe', icon: '🌍', zh: '地球儀', price: 12, cat: 'deco', kind: 'small' },
  { id: 'radio', icon: '📻', zh: '收音機', price: 13, cat: 'deco', kind: 'small' },
  { id: 'frame', icon: '🖼️', zh: '相框', price: 15, cat: 'deco', kind: 'small' },
  { id: 'fishbowl', icon: '🐠', zh: '金魚缸', price: 15, cat: 'deco', kind: 'small' },
  { id: 'crystal', icon: '🔮', zh: '水晶球', price: 16, cat: 'deco', kind: 'small' },
  { id: 'chime', icon: '🎐', zh: '風鈴架', price: 12, cat: 'deco' },
  { id: 'easel', icon: '🎨', zh: '小畫架', price: 18, cat: 'deco' },
  { id: 'guitar', icon: '🎸', zh: '木吉他', price: 20, cat: 'deco' },
  { id: 'stove', icon: '🔥', zh: '小暖爐', price: 22, cat: 'deco' },
  // ---- 🎁 分享禮物（小舖買不到） ----
  { id: 'postcard', icon: '📮', zh: '營火明信片牆', cat: 'deco', gift: 'share' },
  { id: 'foxlamp', icon: '🏮', zh: '狐狸提燈', cat: 'light', kind: 'small', gift: 'ref1' },
  { id: 'telescope', icon: '🔭', zh: '星空望遠鏡', cat: 'deco', gift: 'ref5' },
];

export const CATALOG_BY_ID = Object.fromEntries(FURNITURE_CATALOG.map((f) => [f.id, f]));

/** 能不能把 id 放在 belowId 上面（belowId 為空＝空格子，什麼都能放） */
export function canStackOn(belowId, id) {
  const f = CATALOG_BY_ID[id];
  if (!f) return false;
  if (!belowId) return true;
  const b = CATALOG_BY_ID[belowId];
  if (!b?.top) return false;
  if (b.kind === 'mat') return f.kind !== 'mat';
  return f.kind === 'small';
}

/** 某一格的家具，從下到上排好（舊存檔沒有 l，當作 0） */
export const stackAt = (items, x, z) =>
  (items ?? []).filter((it) => it.x === x && it.z === z).sort((a, b) => (a.l ?? 0) - (b.l ?? 0));

/** 一疊家具裡，第 level 層的底部高度 */
export function stackY(stack, level) {
  let y = 0;
  for (let k = 0; k < level && k < stack.length; k++) y += CATALOG_BY_ID[stack[k].i]?.top ?? 0;
  return y;
}

// ---------- 帳篷擴建 ----------
/** 帳篷地板一開始 6×6 格，用松果一次擴一圈，最大 10×10 */
export const GRID_BASE = 6;
export const GRID_MAX = 10;
/** 擴建到 N×N 要多少松果（一次比一次貴） */
export const EXPAND_PRICES = { 7: 40, 8: 70, 9: 110, 10: 160 };
export const gridOf = (home) => Math.min(GRID_MAX, Math.max(GRID_BASE, Math.floor(Number(home?.grid) || GRID_BASE)));
/** 下一次擴建的價格（已經最大了回傳 null） */
export const expandPrice = (home) => EXPAND_PRICES[gridOf(home) + 1] ?? null;
/** 帳篷裡最多擺幾件（格子數＋疊放的額外空間） */
export const maxItems = (grid) => grid * grid + 24;
/** 每一格最多疊幾層（地墊＋家具＋小東西） */
export const MAX_STACK = 3;
