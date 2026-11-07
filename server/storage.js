/**
 * 資料存放：留言、繪馬、石塔、釣魚排行、統計。
 *
 * Render 免費版每次重新部署都會清空硬碟，所以：
 *   - 有設定 Upstash（環境變數 UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN）→ 存在 Upstash，永久保存
 *   - 沒設定 → 存在 server/data/*.json（本機開發用；Render 上重新部署會不見）
 *
 * 第一次接上 Upstash 時，如果 Upstash 裡還沒有資料，會用 server/data/ 裡的檔案當初始資料（用來還原備份）。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
export const remote = !!(URL_ && TOKEN);
const PREFIX = 'cozy:';

let dataDir = '';
/** 給 /api/health 看的狀態 */
export const status = { mode: remote ? 'upstash' : 'local', ok: !remote, lastError: null, lastSave: null };

/** 啟動時：確認 Upstash 真的能寫入、讀回（不只是有設定） */
export async function init(dir) {
  dataDir = dir;
  if (!remote) {
    console.log('[存檔] 使用本機檔案（Render 重新部署會清空；建議設定 Upstash）');
    return;
  }
  if (/^["'\s]|["'\s]$/.test(URL_) || /^["'\s]|["'\s]$/.test(TOKEN)) {
    console.warn('[存檔] ⚠️ UPSTASH 網址或 token 前後有引號或空格，請到 Render 的 Environment 刪掉');
  }
  try {
    const stamp = String(Date.now());
    await redis(['SET', PREFIX + '_check', stamp]);
    const back = await redis(['GET', PREFIX + '_check']);
    if (back !== stamp) throw new Error('寫入後讀回的值不一樣');
    status.ok = true;
    console.log('[存檔] Upstash 連線測試：可以寫入、讀取 ✅ 重新部署也不會遺失資料');
  } catch (err) {
    status.ok = false;
    status.lastError = err.message;
    console.error(`[存檔] ❌ Upstash 連線測試失敗：${err.message}`);
    console.error('[存檔] ❌ 請檢查 Render 的 UPSTASH_REDIS_REST_URL／TOKEN（不要用「只讀令牌」、不要有引號或空格）');
  }
}

/**
 * 省流量（11/07）：存進 Upstash 前先 gzip 壓縮，再轉成文字（開頭加 gz:）。
 * 讀的時候兩種都認得：舊的純 JSON、新的 gz: 壓縮版，所以不用搬資料。
 */
const pack = (data) => 'gz:' + zlib.gzipSync(JSON.stringify(data)).toString('base64');
const unpack = (raw) => (typeof raw === 'string' && raw.startsWith('gz:') ? JSON.parse(zlib.gunzipSync(Buffer.from(raw.slice(3), 'base64')).toString('utf8')) : JSON.parse(raw));

async function redis(args) {
  const res = await fetch(URL_.trim().replace(/^["']|["']$/g, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN.trim().replace(/^["']|["']$/g, '')}` },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Upstash 回應不是 JSON（HTTP ${res.status}）：${text.slice(0, 80)}`);
  }
  if (json.error) throw new Error(json.error);
  return json.result;
}

function readLocal(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch {
    return undefined;
  }
}

function writeLocal(file, data) {
  fs.mkdir(dataDir, { recursive: true }, () =>
    fs.writeFile(path.join(dataDir, file), JSON.stringify(data), (err) => err && console.warn(`[存檔] ${file} 寫入失敗：`, err.message)),
  );
}

/**
 * 讀一份資料（啟動時呼叫）。Upstash 沒有的話，用本機檔案（並順便存進 Upstash）。
 * @returns {Promise<any>}
 */
export async function load(file) {
  const local = readLocal(file);
  if (!remote) return local;
  try {
    const raw = await redis(['GET', PREFIX + file]);
    if (raw != null) return unpack(raw);
    if (local !== undefined) {
      await redis(['SET', PREFIX + file, pack(local)]);
      console.log(`[存檔] 已把 ${file} 匯入 Upstash`);
    }
    return local;
  } catch (err) {
    console.warn(`[存檔] 讀取 Upstash 的 ${file} 失敗，先用本機檔案：`, err.message);
    return local;
  }
}

const timers = {};
/** 還沒寫出去的資料（伺服器要關機時要先寫完） */
const pending = new Map();

async function write(file) {
  const data = pending.get(file);
  pending.delete(file);
  clearTimeout(timers[file]);
  delete timers[file];
  if (data === undefined) return;
  writeLocal(file, data);
  if (!remote) return;
  try {
    await redis(['SET', PREFIX + file, pack(data)]);
    status.ok = true;
    status.lastSave = new Date().toISOString();
  } catch (err) {
    status.ok = false;
    status.lastError = err.message;
    console.error(`[存檔] ❌ 寫入 Upstash 的 ${file} 失敗：`, err.message);
  }
}

/**
 * 存一份資料。連續修改時延遲合併成一次（省 Upstash 的使用量）。
 * @param {number} delay 毫秒
 */
export function save(file, data, delay = 2000) {
  pending.set(file, data);
  clearTimeout(timers[file]);
  // 一直有人在改（例如很多人在玩）時，最多等 MAX_WAIT 就一定寫一次，不會一直往後延
  firstAt[file] ??= Date.now();
  const wait = Math.max(0, Math.min(delay, firstAt[file] + MAX_WAIT - Date.now()));
  timers[file] = setTimeout(() => {
    delete firstAt[file];
    write(file);
  }, wait);
}
const firstAt = {};
const MAX_WAIT = 120000;

/** 立刻把所有還沒寫出去的資料寫完（重新部署、關機前呼叫） */
export async function flush() {
  await Promise.all([...pending.keys()].map((f) => write(f)));
}
