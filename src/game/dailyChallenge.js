/**
 * 🎯 今日挑戰：不想分享連結的人，完成今天的 3 個小挑戰也能拿到「每日造型」。
 * 每天從題庫輪 3 題（同一天大家一樣）。前端、伺服器共用。
 * ⚠️ id 存檔用，不能改；題目只能往後加。
 *   n：要做幾次　icon　zh：題目
 */
export const CHALLENGES = [
  { id: 'water', icon: '💧', zh: '幫朋友的菜園澆水', n: 3 },
  { id: 'bug', icon: '🦋', zh: '抓到一隻少見（★★）以上的蟲', n: 1 },
  { id: 'cook3', icon: '🍲', zh: '煮一道要 3 種以上食材的料理', n: 1 },
  { id: 'fish', icon: '🎣', zh: '釣到魚', n: 5 },
  { id: 'harvest', icon: '🥕', zh: '收成自己的菜園', n: 2 },
  { id: 'trash', icon: '♻️', zh: '撿起垃圾', n: 5 },
  { id: 'gather', icon: '🍄', zh: '採集（蘑菇、果子、花、石頭貝殼）', n: 6 },
];
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const CHALLENGE_COUNT = 3;

const dayNum = (dayKey) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
/** 今天的 3 題（用日期當種子洗牌；連續兩天不會完全一樣） */
export function challengesOf(dayKey) {
  // mulberry32：用日期當種子
  let a = (dayNum(dayKey) * 0x9e3779b1) >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ids = CHALLENGES.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // 菜園的題目（澆水、收成）一天最多一題：要等作物長、要有朋友種菜，兩題都抽到太難
  const garden = new Set(['water', 'harvest']);
  const out = [];
  for (const id of ids) {
    if (garden.has(id) && out.some((x) => garden.has(x))) continue;
    out.push(id);
    if (out.length === CHALLENGE_COUNT) break;
  }
  return out;
}
