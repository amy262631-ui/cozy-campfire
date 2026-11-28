import { inPond } from './pondShape.js';
import { snowmanOn, SNOWMAN_POS } from './xmasEvent.js';
import { GATHER_SPOTS } from './gathering.js';

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
// 作者 11/28 晚：「找金松果可以多一些＋迷霧森林也有」→ 一場 10 顆：營火森林 7 顆＋迷霧森林 3 顆（以前營火森林 5 顆）
export const HUNT_COUNT = 7; // 營火森林
export const HUNT_MIST = 3; // 🍄 迷霧森林
/**
 * 🍄 迷霧森林的金松果放哪：迷霧森林的樹是隨機長的（伺服器不知道在哪），但採集點旁邊保證沒有樹
 *   → 用採集點的位置，往森林中心挪 0.6 公尺（不要正好疊在採集圈上）
 */
export const MIST_HUNT_SPOTS = GATHER_SPOTS.filter((p) => p.room === 'mist_forest').map((p) => {
  const d = Math.hypot(p.x, p.z) || 1;
  return { x: +(p.x - (p.x / d) * 0.6).toFixed(2), z: +(p.z - (p.z / d) * 0.6).toFixed(2) };
});
/** 這一場金松果什麼時候冒出來（開始後第幾秒）：全部排在前 7 分鐘內，不管有沒有被找到都會照時間冒（以前要等上一顆被找到才冒，常常冒不完） */
export const huntShowTimes = (n, rand = Math.random) => Array.from({ length: n }, (_, i) => 20 + i * 44 + rand() * 12);
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
/**
 * ⛄ 作者 11/28 問「雪人會不會跟跑步隨機點打架」：雪人（12/25～1/6）旁邊 1.5 公尺有一個點 (-5.9, 14.3)，
 * 燈籠／金松果會半埋在雪堆裡 → 雪人在的那幾天，雪人 3 公尺內的點都不用。day＝台灣日期 'YYYY-MM-DD'
 */
const twDay = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
export const spotFree = (p, day = twDay()) => !(snowmanOn(day) && Math.hypot(p.x - SNOWMAN_POS.x, p.z - SNOWMAN_POS.z) < 3);
export function makeRaceRoute(rand = Math.random, day) {
  const pool = RACE_POOL.filter((p) => spotFree(p, day));
  const pick = [];
  for (let tries = 0; pick.length < RACE_LANTERNS.length && tries < 500; tries++) {
    const p = pool[Math.floor(rand() * pool.length)];
    const prev = pick[pick.length - 1];
    if (pick.includes(p) || (prev && Math.hypot(p.x - prev.x, p.z - prev.z) < 5)) continue;
    pick.push(p);
  }
  return pick.length === RACE_LANTERNS.length ? pick.map((p) => ({ x: p.x, z: p.z })) : RACE_LANTERNS.map((p) => ({ ...p }));
}
