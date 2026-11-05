import { t } from '../i18n/i18n.js';
import { FISH } from '../fishing/fishData.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);


/**
 * 📣 即時動態（跑馬燈）：誰釣到魚、誰添了柴、誰掛上繪馬⋯
 * 沒有固定的框框：新的一筆滑進來，停幾秒就淡掉，不會一直擋住畫面。
 *   push(item)     新的一筆 { kind?, name, fish, size, rank, at }
 *   setAll(list)   加入或換房間時伺服器給的最近幾筆（只記著，不跳出來）
 *   setRoom(id)    目前在哪裡（保留介面）
 */
export class LakeNews {
  constructor({ hud, onGo, root = document.getElementById('ui') }) {
    this.hud = hud;
    this.onGo = onGo;
    this.items = [];
    this.room = 'forest_main';
    root.insertAdjacentHTML('beforeend', `<div class="news-line" id="lake-news" hidden></div>`);
    this.el = root.querySelector('#lake-news');
    this.timer = null;
  }

  setRoom(id) {
    this.room = id;
  }

  setAll(list) {
    this.items = (list ?? []).slice(-8);
  }

  push(item) {
    this.items.push(item);
    this.items = this.items.slice(-8);
    this.#show(item);
    if (item.kind && item.kind !== 'fish') return;
    const f = FISH[item.fish];
    // 稀有魚（4 星）：跳出提示；五星以上另有全伺服器大公告（main.js 的 bigCatch）
    if (f && f.rarity === 4) {
      this.hud.toast(t('🎉 {name} 釣到了稀有的{fish}（{size} 公分）！', { name: item.name, fish: f.name, size: item.size }), 5000);
    }
  }

  #text(it) {
    if (it.kind && it.kind !== 'fish') {
      const TEXT = {
        fire: t('🔥 {name} 幫營火添了柴'),
        stone: t('🪨 {name} 在石塔放了一顆石頭'),
        wish: t('🎋 {name} 掛上了繪馬'),
        hang: t('🎄 {name} 在心願大樹掛了裝飾'),
      };
      return (TEXT[it.kind] ?? '').replace('{name}', esc(it.name));
    }
    const f = FISH[it.fish] ?? FISH[0];
    const rare = f.rarity >= 5 ? ' legend' : f.rarity >= 4 ? ' rare' : '';
    return `🎣 ${t('{name} 釣到 <b>{size}cm {fish}</b>', { name: esc(it.name), size: it.size, fish: f.name })}<span class="nl-star${rare}">${'★'.repeat(f.rarity)}</span>${it.rank ? ` · ${t('排行第 {n} 名', { n: it.rank })}` : ''}`;
  }

  #show(it) {
    const html = this.#text(it);
    if (!html) return;
    this.el.innerHTML = `<span class="nl-text">📣 ${html}</span>`;
    this.el.hidden = false;
    this.el.classList.remove('go');
    void this.el.offsetWidth; // 重新播放動畫
    this.el.classList.add('go');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.hidden = true;
      this.el.classList.remove('go');
    }, 7000);
  }
}
