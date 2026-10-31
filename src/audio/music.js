import { t } from '../i18n/i18n.js';

/**
 * 背景音樂：三首內建曲子即時合成（不需要音檔），各用不同樂器、都很柔和：
 *   營火小調   ── 拇指琴（卡林巴）
 *   星空搖籃曲 ── 音樂盒＋很淡的和聲墊底
 *   松林散步   ── 柔和的鋼琴
 *
 * 想要真正的吉他或其他錄音：把 mp3 放進 public/audio/，再在下面 FILE_SONGS 加一行，
 * 點唱機就會多出這首歌（循環播放）。
 */

/** 錄音檔歌曲，例如：{ name: '木吉他午後', desc: '真人錄音', url: 'audio/guitar.mp3' } */
export const FILE_SONGS = [];

export const SONGS = [
  {
    name: t('營火小調'),
    desc: t('拇指琴'),
    instrument: 'kalimba',
    bpm: 66,
    steps: 8, // 每小節 8 個八分音符
    // Cmaj7 → Am7 → Dm7 → G7
    chords: [
      [48, 55, 59, 64],
      [45, 52, 55, 60],
      [50, 57, 60, 65],
      [43, 50, 53, 59],
    ],
    pattern: [0, 2, 1, 3, 2, 1, 3, 2],
    melody: [
      [76, null, 74, 72, 74, null, null, null],
      [72, null, 71, 69, 72, null, null, null],
      [69, null, 72, 74, 77, null, 76, 74],
      [74, null, null, 71, 67, null, null, null],
    ],
  },
  {
    name: t('星空搖籃曲'),
    desc: t('音樂盒'),
    instrument: 'musicbox',
    bpm: 58,
    steps: 6, // 3/4 拍
    // Fmaj7 → Em7 → Dm7 → Cmaj7
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    melody: [
      [84, null, 81, null, 84, 86],
      [88, null, null, null, 86, 84],
      [86, null, 84, null, 81, null],
      [79, null, null, null, null, null],
    ],
  },
  {
    name: t('松林散步'),
    desc: t('柔和鋼琴'),
    instrument: 'piano',
    bpm: 72,
    steps: 8,
    // Am7 → D9 → Gmaj7 → Cmaj7
    chords: [
      [57, 60, 64, 67],
      [54, 57, 60, 64],
      [55, 59, 62, 66],
      [52, 55, 59, 64],
    ],
    bass: [45, 50, 43, 48],
    melody: [
      [69, null, 72, null, 76, null, 74, null],
      [72, null, null, 74, 76, null, null, null],
      [74, null, 71, null, 67, null, 71, 74],
      [72, null, null, null, 71, null, 67, null],
    ],
  },
];

// 錄音檔歌曲接在內建曲子後面（索引 3 起）
for (const f of FILE_SONGS) SONGS.push({ ...f, instrument: 'file' });

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** 背景音樂播放器（內建三種樂器；錄音檔由 AudioEngine 另外播放） */
export class MusicPlayer {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.cache = new Map();
    this.song = 0;
    this.pendingSong = null;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.active = false;

    // 柔和的音色：整體再加一道低通
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 0.2;
    this.bus.connect(lp);
    lp.connect(destination);
  }

  /** 舊介面保留：合成樂器不需要預先準備 */
  warmUp() {}

  setSong(index) {
    if (index == null || index === this.song) return;
    // 和錄音檔之間切換：立刻換（錄音檔不走排程）
    if (SONGS[this.song]?.instrument === 'file' || SONGS[index]?.instrument === 'file') {
      this.song = index;
      this.pendingSong = null;
      this.switchNow = false;
      this.step = 0;
      this.bar = 0;
      return;
    }
    this.pendingSong = index;
    this.switchNow = true; // 下一拍就換
  }

  get songName() {
    if (!this.active) return t('（音樂已停止）');
    return SONGS[this.pendingSong ?? this.song].name;
  }

  // ---------- 三種樂器 ----------

  /** 拇指琴（卡林巴）：圓潤的「咚～」，帶一點金屬片的泛音 */
  #kalimba(midi, time, velocity) {
    const ctx = this.ctx;
    const f = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(velocity, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.8);
    g.connect(this.bus);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start(time);
    o.stop(time + 1.85);
    // 一開始短短的泛音（金屬片的「叮」）
    const h = ctx.createOscillator();
    h.type = 'sine';
    h.frequency.value = f * 5.95;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(velocity * 0.12, time);
    hg.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    h.connect(hg);
    hg.connect(this.bus);
    h.start(time);
    h.stop(time + 0.15);
  }

  /** 音樂盒：清脆的高音，叮～ */
  #musicBox(midi, time, velocity) {
    const ctx = this.ctx;
    const f = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(velocity, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 2.2);
    g.connect(this.bus);
    for (const [mult, amp] of [[1, 1], [3.01, 0.18], [5.4, 0.05]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(time);
      o.stop(time + 2.3);
    }
  }

  /** 柔和鋼琴：圓潤的正弦＋一點點三角波，慢慢消失 */
  #piano(midi, time, velocity, length = 2.6) {
    const ctx = this.ctx;
    const f = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(velocity, time + 0.012);
    g.gain.exponentialRampToValueAtTime(velocity * 0.35, time + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, time + length);
    g.connect(this.bus);
    for (const [type, mult, amp] of [['sine', 1, 1], ['triangle', 1.002, 0.22], ['sine', 2, 0.12]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(time);
      o.stop(time + length + 0.05);
    }
  }

  /** 很淡的和聲墊底（音樂盒那首用） */
  #pad(chord, time, length) {
    const ctx = this.ctx;
    for (const m of chord) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiToFreq(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.022, time + length * 0.35);
      g.gain.linearRampToValueAtTime(0, time + length);
      o.connect(g);
      g.connect(this.bus);
      o.start(time);
      o.stop(time + length + 0.05);
    }
  }

  /** 由 AudioEngine 的排程器呼叫；排好 [now, until] 之間的音 */
  schedule(now, until, audible) {
    if (!this.active || !audible || SONGS[this.song]?.instrument === 'file') {
      this.nextTime = Math.max(this.nextTime, now + 0.05);
      return;
    }
    if (this.nextTime < now) this.nextTime = now + 0.05;

    while (this.nextTime < until) {
      const song = SONGS[this.song];
      const eighth = 60 / song.bpm / 2;
      const barIdx = this.bar % song.chords.length;
      const chord = song.chords[barIdx];
      const swing = this.step % 2 === 1 ? eighth * 0.12 : 0;
      const t = this.nextTime + swing;
      const mel = song.melody[barIdx]?.[this.step];
      const vary = () => 0.85 + Math.random() * 0.25;

      if (song.instrument === 'file') {
        // 錄音檔由 AudioEngine 播放，這裡不排音
      } else if (song.instrument === 'kalimba') {
        this.#kalimba(chord[song.pattern[this.step % song.pattern.length]] + 12, t, 0.07 * vary());
        if (this.step === 0) this.#kalimba(chord[0], t, 0.1);
        if (mel) this.#kalimba(mel, t, 0.13 * vary());
      } else if (song.instrument === 'musicbox') {
        if (this.step === 0) this.#pad(chord, t, eighth * song.steps + 0.3);
        if (mel) this.#musicBox(mel, t, 0.11 * vary());
        else if (this.step % 2 === 0) this.#musicBox(chord[(this.step / 2) % chord.length] + 24, t, 0.035 * vary());
      } else {
        // 鋼琴：每小節一開始輕輕按一個和弦，上面一條旋律
        if (this.step === 0) {
          this.#piano(song.bass[barIdx], t, 0.13, 3.2);
          chord.forEach((m, i) => this.#piano(m, t + i * 0.025, 0.05, 3));
        }
        if (this.step === 4) chord.slice(1).forEach((m, i) => this.#piano(m, t + i * 0.02, 0.03, 2));
        if (mel) this.#piano(mel + 12, t, 0.09 * vary());
      }

      this.nextTime += eighth;
      this.step++;
      if (this.switchNow && this.pendingSong != null) {
        this.song = this.pendingSong;
        this.pendingSong = null;
        this.switchNow = false;
        this.step = 0;
        this.bar = 0;
        continue;
      }
      if (this.step >= song.steps) {
        this.step = 0;
        this.bar++;
      }
    }
  }
}
