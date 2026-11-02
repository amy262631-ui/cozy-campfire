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
import { HUD } from './ui/HUD.js';
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
import { FISH } from './fishing/fishData.js';
import { FishingUI } from './ui/FishingUI.js';

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
const PLACE = { forest_main: '營火旁', tent_focus: '帳篷裡', treehouse_music: '樹屋上', lake_dock: '湖畔', tent_social: '交流帳篷裡', campground: '帳篷營地', home: '帳篷裡' };

async function init() {
  translateStatic(); // index.html 裡的固定文字
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
  };
  const { world, campfire } = forest;
  if (lowPower) campfire.light.castShadow = false; // 省電模式不算影子
  world.setPixelRatio(pixelRatio);

  // ---------- Player ----------
  const input = new InputController();
  const character = await loadCharacter(MODEL_URL);
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
  campfire.onCrackle = () => audio.crackleBurst();
  rooms.lake_dock.onSplash = () => audio.splash();

  // ---------- 多人連線 ----------
  const net = new NetworkClient({ url: params.get('server') || undefined });
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
      const rec = fishingUI.record(index, size);
      lastCatch = { index, size, rec };
      fishingUI.showCard(index, size, rec);
      if (net.online) net.sendCatch(index, size);
      else fishingUI.setBoard([], false);
    },
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
  const shrinePanel = new ShrinePanel({
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
    onShared: () => claimShareGift(),
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
    if (announce && ev.active && !was) hud.toast(t('🌠 營火時間開始了！流星雨、松果加倍，限定「流星吊飾」只到 9:30'), 6000);
    if (announce && !ev.active && was) hud.toast(t('🌙 今晚的營火時間結束了，明晚 9 點見'), 4000);
    treePanel?.refresh();
  };
  net.on('event', (ev) => applyEvent(ev, true));
  setInterval(() => eventState && hud.setEvent(currentEvent()), 20000);

  // ---------- 每小時小活動（釣魚大賽、疊石接力、添柴時光） ----------
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
  /** 分享邀請連結；分享成功（或複製成功）回傳 true */
  const shareInvite = async () => {
    const url = inviteUrl();
    const text = t('來營火旁找我！點這個連結，就會出現在我旁邊 🔥');
    try {
      if (navigator.share) {
        await navigator.share({ title: t('迷霧森林露營地'), text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        hud.toast(t('📋 已複製邀請連結，貼給朋友吧'));
      }
    } catch {
      return false; // 取消分享
    }
    await claimShareGift();
    return true;
  };
  /** 分享過一次：領「營火明信片牆」（伺服器只會給一次） */
  const claimShareGift = async () => {
    if (net.online) await net.request('shared');
  };
  const giftPanel = new GiftPanel({
    getInfo: async () => {
      const res = await net.request('giftInfo');
      return res?.ok ? res : null;
    },
    onShare: shareInvite,
  });
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
      if (res?.reason === 'eventOnly') hud.toast(t('🌠 流星吊飾只有每晚 9:00～9:30 的營火時間才能掛'));
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
    setTimeout(() => welcome.maybeShow(), 1200);
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
    campfire.setPixelScale(h * pixelRatio, camera.fov);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /** 要送給伺服器的狀態 */
  function netState(actionState) {
    return {
      ...player.getNetworkState(),
      actionState: actionState ?? ((actions.state === 'fish' && fishing.netAction) || player.actionState), // 拉竿、舉魚
      doneness: actions.state === 'roast' ? actions.doneness : 0,
      extra: fishing.netExtra || (forest.carrying ? STONE_FLAG : 0), // 舉起來的魚（魚種＋公分），或頭上頂著石頭
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
      // 換了造型，門口位置可能變了：站太靠門就往裡面挪，免得被送回營火
      if (player.position.z > homeRoom.doorZ - 0.95) player.position.z = homeRoom.doorZ - 1.15;
      buildPanel.render();
      if (!buildPanel.active) buildPanel.showTools(true, h.open);
    }
  };
  const goHome = () => {
    if (!myHome?.tent) return hud.toast(t('還沒有帳篷，先到「🏪 營地小舖」買一頂吧 ⛺'));
    shopPanel.close();
    homeRoom.setExit(roomMgr.current.id === 'campground' ? 'campground' : 'forest_main');
    roomMgr.switchTo('home', () => net.switchRoom('home', { x: 0, z: homeRoom.spawn.z, ry: Math.PI }));
  };
  hud.onHome = goHome;

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
    onBuy: async (id) => {
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
        else hud.toast(t('{icon} 買了{name}，回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }));
        return true;
      }
      const why = { poor: t('松果不夠喔 🌰'), owned: t('你已經有帳篷了'), noTent: t('先買帳篷，才能放家具 ⛺'), tooMany: t('這個已經買很多了'), tooFast: t('慢慢來 🙂') };
      hud.toast(why[res?.reason] ?? t('沒買成，再試一次吧'));
      return false;
    },
  });
  actions.onShop = () => shopPanel.open();

  const buildPanel = new BuildPanel({
    getHome: () => homeRoom.home,
    onEdit: async (op, data) => {
      const res = await homeReq('homeEdit', { op, ...data });
      if (res?.ok) {
        setMyHome({ ...res.home });
        audio.sfx(op === 'remove' ? 'tap' : 'stone');
      } else if (res?.reason === 'taken') hud.toast(t('這格已經有東西了'));
      else if (res?.reason === 'tooMany') hud.toast(t('帳篷放滿了，收起一些再擺吧'));
      else if (res) hud.toast(t('沒放成，再試一次吧'));
    },
    onExit: () => stopBuild(),
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
  const startBuild = () => {
    if (!inHome() || !homeRoom.mine) return;
    homeRoom.setBuild(true);
    buildPanel.start();
    document.body.classList.add('building');
    // 布置時鏡頭拉高往下看，整個帳篷一目了然
    buildCam = { pitch: cameraRig.target.pitch, distance: cameraRig.target.distance };
    cameraRig.target.pitch = 1.05;
    cameraRig.target.distance = 8.5;
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

  let lastFrame = 0;
  renderer.setAnimationLoop((now) => {
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
    cameraRig.showOff = fishing.phase === 'show';
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
    with: params.get('with') || undefined, // 朋友的邀請連結
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

init();
