import { MusicPlayer, SONGS } from './music.js';
import { t } from '../i18n/i18n.js';

/**
 * 白噪音與背景樂引擎（Web Audio API，全部即時合成，不需要音檔）
 *
 * 四條可調音軌（混音面板）：
 *   fire     營火燃燒聲：3D 空間音效，離火越近越大聲；添柴時有劈啪聲
 *   wind     森林微風與落葉沙沙聲
 *   ambient  環境音：蟋蟀、貓頭鷹；在湖邊還有水聲
 *   music    背景音樂（預設關閉；拇指琴、音樂盒、鋼琴，或放進來的錄音檔）
 *
 * 實際音量 = 使用者音量 × 房間預設（room.audio）× 是否靜音
 */
const STORE_KEY = 'cozy-campfire-audio-v2'; // v2：背景音樂改成預設關閉
export const CHANNELS = [
  { key: 'fire', label: t('營火聲'), icon: '🔥' },
  { key: 'wind', label: t('森林微風'), icon: '🍃' },
  { key: 'ambient', label: t('環境音'), icon: '🦗' },
  { key: 'music', label: t('背景音樂'), icon: '🎵' },
];

function loadPrefs() {
  // 一開始只有營火、微風、環境音；背景音樂要自己打開（或到樹屋點歌）
  const def = { fire: 0.8, wind: 0.6, ambient: 0.6, music: 0, muted: false };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
  } catch {
    return def;
  }
}

/** 產生 1 秒的無聲 WAV（16-bit、22050Hz），用來讓 iPhone 進入「播放媒體」模式、不受靜音鍵影響 */
let silentUrl = null;
function silentWavUrl() {
  if (silentUrl) return silentUrl;
  const rate = 22050;
  const samples = rate; // 1 秒
  const bytes = samples * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // 單聲道
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, bytes, true);
  // 資料區保持 0 ＝ 無聲
  silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  return silentUrl;
}

const IS_IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.prefs = loadPrefs();
    this.preset = { fire: 1, wind: 1, ambient: 1, water: 0, music: 0.6 };
    this.focusMuted = false; // 專注帳篷的「預設靜音」
    this.fireStrength = 1;
    this._listeners = [];
  }

  get started() {
    return !!this.ctx;
  }

  /** 必須在使用者點擊／按鍵之後呼叫（瀏覽器自動播放限制） */
  start() {
    if (this.ctx) {
      // iOS 切到別的 App 回來會變成 'interrupted'，一樣要在點擊時恢復
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      this.#create();
    } catch (e) {
      // 任何一步失敗都記下來，顯示在聲音面板上，方便找出是哪支手機不支援什麼
      this.error = e?.message || String(e);
      this.broken = true;
      console.error(t('[聲音] 初始化失敗'), e);
      this.#notify();
    }
  }

  #create() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    ctx.onstatechange = () => this.#notify(); // 狀態改變時更新面板與提示

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.8); // 淡入

    this.ch = {};
    for (const { key } of CHANNELS) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      this.ch[key] = g;
    }

    // 音效（釣魚等）：不屬於四條音軌，但跟著一鍵靜音
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.white = this.#noise('white', 4);
    this.brown = this.#noise('brown', 6);

    this.#buildFire();
    this.#buildWind();
    this.#buildAmbient();
    this.music = new MusicPlayer(ctx, this.ch.music);
    this.music.active = true;
    if (this._song != null) this.setSong(this._song);

    this._timers = { crackle: 0, gust: 0, cricket: [0, 0.4, 0.8], owl: 6, water: 0, plop: 4 };
    this._sched = setInterval(() => this.#schedule(), 80);
    this.#applyGains(0.01);

    // 分頁切回來時恢復
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ctx.state === 'suspended') ctx.resume();
    });
  }

  /**
   * 手機解鎖聲音：必須在「點擊／觸控的當下」同步呼叫（不能在 await 之後）。
   * - 建立或恢復 AudioContext
   * - 播一個無聲的極短音，iOS 才會真正開始輸出
   * - iPhone 側邊靜音鍵開著時，網頁音效預設會被關掉：
   *   新版 Safari 用 navigator.audioSession 改成「播放」類型；舊版改用一個無聲的 <audio> 迴圈
   */
  unlock() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch {
      /* 不支援就略過 */
    }
    this.start();
    const ctx = this.ctx;
    if (!ctx) return;

    if (ctx.state !== 'running') {
      // iOS 要在「有效的點擊」裡真的播出一個聲音才會放行，所以每次還沒放行都再試一次
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        /* 忽略 */
      }
    }

    // iPhone：一律在點擊當下播放無聲的 <audio> 迴圈。
    // 有「媒體在播放」時，iPhone 會改用媒體音量、不再被側邊靜音鍵關掉網頁音效。
    if (IS_IOS) {
      if (!this._silentEl) {
        const el = document.createElement('audio');
        el.src = silentWavUrl();
        el.loop = true;
        el.preload = 'auto';
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        el.style.display = 'none';
        document.body.appendChild(el);
        this._silentEl = el;
        this._silentState = t('準備中');
      }
      if (this._silentEl.paused) {
        const pr = this._silentEl.play();
        if (pr?.then) {
          pr.then(
            () => {
              this._silentState = t('播放中');
              this.#notify();
            },
            (e) => {
              this._silentState = t('被擋（{reason}）', { reason: e?.name || t('未知') });
              this.#notify();
            },
          );
        }
      }
    }
  }

  /** 聲音是否真的在播（給「點一下開啟聲音」提示用） */
  get running() {
    return !this.broken && this.ctx?.state === 'running';
  }

  /** 給聲音面板顯示的狀態文字（手機上沒聲音時，可以請使用者回報這一行） */
  get statusText() {
    let main;
    if (this.broken) main = t('聲音無法啟動：{error}', { error: this.error });
    else if (!this.ctx) main = t('等待輕點畫面來開啟聲音');
    else if (this.ctx.state === 'running') main = this.muted ? t('聲音引擎運作中（目前靜音）') : t('聲音引擎運作中');
    else if (this.ctx.state === 'interrupted') main = t('被系統中斷了，輕點畫面恢復');
    else main = t('被瀏覽器暫停了，輕點畫面恢復');
    return main;
  }

  /** 測試聲音：播放番茄鐘的鈴聲（不受靜音影響） */
  testTone() {
    this.unlock();
    if (this.running) this.chime();
  }

  // ---------- 建構音源 ----------

  #noise(type, seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  #loop(buffer) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = 0;
    src.start(0, Math.random() * buffer.duration);
    return src;
  }

  #filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  #buildFire() {
    const ctx = this.ctx;
    // 3D 定位：放在營火的位置
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2.2;
    p.rolloffFactor = 1.3;
    p.maxDistance = 60;
    this.firePanner = p;
    this.setFirePosition({ x: 0, y: 0.5, z: 0 });
    p.connect(this.ch.fire);

    // 低沉的燃燒聲
    this.roarGain = ctx.createGain();
    this.roarGain.gain.value = 0.5;
    const roar = this.#loop(this.brown);
    const lp = this.#filter('lowpass', 420);
    roar.connect(lp);
    lp.connect(this.roarGain);
    this.roarGain.connect(p);

    this.crackleBus = ctx.createGain();
    this.crackleBus.gain.value = 1;
    this.crackleBus.connect(p);
  }

  #crackle(time, loud = false) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const dur = loud ? 0.05 + Math.random() * 0.05 : 0.008 + Math.random() * 0.03;
    const bp = this.#filter('bandpass', loud ? 700 + Math.random() * 900 : 1600 + Math.random() * 3800, loud ? 1.2 : 0.9);
    const g = ctx.createGain();
    const amp = loud ? 0.9 + Math.random() * 0.5 : 0.12 + Math.random() * 0.4;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(amp, time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.crackleBus);
    src.start(time, Math.random() * 3);
    src.stop(time + dur + 0.02);
  }

  #buildWind() {
    const ctx = this.ctx;
    // 微風：低頻的呼呼聲
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.3;
    const w = this.#loop(this.brown);
    const bp = this.#filter('bandpass', 380, 0.5);
    w.connect(bp);
    bp.connect(this.windGain);
    this.windGain.connect(this.ch.wind);
    this.windFilter = bp;

    // 落葉沙沙：高頻、隨陣風起伏
    this.leafGain = ctx.createGain();
    this.leafGain.gain.value = 0.02;
    const l = this.#loop(this.white);
    const hp = this.#filter('highpass', 2600, 0.5);
    const lp = this.#filter('lowpass', 7000, 0.4);
    l.connect(hp);
    hp.connect(lp);
    lp.connect(this.leafGain);
    this.leafGain.connect(this.ch.wind);
  }

  #buildAmbient() {
    const ctx = this.ctx;
    this.natureGain = ctx.createGain(); // 蟲鳴、鳥叫
    this.natureGain.connect(this.ch.ambient);
    this.waterGain = ctx.createGain(); // 湖水
    this.waterGain.gain.value = 0;
    this.waterGain.connect(this.ch.ambient);

    // 三隻蟋蟀，各在不同方向、不同音高
    this.crickets = [
      { freq: 4400, pan: -0.7 },
      { freq: 4800, pan: 0.25 },
      { freq: 5200, pan: 0.75 },
    ].map(({ freq, pan }) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      osc.connect(g);
      g.connect(p);
      p.connect(this.natureGain);
      osc.start();
      return { gain: g, quiet: 0 };
    });

    // 湖水拍岸：低通的棕噪音，音量緩慢起伏
    this.lapGain = ctx.createGain();
    this.lapGain.gain.value = 0.2;
    const water = this.#loop(this.brown);
    const lp = this.#filter('lowpass', 650, 0.6);
    water.connect(lp);
    lp.connect(this.lapGain);
    this.lapGain.connect(this.waterGain);
  }

  #chirp(c, time) {
    // 一聲「唧唧唧」＝3~4 個短脈衝
    const n = 3 + Math.floor(Math.random() * 2);
    const amp = 0.018 + Math.random() * 0.012;
    for (let i = 0; i < n; i++) {
      const t = time + i * 0.045;
      c.gain.gain.setValueAtTime(0, t);
      c.gain.gain.linearRampToValueAtTime(amp, t + 0.006);
      c.gain.gain.linearRampToValueAtTime(0, t + 0.026);
    }
  }

  #owl(time) {
    // 遠處貓頭鷹「咕—咕」
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.natureGain);
    for (const [offset, len] of [[0, 0.32], [0.5, 0.5]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const t = time + offset;
      osc.frequency.setValueAtTime(410, t);
      osc.frequency.linearRampToValueAtTime(355, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.06);
      g.gain.setValueAtTime(0.07, t + len - 0.1);
      g.gain.linearRampToValueAtTime(0, t + len);
      osc.connect(g);
      g.connect(pan);
      osc.start(t);
      osc.stop(t + len + 0.05);
    }
  }

  #plop(time) {
    // 小魚跳水的「啵」
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(620, time);
    osc.frequency.exponentialRampToValueAtTime(170, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.09, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(g);
    g.connect(this.waterGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // ---------- 排程（每 80ms 排下一段時間的聲音事件） ----------

  #schedule() {
    const ctx = this.ctx;
    if (!ctx || this.broken || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const until = now + 0.25;
    const T = this._timers;
    const dt = 0.08;

    // 營火劈啪：火越旺越密
    if (this.#effective('fire') > 0.001) {
      const s = this.fireStrength;
      const rate = 3 + s * 7; // 每秒幾聲
      T.crackle -= dt;
      while (T.crackle <= 0) {
        const t = now + Math.random() * 0.2;
        this.#crackle(t, Math.random() < 0.05 * s);
        if (Math.random() < 0.25) this.#crackle(t + 0.02 + Math.random() * 0.05); // 成串
        T.crackle += (-Math.log(1 - Math.random()) / rate);
      }
      this.roarGain.gain.setTargetAtTime(0.25 + s * 0.3, now, 0.5);
    }

    // 陣風
    T.gust -= dt;
    if (T.gust <= 0) {
      T.gust = 2 + Math.random() * 4;
      const strength = Math.random();
      this.windGain.gain.setTargetAtTime(0.18 + strength * 0.35, now, 1.2);
      this.leafGain.gain.setTargetAtTime(0.01 + strength * strength * 0.09, now, 0.8);
      this.windFilter.frequency.setTargetAtTime(300 + strength * 250, now, 1.5);
    }

    // 蟋蟀
    if (this.#effective('ambient') > 0.001) {
      this.crickets.forEach((c, i) => {
        T.cricket[i] -= dt;
        if (T.cricket[i] <= 0) {
          if (c.quiet > 0) {
            c.quiet--;
          } else {
            this.#chirp(c, now + Math.random() * 0.1);
            if (Math.random() < 0.08) c.quiet = 4 + Math.floor(Math.random() * 6); // 偶爾停一下
          }
          T.cricket[i] = 0.75 + Math.random() * 0.5;
        }
      });
      T.owl -= dt;
      if (T.owl <= 0) {
        T.owl = 20 + Math.random() * 30;
        this.#owl(now + 0.1);
      }
    }

    // 湖水
    if (this.preset.water > 0.01) {
      T.water -= dt;
      if (T.water <= 0) {
        T.water = 1.8 + Math.random() * 2.2;
        this.lapGain.gain.setTargetAtTime(0.12 + Math.random() * 0.28, now, 0.7);
      }
      T.plop -= dt;
      if (T.plop <= 0) {
        T.plop = 6 + Math.random() * 14;
        this.#plop(now + 0.1);
      }
    }

    this.music.schedule(now, until, this.#effective('music') > 0.001);
  }

  // ---------- 音量 ----------

  #effective(key) {
    if (this.prefs.muted || this.focusMuted) return 0;
    return (this.prefs[key] ?? 0) * (this.preset[key] ?? 0);
  }

  #applyGains(timeConstant = 0.6) {
    if (!this.ctx || this.broken) return;
    const now = this.ctx.currentTime;
    for (const { key } of CHANNELS) {
      this.ch[key].gain.setTargetAtTime(this.#effective(key), now, timeConstant);
    }
    this.natureGain.gain.setTargetAtTime(1, now, timeConstant);
    this.sfxGain.gain.setTargetAtTime(this.prefs.muted || this.focusMuted ? 0 : 0.9, now, 0.05);
    this.waterGain.gain.setTargetAtTime(this.preset.water ?? 0, now, timeConstant);
    this.#notify();
  }

  #savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.prefs));
    } catch {
      /* 存不了就算了 */
    }
  }

  #notify() {
    for (const cb of this._listeners) cb(this);
  }

  onChange(cb) {
    this._listeners.push(cb);
  }

  setVolume(key, v) {
    this.prefs[key] = Math.min(1, Math.max(0, v));
    this.#savePrefs();
    this.#applyGains(0.15);
  }

  setMuted(muted) {
    this.prefs.muted = muted;
    this.focusMuted = false; // 手動開關時，解除帳篷的預設靜音
    this.#savePrefs();
    this.#applyGains(0.3);
  }

  get muted() {
    return this.prefs.muted || this.focusMuted;
  }

  /**
   * 換房間時套用該房間的聲音設定
   * @param {{ fire, wind, ambient, water, music, song }} preset
   * @param {{ focusMode?: boolean }} [opts]
   */
  setRoomPreset(preset, { focusMode = false } = {}) {
    this.preset = { ...preset };
    this.focusMuted = focusMode;
    if (preset.song != null) this.setSong(preset.song);
    this.#applyGains(1.2);
  }

  /**
   * 換背景音樂。index = -1 表示停止。
   * 錄音檔歌曲用 <audio> 播放，接到「背景音樂」音軌上，一樣受音量與靜音控制。
   */
  setSong(index) {
    this._song = index;
    const m = this.music;
    if (!m) {
      this.#notify();
      return;
    }
    const song = SONGS[index];
    m.active = index >= 0 && !!song;
    if (m.active) m.setSong(index);

    if (song?.instrument === 'file' && m.active) {
      if (!this._fileEl) {
        const el = document.createElement('audio');
        el.loop = true;
        el.preload = 'auto';
        el.setAttribute('playsinline', '');
        this._fileEl = el;
        this.ctx.createMediaElementSource(el).connect(this.ch.music);
      }
      if (!this._fileEl.src.endsWith(song.url)) this._fileEl.src = song.url;
      this._fileEl.play().catch(() => {});
    } else {
      this._fileEl?.pause();
    }
    this.#notify();
  }

  /** 背景音樂是否正在播放（樹屋的唱盤、音符用） */
  get musicPlaying() {
    return !!this.music?.active && this.#effective('music') > 0.001;
  }

  /** 目前播放的歌名 */
  get songName() {
    return this.music ? this.music.songName : '';
  }

  get songIndex() {
    return this._song ?? 0;
  }

  setFirePosition({ x, y, z }) {
    const p = this.firePanner;
    if (!p) return;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else p.setPosition(x, y, z);
  }

  setFireStrength(s) {
    this.fireStrength = s;
  }

  /** 添柴時的一陣劈啪 */
  crackleBurst() {
    if (!this.ctx || this.#effective('fire') < 0.001) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 9; i++) this.#crackle(now + i * 0.04 + Math.random() * 0.06, i % 3 === 0);
  }

  splash() {
    if (this.ctx && this.preset.water > 0) this.#plop(this.ctx.currentTime + 0.02);
  }

  /**
   * 遊戲音效
   * @param {'cast'|'plop'|'bite'|'hook'|'tap'|'splash'|'escape'|'catch'|'legend'|'junk'} name
   */
  sfx(name) {
    if (!this.running) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const out = this.sfxGain;
    const tone = (freq, t, dur, { type = 'sine', amp = 0.15, to = null } = {}) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const noise = (t, dur, freq, amp) => {
      const src = ctx.createBufferSource();
      src.buffer = this.white;
      const f = this.#filter('bandpass', freq, 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(out);
      src.start(t, Math.random() * 2);
      src.stop(t + dur + 0.05);
    };
    switch (name) {
      case 'cast': // 甩竿的「咻」
        noise(now, 0.35, 1800, 0.25);
        break;
      case 'plop': // 浮標落水
        tone(520, now, 0.14, { to: 180, amp: 0.18 });
        break;
      case 'bite': // 咬鉤：兩聲「啵啵」＋提示音
        tone(600, now, 0.12, { to: 200, amp: 0.22 });
        tone(600, now + 0.14, 0.12, { to: 200, amp: 0.22 });
        tone(988, now + 0.05, 0.25, { type: 'triangle', amp: 0.12 });
        break;
      case 'hook':
        noise(now, 0.2, 900, 0.35);
        tone(392, now, 0.15, { type: 'triangle', amp: 0.12 });
        break;
      case 'needle': // 點唱機：唱針落下的「喀滋」
        noise(now, 0.06, 3000, 0.3);
        noise(now + 0.07, 0.25, 1200, 0.12);
        tone(880, now + 0.1, 0.3, { type: 'triangle', amp: 0.08 });
        break;
      case 'bell': // 鳥居的鈴：叮鈴～
        [0, 0.22, 0.44].forEach((d) => {
          tone(1568, now + d, 1.4, { amp: 0.07 });
          tone(2349, now + d, 0.9, { amp: 0.035 });
        });
        break;
      case 'jiao': // 筊杯落地：兩聲木頭「喀、喀」
        for (const d of [1.0, 1.12, 1.25]) noise(now + d, 0.05, 900, 0.35);
        break;
      case 'kuji': // 搖籤筒：一串沙沙聲
        for (let i = 0; i < 8; i++) noise(now + i * 0.12, 0.06, 2200, 0.18);
        break;
      case 'daikichi':
        [659, 784, 988, 1319].forEach((f, i) => tone(f, now + i * 0.1, 0.5, { type: 'triangle', amp: 0.1 }));
        break;
      case 'tap': // 捲線「喀」
        noise(now, 0.04, 2600, 0.18);
        break;
      case 'splash':
        noise(now, 0.45, 700, 0.4);
        tone(400, now, 0.2, { to: 120, amp: 0.15 });
        break;
      case 'escape': // 失敗：往下的兩個音
        tone(440, now, 0.25, { type: 'triangle', amp: 0.12 });
        tone(330, now + 0.22, 0.4, { type: 'triangle', amp: 0.12 });
        break;
      case 'junk':
        tone(300, now, 0.18, { type: 'square', amp: 0.05 });
        tone(260, now + 0.18, 0.25, { type: 'square', amp: 0.05 });
        break;
      case 'catch': // 釣到：開心的上行琶音
        [523, 659, 784, 1047].forEach((f, i) => tone(f, now + i * 0.09, 0.35, { type: 'triangle', amp: 0.13 }));
        break;
      case 'legend': // 稀有魚：更長的琶音＋鈴聲
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, now + i * 0.08, 0.5, { type: 'triangle', amp: 0.13 }));
        setTimeout(() => this.chime(), 520);
        break;
    }
  }

  /** 番茄鐘提示音：清脆的三聲鈴 */
  chime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [0, 0.28, 0.56].forEach((offset, i) => {
      const t = now + offset;
      const base = [880, 1108.7, 1318.5][i];
      for (const [mult, amp] of [[1, 0.18], [2.76, 0.05], [5.4, 0.02]]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = base * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 1.7);
      }
    });
  }

  /** 每幀用相機更新聆聽者位置（3D 營火聲） */
  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.position;
    const fwd = this._fwd || (this._fwd = camera.getWorldDirection(camera.position.clone()));
    camera.getWorldDirection(fwd);
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setTargetAtTime(p.x, t, 0.05);
      l.positionY.setTargetAtTime(p.y, t, 0.05);
      l.positionZ.setTargetAtTime(p.z, t, 0.05);
      l.forwardX.setTargetAtTime(fwd.x, t, 0.05);
      l.forwardY.setTargetAtTime(fwd.y, t, 0.05);
      l.forwardZ.setTargetAtTime(fwd.z, t, 0.05);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }
}
