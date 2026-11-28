/**
 * 🚣 划船競速（作者 11/28 定案）：前端、伺服器共用的規則
 *   週末白天 10:30、16:30 的小活動（10 分鐘）：
 *   前 5 分鐘在湖畔碼頭報名（免費）→ 時間到倒數 3、2、1 一起出發
 *   每人一艘免費的比賽小獨木舟（不占租船的 8 個停船位，船跟船互相穿過、不會撞）
 *   繞 4 個浮標兩圈，再衝過終點線（就是出發的那條線）
 *   最快的前三名 15／10／6 🌰，有划到終點的人都 +3 🌰
 */
export const BOAT_RACE = {
  signSec: 5 * 60, // 報名幾秒（伺服器可以用 BRACE_SIGN_SEC 改短，本機測試用）
  countMs: 4000, // 報名結束後幾毫秒出發（倒數 3、2、1）
  speed: 4, // 比賽時大家一樣快（公尺／秒）；不分走路跑步，吃料理加速也不算
  laps: 2,
  cpR: 2.6, // 船的中心離浮標多近算繞到
  finishGain: 3, // 划到終點 +3
  minSec: 18, // 不可能比這更快（防作弊）
  kind: 'canoe', // 比賽船：小獨木舟
};
/** 4 個浮標（逆時針繞：左邊 → 左後 → 右後 → 右邊） */
// 作者 11/28 20:04：起跑線離碼頭的停船位遠一點（不要跟剛租的船疊在一起）→ 起跑線往湖心挪 2.5 公尺，浮標也一起往外挪
export const RACE_BUOYS = [
  { x: -11, z: -18 },
  { x: -7.5, z: -26 },
  { x: 7.5, z: -26 },
  { x: 11, z: -18 },
];
/** 出發／終點線：碼頭前面一條橫線（z 一樣，x 從 -halfW 到 +halfW） */
export const RACE_LINE = { z: -14, halfW: 7 };
/** 依序要碰到的點：浮標×2 圈，最後一個是終點線（{ finish: true }） */
export const RACE_CPS = [...Array.from({ length: BOAT_RACE.laps }, () => RACE_BUOYS).flat().map((p, i) => ({ ...p, i, lap: Math.floor(i / RACE_BUOYS.length) + 1, n: (i % RACE_BUOYS.length) + 1 })), { finish: true, i: BOAT_RACE.laps * RACE_BUOYS.length, x: 0, z: RACE_LINE.z }];
/** 出發位置：終點線後面排成兩排（人多就往後排），船頭朝湖心 */
export function raceGrid(i) {
  const per = 11; // 一排 11 艘、兩排 22 艘（再多就疊在一起，反正比賽船互相穿過）
  const k = i % (per * 2);
  const row = Math.floor(k / per);
  const col = k % per;
  return { x: (col - (per - 1) / 2) * 1.3, z: RACE_LINE.z + 1.2 + row * 1.5, ry: Math.PI };
}
/** 碰到第 i 個點了嗎（x, z＝船的中心；pad＝伺服器多放寬一點） */
export function raceTouch(i, x, z, pad = 0) {
  const c = RACE_CPS[i];
  if (!c) return false;
  if (c.finish) return Math.abs(x) <= RACE_LINE.halfW + pad && z >= RACE_LINE.z - pad && z <= RACE_LINE.z + 3 + pad;
  return Math.hypot(x - c.x, z - c.z) <= BOAT_RACE.cpR + pad;
}
