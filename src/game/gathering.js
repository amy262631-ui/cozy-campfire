/**
 * 迷霧森林的採集（前端、伺服器共用的資料）。
 *
 * - 每個人的採集點各自分開：你採走了，別人那邊還在
 * - 採過的點幾小時後長回來，東西放進採集籃不會壞，採集籃不限格子
 * - 蟲蟲（螢火蟲、甲蟲）只有晚上（台北時間 18:00～隔天 6:00）才出現
 * - 第一次採到新的種類收進圖鑑，送松果（共 50 種）
 *
 * ⚠️ 採集點（GATHER_SPOTS）只能往後加：伺服器用「第幾個」記錄長回來的時間。
 */
export const GATHER_TYPES = [
  { id: 'mush', icon: '🍄', zh: '蘑菇' },
  { id: 'fruit', icon: '🫐', zh: '果實' },
  { id: 'flower', icon: '🌼', zh: '野花' },
  { id: 'bug', icon: '🪲', zh: '晚上的蟲蟲' },
];

/** rarity：1 常見、2 少見、3 稀有（越稀有越難遇到，第一次採到送越多松果） */
export const GATHER_ITEMS = [
  // 蘑菇
  { id: 'brown_mush', type: 'mush', icon: '🍄', zh: '小褐菇', rarity: 1, color: 0x9a6a44, hint: '樹根旁最常見' },
  { id: 'white_mush', type: 'mush', icon: '🍄', zh: '白玉菇', rarity: 1, color: 0xf3ecdf, hint: '一叢一叢長在一起' },
  { id: 'red_mush', type: 'mush', icon: '🍄', zh: '紅傘菇', rarity: 1, color: 0xd2453c, hint: '紅色傘蓋、白色點點' },
  { id: 'chanterelle', type: 'mush', icon: '🍄', zh: '雞油菌', rarity: 2, color: 0xf0a83a, hint: '金黃色像小喇叭' },
  { id: 'coral_mush', type: 'mush', icon: '🪸', zh: '珊瑚菇', rarity: 2, color: 0xf3c9d2, hint: '長得像海底的珊瑚' },
  { id: 'morel', type: 'mush', icon: '🍄', zh: '羊肚菌', rarity: 3, color: 0xb08a5a, hint: '很少見，表面有一格一格的洞' },
  { id: 'glow_mush', type: 'mush', icon: '✨', zh: '月光小菇', rarity: 3, color: 0x9ff0e0, night: true, hint: '只有晚上會發出淡淡的光' },
  { id: 'puffball', type: 'mush', icon: '⚪', zh: '馬勃菇', rarity: 2, color: 0xe8e0cc, hint: '圓滾滾，輕輕一碰會噗出煙' },
  { id: 'shiitake', type: 'mush', icon: '🍄', zh: '野生香菇', rarity: 1, color: 0x7a4a2a, hint: '長在倒下的木頭上' },
  { id: 'amethyst', type: 'mush', icon: '💜', zh: '紫晶小菇', rarity: 2, color: 0x8a5ac9, hint: '整朵都是淡紫色' },
  { id: 'lions_mane', type: 'mush', icon: '🤍', zh: '猴頭菇', rarity: 2, color: 0xf3ecdf, hint: '毛茸茸的白色小球' },
  { id: 'earthstar', type: 'mush', icon: '⭐', zh: '地星', rarity: 3, color: 0xa88a6a, hint: '打開像一顆星星，非常少見' },
  // 果實
  { id: 'strawberry', type: 'fruit', icon: '🍓', zh: '野草莓', rarity: 1, color: 0xe0443c, hint: '小小一顆，很甜' },
  { id: 'blueberry', type: 'fruit', icon: '🫐', zh: '藍莓', rarity: 1, color: 0x4a5fa8, hint: '矮樹叢裡一串一串' },
  { id: 'raspberry', type: 'fruit', icon: '🍒', zh: '覆盆子', rarity: 1, color: 0xd2456a, hint: '紅紅的、軟軟的' },
  { id: 'blackberry', type: 'fruit', icon: '🫐', zh: '黑莓', rarity: 2, color: 0x3a2a4a, hint: '熟透了是深紫色' },
  { id: 'acorn', type: 'fruit', icon: '🌰', zh: '橡實', rarity: 1, color: 0x8a5a32, hint: '松鼠最愛藏起來' },
  { id: 'wild_cherry', type: 'fruit', icon: '🍒', zh: '野櫻桃', rarity: 2, color: 0xa8222a, hint: '成雙成對掛在枝頭' },
  { id: 'wild_apple', type: 'fruit', icon: '🍎', zh: '小野蘋果', rarity: 2, color: 0xc9483c, hint: '酸酸的，烤過會變甜' },
  { id: 'gold_berry', type: 'fruit', icon: '🟡', zh: '金色漿果', rarity: 3, color: 0xffd56a, hint: '傳說吃了會做好夢' },
  { id: 'mulberry', type: 'fruit', icon: '🫐', zh: '桑葚', rarity: 1, color: 0x4a2a4a, hint: '吃完手指會變紫色' },
  { id: 'hazelnut', type: 'fruit', icon: '🌰', zh: '榛果', rarity: 1, color: 0xa86a3a, hint: '殼硬硬的，裡面很香' },
  { id: 'chestnut', type: 'fruit', icon: '🌰', zh: '栗子', rarity: 2, color: 0x6a3a1a, hint: '外面包著刺刺的殼' },
  { id: 'wild_grape', type: 'fruit', icon: '🍇', zh: '野葡萄', rarity: 2, color: 0x5a3a8a, hint: '藤蔓上一小串' },
  { id: 'lingonberry', type: 'fruit', icon: '🔴', zh: '紅越橘', rarity: 3, color: 0xc9283a, hint: '藏在青苔裡的紅寶石' },
  // 野花
  { id: 'dandelion', type: 'flower', icon: '🌼', zh: '蒲公英', rarity: 1, color: 0xffd84a, hint: '吹一口氣就飛走了' },
  { id: 'violet', type: 'flower', icon: '🪻', zh: '紫羅蘭', rarity: 1, color: 0x8a5ac9, hint: '小小的紫色花' },
  { id: 'daisy', type: 'flower', icon: '🌼', zh: '雛菊', rarity: 1, color: 0xffffff, hint: '白色花瓣、黃色花心' },
  { id: 'forget_me_not', type: 'flower', icon: '💠', zh: '勿忘我', rarity: 2, color: 0x7ab8f2, hint: '天藍色的小花' },
  { id: 'lily_valley', type: 'flower', icon: '🤍', zh: '鈴蘭', rarity: 2, color: 0xf6f3ec, hint: '一串小鈴鐺' },
  { id: 'bluebell', type: 'flower', icon: '🔔', zh: '風鈴草', rarity: 2, color: 0x5a74c9, hint: '低著頭的藍色小鈴' },
  { id: 'primrose', type: 'flower', icon: '🌸', zh: '月見草', rarity: 3, color: 0xfff0a0, night: true, hint: '晚上才開花' },
  { id: 'clover4', type: 'flower', icon: '🍀', zh: '幸運草', rarity: 3, color: 0x5fbf5a, hint: '找了好久才找到一片' },
  { id: 'pansy', type: 'flower', icon: '🌸', zh: '三色堇', rarity: 1, color: 0x9a6ac9, hint: '花瓣像一張小臉' },
  { id: 'oxalis', type: 'flower', icon: '🌸', zh: '酢漿草花', rarity: 1, color: 0xf3a6c0, hint: '粉紅色，陰天會合起來' },
  { id: 'lavender', type: 'flower', icon: '🪻', zh: '薰衣草', rarity: 2, color: 0x9a8ad9, hint: '聞起來好想睡覺' },
  { id: 'bellflower', type: 'flower', icon: '💠', zh: '桔梗', rarity: 2, color: 0x6a74d9, hint: '花苞像一顆小氣球' },
  { id: 'snowdrop', type: 'flower', icon: '❄️', zh: '雪花蓮', rarity: 3, color: 0xf6f3ec, hint: '冬天快到時才找得到' },
  // 晚上的蟲蟲（看完就放回去，收進圖鑑）
  { id: 'firefly', type: 'bug', icon: '✨', zh: '螢火蟲', rarity: 1, color: 0xd8ff7a, night: true, hint: '晚上的草叢一閃一閃' },
  { id: 'ladybug', type: 'bug', icon: '🐞', zh: '瓢蟲', rarity: 1, color: 0xd2453c, night: true, hint: '躲在葉子背面睡覺' },
  { id: 'scarab', type: 'bug', icon: '🪲', zh: '金龜子', rarity: 2, color: 0x3f9a6a, night: true, hint: '背上綠綠亮亮的' },
  { id: 'stag', type: 'bug', icon: '🪲', zh: '鍬形蟲', rarity: 2, color: 0x5a3a24, night: true, hint: '有一對大大的角' },
  { id: 'rhino', type: 'bug', icon: '🪲', zh: '獨角仙', rarity: 3, color: 0x3a2418, night: true, hint: '森林裡的大力士' },
  { id: 'luna_moth', type: 'bug', icon: '🦋', zh: '月光蛾', rarity: 3, color: 0xc8f0d8, night: true, hint: '翅膀淡綠色，深夜才出現' },
  { id: 'cricket', type: 'bug', icon: '🦗', zh: '蟋蟀', rarity: 1, color: 0x5a4a2a, night: true, hint: '草叢裡唧唧叫' },
  { id: 'snail', type: 'bug', icon: '🐌', zh: '小蝸牛', rarity: 1, color: 0xb08a5a, night: true, hint: '晚上出來慢慢散步' },
  { id: 'katydid', type: 'bug', icon: '🦗', zh: '紡織娘', rarity: 2, color: 0x6ab05a, night: true, hint: '叫聲像在織布' },
  { id: 'mantis', type: 'bug', icon: '🦗', zh: '螳螂', rarity: 2, color: 0x7ac95a, night: true, hint: '舉著兩把小鐮刀' },
  { id: 'stick_insect', type: 'bug', icon: '🌿', zh: '竹節蟲', rarity: 2, color: 0x8a7a4a, night: true, hint: '仔細看才發現不是樹枝' },
  { id: 'jewel_beetle', type: 'bug', icon: '💎', zh: '彩虹吉丁蟲', rarity: 3, color: 0x3ac9a8, night: true, hint: '背上閃著彩虹光，很難遇到' },
];
export const GATHER_BY_ID = Object.fromEntries(GATHER_ITEMS.map((x) => [x.id, x]));
/** 第一次採到：依稀有度送松果；全部收集完再送 */
export const GATHER_FIRST_GAIN = [0, 2, 4, 8];
export const GATHER_DEX_BONUS = 30;
/** 採過幾小時長回來 */
export const GATHER_REGROW_MS = 3 * 3600 * 1000;
/** 走到多近會自動採 */
export const GATHER_R = 1.0;
/** 迷霧森林的活動範圍（圓形） */
export const MIST_R = 15;

/** 採集點：繞著森林小徑分布（固定的位置，前後端一樣） */
function makeSpots() {
  const spots = [];
  // 簡單的偽亂數：每次結果一樣
  let seed = 20261104;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const plan = [
    ['mush', 10],
    ['fruit', 10],
    ['flower', 10],
    ['bug', 8],
  ];
  let k = 0;
  for (const [type, n] of plan) {
    for (let i = 0; i < n; i++, k++) {
      // 一圈一圈錯開，避開中央小水池和入口小徑
      const a = (k / 38) * Math.PI * 2 + rnd() * 0.25;
      const r = 4.6 + ((k * 7) % 5) * 1.9 + rnd() * 0.8;
      const x = Math.round(Math.sin(a) * r * 100) / 100;
      const z = Math.round(Math.cos(a) * r * 100) / 100;
      // 入口小徑（z 正方向、x 接近 0）讓開
      const onPath = Math.abs(x) < 1.4 && z > 3;
      spots.push({ type, x: onPath ? x + (x < 0 ? -1.6 : 1.6) : x, z });
    }
  }
  return spots;
}
export const GATHER_SPOTS = makeSpots();

/** 台北時間是不是晚上（18:00～隔天 6:00） */
export function isNight(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return h >= 18 || h < 6;
}

/** 在某一型的採集點採到什麼（依稀有度抽；白天不會抽到晚上限定的） */
export function gatherItemAt(type, night, rand = Math.random) {
  const pool = GATHER_ITEMS.filter((x) => x.type === type && (night || !x.night));
  const weight = (x) => [0, 10, 4, 1][x.rarity];
  let total = pool.reduce((a, x) => a + weight(x), 0);
  let r = rand() * total;
  for (const x of pool) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return pool[pool.length - 1];
}
