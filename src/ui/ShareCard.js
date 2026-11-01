import { t } from '../i18n/i18n.js';

/** 文字太長自動換行，回傳畫了幾行 */
function wrapText(g, text, x, y, maxW, lineH, maxLines = 3) {
  const lines = [''];
  for (const ch of String(text)) {
    const cur = lines[lines.length - 1];
    if (g.measureText(cur + ch).width > maxW && cur) {
      if (lines.length === maxLines) {
        lines[lines.length - 1] = cur.slice(0, -1) + '…';
        break;
      }
      lines.push(ch);
    } else lines[lines.length - 1] = cur + ch;
  }
  lines.forEach((l, i) => g.fillText(l, x, y + i * lineH));
  return lines.length;
}

const FONT = '"Noto Sans TC", "PingFang TC", "Hiragino Sans", "Malgun Gothic", "Microsoft JhengHei", sans-serif';

/**
 * 分享卡片：把遊戲畫面＋一句話做成直式圖片（1080×1350，適合 IG、Threads），
 * 手機可以直接分享或長按存圖。
 *   snapshot() → 目前遊戲畫面的圖片網址（dataURL）
 */
export class ShareCard {
  constructor({ snapshot, hud, getUrl, onShared, root = document.getElementById('ui') }) {
    this.getUrl = getUrl; // 分享出去的網址（帶邀請代號）
    this.onShared = onShared;
    this.snapshot = snapshot;
    this.hud = hud;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="share-card" id="share-card">
        <div class="share-inner">
          <img id="share-img" alt="" />
          <div class="share-hint">${t('手機：長按圖片可以儲存或分享 📱')}</div>
          <div class="share-actions">
            <button type="button" id="share-go">${t('📤 分享')}</button>
            <a id="share-dl" download="campfire.png">${t('⬇️ 存圖')}</a>
            <button type="button" id="share-close">${t('關閉')}</button>
          </div>
        </div>
      </div>
      `,
    );
    const $ = (s) => root.querySelector(s);
    this.el = $('#share-card');
    this.img = $('#share-img');
    this.dl = $('#share-dl');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    $('#share-close').addEventListener('click', () => this.close());
    $('#share-go').addEventListener('click', () => this.#share());
  }

  close() {
    this.el.classList.remove('show');
  }

  /**
   * @param {{ icon: string, big: string, small?: string, text?: string }} info
   *   big：大字（例如「大吉」「完成疊石許願」），small：小字，text：分享時附的文字
   */
  async open(info) {
    this.info = info;
    const shot = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = this.snapshot();
    });
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1350;
    const g = c.getContext('2d');
    g.fillStyle = '#1d1714';
    g.fillRect(0, 0, 1080, 1350);
    // 上半部：遊戲畫面（置中裁切）
    const H = 860;
    if (shot) {
      const k = Math.max(1080 / shot.width, H / shot.height);
      const w = shot.width * k;
      const h = shot.height * k;
      g.drawImage(shot, (1080 - w) / 2, (H - h) / 2, w, h);
    }
    const fade = g.createLinearGradient(0, H - 260, 0, H + 10);
    fade.addColorStop(0, 'rgba(29,23,20,0)');
    fade.addColorStop(1, 'rgba(29,23,20,1)');
    g.fillStyle = fade;
    g.fillRect(0, H - 260, 1080, 270);
    // 下半部：一句話
    g.textAlign = 'center';
    g.fillStyle = '#ffe6b8';
    g.font = `800 92px ${FONT}`;
    g.fillText(`${info.icon} ${info.big}`, 540, 900);
    if (info.small) {
      g.fillStyle = '#f5e6d3';
      g.font = `500 40px ${FONT}`;
      wrapText(g, info.small, 540, 975, 900, 56, 2);
    }
    g.strokeStyle = 'rgba(255, 200, 140, 0.3)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(340, 1110);
    g.lineTo(740, 1110);
    g.stroke();
    g.fillStyle = '#fff3e2';
    g.font = `800 54px ${FONT}`;
    g.fillText(t('🔥 迷霧森林露營地'), 540, 1190);
    g.fillStyle = 'rgba(245, 230, 211, 0.8)';
    g.font = `400 32px ${FONT}`;
    g.fillText(t('沒力氣出門的夜晚，來營火旁坐一下'), 540, 1245);
    g.fillStyle = 'rgba(255, 180, 107, 0.85)';
    g.font = `500 30px ${FONT}`;
    g.fillText(location.host, 540, 1300);

    this.canvas = c;
    const url = c.toDataURL('image/png');
    this.img.src = url;
    this.dl.href = url;
    this.el.classList.add('show');
  }

  async #share() {
    const text = this.info?.text ?? t('沒力氣出門的夜晚，一起來迷霧森林露營地的營火旁坐一下吧 🔥');
    const url = this.getUrl?.() ?? location.origin + location.pathname;
    try {
      const blob = await new Promise((r) => this.canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'campfire.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text}\n${url}` });
      } else if (navigator.share) {
        await navigator.share({ title: t('迷霧森林露營地'), text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        this.hud.toast(t('已複製分享文字和網址，圖片可以按「存圖」下載 📋'));
      }
      this.onShared?.(); // 分享成功：領分享禮物
    } catch {
      /* 使用者取消分享 */
    }
  }
}
