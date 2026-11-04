import * as THREE from 'three';
import './style.css';
import { t, translateStatic } from './i18n/i18n.js';
import { Player } from './player/Player.js';
import { InputController } from './player/InputController.js';
import { ActionStateMachine } from './player/ActionStateMachine.js';
import { loadCharacter, DEFAULT_MODEL_URL } from './player/characters/loadCharacter.js';
import { ProceduralFox } from './player/characters/ProceduralFox.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { ZzzBubbles } from './fx/ZzzBubbles.js';
import { HUD, compactScreen } from './ui/HUD.js';
import { MobileControls, isTouchDevice } from './ui/MobileControls.js';
import { JoinScreen, autoProfile, saveProfile } from './ui/JoinScreen.js';
import { MixerPanel } from './ui/MixerPanel.js';
import { PomodoroPanel } from './ui/PomodoroPanel.js';
import { JukeboxPanel } from './ui/JukeboxPanel.js';
import { NetworkClient } from './network/NetworkClient.js';
import { RemotePlayers } from './network/RemotePlayers.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SONGS } from './audio/music.js';
import { RoomManager } from './rooms/RoomManager.js';
import { createForestRoom } from './rooms/forestRoom.js';
import { createTentRoom } from './rooms/tentRoom.js';
import { createTreehouseRoom } from './rooms/treehouseRoom.js';
import { createLakeRoom, LAKE_WATER_Y } from './rooms/lakeRoom.js';
import { createSocialTentRoom } from './rooms/socialTentRoom.js';
import { createHomeRoom } from './rooms/homeRoom.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { BuildPanel } from './ui/BuildPanel.js';
import { createDemoHome } from './game/demoHome.js';
import { WelcomeCard } from './ui/WelcomeCard.js';
import { GuestPanel } from './ui/GuestPanel.js';
import { translateChat, translateEnabled, setTranslateEnabled } from './network/chatTranslate.js';
import { GiftPanel } from './ui/GiftPanel.js';
import { GIFT_FURNITURE } from './game/furniture.js';
import { TENT_STYLE_BY_ID } from './game/tentStyles.js';
import { createCampgroundRoom } from './rooms/campgroundRoom.js';
import { RACE_LANTERNS, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN } from './game/miniSpots.js';
import { TENT_SHAPE_BY_ID } from './game/tentShapes.js';
import { FURNITURE_BY_ID } from './game/furniture.js';
import { SpeechBubbles } from './fx/SpeechBubbles.js';
import { SocialPanel } from './ui/SocialPanel.js';
import { ShrinePanel } from './ui/ShrinePanel.js';
import { LanguagePicker } from './ui/LanguagePicker.js';
import { NoticePanel } from './ui/NoticePanel.js';
import { ChannelPanel } from './ui/ChannelPanel.js';
import { CairnPanel } from './ui/CairnPanel.js';
import { RitualGuide } from './ui/RitualGuide.js';
import { LakeNews } from './ui/LakeNews.js';
import { TreePanel } from './ui/TreePanel.js';
import { ShareCard } from './ui/ShareCard.js';
import { ORNAMENT_BY_ID } from './game/ornaments.js';
import { STONE_FLAG, CAIRN_MAX } from './rooms/cairns.js';
import { FishingGame } from './fishing/FishingGame.js';
import { FISH, packFish } from './fishing/fishData.js';
import { FishingUI } from './ui/FishingUI.js';
import { createMistForestRoom } from './rooms/mistForestRoom.js';
import { OUTFITS, OUTFIT_BY_ID, OUTFIT_SLOTS } from './game/outfits.js';
import { GATHER_ITEMS, GATHER_BY_ID, GATHER_TYPES, GATHER_DEX_BONUS, NET_PRICE } from './game/gathering.js';
import { CROPS, CROP_BY_ID, WATER_MAX } from './game/garden.js';
import { haveOf, canMake, specLabel } from './game/materials.js';
import { RECIPES } from './game/crafting.js';
import { DISHES, DISH_BY_ID } from './game/cooking.js';
import { MUSEUM_ITEMS, MUSEUM_CATS, MUSEUM_BY_ID } from './game/museum.js';
import { detectSource } from './game/sources.js';

// 網址參數（開發測試用）
//   ?idle=5        掛機巡航等待秒數
//   ?model=x.glb   指定角色模型
//   ?touch=1       在桌機強制顯示手機控制
//   ?server=網址   連到指定的伺服器（預設＝同一個網站）
//   ?name=小狐&fur=2&species=1  跳過進場畫面直接進入（測試用；species：0 狐狸 1 貓 2 熊 3 兔 4 熊貓 5 柴犬）
//   ?room=lake_dock   直接從某個房間開始（測試用）
const params = new URLSearchParams(location.search);
const IDLE_AFTER = Number(params.get('idle')) || 60;
const MODEL_URL = params.get('model') || DEFAULT_MODEL_URL;

/** 線上人數顯示用的地點名稱 */
const PLACE = { forest_main: '營火旁', tent_focus: '帳篷裡', treehouse_music: '樹屋上', lake_dock: '湖畔', tent_social: '交流帳篷裡', campground: '帳篷營地', home: '帳篷裡', mist_forest: '迷霧森林' };

async function init() {
  translateStatic(); // index.html 裡的固定文字
  // 角色模型先開始找（要問伺服器一次），同時去蓋場景，不用乾等
  const characterReady = loadCharacter(MODEL_URL);
  // ---------- Renderer ----------
  const container = document.getElementById('app');
  // 🔋 省電模式（手機自動開）：解析度低一點、不畫影子、每秒最多 30 張；掛機時再降到 12 張
  const lowPower = (isTouchDevice() || params.has('lowpower')) && !params.has('hq');
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lowPower; // 營火的點光源影子要畫 6 次，手機最吃電
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ---------- Scene & Camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);

  // ---------- 房間（地點） ----------
  const forest = createForestRoom();
  const rooms = {
    forest_main: forest,
    tent_focus: createTentRoom(),
    treehouse_music: createTreehouseRoom(),
    lake_dock: createLakeRoom(),
    tent_social: createSocialTentRoom(),
    campground: createCampgroundRoom(), // 帳篷營地：大家的帳篷排在一起
    home: createHomeRoom(), // 我的帳篷（每個人的帳篷共用這個房間，進來時換上主人的擺設）
    mist_forest: createMistForestRoom(), // 迷霧森林：採蘑菇、果實、野花，晚上有螢火蟲
  };
  const { world, campfire } = forest;
  if (lowPower) campfire.light.castShadow = false; // 省電模式不算影子
  world.setPixelRatio(pixelRatio);

  // ---------- Player ----------
  const input = new InputController();
  const character = await characterReady;
  const player = new Player(character);
  // 出生在營火周圍隨機一點，避免大家疊在一起
  const spawnAngle = Math.random() * Math.PI * 2;
  forest.spawn = { x: Math.sin(spawnAngle) * 5.5, z: Math.cos(spawnAngle) * 5.5, ry: spawnAngle + Math.PI };
  scene.add(player.mesh);

  const cameraRig = new ThirdPersonCamera(camera, renderer.domElement, player, input, {
    idleAfter: IDLE_AFTER,
    occluders: forest.occluders,
    onIdleChange: (idle) => document.body.classList.toggle('is-idle', idle),
  });

  // ---------- UI、聲音、動作 ----------
  const hud = new HUD();
  const mobile = isTouchDevice() ? new MobileControls(input) : null;

  const audio = new AudioEngine();
  // 手機瀏覽器只允許在「點擊的當下」開始播放聲音，所以每次觸控／點擊／按鍵都順便確認一次
  // （用 capture 階段，搖桿、按鈕擋掉事件傳遞也不影響）
  const unlockAudio = () => audio.unlock();
  // 注意：iPhone 只承認「手指離開」(touchend) 與 click 是有效點擊，按下 (pointerdown) 不算
  for (const ev of ['touchend', 'click', 'keydown']) {
    window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  }
  const mixer = new MixerPanel(audio);
  new LanguagePicker();
  const pomodoro = new PomodoroPanel({ audio, hud });

  const zzz = new ZzzBubbles(scene);
  const actions = new ActionStateMachine({ player, campfire, world, cameraRig, hud, zzz, scene });
  input.onAction((name) => actions.handleAction(name));
  // 手機畫面小：提示用短版
  Object.defineProperty(actions, 'compact', { get: compactScreen });
  campfire.onCrackle = () => audio.crackleBurst();
  rooms.lake_dock.onSplash = () => audio.splash();

  // ---------- 多人連線 ----------
  const net = new NetworkClient({ url: params.get('server') || import.meta.env.VITE_SERVER_URL || undefined });
  const remotes = new RemotePlayers(scene, zzz);
  /** 小任務引導（下面建立；先宣告，讓前面的事件也能通知它） */
  let ritual = null;
  const names = new Map();
  actions.onAddWood = () => {
    net.addWood();
    ritual?.event('wood');
  };
  actions.onRoastDone = (d) => ritual?.event('roast', d);
  actions.onMeteor = () => ritual?.event('meteor');

  let roomMgr = null;
  const placeName = () => PLACE[roomMgr?.current.id] ?? '營火旁';
  const refreshOnline = () => {
    hud.setOnline(net.status, remotes.count + 1, placeName());
    hud.setChannel(net.online ? net.ch : 0);
  };

  // 點唱機
  const jukebox = new JukeboxPanel({
    onPick: (i) => {
      audio.start();
      audio.sfx('needle');
      // 背景音樂原本是關的：點歌＝想聽，自動開到柔和的音量
      if (i >= 0 && audio.prefs.music === 0) {
        audio.setVolume('music', 0.45);
        hud.toast(t('🎵 背景音樂已打開，可以在右上角「聲音」調整'));
      }
      if (net.online) net.setSong(i); // 伺服器會廣播給樹屋裡的每個人（包括自己）
      else {
        audio.setSong(i);
        hud.toast(i < 0 ? t('🔇 音樂停止了') : t('🎵 點播了「{song}」', { song: SONGS[i].name }));
      }
    },
  });
  actions.onJukebox = () => jukebox.open(audio.songIndex);

  // 釣魚小遊戲（湖畔）
  const fishingUI = new FishingUI({ onPress: () => input.emitAction('roast') });
  let lastCatch = null;
  const fishing = new FishingGame({
    group: rooms.lake_dock.group,
    waterY: LAKE_WATER_Y,
    hud,
    ui: fishingUI,
    audio,
    cameraRig,
    onCatch: (index, size) => {
      ritual?.event('fish', { junk: !!FISH[index]?.junk });
      if (!FISH[index]?.junk && size > (todayLog.size ?? 0)) logToday({ fish: index, size }); // 分享文案用：今天最大的魚
      const rec = fishingUI.record(index, size);
      lastCatch = { index, size, rec };
      fishingUI.showCard(index, size, rec);
      if (net.online) net.sendCatch(index, size);
      else fishingUI.setBoard([], false);
    },
    // 舉著魚起身走開：繼續舉著，走到哪都看得到（按「放下」或去做別的事才收起來）
    onKeep: (index, size) => {
      setTrophy({ index, size });
      hud.toast(t('🐟 舉著{name}到處炫耀吧！想收起來就按「放下」', { name: FISH[index]?.name ?? '' }), 4500);
    },
  });

  // ---------- 🐟 舉著魚到處走（炫耀） ----------
  /** 正舉著的魚 { index, size }（null＝沒有） */
  let trophy = null;
  let trophyChar = null; // 魚掛在哪個角色模型上（換造型後要重新掛）
  const trophyBtn = document.createElement('button');
  trophyBtn.type = 'button';
  trophyBtn.className = 'trophy-btn';
  trophyBtn.hidden = true;
  document.getElementById('ui').appendChild(trophyBtn);
  trophyBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  /** 換成舉著這條魚（null＝收進魚簍） */
  function setTrophy(f) {
    trophy = f;
    trophyChar = null;
    trophyBtn.hidden = !f;
    if (f) trophyBtn.textContent = t('🐟 放下{name}', { name: FISH[f.index]?.name ?? '' });
    else player?.character?.setProp('fish', false);
  }
  trophyBtn.addEventListener('click', () => {
    setTrophy(null);
    hud.toast(t('🐟 把魚收進魚簍了'));
  });
  rooms.lake_dock.fishing = fishing;
  forest.fishing = fishing; // 營火河畔也用同一個釣魚遊戲
  // 特殊魚的出現條件：營火時間、整點釣魚大賽
  fishing.context = () => ({ event: !!currentEvent()?.active, contest: !!(miniState?.active && miniState.kind === 'fish') });

  // ---------- 表情、聊天 ----------
  let myName = '';
  const bubbles = new SpeechBubbles(scene);
  const headOf = (id, out) => {
    if (id === 'self') {
      player.character.getHeadWorldPosition(out);
      return true;
    }
    const r = remotes.get(id);
    if (!r) return false;
    r.character.getHeadWorldPosition(out);
    return true;
  };
  const social = new SocialPanel({
    onEmote: (id) => actions.emote(id),
    onEmoji: (e) => {
      bubbles.show('self', e, { emoji: true });
      net.emoji(e);
    },
    onChat: (text) => {
      bubbles.show('self', text);
      social.addLog(myName, text);
      net.chat(text);
      if (!net.online) social.addLog('', t('（單人模式：只有你自己看得到）'), { system: true });
    },
  });
  social.onDisabled = () => hud.toast(t('專注帳篷裡不能聊天，專心一下吧 📖'));

  // ---------- 地藏祈福處 ----------
  /** 翻看以前的留言／繪馬（沒連線時回傳 null，面板自己用手上的清單分頁） */
  const loadHistory = (kind, page) => (net.online ? net.request('history', { kind, page }) : Promise.resolve(null));
  const shrinePanel = new ShrinePanel({
    onHistory: loadHistory,
    onPray: (quiet) => {
      actions.emote('pray');
      forest.shrine.ringBell();
      if (!quiet) audio.sfx('bell');
    },
    onWish: (text) => {
      ritual?.event('ema');
      if (net.online) net.wish(text);
      else {
        localWishes.push({ name: myName, text, at: Date.now() });
        applyWishes(localWishes);
      }
      hud.toast(t('📝 繪馬掛上去了，願望會實現的 🌸'), 3500);
    },
  });
  shrinePanel.onBlessing = (text) => hud.toast(`🙏 ${text}`, 4500);
  shrinePanel.onSfx = (name) => audio.sfx(name);
  shrinePanel.onKuji = () => ritual?.event('kuji');
  actions.onShrine = () => shrinePanel.open();

  // ---------- 營火告示牌：留言板、贊助者名冊、（不顯眼的）熱可可 ----------
  const localNotes = [];
  const applyNotes = (list) => {
    noticePanel.setNotes(list);
    forest.noticeBoard.draw(list);
  };
  const noticePanel = new NoticePanel({
    hud,
    onHistory: loadHistory,
    onIdea: async (text) => (net.online ? ((await net.request('idea', { text })) ?? { ok: false }) : { ok: false, reason: 'offline' }),
    onPost: (text, color) => {
      ritual?.event('note');
      if (net.online) net.note(text, color);
      else {
        localNotes.push({ name: myName, text, color, at: Date.now() });
        applyNotes(localNotes);
      }
      audio.sfx('tap');
      hud.toast(t('📌 留言貼到告示牌上了'));
    },
  });
  actions.onNoticeBoard = () => noticePanel.open();
  let myReward = 0;

  // ---------- 分享卡片 ----------
  const shareCard = new ShareCard({
    hud,
    getUrl: () => inviteUrl(),
    onShared: (info) => claimShareGift(info),
    snapshot: () => {
      renderer.render(scene, camera); // 畫完馬上截圖（不然畫布會是空的）
      return renderer.domElement.toDataURL('image/jpeg', 0.9);
    },
  });
  shrinePanel.onShareKuji = (level, line) => {
    shrinePanel.close();
    shareCard.open({
      icon: '🎋',
      big: level,
      small: line,
      text: t('我在迷霧森林露營地抽到「{level}」🎋 沒力氣出門的夜晚，一起來營火旁坐一下吧', { level }),
    });
  };

  // ---------- 每晚的營火時間（21:00～21:30） ----------
  let eventState = null; // { active, endsIn/startsIn, at }
  const currentEvent = () => {
    if (!eventState) return null;
    const passed = (performance.now() - eventState.at) / 1000;
    return eventState.active
      ? { active: true, endsIn: Math.max(0, eventState.endsIn - passed) }
      : { active: false, startsIn: Math.max(0, eventState.startsIn - passed) };
  };
  const applyEvent = (ev, announce = false) => {
    const was = eventState?.active;
    eventState = { ...ev, at: performance.now() };
    world.eventShower = !!ev.active;
    hud.setEvent(currentEvent());
    if (announce && ev.active && !was) hud.toast(t('🌠 營火時間開始了！流星雨、松果加倍，限定「流星吊飾」只到 10 點'), 6000);
    if (announce && !ev.active && was) hud.toast(t('🌙 今晚的營火時間結束了，明晚 9:30 見'), 4000);
    treePanel?.refresh();
  };
  net.on('event', (ev) => applyEvent(ev, true));
  setInterval(() => eventState && hud.setEvent(currentEvent()), 20000);

  // ---------- 晚上的小活動（19:00～23:00 每半小時：釣魚大賽、疊石接力、添柴時光⋯） ----------
  let miniState = null;
  const currentMini = () => {
    if (!miniState) return null;
    const passed = (performance.now() - miniState.at) / 1000;
    return miniState.active
      ? { ...miniState, endsIn: Math.max(0, miniState.endsIn - passed) }
      : { ...miniState, startsIn: Math.max(0, miniState.startsIn - passed) };
  };
  const MINI_START = {
    fish: () => t('🎣 釣魚大賽開始了！10 分鐘內到營火河畔或湖邊釣最大的魚，前三名送松果'),
    stone: () => t('🪨 疊石接力開始了！10 分鐘內每疊一顆石頭多 1 顆松果'),
    race: () => t('🏃 燈籠賽跑開始了！依序跑過森林裡 1→5 號燈籠，最快的前三名送松果'),
    hunt: () => t('✨ 找金松果開始了！森林裡藏了 5 顆發光的金松果，找到一顆 +5 松果'),
    wood: () => t('🔥 添柴時光開始了！10 分鐘內每添一根柴多 1 顆松果'),
  };
  const applyMini = (m, announce = false) => {
    const sameRace = miniState?.active && miniState.kind === 'race' && m.active && m.kind === 'race';
    miniState = { ...m, top: m.top ?? [], spots: m.spots ?? [], at: performance.now() };
    // 森林裡的道具
    forest.mini.setRace(m.active && m.kind === 'race', sameRace ? forest.mini.next : 0);
    forest.mini.setHunt(m.active && m.kind === 'hunt' ? m.spots ?? [] : []);
    miniState.left = forest.mini.huntLeft;
    hud.setMini(currentMini());
    if (!announce) return;
    if (m.active) {
      hud.toast(MINI_START[m.kind]?.() ?? '', 6500);
      audio.sfx('bell');
    } else if (m.ended === 'fish') {
      const medal = ['🥇', '🥈', '🥉'];
      hud.toast(
        m.winners?.length
          ? t('🏆 釣魚大賽結果：{list}', { list: m.winners.map((w, i) => `${medal[i]} ${w.name} ${w.size}cm (+${w.prize}🌰)`).join('　') })
          : t('🎣 這場釣魚大賽沒有人參加，下次一起來吧'),
        8000,
      );
    } else if (m.ended === 'race') {
      const medal = ['🥇', '🥈', '🥉'];
      hud.toast(
        m.winners?.length
          ? t('🏆 燈籠賽跑結果：{list}', { list: m.winners.map((w, i) => t('{medal} {name} {s} 秒 (+{p}🌰)', { medal: medal[i], name: w.name, s: w.time, p: w.prize })).join('　') })
          : t('🏃 這場燈籠賽跑沒有人跑完，下次一起來吧'),
        8000,
      );
    } else if (m.ended === 'hunt') {
      hud.toast(m.winners?.length ? t('✨ 找金松果結束：這次找到 {n} 顆，謝謝大家', { n: m.winners.length }) : t('✨ 金松果這次都沒人找到，下次再來找找看'), 6000);
    }
  };
  net.on('mini', (m) => applyMini(m, true));
  net.on('areas', (a) => forest.setAreas(a));
  net.on('miniBoard', ({ top }) => {
    if (!miniState?.active) return;
    const before = miniState.top?.[0];
    miniState.top = top;
    hud.setMini(currentMini());
    const now = top[0];
    if (!now || (before && before.name === now.name && before.size === now.size && before.time === now.time)) return;
    hud.toast(
      miniState.kind === 'race'
        ? t('🏃 {name} 跑出 {s} 秒，目前最快！', { name: now.name, s: now.time })
        : t('🎣 {name} 釣到 {size} 公分的魚，暫居第一！', { name: now.name, size: now.size }),
      3500,
    );
  });
  setInterval(() => miniState && hud.setMini(currentMini()), 20000);
  net.on('miniHunt', ({ i, by, left }) => {
    forest.mini.take(i);
    if (miniState) miniState.left = left;
    hud.setMini(currentMini());
    if (by !== myName) hud.toast(t('✨ {name} 找到一顆金松果（還剩 {n} 顆）', { name: by, n: left }), 3500);
  });

  // 試玩版（沒有伺服器）：網址加 ?mini=race 或 ?mini=hunt 可以在瀏覽器裡模擬活動
  let localMini = null;
  const miniReq = (ev, data) => (!net.online && localMini ? Promise.resolve(localMini(ev, data)) : net.request(ev, data));
  /** 走到燈籠、金松果旁邊時通知伺服器（同一時間只送一個） */
  let miniBusy = false;
  let raceStart = 0;
  const checkMini = () => {
    const m = miniState;
    if (miniBusy || !m?.active || roomMgr?.current !== forest) return;
    const pos = player.position;
    if (m.kind === 'race') {
      const i = forest.mini.touchingLantern(pos);
      if (i < 0) return;
      miniBusy = true;
      miniReq('race', { i }).then((res) => {
        miniBusy = false;
        if (!res) return;
        forest.mini.setRace(true, res.next ?? 0);
        if (!res.ok) {
          if (res.reason === 'tooFast') hud.toast(t('太快了，好像跳過了燈籠，從 1 號重新開始吧'));
          return;
        }
        audio.sfx('bell');
        if (i === 0) {
          raceStart = performance.now();
          hud.toast(t('🏃 開跑！下一個：{n} 號燈籠', { n: 2 }), 2500);
        } else if (res.time != null) {
          hud.toast(
            res.best
              ? t('🏁 跑完了！{s} 秒，目前第 {r} 名', { s: res.time, r: res.rank })
              : t('🏁 跑完了！{s} 秒（沒有破自己的紀錄，再跑一次？）', { s: res.time }),
            5000,
          );
        } else {
          const sec = ((performance.now() - raceStart) / 1000).toFixed(1);
          hud.toast(t('🏮 {i}/5・{s} 秒，下一個：{n} 號燈籠', { i: i + 1, s: sec, n: i + 2 }), 2500);
        }
      });
    } else if (m.kind === 'hunt') {
      const i = forest.mini.huntAt(pos);
      if (i < 0) return;
      miniBusy = true;
      miniReq('grab', { i }).then((res) => {
        miniBusy = false;
        if (res?.ok) {
          forest.mini.take(i);
          miniState.left = res.left;
          hud.setMini(currentMini());
          audio.sfx('bell');
          hud.toast(t('✨ 找到一顆金松果！+{n} 松果（還剩 {left} 顆）', { n: HUNT_GAIN, left: res.left }), 4000);
          if (!net.online) setCoins((pinecones ?? 0) + HUNT_GAIN, HUNT_GAIN);
        } else if (res?.reason === 'taken') forest.mini.take(i);
      });
    }
  };

  // ---------- 邀朋友一起烤火、🎁 分享送禮 ----------
  /** 我的公開邀請代號（連上伺服器後才有；不是 vid） */
  let myCode = null;
  const inviteUrl = () => `${location.origin}${location.pathname}${myCode ? `?with=${myCode}` : ''}`;
  /** 邀請文字（連結放最後面，貼到哪裡都點得到） */
  const inviteText = () => (currentEvent()?.active ? t('營火時間開始了，快來營火旁找我 🔥') : t('今晚 9:30 一起來營火旁坐坐吧 🔥')) + '\n' + t('點連結會直接出現在我旁邊，免安裝打開就能玩：');
  /** 📋 複製邀請連結（文字＋連結） */
  const copyInvite = async () => {
    const url = inviteUrl();
    try {
      await navigator.clipboard.writeText(`${inviteText()}\n${url}`);
    } catch {
      // 舊瀏覽器：用隱藏的輸入框複製
      const ta = document.createElement('textarea');
      ta.value = `${inviteText()}\n${url}`;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand?.('copy');
      ta.remove();
      if (!ok) return hud.toast(t('複製不了，請長按上面的連結自己複製')), false;
    }
    hud.toast(t('📋 已複製邀請連結，貼到 LINE、Threads、IG 給朋友吧'), 4000);
    await claimShareGift({ kind: 'invite' });
    return true;
  };
  /** 📤 分享連結（只分享文字和連結，不夾圖片，連結一定會跟著送出去） */
  const shareInvite = async () => {
    if (!navigator.share) return copyInvite();
    try {
      await navigator.share({ title: t('迷霧森林露營地'), text: inviteText(), url: inviteUrl() });
    } catch {
      return false; // 取消分享
    }
    await claimShareGift({ kind: 'invite' });
    return true;
  };
  /** 分享過一次：領「營火明信片牆」（伺服器只會給一次） */
  const claimShareGift = async (info) => {
    if (!net.online) return;
    const res = await net.request('shared', { kind: info?.kind ?? 'card', staff: isStaff() });
    if (res?.outfit) {
      look.outfits = [...new Set([...look.outfits, res.outfit])];
      look.dailyGot = true;
      const o = OUTFIT_BY_ID[res.outfit];
      audio.sfx('bell');
      hud.toast(t('👒 謝謝分享！拿到今天的每日造型：{name}', { name: outfitName(res.outfit) }), 6000);
      if (o && !look.wear?.[o.slot]) wearOutfit(res.outfit);
    }
  };
  const giftPanel = new GiftPanel({
    getInfo: async () => {
      const res = await net.request('giftInfo');
      return res?.ok ? res : null;
    },
    getUrl: () => inviteUrl(),
    onCopy: copyInvite,
    onShareLink: shareInvite,
    onShareImage: () => openDateInvite(),
  });
  // 「🔥 約朋友」和「🎁 邀朋友送禮」合成同一個地方
  hud.onInvite = () => giftPanel.open();
  const giftName = (id) => {
    const f = GIFT_FURNITURE.find((x) => x.id === id);
    if (f) return { icon: f.icon, name: f.name, furniture: true };
    const st = TENT_STYLE_BY_ID[id];
    return { icon: st?.icon ?? '🎁', name: st?.name ?? '', furniture: false };
  };
  net.on('gift', ({ id, home }) => {
    setMyHome(home);
    const g = giftName(id);
    audio.sfx('bell');
    hud.toast(
      t('🎁 收到禮物：{icon} {name}！', g) +
        (g.furniture
          ? home?.tent
            ? t('回帳篷按「🛠️ 布置」擺出來')
            : t('買了帳篷就能擺出來')
          : t('到小舖「⛺ 帳篷外觀」換上')),
      6000,
    );
    giftPanel.refresh();
  });
  net.on('friendCredit', ({ name, refs }) => {
    hud.toast(t('👫 {name} 透過你的連結來玩了！+10 松果（已經邀請 {n} 位）', { name, n: refs }), 6000);
    giftPanel.refresh();
  });
  net.on('friendJoined', ({ name }) => hud.toast(t('👫 {name} 照著你的邀請來到營火旁了！', { name }), 5000));

  // ---------- 松果與心願大樹 ----------
  /** 我的松果（null＝還沒連上伺服器） */
  let pinecones = null;
  /** 「👤 存檔」：已經有帳篷或存了一些松果、卻還沒建立帳號時才出現 */
  const hasAccount = () => {
    try {
      return !!localStorage.getItem('cozy-campfire-account');
    } catch {
      return false;
    }
  };
  const refreshAcctChip = () => {
    try {
      hud.setAccountVisible(net.online && !hasAccount() && (!!myHome?.tent || (pinecones ?? 0) >= 15));
    } catch {
      /* 初始化還沒跑到 myHome 那裡 */
    }
  };
  const setCoins = (n, delta = 0) => {
    pinecones = n;
    hud.setPinecones(n, delta);
    refreshAcctChip();
    treePanel.refresh();
  };
  const treePanel = new TreePanel({
    getEvent: () => currentEvent(),
    getItems: () => forest.wishTree.items,
    getCoins: () => (net.online ? pinecones : null),
    onHang: async (id) => {
      const res = await net.hang(id);
      if (res?.ok) {
        const o = ORNAMENT_BY_ID[id];
        hud.toast(t('{icon} 把{name}掛上心願大樹了，許個願吧 ✨', { icon: o.icon, name: o.name }), 3500);
        audio.sfx('bell');
        ritual?.event('hang');
        return true;
      }
      if (res?.reason === 'eventOnly') hud.toast(t('🌠 流星吊飾只有每晚 9:30～10:00 的營火時間才能掛'));
      else if (res?.reason === 'poor') hud.toast(t('松果不夠喔，做小任務或釣魚可以撿到更多 🌰'));
      else if (res?.reason === 'tooFast') hud.toast(t('慢慢來，一個一個掛 ✨'));
      else hud.toast(t('沒掛上去，再試一次吧'));
      return false;
    },
  });
  actions.onTree = () => treePanel.open();
  net.on('wallet', ({ pc, delta, reason }) => {
    setCoins(pc, delta);
    if (delta <= 0) return;
    if (reason === 'sit') hud.toast(t('🌰 在營地待了一會兒，撿到 {n} 顆松果', { n: delta }));
    else if (reason === 'quest') hud.toast(t('🌰 完成任務，拿到 {n} 顆松果！可以去心願大樹換裝飾', { n: delta }), 3500);
    else if (reason === 'fish') hud.toast(t('🌰 釣到魚，撿到 {n} 顆松果', { n: delta }));
    // dex（圖鑑收錄）的提示由 'dex' 事件負責
  });
  // 上方的「📖 圖鑑」：在哪裡都能打開（之後花、其他收集也放在這裡）
  hud.onDex = () => fishingUI.openCreel();

  // ---------- 👒 造型收集 ----------
  /** 伺服器給的：擁有的造型、身上穿的、今天的每日造型、這週限定 */
  let look = { outfits: [], wear: {}, daily: null, dailyGot: false, weekly: null, weeklyGot: false, dateNext: null };
  let lookSlot = 'head';
  const applyWear = () => player.character.setOutfit?.(look.wear ?? {});
  const outfitName = (id) => (OUTFIT_BY_ID[id] ? `${OUTFIT_BY_ID[id].icon} ${t(OUTFIT_BY_ID[id].zh)}` : '');
  /** 怎麼拿到：長的說明（滑鼠移上去）、短的（卡片上） */
  const HOW = {
    daily: [t('每日造型：那天分享就拿到（大約一個月輪一次，錯過會再回來）'), t('那天分享就拿到')],
    weekly: [t('每週限定：朋友真的透過你的連結來玩才拿得到'), t('朋友透過連結來玩')],
    date: [t('營火之約限定：朋友在晚上 9:30 營火時間透過你的連結進來，兩個人都拿到'), t('9:30 營火時間約朋友')],
  };
  fishingUI.extraTabs.push({
    id: 'outfit',
    label: t('👒 造型'),
    title: () => t('👒 造型 {n}／{total}', { n: look.outfits.length, total: OUTFITS.length }),
    render: () => {
      const owned = new Set(look.outfits);
      const today = look.daily ? OUTFIT_BY_ID[look.daily] : null;
      const week = look.weekly ? OUTFIT_BY_ID[look.weekly] : null;
      const cards = OUTFITS.filter((o) => o.slot === lookSlot)
        .map((o) => {
          const has = owned.has(o.id);
          const worn = look.wear?.[o.slot] === o.id;
          const tag = o.src === 'weekly' ? t('每週限定') : o.src === 'date' ? t('營火之約') : o.id === look.daily ? t('今天的') : t('每日');
          return has
            ? `<div class="dex-card outfit${worn ? ' worn' : ''}" data-id="${o.id}"><i class="dex-emoji">${o.icon}</i><b>${t(o.zh)}</b><small>${tag}</small><em>${worn ? t('穿著中・點一下脫掉') : t('點一下穿上')}</em></div>`
            : `<div class="dex-card unknown" title="${HOW[o.src][0]}"><i class="dex-emoji">${o.icon}</i><b>${t('？？？')}</b><small>${tag}</small><em>${HOW[o.src][1]}</em></div>`;
        })
        .join('');
      return `
        <div class="outfit-today">
          ${today ? (look.dailyGot ? t('✅ 今天的每日造型「{name}」已經拿到了', { name: outfitName(today.id) }) : t('🎁 今天的每日造型：{name}（分享一次就拿到）', { name: outfitName(today.id) })) : ''}
          ${week ? `<br>${look.weeklyGot ? t('✅ 這週限定「{name}」已經拿到了', { name: outfitName(week.id) }) : t('🌟 這週限定：{name}（朋友透過你的連結來玩就拿到）', { name: outfitName(week.id) })}` : ''}
          <br>${t('🔥 營火之約：朋友在 9:30 營火時間透過你的連結進來，兩個人都拿到限定造型')}
          ${!look.dailyGot && net.online ? `<br><button type="button" id="outfit-share">${t('🔥 約朋友今晚 9:30，順便領今天的造型')}</button>` : ''}
        </div>
        <div class="outfit-slot-tabs">${OUTFIT_SLOTS.map((sl) => `<button type="button" data-slot="${sl.id}" class="${sl.id === lookSlot ? 'on' : ''}">${sl.icon} ${t(sl.zh)}</button>`).join('')}</div>
        <div class="dex-grid">${cards}</div>
        <div class="creel-total">${net.online ? t('造型可以同時戴帽子、背背包、圍圍巾，其他人都看得到 ✨') : t('單人模式：連上伺服器才能領造型')}</div>`;
    },
    bind: (body) => {
      for (const b of body.querySelectorAll('[data-slot]')) {
        b.addEventListener('click', () => {
          lookSlot = b.dataset.slot;
          fishingUI.openCreel('outfit');
        });
      }
      for (const c of body.querySelectorAll('.dex-card.outfit')) c.addEventListener('click', () => wearOutfit(c.dataset.id));
      body.querySelector('#outfit-share')?.addEventListener('click', () => {
        fishingUI.el.modal.classList.remove('show');
        giftPanel.open();
      });
    },
  });
  async function wearOutfit(id) {
    const o = OUTFIT_BY_ID[id];
    if (!o) return;
    const next = look.wear?.[o.slot] === id ? null : id;
    look.wear = { ...look.wear };
    if (next) look.wear[o.slot] = next;
    else delete look.wear[o.slot];
    applyWear();
    audio.sfx('tap');
    if (fishingUI.el.modal.classList.contains('show')) fishingUI.openCreel('outfit');
    const res = await net.request('wear', { slot: o.slot, id: next });
    if (res?.ok) look.wear = res.wear ?? look.wear;
  }
  hud.onLook = () => {
    if (look.daily && !look.dailyGot) lookSlot = OUTFIT_BY_ID[look.daily]?.slot ?? lookSlot;
    fishingUI.openCreel('outfit');
  };
  const setLook = (v) => {
    look = { ...look, ...v };
    applyWear();
  };
  net.on('outfit', ({ id, ot }) => id !== net.id && remotes.setOutfit(id, ot));
  net.on('outfitGift', ({ id, why, outfits }) => {
    look.outfits = outfits ?? [...look.outfits, id];
    if (id === look.daily) look.dailyGot = true;
    if (id === look.weekly) look.weeklyGot = true;
    if (why === 'date') look.dateNext = null;
    audio.sfx('bell');
    const msg =
      why === 'weekly'
        ? t('🌟 朋友透過你的連結來玩了！拿到每週限定造型：{name}', { name: outfitName(id) })
        : why === 'date'
          ? t('🔥 營火之約成立！拿到限定造型：{name}', { name: outfitName(id) })
          : t('👒 拿到今天的每日造型：{name}', { name: outfitName(id) });
    hud.toast(`${msg}${t('（按上方「👒 造型」穿上）')}`, 6500);
    // 還沒穿這個部位：直接幫他穿上，馬上看得到
    const o = OUTFIT_BY_ID[id];
    if (o && !look.wear?.[o.slot]) wearOutfit(id);
  });
  net.on('dateFriend', ({ name }) => hud.toast(t('🔥 {name} 赴約了！一起在營火旁坐坐吧', { name }), 6000));

  // ---------- 🍄 採集（迷霧森林、湖邊的石頭貝殼） ----------
  /** 採集籃：{ 種類: 數量 }（不限格子，不會壞；菜園收成也放這裡） */
  let basket = {};
  /** 有採集點的房間 */
  const gatherRooms = ['mist_forest', 'lake_dock'];
  const onGather = async (i) => {
    const res = await net.request('gather', { i });
    if (!res?.ok) return res;
    basket[res.id] = res.count;
    gdex.add(res.id);
    logToday({ gather: (todayLog.gather ?? 0) + 1 });
    const it = GATHER_BY_ID[res.id];
    audio.sfx(res.first ? 'bell' : 'tap');
    if (res.first) {
      const n = GATHER_ITEMS.filter((x) => found(x.id)).length;
      hud.toast(t('📖 圖鑑新收錄：{icon} {name}！+{n} 🌰（{c}／{t}）', { icon: it.icon, name: t(it.zh), n: res.gain, c: n, t: GATHER_ITEMS.length }), 4500);
      if (res.bonus) setTimeout(() => hud.toast(t('🏆 採集圖鑑全部收集完成！再送你 {n} 顆松果', { n: res.bonus }), 6000), 2500);
    } else {
      hud.toast(t('🧺 採到{icon} {name}（採集籃裡有 {n} 個）', { icon: it.icon, name: t(it.zh), n: res.count }), 2200);
    }
    return res;
  };
  for (const id of gatherRooms) rooms[id].gather.onGather = onGather;
  const refreshGather = async () => {
    const room = roomMgr?.current;
    if (!room?.gather) return;
    if (!net.online) return room.gather.setOffline();
    const res = await net.request('gatherInfo');
    if (res?.ok) {
      basket = res.basket ?? basket;
      gdex = new Set(res.gdex ?? []);
      setNet(res.net);
      room.gather.setState(res);
    }
  };
  const escapeHtml = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  /** 採集圖鑑：找到過的（就算用掉、捐掉也算） */
  let gdex = new Set();
  const found = (id) => gdex.has(id) || basket[id] > 0;
  const rarityStars = (r) => '★'.repeat(r);
  /** 通用的彈出視窗（借用圖鑑那個視窗） */
  const modal = {
    open(title, html, bind) {
      fishingUI._modal = 'custom';
      fishingUI._tab = null;
      fishingUI.el.modalTitle.textContent = title;
      fishingUI.el.modalBody.innerHTML = html;
      bind?.(fishingUI.el.modalBody);
      fishingUI.el.modal.classList.add('show');
    },
    close: () => fishingUI.el.modal.classList.remove('show'),
    get isOpen() {
      return fishingUI.el.modal.classList.contains('show');
    },
  };
  fishingUI.extraTabs.push({
    id: 'gather',
    label: t('🍄 採集'),
    title: () => t('🍄 採集圖鑑 {n}／{total}', { n: GATHER_ITEMS.filter((x) => found(x.id)).length, total: GATHER_ITEMS.length }),
    render: () => {
      const groups = GATHER_TYPES.map((ty) => {
        const cards = GATHER_ITEMS.filter((x) => x.type === ty.id)
          .map((x) =>
            found(x.id)
              ? `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${t(x.zh)}</b><small>${rarityStars(x.rarity)}${museum[x.id] ? ' 🏛️' : ''}</small><em>${t('採集籃裡 ×{n}', { n: basket[x.id] ?? 0 })}</em></div>`
              : `<div class="dex-card unknown"><i class="dex-emoji">${x.icon}</i><b>${t('？？？')}</b><small>${rarityStars(x.rarity)}${x.night ? ' 🌙' : x.day ? ' ☀️' : ''}</small><em>${t(x.hint)}</em></div>`,
          )
          .join('');
        return `<div class="dex-note">${ty.icon} ${t(ty.zh)}</div><div class="dex-grid">${cards}</div>`;
      }).join('');
      const veg = CROPS.filter((c) => basket[c.id] > 0).map((c) => `${c.icon} ${t(c.zh)} ×${basket[c.id]}`).join('　');
      const total = Object.values(basket).reduce((a, b) => a + b, 0);
      return `<div class="dex-note">${t('🍄 迷霧森林：地上有發光圈圈的蘑菇、果實、野花，走過去按 E 採摘；空中飛的蟲蟲要用捕蟲網（{p} 🌰）按 E 捕。🐚 湖畔碼頭的岸邊可以撿石頭和貝殼。✨ 晚上 8～10 點營火附近偶爾會有寶藏。第一次找到新的種類送松果，全部收集完再送 {b} 顆 🌰', { p: NET_PRICE, b: GATHER_DEX_BONUS })}</div>
        <div class="dex-note">${netOwned ? t('🦋 捕蟲網：已經有了') : t('🦋 捕蟲網：還沒有')}${!netOwned && net.online ? ` <button type="button" class="mini-btn" id="buy-net">${t('買一支 🌰 {p}', { p: NET_PRICE })}</button>` : ''}</div>
        ${groups}
        ${veg ? `<div class="dex-note">${t('🥕 菜園收成')}：${veg}</div>` : ''}
        <div class="creel-total">${t('🧺 採集籃：總共 {n} 個（不限格子，不會壞）', { n: total })}</div>`;
    },
    bind: (body) => body.querySelector('#buy-net')?.addEventListener('click', () => buyNet()),
  });

  // ---------- 🦋 捕蟲網 ----------
  let netOwned = false;
  const setNet = (v) => {
    netOwned = !!v;
    for (const id of gatherRooms) rooms[id].gather.hasNet = netOwned;
  };
  async function buyNet() {
    const res = await net.request('buyNet');
    if (res?.ok) {
      setNet(true);
      setCoins(res.pc, 0);
      audio.sfx('bell');
      hud.toast(t('🦋 買了一支捕蟲網！看到空中飛的蟲蟲，走近按 E 捕捉'), 5000);
      modal.close();
    } else if (res?.reason === 'poor') hud.toast(t('松果不夠，還差 {n} 顆 🌰', { n: NET_PRICE - (res.pc ?? 0) }));
    else hud.toast(t('還沒連上伺服器，等一下再試'));
  }
  rooms.mist_forest.gather.onNoNet = () =>
    modal.open(
      t('🦋 捕蟲網'),
      `<div class="dex-note">${t('空中飛的蟲蟲要用捕蟲網才捕得到。買一支之後一直都能用：白天有瓢蟲、金龜子、螳螂⋯，晚上有螢火蟲、獨角仙、月光蛾⋯')}</div>
       <div class="outfit-today"><button type="button" id="buy-net2">${t('🦋 買一支捕蟲網 🌰 {p}', { p: NET_PRICE })}</button></div>`,
      (body) => body.querySelector('#buy-net2').addEventListener('click', () => buyNet()),
    );

  // ---------- 🏛️ 營地標本櫃（大家一起捐，寫上第一個捐的人） ----------
  let museum = {};
  const setMuseum = (m) => {
    museum = m ?? {};
    forest.drawMuseum(museum);
  };
  let museumCat = 'mush';
  async function openMuseum() {
    const info = await net.request('museumInfo');
    if (!info?.ok) return hud.toast(t('連上伺服器才能看標本櫃'));
    setMuseum(info.museum);
    const fishDex = new Set((info.fishDex ?? []).map(Number));
    const has = (x) => (x.type === 'fish' ? fishDex.has(x.fish) : basket[x.id] > 0);
    const known = (x) => (x.type === 'fish' ? fishDex.has(x.fish) : found(x.id));
    const nameOf = (x) => (x.type === 'fish' ? x.name : t(x.zh));
    const total = MUSEUM_ITEMS.length;
    const n = Object.keys(museum).length;
    const tabs = MUSEUM_CATS.map((c) => {
      const items = MUSEUM_ITEMS.filter((x) => x.type === c.id);
      const done = items.filter((x) => museum[x.id]).length;
      return `<button type="button" data-mcat="${c.id}" class="${c.id === museumCat ? 'on' : ''}">${c.icon} ${t(c.zh)}<small>${done}/${items.length}</small></button>`;
    }).join('');
    const cards = MUSEUM_ITEMS.filter((x) => x.type === museumCat)
      .map((x) => {
        const d = museum[x.id];
        if (d) return `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${nameOf(x)}</b><small>${t('第一個捐的人')}</small><em>${escapeHtml(d.n)}</em></div>`;
        const can = has(x) && info.left > 0;
        return `<div class="dex-card ${has(x) ? 'can-donate' : 'unknown'}"><i class="dex-emoji">${x.icon}</i><b>${known(x) ? nameOf(x) : t('？？？')}</b><small>${rarityStars(x.rarity)}</small>${has(x) ? `<button type="button" class="mini-btn" data-donate="${x.id}" ${can ? '' : 'disabled'}>${x.type === 'fish' ? t('🎣 捐魚拓') : t('🎁 捐出')}</button>` : `<em>${t('還沒有人捐')}</em>`}</div>`;
      })
      .join('');
    modal.open(
      t('🏛️ 營地標本櫃 {n}／{total}', { n, total }),
      `<div class="dex-note">${t('大家一起把採集到的東西、釣過的魚拓捐進標本櫃，每一格都會寫上「第一個捐的人」。每個人每天只能捐一件，慢慢一起填滿吧！捐出一件送松果（★ 越多送越多）。')}</div>
       <div class="outfit-today">${info.left > 0 ? t('🎁 今天還可以捐 {n} 件', { n: info.left }) : t('✅ 今天已經捐過了，明天再來捐下一件吧')}</div>
       <div class="museum-tabs">${tabs}</div>
       <div class="dex-grid">${cards}</div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-mcat]')) {
          b.addEventListener('click', () => {
            museumCat = b.dataset.mcat;
            openMuseum();
          });
        }
        for (const b of body.querySelectorAll('[data-donate]')) {
          b.addEventListener('click', async () => {
            b.disabled = true;
            const res = await net.request('donate', { id: b.dataset.donate });
            if (res?.ok) {
              if (MUSEUM_BY_ID[b.dataset.donate]?.type !== 'fish') {
                basket[b.dataset.donate] = res.count;
                if (!res.count) delete basket[b.dataset.donate];
              }
              audio.sfx('bell');
              hud.toast(t('🏛️ 捐進標本櫃了！你的名字會留在這一格 +{n} 🌰', { n: res.gain }), 5000);
            } else if (res?.reason === 'done') hud.toast(t('剛好有人先捐了：{name}', { name: res.by }));
            else if (res?.reason === 'daily') hud.toast(t('今天已經捐過了，明天再來捐下一件吧'));
            openMuseum();
          });
        }
      },
    );
  }
  actions.onMuseum = () => (net.online ? openMuseum() : hud.toast(t('連上伺服器才能看標本櫃')));
  net.on('museum', ({ id, n }) => {
    museum = { ...museum, [id]: { n, at: Date.now() } };
    forest.drawMuseum(museum);
    const it = MUSEUM_BY_ID[id];
    if (it && n !== myName) hud.toast(t('🏛️ {name} 把{icon} {item}捐進了標本櫃', { name: n, icon: it.icon, item: it.type === 'fish' ? it.name : t(it.zh) }), 4000);
    if (modal.isOpen && fishingUI._modal === 'custom' && fishingUI.el.modalTitle.textContent.startsWith('🏛️')) openMuseum();
  });

  // ---------- 材料（手作、料理共用） ----------
  const needHtml = (need) =>
    need
      .map((sp) => {
        const have = haveOf(basket, sp);
        return `<span class="need ${have >= sp.n ? 'ok' : ''}">${specLabel(sp, t)} ${Math.min(have, sp.n)}/${sp.n}</span>`;
      })
      .join('');

  // ---------- 🔨 手作家具 ----------
  fishingUI.extraTabs.push({
    id: 'craft',
    label: t('🔨 手作'),
    title: () => t('🔨 手作家具'),
    render: () => {
      const cards = RECIPES.map((r) => {
        const f = FURNITURE_BY_ID[r.id];
        const ok = canMake(basket, r.need);
        return `<div class="craft-row"><i class="dex-emoji">${f?.icon ?? '🔨'}</i><div class="craft-info"><b>${f?.name ?? r.id}</b><div class="needs">${needHtml(r.need)}</div></div><button type="button" class="mini-btn" data-craft="${r.id}" ${ok && net.online ? '' : 'disabled'}>${t('做一個')}</button></div>`;
      }).join('');
      return `<div class="dex-note">${t('用採集籃裡的東西做家具，做好會放進帳篷背包，回帳篷按「🛠️ 布置」擺出來。「任意」的材料會先用數量多、常見的，★★★ 稀有的不會被拿去用。')}</div>${cards}`;
    },
    bind: (body) => {
      for (const b of body.querySelectorAll('[data-craft]')) {
        b.addEventListener('click', async () => {
          b.disabled = true;
          const res = await net.request('craft', { id: b.dataset.craft });
          if (res?.ok) {
            basket = res.basket;
            setMyHome(res.home);
            audio.sfx('bell');
            const f = FURNITURE_BY_ID[b.dataset.craft];
            hud.toast(t('🔨 做好了：{icon} {name}！放進帳篷背包了', { icon: f?.icon ?? '', name: f?.name ?? '' }), 4500);
          } else hud.toast(t('材料不夠喔'));
          fishingUI.openCreel('craft');
        });
      }
    },
  });

  // ---------- 🍲 營火料理 ----------
  let dishes = {};
  let cooked = new Set();
  /** 在料理鍋旁邊才能煮 */
  const atPot = () => roomMgr?.current.id === 'forest_main' && forest.nearPot?.(player.position);
  fishingUI.extraTabs.push({
    id: 'cook',
    label: t('🍲 料理'),
    title: () => t('🍲 營火料理 {n}／{total}', { n: DISHES.filter((d) => cooked.has(d.id)).length, total: DISHES.length }),
    render: () => {
      const here = atPot();
      const mine = DISHES.filter((d) => dishes[d.id] > 0);
      const others = [...remotes.players.values()].filter((r) => !r.npc);
      const myDishes = mine.length
        ? mine
            .map(
              (d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${t(d.zh)} ×${dishes[d.id]}</b></div>
                <button type="button" class="mini-btn" data-eat="${d.id}">${t('😋 吃')}</button>
                ${others.length ? `<select class="mini-sel" data-gift="${d.id}"><option value="">${t('🎁 送給⋯')}</option>${others.map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}</select>` : ''}</div>`,
            )
            .join('')
        : `<div class="dex-note">${t('還沒有料理，煮一道吧！')}</div>`;
      const recipes = DISHES.map((d) => {
        const ok = canMake(basket, d.need);
        return `<div class="craft-row ${cooked.has(d.id) ? '' : 'new-dish'}"><i class="dex-emoji">${cooked.has(d.id) ? d.icon : '❔'}</i><div class="craft-info"><b>${cooked.has(d.id) ? t(d.zh) : t('？？？（還沒煮過）')}</b><div class="needs">${needHtml(d.need)}</div></div><button type="button" class="mini-btn" data-cook="${d.id}" ${ok && here && net.online ? '' : 'disabled'}>${t('煮')}</button></div>`;
      }).join('');
      return `<div class="dex-note">${here ? t('🔥 在料理鍋旁邊，可以開始煮了！') : t('到中央營火旁的「🍲 營火料理」鍋子才能煮。蔬菜在帳篷前的小菜園種。')}</div>
        <div class="dex-note">${t('🍱 我的料理')}</div>${myDishes}
        <div class="dex-note">${t('📖 食譜（第一次煮出新料理送松果）')}</div>${recipes}`;
    },
    bind: (body) => {
      for (const b of body.querySelectorAll('[data-cook]')) {
        b.addEventListener('click', async () => {
          b.disabled = true;
          const res = await net.request('cook', { id: b.dataset.cook });
          if (res?.ok) {
            basket = res.basket;
            dishes = res.dishes;
            cooked = new Set(res.cooked);
            const d = DISH_BY_ID[b.dataset.cook];
            audio.sfx('bell');
            hud.toast(res.first ? t('🍲 第一次煮出「{icon} {name}」！+{n} 🌰', { icon: d.icon, name: t(d.zh), n: res.gain }) : t('🍲 煮好了：{icon} {name}', { icon: d.icon, name: t(d.zh) }), 4500);
          } else hud.toast(res?.reason === 'notHere' ? t('到營火旁的料理鍋才能煮') : t('材料不夠喔'));
          fishingUI.openCreel('cook');
        });
      }
      for (const b of body.querySelectorAll('[data-eat]')) {
        b.addEventListener('click', async () => {
          const res = await net.request('eat', { id: b.dataset.eat });
          if (res?.ok) {
            dishes = res.dishes;
            fishingUI.openCreel('cook');
          }
        });
      }
      for (const sel of body.querySelectorAll('[data-gift]')) {
        sel.addEventListener('change', async () => {
          if (!sel.value) return;
          const name = remotes.get(sel.value)?.name ?? '';
          const res = await net.request('giftDish', { id: sel.dataset.gift, to: sel.value });
          if (res?.ok) {
            dishes = res.dishes;
            const d = DISH_BY_ID[sel.dataset.gift];
            hud.toast(t('🎁 把{icon} {dish}送給 {name} 了', { icon: d.icon, dish: t(d.zh), name }), 4000);
          } else hud.toast(t('對方剛好離開了'));
          fishingUI.openCreel('cook');
        });
      }
    },
  });
  actions.onCook = () => fishingUI.openCreel('cook');
  net.on('ate', ({ id, dish }) => {
    const d = DISH_BY_ID[dish];
    if (!d) return;
    bubbles.show(id === net.id ? 'self' : id, `${d.icon}😋`, { emoji: true });
    if (id === net.id) hud.toast(t('😋 好吃！{icon} {name}', { icon: d.icon, name: t(d.zh) }));
  });
  net.on('cooked', ({ id, name, dish }) => {
    const d = DISH_BY_ID[dish];
    if (d && id !== net.id) hud.toast(t('🍲 {name} 煮了一道{icon} {dish}', { name, icon: d.icon, dish: t(d.zh) }), 3500);
  });
  net.on('dishGift', ({ from, dish, dishes: all }) => {
    dishes = all ?? dishes;
    const d = DISH_BY_ID[dish];
    audio.sfx('bell');
    hud.toast(t('🎁 {name} 送你一份{icon} {dish}！到「📖 圖鑑 → 🍲 料理」可以吃', { name: from, icon: d?.icon ?? '', dish: t(d?.zh ?? '') }), 6000);
  });

  // ---------- 🥕 帳篷前的小菜園 ----------
  let gardenPlot = null;
  async function openGarden(plot) {
    gardenPlot = plot;
    const hid = plot.tent.mine ? undefined : plot.tent.hid;
    const res = await net.request('gardenInfo', { hid });
    if (!res?.ok) return hud.toast(t('還沒連上伺服器，等一下再試'));
    renderGarden(res, plot);
  }
  function renderGarden(res, plot) {
    const mine = res.mine;
    const now = Date.now();
    const skew = (res.now ?? now) - now;
    const left = (ms) => {
      const m = Math.max(1, Math.ceil(ms / 60000));
      return m >= 60 ? t('{h} 小時 {m} 分', { h: Math.floor(m / 60), m: m % 60 }) : t('{m} 分鐘', { m });
    };
    const slots = res.slots
      .map((sl, i) => {
        if (!sl) {
          if (!mine) return `<div class="garden-slot empty"><b>${t('空著')}</b></div>`;
          return `<div class="garden-slot empty"><b>${t('第 {n} 格：空著', { n: i + 1 })}</b><div class="crop-pick">${CROPS.map((c) => `<button type="button" class="mini-btn" data-plant="${i}" data-c="${c.id}" ${(pinecones ?? 0) < c.seed ? 'disabled' : ''}>${c.icon} ${t(c.zh)}<small>🌰 ${c.seed}・${t('{h} 小時', { h: c.hours })}</small></button>`).join('')}</div></div>`;
        }
        const c = CROP_BY_ID[sl.c];
        const remain = sl.ready - (Date.now() + skew);
        const water = sl.w ? t('💧 朋友澆了 {n} 次水（收成多 1 個）', { n: sl.w }) : '';
        if (remain <= 0) {
          return `<div class="garden-slot ready"><b>${c.icon} ${t(c.zh)}・${t('可以收成了！')}</b>${water ? `<small>${water}</small>` : ''}${mine ? `<button type="button" class="mini-btn" data-harvest="${i}">${t('🧺 收成')}</button>` : ''}</div>`;
        }
        return `<div class="garden-slot"><b>${c.icon} ${t(c.zh)}・${t('還要 {t}', { t: left(remain) })}</b>${water ? `<small>${water}</small>` : ''}${!mine ? (sl.iw ? `<small>${t('你已經幫忙澆過水了 💧')}</small>` : sl.w >= WATER_MAX ? `<small>${t('今天已經有很多人澆過了')}</small>` : `<button type="button" class="mini-btn" data-water="${i}">${t('💧 幫忙澆水（少等 30 分鐘）')}</button>`) : ''}</div>`;
      })
      .join('');
    const expand =
      mine && res.next
        ? `<div class="garden-slot empty"><b>${t('🌱 還可以再開墾（最多 {max} 格）', { max: res.max })}</b><button type="button" class="mini-btn" id="garden-expand" ${(pinecones ?? 0) < res.next ? 'disabled' : ''}>${t('➕ 開墾第 {n} 格 🌰 {p}', { n: res.slots.length + 1, p: res.next })}</button></div>`
        : '';
    modal.open(
      (mine ? t('🥕 我的小菜園') : t('🥕 {name} 的小菜園', { name: plot.tent.name || t('旅人') })) + ` ${res.slots.length}/${res.max}`,
      `<div class="dex-note">${mine ? t('種子用松果買（越慢長的越貴），種下去等幾小時就能收成，放著不收也不會枯掉。朋友路過可以幫忙澆水，少等 30 分鐘、收成多一個。收成的蔬菜可以拿去營火旁煮料理，或當手作家具的材料。') : t('幫朋友的菜澆水，可以少等 30 分鐘、收成多一個 💧')}</div>${slots}${expand}`,
      (body) => {
        const hid = plot.tent.hid;
        body.querySelector('#garden-expand')?.addEventListener('click', async () => {
          const r = await net.request('gardenExpand');
          if (r?.ok) {
            audio.sfx('bell');
            hud.toast(t('🌱 開墾好了！菜園現在有 {n} 格', { n: r.slots.length }), 4000);
            renderGarden(r, plot);
            refreshCamp();
          } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : t('現在不能開墾'));
        });
        /** 面向菜園的第幾格，播動作 */
        const act = (i, pose, dur) => {
          const at = camp.gardenSlotPos(hid, i);
          const face = at ? Math.atan2(at.x - player.position.x, at.z - player.position.z) : null;
          modal.close();
          return actions.perform(pose, dur, face);
        };
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        for (const b of body.querySelectorAll('[data-plant]')) {
          b.addEventListener('click', async () => {
            const i = Number(b.dataset.plant);
            const c = CROP_BY_ID[b.dataset.c];
            if ((pinecones ?? 0) < c.seed) return hud.toast(t('松果不夠，還差 {n} 顆 🌰', { n: c.seed - (pinecones ?? 0) }));
            if (!act(i, 'plant', 1.6)) return;
            camp.gardenFx(hid, i, 'dirt');
            audio.sfx('tap');
            await wait(1100); // 挖好土再種下去
            const r = await net.request('gardenPlant', { slot: i, c: c.id });
            if (r?.ok) {
              hud.toast(t('🌱 種下{icon} {name}了！大約 {h} 小時後收成', { icon: c.icon, name: t(c.zh), h: c.hours }), 4000);
              refreshCamp();
            } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : t('沒種成，再試一次吧'));
          });
        }
        for (const b of body.querySelectorAll('[data-harvest]')) {
          b.addEventListener('click', async () => {
            const i = Number(b.dataset.harvest);
            if (!act(i, 'pick', 1.25)) return;
            camp.gardenFx(hid, i, 'pull', player.position);
            const r = await net.request('gardenHarvest', { slot: i });
            if (r?.ok) {
              basket = r.basket;
              const c = CROP_BY_ID[r.got.id];
              await wait(500);
              audio.sfx('bell');
              hud.toast(t('🧺 收成了 {icon} {name} ×{n}', { icon: c.icon, name: t(c.zh), n: r.got.n }) + (r.first ? t('（第一次收成 +{g} 🌰）', { g: r.gain }) : ''), 4500);
              await wait(800);
              refreshCamp();
            }
          });
        }
        for (const b of body.querySelectorAll('[data-water]')) {
          b.addEventListener('click', async () => {
            const i = Number(b.dataset.water);
            if (!act(i, 'water', 1.8)) return;
            camp.gardenFx(hid, i, 'water');
            const r = await net.request('gardenWater', { hid, slot: i });
            if (r?.ok) {
              await wait(900);
              audio.sfx('tap');
              hud.toast(t('💧 幫忙澆水了，謝謝你！'));
              refreshCamp();
            } else hud.toast(t('現在不能澆水'));
          });
        }
      },
    );
  }
  actions.onGarden = (plot) => {
    if (!net.online) return hud.toast(t('連上伺服器才能種菜'));
    if (plot.tent.demo) return;
    openGarden(plot);
  };
  net.on('gardenWatered', ({ name, c }) => {
    const crop = CROP_BY_ID[c];
    hud.toast(t('💧 {name} 幫你的{icon} {crop}澆了水，少等 30 分鐘！', { name, icon: crop?.icon ?? '', crop: t(crop?.zh ?? '') }), 5000);
  });

  // ---------- ✨ 營火寶藏（晚上 8～10 點） ----------
  const applyTreasures = (list) => forest.treasures.setList(list ?? []);
  net.on('treasures', ({ list, fresh, by, item, byId }) => {
    applyTreasures(list);
    if (fresh && roomMgr?.current.id === 'forest_main') hud.toast(t('✨ 營火附近好像有什麼東西在閃⋯'), 3500);
    if (by && byId !== net.id) {
      const it = GATHER_BY_ID[item];
      hud.toast(t('✨ {name} 找到了{icon} {item}！', { name: by, icon: it?.icon ?? '', item: t(it?.zh ?? '') }), 3500);
    }
  });
  actions.onTreasure = async (tr) => {
    const face = Math.atan2(tr.x - player.position.x, tr.z - player.position.z);
    if (!actions.perform('pick', 1.25, face)) return;
    const res = await net.request('treasure', { k: tr.k });
    if (!res?.ok) return hud.toast(res?.reason === 'gone' ? t('哎呀，被別人先撿走了') : t('再靠近一點'));
    basket[res.id] = res.count;
    gdex.add(res.id);
    const it = GATHER_BY_ID[res.id];
    audio.sfx('bell');
    hud.toast(t('✨ 找到寶藏：{icon} {name}！+{n} 🌰', { icon: it.icon, name: t(it.zh), n: res.gain }) + (res.first ? t('（圖鑑新收錄）') : ''), 5000);
  };

  // ---------- 🔥 約朋友今晚 9:30 ----------
  const TODAY_KEY = 'cozy-campfire-today';
  const dayStr = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());
  /** 今天的真實小紀錄（分享文案用）：釣到最大的魚、採了幾個、疊了幾顆石頭 */
  const todayLog = (() => {
    try {
      const v = JSON.parse(localStorage.getItem(TODAY_KEY) ?? 'null');
      return v?.day === dayStr() ? v : { day: dayStr() };
    } catch {
      return { day: dayStr() };
    }
  })();
  const logToday = (patch) => {
    if (todayLog.day !== dayStr()) for (const k of Object.keys(todayLog)) delete todayLog[k];
    Object.assign(todayLog, patch, { day: dayStr() });
    try {
      localStorage.setItem(TODAY_KEY, JSON.stringify(todayLog));
    } catch {
      /* 私密模式 */
    }
  };
  function todayLines() {
    const lines = [];
    if (todayLog.fish != null && FISH[todayLog.fish]) lines.push(t('我今天釣到 {size} 公分的{name} 🐟', { size: todayLog.size, name: FISH[todayLog.fish].name }));
    if (myHome?.tent && myHome.items?.length) lines.push(t('帳篷裡擺了 {n} 件家具 ⛺', { n: myHome.items.length }));
    if (todayLog.gather) lines.push(t('在迷霧森林採了 {n} 樣東西 🍄', { n: todayLog.gather }));
    if (todayLog.stones) lines.push(t('疊了 {n} 顆石頭許願 🪨', { n: todayLog.stones }));
    const worn = OUTFIT_SLOTS.map((sl) => look.wear?.[sl.id]).filter(Boolean);
    if (worn.length) lines.push(t('今天穿著{name}', { name: worn.map((id) => t(OUTFIT_BY_ID[id].zh)).join('、') }));
    return lines;
  }
  function openDateInvite() {
    const lines = todayLines();
    const ev = currentEvent();
    const big = ev?.active ? t('營火時間進行中！') : t('今晚 9:30 營火見');
    const real = lines.slice(0, 2).join('・');
    const daily = look.daily && !look.dailyGot ? OUTFIT_BY_ID[look.daily] : null;
    shareCard.open({
      kind: 'invite',
      icon: '🔥',
      big,
      bigSize: 84,
      small: real || t('流星雨、松果加倍，一起圍著營火烤棉花糖'),
      url: inviteUrl(),
      qr: inviteUrl(), // 圖上放 QR Code：只傳圖片的話，朋友掃一下也算透過你的連結
      text: `${ev?.active ? t('營火時間開始了，快來營火旁找我 🔥') : t('今晚 9:30 一起來營火旁坐坐吧 🔥')}${real ? `
${real}` : ''}
${t('點連結會直接出現在我旁邊，免安裝打開就能玩：')}`,
      note: t('按「📤 分享」會順便複製下面的文案和連結：如果 App 只送出圖片，在聊天框貼上就好；朋友掃圖上的 QR Code 也算 📱') + (daily ? '　' + t('分享出去就送今天的每日造型：{name}', { name: outfitName(daily.id) }) : ''),
    });
  }
  hud.onDate = () => giftPanel.open();
  // 湖畔排行按鈕併進上方那一排（不再另外浮一層，免得和上方文字疊在一起）
  hud.el.online.insertBefore(fishingUI.el.tools, hud.el.acctChip);
  // 📖 圖鑑收錄新魚
  net.on('dex', ({ fish, gain, bonus, count, total, dex }) => {
    fishingUI.mergeDex(dex);
    const f = FISH[fish];
    setTimeout(() => {
      hud.toast(t('📖 圖鑑新收錄：{name}！+{n} 🌰（{c}／{t}）', { name: f?.name ?? '', n: gain, c: count, t: total }), 5000);
      if (bonus) setTimeout(() => hud.toast(t('🏆 魚類圖鑑全部收集完成！再送你 {n} 顆松果', { n: bonus }), 6000), 2500);
      audio.sfx('bell');
    }, 2600); // 等釣到魚的卡片先秀完
  });
  net.on('ornament', ({ item, by }) => {
    forest.wishTree.add(item);
    treePanel.refresh();
    if (by !== net.id && roomMgr?.current.id === 'forest_main') {
      const o = ORNAMENT_BY_ID[item.o];
      if (o) hud.toast(t('🌳 {name} 在心願大樹掛了一個{o}', { name: item.n, o: o.name }));
    }
  });

  // ---------- 石塔祈願 ----------
  /** 全部石塔的石頭：[[{ n, s, at }]]（連線時由伺服器提供，單人模式存在這裡） */
  let cairnData = forest.cairnGarden.cairns.map(() => []);
  let cairnLog = null; // 疊滿時間與紀念冊
  const cairnPanel = new CairnPanel({ getCairns: () => cairnData, getName: () => myName, getLog: () => cairnLog });
  const applyCairnLog = (log) => {
    cairnLog = log;
    forest.cairnGarden.setDone(log?.done?.map((d) => !!d));
    cairnPanel.refresh();
  };
  const applyCairns = (list) => {
    cairnData = forest.cairnGarden.cairns.map((_, i) => (list?.[i] ?? []).slice());
    forest.cairnGarden.setAll(cairnData);
    cairnPanel.refresh();
  };
  const addStone = (i, stone) => {
    if (!cairnData[i] || cairnData[i].length >= CAIRN_MAX) return;
    cairnData[i].push(stone);
    forest.cairnGarden.add(i, stone);
    cairnPanel.refresh(i);
    if (roomMgr?.current.id === 'forest_main') audio.sfx('stone');
  };
  actions.onPickStone = (carrying) => {
    audio.sfx('tap');
    hud.toast(carrying ? t('撿起一顆石頭，頂在頭上 🪨 走到石塔旁放上去吧') : t('把石頭放回去了'));
  };
  ritual = new RitualGuide({
    scene,
    hud,
    touch: !!mobile,
    canPick: (id) => id !== 'hang' || (pinecones ?? 0) >= 3,
    onShare: ({ icon, name, n }) =>
      shareCard.open({
        icon,
        big: t('完成「{name}」', { name }),
        small: n ? t('我是今天第 {n} 位完成的旅人', { n }) : t('沒力氣出門的夜晚，也想好好照顧自己'),
        text: n
          ? t('我是今天第 {n} 位在迷霧森林露營地完成「{name}」的旅人 {icon} 沒力氣出門的夜晚，一起來營火旁坐一下吧', { n, name, icon })
          : undefined,
      }),
    // 完成小任務：問伺服器「今天第幾位完成」（單人模式沒有數字）
    onDone: async (id) => (net.online ? ((await net.quest(id))?.n ?? null) : null),
    // 第一次來的人做完第一個任務，才跳出歡迎卡（一進來先讓人直接玩，不用先讀一大段字）
    onComplete: (_task, firstTime) => {
      if (firstTime) setTimeout(() => !welcome.visible && welcome.maybeShow(), 6000);
    },
  });
  const garden = forest.cairnGarden;
  const ritualState = {
    get inForest() {
      return roomMgr?.current.id === 'forest_main';
    },
    get carrying() {
      return forest.carrying;
    },
    get pos() {
      return player.position;
    },
    get nearCairn() {
      return garden.nearCairn(player.position);
    },
    get nearestCairn() {
      return garden.nearestCairn(player.position);
    },
    camera,
    get roomId() {
      return roomMgr?.current.id;
    },
    get outdoor() {
      return !!roomMgr?.current.outdoor;
    },
    get state() {
      return actions.state;
    },
    fire: { x: 0, z: 0 },
    shrine: forest.shrineFront,
    board: forest.boardFront,
    lakeGate: forest.entrances.find((e) => e.to === 'lake_dock'),
    tree: forest.wishTree.pos,
    dockEnd: rooms.lake_dock.dockEnd,
    pile: garden.pile,
    cairnTop: (i) => ({ x: garden.cairns[i].spot.x, y: 0, z: garden.cairns[i].spot.z }),
  };
  actions.onStack = async (i) => {
    if (cairnData[i].length >= CAIRN_MAX) {
      hud.toast(t('這座石塔已經疊滿了，換旁邊那座吧 🗿'));
      return;
    }
    actions.emote('pray'); // 放上去之後雙手合十許個願
    if (net.online) {
      const res = await net.stack(i);
      if (res?.ok) {
        hud.toast(t('🪨 疊上去了！第 {n} 顆，許個願吧 🙏', { n: res.count }), 3500);
        ritual.event('stone', res.ritual);
      }
      else if (res?.reason === 'tooFast') hud.toast(t('慢慢來，一顆一顆疊 🪨'));
      else if (res?.reason === 'full') hud.toast(t('這座石塔已經疊滿了，換旁邊那座吧 🗿'));
      else hud.toast(t('石頭沒放穩，再試一次吧'));
    } else {
      addStone(i, { n: myName, s: Math.floor(Math.random() * 100000), at: Date.now() });
      hud.toast(t('🪨 疊上去了！第 {n} 顆，許個願吧 🙏', { n: cairnData[i].length }), 3500);
      ritual.event('stone', null);
    }
  };
  actions.onCairn = (i) => cairnPanel.open(i);
  net.on('cairnReset', ({ i, log }) => {
    cairnData[i] = [];
    forest.cairnGarden.setAll(cairnData);
    applyCairnLog(log);
    if (roomMgr?.current.id === 'forest_main') hud.toast(t('📜 第 {n} 座石塔收進了紀念冊，新的石塔開始囉 🪨', { n: i + 1 }), 4500);
  });
  net.on('stone', ({ i, stone, count, by, today, done }) => {
    addStone(i, stone);
    if (done && cairnLog) {
      cairnLog.done[i] = done;
      applyCairnLog(cairnLog);
      hud.toast(t('✨ 第 {n} 座石塔疊滿 99 顆，完成了！謝謝每一位許願的旅人', { n: i + 1 }), 5000);
    }
    if (today) hud.setToday(today);
    // 其他人疊到整數的時候，大家一起慶祝一下
    if (by !== net.id && (count % 25 === 0 || count === CAIRN_MAX)) {
      hud.toast(t('🗿 第 {n} 座石塔疊到 {count} 顆了！', { n: i + 1, count }), 4000);
    }
  });

  // ---------- 分流 ----------
  const channelPanel = new ChannelPanel({
    onSwitch: async (ch) => {
      const res = await net.switchChannel(ch);
      if (res?.ok) {
        applySnapshot(res);
        hud.toast(t('🏕️ 來到了分流 {n}', { n: res.ch }));
        return true;
      }
      if (res?.reason === 'chFull') hud.toast(t('分流 {n} 客滿了，換一個吧', { n: ch }), 3500);
      else if (res?.reason === 'full') hud.toast(fullMsg(), 3500);
      else hud.toast(t('換分流失敗，請稍後再試'));
      return false;
    },
  });
  hud.onChannelClick = () => (channelPanel.isOpen ? channelPanel.close() : channelPanel.open(net.ch));
  net.on('channelFull', ({ ch }) => hud.toast(t('分流 {n} 剛好客滿，幫你換到別的分流', { n: ch }), 4000));
  /** 套用伺服器給的房間資料（加入、換分流時） */
  function applySnapshot(res) {
    remotes.reset(res.players);
    for (const p of res.players) names.set(p.id, p.name);
    campfire.fuel = res.fuel;
    if (res.room === 'treehouse_music') audio.setSong(res.song);
    if (res.board) fishingUI.setBoard(res.board, true);
    if (res.wishes) applyWishes(res.wishes);
    if (res.notes) applyNotes(res.notes);
    if (res.cairns) applyCairns(res.cairns);
    if (res.cairnLog) applyCairnLog(res.cairnLog);
    if (res.today) hud.setToday(res.today);
    if (res.lakeNews) lakeNews.setAll(res.lakeNews);
    if (res.event) applyEvent(res.event);
    if (res.mini) applyMini(res.mini);
    if (res.areas) forest.setAreas(res.areas);
    if (res.museum) setMuseum(res.museum);
    if (res.treasures) applyTreasures(res.treasures);
    if (res.tree) {
      forest.wishTree.setAll(res.tree);
      treePanel.refresh();
    }
    refreshOnline();
  }
  const localWishes = [];
  const applyWishes = (list) => {
    forest.shrine.setWishes(list);
    shrinePanel.setWishes(list);
  };

  net.on('status', (st) => {
    if (st !== 'online') hud.setInviteVisible(false);
    refreshAcctChip();
    refreshOnline();
    // 斷線時記下目前位置，重連時從這裡回來
    if (st !== 'online') net.updateJoinData({ x: player.position.x, z: player.position.z, ry: player.rotationY });
  });
  net.on('joined', (res) => {
    // 邀請連結只用一次（之後斷線重連不要又跑去朋友旁邊）
    if (params.has('with')) {
      net.updateJoinData({ with: undefined });
      params.delete('with');
      history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
    }
    hud.setInviteVisible(true);
    myCode = res.code ?? null;
    // 伺服器更新過、自己的畫面還是舊版：提醒重新整理
    const mine = document.querySelector('script[src*="assets/index-"]')?.getAttribute('src')?.match(/index-([\w-]+)\.js/)?.[1];
    if (res.ver && mine && res.ver !== mine && !document.getElementById('new-ver')) {
      document.getElementById('ui').insertAdjacentHTML('beforeend', `<button type="button" class="new-ver" id="new-ver">${t('🔥 營地有新東西了，點這裡重新整理')}</button>`);
      document.getElementById('new-ver').addEventListener('click', () => location.reload());
    }
    if (res.myHome) setMyHome(res.myHome);
    // 歡迎卡：老朋友一進來就打招呼；第一次來的人先直接玩小任務，完成後（或待滿 90 秒）才出現
    if (!ritual?.newbie) setTimeout(() => welcome.maybeShow(), 1200);
    else setTimeout(() => !welcome.visible && welcome.maybeShow(), 90000);
    // 伺服器判斷是不是贊助者：是的話頭上開一朵小花
    if (res.reward && res.reward !== myReward) {
      hud.toast(res.reward === 2 ? t('🍀 謝謝你的支持！頭上長出了一片四葉草') : t('🌼 謝謝你的支持！頭上開了一朵小黃花'), 5000);
    }
    myReward = res.reward || 0;
    // 松果：每天第一次來會送松果（連續越多天越多）
    if (res.wallet) {
      const w = res.wallet;
      // 👤 自己取過的名字和外型：伺服器記得，換裝置登入也會跟著回來
      if (profile.custom || profile.customLook) {
        net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0 });
      } else if (!w.look?.name && accountName()) {
        // 有帳號但還沒存過名字：就算沒按過 ✏️，也把現在的名字固定下來
        profile = { ...profile, custom: true, customLook: true };
        saveProfile(profile);
        net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0 });
      } else if (w.look?.name) {
        profile = { ...profile, ...w.look, custom: true, customLook: true };
        saveProfile(profile);
        myName = profile.name;
        applyLook(profile);
        hud.setMe(myName);
        net.rejoin({ name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
      }
      if (w.outfit) setLook(w.outfit); // 👒 造型：擁有的、穿著的、今天和這週的
      basket = w.basket ?? basket;
      gdex = new Set(w.gdex ?? []);
      dishes = w.dishes ?? {};
      cooked = new Set(w.cooked ?? []);
      setNet(w.net);
      refreshGather();
      fishingUI.mergeDex(w.dex);
      // 以前存在這個瀏覽器裡的魚簍，也一起存進帳號（換手機登入就看得到）
      const local = Object.fromEntries(Object.entries(fishingUI.creel).filter(([, e]) => e?.count).map(([i, e]) => [i, e.best || 1]));
      if (Object.keys(local).length) net.request('dexSync', { dex: local }).then((r) => r?.dex && fishingUI.mergeDex(r.dex));
      setCoins(w.pc, w.daily?.gain ?? 0);
      if (w.daily) {
        hud.toast(
          w.daily.streak > 1
            ? t('🔥 連續第 {d} 天來營火旁，送你 {n} 顆松果 🌰', { d: w.daily.streak, n: w.daily.gain })
            : t('🌰 歡迎來到營火旁，送你 {n} 顆松果，可以去心願大樹換裝飾', { n: w.daily.gain }),
          5000,
        );
      }
    }
    player.character.setAccessory?.(myReward);
    applySnapshot(res);
  });
  net.on('playerJoined', (info) => {
    remotes.add(info);
    names.set(info.id, info.name);
    // 營地居民走來走去不用提示
    if (!info.npc) hud.toast(t('{name} 來到了{place} 🦊', { name: info.name, place: t(placeName()) }));
    refreshOnline();
  });
  /** 去了哪一區（離開提示用） */
  const AREA_NAME = {
    forest_main: '中央大營火',
    tent_focus: '專注帳篷',
    treehouse_music: '森林樹屋',
    lake_dock: '湖畔碼頭',
    tent_social: '交流帳篷',
    campground: '帳篷營地',
    home: '帳篷裡',
    mist_forest: '迷霧森林',
  };
  net.on('playerLeft', ({ id, to }) => {
    const wasNpc = remotes.isNpc(id);
    const name = names.get(id) ?? t('有人');
    if (remotes.remove(id) && !wasNpc) {
      if (to === 'channel') hud.toast(t('{name} 換到別的分流了 👋', { name }));
      else if (to && AREA_NAME[to]) hud.toast(t('{name} 去了{place} 👣', { name, place: t(AREA_NAME[to]) }));
      else hud.toast(t('{name} 離開了 🌙', { name }));
    }
    names.delete(id);
    refreshOnline();
  });
  net.on('states', (batch) => remotes.applyStates(batch, net.id));
  net.on('fire', ({ fuel, by, name, npc }) => {
    if (by === net.id) {
      campfire.fuel = fuel; // 自己丟的：特效已經播過，只校正數值
    } else {
      campfire.addFuel(0); // 播放火星特效與劈啪聲
      campfire.fuel = fuel;
      if (roomMgr?.current === forest && !npc) hud.toast(t('{name} 添了一根柴 🔥', { name }));
    }
  });
  net.on('fireSync', ({ fuel }) => {
    campfire.fuel += (fuel - campfire.fuel) * 0.5; // 輕微校正，避免火勢跳動
  });
  net.on('song', ({ song, name }) => {
    if (roomMgr?.current.id !== 'treehouse_music') return;
    audio.setSong(song);
    hud.toast(song < 0 ? t('🔇 {name} 把音樂停了', { name }) : t('🎵 {name} 點播了「{song}」', { name, song: SONGS[song]?.name ?? '' }));
  });
  // 伺服器的拒絕原因用代碼判斷，再顯示成目前語言
  const fullMsg = () => t('這裡人數已滿，請稍後再來');
  net.on('rejected', (res) => res?.reason === 'full' && hud.toast(fullMsg(), 4000));
  net.on('caught', ({ id, name, fish, size, rank }) => {
    const f = FISH[fish];
    if (id === net.id) {
      // 自己的：伺服器回報排名後，卡片補上「湖畔排行第 N 名」
      if (rank && lastCatch) fishingUI.showCard(lastCatch.index, lastCatch.size, { ...lastCatch.rec, rank });
      return;
    }
    if (!f) return;
    if (f.junk) hud.toast(t('{name} 撈到了{fish}，順手帶走了 ♻️', { name, fish: f.name }));
    else if (f.rarity >= 4) hud.toast(t('🎉 哇！{name} 釣到了 {size} 公分的{fish}！', { name, size, fish: f.name }), 4500);
    else hud.toast(t('🎣 {name} 釣到了 {size} 公分的{fish}', { name, size, fish: f.name }));
  });
  net.on('board', ({ board }) => fishingUI.setBoard(board, true));
  // 📣 五星魚、傳說之魚：全伺服器大公告
  net.on('bigCatch', ({ name, fish, size, place }) => {
    const f = FISH[fish];
    if (!f) return;
    const where = place === 'lake_dock' ? t('湖畔碼頭') : t('營火河畔');
    const el = document.createElement('div');
    el.className = 'big-catch' + (f.legend ? ' legend' : '');
    el.innerHTML = `<b>${f.legend ? t('🐉 傳說之魚現身！') : t('📣 五星大魚！')}</b><span></span>`;
    el.querySelector('span').textContent = t('{name} 在{where}釣到了 {size} 公分的{fish}', { name, where, size, fish: f.name });
    document.getElementById('ui').appendChild(el);
    setTimeout(() => el.classList.add('out'), f.legend ? 8000 : 5500);
    setTimeout(() => el.remove(), f.legend ? 9000 : 6500);
  });

  // 湖畔即時動態：在營火旁也看得到湖邊誰釣到什麼
  const lakeNews = new LakeNews({
    hud,
    compact: !!mobile,
    onGo: () => roomMgr?.switchTo('lake_dock', switchOnServer),
  });
  net.on('lakeNews', (item) => lakeNews.push(item));
  net.on('chat', ({ id, name, text }) => {
    if (id === net.id) return;
    bubbles.show(id, text);
    const line = social.addLog(name, text);
    // 別國語言：自動翻成自己的語言（聊天紀錄下面多一行，頭上的泡泡換成翻譯）
    translateChat(text).then((tr) => {
      if (!tr) return;
      social.addTranslation(line, tr);
      bubbles.show(id, `🌐 ${tr}`);
    });
  });
  // 聊天框的 🌐：開關自動翻譯
  {
    const btn = document.getElementById('chat-tr-toggle');
    const paint = () => btn?.classList.toggle('off', !translateEnabled());
    paint();
    btn?.addEventListener('click', () => {
      setTranslateEnabled(!translateEnabled());
      paint();
      hud.toast(translateEnabled() ? t('🌐 自動翻譯：開（別國語言的聊天會翻成你的語言）') : t('🌐 自動翻譯：關'));
      document.getElementById('chat-text')?.focus();
    });
  }
  net.on('emoji', ({ id, e }) => id !== net.id && bubbles.show(id, e, { emoji: true }));
  net.on('notes', ({ notes, by, name }) => {
    applyNotes(notes);
    if (by !== net.id) hud.toast(t('📌 {name} 在告示牌貼了一張留言', { name }));
  });
  net.on('wishes', ({ wishes, by, name }) => {
    applyWishes(wishes);
    if (by !== net.id) hud.toast(t('📝 {name} 在祈福處掛了一塊繪馬', { name }));
  });

  // ---------- 房間管理 ----------
  roomMgr = new RoomManager({
    scene,
    rooms,
    start: rooms[params.get('room')] ? params.get('room') : 'forest_main',
    player,
    cameraRig,
    actions,
    input,
    hud,
    audio,
    onEnter: (room) => {
      remotes.reset([]); // 先清掉上一個房間的人，伺服器回應後再補上
      if (room.id !== 'forest_main') forest.dropStone(player.character);
      cairnPanel.close();
      lakeNews.setRoom(room.id);
      treePanel.close();
      pomodoro.show(!!room.focusMode);
      mobile?.setRoom(room.id);
      fishingUI.showTools(room.id === 'lake_dock');
      social.setChatEnabled(!room.focusMode);
      shrinePanel.close();
      mixer.setNote(room.focusMode ? t('專注帳篷：聲音預設關閉。需要的話可以按「取消靜音」或拉動滑桿。') : null);
      for (const id of Object.keys(rooms)) document.body.classList.toggle(`room-${id}`, id === room.id);
      refreshOnline();
    },
  });
  roomMgr.onSwitched = (room, res) => {
    // 想進別人的帳篷但沒成功（剛好關了、客滿）：回到營地
    if (room.id === 'home' && res && !res.ok) {
      hud.toast(res.reason === 'closed' ? t('🔒 這頂帳篷剛好休息中') : res.reason === 'full' ? t('帳篷裡人太多了，等一下再來') : t('進不去，等一下再試'));
      setTimeout(() => roomMgr.switchTo(homeRoom.exitTo, switchOnServer), 400);
      return;
    }
    // 帳篷營地：拿大家的帳篷清單
    if (room.id === 'campground') refreshCamp();
    // 迷霧森林、湖邊：拿自己的採集點狀態
    if (room.gather) refreshGather();
    // 進到帳篷：換上主人的擺設
    guestPanel.set(room.id === 'home' ? (res?.home ?? myHome) : null, { mine: res ? !!res.mine : true, liked: !!res?.liked });
    if (room.id === 'home') {
      homeRoom.setHome(res?.home ?? myHome, res ? !!res.mine : true);
      if (player.position.z > homeRoom.doorZ - 0.95) player.position.z = homeRoom.doorZ - 1.15;
      buildPanel.showTools(homeRoom.mine, (res?.home ?? myHome)?.open !== false);
    } else {
      buildPanel.showTools(false);
      stopBuild();
    }
    document.body.classList.toggle('in-home', room.id === 'home');
    hud.setFireVisible(room.id !== 'forest_main');
    refreshHomeChip();
    if (res?.ok) {
      remotes.reset(res.players);
      for (const p of res.players) names.set(p.id, p.name);
      campfire.fuel = res.fuel;
      if (room.id === 'treehouse_music') audio.setSong(res.song);
      if (res.board) fishingUI.setBoard(res.board, true);
      if (res.wishes) applyWishes(res.wishes);
      if (res.notes) applyNotes(res.notes);
      if (res.cairns) applyCairns(res.cairns);
      if (res.lakeNews) lakeNews.setAll(res.lakeNews);
      if (res.tree) forest.wishTree.setAll(res.tree);
      if (res.museum) setMuseum(res.museum);
      if (res.treasures) applyTreasures(res.treasures);
    } else if (res && !res.ok && res.reason === 'full') {
      hud.toast(fullMsg(), 4000);
    }
    refreshOnline();
  };
  const welcome = new WelcomeCard({
    onSound: () => audio.start(),
    onFocus: () => {
      audio.start();
      if (roomMgr?.current.id !== 'tent_focus') roomMgr.switchTo('tent_focus', switchOnServer);
    },
  });
  // ---------- 帳篷營地、拜訪別人的帳篷 ----------
  const camp = rooms.campground;
  /** 試玩版沒有其他玩家：放幾頂標明「示範」的帳篷，看看營地排起來的樣子 */
  const DEMO_TENTS = [
    ['circus', 'stripe'],
    ['mushroom', 'redspot'],
    ['yurt', 'classic'],
    ['dome', 'night'],
    ['aframe', 'forest'],
    ['bell', 'sakura'],
  ].map(([shape, style], i) => ({ hid: `demo${i}`, demo: true, name: t('示範帳篷'), shape, style, open: true, likes: 0, n: 0 }));
  async function refreshCamp() {
    if (roomMgr?.current.id !== 'campground') return;
    if (!net.online) {
      const mine = myHome?.tent ? [{ hid: 'me', mine: true, shape: myHome.shape, style: myHome.style, open: myHome.open !== false, likes: 0, n: 0 }] : [];
      return camp.setTents([...mine, ...(demo ? DEMO_TENTS : [])]);
    }
    const res = await net.request('campList');
    if (res?.ok && roomMgr.current.id === 'campground') camp.setTents(res.tents);
  }
  setInterval(refreshCamp, 20000);
  actions.onVisit = (plot) => {
    const tent = plot.tent;
    if (!tent) return shopHint();
    camp.setReturnFrom(plot);
    if (tent.mine) return goHome();
    if (tent.demo) return hud.toast(t('這是試玩版的示範帳篷，正式網站上就能進別人的帳篷逛逛'));
    if (!tent.open) return hud.toast(t('🔒 這頂帳篷休息中'));
    homeRoom.setExit('campground');
    roomMgr.switchTo('home', () => net.switchRoom('home', { hid: tent.hid, x: 0, z: homeRoom.spawn.z, ry: Math.PI }));
  };
  const shopHint = () => hud.toast(t('到營火旁的「🏪 營地小舖」買一頂帳篷，就會出現在營地裡 ⛺'), 4000);
  /** 離開帳篷：回到進來的地方（營地或營火旁） */
  const leaveHome = () => {
    if (!inHome()) return;
    stopBuild();
    roomMgr.switchTo(homeRoom.exitTo, switchOnServer);
  };
  const guestPanel = new GuestPanel({
    onLeave: () => leaveHome(),
    onLike: async () => {
      const res = await net.request('homeLike');
      if (res?.ok) {
        audio.sfx('bell');
        if (res.liked) hud.toast(t('❤️ 幫這頂帳篷按了讚'));
        return res;
      }
      return null;
    },
    onNote: async (text) => {
      const res = await net.request('homeNote', { text });
      if (res?.ok) {
        audio.sfx('tap');
        return null;
      }
      if (!res) return t('還沒連上伺服器，等一下再試');
      return res.reason === 'tooFast' ? t('慢慢來，15 秒後再留言 🙂') : t('沒留成，再試一次吧');
    },
  });

  const switchOnServer = (id) =>
    net.switchRoom(id, { x: player.position.x, z: player.position.z, ry: player.rotationY });

  // ---------- Resize ----------
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    campfire.setPixelScale(h * renderer.getPixelRatio(), camera.fov);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /** 要送給伺服器的狀態 */
  function netState(actionState) {
    return {
      ...player.getNetworkState(),
      actionState: actionState ?? ((actions.state === 'fish' && fishing.netAction) || player.actionState), // 拉竿、舉魚
      doneness: actions.state === 'roast' ? actions.doneness : 0,
      // 舉起來的魚（魚種＋公分）：釣魚中舉著、或舉著到處走；不然就是頭上頂著石頭
      extra: fishing.netExtra || (trophy ? packFish(trophy.index, trophy.size) : 0) || (forest.carrying ? STONE_FLAG : 0),
    };
  }

  // ---------- 營地小舖、我的帳篷、布置 ----------
  /** 我的帳篷資料 { tent, inv, items, open }（連上伺服器後才有） */
  let myHome = null;
  /** 試玩版（VITE_DEMO=1 建置，沒有伺服器）：小舖和帳篷在瀏覽器裡模擬 */
  const demo = import.meta.env.VITE_DEMO === '1' ? createDemoHome() : null;
  const homeReq = (ev, data) => (!net.online && demo ? Promise.resolve(demo.request(ev, data)) : net.request(ev, data));
  const homeRoom = rooms.home;
  const inHome = () => roomMgr?.current.id === 'home';
  const refreshHomeChip = () => hud.setHomeVisible(!!myHome?.tent && (net.online || !!demo) && !inHome());
  const setMyHome = (h) => {
    myHome = h;
    refreshAcctChip();
    shopPanel.refresh();
    refreshHomeChip();
    if (inHome() && homeRoom.mine) {
      homeRoom.setHome(h, true);
      if (buildPanel.active) cameraRig.target.distance = buildDistance();
      // 換了造型，門口位置可能變了：站太靠門就往裡面挪，免得被送回營火
      if (player.position.z > homeRoom.doorZ - 0.95) player.position.z = homeRoom.doorZ - 1.15;
      buildPanel.render();
      if (!buildPanel.active) buildPanel.showTools(true, h.open);
    }
  };
  const goHome = () => {
    if (!myHome?.tent) return hud.toast(t('還沒有帳篷，先到「🏪 營地小舖」買一頂吧 ⛺'));
    shopPanel.close();
    // 從哪裡回家都一樣：出門時站在帳篷營地裡自己帳篷的門口
    camp.setReturnToMine(myHome.shape);
    homeRoom.setExit('campground');
    roomMgr.switchTo('home', () => net.switchRoom('home', { x: 0, z: homeRoom.spawn.z, ry: Math.PI }));
  };
  hud.onHome = goHome;
  /** 一鍵回到中央營火（在哪裡都可以） */
  hud.onFire = () => {
    if (roomMgr.current.id === 'forest_main') return;
    shopPanel.close();
    stopBuild();
    roomMgr.switchTo('forest_main', switchOnServer);
  };

  /** 在小舖買東西（布置面板的「擴建」也走這裡） */
  const buyItem = async (id) => {
    const res = await homeReq('buy', { id });
    if (res?.ok) {
      if (!net.online) setCoins(res.pc, res.delta ?? 0);
      setMyHome(res.home);
      audio.sfx('bell');
      if (id === 'tent') {
        hud.toast(t('⛺ 你有自己的帳篷了！按「🏠 回家」進去看看'), 5000);
        if (net.online && !hasAccount()) setTimeout(showSaveNudge, 1200);
      }
      else if (id.startsWith('shape_')) {
        const sh = TENT_SHAPE_BY_ID[id.slice(6)];
        hud.toast(t('{icon} 解鎖了「{name}」，你的帳篷已經換上新造型！', { icon: sh?.icon ?? '', name: sh?.name ?? '' }), 4500);
      }
      else if (id === 'expand') {
        const g = res.home?.grid ?? 0;
        hud.toast(t('📐 帳篷擴建成 {n}×{n} 了！多了 {m} 格可以擺', { n: g, m: g * g - (g - 1) * (g - 1) }), 4500);
      }
      else hud.toast(t('{icon} 買了{name}，回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }));
      return true;
    }
    const why = { poor: t('松果不夠喔 🌰'), owned: t('你已經有帳篷了'), noTent: t('先買帳篷，才能放家具 ⛺'), tooMany: t('這個已經買很多了'), tooFast: t('慢慢來 🙂'), maxed: t('已經是最大的帳篷了 🎉') };
    hud.toast(why[res?.reason] ?? t('沒買成，再試一次吧'));
    return false;
  };
  const shopPanel = new ShopPanel({
    getCoins: () => (net.online || demo ? pinecones : null),
    getHome: () => myHome,
    onGoHome: goHome,
    onGift: () => giftPanel.open(),
    onEdit: async (op, data) => {
      const res = await homeReq('homeEdit', { op, ...data });
      if (res?.ok) setMyHome({ ...res.home });
      else if (res) hud.toast(t('沒換成，再試一次吧'));
    },
    onBuy: (id) => buyItem(id),
  });
  actions.onShop = () => shopPanel.open();

  const buildPanel = new BuildPanel({
    getHome: () => homeRoom.home,
    onEdit: async (op, data) => {
      const res = await homeReq('homeEdit', { op, ...data });
      if (res?.ok) {
        setMyHome({ ...res.home });
        audio.sfx(op === 'remove' ? 'tap' : 'stone');
        if (op === 'move') homeRoom.select({ x: data.tx, z: data.tz });
        return true;
      }
      if (res?.reason === 'taken') hud.toast(t('這格已經有東西了'));
      else if (res?.reason === 'noStack') hud.toast(op === 'move' ? t('那一格放不上去，換一格試試') : t('這件不能疊在上面喔'));
      else if (res?.reason === 'stackFull') hud.toast(t('這一格已經疊滿了'));
      else if (res?.reason === 'tooMany') hud.toast(t('帳篷放滿了，收起一些再擺吧'));
      else if (res) hud.toast(t('沒放成，再試一次吧'));
      return false;
    },
    onExit: () => stopBuild(),
    onExpand: () => buyItem('expand'),
    onToggleOpen: async () => {
      const res = await homeReq('homeOpen', { open: !(myHome?.open !== false) });
      if (res?.ok) {
        myHome.open = res.open;
        buildPanel.showTools(true, res.open);
        hud.toast(res.open ? t('🚪 開放參觀：其他旅人可以來你的帳篷逛逛') : t('🔒 休息中：暫時不開放參觀'));
      }
    },
  });
  let buildCam = null;
  // 布置時的鏡頭距離：帳篷擴建得越大，拉得越遠
  // 手機直放畫面窄，左右會切到，再拉遠一點才看得到整個帳篷
  const buildDistance = () => Math.min(13.5, 8.5 * homeRoom.scale ** 0.9 * (camera.aspect < 0.8 ? 1.35 : 1));
  const startBuild = () => {
    if (!inHome() || !homeRoom.mine) return;
    homeRoom.setBuild(true);
    buildPanel.start();
    document.body.classList.add('building');
    // 布置時鏡頭拉高往下看，整個帳篷一目了然
    buildCam = { pitch: cameraRig.target.pitch, distance: cameraRig.target.distance };
    cameraRig.target.pitch = 1.05;
    cameraRig.target.distance = buildDistance();
  };
  const stopBuild = () => {
    document.body.classList.remove('building');
    if (buildCam) {
      cameraRig.target.pitch = buildCam.pitch;
      cameraRig.target.distance = buildCam.distance;
      buildCam = null;
    }
    homeRoom.setBuild(false);
    homeRoom.select(null);
    buildPanel.stop();
    if (inHome() && homeRoom.mine) buildPanel.showTools(true, myHome?.open !== false);
  };
  buildPanel.onEnter = startBuild;
  buildPanel.onLeave = () => leaveHome();
  actions.onBuild = () => (buildPanel.active ? stopBuild() : startBuild());
  // 布置模式：點地板選格子（拖曳轉鏡頭不算）
  {
    let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down || !buildPanel.active || !inHome()) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return;
      const cell = homeRoom.cellAtScreen(e.clientX, e.clientY, camera, renderer.domElement);
      if (!cell) return;
      // ✋ 搬家模式：點的這格就是要搬去的地方
      if (buildPanel.moving) return void buildPanel.moveTo(cell);
      homeRoom.select(cell);
      buildPanel.select(cell);
    });
  }
  // 試玩版：模擬整點小活動（?mini=fish / stone / wood / race / hunt）
  const demoMini = demo && ['fish', 'stone', 'wood', 'race', 'hunt'].includes(params.get('mini')) ? params.get('mini') : null;
  if (demoMini) {
    const spots = [...HUNT_SPOTS].sort(() => Math.random() - 0.5).slice(0, HUNT_COUNT).map((p) => ({ ...p, by: null }));
    let race = { next: 0, t0: 0 };
    let best = null;
    localMini = (ev, data) => {
      const pos = player.position;
      if (ev === 'race') {
        const i = data.i;
        if (i === 0) race = { next: 1, t0: performance.now() };
        else if (i !== race.next) return { ok: false, reason: 'order', next: race.next };
        if (i === 0) return { ok: true, next: 1 };
        if (i < RACE_LANTERNS.length - 1) return { ok: true, next: (race.next = i + 1) };
        const time = Math.round((performance.now() - race.t0) / 100) / 10;
        race = { next: 0, t0: 0 };
        const isBest = best == null || time < best;
        if (isBest) best = time;
        miniState.top = [{ name: myName, time: best }];
        hud.setMini(currentMini());
        return { ok: true, next: 0, time, best: isBest, rank: 1 };
      }
      if (ev === 'grab') {
        const sp = spots[data.i];
        if (!sp || sp.by || Math.hypot(pos.x - sp.x, pos.z - sp.z) > 3) return { ok: false };
        sp.by = myName;
        return { ok: true, left: spots.filter((p) => !p.by).length };
      }
      return null;
    };
    setTimeout(() => applyMini({ kind: demoMini, active: true, endsIn: 600, spots, top: [] }, true), 3500);
  }
  if (demo) {
    setTimeout(() => welcome.maybeShow(), 2500); // 試玩版沒有伺服器，也打個招呼
    setCoins(demo.pc);
    setMyHome(demo.home);
    document.getElementById('ui').insertAdjacentHTML('beforeend', `<div class="demo-badge">${t('🧪 試玩版：松果和帳篷只存在這台裝置')}</div>`);
  }
  net.on('homeUpdate', ({ home }) => {
    if (inHome()) {
      homeRoom.setHome(home, homeRoom.mine);
      guestPanel.update(home);
    }
    if (homeRoom.mine) myHome = home;
    buildPanel.render();
  });

  // 買了帳篷還沒建帳號：提醒一次（換手機、清掉瀏覽器資料就找不回來）
  const nudgeEl = document.createElement('div');
  nudgeEl.className = 'welcome save-nudge';
  nudgeEl.hidden = true;
  nudgeEl.innerHTML = `
    <div class="welcome-title">${t('⛺ 這是你的帳篷了！')}</div>
    <p>${t('建議建立帳號：之後換手機、換瀏覽器或清掉資料，用帳號密碼登入就能找回帳篷和松果。')}</p>
    <div class="welcome-btns">
      <button type="button" data-n="go">${t('👤 建立帳號')}</button>
      <button type="button" data-n="later" class="ghost">${t('之後再說')}</button>
    </div>`;
  document.getElementById('ui').appendChild(nudgeEl);
  nudgeEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  nudgeEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    nudgeEl.hidden = true;
    if (b.dataset.n === 'go') hud.onMeClick({ focusAccount: true });
    else hud.toast(t('之後想存檔，按上方的「👤 存檔」就可以'), 4000);
  });
  function showSaveNudge() {
    shopPanel.close();
    nudgeEl.hidden = false;
  }

  // ---------- 帳號（選填）：註冊、登入、登出 ----------
  const ACCOUNT_KEY = 'cozy-campfire-account';
  const accountName = () => {
    try {
      return localStorage.getItem(ACCOUNT_KEY);
    } catch {
      return null;
    }
  };
  const accountErr = {
    badName: t('帳號要 3～16 個字（中英文、數字、底線）'),
    badPass: t('密碼至少要 6 個字'),
    taken: t('這個帳號已經有人用了，換一個吧'),
    already: t('這個瀏覽器已經建立過帳號了，請直接登入'),
    wrong: t('帳號或密碼不對'),
    locked: t('錯太多次了，請 10 分鐘後再試'),
    tooFast: t('太快了，等一下再試'),
    noVid: t('還沒連上伺服器，等一下再試'),
  };
  const account = () => ({
    user: accountName(),
    onRegister: async (user, pass) => {
      const res = await net.request('register', { user, pass });
      if (!res) return t('還沒連上伺服器，等一下再試');
      if (!res.ok) return accountErr[res.reason] ?? t('建立失敗，再試一次吧');
      try {
        localStorage.setItem(ACCOUNT_KEY, res.user);
      } catch {
        /* 存不了也沒關係 */
      }
      // 有帳號了：把目前的名字和外型固定下來，之後重新整理不會再變
      profile = { ...profile, custom: true, customLook: true };
      saveProfile(profile);
      net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0 });
      hud.toast(t('👤 帳號建立好了！換手機時用「{user}」登入就能找回松果和帳篷', { user: res.user }), 5000);
      return null;
    },
    onLogin: async (user, pass) => {
      const res = await net.request('login', { user, pass });
      if (!res) return t('還沒連上伺服器，等一下再試');
      if (!res.ok) return accountErr[res.reason] ?? t('登入失敗，再試一次吧');
      try {
        localStorage.setItem('cozy-campfire-vid', res.vid);
        localStorage.setItem(ACCOUNT_KEY, res.user);
      } catch {
        /* 無痕模式 */
      }
      location.reload(); // 用帳號的資料重新進來
      return null;
    },
    onLogout: () => {
      try {
        localStorage.removeItem(ACCOUNT_KEY);
        localStorage.removeItem('cozy-campfire-vid'); // 登出後變回新的訪客
      } catch {
        /* 無痕模式 */
      }
      location.reload();
    },
  });

  // ---------- 手機版面：左上角的資訊排成一欄，才不會互相重疊 ----------
  if (mobile) {
    const stack = document.createElement('div');
    stack.className = 'm-stack';
    document.getElementById('ui').appendChild(stack);
    for (const id of ['sound-unlock', 'fire-meter', 'online', 'today', 'event-line', 'mini-line', 'ritual', 'pomodoro', 'lake-news']) {
      const el = document.getElementById(id);
      if (el) stack.appendChild(el);
    }
    // 手機：比較少用的按鈕（邀朋友、圖鑑、存檔、分流）收進「⋯」，點了才展開
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'more-chip';
    more.textContent = '⋯';
    more.title = t('更多');
    more.addEventListener('pointerdown', (e) => e.stopPropagation());
    more.addEventListener('click', () => {
      const open = document.body.classList.toggle('m-more');
      more.textContent = open ? '✕' : '⋯';
    });
    document.getElementById('online')?.appendChild(more);
  } else {
    // 電腦版：右上角一欄（專注計時器在上、湖畔動態在下），才不會和左上那排按鈕疊在一起
    const rstack = document.createElement('div');
    rstack.className = 'r-stack';
    document.getElementById('ui').appendChild(rstack);
    for (const id of ['pomodoro', 'lake-news']) {
      const el = document.getElementById(id);
      if (el) rstack.appendChild(el);
    }
  }

  // ---------- 掛機自動打盹 ----------
  // 超過 3 分鐘沒操作（或分頁切到背景超過 1 分鐘），角色自動裹上毯子打盹、頭上冒 Zzz；一動就醒來。
  // 用 setInterval 檢查：分頁在背景時畫面不會更新，但計時器還會跑，別人才看得到他睡著了。
  const AFK_SLEEP = Number(params.get('afk')) || 180;
  const HIDDEN_SLEEP = 60;
  let autoSleep = false;
  let hiddenSince = 0;
  document.addEventListener('visibilitychange', () => {
    hiddenSince = document.hidden ? performance.now() : 0;
    // 🎣 拉竿到一半切出去（鎖螢幕、回 LINE）：畫面會暫停，先告訴大家「坐回去釣魚了」（舉魚炫耀的話就繼續舉著）
    if (document.hidden && joined && actions.state === 'fish' && fishing.netAction === 'reel') net.update(1, netState('fish'));
  });
  setInterval(() => {
    if (!joined || editing) return;
    const idle = input.idleSeconds;
    const hiddenFor = hiddenSince ? (performance.now() - hiddenSince) / 1000 : 0;
    if (!autoSleep) {
      const sleepy = idle > AFK_SLEEP || hiddenFor > HIDDEN_SLEEP;
      if (sleepy && actions.state === 'free' && !roomMgr?.busy) {
        forest.dropStone(player.character);
        actions.start('blanket');
        autoSleep = true;
        net.update(1, netState('blanket')); // 背景分頁不會跑畫面迴圈，直接送一次
      }
    } else if (actions.state !== 'blanket') {
      autoSleep = false; // 自己起身了（移動或按 Z）
    } else if (idle < 2 && !document.hidden) {
      actions.stop(); // 有操作（滑鼠、觸控、按鍵）就醒來
      autoSleep = false;
    }
  }, 2000);

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let joined = false;

  // 每一幀如果出錯：記下來、顯示一次，但遊戲繼續跑（不然整個畫面會停住，看起來像當機）
  let lastFrameError = '';
  const reportError = (err) => {
    const msg = String(err?.message || err).slice(0, 120);
    console.error('[遊戲錯誤]', err);
    if (msg === lastFrameError) return;
    lastFrameError = msg;
    hud.toast(t('⚠️ 發生小錯誤，已自動略過：{msg}', { msg }), 6000);
  };
  window.addEventListener('error', (e) => reportError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason));

  // 🖥️ 電腦版自動調整畫質：連續幾秒畫面太卡（每秒不到約 40 張），就一步步降低負擔，不會再調回去
  //   第 1 步：營火的影子不畫（點光源影子每張要多畫 6 次整個場景，最吃效能）
  //   第 2 步：解析度降到 1.25 倍；第 3 步：降到 1 倍
  //   網址加 ?hq 可以關掉這個功能
  const autoQuality = { level: 0, sum: 0, n: 0, last: 0, wait: 6000 };
  const tuneQuality = (now) => {
    if (lowPower || params.has('hq') || autoQuality.level >= 3) return;
    const gap = now - autoQuality.last;
    autoQuality.last = now;
    // 剛載入、換房間、切回分頁的那幾張本來就會卡，不算
    if (gap > 250 || document.hidden) {
      autoQuality.wait = Math.max(autoQuality.wait, 2000);
      autoQuality.sum = autoQuality.n = 0;
      return;
    }
    if (autoQuality.wait > 0) {
      autoQuality.wait -= gap;
      return;
    }
    autoQuality.sum += gap;
    autoQuality.n++;
    if (autoQuality.sum < 3000) return;
    const avg = autoQuality.sum / autoQuality.n;
    autoQuality.sum = autoQuality.n = 0;
    if (avg < 25) return;
    autoQuality.level++;
    autoQuality.wait = 2000; // 降完先等一下再量
    if (autoQuality.level === 1) {
      campfire.light.castShadow = false;
      renderer.shadowMap.enabled = false;
      scene.traverse((o) => o.material && [].concat(o.material).forEach((m) => (m.needsUpdate = true)));
    } else {
      const pr = Math.min(window.devicePixelRatio, autoQuality.level === 2 ? 1.25 : 1);
      if (pr >= renderer.getPixelRatio()) return;
      renderer.setPixelRatio(pr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      world.setPixelRatio(pr);
      campfire.setPixelScale(window.innerHeight * pr, camera.fov);
    }
    console.info(`[Cozy] 畫面有點卡，自動降低畫質（第 ${autoQuality.level} 步，平均 ${avg.toFixed(0)}ms／張）`);
  };

  let lastFrame = 0;
  let booted = false;
  let wasFishing = false;
  renderer.setAnimationLoop((now) => {
    tuneQuality(now);
    if (lowPower) {
      const idle = document.body.classList.contains('is-idle');
      const minGap = idle ? 1000 / 12 : 1000 / 30;
      if (now - lastFrame < minGap - 2) return; // 跳過這一張，省電
      lastFrame = now;
    }
    try {
      frame();
    } catch (err) {
      reportError(err);
    }
    // 第一張畫面畫完就收起載入畫面（就算這張出了小錯也要收，不然玩家會一直卡在「正在生火」）
    if (!booted) {
      booted = true;
      window.__bootDone?.();
    }
  });

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); // 切換分頁回來時避免瞬移
    const elapsed = clock.elapsedTime;
    const room = roomMgr.current;

    const action = actions.update(dt, input.hasMoveInput);
    player.update(dt, input, cameraRig.yaw, room, elapsed, action);
    remotes.pushOut(player.position, player.radius);
    remotes.update(dt, elapsed);
    net.update(dt, netState());
    cameraRig.showOff = fishing.showingOff;
    // 坐著釣魚：手機版左上的即時動態、活動時間先收起來，拉竿框、釣到的卡片才不會被擋
    const isFishing = actions.state === 'fish';
    if (isFishing !== wasFishing) {
      wasFishing = isFishing;
      document.body.classList.toggle('fishing', isFishing);
    }
    // 舉著魚到處走：又坐下來釣魚、去做別的事（烤棉花糖、撿石頭、裹毯⋯）就收進魚簍
    if (trophy) {
      if (actions.state !== 'free' || forest.carrying) setTrophy(null);
      else if (player.character !== trophyChar) {
        player.character.setHeldFish?.(trophy.index, trophy.size);
        player.character.setProp('fish', true);
        trophyChar = player.character;
      }
    }
    cameraRig.update(dt);

    const goTo = roomMgr.update(dt, elapsed, camera);
    checkMini();
    if (goTo) roomMgr.switchTo(goTo, switchOnServer);

    zzz.update(dt);
    bubbles.update(dt, headOf);
    pomodoro.update(dt);
    audio.setFireStrength(campfire.strength);
    audio.updateListener(camera);
    rooms.treehouse_music.musicPlaying = audio.musicPlaying;

    hud.setFire(campfire.fuelRatio);
    hud.setSoundBlocked(joined && !audio.running); // 聲音還沒被瀏覽器放行時，顯示「點一下開啟聲音」
    if (mobile) {
      // 手機：互動按鈕跟著位置換（祈福處、告示牌），提示裡的按鍵換成按鈕圖示
      mobile.setInteract(actions.state === 'free' ? (roomMgr.current.interactHint?.(actions) ?? null) : null);
      mobile.setRoast(roomMgr.current.roastHint?.(actions) ?? null);
      const p = actions.prompt;
      hud.setPrompt(p && p.replace(/<kbd>([^<]*)<\/kbd>/g, (_, k) => {
        const icon = mobile.keyIcon(k);
        return icon ? `<kbd class="key-icon">${icon}</kbd>` : '';
      }));
    } else hud.setPrompt(actions.prompt);
    ritual?.update(dt, elapsed, ritualState);
    document.body.classList.toggle('in-action', actions.state !== 'free');

    renderer.render(scene, camera);
  }

  /**
   * 🙈 作者自己的裝置：在 /stats 按「這台裝置不算進統計」，或網址加 ?nostat（無痕視窗測試時用）
   * 不算進來訪人數、停留時間、新旅人
   */
  function isStaff() {
    try {
      if (params.has('nostat')) localStorage.setItem('cozy-campfire-staff', '1');
      return localStorage.getItem('cozy-campfire-staff') === '1';
    } catch {
      return params.has('nostat');
    }
  }

  /** 這個瀏覽器的隨機代號（只用來算「今天有幾位旅人」，不含個人資料） */
  function visitorId() {
    try {
      let v = localStorage.getItem('cozy-campfire-vid');
      if (!v) {
        v = Math.random().toString(36).slice(2, 12);
        localStorage.setItem('cozy-campfire-vid', v);
      }
      return v;
    } catch {
      return '';
    }
  }

  // 下方操作說明：平常只顯示「移動、互動」，想看全部再展開
  document.getElementById('hint-toggle')?.addEventListener('click', (e) => {
    const hint = document.getElementById('hint');
    hint.classList.toggle('collapsed');
    e.currentTarget.textContent = hint.classList.contains('collapsed') ? t('⌨️ 更多操作') : t('收起');
  });

  // ---------- 進場：打開就直接在營火旁（不用先填資料） ----------
  let profile;
  // 內建角色才能選動物（用 .glb 模型時只有那一種）
  const isProcedural = character instanceof ProceduralFox;
  const applyLook = ({ fur, species }) => {
    if (isProcedural && player.character.speciesIndex !== species) {
      player.setCharacter(new ProceduralFox({ fur, species }));
    }
    player.character.setFur?.(fur);
    player.character.setProp?.('stone', forest.carrying);
  };
  if (params.get('name')) {
    profile = {
      name: params.get('name').slice(0, 12),
      fur: Number(params.get('fur')) || 0,
      species: Number(params.get('species')) || 0,
    };
  } else if (params.has('join')) {
    // 舊的進場畫面（網址加 ?join）
    input.enabled = false;
    document.body.classList.add('joining');
    profile = await new JoinScreen({ onPreview: applyLook, allowSpecies: isProcedural }).show();
    document.body.classList.remove('joining');
    input.enabled = true;
  } else {
    profile = autoProfile(isProcedural); // 每次進來都是新的隨機名字和樣子
  }
  joined = true;
  applyLook(profile);
  myName = profile.name;
  hud.setMe(myName);
  input.markActive();
  refreshOnline();

  // 「🦊 名字 ✏️」：隨時改名字、換動物
  let editing = false;
  hud.onMeClick = async ({ focusAccount = false } = {}) => {
    if (editing) return;
    editing = true;
    input.enabled = false;
    const next = await new JoinScreen({
      onPreview: applyLook,
      allowSpecies: isProcedural,
      edit: { name: myName, fur: profile.fur, species: profile.species, code: profile.code, custom: profile.custom, customLook: profile.customLook },
      account: account(),
      focusAccount,
    }).show();
    refreshAcctChip();
    input.enabled = true;
    editing = false;
    if (!next) return applyLook(profile); // 取消：換回原本的樣子
    profile = { ...profile, ...next };
    applyLook(profile);
    if (next.name !== myName || next.code !== undefined) {
      myName = next.name;
      hud.setMe(myName);
    }
    // 重新連線，讓大家看到新的名字和樣子（也重新判斷贊助頭飾）
    // 自己改過名字或外型：一定記住（有帳號的話，換裝置登入也會跟著回來）
    profile.custom = true;
    profile.customLook = true;
    saveProfile(profile);
    net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0 });
    net.rejoin({ name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
    hud.toast(t('✨ 換好了，{name}', { name: myName }));
  };
  net.connect({
    name: profile.name,
    fur: profile.fur,
    species: isProcedural ? profile.species : 0,
    code: profile.code || '',
    vid: visitorId(),
    touch: !!mobile,
    staff: isStaff(), // 作者自己的裝置：不算進統計
    with: params.get('with') || undefined, // 朋友的邀請連結
    src: detectSource(), // 來源統計：從哪個網站來的
    ch: Math.floor(Number(profile.ch ?? params.get('ch')) || 0),
    room: roomMgr.current.id,
    x: player.position.x,
    z: player.position.z,
    ry: player.rotationY,
  });

  // 方便在瀏覽器 console 除錯（開發模式或網址加 ?debug）
  if (import.meta.env.DEV || params.has('debug')) {
    window.__cozy = { renderer, forest, scene, camera, player, campfire, world, cameraRig, actions, input, hud, net, remotes, rooms, roomMgr, audio, pomodoro, fishing, fishingUI, social, bubbles, shrinePanel, noticePanel, channelPanel, cairnPanel, ritual, treePanel, shareCard, world, shopPanel, buildPanel, homeRoom: rooms.home, goHome };
  }
}

init().catch((err) => {
  console.error(err);
  window.__bootFail?.(); // 打不開 3D 畫面：在載入畫面上說明
});
