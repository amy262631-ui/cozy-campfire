/**
 * 手機震動。
 * - 安卓：瀏覽器支援 navigator.vibrate，可以照節奏震
 * - iPhone：Safari 不支援 vibrate；iOS 18 起點一下隱藏的「開關」元件會有一下觸覺回饋，
 *   這裡用它模擬（較舊的 iPhone 沒有效果，所以遊戲同時會用畫面搖晃當作「震動」）
 */
let iosSwitch = null;

function ensureIosSwitch() {
  if (iosSwitch) return iosSwitch;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  Object.assign(label.style, {
    position: 'fixed',
    left: '-100px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  // 不要讓這個點擊觸發遊戲裡的其他東西
  label.addEventListener('click', (e) => e.stopPropagation());
  document.body.appendChild(label);
  iosSwitch = label;
  return label;
}

/**
 * @param {number | number[]} pattern 毫秒；陣列為「震、停、震、停…」
 */
export function haptic(pattern = 25) {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return;
    }
  } catch {
    /* 有些瀏覽器會擋，略過 */
  }
  const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
  const sw = ensureIosSwitch();
  for (let i = 0; i < Math.min(pulses, 4); i++) setTimeout(() => sw.click(), i * 110);
}
