/**
 * 採集（前端、伺服器共用的資料）：迷霧森林 50 種＋湖邊石頭貝殼 24 種＋營火寶藏 8 種。
 *
 * - 每個人的採集點各自分開：你採走了，別人那邊還在
 * - 採過的點幾小時後長回來，東西放進採集籃不會壞，採集籃不限格子
 * - 蟲蟲在空中飛，要用捕蟲網（小舖用松果買）走近按 E 捕捉；白天、晚上（台北時間 18:00～隔天 6:00）出現的種類不一樣
 * - 第一次採到新的種類收進圖鑑，送松果（共 50 種）
 *
 * ⚠️ 採集點（GATHER_SPOTS）只能往後加：伺服器用「第幾個」記錄長回來的時間。
 */
export const GATHER_TYPES = [
  { id: 'mush', icon: '🍄', zh: '蘑菇' },
  { id: 'fruit', icon: '🫐', zh: '果實' },
  { id: 'flower', icon: '🌼', zh: '野花' },
  { id: 'bug', icon: '🦋', zh: '飛來飛去的蟲蟲' },
  { id: 'stone', icon: '🪨', zh: '湖邊的石頭', lake: true },
  { id: 'shell', icon: '🐚', zh: '貝殼和漂流木', lake: true },
  { id: 'treasure', icon: '✨', zh: '營火寶藏' },
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
  { id: 'ladybug', type: 'bug', icon: '🐞', zh: '瓢蟲', rarity: 1, color: 0xd2453c, day: true, hint: '躲在葉子背面睡覺' },
  { id: 'scarab', type: 'bug', icon: '🪲', zh: '金龜子', rarity: 2, color: 0x3f9a6a, day: true, hint: '背上綠綠亮亮的' },
  { id: 'stag', type: 'bug', icon: '🪲', zh: '鍬形蟲', rarity: 2, color: 0x5a3a24, night: true, hint: '有一對大大的角' },
  { id: 'rhino', type: 'bug', icon: '🪲', zh: '獨角仙', rarity: 3, color: 0x3a2418, night: true, hint: '森林裡的大力士' },
  { id: 'luna_moth', type: 'bug', icon: '🦋', zh: '月光蛾', rarity: 3, color: 0xc8f0d8, night: true, hint: '翅膀淡綠色，深夜才出現' },
  { id: 'cricket', type: 'bug', icon: '🦗', zh: '蟋蟀', rarity: 1, color: 0x5a4a2a, night: true, hint: '草叢裡唧唧叫' },
  { id: 'snail', type: 'bug', icon: '🐌', zh: '小蝸牛', rarity: 1, color: 0xb08a5a, night: true, hint: '晚上出來慢慢散步' },
  { id: 'katydid', type: 'bug', icon: '🦗', zh: '紡織娘', rarity: 2, color: 0x6ab05a, night: true, hint: '叫聲像在織布' },
  { id: 'mantis', type: 'bug', icon: '🦗', zh: '螳螂', rarity: 2, color: 0x7ac95a, day: true, hint: '舉著兩把小鐮刀' },
  { id: 'stick_insect', type: 'bug', icon: '🌿', zh: '竹節蟲', rarity: 2, color: 0x8a7a4a, day: true, hint: '仔細看才發現不是樹枝' },
  { id: 'jewel_beetle', type: 'bug', icon: '💎', zh: '彩虹吉丁蟲', rarity: 3, color: 0x3ac9a8, day: true, hint: '背上閃著彩虹光，很難遇到' },
  // 湖邊的石頭（湖畔碼頭的岸邊）
  { id: 'pebble', type: 'stone', icon: '🪨', zh: '圓圓鵝卵石', rarity: 1, color: 0x9a9a94, hint: '被湖水磨得圓圓的' },
  { id: 'striped_stone', type: 'stone', icon: '🪨', zh: '條紋石', rarity: 1, color: 0x8a7a6a, hint: '一圈一圈的白色條紋' },
  { id: 'moss_stone', type: 'stone', icon: '🟢', zh: '青苔石', rarity: 1, color: 0x5a7a4a, hint: '摸起來軟軟的' },
  { id: 'quartz', type: 'stone', icon: '💎', zh: '白石英', rarity: 2, color: 0xf3f3f3, hint: '對著月光會閃一下' },
  { id: 'lake_glass', type: 'stone', icon: '🔷', zh: '湖玻璃', rarity: 2, color: 0x8ad0c8, hint: '被磨圓的碎玻璃，像糖果' },
  { id: 'heart_stone', type: 'stone', icon: '🤎', zh: '心形石', rarity: 3, color: 0xc98a7a, hint: '剛好是愛心的形狀' },
  // 貝殼和漂流木
  { id: 'clam_shell', type: 'shell', icon: '🐚', zh: '河蜆殼', rarity: 1, color: 0x6a5a4a, hint: '小小一片，岸邊很多' },
  { id: 'snail_shell', type: 'shell', icon: '🐚', zh: '田螺殼', rarity: 1, color: 0x8a7a5a, hint: '螺旋一圈一圈' },
  { id: 'driftwood', type: 'shell', icon: '🪵', zh: '漂流木', rarity: 1, color: 0xb8a088, hint: '手作家具的好材料' },
  { id: 'fan_shell', type: 'shell', icon: '🐚', zh: '扇形貝殼', rarity: 2, color: 0xe8c8a8, hint: '像一把小扇子' },
  { id: 'pink_shell', type: 'shell', icon: '🩷', zh: '粉紅貝殼', rarity: 2, color: 0xf3b0c0, hint: '內側亮亮的粉紅色' },
  { id: 'pearl_mussel', type: 'shell', icon: '🦪', zh: '珍珠蚌', rarity: 3, color: 0xf6f0e8, hint: '打開裡面有一顆小珍珠' },
  // ✨ 營火寶藏：只在晚上 8 點～10 點，營火附近偶爾閃一下，先找到的人拿走
  { id: 'meteor_shard', type: 'treasure', icon: '☄️', zh: '流星碎片', rarity: 3, color: 0xbfe0ff, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'star_sand', type: 'treasure', icon: '✨', zh: '星砂小瓶', rarity: 2, color: 0xffe08a, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'moon_feather', type: 'treasure', icon: '🪶', zh: '月光羽毛', rarity: 2, color: 0xe8f0ff, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'fire_amber', type: 'treasure', icon: '🟠', zh: '營火琥珀', rarity: 2, color: 0xf0a03a, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'old_coin', type: 'treasure', icon: '🪙', zh: '古老銅幣', rarity: 2, color: 0xc8a050, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'paper_crane', type: 'treasure', icon: '🕊️', zh: '許願紙鶴', rarity: 2, color: 0xffffff, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'glow_crystal', type: 'treasure', icon: '🔮', zh: '螢光水晶', rarity: 3, color: 0x9ff0e0, hint: '晚上 8～10 點，營火附近閃閃發光' },
  { id: 'fox_mask', type: 'treasure', icon: '🦊', zh: '狐狸小面具', rarity: 3, color: 0xf08a3c, hint: '晚上 8～10 點，營火附近閃閃發光' },
  // ---- 11/07 擴充：湖邊石頭 6 → 12、貝殼 6 → 12（加在最後面）----
  { id: 'skip_stone', type: 'stone', icon: '🪨', zh: '打水漂石', rarity: 1, color: 0x8f9aa0, hint: '扁扁的，最適合打水漂' },
  { id: 'swirl_stone', type: 'stone', icon: '🌀', zh: '漩渦石', rarity: 1, color: 0x7a8a9a, hint: '上面有一圈一圈的漩渦花紋' },
  { id: 'obsidian', type: 'stone', icon: '⚫', zh: '黑曜石', rarity: 2, color: 0x2a2630, hint: '黑黑亮亮，像一小片夜空' },
  { id: 'red_jasper', type: 'stone', icon: '🔴', zh: '紅碧玉', rarity: 2, color: 0xb8443a, hint: '溫暖的紅色，摸起來滑滑的' },
  { id: 'trilobite', type: 'stone', icon: '🐚', zh: '三葉蟲化石', rarity: 3, color: 0x8a7a62, hint: '好久好久以前的小生物' },
  { id: 'moonstone', type: 'stone', icon: '🌙', zh: '月光石', rarity: 3, color: 0xdfe8ff, night: true, hint: '只有晚上才找得到，會微微發光' },
  { id: 'crab_shell', type: 'shell', icon: '🦀', zh: '小螃蟹殼', rarity: 1, color: 0xd2703a, hint: '小螃蟹搬家留下來的' },
  { id: 'bird_feather', type: 'shell', icon: '🪶', zh: '水鳥羽毛', rarity: 1, color: 0xe8e4dc, hint: '軟軟的，被風吹到岸邊' },
  { id: 'reed', type: 'shell', icon: '🌾', zh: '蘆葦束', rarity: 1, color: 0xc8b07a, hint: '湖邊長了一大片' },
  { id: 'spiral_shell', type: 'shell', icon: '🐚', zh: '螺旋貝', rarity: 2, color: 0xf0d8b8, hint: '轉啊轉的螺旋，像冰淇淋' },
  { id: 'heart_drift', type: 'shell', icon: '🤎', zh: '心形漂流木', rarity: 2, color: 0xa88a6a, hint: '被湖水磨成愛心的形狀' },
  { id: 'rainbow_shell', type: 'shell', icon: '🫧', zh: '七彩蚌殼', rarity: 3, color: 0xd8e8ff, hint: '對著光看，會出現彩虹' },
  // ---- 🗓️ 每月限定（month：那個月才採得到；不算進全收集，收在圖鑑的「限定」區；隔年同一個月會再出現）----
  { id: 'film_shell', type: 'shell', icon: '🎞️', zh: '膠捲貝殼', rarity: 2, color: 0x4a4a52, month: 11, hint: '11 月限定：露營電影夜，湖邊撿得到' },
];
/** 🗓️ 每月限定的東西（不算進全收集） */
export const isLimited = (x) => !!x?.month;
/** 台北時間現在是幾月（1～12） */
export function taipeiMonth(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', month: 'numeric' }).format(now));
}
export const GATHER_BY_ID = Object.fromEntries(GATHER_ITEMS.map((x) => [x.id, x]));
/** 第一次採到：依稀有度送松果；全部收集完再送 */
export const GATHER_FIRST_GAIN = [0, 2, 4, 8];
export const GATHER_DEX_BONUS = 30;
/** 採過幾小時長回來（4～8 小時，每個點不一樣，不會一次全部長好） */
export const GATHER_REGROW_MS = 4 * 3600 * 1000;
export const regrowMs = () => GATHER_REGROW_MS * (1 + Math.random());
/** 捕蟲網的價格（松果） */
export const NET_PRICE = 15;
/** 飛的蟲蟲：繞著自己的點飛多遠、多近可以捕到 */
export const BUG_WANDER = 2.2;
export const BUG_CATCH_R = 1.5;
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
    ['mush', 7],
    ['fruit', 7],
    ['flower', 7],
    ['bug', 8],
  ];
  let k = 0;
  for (const [type, n] of plan) {
    for (let i = 0; i < n; i++, k++) {
      // 一圈一圈錯開，避開中央小水池和入口小徑
      const a = (k / 29) * Math.PI * 2 + rnd() * 0.25;
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
/** 湖畔碼頭的岸邊：石頭 7 個、貝殼 7 個（避開中間的碼頭） */
const LAKE_SPOTS = [
  [-8.2, 2.3, 'stone'], [-6.6, 3.2, 'shell'], [-5.0, 2.1, 'stone'], [-3.6, 3.0, 'shell'], [-2.2, 2.2, 'stone'],
  [2.2, 2.3, 'shell'], [3.7, 3.1, 'stone'], [5.2, 2.1, 'shell'], [6.7, 3.0, 'stone'], [8.2, 2.2, 'shell'],
  // 11/07：種類變多，岸邊再加 4 個（只能往後加）
  [-7.4, 4.0, 'shell'], [-2.9, 4.1, 'stone'], [2.9, 4.0, 'shell'], [7.4, 4.1, 'stone'],
].map(([x, z, type]) => ({ type, x, z, room: 'lake_dock' }));
/** 所有採集點：前面是迷霧森林，後面是湖邊（room 標示在哪裡） */
export const GATHER_SPOTS = [...makeSpots().map((s) => ({ ...s, room: 'mist_forest' })), ...LAKE_SPOTS];

/** ✨ 營火寶藏時間（台北時間 20:00～22:00） */
export const TREASURE_FROM = 20;
export const TREASURE_TO = 22;
export const TREASURE_MAX = 3; // 同時最多藏幾個
export function taipeiHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
}
export const treasureTime = (now = new Date()) => {
  const h = taipeiHour(now);
  return h >= TREASURE_FROM && h < TREASURE_TO;
};

/** 台北時間是不是晚上（18:00～隔天 6:00） */
export function isNight(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return h >= 18 || h < 6;
}

/** 在某一型的採集點採到什麼（依稀有度抽：★★★ 很難遇到；白天、晚上的種類不一樣） */
export function gatherItemAt(type, night, rand = Math.random, month = taipeiMonth()) {
  const pool = GATHER_ITEMS.filter((x) => x.type === type && (night ? !x.day : !x.night) && (!x.month || x.month === month));
  const weight = (x) => [0, 14, 3, 0.5][x.rarity];
  const total = pool.reduce((a, x) => a + weight(x), 0);
  let r = rand() * total;
  for (const x of pool) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return pool[pool.length - 1];
}
