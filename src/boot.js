/**
 * 🚀 遊戲入口（作者 11/27 省流量）：選外文的人先下載翻譯字典，再載入遊戲。
 *   遊戲裡很多文字在一載入就翻好，所以字典一定要比遊戲先到。
 *   字典下載失敗就先用中文顯示，遊戲照常進得去。
 */
import { loadDict } from './i18n/i18n.js';

loadDict()
  .catch((err) => console.warn('[翻譯] 字典載入失敗，先用中文', err))
  .finally(() => import('./main.js'));
