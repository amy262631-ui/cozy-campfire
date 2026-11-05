/**
 * 造型收集（前端、伺服器共用；只放資料，3D 模型在 src/player/outfit3d.js）。
 *
 *   id     代號（存檔用，不能改）
 *   slot   部位：head 頭、back 背、neck 脖子、hair 頭髮（可以同時穿戴）
 *   kind   3D 形狀（見 outfit3d.js）
 *   c1/c2  主色、副色
 *   glow   會微微發光
 *   src    拿到的方式：daily 每日造型（朋友點分享連結進來玩 1 分鐘才送）、weekly 每週限定（朋友透過連結來玩）、date 營火之約限定、eco 垃圾圖鑑收集完、sponsor 贊助限定假髮
 *
 * ⚠️ 只能往後加，不能刪、不能改順序：線上同步用「第幾個」當代號。
 * 小黃花、四葉草是作者專屬（贊助回饋），不在這裡，也不當獎勵。
 */
export const OUTFIT_SLOTS = [
  { id: 'head', icon: '👒', zh: '頭' },
  { id: 'back', icon: '🎒', zh: '背' },
  { id: 'neck', icon: '🧣', zh: '脖子' },
  { id: 'hair', icon: '💇', zh: '頭髮' }, // 💇 贊助限定假髮（可以跟帽子一起戴）
];

export const OUTFITS = [
  // ---- 每日造型（30 款，固定輪替，約一個月一輪） ----
  { id: 'beanie_red', slot: 'head', kind: 'beanie', c1: 0xc9483c, c2: 0xfff3e2, icon: '🧶', zh: '紅色毛線帽', src: 'daily' },
  { id: 'scarf_mustard', slot: 'neck', kind: 'scarf', c1: 0xe0a83a, c2: 0xb57d22, icon: '🧣', zh: '芥末黃圍巾', src: 'daily' },
  { id: 'pack_canvas', slot: 'back', kind: 'backpack', c1: 0xc8a477, c2: 0x7a5534, icon: '🎒', zh: '帆布小背包', src: 'daily' },
  { id: 'straw_hat', slot: 'head', kind: 'straw', c1: 0xe8c77e, c2: 0xc9483c, icon: '👒', zh: '小草帽', src: 'daily' },
  { id: 'bow_red', slot: 'neck', kind: 'bowtie', c1: 0xd2453c, c2: 0xa8322a, icon: '🎀', zh: '紅色小領結', src: 'daily' },
  { id: 'bedroll', slot: 'back', kind: 'bedroll', c1: 0x5f8a5a, c2: 0x7a5534, icon: '🛌', zh: '露營睡袋捲', src: 'daily' },
  { id: 'beret_navy', slot: 'head', kind: 'beret', c1: 0x34466e, c2: 0x34466e, icon: '🎨', zh: '深藍貝雷帽', src: 'daily' },
  { id: 'beads_pastel', slot: 'neck', kind: 'beads', c1: 0xffc9d6, c2: 0xbfe3ff, icon: '📿', zh: '粉彩珠珠項鍊', src: 'daily' },
  { id: 'pack_mint', slot: 'back', kind: 'backpack', c1: 0x9ed8c2, c2: 0xfff3e2, icon: '🎒', zh: '薄荷綠背包', src: 'daily' },
  { id: 'mush_cap', slot: 'head', kind: 'mushroom', c1: 0xd2453c, c2: 0xfff6ea, icon: '🍄', zh: '紅蘑菇帽', src: 'daily' },
  { id: 'bandana_blue', slot: 'neck', kind: 'bandana', c1: 0x4a74b5, c2: 0xffffff, icon: '🔷', zh: '藍色小領巾', src: 'daily' },
  { id: 'leaf_cape', slot: 'back', kind: 'cape', c1: 0x6aa35a, c2: 0x3f7a3a, icon: '🍃', zh: '葉子披風', src: 'daily' },
  { id: 'acorn_cap', slot: 'head', kind: 'acorn', c1: 0x8a5a32, c2: 0x5e3c20, icon: '🌰', zh: '橡實帽', src: 'daily' },
  { id: 'bell_collar', slot: 'neck', kind: 'bell', c1: 0xd2453c, c2: 0xf2c14e, icon: '🔔', zh: '鈴鐺項圈', src: 'daily' },
  { id: 'butterfly', slot: 'back', kind: 'wings', c1: 0xffb46b, c2: 0x6a3f22, icon: '🦋', zh: '橘色蝴蝶翅膀', src: 'daily' },
  { id: 'cap_green', slot: 'head', kind: 'cap', c1: 0x5f8a5a, c2: 0xfff3e2, icon: '🧢', zh: '森林綠鴨舌帽', src: 'daily' },
  { id: 'scarf_stripe', slot: 'neck', kind: 'scarf', c1: 0xf3c9d2, c2: 0xffffff, stripe: true, icon: '🧣', zh: '粉白條紋圍巾', src: 'daily' },
  { id: 'lantern_pack', slot: 'back', kind: 'lanternpack', c1: 0x8a6a4a, c2: 0xffc56a, glow: true, icon: '🏮', zh: '小燈籠背架', src: 'daily' },
  { id: 'earmuffs', slot: 'head', kind: 'earmuff', c1: 0xfff3e2, c2: 0xc9a0dc, icon: '🎧', zh: '毛毛耳罩', src: 'daily' },
  { id: 'acorn_pendant', slot: 'neck', kind: 'pendant', c1: 0x8a5a32, c2: 0x3a2a1a, icon: '🌰', zh: '橡實小墜子', src: 'daily' },
  { id: 'pack_berry', slot: 'back', kind: 'backpack', c1: 0xb5466a, c2: 0xffd6e2, icon: '🎒', zh: '莓果色背包', src: 'daily' },
  { id: 'beanie_mint', slot: 'head', kind: 'beanie', c1: 0x9ed8c2, c2: 0xffffff, icon: '🧶', zh: '薄荷毛線帽', src: 'daily' },
  { id: 'bow_dots', slot: 'neck', kind: 'bowtie', c1: 0x34466e, c2: 0xfff3e2, icon: '🎀', zh: '深藍點點領結', src: 'daily' },
  { id: 'shell_pack', slot: 'back', kind: 'shell', c1: 0xd9a46a, c2: 0x8a5a32, icon: '🐌', zh: '蝸牛殼背包', src: 'daily' },
  { id: 'flower_crown', slot: 'head', kind: 'crown', c1: 0xf3a6c0, c2: 0x6aa35a, icon: '💐', zh: '粉紅花圈', src: 'daily' },
  { id: 'scarf_plaid', slot: 'neck', kind: 'scarf', c1: 0x8a3a32, c2: 0x2f4a34, stripe: true, icon: '🧣', zh: '格紋毛圍巾', src: 'daily' },
  { id: 'bedroll_red', slot: 'back', kind: 'bedroll', c1: 0xc9483c, c2: 0x5e3c20, icon: '🛌', zh: '紅格子睡袋', src: 'daily' },
  { id: 'beret_rose', slot: 'head', kind: 'beret', c1: 0xe58a9a, c2: 0xe58a9a, icon: '🎨', zh: '玫瑰貝雷帽', src: 'daily' },
  { id: 'bandana_red', slot: 'neck', kind: 'bandana', c1: 0xc9483c, c2: 0xffffff, icon: '🔺', zh: '紅色小領巾', src: 'daily' },
  { id: 'wings_blue', slot: 'back', kind: 'wings', c1: 0x8ec5f2, c2: 0x34466e, icon: '🦋', zh: '天藍蝴蝶翅膀', src: 'daily' },

  // ---- 每週限定（朋友真的透過你的連結來玩才拿得到；每週換一款） ----
  { id: 'wk_moth', slot: 'back', kind: 'wings', c1: 0xe9f0ff, c2: 0x9db4ff, glow: true, icon: '🌙', zh: '月光蛾翅膀', src: 'weekly' },
  { id: 'wk_pumpkin', slot: 'head', kind: 'witch', c1: 0xe0782a, c2: 0x3a2a1a, icon: '🎃', zh: '南瓜小巫帽', src: 'weekly' },
  { id: 'wk_firefly', slot: 'neck', kind: 'jar', c1: 0xd8f0ff, c2: 0xd8ff7a, glow: true, icon: '✨', zh: '螢火蟲小瓶項鍊', src: 'weekly' },
  { id: 'wk_pinecone', slot: 'back', kind: 'pinepack', c1: 0x8a5a32, c2: 0x5e3c20, icon: '🌲', zh: '松果背包', src: 'weekly' },
  { id: 'wk_star_scarf', slot: 'neck', kind: 'scarf', c1: 0x2a3560, c2: 0xffe08a, stripe: true, icon: '⭐', zh: '星夜圍巾', src: 'weekly' },
  { id: 'wk_forest_crown', slot: 'head', kind: 'crown', c1: 0xffd56a, c2: 0x3f7a3a, icon: '🌿', zh: '森林花冠', src: 'weekly' },
  { id: 'wk_cloud_pack', slot: 'back', kind: 'cloud', c1: 0xffffff, c2: 0xdbe8ff, icon: '☁️', zh: '雲朵背包', src: 'weekly' },
  { id: 'wk_snow_hat', slot: 'head', kind: 'beanie', c1: 0xe9f0ff, c2: 0x8ec5f2, icon: '❄️', zh: '雪花毛線帽', src: 'weekly' },

  // ---- 營火之約限定（朋友在 9:30 營火時間透過你的連結進來，兩個人都拿到） ----
  { id: 'dt_ember_scarf', slot: 'neck', kind: 'scarf', c1: 0xf08a3c, c2: 0xffd06a, glow: true, icon: '🔥', zh: '營火圍巾', src: 'date' },
  { id: 'dt_marsh_hat', slot: 'head', kind: 'marsh', c1: 0xfff6ea, c2: 0xe0a060, icon: '🍡', zh: '烤棉花糖帽', src: 'date' },
  { id: 'dt_meteor_pack', slot: 'back', kind: 'lanternpack', c1: 0x34466e, c2: 0xbfe0ff, glow: true, icon: '🌠', zh: '流星燈背架', src: 'date' },

  // ---- ♻️ 垃圾圖鑑全部收集完 ----
  { id: 'eco_bandana', slot: 'neck', kind: 'bandana', c1: 0x5fae4a, c2: 0xffffff, icon: '♻️', zh: '淨灘小隊領巾', src: 'eco' },

  // ---- 💇 贊助限定假髮：每個月一款女生、一款男生（誰都可以挑），那個月贊助 NT$100 以上二選一（month＝哪個月的） ----
  { id: 'wig_curly', slot: 'hair', kind: 'hair', hair: 'cloudcurl', sex: 'f', c1: 0xc68a5a, c2: 0xf3a6c0, icon: '☁️', zh: 'QQ 雲朵捲', src: 'sponsor', month: '2026-11' },
  { id: 'wig_twin', slot: 'hair', kind: 'hair', hair: 'twin', sex: 'f', c1: 0xf2cf6b, c2: 0xd2453c, icon: '🎀', zh: '聖誕雙馬尾', src: 'sponsor', month: '2026-12' },
  { id: 'wig_bun', slot: 'hair', kind: 'hair', hair: 'bun', sex: 'f', c1: 0x4a3428, c2: 0xd2453c, icon: '🍡', zh: '新年包包頭', src: 'sponsor', month: '2027-01' },
  { id: 'wig_wavy', slot: 'hair', kind: 'hair', hair: 'wavy', sex: 'f', c1: 0xe58a9a, c2: 0xfff3e2, icon: '🌊', zh: '粉紅波浪長髮', src: 'sponsor', month: '2027-02' },
  { id: 'wig_bob', slot: 'hair', kind: 'hair', hair: 'bob', sex: 'f', c1: 0x8a5634, c2: 0xf2c14e, icon: '💇', zh: '齊瀏海妹妹頭', src: 'sponsor', month: '2027-03' },
  { id: 'wig_pony', slot: 'hair', kind: 'hair', hair: 'pony', sex: 'f', c1: 0xa58ad8, c2: 0xffe08a, icon: '🎐', zh: '薰衣草高馬尾', src: 'sponsor', month: '2027-04' },
  { id: 'wig_cloudshort', slot: 'hair', kind: 'hair', hair: 'cloudshort', sex: 'm', c1: 0x8a5a3a, c2: 0x8a5a3a, icon: '⛅', zh: '雲朵微捲短髮', src: 'sponsor', month: '2026-11' },
  { id: 'wig_spiky', slot: 'hair', kind: 'hair', hair: 'spiky', sex: 'm', c1: 0xe0a050, c2: 0xe0a050, icon: '⚡', zh: '軟軟刺刺頭', src: 'sponsor', month: '2026-12' },
  { id: 'wig_manbun', slot: 'hair', kind: 'hair', hair: 'manbun', sex: 'm', c1: 0x3a2c28, c2: 0x8a5a3a, icon: '🥢', zh: '小揪揪', src: 'sponsor', month: '2027-01' },
  { id: 'wig_quiff', slot: 'hair', kind: 'hair', hair: 'quiff', sex: 'm', c1: 0x5a6478, c2: 0x5a6478, icon: '😎', zh: '側分油頭', src: 'sponsor', month: '2027-02' },
  { id: 'wig_bowl', slot: 'hair', kind: 'hair', hair: 'bowl', sex: 'm', c1: 0x7a4a2a, c2: 0x7a4a2a, icon: '🍉', zh: '西瓜頭', src: 'sponsor', month: '2027-03' },
  { id: 'wig_fluffy', slot: 'hair', kind: 'hair', hair: 'fluffy', sex: 'm', c1: 0x4a3a6a, c2: 0x4a3a6a, icon: '🌬️', zh: '蓬鬆短髮', src: 'sponsor', month: '2027-04' },
  { id: 'wig_braids', slot: 'hair', kind: 'hair', hair: 'braids', sex: 'f', c1: 0x6a4030, c2: 0xd2453c, icon: '🧶', zh: '麻花雙辮', src: 'sponsor', month: '2027-05' },
];

export const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
/** 線上同步用的代號：第幾個 +1（0＝沒穿） */
export const outfitCode = (id) => (OUTFIT_BY_ID[id] ? OUTFITS.indexOf(OUTFIT_BY_ID[id]) + 1 : 0);
export const outfitOfCode = (n) => OUTFITS[n - 1] ?? null;

export const DAILY_OUTFITS = OUTFITS.filter((o) => o.src === 'daily');
export const WEEKLY_OUTFITS = OUTFITS.filter((o) => o.src === 'weekly');
export const DATE_OUTFITS = OUTFITS.filter((o) => o.src === 'date');
export const SPONSOR_OUTFITS = OUTFITS.filter((o) => o.src === 'sponsor');
/** 這個月（'YYYY-MM'）可以挑的贊助假髮（女生款在前）；還沒排到的月份就用最後排好的那個月 */
export const sponsorOutfits = (month) => {
  let list = SPONSOR_OUTFITS.filter((o) => o.month === month);
  if (!list.length) {
    const last = SPONSOR_OUTFITS.map((o) => o.month).sort().at(-1);
    list = SPONSOR_OUTFITS.filter((o) => o.month === last);
  }
  return list.sort((a, b) => (a.sex === 'f' ? 0 : 1) - (b.sex === 'f' ? 0 : 1));
};

/** 'YYYY-MM-DD' → 從 1970-01-01 算第幾天 */
const dayNum = (dayKey) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
/** 今天的每日造型（dayKey 是台北日期 'YYYY-MM-DD'） */
export const dailyOutfit = (dayKey) => DAILY_OUTFITS[((dayNum(dayKey) % DAILY_OUTFITS.length) + DAILY_OUTFITS.length) % DAILY_OUTFITS.length];
/** 這週的每週限定（週一換） */
export const weekNum = (dayKey) => Math.floor((dayNum(dayKey) + 3) / 7); // 1970-01-01 是週四，+3 讓週一換週
export const weeklyOutfit = (dayKey) => WEEKLY_OUTFITS[weekNum(dayKey) % WEEKLY_OUTFITS.length];
/** 營火之約：還沒拿到的下一款（全部都有了回傳 null） */
export const nextDateOutfit = (owned = []) => DATE_OUTFITS.find((o) => !owned.includes(o.id)) ?? null;
