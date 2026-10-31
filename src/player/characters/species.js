import { t } from '../../i18n/i18n.js';

/**
 * 可以選的動物。伺服器只存索引（0 ~ 5）。
 *   ears   耳朵形狀：fox 狐狸／cat 貓／round 圓耳／long 兔耳／dog 柴犬
 *   tail   尾巴：fox 蓬蓬／cat 細長捲起／stub 小圓球／cotton 棉花球／curl 捲捲
 *   face   臉的畫法（見 ProceduralFox.js 的 makeFaceTextures）
 *   fixed  固定配色（熊貓不能換毛色）
 */
export const SPECIES = [
  { id: 'fox', name: t('狐狸'), icon: '🦊', ears: 'fox', tail: 'fox', face: 'fox', defaultFur: 0 },
  { id: 'cat', name: t('貓咪'), icon: '🐱', ears: 'cat', tail: 'cat', face: 'cat', defaultFur: 3 },
  { id: 'bear', name: t('小熊'), icon: '🐻', ears: 'round', tail: 'stub', face: 'bear', defaultFur: 4 },
  { id: 'rabbit', name: t('兔子'), icon: '🐰', ears: 'long', tail: 'cotton', face: 'rabbit', defaultFur: 2 },
  {
    id: 'panda',
    name: t('熊貓'),
    icon: '🐼',
    ears: 'round',
    tail: 'stub',
    face: 'panda',
    fixed: { fur: 0xf6f3ec, dark: 0x2f2b2b }, // 白身體＋黑手腳黑耳朵
  },
  { id: 'dog', name: t('柴犬'), icon: '🐕', ears: 'dog', tail: 'curl', face: 'dog', defaultFur: 0 },
];
