/**
 * 家具目錄（前端、伺服器共用；這裡只放資料，不放 3D 模型和翻譯）。
 * 伺服器 server/homes.js 直接讀這份，價格、疊放規則只要改這裡。
 *
 *   id     代號（存檔用，不能改）
 *   icon   小圖示
 *   zh     中文名稱（前端用 t() 翻譯）
 *   price  松果價格（禮物家具沒有價格，小舖買不到）
 *   cat    分類（小舖分頁）
 *   疊放：
 *     kind: 'mat'    地墊類：只能鋪在地上，上面可以再放任何家具（地墊除外）
 *     kind: 'small'  小東西：可以直接放地上，也可以放在有 top 的家具上
 *     top: 高度      上面有平台（公尺），可以放「小東西」
 *   walk   可以踩上去（不擋路）
 *   seat   可以坐（按 E），坐的高度；sleep＝躺下睡覺
 *   gift   分享禮物：拿到的方式（share / ref1 / ref5）
 *   craft  手作家具：小舖買不到，用採集籃的材料做（crafting.js）
 */
export const FURNITURE_CATS = [
  { id: 'rug', icon: '🟫', zh: '地墊' },
  { id: 'sit', icon: '🛋️', zh: '坐臥' },
  { id: 'table', icon: '🗄️', zh: '桌櫃' },
  { id: 'light', icon: '💡', zh: '燈光' },
  { id: 'plant', icon: '🪴', zh: '植物' },
  { id: 'toy', icon: '🧸', zh: '玩偶' },
  { id: 'kitchen', icon: '🍳', zh: '廚房' }, // 11/14 作者：多一區廚房類
  { id: 'deco', icon: '🍰', zh: '小物' },
  { id: 'fish', icon: '🐟', zh: '魚缸' },
  { id: 'wall', icon: '🧱', zh: '隔間' },
];

/**
 * 🎨 家具配色：買的時候選顏色（不加價），存在家具上的 c（0＝原色）。
 * 有 color: false 的家具（禮物、手作、隔間牆、魚缸⋯）沒有配色。
 */
export const FURNITURE_COLORS = [
  { id: 0, icon: '⚪', zh: '原色' },
  { id: 1, icon: '🌸', zh: '粉嫩', hue: 0.94, sat: 0.55, light: 0.12 },
  { id: 2, icon: '🌿', zh: '森林', hue: 0.33, sat: 0.4, light: -0.02 },
  { id: 3, icon: '🌊', zh: '海藍', hue: 0.58, sat: 0.5, light: 0 },
  { id: 4, icon: '🌙', zh: '夜色', hue: 0.7, sat: 0.35, light: -0.12 },
];
/**
 * 🎫 月票限定配色（11/09 作者定案）：有月票才能選；買過的家具月票到期後照樣保留顏色
 * 流行的「跳色」：家具面積最大的部分用第一個顏色，其他有顏色的小部分（坐墊、抽屜、床墊）用 duo 的顏色
 */
export const PASS_COLORS = [
  { id: 5, icon: '🩵', zh: '蒂芬妮藍×奶油白', hue: 0.475, sat: 0.5, l: 0.68, duo: { hue: 0.11, sat: 0.55, l: 0.9 }, pass: 1 },
  { id: 6, icon: '🤍', zh: '奶油白×奶茶', hue: 0.11, sat: 0.55, l: 0.9, duo: { hue: 0.075, sat: 0.32, l: 0.62 }, pass: 1 },
  { id: 7, icon: '💜', zh: '薰衣草紫×奶油白', hue: 0.73, sat: 0.36, l: 0.74, duo: { hue: 0.11, sat: 0.55, l: 0.9 }, pass: 1 },
];
/** 全部配色（id＝陣列位置；5～7 是月票限定，買的時候要有月票） */
export const ALL_COLORS = [...FURNITURE_COLORS, ...PASS_COLORS];
/** 這種魚放得進這個魚缸嗎（魚王算 6 星） */
export const fishFits = (tank, fish) => !!tank?.fish && !!fish && !fish.junk && (fish.legend ? 6 : fish.rarity) <= tank.fish;
export const hasColors = (f) => !!f && !f.gift && !f.craft && f.color !== false;

export const FURNITURE_CATALOG = [
  // ---- 地墊 ----
  { id: 'rug', icon: '🟫', zh: '小地毯', price: 5, cat: 'rug', kind: 'mat', top: 0.025, walk: true },
  { id: 'roundrug', icon: '🔵', zh: '圓點地毯', price: 6, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  { id: 'grassmat', icon: '🌼', zh: '小花草皮', price: 7, cat: 'rug', kind: 'mat', top: 0.03, walk: true },
  { id: 'heartrug', icon: '💗', zh: '愛心地墊', price: 9, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  { id: 'pawrug', icon: '🐾', zh: '貓掌地毯', price: 10, cat: 'rug', kind: 'mat', top: 0.022, walk: true },
  // ---- 坐臥 ----
  { id: 'cushion', icon: '🟠', zh: '坐墊', price: 6, cat: 'sit', walk: true, seat: 0.06 },
  { id: 'pouf', icon: '🍩', zh: '甜甜圈坐墊', price: 8, cat: 'sit', walk: true, seat: 0.1 },
  { id: 'stool', icon: '🍄', zh: '蘑菇凳', price: 9, cat: 'sit', top: 0.32, seat: 0.3 },
  { id: 'beanbag', icon: '🫘', zh: '懶骨頭', price: 14, cat: 'sit', seat: 0.18 },
  { id: 'catbed', icon: '🐈', zh: '貓咪窩', price: 16, cat: 'sit', seat: 0.1, sleep: true },
  { id: 'rocking', icon: '🪑', zh: '小搖椅', price: 20, cat: 'sit', seat: 0.24 },
  { id: 'sofa', icon: '🛋️', zh: '雙人小沙發', price: 28, cat: 'sit', seat: 0.24, wide: 0.8 }, // wide：往右多佔一格（11/07：兩個人才坐得下，兩個座位）
  { id: 'bed', icon: '🛏️', zh: '睡鋪', price: 30, cat: 'sit', top: 0.235, seat: 0.24, sleep: true, long: 0.6 }, // long：往後多佔半格（床比較長）
  // ---- 桌櫃 ----
  { id: 'crate', icon: '📦', zh: '木箱', price: 6, cat: 'table', top: 0.36 },
  { id: 'stump', icon: '🌲', zh: '樹墩邊桌', price: 8, cat: 'table', top: 0.33 },
  { id: 'table', icon: '🪵', zh: '小矮桌', price: 10, cat: 'table', top: 0.325 },
  { id: 'roundtable', icon: '⚪', zh: '圓茶几', price: 12, cat: 'table', top: 0.4 },
  { id: 'drawer', icon: '🗄️', zh: '粉彩斗櫃', price: 16, cat: 'table', top: 0.54 },
  { id: 'desk', icon: '✏️', zh: '小書桌', price: 20, cat: 'table', top: 0.56 },
  { id: 'bookshelf', icon: '📚', zh: '書架', price: 20, cat: 'table', top: 0.915 },
  { id: 'fridge', icon: '🧊', zh: '小冰箱', price: 25, cat: 'kitchen', top: 0.66 },
  // 🗄️ 展示櫃：三層架子，一格就能放 6 件小東西（不用全部攤在地上）
  { id: 'showcase', icon: '🗄️', zh: '展示收納櫃', price: 35, cat: 'table', shelf: 6 },
  // ---- 燈光 ----
  { id: 'candles', icon: '🕯️', zh: '蠟燭組', price: 6, cat: 'light', kind: 'small' },
  { id: 'oillamp', icon: '🪔', zh: '煤油燈', price: 10, cat: 'light', kind: 'small' },
  { id: 'lamp', icon: '💡', zh: '檯燈', price: 12, cat: 'light', kind: 'small' },
  { id: 'mushlamp', icon: '✨', zh: '蘑菇夜燈', price: 12, cat: 'light', kind: 'small' },
  { id: 'starlamp', icon: '⭐', zh: '星星燈', price: 14, cat: 'light', kind: 'small' },
  { id: 'moonlamp', icon: '🌙', zh: '月亮燈', price: 16, cat: 'light', kind: 'small' },
  { id: 'jar', icon: '🫙', zh: '螢火蟲燈罐', price: 18, cat: 'light', kind: 'small' },
  // ---- 植物 ----
  { id: 'succulent', icon: '🌱', zh: '多肉小盆', price: 6, cat: 'plant', kind: 'small' },
  { id: 'cactus', icon: '🌵', zh: '仙人掌', price: 7, cat: 'plant', kind: 'small' },
  { id: 'plant', icon: '🪴', zh: '盆栽', price: 8, cat: 'plant', kind: 'small' },
  { id: 'tulips', icon: '🌷', zh: '鬱金香', price: 8, cat: 'plant', kind: 'small' },
  { id: 'sunflower', icon: '🌻', zh: '向日葵', price: 9, cat: 'plant', kind: 'small' },
  { id: 'bonsai', icon: '🌳', zh: '小盆景', price: 12, cat: 'plant', kind: 'small' },
  { id: 'monstera', icon: '🌿', zh: '大龜背芋', price: 16, cat: 'plant' },
  // ---- 玩偶 ----
  { id: 'chick', icon: '🐥', zh: '小雞玩偶', price: 10, cat: 'toy', kind: 'small' },
  { id: 'frog', icon: '🐸', zh: '青蛙玩偶', price: 12, cat: 'toy', kind: 'small' },
  { id: 'whale', icon: '🐳', zh: '鯨魚抱枕', price: 12, cat: 'toy', kind: 'small' },
  { id: 'teddy', icon: '🧸', zh: '小熊玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'bunny', icon: '🐰', zh: '兔兔玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'penguin', icon: '🐧', zh: '企鵝玩偶', price: 14, cat: 'toy', kind: 'small' },
  { id: 'dino', icon: '🦕', zh: '恐龍玩偶', price: 16, cat: 'toy', kind: 'small' },
  { id: 'bigbear', icon: '🐻', zh: '大熊抱枕', price: 26, cat: 'toy' },
  // ---- 小物 ----
  { id: 'mug', icon: '☕', zh: '馬克杯', price: 3, cat: 'kitchen', kind: 'small' },
  { id: 'books', icon: '📖', zh: '一疊書', price: 5, cat: 'deco', kind: 'small' },
  { id: 'honey', icon: '🍯', zh: '蜂蜜罐', price: 5, cat: 'kitchen', kind: 'small' },
  { id: 'pumpkin', icon: '🎃', zh: '小南瓜', price: 6, cat: 'deco', kind: 'small' },
  { id: 'basket', icon: '🧺', zh: '野餐籃', price: 7, cat: 'kitchen', kind: 'small' },
  { id: 'clock', icon: '⏰', zh: '小鬧鐘', price: 7, cat: 'deco', kind: 'small' },
  { id: 'cake', icon: '🍰', zh: '草莓蛋糕', price: 8, cat: 'kitchen', kind: 'small' },
  { id: 'teapot', icon: '🫖', zh: '茶壺組', price: 9, cat: 'kitchen', kind: 'small' },
  { id: 'globe', icon: '🌍', zh: '地球儀', price: 12, cat: 'deco', kind: 'small' },
  { id: 'radio', icon: '📻', zh: '收音機', price: 13, cat: 'deco', kind: 'small' },
  { id: 'frame', icon: '🖼️', zh: '相框', price: 15, cat: 'deco', kind: 'small' },
  { id: 'fishbowl', icon: '🐠', zh: '金魚缸', price: 15, cat: 'deco', kind: 'small' },
  { id: 'crystal', icon: '🔮', zh: '水晶球', price: 16, cat: 'deco', kind: 'small' },
  { id: 'chime', icon: '🎐', zh: '風鈴架', price: 12, cat: 'deco' },
  { id: 'easel', icon: '🎨', zh: '小畫架', price: 18, cat: 'deco' },
  { id: 'guitar', icon: '🎸', zh: '木吉他', price: 20, cat: 'deco' },
  { id: 'stove', icon: '🔥', zh: '小暖爐', price: 22, cat: 'deco' },
  { id: 'hatrack', icon: '🧥', zh: '衣帽架', price: 15, cat: 'deco' }, // 展示收集到的造型
  // 🐠 大魚缸：放一條自己釣過的魚進去游（魚王也可以，拿來炫耀）
  // fish：最多放幾星的魚（魚王算 6）；same：同一種可以一個一個往上疊成魚缸牆
  { id: 'tank_s', icon: '🫧', zh: '桌上小魚缸', price: 18, cat: 'fish', kind: 'small', color: false, fish: 2 },
  { id: 'tank_round', icon: '🔵', zh: '圓形魚缸', price: 30, cat: 'fish', color: false, fish: 3 },
  { id: 'aquarium', icon: '🐟', zh: '大魚缸', price: 45, cat: 'fish', color: false, fish: 4, top: 0.84, same: true },
  { id: 'tank_l', icon: '🐋', zh: '巨型水族箱', price: 120, cat: 'fish', color: false, fish: 6, top: 1.3, same: true },
  // 11/07 魚缸改版：更多形狀、尺寸（都只放 1 條魚）
  { id: 'tank_jar', icon: '🫙', zh: '玻璃罐小魚缸', price: 12, cat: 'fish', kind: 'small', color: false, fish: 1 },
  { id: 'tank_cube', icon: '🧊', zh: '方形桌上缸', price: 22, cat: 'fish', kind: 'small', color: false, fish: 2 },
  { id: 'tank_wood', icon: '🪵', zh: '木框復古缸', price: 40, cat: 'fish', color: false, fish: 3 },
  { id: 'tank_plant', icon: '🌿', zh: '水草造景缸', price: 55, cat: 'fish', color: false, fish: 4 },
  { id: 'tank_tube', icon: '🏛️', zh: '圓柱水族箱', price: 80, cat: 'fish', color: false, fish: 5 },
  { id: 'koi_pond', icon: '🪷', zh: '室內錦鯉池', price: 150, cat: 'fish', color: false, fish: 5, wide: 0.8, long: 0.8 }, // 2×2 格
  { id: 'tank_wall', icon: '🌊', zh: '整面牆水族箱', price: 180, cat: 'fish', color: false, fish: 6, wide: 0.8 }, // 2 格寬
  // ---- 🧱 隔間牆：貼在格子的一邊，可以轉方向，人走不過去（門牆可以穿過） ----
  { id: 'wall_log', icon: '🪵', zh: '原木隔間牆', price: 10, cat: 'wall', kind: 'wall', color: false },
  { id: 'wall_plank', icon: '🤍', zh: '白木板牆', price: 10, cat: 'wall', kind: 'wall' },
  { id: 'wall_low', icon: '🟫', zh: '半高矮牆', price: 8, cat: 'wall', kind: 'wall' },
  { id: 'wall_door', icon: '🚪', zh: '門洞牆', price: 12, cat: 'wall', kind: 'wall', walk: true },
  { id: 'wall_glass', icon: '🪟', zh: '玻璃窗牆', price: 15, cat: 'wall', kind: 'wall', color: false },
  // ---- 🔨 手作家具（小舖買不到，用採集籃的東西做；材料在 crafting.js） ----
  { id: 'shellchime', icon: '🎐', zh: '貝殼風鈴', cat: 'deco', craft: true },
  { id: 'stonetower', icon: '🪨', zh: '小石塔', cat: 'deco', kind: 'small', craft: true },
  { id: 'wreath', icon: '💐', zh: '野花花圈', cat: 'plant', kind: 'small', craft: true },
  { id: 'jam', icon: '🫙', zh: '莓果果醬罐', cat: 'kitchen', kind: 'small', craft: true },
  { id: 'terrarium', icon: '🍄', zh: '蘑菇生態瓶', cat: 'plant', kind: 'small', craft: true },
  { id: 'pumpkinlamp', icon: '🎃', zh: '南瓜燈', cat: 'light', kind: 'small', craft: true },
  { id: 'cornhang', icon: '🌽', zh: '玉米吊飾', cat: 'deco', craft: true },
  { id: 'vegbasket', icon: '🧺', zh: '蔬菜籃', cat: 'kitchen', kind: 'small', craft: true },
  { id: 'driftshelf', icon: '🪵', zh: '漂流木小架', cat: 'table', top: 0.5, craft: true },
  { id: 'shellframe', icon: '🖼️', zh: '貝殼相框', cat: 'deco', kind: 'small', craft: true },
  // 11/07 擴充：♻️ 回收手作 8 種＋🌿 自然手作 7 種
  { id: 'bottle_lamp', icon: '💡', zh: '寶特瓶小燈', cat: 'light', kind: 'small', craft: true },
  { id: 'tire_swing', icon: '🛞', zh: '輪胎鞦韆', cat: 'sit', seat: 0.42, craft: true },
  { id: 'bottle_charm', icon: '🍾', zh: '漂流瓶吊飾', cat: 'deco', craft: true },
  { id: 'can_planter', icon: '🥫', zh: '鋁罐小盆栽', cat: 'plant', kind: 'small', craft: true },
  { id: 'net_basket', icon: '🧺', zh: '漁網吊籃', cat: 'deco', craft: true },
  { id: 'umbrella_lamp', icon: '☂️', zh: '雨傘吊燈', cat: 'light', craft: true },
  { id: 'slipper_pot', icon: '🩴', zh: '拖鞋花盆', cat: 'plant', kind: 'small', craft: true },
  { id: 'float_chime', icon: '🎐', zh: '浮標風鈴', cat: 'deco', craft: true },
  { id: 'log_bench', icon: '🪵', zh: '原木長凳', cat: 'sit', seat: 0.3, craft: true },
  { id: 'glowmush_lamp', icon: '🍄', zh: '發光蘑菇燈', cat: 'light', kind: 'small', craft: true },
  { id: 'bug_frame', icon: '🦋', zh: '昆蟲標本框', cat: 'deco', kind: 'small', craft: true },
  { id: 'pressed_flower', icon: '🌸', zh: '押花畫', cat: 'deco', kind: 'small', craft: true },
  { id: 'crystal_sun', icon: '💎', zh: '水晶窗飾', cat: 'deco', craft: true },
  { id: 'pearl_lamp', icon: '🦪', zh: '珍珠貝殼燈', cat: 'light', kind: 'small', craft: true },
  { id: 'meteor_lamp', icon: '☄️', zh: '流星吊燈', cat: 'light', craft: true },
  // ---- 🎁 分享禮物（小舖買不到） ----
  { id: 'postcard', icon: '📮', zh: '營火明信片牆', cat: 'deco', gift: 'share' },
  { id: 'foxlamp', icon: '🏮', zh: '狐狸提燈', cat: 'light', kind: 'small', gift: 'ref1' },
  { id: 'telescope', icon: '🔭', zh: '星空望遠鏡', cat: 'deco', gift: 'ref5' },
  // 🌅 早安卡：來營地滿 7 天的大禮（11/09，每輪送一件，依序；只有這裡拿得到）
  { id: 'login_lantern', icon: '🏮', zh: '星星紙燈籠', cat: 'light', kind: 'small', gift: 'login' },
  { id: 'login_terrarium', icon: '🪴', zh: '玻璃小花園', cat: 'plant', kind: 'small', gift: 'login' },
  { id: 'login_candle', icon: '🕯️', zh: '香氛蠟燭罐', cat: 'light', kind: 'small', gift: 'login' },
  { id: 'login_foxpillow', icon: '🦊', zh: '狐狸抱枕', cat: 'toy', gift: 'login' },
  // ---- 🎫 月票家具（11/09 定案）：pass: 1＝兩種月票都能買（2＝只有星空）；買了永久保留，不能送人 ----
  { id: 'pass_eggchair', icon: '🪺', zh: '吊籃椅', price: 40, cat: 'sit', seat: 0.5, pass: 1 },
  { id: 'pass_cloudrug', icon: '☁️', zh: '雲朵地毯', price: 35, cat: 'rug', kind: 'mat', top: 0.06, walk: true, pass: 1 },
  { id: 'pass_glowtree', icon: '🌳', zh: '發光室內小樹', price: 60, cat: 'plant', pass: 1 },
  { id: 'pass_gramophone', icon: '📀', zh: '唱片機', price: 50, cat: 'deco', pass: 1 },
  { id: 'pass_chandelier', icon: '💎', zh: '水晶吊燈', price: 70, cat: 'light', walk: true, pass: 1 }, // 吊在半空，底下走得過去
  { id: 'pass_canopybed', icon: '🛏️', zh: '四柱紗帳床', price: 90, cat: 'sit', seat: 0.32, sleep: true, long: 0.6, pass: 1 },
  // ---- 🎁 12 月聖誕禮盒（支持營地送的，不賣、不能送人；box: 1）：小東西 3 選 1＋大件 ----
  { id: 'box12_tree', icon: '🎄', zh: '室內聖誕樹', cat: 'plant', box: 1, big: 1, gift: 'box' },
  { id: 'box12_ginger', icon: '🏠', zh: '薑餅屋', cat: 'deco', kind: 'small', box: 1, gift: 'box' },
  { id: 'box12_gifts', icon: '🎁', zh: '禮物盒堆', cat: 'deco', box: 1, gift: 'box' },
  { id: 'box12_stocking', icon: '🧦', zh: '聖誕襪掛架', cat: 'deco', box: 1, gift: 'box' },
  // ---- 🍳 11/14 廚房家具（作者定案）：cook＝在家煮料理（stove 一般料理、oven 只做甜點）；dine＝餐桌擺幾道料理請客，chairs＝椅子位置 ----
  { id: 'k_counter', icon: '🚰', zh: '流理台', price: 25, cat: 'kitchen', top: 0.62 },
  { id: 'k_gasstove', icon: '🍳', zh: '瓦斯爐', price: 40, cat: 'kitchen', cook: 'stove' },
  { id: 'k_hearth', icon: '🧱', zh: '磚造灶台', price: 50, cat: 'kitchen', cook: 'stove', color: false },
  { id: 'k_oven', icon: '🥧', zh: '小烤箱', price: 35, cat: 'kitchen', cook: 'oven' },
  { id: 'k_dishrack', icon: '🥣', zh: '碗盤架', price: 12, cat: 'kitchen', kind: 'small' },
  { id: 'k_dtable_s', icon: '🍽️', zh: '小餐桌', price: 30, cat: 'kitchen', dine: 2, chairs: [[0, 0.5], [0, -0.5]], chairY: 0.24 },
  { id: 'k_dtable_l', icon: '🪑', zh: '大餐桌', price: 60, cat: 'kitchen', dine: 4, wide: 0.8, chairs: [[0, 0.5], [0, -0.5], [0.8, 0.5], [0.8, -0.5]], chairY: 0.24 },
];
/** 🍽️ 餐桌上的盤子放哪（相對格子中心；大餐桌往右多一格） */
export const DINE_SLOTS = {
  k_dtable_s: [[-0.08, 0], [0.08, 0]],
  k_dtable_l: [[-0.06, -0.06], [0.06, 0.06], [0.74, -0.06], [0.86, 0.06]],
};
/** 🌅 早安卡第 7 天大禮的小家具（照順序一輪送一件，全部拿完就只送松果） */
export const LOGIN_GIFTS = ['login_lantern', 'login_terrarium', 'login_candle', 'login_foxpillow'];

export const CATALOG_BY_ID = Object.fromEntries(FURNITURE_CATALOG.map((f) => [f.id, f]));

/** 能不能把 id 放在 belowId 上面（belowId 為空＝空格子，什麼都能放） */
export function canStackOn(belowId, id) {
  const f = CATALOG_BY_ID[id];
  if (!f) return false;
  if (!belowId) return true;
  const b = CATALOG_BY_ID[belowId];
  // 🧱 隔間牆貼在格子邊上：同一格還能再擺一件家具或小東西（不能再放牆或地墊）
  if (b?.kind === 'wall') return f.kind !== 'mat' && f.kind !== 'wall';
  if (f.kind === 'wall') return b?.kind === 'mat';
  if (b?.same && belowId === id) return true; // 🐠 魚缸疊魚缸
  if (!b?.top) return false;
  if (b.kind === 'mat') return f.kind !== 'mat';
  return f.kind === 'small';
}

/** 某一格的家具，從下到上排好（舊存檔沒有 l，當作 0） */
export const stackAt = (items, x, z) =>
  (items ?? []).filter((it) => it.x === x && it.z === z).sort((a, b) => (a.l ?? 0) - (b.l ?? 0));

/** 🗄️ 展示櫃上 6 個位置（相對櫃子中心）：三層、每層左右兩個 */
export const SHELF_SLOTS = [
  [-0.18, 0.1], [0.18, 0.1],
  [-0.18, 0.55], [0.18, 0.55],
  [-0.18, 1.0], [0.18, 1.0],
];
/** 這一疊還能不能再放 id（有展示櫃的話放在櫃子的格子裡） */
export function canAddTo(stack, id) {
  const f = CATALOG_BY_ID[id];
  if (!f) return false;
  const si = stack.findIndex((it) => CATALOG_BY_ID[it.i]?.shelf);
  if (si >= 0) return f.kind === 'small' && stack.length < si + 1 + CATALOG_BY_ID[stack[si].i].shelf;
  if (stack.length >= MAX_STACK) return false;
  return canStackOn(stack.at(-1)?.i ?? null, id);
}
/** 第 level 層放在哪（相對格子中心）：一般往上疊；展示櫃裡的東西排在架子上 */
export function stackOffset(stack, level) {
  const si = stack.findIndex((it) => CATALOG_BY_ID[it.i]?.shelf);
  if (si >= 0 && level > si) {
    const [x, y] = SHELF_SLOTS[level - si - 1] ?? [0, 1.4];
    return { x, y: stackY(stack, si) + y, z: 0.02 };
  }
  return { x: 0, y: stackY(stack, level), z: 0 };
}

/** 一疊家具裡，第 level 層的底部高度 */
export function stackY(stack, level) {
  let y = 0;
  for (let k = 0; k < level && k < stack.length; k++) y += CATALOG_BY_ID[stack[k].i]?.top ?? 0;
  return y;
}

/**
 * 把 (x, z) 這一格第 level 層「連同上面疊的」整個搬到 (tx, tz) 那一格的最上面。
 * 可以的話直接改 items、回傳 null；不行回傳原因代碼。
 *   same：同一格　noStack：疊不上去　stackFull：疊太高　empty：那一層沒東西
 */
export function moveStack(items, x, z, level, tx, tz) {
  if (x === tx && z === tz) return 'same';
  const from = stackAt(items, x, z);
  const moving = from.slice(level);
  if (!moving.length) return 'empty';
  const to = stackAt(items, tx, tz);
  const sim = [...to];
  for (const m of moving) {
    if (!canAddTo(sim, m.i)) return sim.length >= MAX_STACK && !sim.some((it) => CATALOG_BY_ID[it.i]?.shelf) ? 'stackFull' : 'noStack';
    sim.push(m);
  }
  moving.forEach((it, k) => {
    it.x = tx;
    it.z = tz;
    it.l = to.length + k;
  });
  return null;
}

// ---------- 🏡 小木屋二樓 ----------
/** 二樓的格子用 z ≥ LOFT_Z 表示（z - LOFT_Z ＝ 從最後面數來第幾排，x 跟一樓一樣） */
export const LOFT_Z = 100;
/** 二樓前緣在哪（沒放大前的座標）；tentShapes.js 的 CABIN 也用這個 */
export const LOFT_FRONT = 0.2;
/** 二樓有幾排格子（帳篷越大，二樓也越大） */
export const loftRows = (grid) => Math.floor(((LOFT_FRONT + 2.4) * grid) / 6 / 0.8 + 1e-6);
export const isLoftCell = (z) => z >= LOFT_Z;
/** 這頂帳篷有沒有二樓 */
export const hasLoft = (home) => home?.shape === 'cabin' || home?.shape === 'treehouse' || home?.shape === 'houseboat'; // 🏡 雙層小木屋、🌳 私人樹屋、⛵ 船屋有二樓

// ---------- 帳篷擴建 ----------
/** 帳篷地板一開始 6×6 格，用松果一次擴一圈，最大 20×20 */
export const GRID_BASE = 6;
export const GRID_MAX = 20;
/** 擴建到 N×N 要多少松果（一次比一次貴；11 以後是要存很久的大目標） */
export const EXPAND_PRICES = { 7: 40, 8: 70, 9: 110, 10: 160, 11: 220, 12: 260, 13: 300, 14: 350, 15: 400, 16: 460, 17: 520, 18: 590, 19: 660, 20: 740 };
export const gridOf = (home) => Math.min(GRID_MAX, Math.max(GRID_BASE, Math.floor(Number(home?.grid) || GRID_BASE)));
/** 下一次擴建的價格（已經最大了回傳 null） */
export const expandPrice = (home) => EXPAND_PRICES[gridOf(home) + 1] ?? null;
/** 帳篷裡最多擺幾件（格子數＋疊放的額外空間） */
export const maxItems = (grid, loft = false) => Math.min(ITEMS_CAP, grid * grid + 24 + (loft ? grid * loftRows(grid) : 0));
/** 不管帳篷多大，最多擺幾件（太多手機會卡） */
export const ITEMS_CAP = 260;
/** 每一格最多疊幾層（地墊＋家具＋小東西） */
export const MAX_STACK = 3;
