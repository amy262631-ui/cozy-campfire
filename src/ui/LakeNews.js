import { t } from '../i18n/i18n.js';
import { FISH } from '../fishing/fishData.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return t('剛剛');
  if (m < 60) return t('{n} 分鐘前', { n: m });
  return t('{n} 小時前', { n: Math.floor(m / 60) });
}

/**
 * 湖畔即時動態：在營火旁（和其他地點）也看得到湖邊誰釣到了什麼魚。
 * 稀有魚會發光並跳出提示；按「去湖邊 ›」直接過去。
 *   push(item)       新的一筆 { name, fish, size, rank, at }
 *   setAll(list)     加入或換房間時，伺服器給的最近幾筆
 *   setRoom(id)      在湖邊（看得到本人）或專注帳篷（安靜）時不顯示
 */
export class LakeNews {
  constructor({ hud, onGo, compact = false, root = document.getElementById('ui') }) {
    this.hud = hud;
    this.onGo = onGo;
    this.max = compact ? 1 : 3;
    this.items = [];
    this.room = 'forest_main';
    root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="lake-news" id="lake-news" hidden>
        <div class="ln-head">
          <span>${t('📣 即時動態')}</span>
          <button type="button" class="ln-go" id="ln-go">${t('去湖邊 ›')}</button>
        </div>
        <div class="ln-list" id="ln-list"></div>
      </div>
      `,
    );
    this.el = root.querySelector('#lake-news');
    this.list = root.querySelector('#ln-list');
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.querySelector('#ln-go').addEventListener('click', () => this.onGo?.());
    setInterval(() => this.#render(false), 30000); // 更新「幾分鐘前」
  }

  setRoom(id) {
    this.room = id;
    this.#render(false);
  }

  setAll(list) {
    this.items = (list ?? []).slice(-8);
    this.#render(false);
  }

  push(item) {
    this.items.push(item);
    this.items = this.items.slice(-8);
    this.#render(true);
    if (item.kind && item.kind !== 'fish') return;
    const f = FISH[item.fish];
    // 稀有魚（4 星以上）：不在湖邊的人也跳出提示，吸引大家過去看
    // 五星以上另有全伺服器大公告（main.js 的 bigCatch），這裡只提示四星
    if (f && f.rarity === 4) {
      this.hud.toast(t('🎉 {name} 釣到了稀有的{fish}（{size} 公分）！', { name: item.name, fish: f.name, size: item.size }), 5000);
    }
  }

  #render(fresh) {
    // 在哪裡都看得到（湖畔、專注帳篷、自己家都一樣）
    const hidden = !this.items.length;
    this.el.hidden = hidden;
    if (hidden) return;
    this.el.querySelector('#ln-go').hidden = this.room === 'lake_dock'; // 已經在湖邊就不用「去湖邊」
    const shown = this.items.slice(-this.max).reverse();
    this.list.innerHTML = shown
      .map((it, i) => {
        const fresh1 = fresh && i === 0 ? ' fresh' : '';
        if (it.kind && it.kind !== 'fish') {
          const TEXT = {
            fire: t('🔥 {name} 幫營火添了柴'),
            stone: t('🪨 {name} 在石塔放了一顆石頭'),
            wish: t('🎋 {name} 掛上了繪馬'),
            hang: t('🎄 {name} 在心願大樹掛了裝飾'),
          };
          const text = (TEXT[it.kind] ?? '').replace('{name}', esc(it.name));
          if (!text) return '';
          return `
          <div class="ln-item${fresh1}">
            <div class="ln-main">${text}</div>
            <div class="ln-meta">${ago(it.at)}</div>
          </div>`;
        }
        const f = FISH[it.fish] ?? FISH[0];
        const stars = '★'.repeat(f.rarity);
        const rare = f.rarity >= 4 ? (f.rarity >= 5 ? ' legend' : ' rare') : '';
        return `
          <div class="ln-item${rare}${fresh1}">
            <div class="ln-main">${t('{name} 釣到 <b>{size}cm {fish}</b>', { name: esc(it.name), size: it.size, fish: f.name })}</div>
            <div class="ln-meta"><span class="ln-stars">${stars}</span>${it.rank ? ` · ${t('排行第 {n} 名', { n: it.rank })}` : ''} · ${ago(it.at)}</div>
          </div>`;
      })
      .join('');
  }
}
