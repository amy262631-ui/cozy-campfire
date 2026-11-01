import { t } from '../i18n/i18n.js';

/**
 * 心願大樹的裝飾（前端與伺服器共用 id 與價格；伺服器另有一份價格表 server/index.js 的 ORNAMENT_PRICE）。
 * 價格刻意不高：第一次來做完一個小任務就買得起一個。
 */
export const ORNAMENTS = [
  { id: 'ribbon', icon: '🎀', name: t('紅緞帶'), price: 3, color: 0xe2454f },
  { id: 'heart', icon: '💗', name: t('小愛心'), price: 4, color: 0xff8fb1 },
  { id: 'lantern', icon: '🏮', name: t('小燈籠'), price: 6, color: 0xffa94d, glow: true },
  { id: 'fish', icon: '🐟', name: t('小魚吊飾'), price: 6, color: 0x7cc3ff },
  { id: 'star', icon: '⭐', name: t('星星'), price: 8, color: 0xffd84a, glow: true },
  { id: 'bell', icon: '🎐', name: t('風鈴'), price: 10, color: 0xcfe8ff },
  { id: 'moon', icon: '🌙', name: t('月亮'), price: 12, color: 0xfff1b8, glow: true },
  { id: 'firefly', icon: '✨', name: t('螢火蟲燈'), price: 15, color: 0xb6ff7a, glow: true },
  // 只有每晚營火時間（21:00～21:30）能掛
  { id: 'meteor', icon: '🌠', name: t('流星吊飾'), price: 5, color: 0xbfe3ff, glow: true, eventOnly: true },
];

export const ORNAMENT_BY_ID = Object.fromEntries(ORNAMENTS.map((o) => [o.id, o]));
