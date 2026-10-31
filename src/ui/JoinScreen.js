import { FUR_PALETTES } from '../player/characters/furPalettes.js';
import { SPECIES } from '../player/characters/species.js';
import { languageRowHtml, bindLanguageRow } from './LanguagePicker.js';
import { randomName } from '../social/names.js';
import { t } from '../i18n/i18n.js';
import { channelButtonHtml, fetchChannels } from './ChannelPanel.js';

const STORE_KEY = 'cozy-campfire-profile';

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * 一進來就用的身分：自己改過的名字會留著；沒改過的話每次換一個隨機名字。
 * 動物與毛色：記住上次的，第一次來就隨機挑一隻。
 */
export function autoProfile(allowSpecies = true) {
  const saved = loadProfile();
  const pick = (n) => Math.floor(Math.random() * n);
  return {
    name: saved.custom && saved.name ? saved.name : randomName(),
    species: allowSpecies ? (Number.isInteger(saved.species) && SPECIES[saved.species] ? saved.species : pick(SPECIES.length)) : 0,
    fur: Number.isInteger(saved.fur) ? saved.fur : pick(FUR_PALETTES.length),
    code: saved.code || '',
    custom: !!saved.custom,
  };
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(profile));
  } catch {
    /* 無痕模式等情況存不了，沒關係 */
  }
}


/**
 * 進場畫面：輸入暱稱、選毛色，按「進入營地」。
 * show() 回傳 Promise<{ name, fur, species, code, ch }>（ch 0 ＝自動選分流）。
 * onPreview({ fur, species }) 讓背景的角色即時換成選的動物與毛色。
 * allowSpecies = false 時（使用 .glb 模型）不顯示動物選項。
 */
export class JoinScreen {
  /**
   * @param {{ onPreview?: Function, allowSpecies?: boolean, edit?: { name, fur, species, code } }} opts
   *   edit：遊戲中「改名字／換動物」，不顯示分流，按鈕改成「好了」，可以取消
   */
  constructor({ onPreview, allowSpecies = true, edit = null } = {}) {
    this.onPreview = onPreview;
    this.allowSpecies = allowSpecies;
    this.edit = edit;
  }

  show() {
    const saved = this.edit ? { ...loadProfile(), ...this.edit } : loadProfile();
    const startFur = Number.isInteger(saved.fur) ? saved.fur : 0;
    const startSpecies = Number.isInteger(saved.species) && SPECIES[saved.species] ? saved.species : 0;

    const el = document.createElement('div');
    el.className = 'join';
    el.innerHTML = `
      <form class="join-card" autocomplete="off">
        ${this.edit ? '' : languageRowHtml()}
        <div class="join-title">${this.edit ? t('🦊 我的樣子') : t('🔥 迷霧森林露營地')}</div>
        <div class="join-sub">${this.edit ? t('名字和動物隨時都能換') : t('找個位置坐下，和大家一起烤火吧')}</div>

        <label class="join-label" for="join-name">${t('你的暱稱')}</label>
        <div class="join-name-row">
          <input id="join-name" class="join-input" maxlength="12" />
          <button type="button" class="join-dice" id="join-dice" title="${t('換一個名字')}">🎲</button>
        </div>

        ${
          this.allowSpecies
            ? `<div class="join-label">${t('選一隻動物')}</div>
        <div class="join-species">
          ${SPECIES.map(
            (sp, i) => `
            <button type="button" class="species-btn${i === startSpecies ? ' selected' : ''}" data-species="${i}">
              <span>${sp.icon}</span><small>${sp.name}</small>
            </button>`,
          ).join('')}
        </div>`
            : ''
        }

        <div class="join-label join-fur-label">${t('毛色')}</div>
        <div class="join-furs" id="join-furs">
          ${FUR_PALETTES.map(
            (p, i) => `
            <button type="button" class="fur-swatch${i === startFur ? ' selected' : ''}" data-fur="${i}">
              <span style="background:#${p.fur.toString(16).padStart(6, '0')}"></span>
              <small>${p.name}</small>
            </button>`,
          ).join('')}
        </div>

        <div class="join-channels" id="join-channels" hidden>
          <div class="join-label">${t('選擇分流')}</div>
          <div class="ch-grid" id="join-ch-grid"></div>
        </div>

        <details class="join-sponsor"${saved.code ? ' open' : ''}>
          <summary>${t('🌼 我是贊助者（選填兌換碼）')}</summary>
          <input id="join-code" class="join-input" maxlength="32" autocomplete="off" placeholder="${t('有收到兌換碼的話填在這裡')}" />
        </details>

        <button type="submit" class="join-go">${this.edit ? t('好了') : t('進入營地')}</button>
        ${this.edit ? `<button type="button" class="join-cancel" id="join-cancel">${t('取消')}</button>` : ''}
      </form>
    `;
    document.body.appendChild(el);

    if (!this.edit) bindLanguageRow(el);
    el.querySelector('#join-code').value = saved.code || '';
    const input = el.querySelector('#join-name');
    // 暱稱：自己打過的名字會留著；沒改過的話，每次都換一個新的隨機名字
    let autoName = randomName();
    input.value = this.edit ? saved.name : saved.custom && saved.name ? saved.name : autoName;
    if (this.edit) autoName = saved.custom ? null : saved.name; // 沒改名字就維持「隨機名字」的狀態
    el.querySelector('#join-dice').addEventListener('click', () => {
      autoName = randomName();
      input.value = autoName;
    });
    let fur = startFur;
    let species = this.allowSpecies ? startSpecies : 0;
    const preview = () => {
      // 熊貓是固定黑白，不能選毛色
      const fixed = !!SPECIES[species]?.fixed;
      el.querySelector('#join-furs').classList.toggle('disabled', fixed);
      el.querySelector('.join-fur-label').textContent = fixed ? t('毛色（熊貓固定黑白）') : t('毛色');
      this.onPreview?.({ fur, species });
    };
    preview();

    el.querySelectorAll('.species-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.species-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        species = Number(btn.dataset.species);
        preview();
      });
    });

    el.querySelectorAll('.fur-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.fur-swatch').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        fur = Number(btn.dataset.fur);
        preview();
      });
    });

    // 分流：連得上伺服器才顯示；預設「自動」（挑最熱鬧但不擠的分流）
    let ch = 0;
    const chGrid = el.querySelector('#join-ch-grid');
    const renderChannels = (list) => {
      chGrid.innerHTML =
        `<button type="button" class="ch-btn ch-auto${ch === 0 ? ' selected' : ''}" data-ch="0">
          <span class="ch-name">${t('✨ 自動')}</span><span class="ch-meta">${t('幫你找個熱鬧的')}</span>
        </button>` + list.map((c) => channelButtonHtml(c, { selected: c.ch === ch })).join('');
    };
    let chTimer = 0;
    const loadChannels = async () => {
      const list = await fetchChannels();
      if (!el.isConnected) return clearInterval(chTimer);
      if (!list) return;
      el.querySelector('#join-channels').hidden = false;
      // 選的分流滿了，改回自動
      if (ch && list.find((c) => c.ch === ch)?.count >= list[0].max) ch = 0;
      renderChannels(list);
    };
    if (!this.edit) {
      loadChannels();
      chTimer = setInterval(loadChannels, 5000);
    }
    chGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ch]');
      if (!btn || btn.disabled) return;
      ch = Number(btn.dataset.ch);
      chGrid.querySelectorAll('[data-ch]').forEach((b) => b.classList.toggle('selected', b === btn));
    });

    if (!this.edit) setTimeout(() => input.focus(), 50);

    return new Promise((resolve) => {
      el.querySelector('#join-cancel')?.addEventListener('click', () => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 400);
        resolve(null);
      });
      el.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = input.value.trim().slice(0, 12) || autoName || randomName();
        const code = el.querySelector('#join-code').value.trim();
        saveProfile({ name, fur, species, custom: name !== autoName, code });
        input.blur();
        el.classList.add('leaving');
        clearInterval(chTimer);
        setTimeout(() => el.remove(), 500);
        resolve({ name, fur, species, code, ch });
      });
    });
  }
}
