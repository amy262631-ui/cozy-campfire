/**
 * 📝 名字規則（前後端共用）
 * 作者 11/22：名字不能放符號、表情（🔥 小營火、✨ 星空、🪄 作者這些標誌才看得出來）。
 * 只留：各國文字、數字、空白、和 _ - . · ・ ' 這幾個常用的小符號。
 */
export function cleanNameText(raw) {
  return String(raw ?? '')
    .replace(/[^\p{L}\p{N}\p{M} _\-.·・'’]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
}

/** 🪄 作者標誌（/admin 標成作者的帳號，名字前面加這個；作者 11/22 選魔法棒，🏕️ 是營地居民用的） */
export const AUTHOR_MARK = '🪄';
