/**
 * 帳號與「我的帳篷」的資料規則（伺服器端）。
 *
 * 帳號（選填）：帳號＋密碼 → 對應到一個訪客代號（vid）。松果、帳篷、家具都記在 vid 底下，
 * 所以登入之後，換手機、換電腦都會回來。密碼用 scrypt 加鹽雜湊，不存原始密碼。
 */
import crypto from 'node:crypto';

import { FURNITURE_CATALOG, CATALOG_BY_ID, canStackOn, stackAt, gridOf, expandPrice, maxItems, MAX_STACK, GRID_BASE, moveStack } from '../src/game/furnitureCatalog.js';

/** 家具價格（資料在 src/game/furnitureCatalog.js，前後端共用） */
export const SHOP = {
  tent: 30,
  ...Object.fromEntries(FURNITURE_CATALOG.filter((f) => !f.gift && !f.craft).map((f) => [f.id, f.price])),
};
export { gridOf, expandPrice, maxItems, canStackOn, stackAt, MAX_STACK, CATALOG_BY_ID, moveStack };

// ---------- 帳號 ----------
const NAME_RE = /^[\p{L}\p{N}_]{3,16}$/u;

export function hashPassword(pass, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pass), salt, 64).toString('hex');
  return { salt, hash };
}

export function checkPassword(pass, rec) {
  const { hash } = hashPassword(pass, rec.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(rec.hash, 'hex'));
}

/** 檢查帳號密碼格式，錯誤時回傳原因代碼 */
export function validateCredentials(user, pass) {
  if (!NAME_RE.test(String(user ?? ''))) return 'badName';
  if (String(pass ?? '').length < 6 || String(pass).length > 64) return 'badPass';
  return null;
}

// ---------- 帳篷 ----------
/** 帳篷風格（免費切換；跟 src/game/tentStyles.js 一致） */
export const TENT_STYLES = new Set(['classic', 'forest', 'stripe', 'night', 'sakura', 'redspot', 'rainbow', 'patch']);
/** 🎁 分享禮物（小舖買不到）：id → 怎麼拿到（share＝分享一次；refN＝N 位朋友透過連結來玩） */
export const GIFTS = { postcard: 'share', foxlamp: 'ref1', rainbow: 'ref3', telescope: 'ref5' };
export const GIFT_FURNITURE = new Set(FURNITURE_CATALOG.filter((f) => f.gift).map((f) => f.id));
/** 帳篷造型：價格（鐘形帳買帳篷就有）、剛買下時換上的花色（跟 src/game/tentShapes.js 一致） */
export const TENT_SHAPES = {
  bell: { price: 0 },
  aframe: { price: 15, style: 'forest' },
  dome: { price: 20, style: 'night' },
  yurt: { price: 25, style: 'classic' },
  circus: { price: 35, style: 'stripe' },
  mushroom: { price: 40, style: 'redspot' },
};

/** 帳篷的公開代號：不能把 vid（等同登入憑證）給別人看，所以給雜湊過的代號 */
export const homeId = (vid) => crypto.createHash('sha256').update(`cozy-home:${vid}`).digest('base64url').slice(0, 12);

export function newHome() {
  return { tent: false, inv: {}, items: [], open: true };
}

/** 背包裡某樣家具還有幾個沒擺出來 */
export function available(home, id) {
  const placed = home.items.filter((x) => x.i === id).length;
  return (home.inv[id] ?? 0) - placed;
}

export function cellFree(home, x, z) {
  return !home.items.some((it) => it.x === x && it.z === z);
}

/** 格子在不在這頂帳篷的地板上（擴建過的帳篷格子比較多） */
export const validCell = (x, z, grid = GRID_BASE) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < grid && z < grid;

/**
 * 在 (x, z) 這一格最上面再放一件 id，可以的話回傳新的層數，不行回傳原因代碼。
 */
export function stackCheck(home, x, z, id) {
  const stack = stackAt(home.items, x, z);
  if (stack.length >= MAX_STACK) return { reason: 'stackFull' };
  const below = stack[stack.length - 1]?.i ?? null;
  if (!canStackOn(below, id)) return { reason: below ? 'noStack' : 'taken' };
  return { l: stack.length };
}

/**
 * 擴建帳篷：地板往外多一圈。原本的家具跟著平移到新地板的中間（左、前各多一格就往右下挪一格），
 * 外圍只多一格的那一邊交替（偶數→奇數往右下、奇數→偶數不動），讓家具一直留在帳篷中央附近。
 */
export function expandHome(home) {
  const g = gridOf(home);
  const next = g + 1;
  const shift = g % 2 === 0 ? 1 : 0;
  for (const it of home.items) {
    it.x += shift;
    it.z += shift;
  }
  home.grid = next;
  return next;
}
