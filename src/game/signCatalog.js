/**
 * 🪧 營位門牌造型（帳篷營地每一格營位門口的牌子，寫「A 區 7 號」＋主人名字）。前端、伺服器共用。
 *   id 只能往後加（存在 homes[vid].sign、homes[vid].signs）；pass:'star'＝星空月票有效時才能用
 */
export const SIGNS = [
  { id: 'wood', icon: '🪵', zh: '木頭小立牌', price: 0, note: '最基本的木頭小牌子' },
  { id: 'stone', icon: '🪨', zh: '刻字石頭', price: 20, note: '在大石頭上刻字，很有味道' },
  { id: 'mailbox', icon: '📮', zh: '復古信箱門牌', price: 35, note: '紅色小信箱下面掛著門牌' },
  { id: 'lantern', icon: '🏮', zh: '燈籠門牌', price: 45, note: '旁邊掛一盞燈籠，晚上會亮' },
  { id: 'wreath', icon: '🌸', zh: '花圈門牌', price: 45, note: '門牌外面圍一圈小花' },
  { id: 'star', icon: '✨', zh: '星星吊牌', price: 60, note: '掛在木架上的星星，晚上會閃' },
  { id: 'galaxy', icon: '🌌', zh: '星空門牌', price: 0, pass: 'star', note: '星空月票限定：深藍圓弧牌＋會閃的星星' },
];
export const SIGN_BY_ID = Object.fromEntries(SIGNS.map((s) => [s.id, s]));
