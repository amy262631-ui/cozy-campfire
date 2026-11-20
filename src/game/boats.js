/**
 * ⛵ 租船（作者 11/19 定案，11/27 開）：前端、伺服器共用的規則
 *   在湖畔碼頭旁的「⛵ 租船」看板按 E：選船 → 付松果 → 從自己的停船位出發
 *   租的人划船；朋友在船旁邊按 E 免費上船；船上每個人都能釣魚（船釣限定魚）
 *   時間到（10 分鐘）每艘船各自回到停船位，大家回到碼頭上
 */
export const BOAT_FROM = '2026-11-27';
export const BOAT_MS = 10 * 60 * 1000;
/** 一個分流的湖上最多幾艘（停船位數量） */
export const BOAT_MAX = 8;
/**
 * 三種船：seats 座位（船的本地座標，未縮放）、scale 放大多少、r 跟別的船／碼頭保持的半徑、y 座位高度（相對水面）
 * ⚠️ id 存在統計裡，不能改
 */
export const BOATS = {
  canoe: { id: 'canoe', icon: '🛶', zh: '小獨木舟', people: 1, price: 15, scale: 1.25, r: 0.9, y: 0.02, seats: [[0, -0.05]] },
  row: { id: 'row', icon: '🚣', zh: '小木船', people: 2, price: 25, scale: 1.3, r: 1.15, y: 0.1, seats: [[0, -0.45], [0, 0.42]] },
  swan: { id: 'swan', icon: '🦢', zh: '天鵝船', people: 4, price: 40, scale: 1.75, r: 1.9, y: 0.45, seats: [[-0.34, -0.72], [0.34, -0.72], [-0.34, 0.12], [0.34, 0.12]] },
};
export const BOAT_LIST = [BOATS.canoe, BOATS.row, BOATS.swan];
/** 🐟 特殊魚飼料（作者 11/20 改）：10 分鐘內等魚上鉤的時間減半（不改稀有魚機率）；在哪裡釣都有效 */
export const FEED_PRICE = 15;
export const FEED_MS = 10 * 60 * 1000;
export const FEED_WAIT = 0.5;
/** 🚣 在船上釣魚：稀有魚稍微多一點 */
export const BOAT_LUCK = 1.3;

/** 湖畔碼頭（跟 lakeRoom.js 一樣） */
export const DOCK_END = -6.2;
/** 停船位：碼頭兩邊、碼頭前面，船頭朝湖心（ry＝π） */
export const BOAT_SLOTS = [
  { x: -2.3, z: -1.2 },
  { x: 2.3, z: -1.2 },
  { x: -2.3, z: -4.0 },
  { x: 2.3, z: -4.0 },
  { x: -2.3, z: -6.8 },
  { x: 2.3, z: -6.8 },
  { x: -1.6, z: -9.6 },
  { x: 1.6, z: -9.6 },
].map((s) => ({ ...s, ry: Math.PI }));
/** 船能划的範圍 */
export const LAKE_BOX = { minX: -17, maxX: 17, minZ: -28, maxZ: -0.2 };
/** 碼頭（船不能穿過去）：x 半寬、z 從碼頭盡頭到岸邊 */
export const DOCK_BOX = { hx: 0.8, minZ: DOCK_END - 0.15, maxZ: 3 };

/** 把船的中心推回湖面上（不穿過碼頭、不上岸）；r＝船的半徑 */
export function keepOnLake(p, r) {
  p.x = Math.max(LAKE_BOX.minX + r, Math.min(LAKE_BOX.maxX - r, p.x));
  p.z = Math.max(LAKE_BOX.minZ + r, Math.min(LAKE_BOX.maxZ - r * 0.6, p.z));
  // 碼頭：當成一個長方形，船的圓碰到就往外推
  const cx = Math.max(-DOCK_BOX.hx, Math.min(DOCK_BOX.hx, p.x));
  const cz = Math.max(DOCK_BOX.minZ, Math.min(DOCK_BOX.maxZ, p.z));
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d = Math.hypot(dx, dz);
  if (d < r) {
    if (d > 1e-4) {
      p.x = cx + (dx / d) * r;
      p.z = cz + (dz / d) * r;
    } else p.x = (p.x >= 0 ? 1 : -1) * (DOCK_BOX.hx + r); // 中心在碼頭上：往比較近的那邊推
  }
  return p;
}

/** 船上第 i 個座位的世界座標（船的中心 x,z、朝向 ry） */
export function seatAt(b, i) {
  const k = BOATS[b.k] ?? BOATS.row;
  const [sx, sz] = k.seats[i] ?? k.seats[0];
  const lx = sx * k.scale;
  const lz = sz * k.scale;
  const c = Math.cos(b.ry);
  const s = Math.sin(b.ry);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c, ry: b.ry };
}
/** 從座位位置反推船的中心（划船的人＝第 0 個座位） */
export function centerFromSeat(kind, x, z, ry, i = 0) {
  const k = BOATS[kind] ?? BOATS.row;
  const [sx, sz] = k.seats[i] ?? k.seats[0];
  const lx = sx * k.scale;
  const lz = sz * k.scale;
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return { x: x - (lx * c + lz * s), z: z - (-lx * s + lz * c) };
}
