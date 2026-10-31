// 分流邏輯測試：請先用 CHANNEL_MAX=2 啟動伺服器
import { io } from 'socket.io-client';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async () => (await fetch('http://localhost:3000/api/channels')).json();
const join = (name, ch) =>
  new Promise((res) => {
    const s = io('http://localhost:3000', { transports: ['websocket'] });
    s.on('connect', () => s.emit('join', { name, ch }, (r) => res({ s, r })));
  });
const a = await join('甲', 0); console.log('甲 auto →', a.r.ch);
const b = await join('乙', 0); console.log('乙 auto →', b.r.ch);
const c = await join('丙', 1); console.log('丙 指定1（滿）→', c.r.ok, c.r.reason);
console.log(JSON.stringify(await get()));
const d = await join('丁', 2); const e = await join('戊', 2); const f = await join('己', 3); const g = await join('庚', 3);
console.log('分流 2、3 塞滿', JSON.stringify(await get()));
const h = await join('辛', 0); console.log('辛 全滿時 auto →', h.r.ch, JSON.stringify(await get()));
const sw2 = await new Promise((r) => h.s.emit('switchChannel', { ch: 1 }, r)); console.log('辛 換到滿的 1:', sw2.ok, sw2.reason);
b.s.disconnect(); await sleep(300);
const sw3 = await new Promise((r) => h.s.emit('switchChannel', { ch: 1 }, r)); console.log('辛 換到 1:', sw3.ok, sw3.ch, '看到', sw3.players.map((p) => p.name));
await sleep(300); console.log('空的多開分流收掉:', JSON.stringify(await get()));
let got = null; d.s.on('notes', (n) => (got = n));
a.s.emit('note', { text: '大家晚安', color: 2 }); await sleep(500);
console.log('分流 2 收到分流 1 的留言:', JSON.stringify(got?.notes.at(-1)));
for (const x of [a, c, d, e, f, g, h]) x.s.disconnect();
await sleep(1500);
process.exit(0);
