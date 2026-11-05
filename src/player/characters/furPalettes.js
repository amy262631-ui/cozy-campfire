import { t } from '../../i18n/i18n.js';

/** 毛色選項（伺服器只存索引）：0 ~ 4 一般、5 以後是特殊毛色 */
export const FUR_PALETTES = [
  { name: t('杏桃'), fur: 0xf4b27e, dark: 0xe39a68 },
  { name: t('奶茶'), fur: 0xdcbf9f, dark: 0xc6a684 },
  { name: t('雪白'), fur: 0xf6f0e7, dark: 0xe2d8ca },
  { name: t('灰灰'), fur: 0xbdb7b2, dark: 0xa29c97 },
  { name: t('可可'), fur: 0xab7b58, dark: 0x926447 },
  // ---- 🐾 特殊毛色（用松果買，looks.js） ----
  { name: t('橘貓'), fur: 0xf0a050, dark: 0xd57a32 },
  { name: t('黑貓'), fur: 0x3d3836, dark: 0x262220 },
  { name: t('暹羅'), fur: 0xf1e4cf, dark: 0x5e4334 },
  { name: t('藍灰'), fur: 0x96a2b2, dark: 0x6c7788 },
  { name: t('賓士'), fur: 0xf6f0e7, dark: 0x2f2b2b },
  { name: t('三花'), fur: 0xf6efe4, dark: 0xd8843a },
];
