import { inPond } from './pondShape.js';

/**
 * 整點小活動用到的森林座標（伺服器也會讀這個檔，所以只放純資料）。
 * 都避開了樹、建築、各區入口和營火河畔（見 pondShape.js）。
 */
/** 🏃 燈籠賽跑：依序跑過 1 → 5 號燈籠 */
export const RACE_LANTERNS = [
  { x: 0, z: 9 },
  { x: 9.5, z: 2.5 },
  { x: 3, z: -9.3 },
  { x: -2, z: -10.5 },
  { x: -4.0, z: 4.5 },
];
/** ✨ 找金松果：每場從這些地方隨機挑 5 個藏起來 */
export const HUNT_SPOTS = [
  [0.0, 6.0], [4.0, 15.0], [7.7, 13.4], [4.2, 4.2], [7.4, 7.4], [10.5, 0.0], [15.5, 0.0], [12.0, -5.0],
  [12.3, -9.4], [7.4, -7.4], [4.0, -9.7], [4.0, -15.0], [1.5, -9.5], [0.0, -13.0],
  [-7.7, -13.4], [-5.7, -5.7], [-9.7, -4.0], [-14.3, -5.9], [-5.8, -1.6], [-10.5, 0.0], [-4.8, 3.7],
  [-12.3, 9.4], [-5.9, 14.3],
]
  .map(([x, z]) => ({ x, z }))
  .filter((p) => !inPond(p.x, p.z, 1.2)); // 湖裡和岸邊的不要
export const HUNT_COUNT = 5;
export const HUNT_GAIN = 5;
/** 碰到燈籠／撿到金松果的距離（伺服器會放寬一點，因為位置有延遲） */
export const TOUCH_R = 1.6;

/**
 * 🏃 燈籠賽跑隨機位置（作者 11/24：玩法跟原本一樣，1～5 號燈籠都看得到；只是每場位置不同，有時遠有時近）
 * 從森林裡的地點隨機挑 5 個，相鄰兩盞至少 5 公尺。同一場大家一樣。
 */
// 11/24 檢查過：(4.2,4.2)、(7.4,7.4) 太靠近心願大樹、(7.4,-7.4) 太靠近小屋 → 燈籠不放這三個地方（找金松果照用）
const RACE_SKIP = [[4.2, 4.2], [7.4, 7.4], [7.4, -7.4]];
export const RACE_POOL = [...RACE_LANTERNS, ...HUNT_SPOTS]
  .filter((p, i, a) => a.findIndex((q) => Math.hypot(q.x - p.x, q.z - p.z) < 2) === i)
  .filter((p) => !RACE_SKIP.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 0.5));
export function makeRaceRoute(rand = Math.random) {
  const pick = [];
  for (let tries = 0; pick.length < RACE_LANTERNS.length && tries < 500; tries++) {
    const p = RACE_POOL[Math.floor(rand() * RACE_POOL.length)];
    const prev = pick[pick.length - 1];
    if (pick.includes(p) || (prev && Math.hypot(p.x - prev.x, p.z - prev.z) < 5)) continue;
    pick.push(p);
  }
  return pick.length === RACE_LANTERNS.length ? pick.map((p) => ({ x: p.x, z: p.z })) : RACE_LANTERNS.map((p) => ({ ...p }));
}
