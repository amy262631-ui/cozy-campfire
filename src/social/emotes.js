import { t } from '../i18n/i18n.js';

/**
 * 表情動作與表情符號。
 * 動作的 id 直接當作 actionState 傳給伺服器（其他人會看到同樣的動作）。
 */
export const EMOTES = [
  { id: 'wave', icon: '👋', label: t('打招呼'), duration: 2.4 },
  { id: 'salute', icon: '🫡', label: t('敬禮'), duration: 2.2 },
  { id: 'bye', icon: '🙋', label: t('掰掰'), duration: 2.6 },
  { id: 'pray', icon: '🙏', label: t('拜拜'), duration: 3.0 },
];

export const EMOTE_IDS = new Set(EMOTES.map((e) => e.id));

/** 可以送出的表情符號（伺服器也只接受這些） */
export const EMOJIS = ['😊', '😂', '🥰', '👍', '❤️', '🎉', '😴', '🥺', '😮', '🔥', '✨', '🍡'];
