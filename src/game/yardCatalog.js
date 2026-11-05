/**
 * 🚙 門口擺設（帳篷營地裡，自己帳篷門口旁邊的大型擺設）。前端、伺服器共用的資料。
 * 一次擺一樣，買過的可以隨時換；越大的越貴，是要存很久的目標。
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
];
export const YARD_BY_ID = Object.fromEntries(YARD_ITEMS.map((x) => [x.id, x]));
