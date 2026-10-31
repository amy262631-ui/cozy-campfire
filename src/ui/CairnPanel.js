import { t } from '../i18n/i18n.js';
import { CAIRN_MAX, cairnStats } from '../rooms/cairns.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return t('剛剛');
  if (m < 60) return t('{n} 分鐘前', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{n} 小時前', { n: h });
  return t('{n} 天前', { n: Math.floor(h / 24) });
}

/**
 * 石塔紀錄：這座石塔有幾顆石頭、誰一起堆的、最近放的是誰。
 * getCairns() 回傳全部石塔的石頭陣列；getName() 回傳自己的暱稱。
 */
export class CairnPanel {
  constructor({ getCairns, getName, root = document.getElementById('ui') }) {
    this.getCairns = getCairns;
    this.getName = getName;
    this.index = -1;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="cairn" id="cairn">
        <div class="cairn-card">
          <div class="cairn-body" id="cairn-body"></div>
          <button type="button" class="cairn-close" id="cairn-close">${t('關閉')}</button>
        </div>
      </div>
      `,
    );
    this.el = root.querySelector('#cairn');
    this.body = root.querySelector('#cairn-body');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.target === this.el && this.close());
    root.querySelector('#cairn-close').addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return this.el.classList.contains('show');
  }

  open(i) {
    this.index = i;
    this.el.classList.add('show');
    this.render();
  }

  close() {
    this.el.classList.remove('show');
    this.index = -1;
  }

  /** 有新石頭時，如果正在看那座就更新 */
  refresh(i) {
    if (this.isOpen && (i === undefined || i === this.index)) this.render();
  }

  render() {
    const all = this.getCairns();
    const stones = all[this.index] ?? [];
    const me = this.getName();
    const { people, mine } = cairnStats(stones, me);
    const total = all.reduce((n, c) => n + c.length, 0);
    const everyone = new Set(all.flat().map((s) => s.n)).size;
    const pct = Math.round((stones.length / CAIRN_MAX) * 100);
    const recent = stones.slice(-5).reverse();

    this.body.innerHTML = `
      <div class="cairn-title">${t('🗿 第 {n} 座石塔', { n: this.index + 1 })}</div>
      <div class="cairn-count">
        <b>${stones.length}</b> / ${CAIRN_MAX} ${t('顆')}
        <span class="cairn-bar"><i style="width:${pct}%"></i></span>
      </div>
      <div class="cairn-sub">${
        stones.length
          ? t('{n} 位旅人一起疊起來的', { n: people.length })
          : t('還沒有人疊過，來放第一顆吧 🪨')
      }${mine ? ` · ${t('你放了 {n} 顆', { n: mine })}` : ''}</div>

      ${
        people.length
          ? `<div class="cairn-label">${t('一起堆過的人')}</div>
        <div class="cairn-people">
          ${people
            .slice(0, 40)
            .map(([name, n]) => `<span class="${name === me ? 'me' : ''}">${esc(name)}${n > 1 ? ` <small>×${n}</small>` : ''}</span>`)
            .join('')}
          ${people.length > 40 ? `<span class="more">${t('⋯還有 {n} 位', { n: people.length - 40 })}</span>` : ''}
        </div>
        <div class="cairn-label">${t('最近放上去的')}</div>
        <div class="cairn-recent">
          ${recent.map((s) => `<div><span>🪨 ${esc(s.n)}</span><small>${ago(s.at)}</small></div>`).join('')}
        </div>`
          : ''
      }
      <div class="cairn-hint">${
        stones.length >= CAIRN_MAX
          ? t('這座石塔已經疊滿了 ✨ 謝謝每一位許願的人')
          : t('到石頭堆撿一顆石頭，頂在頭上走過來，放上去許個願 🙏')
      }</div>
      <div class="cairn-total">${t('整片石塔林：{stones} 顆石頭 · {people} 位旅人', { stones: total, people: everyone })}</div>
    `;
  }
}
