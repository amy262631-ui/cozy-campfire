import { io } from 'socket.io-client';

const SEND_INTERVAL = 1 / 20; // 20Hz
const HEARTBEAT = 1; // 沒變動時，每秒仍送一次

/**
 * 與伺服器的連線。
 * 事件（用 on(name, cb) 註冊）：
 *   'joined'       { id, room, fuel, players }   第一次進入或斷線重連後
 *   'playerJoined' { id, name, fur, s }
 *   'playerLeft'   { id }
 *   'states'       { [id]: [x, z, rotationY, actionState, doneness] }
 *   'fire'         { fuel, by, name }             有人添柴
 *   'fireSync'     { fuel }                       每 2 秒校正火勢
 *   'song'         { song, by, name }             樹屋點唱機換歌
 *   'status'       'connecting' | 'online' | 'offline' | 'full'
 *   'notes'        { notes, by, name }            營火告示牌有新留言（所有分流共用）
 */
export class NetworkClient {
  constructor({ url } = {}) {
    this.url = url;
    this.id = null;
    this.status = 'offline';
    this._handlers = {};
    this._joinData = null;
    this._sendTimer = 0;
    this._sinceSent = 0;
    this._last = null;
    this.ch = 0; // 目前的分流（0＝還沒加入）
  }

  on(name, cb) {
    (this._handlers[name] ??= []).push(cb);
    return this;
  }

  #emit(name, data) {
    for (const cb of this._handlers[name] ?? []) cb(data);
  }

  #setStatus(s) {
    if (s === this.status) return;
    this.status = s;
    this.#emit('status', s);
  }

  get online() {
    return this.status === 'online';
  }

  /**
   * 連線並加入營地。斷線後 socket.io 會自動重連，重連成功會再自動加入一次。
   * @param {{ name: string, fur: number, room?: string, x: number, z: number, ry: number }} joinData
   */
  connect(joinData) {
    this._joinData = joinData;
    this.#setStatus('connecting');

    const socket = io(this.url, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 6000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      const join = () => socket.emit('join', this._joinData, (res) => {
        // 選的分流剛好滿了：改成自動挑一個有空位的
        if (res?.reason === 'chFull' && this._joinData.ch) {
          this.#emit('channelFull', { ch: this._joinData.ch });
          this._joinData.ch = 0;
          join();
          return;
        }
        if (!res?.ok) {
          this.#setStatus(res?.reason === 'full' ? 'full' : 'offline');
          this.#emit('rejected', res);
          socket.disconnect();
          return;
        }
        this.id = res.id;
        this.ch = res.ch ?? 0;
        // 之後斷線重連，回到同一個分流（滿了的話伺服器會自動換一個）
        this.updateJoinData({ ch: this.ch, rejoin: true });
        this._last = null; // 重連後立刻送一次完整狀態
        this.#setStatus('online');
        this.#emit('joined', res);
      });
      join();
    });

    socket.on('disconnect', () => this.#setStatus('offline'));
    socket.on('connect_error', () => this.#setStatus('offline'));

    for (const ev of ['playerJoined', 'playerLeft', 'states', 'fire', 'fireSync', 'song', 'caught', 'board', 'chat', 'emoji', 'wishes', 'notes', 'stone', 'lakeNews', 'wallet', 'ornament', 'event', 'friendJoined', 'cairnReset', 'homeUpdate', 'mini', 'miniBoard', 'miniHunt', 'areas', 'gift', 'friendCredit', 'bigCatch']) {
      socket.on(ev, (data) => this.#emit(ev, data));
    }
  }

  /** 換了名字或樣子：用新資料重新加入（留在同一個分流和地點） */
  rejoin(patch) {
    this.updateJoinData(patch);
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket.connect();
  }

  /** 更新重連時要帶的資料（例如目前位置） */
  updateJoinData(patch) {
    if (this._joinData) Object.assign(this._joinData, patch);
  }

  /**
   * 每幀呼叫；內部以 20Hz 節流，只有狀態改變（或每秒心跳）才真的送出。
   * @param {number} dt
   * @param {{ x: number, z: number, rotationY: number, actionState: string, doneness?: number }} s
   */
  update(dt, s) {
    if (!this.online) return;
    this._sendTimer += dt;
    this._sinceSent += dt;
    if (this._sendTimer < SEND_INTERVAL) return;
    this._sendTimer %= SEND_INTERVAL;

    const packet = [
      Math.round(s.x * 100) / 100,
      Math.round(s.z * 100) / 100,
      Math.round(s.rotationY * 1000) / 1000,
      s.actionState,
      Math.round((s.doneness ?? 0) * 100) / 100,
      s.extra ?? 0,
    ];
    const changed = !this._last || packet.some((v, i) => v !== this._last[i]);
    if (!changed && this._sinceSent < HEARTBEAT) return;

    this.socket.volatile.emit('state', packet);
    this._last = packet;
    this._sinceSent = 0;
  }

  /**
   * 換房間。離線時直接回傳 null（單人模式照樣可以換房）。
   * @returns {Promise<{ ok: boolean, room: string, players: any[], fuel: number, song: number } | null>}
   */
  switchRoom(room, pos) {
    this.updateJoinData({ room, ...pos }); // 斷線重連時回到這個房間
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      this.socket.emit('switchRoom', { room, ...pos }, (res) => {
        clearTimeout(timer);
        this._last = null;
        resolve(res);
      });
    });
  }

  /**
   * 換分流（留在同一個地點）。
   * @returns {Promise<{ ok: boolean, ch: number, players: any[], fuel: number, reason?: string } | null>}
   */
  switchChannel(ch) {
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      this.socket.emit('switchChannel', { ch }, (res) => {
        clearTimeout(timer);
        if (res?.ok) {
          this.ch = res.ch;
          this.updateJoinData({ ch: res.ch });
          this._last = null;
        }
        resolve(res);
      });
    });
  }

  chat(text) {
    if (this.online) this.socket.emit('chat', { text });
  }

  emoji(e) {
    if (this.online) this.socket.emit('emoji', { e });
  }

  /** 在營火告示牌留言 */
  note(text, color = 0) {
    if (this.online) this.socket.emit('note', { text, color });
  }

  /** 送一個請求並等伺服器回覆（買東西、布置、帳號⋯）；離線回傳 null */
  request(ev, data = {}) {
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 8000);
      this.socket.emit(ev, data, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }

  /** 在心願大樹掛一個裝飾；回傳 { ok, pc, item, reason } */
  hang(o) {
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      this.socket.emit('hang', { o }, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }

  /** 完成每日任務；回傳 { ok, n }（今天第幾位完成） */
  quest(id) {
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      this.socket.emit('quest', { id }, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }

  /** 在第 i 座石塔疊一顆石頭；回傳 { ok, reason } */
  stack(i) {
    if (!this.online) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      this.socket.emit('stack', { i }, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }

  /** 掛繪馬 */
  wish(text) {
    if (this.online) this.socket.emit('wish', { text });
  }

  /** 釣到魚（伺服器會公告給整個湖畔，並更新排行） */
  sendCatch(fish, size) {
    if (this.online) this.socket.emit('catch', { fish, size });
  }

  setSong(index) {
    if (this.online) this.socket.emit('setSong', index);
  }

  addWood() {
    if (this.online) this.socket.emit('addWood');
  }
}
