import { t } from '../i18n/i18n.js';

/**
 * 🖱️ 被別的網站用 iframe 嵌進去時（遊戲入口網站，例如 gggames.cc）：
 *   鍵盤要先「點一下遊戲畫面」才收得到 → 很多人按 WASD 沒反應就走了（作者 11/12：英文玩家進來沒動就離開）。
 *   ① 一開始還沒點過：整個畫面蓋一層「點一下開始」
 *   ② 玩到一半點到外面（鍵盤失效）：下面出現小提示「點一下畫面繼續」
 * 手機（觸控）不需要，不顯示；直接開網址（不是 iframe）也不顯示。
 */
export function setupFrameFocus() {
  let inFrame = false;
  try {
    inFrame = window.self !== window.top;
  } catch {
    inFrame = true; // 跨網域讀不到 top，也是被嵌進去
  }
  if (!inFrame) return;
  const touch = () => document.body.classList.contains('touch') || matchMedia('(pointer: coarse)').matches;
  try {
    window.focus();
  } catch {
    /* 有些瀏覽器不讓 iframe 自己拿焦點 */
  }
  const ov = document.createElement('div');
  ov.className = 'frame-focus';
  ov.innerHTML = `<div class="ff-card"><div class="ff-ic">🖱️</div><b>${t('點一下開始玩')}</b><small>${t('點了之後就能用 WASD 走路')}</small></div>`;
  const pill = document.createElement('div');
  pill.className = 'frame-pill';
  pill.textContent = t('🖱️ 點一下遊戲畫面就能繼續用鍵盤');
  pill.hidden = true;
  document.body.append(ov, pill);
  const hideAll = () => {
    ov.remove();
    pill.hidden = true;
  };
  const start = () => {
    try {
      window.focus();
    } catch {
      /* 同上 */
    }
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 300);
    pill.hidden = true;
  };
  ov.addEventListener('pointerdown', start);
  // 已經有焦點（玩家先點了）或是手機：不用蓋
  const check = () => {
    if (touch() || document.hasFocus()) hideAll();
  };
  setTimeout(check, 50);
  window.addEventListener('focus', () => {
    if (ov.isConnected) start();
    pill.hidden = true;
  });
  window.addEventListener('blur', () => {
    if (!touch() && !ov.isConnected) pill.hidden = false;
  });
  window.addEventListener('pointerdown', () => (pill.hidden = true));
}
