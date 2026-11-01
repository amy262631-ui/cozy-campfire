/**
 * 營火河畔的形狀（橢圓形的湖）。純數學資料，前端和伺服器（整點活動的座標）都會用到。
 *   長軸沿著營火外圈的方向，短軸朝向營火。
 */
// 營火的西南側：離石塔花園、營火都留一條好走的路
const ANGLE = -1.95;
const DIST = 8.8;
export const POND = { x: Math.sin(ANGLE) * DIST, z: Math.cos(ANGLE) * DIST, a: 5.8, b: 4.2 };
const L = Math.hypot(POND.x, POND.z);
/** u：從營火往湖心的方向（短軸）；v：沿著外圈的方向（長軸） */
export const POND_U = [POND.x / L, POND.z / L];
export const POND_V = [POND_U[1], -POND_U[0]];

/** 湖的局部座標：沿長軸、沿短軸 */
export function pondLocal(x, z) {
  const dx = x - POND.x;
  const dz = z - POND.z;
  return [dx * POND_V[0] + dz * POND_V[1], dx * POND_U[0] + dz * POND_U[1]];
}

/** 橢圓的「半徑比例」：< 1 在湖裡，= 1 在岸邊 */
export function pondQ(x, z, pad = 0) {
  const [p, q] = pondLocal(x, z);
  return Math.hypot(p / (POND.a + pad), q / (POND.b + pad));
}

export const inPond = (x, z, pad = 0) => pondQ(x, z, pad) < 1;

/** 局部座標 → 世界座標 */
export function pondWorld(p, q) {
  return [POND.x + POND_V[0] * p + POND_U[0] * q, POND.z + POND_V[1] * p + POND_U[1] * q];
}

/** 湖周圍不長樹的空地（給 World 的 clearings 用）：樹不會擋到釣魚和舉魚的視線 */
export const POND_CLEARINGS = [-3.2, 0, 3.2].map((p) => {
  const [x, z] = pondWorld(p, 0);
  return { x, z, r: POND.b + 2.6 };
});
