/**
 * 📱 帳篷左邊那一疊按鈕（主人：讚／留言本／布置／開放參觀／出去；客人：讚／留言本／出去）
 * 作者 11/26：平板、手機上會壓到下面的「😊 表情／💬 聊天」那排、聊天紀錄、搖桿。
 * 原本固定放在畫面 46% 高，螢幕矮一點就超出去。改成量一下上面（上方按鈕列、新手卡）和下面（聊天列、搖桿）
 * 中間還有多少空間，放得下就照原本樣子，放不下依序換：小一點 → 兩欄 → 一排橫的。
 * 只有觸控裝置（body.touch）才調；電腦照舊（右下角）。
 */
const MODES = ['', 'tight', 'grid', 'row'];
const GAP = 10;

const visible = (el) => {
  if (!el || el.hidden || el.closest('[hidden]')) return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? r : null;
};

/** 跟左邊那一欄（x 0～right）有重疊的東西 */
const inColumn = (r, right) => r && r.left < right;

export function fitLeftStack(el) {
  if (!el) return;
  const reset = () => {
    for (const m of MODES) if (m) el.classList.remove(`ls-${m}`);
    el.style.top = '';
  };
  if (!document.body.classList.contains('touch') || el.hidden || el.classList.contains('stacked')) return reset();
  const H = window.innerHeight;
  const colRight = Math.min(window.innerWidth * 0.5, 260);
  // ⬆️ 上限：上方按鈕列、新手任務卡
  let ceil = 0;
  for (const sel of ['.m-stack', '.hud-top', '#ritual']) {
    for (const x of document.querySelectorAll(sel)) {
      const r = visible(x);
      if (inColumn(r, colRight) && r.top < H * 0.5) ceil = Math.max(ceil, r.bottom);
    }
  }
  ceil += GAP;
  // ⬇️ 下限：聊天列（含聊天紀錄小條）、搖桿
  let floor = H;
  for (const sel of ['#social', '#joystick']) {
    const r = visible(document.querySelector(sel));
    if (inColumn(r, colRight) && r.top > H * 0.3) floor = Math.min(floor, r.top);
  }
  floor -= GAP;
  const pref = H * 0.46;
  for (const m of MODES) {
    reset();
    if (m) el.classList.add(`ls-${m}`);
    const h = el.getBoundingClientRect().height;
    const top = Math.min(pref, floor - h);
    if (top >= ceil || m === 'row') {
      el.style.top = `${Math.max(ceil, top)}px`;
      return;
    }
  }
}

/** 畫面大小改變、聊天列長高（聊天紀錄展開）時重新排 */
export function watchLeftStack(getEls) {
  let raf = 0;
  const run = () => {
    raf = 0;
    for (const el of getEls()) fitLeftStack(el);
  };
  const later = () => {
    if (!raf) raf = requestAnimationFrame(run);
  };
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', () => setTimeout(later, 300));
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(later);
    const watch = () => {
      for (const sel of ['#social', '#joystick', '.m-stack', '#ritual']) for (const x of document.querySelectorAll(sel)) ro.observe(x);
    };
    watch();
    setTimeout(watch, 3000); // 有些元件比較晚才放進畫面
  }
  // 保險：新手卡出現／消失不一定會觸發上面那些，看得到這一疊的時候每秒再對一次（很便宜）
  setInterval(() => {
    if (getEls().some((el) => el && !el.hidden)) later();
  }, 1000);
  return later;
}
