/**
 * 🚙 門口擺設（帳篷營地裡，自己帳篷門口旁邊的大型擺設）。前端、伺服器共用的資料。
 * 大型擺設一次擺一樣、門口桌椅另外一格；買過的可以隨時換；越大的越貴，是要存很久的目標。
 *   id 代號（存檔用，不能改）　price 松果　zh 名稱　note 一句介紹
 */
export const YARD_ITEMS = [
  { id: 'mailbox', icon: '📮', zh: '小郵筒', price: 40, note: '門口的紅色小郵筒，朋友來過就像收到信' },
  { id: 'picnic', icon: '🧺', zh: '野餐桌', price: 80, note: '木頭野餐桌，桌上有格子布和野餐籃' },
  { id: 'bbq', icon: '🍖', zh: '烤肉爐', price: 100, note: '圓圓的烤肉爐，冒著一點點煙' },
  { id: 'bike', icon: '🚲', zh: '復古腳踏車', price: 130, note: '前面有菜籃的薄荷色腳踏車' },
  { id: 'hammock', icon: '🌴', zh: '吊床', price: 160, note: '兩根木柱中間的條紋吊床' },
  { id: 'canoe', icon: '🛶', zh: '獨木舟', price: 200, note: '靠在架子上的木頭獨木舟和船槳' },
  { id: 'tarp', icon: '⛱️', zh: '天幕和露營椅', price: 260, note: '撐開的天幕下面放兩張露營椅' },
  { id: 'jeep', icon: '🚙', zh: '越野車', price: 480, note: '車頂載著行李的森林綠越野車' },
  { id: 'camper', icon: '🚐', zh: '露營車', price: 650, note: '奶油色的復古露營車，窗戶亮著暖暖的燈' },
  { id: 'airstream', icon: '🚃', zh: '銀色拖車屋', price: 900, note: '亮晶晶的圓弧銀色拖車屋，門口掛著燈串' },
  // ---- 🪑 門口桌椅（slot: 'seat'，跟上面的大型擺設分開擺，兩格可以同時有）----
  { id: 'bench', icon: '🪵', zh: '原木長椅', price: 30, note: '一根大圓木剖半做成的長椅，可以坐兩個人', slot: 'seat' },
  { id: 'bistro', icon: '☕', zh: '小圓桌和椅子', price: 50, note: '白色小圓桌配兩張折疊椅，適合喝茶聊天', slot: 'seat' },
  { id: 'firestool', icon: '🔥', zh: '小火爐和圓木凳', price: 70, note: '鐵製小火爐旁邊放兩個圓木凳，晚上暖暖的', slot: 'seat' },
  { id: 'swing', icon: '🪢', zh: '雙人鞦韆椅', price: 90, note: '木架上掛著有軟墊的鞦韆椅，坐上去會輕輕搖', slot: 'seat' },
];
export const YARD_BY_ID = Object.fromEntries(YARD_ITEMS.map((x) => [x.id, x]));
/** 擺在哪一格：'on' 大型擺設、'seat' 門口桌椅 */
export const yardSlotOf = (id) => (YARD_BY_ID[id]?.slot === 'seat' ? 'seat' : 'on');
/** 這頂帳篷門口有沒有擺這樣東西（兩格都算） */
export const hasYard = (h, id) => !!id && (h?.yard?.on === id || h?.yard?.seat === id);

/**
 * 門口擺設的功能（按 E 跳出選單；只有一種功能的就直接做）
 *   seats：可以坐／躺的位置（擺設模型自己的座標，原尺寸；營地裡會跟著縮小），face＝坐下時面向哪邊，sleep＝躺
 *   use：特別的功能（mail 郵筒、picnic 野餐桌放／拿料理、grill 烤肉爐煮料理、bike 騎車、canoe 划到湖邊、drive 開車去別的地方、cooler 料理保冷箱）
 *   路過的朋友也能坐、能躺；郵筒（看信）、烤肉爐、放料理、保冷箱只有主人能用
 */
export const YARD_USES = {
  mailbox: { use: ['mail'] },
  picnic: { use: ['picnic'], seats: [{ x: -0.35, y: 0.45, z: 0.65, face: Math.PI }, { x: 0.35, y: 0.45, z: -0.65, face: 0 }] },
  bbq: { use: ['grill'] },
  bike: { use: ['bike'] },
  hammock: { seats: [{ x: 0, y: 1.0, z: 0, face: Math.PI / 2, sleep: true }] },
  canoe: { use: ['canoe'] },
  tarp: { seats: [{ x: -0.45, y: 0.45, z: 0.2, face: 0 }, { x: 0.45, y: 0.45, z: 0.2, face: 0 }] },
  jeep: { use: ['drive'], seats: [{ x: -0.1, y: 0.7, z: 0.35, face: Math.PI / 2, driver: true }, { x: -0.1, y: 0.7, z: -0.35, face: Math.PI / 2 }] },
  camper: { seats: [{ x: 1.2, y: 0.25, z: 1.25, face: 0 }, { x: -0.6, y: 1.0, z: 0, face: Math.PI / 2, sleep: true, inside: true }] },
  airstream: { use: ['cooler'], seats: [{ x: -1.1, y: 0.45, z: 1.65, face: 0 }] },
  bench: { seats: [{ x: -0.35, y: 0.42, z: 0, face: 0 }, { x: 0.35, y: 0.42, z: 0, face: 0 }] },
  bistro: { seats: [{ x: -0.55, y: 0.45, z: 0, face: Math.PI / 2 }, { x: 0.55, y: 0.45, z: 0, face: -Math.PI / 2 }] },
  firestool: { seats: [{ x: -0.6, y: 0.35, z: 0.1, face: Math.PI / 2 }, { x: 0.6, y: 0.35, z: 0.1, face: -Math.PI / 2 }] },
  swing: { seats: [{ x: -0.25, y: 0.5, z: 0, face: 0, swing: true }, { x: 0.25, y: 0.5, z: 0, face: 0, swing: true }] },
};
