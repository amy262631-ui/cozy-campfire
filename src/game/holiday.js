/**
 * 🎉 假日活動（作者 11/22 看過示意圖）：任務本「🎉 假日」分頁。前端、伺服器共用。
 *
 * - 四週輪一次（作者 11/22：再多設計兩個週末）：
 *   第 1 週（11/28、29）　週六 🧹 營地大掃除、週日 🥚 雞蛋節
 *   第 2 週（12/5、6）　　週六 🎣 釣魚大會、週日 🍳 營火料理日
 *   第 3 週（12/12、13）　週六 🍄 森林尋寶日、週日 🪨 河畔同樂日
 *   第 4 週（12/19、20）　週六 🎲 桌遊同樂會、週日 💌 交朋友日
 *   台北時間 10:00～18:00
 * - 全營地一起的目標（三段：前兩段有參加的人 +10 🌰，最後一段送主題獎盃）
 * - 自己的 3 題（每題 +5 🌰，3 題都做完送主題小家具）
 * - 整點小高潮：整點 5 分鐘內做的算 2 倍（大掃除還會多冒一波垃圾）；雞蛋節＝整點冒一顆大金蛋，先找到的 +20 🌰
 */
import { taipeiDay } from './dailySpecial.js';

export const HOLIDAY_FROM = '2026-11-28'; // 第一場：11/28（六）
export const HOL_START = 10;
/** 特別場（作者 11/22：今天推上去馬上開一場營地大掃除，開到晚上 10 點；人少，目標放低。不要雞蛋節：晚上才上線的人來不及等雞下蛋） */
export const HOL_SPECIAL = {
  '2026-11-22': { id: 'clean', end: 22, goal: 150, steps: [50, 100, 150] },
  // 作者 11/28：大掃除目標改 500，但今天這場已經用 300 達成了 → 今天維持 300（不然進度條會怪）
  '2026-11-28': { id: 'clean', end: 18, goal: 300, steps: [100, 200, 300] },
  // 🎄 聖誕 4 天活動的最後兩天（作者 11/24）：交換禮物，開到晚上 10 點
  '2026-12-26': { id: 'xgift', end: 22 },
  '2026-12-27': { id: 'xgift', end: 22 },
};
/** 🎄 這天之後的假日輪替往後挪一週（作者 11/24：12/26、27 原本輪到大掃除／雞蛋節，改成聖誕活動） */
export const HOL_SHIFT_FROM = '2026-12-26';
export const HOL_END = 18;
export const HOL_TASK_GAIN = 5;
export const HOL_STEP_GAIN = 10;
export const HOL_GOLD_GAIN = 20;
export const HOL_PEAK_MIN = 5;

export const HOLIDAYS = {
  clean: {
    id: 'clean',
    wd: 6,
    week: 0,
    icon: '🧹',
    zh: '營地大掃除',
    goal: { ev: 'trash', n: 500, zh: '全營地一起：撿 {n} 個垃圾', steps: [170, 340, 500], late: 5 }, // 作者 11/28：300 白天就達成 → 500
    tasks: [
      { id: 'hc_trash', icon: '♻️', zh: '撿 10 個垃圾', ev: 'trash', n: 10 },
      { id: 'hc_recycle', icon: '🗑️', zh: '丟一次回收桶', ev: 'recycle', n: 1 },
      { id: 'hc_wood', icon: '🪵', zh: '幫營火添柴 5 次', ev: 'wood', n: 5 },
    ],
    furn: 'q_broom',
    trophy: 'q_tro_clean',
    peak: '⏰ 整點小高潮：每到整點，湖邊和營地冒出一波垃圾（5 分鐘內撿的算 2 個）',
  },
  egg: {
    id: 'egg',
    wd: 0,
    week: 0,
    icon: '🥚',
    zh: '雞蛋節',
    goal: { ev: 'hegg', n: 350, zh: '全營地一起：找到 {n} 顆彩蛋', steps: [120, 240, 350], late: 3 }, // 作者 11/28：200 → 350
    tasks: [
      { id: 'he_hunt', icon: '🥚', zh: '找到 5 顆彩蛋', ev: 'hegg', n: 5, hint: '營火廣場、湖邊、帳篷營地都有藏' },
      { id: 'he_cook', icon: '🍳', zh: '煮一道料理', ev: 'cook3', n: 1 }, // 作者 11/22：不要一定要雞蛋（沒養雞、晚上才上線的人來不及）
      { id: 'he_gift', icon: '🎁', zh: '送朋友一個禮物', ev: 'gift', n: 1 },
    ],
    furn: 'q_eggbasket',
    trophy: 'q_tro_eggfest',
    peak: '⏰ 整點小高潮：每到整點冒出 1 顆 🌟 大金蛋，先找到的人 +20 🌰',
  },
  fish: {
    id: 'fish',
    wd: 6,
    week: 1,
    icon: '🎣',
    zh: '釣魚大會',
    goal: { ev: 'fish', n: 400, zh: '全營地一起：釣 {n} 條魚', steps: [150, 300, 400], late: 3 },
    tasks: [
      { id: 'hf_fish', icon: '🐟', zh: '釣 10 條魚', ev: 'fish', n: 10 },
      { id: 'hf_rare', icon: '⭐', zh: '釣到一條 ★3 以上的魚', ev: 'fishRare', n: 1 },
      { id: 'hf_duck', icon: '🦆', zh: '在營火河畔餵小鴨', ev: 'duck', n: 1 },
    ],
    furn: 'q_rodrack',
    trophy: 'q_tro_fishfest',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內釣到的魚算 2 條',
  },
  cook: {
    id: 'cook',
    wd: 0,
    week: 1,
    icon: '🍳',
    zh: '營火料理日',
    goal: { ev: 'cook3', n: 150, zh: '全營地一起：煮 {n} 道料理', steps: [50, 100, 150], late: 1 },
    tasks: [
      { id: 'hk_cook', icon: '🍲', zh: '煮 3 道料理', ev: 'cook3', n: 3 },
      { id: 'hk_gather', icon: '🍄', zh: '採集 10 次', ev: 'gather', n: 10 },
      { id: 'hk_dine', icon: '🍽️', zh: '在朋友家的餐桌吃一份料理', ev: 'dine', n: 1 },
    ],
    furn: 'q_minipot',
    trophy: 'q_tro_cookday',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內煮的料理算 2 道',
  },
  forest: {
    id: 'forest',
    wd: 6,
    week: 2,
    icon: '🍄',
    zh: '森林尋寶日',
    goal: { ev: 'gather', n: 500, zh: '全營地一起：採集 {n} 次', steps: [150, 300, 500], late: 5 },
    tasks: [
      { id: 'hm_gather', icon: '🌼', zh: '採集 15 次', ev: 'gather', n: 15 },
      { id: 'hm_mush', icon: '🍄', zh: '在迷霧森林採到蘑菇', ev: 'mistMush', n: 1 },
      { id: 'hm_bug', icon: '🐞', zh: '抓到蟲', ev: 'bug', n: 1 },
    ],
    furn: 'q_mushlamp',
    trophy: 'q_tro_forest',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內採集算 2 次',
  },
  river: {
    id: 'river',
    wd: 0,
    week: 2,
    icon: '🪨',
    zh: '河畔同樂日',
    goal: { ev: 'wood', n: 300, zh: '全營地一起：幫營火添柴 {n} 次', steps: [100, 200, 300], late: 5 },
    tasks: [
      { id: 'hr_skip', icon: '🪨', zh: '打水漂打出 5 下以上', ev: 'skip5', n: 1 },
      { id: 'hr_duck', icon: '🦆', zh: '在營火河畔餵小鴨', ev: 'duck', n: 1 },
      { id: 'hr_wood', icon: '🪵', zh: '幫營火添柴 5 次', ev: 'wood', n: 5 },
    ],
    furn: 'q_stonejar',
    trophy: 'q_tro_river',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內添的柴算 2 次',
  },
  game: {
    id: 'game',
    wd: 6,
    week: 3,
    icon: '🎲',
    zh: '桌遊同樂會',
    goal: { ev: 'bgame', n: 80, zh: '全營地一起：玩 {n} 局營火桌遊', steps: [25, 50, 80], late: 1 },
    tasks: [
      { id: 'hg_play', icon: '🎲', zh: '玩 2 局營火桌遊', ev: 'bgame', n: 2 },
      { id: 'hg_wood', icon: '🪵', zh: '幫營火添柴 3 次', ev: 'wood', n: 3 },
      { id: 'hg_gather', icon: '🌼', zh: '採集 5 次', ev: 'gather', n: 5 },
    ],
    furn: 'q_dice',
    trophy: 'q_tro_game',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內玩的桌遊算 2 局',
  },
  friend: {
    id: 'friend',
    wd: 0,
    week: 3,
    icon: '💌',
    zh: '交朋友日',
    goal: { ev: 'gift', n: 80, zh: '全營地一起：送出 {n} 個禮物', steps: [25, 50, 80], late: 1 },
    tasks: [
      { id: 'hp_gift', icon: '🎁', zh: '送朋友一個禮物', ev: 'gift', n: 1 },
      { id: 'hp_note', icon: '📖', zh: '去朋友帳篷的留言本寫一句話', ev: 'note', n: 1 },
      { id: 'hp_game', icon: '🎲', zh: '跟大家玩一局營火桌遊', ev: 'bgame', n: 1 },
    ],
    furn: 'q_letterbox',
    trophy: 'q_tro_friend',
    peak: '⏰ 整點小高潮：每到整點，5 分鐘內送的禮物算 2 個',
  },
  // 🎄 聖誕 4 天活動的 12/26～27（作者 11/24）：只用 HOL_SPECIAL 開，不在四週輪替裡
  xgift: {
    id: 'xgift',
    wd: -1,
    week: -1,
    icon: '🎁',
    zh: '聖誕交換禮物',
    goal: { ev: 'gift', n: 100, zh: '全營地一起：送出 {n} 個禮物', steps: [30, 60, 100], late: 1 },
    tasks: [
      { id: 'hx_gift', icon: '🎁', zh: '送朋友一個禮物', ev: 'gift', n: 1 },
      { id: 'hx_note', icon: '📖', zh: '去朋友帳篷的留言本寫一句話', ev: 'note', n: 1 },
      { id: 'hx_wood', icon: '🪵', zh: '幫營火添柴 5 次', ev: 'wood', n: 5 },
    ],
    furn: 'q_snowglobe',
    trophy: 'q_tro_xmas',
    peak: '⏰ 整點小高潮：每到整點，營火廣場的大聖誕樹下冒出 1 個 🎁 大禮物，先拿到的 +20 🌰',
  },
};
export const HOL_TASK_BY_ID = Object.fromEntries(Object.values(HOLIDAYS).flatMap((h) => h.tasks.map((q) => [q.id, q])));

/** 第幾週（從 11/28 那週算，四週輪一次）：0＝大掃除／雞蛋節、1＝釣魚大會／料理日、2＝森林尋寶／河畔同樂、3＝桌遊同樂會／交朋友 */
export function holWeek(day) {
  let d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${HOLIDAY_FROM}T00:00:00Z`)) / 86400000);
  if (day >= HOL_SHIFT_FROM) d -= 7; // 🎄 聖誕活動佔掉一個週末，後面往後挪一週
  return ((Math.floor((d + 1) / 7) % 4) + 4) % 4; // 11/28（六）、11/29（日）＝第 0 週；12/5、12/6＝第 1 週
}
const holOf = (day, wd) => Object.values(HOLIDAYS).find((x) => x.wd === wd && x.week === holWeek(day));

/** 台北時間現在幾點幾分 */
export function taipeiHM(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
  return { h: Number(p.hour), m: Number(p.minute) };
}

/**
 * 現在的假日活動：{ id, key（'日期:id'）, endIn（毫秒）, peak（整點小高潮中） } 或 null
 * test：'clean'／'egg' 強制打開（本機測試 HOLIDAY_TEST，Render 不要設）
 */
export function holidayNow(now = new Date(), test = '') {
  const forcePeak = test.endsWith('!'); // 本機測試：'clean!' 假裝在整點小高潮
  test = test.replace('!', '');
  const { key: day, wd } = taipeiDay(now);
  const { h, m } = taipeiHM(now);
  let hol = test && HOLIDAYS[test] ? HOLIDAYS[test] : null;
  let end = HOL_END;
  const sp = HOL_SPECIAL[day];
  if (!hol && sp && h >= HOL_START && h < (sp.end ?? HOL_END)) {
    hol = HOLIDAYS[sp.id];
    end = sp.end ?? HOL_END;
  }
  if (!hol) {
    if (day < HOLIDAY_FROM || h < HOL_START || h >= HOL_END) return null;
    hol = holOf(day, wd);
    if (!hol) return null;
  }
  const endIn = Math.max(0, ((end - h) * 60 - m) * 60000 - now.getSeconds() * 1000);
  return { id: hol.id, key: `${day}:${hol.id}`, endIn, peak: forcePeak || (m < HOL_PEAK_MIN && h > HOL_START) };
}
/** 這一場的全營地目標（特別場可以放低） */
export function holGoal(H) {
  const g = HOLIDAYS[H.id].goal;
  const sp = HOL_SPECIAL[H.key.split(':')[0]];
  return sp?.goal && sp.id === H.id ? { ...g, n: sp.goal, steps: sp.steps } : g;
}

/** 下一場：{ id, day（'YYYY-MM-DD'） } */
export function nextHoliday(now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const { key, wd } = taipeiDay(d);
    const sp = HOL_SPECIAL[key];
    const hol = sp ? HOLIDAYS[sp.id] : holOf(key, wd);
    if (!hol || (key < HOLIDAY_FROM && !sp)) continue;
    if (i === 0 && taipeiHM(now).h >= (sp?.end ?? HOL_END)) continue;
    return { id: hol.id, day: key };
  }
  return null;
}
