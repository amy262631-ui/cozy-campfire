/**
 * 帳號與「我的帳篷」的資料規則（伺服器端）。
 *
 * 帳號（選填）：帳號＋密碼 → 對應到一個訪客代號（vid）。松果、帳篷、家具都記在 vid 底下，
 * 所以登入之後，換手機、換電腦都會回來。密碼用 scrypt 加鹽雜湊，不存原始密碼。
 */
import crypto from 'node:crypto';

/** 家具價格（與前端 src/game/furniture.js 相同） */
export const SHOP = {
  tent: 30,
  rug: 5,
  cushion: 6,
  plant: 8,
  table: 10,
  lamp: 12,
  teddy: 14,
  frame: 15,
  jar: 18,
  bookshelf: 20,
  stove: 22,
  fridge: 25,
  bed: 30,
};
export const GRID = 6; // 帳篷地板 6×6 格
export const MAX_ITEMS = 36;

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
export const GIFT_FURNITURE = new Set(['postcard', 'foxlamp', 'telescope']);
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

export const validCell = (x, z) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < GRID && z < GRID;
