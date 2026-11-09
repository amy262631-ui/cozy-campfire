import { randomName } from './social/names.js';
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
import { RemotePlayers, setRemoteHeight, setCharScale } from './network/RemotePlayers.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SONGS } from './audio/music.js';
import { CHALLENGE_BY_ID } from './game/dailyChallenge.js';
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
import { UpdateNews } from './ui/UpdateNews.js';
import { ConfirmBuy } from './ui/ConfirmBuy.js';
import { buildYard } from './rooms/yardModels.js';
import { buildSign } from './rooms/signModels.js';
import { SIGN_BY_ID } from './game/signCatalog.js';
import { FURNITURE_COLORS, gridOf, expandPrice, fishFits } from './game/furnitureCatalog.js';
import { YARD_BY_ID, YARD_USES } from './game/yardCatalog.js';
import { FUR_PALETTES } from './player/characters/furPalettes.js';
import { BASE_FUR, PREMIUM_FUR, TAILS, EARS, TAIL_BY_ID, EAR_BY_ID, SPECIES_TAIL, SPECIES_EARS } from './game/looks.js';
import { GuestPanel } from './ui/GuestPanel.js';
import { translateChat, translateEnabled, setTranslateEnabled } from './network/chatTranslate.js';
import { GiftPanel } from './ui/GiftPanel.js';
import { GIFT_FURNITURE } from './game/furniture.js';
import { TENT_STYLE_BY_ID, styleOf, tentTexture } from './game/tentStyles.js';
import { createCampgroundRoom } from './rooms/campgroundRoom.js';
import { RACE_LANTERNS, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN } from './game/miniSpots.js';
import { TENT_SHAPE_BY_ID, buildTentShell } from './game/tentShapes.js';
import { lowpoly } from './rooms/shared.js';
import { FURNITURE_BY_ID, TENT_PRICE, buildFurniture } from './game/furniture.js';
import { SpeechBubbles } from './fx/SpeechBubbles.js';
import { SocialPanel } from './ui/SocialPanel.js';
import { ShrinePanel } from './ui/ShrinePanel.js';
import { LanguagePicker } from './ui/LanguagePicker.js';
import { NoticePanel } from './ui/NoticePanel.js';
import { ChannelPanel } from './ui/ChannelPanel.js';
import { CairnPanel } from './ui/CairnPanel.js';
import { zoneName, LAYOUT as CAMP_LAYOUT } from './rooms/campLayout.js';
import { RitualGuide } from './ui/RitualGuide.js';
import { HelpPanel } from './ui/HelpPanel.js';
import { GIFT_CATS, giftInfo, basketCat, GIFT_DAILY_CAP, GIFT_MIN_DAYS } from './game/gifts.js';
import { FIRE_SEATS } from './rooms/fireSeats.js';
import { SHOP_FRONT } from './rooms/shop.js';
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
import { GATHER_ITEMS, GATHER_BY_ID, GATHER_TYPES, GATHER_DEX_BONUS, NET_PRICE, isNight, taipeiMonth } from './game/gathering.js';
import { CROPS, CROP_BY_ID, WATER_MAX } from './game/garden.js';
import { haveOf, canMake, specLabel } from './game/materials.js';
import { RECIPES } from './game/crafting.js';
import { DISHES, DISH_BY_ID, activeBuff, DISH_FX, BUFFS } from './game/cooking.js';
import { MUSEUM_ITEMS, MUSEUM_CATS, MUSEUM_BY_ID } from './game/museum.js';
import { TRASH, TRASH_BY_ID, RECYCLE_DAILY_CAP } from './game/trash.js';
import { PASS, PASS_TIERS, PASS_TIER_LIST, FREE } from './game/pass.js';
import { detectSource, inAppKind, isStandalone, installKind } from './game/sources.js';

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
  // 📲 桌面捷徑的名字跟著遊戲語言（11/09）：iPhone 看 apple 標題、Android／電腦看 manifest
  try {
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', t('迷霧營地'));
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', `/manifest.webmanifest?lang=${encodeURIComponent(document.documentElement.lang || '')}`);
  } catch {
    /* 沒關係 */
  }
  // 角色模型先開始找（要問伺服器一次），同時去蓋場景，不用乾等
  const characterReady = loadCharacter(MODEL_URL);
  // ---------- Renderer ----------
  const container = document.getElementById('app');
  // 🔋 省電模式（手機自動開）：解析度低一點、不畫影子、每秒最多 30 張；掛機時再降到 12 張
  // 🛟 當機保護：上次沒有正常關掉（平板記憶體不夠，瀏覽器把分頁關掉重開），這次自動用最省的畫質
  let crashCount = 0;
  try {
    crashCount = Number(localStorage.getItem('cozy-boot') || 0);
    localStorage.setItem('cozy-boot', String(crashCount + 1));
  } catch {
    /* 無痕模式 */
  }
  const bootOk = () => {
    try {
      localStorage.setItem('cozy-boot', '0');
    } catch {
      /* 無痕模式 */
    }
  };
  addEventListener('pagehide', bootOk); // 正常關掉、換頁：不算當機
  setTimeout(bootOk, 5 * 60000); // 穩穩玩了 5 分鐘也不算
  const ua = navigator.userAgent;
  // 平板（iPad 接鍵盤觸控板時也算）：一律省電，避免記憶體不夠被關掉
  const tablet = (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const safeMode = (crashCount >= 1 || params.has('safe')) && !params.has('hq');
  const lowPower = (isTouchDevice() || tablet || safeMode || params.has('lowpower')) && !params.has('hq');
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio, safeMode ? 1 : lowPower ? 1.25 : 2);
  // 畫面資源被瀏覽器收回（記憶體不夠）：重新整理一次，下次會自動用省電畫質
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    removeEventListener('pagehide', bootOk);
    try {
      localStorage.setItem('cozy-boot', '1');
    } catch {
      /* 無痕模式 */
    }
    setTimeout(() => location.reload(), 300);
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lowPower; // 營火的點光源影子要畫 6 次，手機最吃電
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // 影子隔一幀重畫（見 frame()）
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
  let myAge = 99;
  /** 🎫 月票、☕ 贊助假髮：伺服器開了（PASS_ON=1）才顯示 */
  let payOn = false;
  let myStreak = 1;
  // ---------- 🌱 新手：功能慢慢打開（老玩家一進來就全部都有） ----------
  //   0 第一次來：只留人數、名字、松果、去哪裡　1 疊完石頭：📖 圖鑑、👤 存檔
  //   2 釣到魚或玩滿 10 分鐘：👒 造型、🔥 約朋友　3 松果夠買帳篷：💡 今日小靈感　4 買了帳篷或第二天：全部
  const STAGE_KEY = 'cozy-stage';
  let stage = (() => {
    try {
      const v = localStorage.getItem(STAGE_KEY);
      if (v != null) return Number(v);
    } catch {
      /* 無痕模式 */
    }
    return RitualGuide.isNewbie() ? 0 : 4;
  })();
  const applyStage = () => {
    for (let i = 0; i <= 4; i++) document.body.classList.toggle(`stage-${i}`, i === stage);
  };
  const STAGE_MSG = {
    1: () => t('📖 上面多了「圖鑑」：釣到的魚、採到的東西都會收在這裡'),
    2: () => t('👒 「造型」和「🔥 約朋友」打開了：朋友點你的連結進來玩 1 分鐘，就送你今天的造型'),
    3: () => t('📖 不知道怎麼玩？點上面的「❓ 問題」，有營地手冊'),
    4: () => t('🎉 營地全部打開了：到「🏪 營地小舖」買帳篷，也可以用「🧭 去哪裡」到迷霧森林採集'),
  };
  const setStage = (n, quiet = false) => {
    if (n <= stage) return;
    stage = n;
    try {
      localStorage.setItem(STAGE_KEY, String(n));
    } catch {
      /* 無痕模式 */
    }
    applyStage();
    if (!quiet && STAGE_MSG[n]) setTimeout(() => hud.toast(STAGE_MSG[n](), 6500), 1200);
  };
  applyStage();
  setTimeout(() => setStage(2), 10 * 60000); // 玩滿 10 分鐘
  if (safeMode && crashCount >= 1) setTimeout(() => hud.toast(t('🛟 上次好像沒有順利載入，這次先用省電畫質，比較不會被關掉'), 6000), 4000);
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
  fishingUI.onBoardOpen = async () => {
    if (!net.online) return;
    const res = await net.request('boardInfo').catch(() => null);
    if (res?.ok) fishingUI.setBoard(res.board, true);
  };
  let lastCatch = null;
  const fishing = new FishingGame({
    group: rooms.lake_dock.group,
    waterY: LAKE_WATER_Y,
    hud,
    ui: fishingUI,
    audio,
    cameraRig,
    onCatch: (index, size, perfect) => {
      setStage(2); // 🌱 第一次釣到魚：造型、約朋友打開
      ritual?.event('fish', { junk: !!FISH[index]?.junk });
      if (!FISH[index]?.junk && size > (todayLog.size ?? 0)) logToday({ fish: index, size }); // 分享文案用：今天最大的魚
      const rec = fishingUI.record(index, size);
      lastCatch = { index, size, rec };
      fishingUI.showCard(index, size, rec);
      const ff = FISH[index];
      if (ff && !ff.junk && (ff.legend || ff.rarity >= 4)) {
        const stars = ff.legend ? '👑' : `★${ff.rarity}`;
        setTimeout(
          () =>
            sharePop(t('🎉 釣到 <b>{stars} {name}</b>！', { stars, name: ff.name }), {
              icon: '🐟',
              big: t('釣到 {stars} {name}！', { stars, name: ff.name }),
              small: t('沒力氣出門的夜晚，在湖邊等到了牠'),
              text: t('我在迷霧森林露營地釣到 {stars} {name} 🐟 沒力氣出門的夜晚，一起來營火旁坐一下吧', { stars, name: ff.name }),
            }),
          2500,
        );
      }
      if (net.online) net.sendCatch(index, size, perfect);
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
  // 🏃 電腦版 Shift 按一下切換跑步／走路
  input.onRunToggle = (on) => hud.toast(on ? t('🏃 跑步模式（再按一次 Shift 變回走路）') : t('🚶 走路模式'), 1800);
  forest.seatTaken = (seat) => remotes.anyNear(seat.x, seat.z, 0.45); // 🪵 圓木有沒有人坐
  // 🛋️ 帳篷裡的沙發、坐墊、床：有人坐了就不能再坐（11/07：以前兩個人會疊在同一個位置）
  if (rooms.home) rooms.home.seatTaken = (seat) => remotes.anyNear(seat.x, seat.z, 0.3);
  // 🪢 鞦韆、🪑 小搖椅：有人坐著才搖（自己坐、或附近有別人坐著）
  const seatedNear = (x, z, r) => (['sofa', 'eat'].includes(actions.state) && Math.hypot(player.position.x - x, player.position.z - z) < r) || remotes.anySeatedNear?.(x, z, r);
  rooms.campground.occupied = seatedNear;
  if (rooms.home) rooms.home.occupied = seatedNear;
  // 特殊魚的出現條件：營火時間、整點釣魚大賽
  fishing.roll = () => (net.online ? net.request('fishRoll') : null); // 🎣 這一竿的魚由伺服器決定
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
  social.onFriends = () => openFriends();

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

  // ---------- 營火時間（早上、晚上 9:30～10:00） ----------
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
    if (announce && ev.active && !was) hud.toast(t('🌠 營火時間開始了！流星雨、松果加倍，限定「流星吊飾」只有這 30 分鐘'), 6000);
    if (announce && !ev.active && was) hud.toast(t('🌙 這場營火時間結束了，下次 {when} 見', { when: ev.slot === 'am' ? t('早上 9:30') : t('晚上 9:30') }), 4000);
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

  // ---------- ⏰ 開始前 5 分鐘提醒（營火時間的魚王、每場小活動） ----------
  const warned = new Set();
  const MINI_NAME = { fish: () => t('🎣 釣魚大賽'), stone: () => t('🪨 疊石接力'), wood: () => t('🔥 添柴時光'), race: () => t('🏃 燈籠賽跑'), hunt: () => t('✨ 找金松果') };
  const warnSoon = () => {
    const ev = currentEvent();
    if (ev && !ev.active && ev.startsIn > 20 && ev.startsIn <= 300) {
      const key = `ev-${Math.round((Date.now() / 1000 + ev.startsIn) / 60)}`;
      if (!warned.has(key)) {
        warned.add(key);
        hud.toast(t('🐉 {m} 分鐘後營火時間！魚王會在湖畔和營火河畔出現，還有流星雨、松果加倍', { m: Math.ceil(ev.startsIn / 60) }), 7000);
        audio.sfx('bell');
      }
    }
    const m = currentMini();
    if (m && !m.active && m.startsIn > 20 && m.startsIn <= 300 && MINI_NAME[m.kind]) {
      const key = `mini-${Math.round((Date.now() / 1000 + m.startsIn) / 60)}`;
      if (!warned.has(key)) {
        warned.add(key);
        hud.toast(t('⏰ {m} 分鐘後開始：{name}', { m: Math.ceil(m.startsIn / 60), name: MINI_NAME[m.kind]() }), 6000);
      }
    }
  };
  setInterval(warnSoon, 15000);
  net.on('areas', (a) => {
    forest.setAreas(a);
    hud.setAreas(a);
  });
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
    if (res?.ok && !look.dailyGot) hud.toast(t('📤 分享出去了！朋友點你的連結進來玩 1 分鐘，就送你今天的每日造型'), 5500);
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
    onContact: () => {
      giftPanel.close();
      openSupport();
    },
    onPreview: (kind, id, how) => previewItem(kind, id, how),
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
    // 🏕️ 松果夠買帳篷了：跳一次引導（去小舖買，或先去帳篷營地看看大家的家）
    try {
      if (n >= TENT_HINT_AT && net.online && myHome && !myHome.tent) setTimeout(showTentHint, 1500);
    } catch {
      /* 初始化還沒跑到 myHome 那裡 */
    }
  };
  const TENT_HINT_AT = 30;
  function showTentHint() {
    if (myHome?.tent || modal.isOpen) return;
    try {
      if (localStorage.getItem('cozy-tent-hint')) return;
      localStorage.setItem('cozy-tent-hint', '1');
    } catch {
      return;
    }
    setStage(3);
    modal.open(t('🏕️ 你可以有自己的帳篷了！'), `
      <div class="seeyou">
        <p>${t('你已經有 <b>🌰 {n}</b> 顆松果，夠買一頂自己的帳篷了。', { n: pinecones })}</p>
        <ul>
          <li>${t('⛺ 買下來就是你的家：擺家具、換造型，關掉網頁再來都還在')}</li>
          <li>${t('🏕️ 先到帳篷營地逛逛，看看大家把家布置成什麼樣子')}</li>
        </ul>
        <button type="button" class="seeyou-save" id="th-shop">${t('🏪 去營地小舖買帳篷')}</button>
        <button type="button" class="seeyou-save seeyou-alt" id="th-camp">${t('🏕️ 先去帳篷營地參觀')}</button>
      </div>`, (body) => {
      body.querySelector('#th-shop').addEventListener('click', () => {
        modal.close();
        shopPanel.open();
      });
      body.querySelector('#th-camp').addEventListener('click', () => {
        modal.close();
        hud.onGo?.('campground');
      });
    });
  }
  const treePanel = new TreePanel({
    getEvent: () => currentEvent(),
    getItems: () => forest.wishTree.items,
    getCoins: () => (net.online ? pinecones : null),
    onHang: async (id) => {
      const o0 = ORNAMENT_BY_ID[id];
      if (!(await confirmBuy.ask({ icon: o0?.icon, name: o0?.name, price: o0?.price ?? 0, desc: t('買了會直接掛上心願大樹'), coins: pinecones }))) return;
      const res = await net.hang(id);
      if (res?.ok) {
        const o = ORNAMENT_BY_ID[id];
        hud.toast(t('{icon} 把{name}掛上心願大樹了，許個願吧 ✨', { icon: o.icon, name: o.name }), 3500);
        audio.sfx('bell');
        ritual?.event('hang');
        return true;
      }
      if (res?.reason === 'eventOnly') hud.toast(t('🌠 流星吊飾只有早晚 9:30～10:00 的營火時間才能掛'));
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
    else if (reason === 'kid') hud.toast(t('🌱 新手小任務完成！送你 {n} 顆松果 🌰', { n: delta }), 5000);
    else if (reason === 'staff') hud.toast(t('🎁 營地作者送你 {n} 顆松果！', { n: delta }), 5000);
    else if (reason === 'fishCap') hud.toast(t('🎣 今天前 {n} 條魚的松果拿滿了，之後每條 +1（稀有魚照算），明天再來！', { n: passState.active ? (PASS_TIERS[passState.tier] ?? PASS).fish : FREE.fish }), 5000);
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
    daily: [t('每日造型：那天有朋友點你的連結進來玩 1 分鐘就拿到（大約一個月輪一次，錯過會再回來）'), t('那天朋友點你的連結來玩')],
    weekly: [t('每週限定：朋友真的透過你的連結來玩才拿得到'), t('朋友透過連結來玩')],
    date: [t('營火之約限定：朋友在早上或晚上 9:30 營火時間透過你的連結進來，兩個人都拿到'), t('9:30 營火時間約朋友')],
    eco: [t('垃圾圖鑑全部收集完就拿到'), t('垃圾圖鑑收集完')],
    sponsor: [t('贊助限定：那個月贊助 NT$100 以上自動拿到（告示牌 → ☕ 支持營地）'), t('贊助限定')],
  };
  fishingUI.extraTabs.push({
    id: 'outfit',
    label: t('👒 造型'),
    title: () => t('👒 造型 {n}／{total}', { n: look.outfits.length, total: OUTFITS.filter((o) => payOn || o.src !== 'sponsor').length }),
    render: () => {
      if (lookSlot === 'body') return renderBody();
      const owned = new Set(look.outfits);
      const today = look.daily ? OUTFIT_BY_ID[look.daily] : null;
      const week = look.weekly ? OUTFIT_BY_ID[look.weekly] : null;
      const cards = OUTFITS.filter((o) => o.slot === lookSlot)
        .map((o) => {
          const has = owned.has(o.id);
          const worn = look.wear?.[o.slot] === o.id;
          const tag = o.src === 'weekly' ? t('每週限定') : o.src === 'date' ? t('營火之約') : o.src === 'eco' ? t('淨灘小隊') : o.src === 'sponsor' ? t('{m} 贊助限定', { m: o.month }) : o.id === look.daily ? t('今天的') : t('每日');
          return has
            ? `<div class="dex-card outfit${worn ? ' worn' : ''}" data-id="${o.id}"><i class="dex-emoji">${o.icon}</i><b>${t(o.zh)}</b><small>${tag}</small><em>${worn ? t('穿著中・點一下脫掉') : t('點一下穿上')}</em></div>`
            : `<div class="dex-card unknown" title="${HOW[o.src][0]}"><i class="dex-emoji">${o.icon}</i><b>${t('？？？')}</b><small>${tag}</small><em>${HOW[o.src][1]}</em></div>`;
        })
        .join('');
      return `
        <div class="outfit-today">
          ${today ? (look.dailyGot ? t('✅ 今天的每日造型「{name}」已經拿到了', { name: outfitName(today.id) }) : t('🎁 今天的每日造型：{name}（朋友點你的連結進來玩 1 分鐘就拿到）', { name: outfitName(today.id) })) : ''}
          ${week ? `<br>${look.weeklyGot ? t('✅ 這週限定「{name}」已經拿到了', { name: outfitName(week.id) }) : t('🌟 這週限定：{name}（朋友透過你的連結來玩就拿到）', { name: outfitName(week.id) })}` : ''}
          <br>${t('🔥 營火之約：朋友在 9:30 營火時間透過你的連結進來，兩個人都拿到限定造型')}
          ${!look.dailyGot && net.online ? `<br><button type="button" id="outfit-share">${t('🔥 約朋友今晚 9:30，順便領今天的造型')}</button>` : ''}
        </div>
        ${slotTabs()}
        <div class="dex-grid">${cards}</div>
        <div class="creel-total">${net.online ? t('造型可以同時戴帽子、背背包、圍圍巾，其他人都看得到 ✨') : t('單人模式：連上伺服器才能領造型')}</div>`;
    },
    bind: (body) => {
      for (const b of body.querySelectorAll('[data-slot]')) {
        b.addEventListener('click', async () => {
          lookSlot = b.dataset.slot;
          if (lookSlot === 'body') await refreshLooks();
          fishingUI.openCreel('outfit');
        });
      }
      for (const c of body.querySelectorAll('.dex-card.outfit')) c.addEventListener('click', () => wearOutfit(c.dataset.id));
      for (const c of body.querySelectorAll('[data-look]')) c.addEventListener('click', () => pickLook(c.dataset.look, c.dataset.v));
      body.querySelector('#outfit-share')?.addEventListener('click', () => {
        fishingUI.el.modal.classList.remove('show');
        giftPanel.open();
      });
    },
  });
  // ---------- 🐾 動物外型：特殊毛色、尾巴、耳朵（用松果買，買過的隨時換） ----------
  let myLooks = {};
  const slotTabs = () =>
    `<div class="outfit-slot-tabs">${OUTFIT_SLOTS.filter((sl) => sl.id !== 'hair' || payOn || look.outfits.some((id) => OUTFIT_BY_ID[id]?.slot === 'hair')).map((sl) => `<button type="button" data-slot="${sl.id}" class="${sl.id === lookSlot ? 'on' : ''}">${sl.icon} ${t(sl.zh)}</button>`).join('')}<button type="button" data-slot="body" class="${lookSlot === 'body' ? 'on' : ''}">${t('🐾 外型')}</button></div>`;
  const renderBody = () => {
    const sp = profile?.species ?? 0;
    const card = (kind, v, icon, name, price, has, on, swatch = '') =>
      `<div class="dex-card outfit look-card${on ? ' worn' : ''}${has ? '' : ' locked'}" data-look="${kind}" data-v="${v}">${swatch || `<i class="dex-emoji">${icon}</i>`}<b>${name}</b><em>${on ? t('使用中') : has ? t('點一下換上') : `🌰 ${price}`}</em></div>`;
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    const furs = FUR_PALETTES.map((p, i) => {
      const prem = PREMIUM_FUR.find((x) => x.i === i);
      const has = i < BASE_FUR || (myLooks.fur ?? []).includes(i);
      const sw = `<i class="dex-emoji look-swatch" style="background:linear-gradient(135deg, ${hex(p.fur)} 60%, ${hex(p.dark)} 60%)"></i>`;
      return card('fur', i, '', p.name, prem?.price ?? 0, has, (profile?.fur ?? 0) === i, sw);
    }).join('');
    const shapes = (kind, list, defs) =>
      list
        .map((x) => {
          const isDef = defs[sp] === x.id;
          const cur = (kind === 'tail' ? profile?.tail : profile?.ear) || defs[sp];
          const has = isDef || (myLooks[kind] ?? []).includes(x.id);
          return card(kind, x.id, x.icon, t(x.zh), x.price, has, cur === x.id);
        })
        .join('');
    const panda = sp === 4;
    return `
      <div class="outfit-today">${t('🐾 買一次就能一直用，換別的動物也可以用（熊貓的黑白毛色固定，不能換毛色）')}</div>
      ${slotTabs()}
      <div class="look-sub">${t('🎨 毛色')}</div>
      ${panda ? `<div class="creel-total">${t('熊貓的毛色是固定的黑白喔')}</div>` : `<div class="dex-grid">${furs}</div>`}
      <div class="look-sub">${t('🐾 尾巴')}</div>
      <div class="dex-grid">${shapes('tail', TAILS, SPECIES_TAIL)}</div>
      <div class="look-sub">${t('👂 耳朵')}</div>
      <div class="dex-grid">${shapes('ear', EARS, SPECIES_EARS)}</div>
      <div class="creel-total">${net.online ? t('動物本來的尾巴、耳朵免費；其他形狀和特殊毛色用松果買') : t('單人模式：連上伺服器才能買')}</div>`;
  };
  const refreshLooks = async () => {
    const res = await net.request('lookInfo');
    if (res?.ok) myLooks = res.looks ?? {};
  };
  /** 換上（或先買）一個外型 */
  async function pickLook(kind, v) {
    const sp = profile?.species ?? 0;
    const val = kind === 'fur' ? Number(v) : v;
    const has =
      kind === 'fur'
        ? val < BASE_FUR || (myLooks.fur ?? []).includes(val)
        : (kind === 'tail' ? SPECIES_TAIL : SPECIES_EARS)[sp] === val || (myLooks[kind] ?? []).includes(val);
    if (!has) {
      if (!net.online) return hud.toast(t('連上伺服器才能買'));
      const item = kind === 'fur' ? PREMIUM_FUR.find((x) => x.i === val) : (kind === 'tail' ? TAIL_BY_ID : EAR_BY_ID)[val];
      if (!item) return;
      // 先換上去看看（預覽），確定了才買；取消就換回原本的樣子
      const preview = { ...profile };
      if (kind === 'fur') preview.fur = val;
      else if (kind === 'tail') preview.tail = val;
      else preview.ear = val;
      applyLook(preview);
      const name = kind === 'fur' ? FUR_PALETTES[val]?.name : t(item.zh);
      // 🖼️ 確認視窗裡直接放一張「換上之後」的樣子（11/07：視窗會擋住角色，看不到身上的預覽）
      const look = { fur: preview.fur ?? 0, species: sp, tail: preview.tail || SPECIES_TAIL[sp], ears: preview.ear || SPECIES_EARS[sp] }; // 角色吃的是 ears（之前寫成 ear，耳朵預覽都一樣）
      const img = snapshot(`look:${sp}:${look.fur}:${look.tail}:${look.ears}:${kind}`, () => {
        const ch = new ProceduralFox(look);
        ch.root.rotation.y = kind === 'tail' ? 2.5 : 0.45; // 尾巴：轉到看得到背後
        const g = new THREE.Group();
        g.add(ch.root);
        return g;
      });
      const ok = await confirmBuy.ask({ icon: item.icon, name, price: item.price, img, desc: t('換上之後的樣子（身上也先換上了）'), coins: pinecones });
      if (!ok) return applyLook(profile);
      const res = await net.request('buyLook', { kind, id: val });
      if (!res?.ok) return hud.toast(res?.reason === 'poor' ? t('松果不夠喔 🌰') : t('沒買成，再試一次吧'));
      myLooks = res.looks ?? myLooks;
      audio.sfx('bell');
      hud.toast(t('🐾 買到了！已經幫你換上'));
    }
    // 換上：動物本來的形狀記成空的（換動物時跟著變）
    const next = { ...profile };
    if (kind === 'fur') next.fur = val;
    else if (kind === 'tail') next.tail = SPECIES_TAIL[sp] === val ? '' : val;
    else next.ear = SPECIES_EARS[sp] === val ? '' : val;
    profile = { ...next, custom: true, customLook: true };
    applyLook(profile);
    saveProfile(profile);
    net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '' });
    net.rejoin({ auto: !profile.custom, name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '', code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
    audio.sfx('tap');
    if (fishingUI.el.modal.classList.contains('show')) fishingUI.openCreel('outfit');
  }
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
    if (why === 'all') {
      // 🎁 作者在 /stats 按了「拿到全部造型」
      look.dailyGot = look.weeklyGot = true;
      look.dateNext = null;
      audio.sfx('bell');
      return hud.toast(t('🎁 拿到全部造型了！按上方「👒 造型」挑一件穿'), 6000);
    }
    if (id === look.daily) look.dailyGot = true;
    if (id === look.weekly) look.weeklyGot = true;
    if (why === 'date') look.dateNext = null;
    audio.sfx('bell');
    const msg =
      why === 'sponsor'
        ? t('💇 拿到贊助限定假髮：{name}', { name: outfitName(id) })
        : why === 'weekly'
        ? t('🌟 朋友透過你的連結來玩了！拿到每週限定造型：{name}', { name: outfitName(id) })
        : why === 'date'
          ? t('🔥 營火之約成立！拿到限定造型：{name}', { name: outfitName(id) })
          : why === 'daily'
            ? t('👒 朋友點了你的連結！拿到今天的每日造型：{name}', { name: outfitName(id) })
            : why === 'chal'
            ? t('🎯 今日挑戰全部完成！拿到今天的每日造型：{name}', { name: outfitName(id) })
            : why === 'staff'
            ? t('🎁 營地作者送你一款造型：{name}', { name: outfitName(id) })
            : t('👒 拿到今天的每日造型：{name}', { name: outfitName(id) });
    hud.toast(`${msg}${t('（按上方「👒 造型」穿上）')}`, 6500);
    // 還沒穿這個部位：直接幫他穿上，馬上看得到
    const o = OUTFIT_BY_ID[id];
    if (o && !look.wear?.[o.slot]) wearOutfit(id);
  });
  // 🎯 今日挑戰的進度（做完一題跳一下）
  net.on('chal', ({ list, id, done }) => {
    const c = list?.find((x) => x.id === id);
    if (!c || done) return giftPanel.refresh();
    const d = CHALLENGE_BY_ID[id];
    if (c.have >= c.need) hud.toast(t('🎯 今日挑戰：{icon} {name} 完成！（{k}/{n} 題）', { icon: d.icon, name: t(d.zh), k: list.filter((x) => x.have >= x.need).length, n: list.length }), 4000);
    giftPanel.refresh();
  });
  // 🎁 作者在管理頁送的家具
  net.on('staffGift', ({ kind, id, home }) => {
    if (home) setMyHome(home);
    audio.sfx('bell');
    if (kind === 'furn') hud.toast(t('🎁 營地作者送你一件家具：{icon} {name}！回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }), 6000);
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
      const n = GATHER_ITEMS.filter((x) => !x.month && found(x.id)).length;
      hud.toast(t('📖 圖鑑新收錄：{icon} {name}！+{n} 🌰（{c}／{t}）', { icon: it.icon, name: t(it.zh), n: res.gain, c: n, t: GATHER_ITEMS.filter((x) => !x.month).length }), 4500);
      if (res.bonus) setTimeout(() => hud.toast(t('🏆 採集圖鑑全部收集完成！再送你 {n} 顆松果', { n: res.bonus }), 6000), 2500);
      if (res.bonus) setTimeout(() => dexPop(t('採集圖鑑'), '🍄'), 9000);
    } else {
      hud.toast(res.extra ? t('🧺 採到{icon} {name}，採集達人多拿一個！（採集籃裡有 {n} 個）', { icon: it.icon, name: t(it.zh), n: res.count }) : t('🧺 採到{icon} {name}（採集籃裡有 {n} 個）', { icon: it.icon, name: t(it.zh), n: res.count }), 2200);
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
    title: () => t('🍄 採集圖鑑 {n}／{total}', { n: GATHER_ITEMS.filter((x) => !x.month && found(x.id)).length, total: GATHER_ITEMS.filter((x) => !x.month).length }),
    render: () => {
      const card = (x) =>
        found(x.id)
          ? `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${t(x.zh)}</b><small>${rarityStars(x.rarity)}${museum[x.id] ? ' 🏛️' : ''}</small><em>${t('採集籃裡 ×{n}', { n: basket[x.id] ?? 0 })}</em></div>`
          : `<div class="dex-card unknown"><i class="dex-emoji">${x.icon}</i><b>${t('？？？')}</b><small>${rarityStars(x.rarity)}${x.night ? ' 🌙' : x.day ? ' ☀️' : ''}</small><em>${t(x.hint)}</em></div>`;
      const groups = GATHER_TYPES.map((ty) => {
        const cards = GATHER_ITEMS.filter((x) => x.type === ty.id && !x.month).map(card).join('');
        return `<div class="dex-note">${ty.icon} ${t(ty.zh)}</div><div class="dex-grid">${cards}</div>`;
      }).join('');
      // 🗓️ 每月限定：這個月的、或撿過的才顯示（不算進全收集）
      const lim = GATHER_ITEMS.filter((x) => x.month && (x.month === taipeiMonth() || found(x.id)));
      const limited = lim.length ? `<div class="dex-note">${t('🗓️ 每月限定（不算進全收集，隔年同一個月會再出現）')}</div><div class="dex-grid">${lim.map(card).join('')}</div>` : '';
      const veg = CROPS.filter((c) => basket[c.id] > 0).map((c) => `${c.icon} ${t(c.zh)} ×${basket[c.id]}`).join('　');
      const total = Object.values(basket).reduce((a, b) => a + b, 0);
      return `<div class="dex-note">${t('🍄 迷霧森林：地上有發光圈圈的蘑菇、果實、野花，走過去按 E 採摘；空中飛的蟲蟲要用捕蟲網（{p} 🌰）按 E 捕。🐚 湖畔碼頭的岸邊可以撿石頭和貝殼。✨ 晚上 8～10 點營火附近偶爾會有寶藏。第一次找到新的種類送松果，全部收集完再送 {b} 顆 🌰', { p: NET_PRICE, b: GATHER_DEX_BONUS })}</div>
        <div class="dex-note">${netOwned ? t('🦋 捕蟲網：已經有了') : t('🦋 捕蟲網：還沒有')}${!netOwned && net.online ? ` <button type="button" class="mini-btn" id="buy-net">${t('買一支 🌰 {p}', { p: NET_PRICE })}</button>` : ''}</div>
        ${groups}
        ${limited}
        ${veg ? `<div class="dex-note">${t('🥕 菜園收成')}：${veg}</div>` : ''}
        ${(() => {
          const rc = TRASH.filter((x) => basket[x.id] > 0).map((x) => `${x.icon} ${t(x.zh)} ×${basket[x.id]}`).join('　');
          return rc ? `<div class="dex-note">${t('♻️ 回收材料')}：${rc}</div>` : '';
        })()}
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
    if (!(await confirmBuy.ask({ icon: '🦋', name: t('捕蟲網'), price: NET_PRICE, desc: t('買了就能捕捉空中飛的蟲蟲'), coins: pinecones }))) return;
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
  let eatBusy = false;
  /** 料理的效果小標籤：👟 腳步輕快 Lv2・走路變快 */
  const fxTag = (id) => {
    const fx = DISH_FX[id];
    const b = fx && BUFFS[fx[0]];
    return b ? `<small class="fx-tag">${b.icon} ${t(b.zh)}${fx[1] > 1 ? ' ★★' : ' ★'}・${t(b.desc)}・${t('10 分鐘')}</small>` : '';
  };
  // ---------- 😋 吃料理的小效果（10 分鐘） ----------
  let buff = null;
  const setBuff = (b) => {
    buff = activeBuff(b) ? b : null;
    const a = activeBuff(buff);
    actions.buffSpeed = a?.k === 'speed' ? a.v : 1;
    hud.setBuff?.(a ? { icon: a.icon, name: t(a.zh), desc: t(a.desc), until: a.until } : null);
  };
  setInterval(() => {
    if (buff && !activeBuff(buff)) {
      setBuff(null);
      hud.toast(t('飽飽的效果結束了，再吃一道吧 😋'));
    }
  }, 5000);
  /** 在料理鍋旁邊才能煮 */
  const atPot = () => roomMgr?.current.id === 'forest_main' && forest.nearPot?.(player.position);
  /** 🍖 在自家門口的烤肉爐旁邊（從烤肉爐打開料理時設定，離開營地或走開就失效） */
  let grillAt = null;
  const atGrill = () => roomMgr?.current.id === 'campground' && grillAt && Math.hypot(player.position.x - grillAt.x, player.position.z - grillAt.z) < 3;
  fishingUI.extraTabs.push({
    id: 'cook',
    label: t('🍲 料理'),
    title: () => t('🍲 營火料理 {n}／{total}', { n: DISHES.filter((d) => !d.month && cooked.has(d.id)).length, total: DISHES.filter((d) => !d.month).length }),
    render: () => {
      const grill = atGrill();
      const here = atPot() || grill;
      const mine = DISHES.filter((d) => dishes[d.id] > 0);
      const others = [...remotes.players.values()].filter((r) => !r.npc);
      const myDishes = mine.length
        ? mine
            .map(
              (d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${t(d.zh)} ×${dishes[d.id]}</b>${fxTag(d.id)}</div>
                <button type="button" class="mini-btn" data-eat="${d.id}">${t('😋 吃')}</button>
                ${others.length ? `<select class="mini-sel" data-gift="${d.id}"><option value="">${t('🎁 送給⋯')}</option>${others.map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}</select>` : ''}</div>`,
            )
            .join('')
        : `<div class="dex-note">${t('還沒有料理，煮一道吧！')}</div>`;
      // 🗓️ 每月限定的料理：那個月才出現在食譜（煮過的一直看得到）
      const recipes = DISHES.filter((d) => !d.month || d.month === taipeiMonth() || cooked.has(d.id)).map((d) => {
        const season = !d.month || d.month === taipeiMonth();
        const ok = canMake(basket, d.need) && (!d.grill || grill) && season;
        const tag = d.grill ? `<small class="grill-tag">${t('🍖 門口烤肉爐限定')}</small>` : d.month ? `<small class="grill-tag">${t('🗓️ {m} 月限定', { m: d.month })}</small>` : '';
        return `<div class="craft-row ${cooked.has(d.id) ? '' : 'new-dish'}"><i class="dex-emoji">${cooked.has(d.id) ? d.icon : '❔'}</i><div class="craft-info"><b>${cooked.has(d.id) ? t(d.zh) : t('？？？（還沒煮過）')}</b>${tag}${cooked.has(d.id) ? fxTag(d.id) : ''}<div class="needs">${needHtml(d.need)}</div></div><button type="button" class="mini-btn" data-cook="${d.id}" ${ok && here && net.online ? '' : 'disabled'}>${t('煮')}</button></div>`;
      }).join('');
      return `<div class="dex-note">${grill ? t('🍖 在自家門口的烤肉爐旁邊，可以開始煮了！（烤肉爐限定的料理也能做）') : here ? t('🔥 在料理鍋旁邊，可以開始煮了！') : t('到中央營火旁的「🍲 營火料理」鍋子才能煮（自家門口有烤肉爐的話，在家也能煮）。蔬菜在帳篷前的小菜園種。')}</div>
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
            if (res.shared) setTimeout(() => hud.toast(t('🥢 大菜分給附近的 {n} 個人一起吃了', { n: res.shared }), 4000), 1200);
          } else hud.toast(res?.reason === 'notHere' ? t('到營火旁的料理鍋才能煮') : res?.reason === 'grill' ? t('這道要用自家門口的烤肉爐做') : t('材料不夠喔'));
          fishingUI.openCreel('cook');
        });
      }
      bindEat(body);
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
  /** 😋 吃料理（圖鑑的料理頁、🎒 背包共用） */
  function bindEat(body) {
    for (const b of body.querySelectorAll('[data-eat]')) {
      b.addEventListener('click', async () => {
        // 按下去馬上有反應：按鈕變暗、關掉視窗，讓大家看到你在吃
        if (eatBusy) return;
        eatBusy = true;
        for (const x of body.querySelectorAll('[data-eat]')) x.disabled = true;
        const res = await net.request('eat', { id: b.dataset.eat });
        setTimeout(() => (eatBusy = false), 1600); // 伺服器 1.5 秒冷卻
        if (res?.ok) {
          dishes = res.dishes;
          fishingUI.el.modal.classList.remove('show');
          audio.sfx('tap');
          setBuff(res.buff);
          const bf = activeBuff(res.buff);
          const d = DISH_BY_ID[b.dataset.eat];
          actions.eatDish(d?.color ?? 0xe8a050); // 🍲 捧著小碗吃的動作（大家看得到）
          hud.toast(bf ? t('😋 {icon} {name}：{bicon} {buff} 10 分鐘', { icon: d?.icon ?? '', name: t(d?.zh ?? ''), bicon: bf.icon, buff: t(bf.zh) }) : t('😋 好吃！{icon} {name}', { icon: d?.icon ?? '', name: t(d?.zh ?? '') }), 5000);
        } else {
          for (const x of body.querySelectorAll('[data-eat]')) x.disabled = false;
          if (res?.reason === 'tooFast') hud.toast(t('慢慢吃，一口一口來 😋'));
        }
      });
    }
  }
  /** 🎒 背包（11/07 作者：吃料理不用再進圖鑑或造型）：🍱 料理、🧺 採集籃、👒 造型 */
  function openBag(tab = 'dish') {
    if (!net.online) return hud.toast(t('連上伺服器才能打開背包'));
    const tabs = [
      ['dish', t('🍱 料理')],
      ['basket', t('🧺 採集籃')],
      ['look', t('👒 造型')],
    ];
    // 11/09 作者：背包改成一般遊戲那種「格子＋縮圖」：大圖示、右下角數量、下面小字名稱；點一格看說明（料理可以吃）
    const cell = (icon, name, n, key) => `<button type="button" class="inv-cell" data-inv="${key}"><i>${icon}</i><em>${n}</em><small>${name}</small></button>`;
    let html = '';
    const info = {}; // 點格子後下面顯示的說明
    if (tab === 'dish') {
      const mine = DISHES.filter((d) => dishes[d.id] > 0);
      for (const d of mine) info[d.id] = `<b>${d.icon} ${t(d.zh)} ×${dishes[d.id]}</b>${fxTag(d.id)}<button type="button" class="mini-btn" data-eat="${d.id}">${t('😋 吃')}</button>`;
      html = mine.length
        ? `<div class="inv-grid">${mine.map((d) => cell(d.icon, t(d.zh), dishes[d.id], d.id)).join('')}</div>`
        : `<div class="dex-note">${t('還沒有料理。到營火旁的「🍲 營火料理」鍋子煮一道吧！')}</div>`;
    } else if (tab === 'basket') {
      const groups = [
        ...GATHER_TYPES.map((ty) => [`${ty.icon} ${t(ty.zh)}`, GATHER_ITEMS.filter((x) => x.type === ty.id && basket[x.id] > 0)]),
        [t('🥕 蔬菜'), CROPS.filter((c) => basket[c.id] > 0)],
        [t('♻️ 回收材料'), TRASH.filter((x) => basket[x.id] > 0)],
      ].filter(([, list]) => list.length);
      for (const [, list] of groups) for (const x of list) info[x.id] = `<b>${x.icon} ${t(x.zh)} ×${basket[x.id]}</b>${x.hint ? `<small class="fx-tag">${t(x.hint)}</small>` : ''}`;
      html = groups.length
        ? groups.map(([title, list]) => `<div class="dex-note">${title}</div><div class="inv-grid">${list.map((x) => cell(x.icon, t(x.zh), basket[x.id], x.id)).join('')}</div>`).join('')
        : `<div class="dex-note">${t('採集籃是空的。去迷霧森林、湖邊採採看吧 🍄')}</div>`;
      html += `<div class="dex-note">${t('採集籃的東西可以煮料理（「🍲 營火料理」鍋子）、做家具（「📖 圖鑑 → 🔨 手作」）')}</div>`;
    }
    if (Object.keys(info).length) html += `<div class="inv-info" hidden></div>`;
    modal.open(
      t('🎒 背包'),
      `<div class="shop-cats bag-tabs">${tabs.map(([id, label]) => `<button type="button" data-bag="${id}" class="${id === tab ? 'on' : ''}">${label}</button>`).join('')}</div>${html}`,
      (body) => {
        for (const b of body.querySelectorAll('[data-bag]')) b.addEventListener('click', () => (b.dataset.bag === 'look' ? (modal.close(), fishingUI.openCreel('outfit')) : openBag(b.dataset.bag)));
        const box = body.querySelector('.inv-info');
        for (const c of body.querySelectorAll('[data-inv]')) {
          c.addEventListener('click', () => {
            for (const o of body.querySelectorAll('.inv-cell.on')) o.classList.remove('on');
            c.classList.add('on');
            box.innerHTML = info[c.dataset.inv] ?? '';
            box.hidden = false;
            bindEat(box);
          });
        }
        // 料理：一打開就先選第一格，吃東西不用多點一下
        if (tab === 'dish') body.querySelector('[data-inv]')?.click();
      },
    );
  }
  document.getElementById('bag-btn').addEventListener('click', () => openBag());
  net.on('ate', ({ id, dish }) => {
    const d = DISH_BY_ID[dish];
    if (!d) return;
    bubbles.show(id === net.id ? 'self' : id, `${d.icon}😋💕`, { emoji: true });
  });
  net.on('cooked', ({ id, name, dish }) => {
    const d = DISH_BY_ID[dish];
    if (d && id !== net.id) hud.toast(t('🍲 {name} 煮了一道{icon} {dish}', { name, icon: d.icon, dish: t(d.zh) }), 3500);
  });
  net.on('dishGift', ({ from, dish, dishes: all, share }) => {
    dishes = all ?? dishes;
    const d = DISH_BY_ID[dish];
    audio.sfx('bell');
    if (share) return hud.toast(t('🥢 {name} 煮了一大鍋{icon} {dish}，分你一份！點「🎒 背包」就能吃', { name: from, icon: d?.icon ?? '', dish: t(d?.zh ?? '') }), 6000);
    hud.toast(t('🎁 {name} 送你一份{icon} {dish}！點「🎒 背包」就能吃', { name: from, icon: d?.icon ?? '', dish: t(d?.zh ?? '') }), 6000);
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
          // 🌙 只能晚上收的作物（月光白蘿蔔）：白天先顯示「晚上才能收」
          if (c.night && !isNight()) return `<div class="garden-slot ready"><b>${c.icon} ${t(c.zh)}・${t('長好了，晚上才能收成 🌙')}</b>${water ? `<small>${water}</small>` : ''}</div>`;
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
          if (!(await confirmBuy.ask({ icon: '🌱', name: t('開墾第 {n} 格菜園', { n: res.slots.length + 1 }), price: res.next, coins: pinecones }))) return;
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
            } else if (r?.reason === 'night') hud.toast(t('🌙 月光白蘿蔔要晚上才能收成喔'));
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
  // ---------- 🚙 門口擺設：按 E 跳出能做的事（只有一種就直接做） ----------
  const sitYard = (st) => {
    if (remotes.anyNear(st.x, st.z, 0.3)) return hud.toast(t('這個位置有人了'));
    actions.sit({ ...st, yard: true });
    return true;
  };
  async function openMailbox() {
    const res = await net.request('mailbox');
    if (!res?.ok) return hud.toast(t('還沒連上伺服器，等一下再試'));
    const when = (at) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at));
    const visits = res.visits.length ? res.visits.map((v) => `<div class="craft-row"><div class="craft-info"><b>👣 ${escapeHtml(v.n)}</b><small>${when(v.at)}</small></div></div>`).join('') : `<div class="dex-note">${t('還沒有人來過，邀朋友來玩吧！')}</div>`;
    const notes = res.notes.length ? res.notes.map((n) => `<div class="craft-row"><div class="craft-info"><b>✉️ ${escapeHtml(n.n)}</b><div>${escapeHtml(n.t)}</div><small>${when(n.at)}</small></div></div>`).join('') : `<div class="dex-note">${t('還沒有留言')}</div>`;
    modal.open(t('📮 我的信箱'), `<div class="dex-note">${t('👣 最近誰來過我家')}</div>${visits}<div class="dex-note">${t('✉️ 大家的留言')}</div>${notes}`);
  }
  function writeYardNote(hid, name) {
    modal.open(t('✉️ 在 {name} 的郵筒留言', { name: name || t('旅人') }), `<div class="dex-note">${t('留一句話給主人（最多 60 字），主人打開郵筒就看得到')}</div><input class="join-input" id="ynote" maxlength="60" /><div class="outfit-today"><button type="button" id="ynote-go">${t('投進郵筒')}</button></div>`, (body) => {
      const inp = body.querySelector('#ynote');
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      body.querySelector('#ynote-go').addEventListener('click', async () => {
        const r = await net.request('yardNote', { hid, text: inp.value });
        if (r?.ok) {
          modal.close();
          audio.sfx('bell');
          hud.toast(t('✉️ 投進郵筒了'));
        } else hud.toast(r?.reason === 'tooFast' ? t('等一下再留言') : t('沒有送出，再試一次'));
      });
    });
  }
  function putPicnic() {
    const mine = DISHES.filter((d) => dishes[d.id] > 0);
    if (!mine.length) return hud.toast(t('還沒有料理，先去煮一道吧'));
    modal.open(t('🧺 把料理放上野餐桌'), `<div class="dex-note">${t('放上桌的料理，路過的人每天可以拿一份（同一種最多 5 份）')}</div>${mine.map((d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${t(d.zh)} ×${dishes[d.id]}</b></div><button type="button" class="mini-btn" data-put="${d.id}">${t('放一份')}</button></div>`).join('')}`, (body) => {
      for (const b of body.querySelectorAll('[data-put]')) {
        b.addEventListener('click', async () => {
          const r = await net.request('picnicPut', { id: b.dataset.put });
          if (r?.ok) {
            dishes = r.dishes;
            audio.sfx('bell');
            hud.toast(t('🧺 放上桌了（桌上 {n} 份）', { n: r.n }));
            putPicnic();
          } else hud.toast(r?.reason === 'other' ? t('桌上已經有別的料理，等大家拿完再放') : r?.reason === 'full' ? t('桌上已經放滿 5 份了') : t('沒有放成功'));
        });
      }
    });
  }
  actions.onYard = async (plot, seats, yard) => {
    if (!net.online) return hud.toast(t('連上伺服器才能用'));
    const id = yard.id;
    const u = YARD_USES[id] ?? {};
    const mine = !!plot.tent.mine;
    const hid = plot.tent.hid;
    const owner = plot.tent.name || t('旅人');
    const info = u.use?.includes('picnic') ? await net.request('yardInfo', { hid }) : null;
    const opts = [];
    const sitN = seats.filter((x) => !x.sleep).length;
    let k = 0;
    for (const st of seats) {
      if (!st.sleep) k++;
      const label = st.sleep ? (st.inside ? t('🛏️ 進車裡睡一下') : t('🛏️ 躺下')) : st.driver ? t('🚙 坐駕駛座') : sitN > 1 ? t('🪑 坐第 {n} 個位置', { n: k }) : t('🪑 坐下');
      opts.push({ label, fn: () => sitYard(st) });
    }
    for (const use of u.use ?? []) {
      if (use === 'mail') opts.push(mine ? { label: t('📮 看信箱（誰來過、留言）'), fn: openMailbox } : { label: t('✉️ 在郵筒留一句話'), fn: () => writeYardNote(hid, owner) });
      else if (use === 'picnic') {
        if (mine) opts.push({ label: t('🍽️ 把料理放上桌'), fn: putPicnic });
        const pic = info?.picnic;
        if (!mine) {
          if (!pic) opts.push({ label: t('桌上還沒有料理'), off: true });
          else if (pic.took) opts.push({ label: t('今天已經拿過一份了'), off: true });
          else
            opts.push({
              label: t('😋 拿一份{icon} {name}（還有 {n} 份）', { icon: DISH_BY_ID[pic.dish]?.icon ?? '', name: t(DISH_BY_ID[pic.dish]?.zh ?? ''), n: pic.n }),
              fn: async () => {
                const r = await net.request('picnicTake', { hid });
                if (r?.ok) {
                  dishes = r.dishes;
                  audio.sfx('bell');
                  hud.toast(t('😋 拿到一份{icon} {name}！到「📖 圖鑑 → 🍲 料理」可以吃', { icon: DISH_BY_ID[r.dish]?.icon ?? '', name: t(DISH_BY_ID[r.dish]?.zh ?? '') }), 5000);
                } else hud.toast(r?.reason === 'took' ? t('今天已經拿過一份了') : t('桌上的料理被拿完了'));
              },
            });
        } else if (pic) opts.push({ label: t('桌上現在有 {n} 份{name}', { n: pic.n, name: t(DISH_BY_ID[pic.dish]?.zh ?? '') }), off: true });
      } else if (use === 'grill') {
        opts.push(
          mine
            ? {
                label: t('🍖 用烤肉爐做料理'),
                fn: () => {
                  grillAt = { x: yard.col.x, z: yard.col.z };
                  fishingUI.openCreel('cook');
                },
              }
            : { label: t('這是 {name} 的烤肉爐', { name: owner }), off: true },
        );
      } else if (use === 'bike') opts.push({ label: t('🚲 騎上去（營地裡跑比較快）'), fn: () => actions.ride() });
      else if (use === 'canoe') opts.push({ label: t('🛶 划到湖畔碼頭'), fn: () => hud.onGo('lake_dock') });
      else if (use === 'drive') {
        const drv = seats.find((x) => x.driver);
        opts.push({
          label: t('🧭 開車去別的地方'),
          fn: () => {
            if (drv && !sitYard(drv)) return;
            setTimeout(() => hud.el.goChip.click(), 150);
          },
        });
      } else if (use === 'cooler' && mine) opts.push({ label: t('🧊 料理保冷箱（看我的料理）'), fn: () => fishingUI.openCreel('cook') });
    }
    const live = opts.filter((o) => !o.off);
    if (opts.length === 1 && live.length === 1) return live[0].fn();
    const y = YARD_BY_ID[id];
    modal.open(
      `${y?.icon ?? ''} ${mine ? t(y?.zh ?? '') : t('{name} 的{item}', { name: owner, item: t(y?.zh ?? '') })}`,
      `<div class="yard-opts">${opts.map((o, i) => `<button type="button" class="mini-btn" data-yo="${i}" ${o.off ? 'disabled' : ''}>${o.label}</button>`).join('')}</div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-yo]')) {
          b.addEventListener('click', () => {
            const o = opts[Number(b.dataset.yo)];
            modal.close();
            o.fn?.();
          });
        }
      },
    );
  };
  actions.onGarden = (plot) => {
    if (!net.online) return hud.toast(t('連上伺服器才能種菜'));
    if (plot.tent.demo) return;
    openGarden(plot);
  };
  net.on('gardenWatered', ({ name, c }) => {
    const crop = CROP_BY_ID[c];
    hud.toast(t('💧 {name} 幫你的{icon} {crop}澆了水，少等 30 分鐘！', { name, icon: crop?.icon ?? '', crop: t(crop?.zh ?? '') }), 5000);
  });

  // ---------- ♻️ 撿垃圾 ----------
  /** 垃圾袋（還沒丟回收桶的）、垃圾圖鑑（撿過的種類） */
  let tbag = {};
  let tdex = {};
  const setTrash = (r) => {
    if (r?.tbag) tbag = r.tbag;
    if (r?.tdex) tdex = r.tdex;
  };
  const trashToast = (r) => {
    const it = TRASH_BY_ID[r.id];
    if (!it) return;
    if (r.first) hud.toast(t('♻️ 垃圾圖鑑新收錄：{icon} {name}！+{n} 🌰（{c}／{t}）', { icon: it.icon, name: t(it.zh), n: r.gain, c: Object.keys(tdex).length, t: TRASH.length }), 4500);
    else hud.toast(t('♻️ 撿起了{icon} {name}，記得拿去營火旁的回收桶', { icon: it.icon, name: t(it.zh) }), 3000);
    if (r.done) setTimeout(() => hud.toast(t('🏆 垃圾圖鑑全部收集完成！送你「淨灘小隊領巾」'), 6000), 2500);
    if (r.done) setTimeout(() => dexPop(t('垃圾圖鑑'), '♻️'), 9000);
  };
  /** 地上的垃圾在哪個房間 */
  const trashRoom = (id) => rooms[id]?.trash ?? (id === 'forest_main' ? forest.trash : null);
  net.on('trash', ({ room, list, by, byId, item }) => {
    if (roomMgr?.current.id === room) trashRoom(room)?.setList(list);
    if (by && byId !== net.id) {
      const it = TRASH_BY_ID[item];
      if (it) hud.toast(t('♻️ {name} 撿起了{icon} {item}', { name: by, icon: it.icon, item: t(it.zh) }), 2500);
    }
  });
  net.on('trashGot', (r) => {
    setTrash(r);
    setTimeout(() => trashToast(r), 2800); // 等釣魚卡片先秀完
  });
  actions.onTrash = async (tb) => {
    const face = Math.atan2(tb.x - player.position.x, tb.z - player.position.z);
    // 🚲 騎車中：不用停下來彎腰，直接撿進垃圾袋
    if (actions.state !== 'ride' && !actions.perform('pick', 1.25, face)) return;
    const res = await net.request('pickTrash', { k: tb.k });
    if (!res?.ok) return hud.toast(res?.reason === 'gone' ? t('哎呀，被別人先撿走了') : t('再靠近一點'));
    setTrash(res);
    audio.sfx(res.first ? 'bell' : 'tap');
    trashToast(res);
  };
  actions.onRecycle = async () => {
    const n = Object.values(tbag).reduce((a, b) => a + b, 0);
    if (!net.online) return hud.toast(t('連上伺服器才能回收'));
    if (!n) {
      const info = await net.request('trashInfo');
      return hud.toast(t('垃圾袋是空的。湖邊、帳篷營地路邊、營火附近偶爾會有垃圾，撿起來再拿過來丟 ♻️（今天大家一起回收了 {n} 件）', { n: info?.todayAll ?? 0 }), 5000);
    }
    // 🔨 11/07：回收桶兩個選擇：換松果，或留著當手作材料（放進採集籃）
    const keep = await new Promise((resolve) => {
      const bag = Object.entries(tbag).filter(([, k]) => k > 0).map(([id, k]) => `${TRASH_BY_ID[id]?.icon ?? ''}×${k}`).join(' ');
      modal.open(
        t('♻️ 回收桶'),
        `<div class="recycle-pick">
          <div class="dex-note">${t('🗑️ 垃圾袋')}：${bag}</div>
          <button type="button" class="help-manual-btn" data-keep="0">${t('🌰 換松果（每件 1 顆）')}</button>
          <button type="button" class="help-manual-btn" data-keep="1">${t('🔨 留著做手作（放進採集籃）')}</button>
          <div class="dex-note">${t('寶特瓶、舊輪胎、浮標⋯⋯可以做成回收手作家具，在「📖 圖鑑 → 🔨 手作」看配方')}</div>
        </div>`,
        (body) => {
          for (const b of body.querySelectorAll('[data-keep]')) b.addEventListener('click', () => (modal.close(), resolve(b.dataset.keep === '1')));
        },
      );
      const off = setInterval(() => !modal.isOpen && (clearInterval(off), resolve(null)), 400); // 關掉視窗＝不丟
    });
    if (keep === null) return;
    if (!actions.perform('pick', 1.0)) return;
    const res = await net.request('recycle', keep ? { keep: true } : {});
    if (!res?.ok) return;
    setTrash(res);
    audio.sfx('bell');
    if (res.kept) {
      if (res.basket) basket = res.basket;
      return hud.toast(t('🔨 {n} 件放進採集籃了，可以拿來做回收手作家具', { n: res.n }), 4500);
    }
    hud.toast(
      (res.gain ? t('♻️ 丟進回收桶了！{n} 件垃圾 +{g} 🌰', { n: res.n, g: res.gain }) : t('♻️ 丟進回收桶了！今天換松果的次數已經滿了，謝謝你讓營地更乾淨')) +
        t('（今天大家一起回收了 {d} 件）', { d: res.todayAll }),
      5000,
    );
  };
  fishingUI.extraTabs.push({
    id: 'trash',
    label: t('♻️ 垃圾'),
    title: () => t('♻️ 垃圾圖鑑 {n}／{total}', { n: Object.keys(tdex).length, total: TRASH.length }),
    render: () => {
      const cards = TRASH.map((x) =>
        tdex[x.id]
          ? `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${t(x.zh)}</b><small>${rarityStars(x.rarity)}</small><em>${t('撿過 {n} 次', { n: tdex[x.id] })}</em></div>`
          : `<div class="dex-card unknown"><i class="dex-emoji">${x.icon}</i><b>${t('？？？')}</b><small>${rarityStars(x.rarity)}</small><em>${x.where.map((w) => ({ lake: t('湖裡'), shore: t('湖邊'), camp: t('營地路邊'), fire: t('營火區') })[w]).join('・')}</em></div>`,
      ).join('');
      const bag = Object.entries(tbag).filter(([, n]) => n > 0).map(([id, n]) => `${TRASH_BY_ID[id]?.icon ?? ''}×${n}`).join(' ');
      return `<div class="dex-note">${t('湖裡釣魚、湖邊、帳篷營地的路邊、中央營火區，偶爾會出現垃圾，走過去按 E 撿起來。撿到的垃圾拿去營火旁的「♻️ 回收桶」丟，每件換 1 顆松果（每天最多 {cap} 顆）。全部收集完送「淨灘小隊領巾」♻️', { cap: RECYCLE_DAILY_CAP })}</div>
        <div class="dex-note">${t('🗑️ 垃圾袋')}：${bag || t('空的')}</div>
        <div class="dex-grid">${cards}</div>`;
    },
  });

  // ---------- 🎫 營火月票（綠界付款，付完自動開通） ----------
  let passState = { until: 0, active: false, today: false };
  function setPass(p) {
    if (!p) return;
    passState = { ...passState, ...p };
    hud.passBadge = passState.active ? (PASS_TIERS[passState.tier] ?? PASS).icon : ''; // 🔥 小營火／✨ 星空徽章
    hud.setMe(myName);
  }
  const fmtDate = (ms) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' }).format(new Date(ms));
  async function openPass() {
    const info = net.online ? await net.request('passInfo') : null;
    if (info?.ok) setPass(info);
    // 剩幾天：用台北的日期算（跟括號裡的「到 幾月幾日」一致），不用小時數無條件進位
    const tpDay = (ms) => Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ms)));
    const left = passState.active ? Math.max(1, Math.round((tpDay(passState.until) - tpDay(Date.now())) / 86400000)) : 0;
    const cur = passState.active ? PASS_TIERS[passState.tier] ?? PASS : null;
    const status = cur
      ? t('✅ {icon} {name}月票使用中：到 {date}（還有 {n} 天）', { icon: cur.icon, name: t(cur.zh), date: fmtDate(passState.until), n: left }) + '　' + (passState.today ? t('今天的 {n} 顆已經領了', { n: cur.daily }) : '')
      : t('目前沒有月票');
    const off = info && !info.on;
    // 兩種月票並排：買的當天、每天、釣魚照價算的條數、掛機上限（免費玩家：30 條、30 顆）
    const tierCard = (T) => {
      let btn;
      if (cur?.id === 'star' && T.id === 'ember') btn = `<button type="button" disabled>${t('星空月票使用中')}</button>`;
      else if (cur?.id === 'ember' && T.id === 'star' && passState.upgrade) btn = `<button type="button" data-buy="star" data-up="1">${t('⬆️ 升級星空（補差價 NT$ {p}）', { p: passState.upgrade })}</button>`;
      else btn = `<button type="button" data-buy="${T.id}">${cur?.id === T.id ? t('再買一次（往後延 {n} 天）', { n: T.days }) : t('購買 NT$ {p}', { p: T.price })}</button>`;
      return `<div class="pass-tier pass-${T.id}${cur?.id === T.id ? ' on' : ''}">
        <div class="pass-tier-name">${T.icon} ${t(T.zh)}</div>
        <div class="pass-price">NT$ ${T.price} <small>/ ${t('{n} 天', { n: T.days })}</small></div>
        <ul class="pass-list">
          <li>${t('🌰 買的當天 +{n}', { n: T.first })}</li>
          <li>${t('🌰 每天第一次進來 +{n}', { n: T.daily })}</li>
          <li>${t('🎣 釣魚照價算 每天 {n} 條', { n: T.fish })}</li>
          <li>${t('💤 掛機每天上限 {n} 顆', { n: T.sit })}</li>
          <li>${t('{icon} 名字前面的徽章', { icon: T.icon })}</li>
        </ul>
        <div class="outfit-today" ${off ? 'hidden' : ''}>${btn}</div>
      </div>`;
    };
    modal.open(
      t('🎫 營火月票'),
      `<div class="pass-card">
        <div class="pass-tiers">${PASS_TIER_LIST.map(tierCard).join('')}</div>
        <div class="dex-note">${t('免費玩家：釣魚每天前 {f} 條照價算、掛機每天最多 {s} 顆。月票期間上限提高，越常玩多拿越多；到期後回到原本的上限，買過的東西都保留。⛺ 月票限定帳篷花色「營火之夜」買過就一直留著。', { f: FREE.fish, s: FREE.sit })}</div>
        <div class="outfit-today">${status}</div>
        ${info && !info.account ? `<div class="dex-note">${t('購買前要先建立帳號（👤 存檔），換手機登入月票才不會不見')}</div>` : ''}
        ${info?.test && info?.on ? `<div class="dex-note">${t('⚠️ 目前是綠界測試模式，不會真的扣款')}</div>` : ''}
        ${off ? `<div class="outfit-today">${t('🎫 月票即將推出，敬請期待！')}</div>` : ''}
        <div class="dex-note">${t('付款由綠界處理（信用卡、ATM、超商代碼），付款完成後自動開通，不用等人工。月票只會加快松果累積，遊戲裡所有東西不買也都拿得到。')}</div>
      </div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-buy]')) {
          b.addEventListener('click', async () => {
            if (info && !info.account) {
              modal.close();
              return hud.onMeClick?.({ focusAccount: true });
            }
            const T = PASS_TIERS[b.dataset.buy];
            const up = b.dataset.up === '1';
            const price = up ? passState.upgrade : T.price;
            // 先跳確認（金額、內容），按確定才去付款
            const ok = await confirmBuy.ask({
              icon: T.icon,
              name: up ? t('升級成星空月票') : t('{name}月票 {n} 天', { name: t(T.zh), n: T.days }),
              money: `NT$ ${price}`,
              desc: up ? t('剩下的天數不變，改成星空月票的待遇，並補送 {n} 顆松果', { n: PASS_TIERS.star.first - PASS_TIERS.ember.first }) : t('買的當天 +{a}、每天 +{b} 顆松果', { a: T.first, b: T.daily }),
            });
            if (!ok) return;
            // 先開好新分頁（手機上非同步之後才開會被擋）
            let win = null;
            try {
              win = window.open('', '_blank');
            } catch {
              /* 被擋就在同一頁開 */
            }
            const res = await net.request('passOrder', { tier: T.id, upgrade: up });
            if (!res?.ok) {
              win?.close();
              return hud.toast(res?.reason === 'account' ? t('購買前要先建立帳號（👤 存檔）') : t('現在不能購買，等一下再試'));
            }
            if (win) win.location.href = res.url;
            else location.href = res.url;
            hud.toast(t('🎫 已經打開綠界付款頁，付款完成後回到遊戲就會自動開通'), 6000);
          });
        }
      },
    );
  }
  hud.onPass = () => openPass();

  // ---------- ☕ 贊助：NT$100 以上自動拿到這個月的限定假髮 ----------
  const wigPics = new Map();
  /** 假髮的樣子：用一隻小貓戴著拍一張照（只畫一次，存成圖片） */
  const wigPicture = (id, yaw = 0.45) => {
    const pk = `${id}|${yaw}`;
    if (wigPics.has(pk)) return wigPics.get(pk);
    let url = '';
    try {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(220, 220, false);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7060, 1.5));
      const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
      key.position.set(2, 3, 3);
      sc.add(key);
      const rim = new THREE.DirectionalLight(0xffe0c0, 1.0);
      rim.position.set(-2, 2, -2);
      sc.add(rim);
      const c = new ProceduralFox({ fur: 2, species: 1 });
      c.setOutfit({ hair: id });
      c.update(0.016, 0, 0);
      sc.add(c.root);
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
      cam.position.set(Math.sin(yaw) * 2.5, 1.3, Math.cos(yaw) * 2.5);
      cam.lookAt(0, 0.85, 0);
      r.render(sc, cam);
      url = r.domElement.toDataURL('image/png');
      r.dispose();
      r.forceContextLoss?.();
    } catch {
      /* 畫不出來就只顯示文字 */
    }
    wigPics.set(pk, url);
    return url;
  };
  let wigPick = null;
  noticePanel.onSupport = async (el) => {
    if (!el || !net.online) return;
    const info = await net.request('sponsorInfo');
    if (!info?.ok || !info.wigs?.length || !info.on) return void (el.hidden = true); // 還沒開放：先不顯示假髮
    if (!info.wigs.includes(wigPick)) wigPick = info.wigs.find((id) => !info.owned.includes(id)) ?? info.wigs[0];
    const allOwned = info.wigs.every((id) => info.owned.includes(id));
    const card = (id) => {
      const o = OUTFIT_BY_ID[id];
      const pic = wigPicture(id);
      const picB = wigPicture(id, 2.6);
      const has = info.owned.includes(id);
      return `<button type="button" class="sw-card${id === wigPick ? ' on' : ''}${has ? ' has' : ''}" data-wig="${id}">
        ${pic ? `<span class="sw-pics"><img class="sw-pic" src="${pic}" alt=""><img class="sw-pic" src="${picB}" alt=""></span><small>${t('正面　　背面')}</small>` : `<div class="sw-emoji">${o.icon}</div>`}
        <span class="sw-name">${o.icon} ${t(o.zh)}</span>
        <small>${has ? t('✅ 已經有了') : o.sex === 'm' ? t('短髮款') : t('長髮款')}</small>
      </button>`;
    };
    el.hidden = false;
    el.innerHTML = `
      <div class="sw-title">${t('💇 這個月的贊助限定假髮（二選一）')}</div>
      <div class="sw-cards">${info.wigs.map(card).join('')}</div>
      <p>${t('先點選喜歡的那一款，贊助 NT${n} 以上，付款完成自動拿到，戴在頭上大家都看得到。每個月換新的兩款，男生女生都可以挑。', { n: info.min })}</p>
      ${
        allOwned
          ? `<div class="sw-has">${t('✅ 這個月的兩款你都有了，謝謝你的支持 💛')}</div>`
          : info.on
            ? `<div class="sw-amts">${info.amounts.map((a) => `<button type="button" data-amt="${a}">☕ NT$${a}${a >= info.min ? ' 💇' : ''}</button>`).join('')}</div>
               ${info.test ? `<div class="notice-hint">${t('⚠️ 測試模式：用綠界測試卡，不會真的扣款')}</div>` : ''}
               ${info.account ? '' : `<div class="notice-hint">${t('贊助前要先建立帳號（👤 存檔），假髮才不會不見')}</div>`}`
            : `<div class="sw-has">${t('☕ 贊助功能即將推出，敬請期待！')}</div>`
      }`;
    for (const b of el.querySelectorAll('[data-wig]')) {
      b.addEventListener('click', () => {
        wigPick = b.dataset.wig;
        for (const x of el.querySelectorAll('[data-wig]')) x.classList.toggle('on', x === b);
      });
    }
    for (const b of el.querySelectorAll('[data-amt]')) {
      b.addEventListener('click', async () => {
        if (!info.account) {
          noticePanel.close();
          return hud.onMeClick?.({ focusAccount: true });
        }
        if (Number(b.dataset.amt) >= info.min && info.owned.includes(wigPick)) return hud.toast(t('這一款你已經有了，選另一款吧'));
        let win = null;
        try {
          win = window.open('', '_blank');
        } catch {
          /* 被擋就在同一頁開 */
        }
        const res = await net.request('sponsorOrder', { amt: Number(b.dataset.amt), wig: wigPick });
        if (!res?.ok) {
          win?.close();
          return hud.toast(res?.reason === 'account' ? t('贊助前要先建立帳號（👤 存檔）') : t('現在不能贊助，等一下再試'));
        }
        if (win) win.location.href = res.url;
        else location.href = res.url;
        hud.toast(t('☕ 已經打開綠界付款頁，付款完成後回到遊戲就會自動拿到假髮'), 6000);
      });
    }
  };
  net.on('sponsored', ({ wig, got }) => {
    audio.sfx('bell');
    hud.toast(wig && got ? t('💛 謝謝你的贊助！拿到這個月的限定假髮「{name}」（到「👒 造型 → 💇 頭髮」戴上）', { name: t(OUTFIT_BY_ID[wig]?.zh ?? '') }) : t('💛 謝謝你的贊助！營火會一直燒下去 🔥'), 8000);
  });
  net.on('pass', (p) => {
    setPass(p);
    audio.sfx('bell');
    const T = PASS_TIERS[p.tier] ?? PASS;
    hud.toast(t('{icon} {name}月票開通了！到 {date}，先送你 {n} 顆松果，月票限定花色可以到小舖換上', { icon: T.icon, name: t(T.zh), date: fmtDate(p.until), n: p.gain ?? T.first }), 7000);
    if (modal.isOpen && fishingUI.el.modalTitle.textContent.startsWith('🎫')) openPass();
  });
  // 從綠界付款頁回來
  if (params.get('paid')) {
    setTimeout(() => hud.toast(t('🎫 付款完成的話，一兩分鐘內會自動開通（ATM、超商要等繳完費）'), 6000), 3000);
    params.delete('paid');
    history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
  }

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
      note: t('按「📤 分享」會順便複製下面的文案和連結：如果 App 只送出圖片，在聊天框貼上就好；朋友掃圖上的 QR Code 也算 📱') + (daily ? '　' + t('朋友點連結進來玩 1 分鐘，就送你今天的每日造型：{name}', { name: outfitName(daily.id) }) : ''),
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
      if (bonus) setTimeout(() => dexPop(t('魚類圖鑑'), '🐟'), 9000);
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
  // 📱 在 LINE、IG、FB、Threads 的內建瀏覽器（或被嵌在別的網站裡）玩，常常存不了進度，
  //    下次進來又變成新的人。跳一次小提示，請他用 Safari／Chrome 打開（11/08 作者同意）
  {
    const kind = inAppKind();
    let seen = false;
    try {
      seen = sessionStorage.getItem('cozy-inapp-tip') === '1';
      sessionStorage.setItem('cozy-inapp-tip', '1');
    } catch {
      /* 存不了也沒關係 */
    }
    if (kind && !seen) {
      const name = { line: 'LINE', ig: 'Instagram', fb: 'Facebook', threads: 'Threads', wechat: t('微信'), iframe: '' }[kind] ?? '';
      const el = document.createElement('div');
      el.className = 'inapp-tip';
      const url = new URL(location.href);
      if (kind === 'line') url.searchParams.set('openExternalBrowser', '1'); // LINE 支援：加這個參數會改用手機的瀏覽器打開
      el.innerHTML = `<b>${kind === 'iframe' ? t('📌 用完整版玩，進度才會保存') : t('📌 在 {app} 裡玩，進度可能存不起來', { app: name })}</b>
        <span>${kind === 'line' || kind === 'iframe' ? t('點下面的按鈕，用瀏覽器打開') : t('點右上角「⋯」→「用瀏覽器開啟」')}</span>
        <div class="inapp-btns">${kind === 'line' || kind === 'iframe' ? `<a class="mini-btn" href="${url.href}" target="${kind === 'iframe' ? '_blank' : '_self'}" rel="noopener">${t('👉 用瀏覽器打開')}</a>` : ''}<button type="button" class="mini-btn ghost">${t('知道了')}</button></div>`;
      el.querySelector('button').addEventListener('click', () => el.remove());
      setTimeout(() => document.body.appendChild(el), 2500);
    }
  }
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
    // 🌱 新手小任務 6 步做完：送 20 松果，再跳歡迎卡
    onIntroDone: async () => {
      if (net.online) await net.request('kidDone', {});
      setTimeout(showSeeYou, 8000);
      setTimeout(() => !welcome.visible && welcome.maybeShow(), 9000);
    },
    onComplete: (_task, firstTime) => {
      if (firstTime) setStage(1);
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
    // 🌱 新手小任務用
    get seatFire() {
      return !!actions.seat?.fire && actions.state !== 'free';
    },
    /** 離自己最近、沒人坐的營火圓木 */
    freeSeat() {
      const p = player.position;
      const free = FIRE_SEATS.filter((s) => !forest.seatTaken?.(s));
      return (free.length ? free : FIRE_SEATS).reduce((a, b) => (Math.hypot(a.x - p.x, a.z - p.z) <= Math.hypot(b.x - p.x, b.z - p.z) ? a : b));
    },
    tentPrice: TENT_PRICE,
    get coins() {
      return pinecones;
    },
    shopFront: SHOP_FRONT,
    get inMyHome() {
      return roomMgr?.current.id === 'home' && !!rooms.home.mine;
    },
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
    if (res.areas) {
      forest.setAreas(res.areas);
      hud.setAreas(res.areas);
    }
    if (res.museum) setMuseum(res.museum);
    if (res.treasures) applyTreasures(res.treasures);
    if (res.trash) trashRoom(res.room)?.setList(res.trash);
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
    // 🎲 隨機名字和線上的人撞名：伺服器換了一個
    if (res.name && res.name !== profile.name && !profile.custom) {
      profile = { ...profile, name: res.name };
      myName = res.name;
      hud.setMe(myName);
      net.updateJoinData({ name: res.name });
    }
    // 邀請連結只用一次（之後斷線重連不要又跑去朋友旁邊）
    if (params.has('with')) {
      net.updateJoinData({ with: undefined });
      params.delete('with');
      history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
    }
    hud.setInviteVisible(true);
    hud.el.passChip.hidden = !res.passOn; // 🎫 月票：伺服器開了才顯示
    payOn = !!res.passOn; // ☕ 贊助假髮也一樣：開了才顯示
    myCode = res.code ?? null;
    // 伺服器更新過、自己的畫面還是舊版：提醒重新整理
    const mine = document.querySelector('script[src*="assets/index-"]')?.getAttribute('src')?.match(/index-([\w-]+)\.js/)?.[1];
    if (res.ver && mine && res.ver !== mine && !document.getElementById('new-ver')) {
      document.getElementById('ui').insertAdjacentHTML('beforeend', `<button type="button" class="new-ver" id="new-ver">${t('🔥 營地有新東西了，點這裡重新整理')}</button>`);
      document.getElementById('new-ver').addEventListener('click', () => location.reload());
    }
    if (res.myHome) setMyHome(res.myHome);
    // 🏕️ 固定營位的提示（搬遷後第一次進來、或之前太久沒來營位讓出去了）
    if (res.plotNote) {
      const p = res.plotNote.plot;
      const msg = res.plotNote.kind === 'moved' ? t('🏕️ 好久不見！你的帳篷搬到 {p} 了（東西都在）', { p: plotName(p) }) : t('🏕️ 你的帳篷有了固定門牌：{p}', { p: plotName(p) });
      setTimeout(() => hud.toast(msg, 7000), 2500);
    }
    // 歡迎卡：老朋友一進來就打招呼；第一次來的人先直接玩小任務，完成後（或待滿 90 秒）才出現
    // 📰 重大更新公告：老朋友第一次看到才跳（這次就不跳歡迎卡）；新朋友直接記成看過
    // 老玩家在這台裝置沒做過小任務（被當成新手）：伺服器說玩超過 1 天，就當老朋友，照樣看到更新公告
    if ((res.wallet?.age ?? 0) >= 1) ritual?.skipIntroIfVeteran();
    if (!ritual?.newbie && updNews.unseen) setTimeout(() => updNews.show(), 1500);
    else if (!ritual?.newbie) setTimeout(() => welcome.maybeShow(), 1200);
    else {
      updNews.markSeen();
      setTimeout(() => !welcome.visible && welcome.maybeShow(), 90000);
    }
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
        net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '' });
      } else if (!w.look?.name && accountName()) {
        // 有帳號但還沒存過名字：就算沒按過 ✏️，也把現在的名字固定下來
        profile = { ...profile, custom: true, customLook: true };
        saveProfile(profile);
        net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '' });
      } else if (w.look?.name) {
        profile = { ...profile, ...w.look, custom: true, customLook: true };
        saveProfile(profile);
        myName = profile.name;
        applyLook(profile);
        hud.setMe(myName);
        net.rejoin({ auto: !profile.custom, name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '', code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
      }
      if (w.outfit) setLook(w.outfit); // 👒 造型：擁有的、穿著的、今天和這週的
      // 🌱 來了幾天：第二天開「今日小靈感」，第三天全部打開（老玩家直接全開，不跳提示）
      myAge = w.age ?? 99;
      if (myAge >= 1) ritual?.skipIntroIfVeteran(); // 老玩家換新裝置：不用再跑新手小任務
      if (myAge >= 99) setStage(4, true);
      else if (myAge >= 1) setStage(4); // 第二天就全部打開
      myStreak = w.streak ?? 1;
      basket = w.basket ?? basket;
      gdex = new Set(w.gdex ?? []);
      setTrash(w);
      dishes = w.dishes ?? {};
      cooked = new Set(w.cooked ?? []);
      setBuff(w.buff);
      setNet(w.net);
      refreshGather();
      fishingUI.mergeDex(w.dex);
      // 以前存在這個瀏覽器裡的魚簍，也一起存進帳號（換手機登入就看得到）
      const local = Object.fromEntries(Object.entries(fishingUI.creel).filter(([, e]) => e?.count).map(([i, e]) => [i, e.best || 1]));
      if (Object.keys(local).length) net.request('dexSync', { dex: local }).then((r) => r?.dex && fishingUI.mergeDex(r.dex));
      setCoins(w.pc, (w.daily?.gain ?? 0) + (w.daily?.pass ?? 0));
      // 🌅 每日登入卡（11/09）：老玩家每天第一次進來跳一張卡；第一天的新人照舊只跳一句（不要打斷新手小任務）
      if (w.daily?.gain && (w.age ?? 0) >= 1 && w.daily.ld) setTimeout(() => showDailyCard(w.daily, w.outfit), 1800);
      else if (w.daily?.gain) {
        hud.toast(
          w.daily.streak > 1
            ? t('🔥 連續第 {d} 天來營火旁，送你 {n} 顆松果 🌰', { d: w.daily.streak, n: w.daily.gain })
            : t('🌰 歡迎來到營火旁，送你 {n} 顆松果，可以去心願大樹換裝飾', { n: w.daily.gain }),
          5000,
        );
      }
      if (w.daily?.pass) setTimeout(() => hud.toast(t('{icon} 月票：今天多領 {n} 顆松果 🌰', { icon: (PASS_TIERS[w.daily.tier] ?? PASS).icon, n: w.daily.pass }), 4500), 1500);
      setPass(w.pass);
    }
    player.character.setAccessory?.(myReward);
    applySnapshot(res);
  });
  /** 「來了／離開了」提示不要太吵：同一個人 3 分鐘內只提示一次；離開等 10 秒，沒回來才說 */
  const greeted = new Map();
  const leaveTimers = new Map();
  net.on('playerJoined', (info) => {
    remotes.add(info);
    names.set(info.id, info.name);
    // 營地居民走來走去不用提示
    if (!info.npc) {
      // 剛剛才離開又回來（換地點、手機切出去再回來）：不用再提示一次
      const pend = leaveTimers.get(info.name);
      if (pend) {
        clearTimeout(pend);
        leaveTimers.delete(info.name);
      } else if (Date.now() - (greeted.get(info.name) ?? 0) > 3 * 60000) {
        greeted.set(info.name, Date.now());
        hud.toast(t('{name} 來到了{place} 🦊', { name: info.name, place: t(placeName()) }));
      }
    }
    refreshOnline();
  });
  net.on('playerLeft', ({ id, to }) => {
    const wasNpc = remotes.isNpc(id);
    const name = names.get(id) ?? t('有人');
    // 換地點、換分流：安靜就好（不跳提示）；真的離開：等 10 秒沒回來才說一聲
    if (remotes.remove(id) && !wasNpc && !to && !leaveTimers.has(name)) {
      leaveTimers.set(
        name,
        setTimeout(() => {
          leaveTimers.delete(name);
          hud.toast(t('{name} 離開了 🌙', { name }));
        }, 10000),
      );
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
      setRemoteHeight(room.id === 'home' ? rooms.home.heightAt : room.id === 'campground' ? rooms.campground.heightAt : null); // 坐在門口擺設上的人高度
      // 🛋️ 帳篷裡角色縮小一點，跟家具（沙發、床）的比例才對
      const cs = room.id === 'home' ? 0.78 : 1;
      player.mesh.scale.setScalar(cs);
      setCharScale(cs, remotes);
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
    prevRoomId = room.id;
    if (res?.zone != null && room.id === 'campground') campZone = res.zone;
    drawCampBar();
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
      trashRoom(room.id)?.setList(res.trash ?? []);
    } else if (res && !res.ok && res.reason === 'full') {
      hud.toast(fullMsg(), 4000);
    }
    refreshOnline();
  };
  const updNews = new UpdateNews();
  // 📢 更新紀錄：隨時可以重看最近一次的更新說明（11/07 作者：點哪邊就能看到紀錄）
  document.getElementById('news-chip')?.addEventListener('click', () => updNews.show());
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
    const res = await net.request('campList', { zone: campZone });
    if (res?.ok && roomMgr.current.id === 'campground') {
      camp.setZone(campZone);
      camp.setTents(res.tents);
      campInfo = { zones: res.zones ?? [], online: res.online ?? [], tents: res.tents, reserved: res.reserved ?? [] };
      drawCampBar();
    }
  }
  // ---------- 🏕️ 分區、搬家、🛒 小舖按鈕（11/07） ----------
  let campZone = 0; // 正在看帳篷營地的哪一區（0＝A 區）
  let prevRoomId = null;
  let forceZone = null; // 從「去哪裡」直接選某一區
  let campInfo = { zones: [], tents: [] };
  const plotName = (p) => (p ? t('{z} 區 {n} 號', { z: zoneName(p.z), n: p.n }) : '');
  document.getElementById('ui').insertAdjacentHTML(
    'beforeend',
    `<div class="camp-bar" id="camp-bar"><button type="button" class="camp-btn" id="zone-btn"></button><button type="button" class="camp-btn" id="cbar-shop">🛒<span class="cb-long"> ${t('小舖')}</span></button></div>`,
  );
  const campBar = document.getElementById('camp-bar');
  const zoneBtn = document.getElementById('zone-btn');
  function drawCampBar() {
    const id = roomMgr?.current.id;
    campBar.classList.toggle('show', id === 'campground' || id === 'home');
    zoneBtn.hidden = id !== 'campground';
    // 手機：縮成小圓按鈕（只有圖示＋區名），比較不擋畫面
    zoneBtn.innerHTML = `🏕️<span class="cb-long"> ${t('{z} 區', { z: zoneName(campZone) })} ▾</span><b class="cb-short">${zoneName(campZone)}</b>`;
  }
  document.getElementById('cbar-shop').addEventListener('click', () => shopPanel.open());
  /** 換到另一區（同一個帳篷營地，換一群鄰居）；how：'next'／'prev' 從拱門走過來、其他＝從營地大門進來 */
  let zoneBusy = false;
  async function switchZone(z, how) {
    if (z === campZone || z < 0 || zoneBusy) return;
    if (!net.online) return hud.toast(t('連上伺服器才能換區'));
    zoneBusy = true;
    campZone = z;
    camp.setZone(z);
    camp.setTents(Array(24).fill(null));
    const sp = camp.zoneSpawn(how);
    player.position.set(sp.x, 0, sp.z);
    player.rotationY = sp.ry;
    const res = await net.switchRoom('campground', { x: sp.x, z: sp.z, ry: sp.ry, zone: z });
    roomMgr.onSwitched?.(roomMgr.current, res);
    hud.toast(t('來到帳篷營地・{z} 區', { z: zoneName(z) }));
    setTimeout(() => (zoneBusy = false), 1200);
  }
  hud.zoneInfo = () => ({ zones: campInfo.zones ?? [], mine: myHome?.plot ?? null, cur: roomMgr?.current.id === 'campground' ? campZone : -1 });
  zoneBtn.addEventListener('click', async () => {
    // 打開前先問一次最新人數（每區現在幾個人）
    if (net.online) {
      const res = await net.request('campList', { zone: campZone });
      if (res?.ok) Object.assign(campInfo, { zones: res.zones ?? campInfo.zones, online: res.online ?? [] });
    }
    const zs = campInfo.zones ?? [];
    const on = campInfo.online ?? [];
    const mine = myHome?.plot;
    const count = Math.max(zs.length + 1, (mine?.z ?? 0) + 1, campZone + 1);
    // 11/07：區會越來越多（A～Z 之後還有 A2⋯），改成一格一格的小方塊，一眼看完、不會太長
    const chips = Array.from({ length: count }, (_, z) => {
      const cls = [z === campZone ? 'here' : '', mine?.z === z ? 'mine' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="zone-chip ${cls}" data-zone="${z}" ${z === campZone ? 'disabled' : ''}><b>${mine?.z === z ? '⭐' : ''}${zoneName(z)}</b><small>${t('🏠 {n}/24', { n: zs[z] ?? 0 })}</small><i class="zc-on${on[z] ? '' : ' zero'}">${t('{n} 人', { n: on[z] ?? 0 })}</i></button>`;
    });
    modal.open(
      t('🏕️ 帳篷營地・換區'),
      `<div class="dex-note">${mine ? t('⭐ 我家：{p}', { p: plotName(mine) }) : t('還沒有帳篷，到營火旁的小舖買一頂就有自己的營位')}</div>
      ${mine && mine.z !== campZone ? `<button type="button" class="help-manual-btn" data-zone="${mine.z}">${t('🏠 回我家那一區（{z} 區）', { z: zoneName(mine.z) })}</button>` : ''}
      <div class="zone-grid">${chips.join('')}</div>
      <div class="dex-note">${t('點一區就過去；也可以走過營地中間的木頭拱門，到隔壁區')}</div>
      ${myHome?.tent ? `<button type="button" class="mini-btn" id="go-move">${t('🚚 搬家（挑一個空營位）')}</button>` : ''}`,
      (body) => {
        for (const b of body.querySelectorAll('[data-zone]')) b.addEventListener('click', () => (modal.close(), switchZone(Number(b.dataset.zone))));
        body.querySelector('#go-move')?.addEventListener('click', () => (modal.close(), openMoveMap(campZone)));
      },
    );
  });
  /** 🗺️ 搬家小地圖的圖（SVG）：草地、小樹、環形小路、入口小徑、營火小爐；帳篷照真正的位置畫 */
  const TENT_TINT = ['#e7a05a', '#7fb3d5', '#e58f8f', '#9fd3a8', '#c7a6e0', '#f0d27a'];
  function moveMapSvg(tents, mineN, reserved) {
    const L = CAMP_LAYOUT;
    const ox = -37, oz = -36.5, W = 74, H = 70;
    const P = (p) => `${(p.x - ox).toFixed(1)} ${(p.z - oz).toFixed(1)}`;
    const line = (pts, close) => 'M' + pts.filter((_, i) => i % 3 === 0).map(P).join(' L') + (close ? ' Z' : '');
    if (!moveMapSvg.trees) {
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const path = [...L.loop, ...L.entry];
      let out = '';
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = rnd() * H;
        const wx = x + ox, wz = y + oz;
        if (L.plots.some((p) => Math.hypot(p.x - wx, p.z - wz) < 5) || path.some((p) => Math.hypot(p.x - wx, p.z - wz) < 3.2) || Math.hypot(wx, wz + 3) < 8) continue;
        out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="1.6" fill="#4f8a4a"/><circle r="1" cx="-.4" cy="-.4" fill="#67a85c"/></g>`;
      }
      moveMapSvg.trees = out;
      moveMapSvg.roads = `<path d="${line(L.loop, true)}" class="mv-road"/><path d="${line(L.entry)}" class="mv-road"/><path d="${line(L.loop, true)}" class="mv-road-in"/><path d="${line(L.entry)}" class="mv-road-in"/>`;
    }
    const cx = (0 - ox).toFixed(1), cz = (-3 - oz).toFixed(1);
    const plots = L.plots
      .map((p, i) => {
        const n = i + 1;
        const tn = tents[i];
        const at = `transform="translate(${P(p)})"`;
        if (n === mineN)
          return `<g class="mvp mine" ${at}><circle r="3.6" class="mv-halo"/><path d="M-2.6 1.6 L0 -2.6 L2.6 1.6 Z" fill="#ffb347" stroke="#7a3e10" stroke-width=".35"/><path d="M-.6 1.6 L0 .2 L.6 1.6Z" fill="#7a3e10"/><text y="-3.4" class="mv-star">⭐</text><text y="4.4" class="mv-nm mv-me">${t('我家')}</text></g>`;
        if (tn || reserved.includes(n)) {
          const nm = tn?.name ? escapeHtml(tn.name.slice(0, 6)) : '';
          const c = TENT_TINT[[...(tn?.name ?? '')].reduce((a, ch) => a + ch.charCodeAt(0), n) % TENT_TINT.length];
          return `<g class="mvp taken" ${at}><path d="M-2.2 1.4 L0 -2.2 L2.2 1.4 Z" fill="${c}" stroke="#5a3a22" stroke-width=".3"/><path d="M-.5 1.4 L0 .2 L.5 1.4Z" fill="#5a3a22"/>${nm ? `<text y="3.9" class="mv-nm">${nm}</text>` : ''}</g>`;
        }
        return `<g class="mvp free" data-n="${n}" ${at}><circle r="4" fill="transparent"/><circle r="2.7" class="mv-ring2"/><text y="1" class="mv-num">${n}</text><text y="4.6" class="mv-nm mv-free">${t('空位')}</text></g>`;
      })
      .join('');
    return `<svg viewBox="-1 -1 ${W + 2} ${H + 5}" class="mv-svg"><rect x="-1" y="-1" width="${W + 2}" height="${H + 5}" rx="4" fill="#bfe3a4"/>${moveMapSvg.trees}<ellipse cx="${cx}" cy="${cz}" rx="6.6" ry="6" fill="#d8efb8"/>${moveMapSvg.roads}<g transform="translate(${cx} ${cz})"><circle r="1.9" fill="#8a6a4a"/><text y="1.2" class="mv-fire">🔥</text><text y="4.4" class="mv-lm">${t('營火小爐')}</text></g><text x="${(-ox).toFixed(1)}" y="${H + 0.6}" class="mv-lm">${t('🚪 入口（回營火）')}</text>${plots}</svg>`;
  }
  /** 🚚 搬家小地圖：每一區 24 格，空的可以點 */
  async function openMoveMap(z) {
    const [list, price] = await Promise.all([net.request('campList', { zone: z }), net.request('movePrice')]);
    if (!list?.ok) return hud.toast(t('連上伺服器才能搬家'));
    const cost = price?.cost ?? 100;
    const mine = myHome?.plot;
    const maxZ = Math.max((list.zones ?? []).length + 1, z + 1);
    const tabs = Array.from({ length: maxZ }, (_, k) => `<button type="button" class="mini-btn${k === z ? ' on' : ''}" data-mz="${k}">${zoneName(k)}</button>`).join('');
    // 🗺️ 11/09 作者：24 個格子看不出位置 → 照營地真正的樣子畫成可愛小地圖（營火小爐、彎彎小路、入口、每頂帳篷的位置）
    const svg = moveMapSvg(list.tents, mine && mine.z === z ? mine.n : 0, list.reserved ?? []);
    modal.open(
      t('🚚 搬家'),
      `<div class="dex-note">${cost ? t('這次搬家要 {c} 顆松果（第一次免費）', { c: cost }) : t('這次搬家免費')}・${t('帳篷、家具、菜園、門口擺設會整組搬過去')}</div>
       <div class="mv-tabs">${tabs}</div><div class="mv-map">${svg}</div>
       <div class="mv-legend"><span>⭐ ${t('我家')}</span><span>⛺ ${t('有人住')}</span><span><i class="mv-ring"></i> ${t('空位，點了就能搬')}</span></div>
       <div class="mv-pick" id="mv-pick" hidden></div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-mz]')) b.addEventListener('click', () => (modal.close(), openMoveMap(Number(b.dataset.mz))));
        const pick = body.querySelector('#mv-pick');
        for (const g of body.querySelectorAll('.mvp.free'))
          g.addEventListener('click', () => {
            for (const o of body.querySelectorAll('.mvp.sel')) o.classList.remove('sel');
            g.classList.add('sel');
            const n = Number(g.dataset.n);
            const me = CAMP_LAYOUT.plots[n - 1];
            const near = list.tents
              .map((tn, i) => ({ tn, d: Math.hypot(CAMP_LAYOUT.plots[i].x - me.x, CAMP_LAYOUT.plots[i].z - me.z) }))
              .filter((x) => x.tn?.name)
              .sort((a, b) => a.d - b.d)
              .slice(0, 2)
              .map((x) => escapeHtml(x.tn.name));
            pick.hidden = false;
            pick.innerHTML = `<b>📍 ${t('{z} 區 {n} 號', { z: zoneName(z), n })}${near.length ? `・${t('鄰居：{names}', { names: near.join('、') })}` : ''}</b><button type="button" class="mini-btn" id="mv-go">${t('搬到這裡')}</button>`;
            pick.querySelector('#mv-go').addEventListener('click', () => (modal.close(), askMove({ z, n }, cost)));
            audio.sfx?.('click');
          });
      },
    );
  }
  function askMove(plot, cost) {
    modal.open(
      t('🚚 搬到 {p}？', { p: plotName(plot) }),
      `<div class="dex-note">${cost ? t('要花 {c} 顆松果', { c: cost }) : t('這次免費')}</div><div class="yard-opts"><button type="button" class="mini-btn" id="mv-ok">${t('確定搬家')}</button><button type="button" class="mini-btn" id="mv-no">${t('再想想')}</button></div>`,
      (body) => {
        body.querySelector('#mv-no').addEventListener('click', () => modal.close());
        body.querySelector('#mv-ok').addEventListener('click', async () => {
          modal.close();
          const res = await net.request('movePlot', plot);
          if (!res?.ok) return hud.toast(res?.reason === 'taken' ? t('這個營位剛好被別人搬進去了，換一個吧') : res?.reason === 'poor' ? t('松果不夠，搬家要 {c} 顆', { c: res.cost }) : t('沒搬成，再試一次吧'));
          if (res.home) setMyHome({ ...res.home });
          audio.sfx('bell');
          hud.toast(t('🚚 搬好了！你的帳篷在 {p}', { p: plotName(res.plot) }), 5000);
          if (roomMgr.current.id === 'campground') {
            if (res.plot.z !== campZone) switchZone(res.plot.z);
            else refreshCamp();
          }
        });
      },
    );
  }
  setInterval(refreshCamp, 20000);
  actions.onVisit = async (plot) => {
    const tent = plot.tent;
    if (!tent) {
      // 🚚 空營位：有帳篷的人可以直接搬來這裡（A 區 1 號保留，不能選）
      if (!myHome?.tent) return shopHint();
      if ((campInfo.reserved ?? []).includes(plot.i + 1)) return hud.toast(t('這個營位已經有人預約了，換一個吧'));
      const price = await net.request('movePrice');
      return askMove({ z: campZone, n: plot.i + 1 }, price?.cost ?? 100);
    }
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

  const switchOnServer = (id) => {
    // 🏕️ 從別的地方走進帳篷營地：到自己帳篷那一區；從帳篷裡出來：回到剛剛那一區
    if (id === 'campground' && forceZone != null) campZone = forceZone;
    else if (id === 'campground' && prevRoomId !== 'home') campZone = myHome?.plot?.z ?? 0;
    forceZone = null;
    if (id === 'campground') camp.setZone(campZone);
    return net.switchRoom(id, { x: player.position.x, z: player.position.z, ry: player.rotationY, ...(id === 'campground' ? { zone: campZone } : {}) });
  };

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
      doneness: actions.state === 'roast' ? actions.doneness : actions.state === 'eat' ? actions.eatDone : 0, // 吃棉花糖：讓別人看到烤得怎樣的反應
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
  const refreshHomeChip = () => {
    hud.setHomeVisible(!!myHome?.tent && (net.online || !!demo) && !inHome());
    hud.setGoState({ room: inHome() ? 'home' : roomMgr?.current?.id ?? 'forest_main', home: !!myHome?.tent && (net.online || !!demo) });
  };
  const setMyHome = (h) => {
    myHome = h;
    setTimeout(() => ritual?.checkHome(!!h?.tent, inHome() && homeRoom.mine), 1500); // 🌱 第 7 步：買了帳篷就帶他回家
    refreshAcctChip();
    shopPanel.refresh();
    refreshHomeChip();
    if (inHome() && homeRoom.mine) {
      homeRoom.setHome(h, true, true);
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
    campZone = myHome.plot?.z ?? 0; // 出門回到自己那一區
    camp.setReturnToMine(myHome.shape, myHome.plot);
    homeRoom.setExit('campground');
    roomMgr.switchTo('home', () => net.switchRoom('home', { x: 0, z: homeRoom.spawn.z, ry: Math.PI }));
  };
  hud.onHome = goHome;
  /** 🧭 去哪裡：一鍵到各個地點 */
  // 🌰 點上面的松果數字：打開「怎麼拿松果」（11/07：小朋友最常問；大字、一行一件事、每行可以帶我去）
  hud.el.pcChip.classList.add('tappable');
  const openPineHelp = () => {
    const rows = [
      ['✅', t('做每日任務'), t('每個 5 顆'), 'forest_main'],
      ['🎣', t('去湖邊釣魚'), t('1～15 顆'), 'lake_dock'],
      ['🔥', t('坐在營火旁邊'), t('每 5 分鐘 2 顆'), 'forest_main'],
      ['♻️', t('撿垃圾拿去回收'), t('每件 1 顆'), 'campground'],
      ['🌅', t('每天都來玩'), t('天天送'), null],
    ];
    const more = [
      ['📖', t('第一次釣到、採到新東西（圖鑑）')],
      ['🍲', t('第一次煮出新料理、收成新蔬菜')],
      ['🎉', t('晚上 7～11 點的小活動')],
      ['👫', t('邀請新朋友來玩（每位 10 顆）')],
    ];
    modal.open(
      t('🌰 怎麼拿松果？'),
      `<div class="pine-help">
        ${rows.map(([ic, txt, n, go]) => `<div class="ph-row"><span class="ph-ic">${ic}</span><b>${txt}</b><em>${n}</em>${go ? `<button type="button" class="mini-btn" data-pgo="${go}">${t('👉 帶我去')}</button>` : ''}</div>`).join('')}
        <div class="ph-star">${t('⭐ 早上、晚上 9 點半，松果變兩倍！')}</div>
        <details class="ph-more"><summary>${t('看更多方法')}</summary>${more.map(([ic, txt]) => `<div class="ph-row small"><span class="ph-ic">${ic}</span>${txt}</div>`).join('')}</details>
      </div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-pgo]')) b.addEventListener('click', () => (modal.close(), b.dataset.pgo === roomMgr.current.id ? hud.toast(t('你已經在這裡了 👍')) : hud.onGo(b.dataset.pgo)));
      },
    );
  };
  hud.el.pcChip.addEventListener('click', openPineHelp);
  // ❓ 常見問題＋📖 營地手冊
  const help = new HelpPanel({
    modal,
    tentPrice: TENT_PRICE,
    coins: () => pinecones,
    home: () => myHome,
    plotName,
    go: {
      shop: () => shopPanel.open(),
      home: () => goHome(),
      move: () => openMoveMap(myHome?.plot?.z ?? 0),
      install: () => openInstall(),
      pine: () => openPineHelp(),
      look: () => hud.onLook?.(),
      friends: () => document.getElementById('friend-btn')?.click(),
      camp: () => hud.onGo(`camp:${myHome?.plot?.z ?? 0}`),
      place: (id) => (id === roomMgr.current.id ? hud.toast(t('你已經在這裡了 👍')) : hud.onGo(id)),
    },
  });
  document.getElementById('help-chip').addEventListener('click', () => help.openFaq());

  // ---------- 📲 加到手機桌面（11/09 作者：幫玩家把遊戲放到手機桌面、平板、網頁最愛） ----------
  // Android／電腦的 Chrome、Edge：可以直接跳「安裝」視窗；iPhone／iPad 只能教他按「分享 → 加入主畫面」
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvt = e;
  });
  window.addEventListener('appinstalled', () => {
    installEvt = null;
    hud.toast(t('📲 放好了！下次從桌面的 🔥 圖示就能直接進來'), 5000);
  });
  async function openInstall() {
    if (isStandalone()) return hud.toast(t('你現在就是從桌面打開的 👍'));
    if (installEvt) {
      installEvt.prompt();
      await installEvt.userChoice.catch(() => null);
      installEvt = null;
      return;
    }
    const ia = inAppKind();
    const kind = installKind();
    const step = (icon, txt) => `<span class="flow-step"><i>${icon}</i><small>${txt}</small></span>`;
    const flow = (...s) => `<div class="flow">${s.join('<span class="flow-arrow">➜</span>')}</div>`;
    let body;
    if (ia && ia !== 'iframe') {
      body = `<div class="flow-card fc-new"><div class="flow-title">${t('先用瀏覽器打開')}<small>${t('在 LINE、IG 裡面沒辦法加到桌面')}</small></div>${flow(step('⋯', t('點右上角')), step('🌐', t('用瀏覽器開啟')), step('📲', t('再按一次這個')))}</div>`;
    } else if (kind === 'ios') {
      body = `<div class="flow-card fc-daily"><div class="flow-title">${t('📱 iPhone／iPad')}<small>${t('要用 Safari 打開')}</small></div>${flow(step('⬆️', t('點下面的「分享」')), step('➕', t('「加入主畫面」')), step('✅', t('右上角「新增」')))}</div>`;
    } else if (kind === 'android') {
      body = `<div class="flow-card fc-daily"><div class="flow-title">${t('📱 Android 手機／平板')}<small>${t('用 Chrome 打開')}</small></div>${flow(step('⋮', t('點右上角')), step('📲', t('「加到主畫面」或「安裝應用程式」')), step('✅', t('按「新增」')))}</div>`;
    } else {
      body = `<div class="flow-card fc-daily"><div class="flow-title">${t('💻 電腦')}<small>${t('兩種方法選一種')}</small></div>${flow(step('⊕', t('網址列右邊的「安裝」圖示')), step('✅', t('按「安裝」')))}<div class="flow-or">${t('或')}</div>${flow(step('⭐', t('按 Ctrl＋D（Mac：⌘＋D）')), step('📁', t('加入書籤')))}</div>`;
    }
    modal.open(t('📲 把營地放到桌面'), `<div class="dex-note">${t('放好之後，桌面會多一個 🔥 圖示，下次一點就進來，不用再找網址。')}</div>${body}`);
  }
  // 玩了一陣子才輕輕提醒一次（第 2 天以後、玩滿 5 分鐘；按 ✕ 之後 14 天內不再出現）
  setTimeout(() => {
    try {
      if (isStandalone() || inAppKind() === 'iframe' || !net.online) return;
      const last = Number(localStorage.getItem('cozy-install-hint') || 0);
      if (Date.now() - last < 14 * 864e5) return;
      if ((myAge ?? 0) < 1) return; // 第一天來的新人先不吵
      const el = document.createElement('div');
      el.className = 'share-pop install-pop';
      el.innerHTML = `${t('📲 把營地放到手機桌面，下次一點就進來')}<button type="button" class="sp-go">${t('怎麼做')}</button><button type="button" class="sp-x">✕</button>`;
      const done = () => {
        localStorage.setItem('cozy-install-hint', String(Date.now()));
        el.remove();
      };
      el.querySelector('.sp-go').addEventListener('click', () => {
        done();
        openInstall();
      });
      el.querySelector('.sp-x').addEventListener('click', done);
      document.body.appendChild(el);
      setTimeout(() => el.isConnected && el.remove(), 15000);
    } catch {
      /* 沒有 localStorage 就算了 */
    }
  }, 5 * 60 * 1000);
  hud.onGo = (id) => {
    if (id === 'home') return goHome();
    // 🏕️ 帳篷營地的某一區（去哪裡選單）
    if (id.startsWith('camp:')) {
      const z = Number(id.slice(5));
      if (roomMgr.current.id === 'campground') return switchZone(z);
      shopPanel.close();
      stopBuild();
      forceZone = z;
      return roomMgr.switchTo('campground', switchOnServer);
    }
    if (roomMgr.current.id === id) return;
    shopPanel.close();
    stopBuild();
    roomMgr.switchTo(id, switchOnServer);
  };
  /** 一鍵回到中央營火（在哪裡都可以） */
  hud.onFire = () => {
    if (roomMgr.current.id === 'forest_main') return;
    shopPanel.close();
    stopBuild();
    roomMgr.switchTo('forest_main', switchOnServer);
  };

  /** 在小舖買東西（布置面板的「擴建」也走這裡） */
  const buyItem = async (id, c = 0) => {
    const res = await homeReq('buy', c ? { id, c } : { id });
    if (res?.ok) {
      if (!net.online) setCoins(res.pc, res.delta ?? 0);
      setMyHome(res.home);
      audio.sfx('bell');
      if (id === 'tent') {
        setStage(4, true);
        hud.toast(t('⛺ 你有自己的帳篷了！按「🧭 去哪裡 → 🏠 我的帳篷」進去布置'), 5000);
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
      else if (id.startsWith('yard_')) {
        const y = YARD_BY_ID[id.slice(5)];
        hud.toast(t('{icon} 「{name}」擺到你家門口了！去帳篷營地看看', { icon: y?.icon ?? '', name: t(y?.zh ?? '') }), 4500);
      }
      else hud.toast(t('{icon} 買了{name}，回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }));
      return true;
    }
    const why = { poor: t('松果不夠喔 🌰'), owned: t('你已經有帳篷了'), noTent: t('先買帳篷，才能放家具 ⛺'), tooMany: t('這個已經買很多了'), tooFast: t('慢慢來 🙂'), maxed: t('已經是最大的帳篷了 🎉') };
    hud.toast(why[res?.reason] ?? t('沒買成，再試一次吧'));
    return false;
  };
  // ---------- 🛒 買東西前先確認（點商品是預覽，按「確定購買」才買） ----------
  const confirmBuy = new ConfirmBuy();
  const snapCache = new Map();
  /** 幫一個 3D 物件拍張照（奶油色背景），存成圖片給確認視窗用 */
  const snapshot = (key, makeObj) => {
    if (snapCache.has(key)) return snapCache.get(key);
    let url = '';
    try {
      const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      r.setSize(240, 240, false);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      const sc = new THREE.Scene();
      sc.background = new THREE.Color(0xf3e6d3);
      sc.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7060, 1.6));
      const key2 = new THREE.DirectionalLight(0xfff0dc, 2.0);
      key2.position.set(2, 3, 3);
      sc.add(key2);
      const obj = makeObj();
      sc.add(obj);
      // 只算看得到的部分（角色身上藏著釣竿、腳踏車等道具，算進去畫面會縮得很小）
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3();
      obj.traverseVisible((o) => {
        if (!o.isMesh || !o.geometry) return;
        o.geometry.computeBoundingBox();
        box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
      });
      if (box.isEmpty()) box.setFromObject(obj);
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      const center = box.getCenter(new THREE.Vector3());
      const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
      cam.position.set(center.x + size * 1.15, center.y + size * 0.75, center.z + size * 1.55);
      cam.lookAt(center);
      r.render(sc, cam);
      url = r.domElement.toDataURL('image/png');
      r.dispose();
      r.forceContextLoss?.();
    } catch {
      /* 畫不出來就只顯示圖示 */
    }
    snapCache.set(key, url);
    return url;
  };
  /** 🖼️ 點獎勵看預覽（11/09 作者：點什麼都跳預覽圖）：造型＝自己的角色戴上去的樣子；家具；帳篷花色 */
  function previewItem(kind, id, how = '') {
    let info = null;
    if (kind === 'outfit') {
      const o = OUTFIT_BY_ID[id];
      if (!o) return;
      const sp = profile?.species ?? 0;
      const lk = { fur: profile?.fur ?? 0, species: sp, tail: profile?.tail || SPECIES_TAIL[sp], ears: profile?.ear || SPECIES_EARS[sp] };
      const img = snapshot(`wear:${id}:${sp}:${lk.fur}:${lk.tail}:${lk.ears}`, () => {
        const ch = new ProceduralFox(lk);
        ch.setOutfit({ [o.slot]: id });
        ch.root.rotation.y = o.slot === 'back' ? 2.6 : 0.45; // 背的東西：轉到看得到背後
        const g = new THREE.Group();
        g.add(ch.root);
        return g;
      });
      info = { icon: o.icon, name: t(o.zh), img };
    } else if (kind === 'furn') {
      const f = FURNITURE_BY_ID[id];
      if (!f) return;
      info = { icon: f.icon, name: f.name, img: snapshot(`${id}|0`, () => buildFurniture(id, {})) };
    } else if (kind === 'style') {
      const st = styleOf(id);
      const img = snapshot(`style:${id}`, () => {
        const tex = tentTexture(st);
        const mats = {
          canvas: new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : st.canvas, map: tex, roughness: 1, side: THREE.DoubleSide }),
          accent: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, flatShading: true }),
          accentDouble: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, side: THREE.DoubleSide }),
          wood: lowpoly(0x7a5236),
          trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.DoubleSide }),
          gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
          gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, metalness: 0.3 }),
          window: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
        };
        const g = buildTentShell(myHome?.shape ?? 'bell', mats, { outside: true });
        g.rotation.y = -0.5;
        return g;
      });
      info = { icon: st.icon, name: st.name, img };
    }
    if (info) confirmBuy.view({ ...info, desc: how });
  }
  /** 🌅 每日登入卡：早上「早安」、下午「午安」、晚上「晚上好」；7 格來營地第幾天、今天／明天的每日造型、第 7 天大禮 */
  function showDailyCard(daily, outfit) {
    if (document.getElementById('login-card')) return;
    const h = new Date().getHours();
    const hello = h >= 5 && h < 11 ? t('🌅 早安，旅人！') : h >= 11 && h < 17 ? t('☀️ 午安，旅人！') : t('🌙 晚上好，旅人！');
    const ld = daily.ld;
    const cells = [1, 2, 3, 4, 5, 6, 7]
      .map((k) => {
        const cls = k < ld ? 'ok' : k === ld ? 'now' : '';
        const big = k === 7;
        const label = k === ld ? t('今天') : t('第{n}天', { n: k });
        return `<div class="lc-d ${cls}${big ? ' big' : ''}"><i>${big ? '🎁' : '🌰'}</i>${label}<br>${big ? t('大禮') : 2 + k}</div>`;
      })
      .join('');
    const fur = (id) => FURNITURE_BY_ID[id];
    const today = OUTFIT_BY_ID[outfit?.daily];
    const tmr = OUTFIT_BY_ID[daily.tmr];
    const rows = [];
    if (daily.gift && fur(daily.gift)) {
      const f = fur(daily.gift);
      const img = snapshot(`${daily.gift}|0`, () => buildFurniture(daily.gift, {}));
      rows.push(`<div class="lc-row lc-gift">${img ? `<img src="${img}" alt="">` : `<span class="ic">${f.icon}</span>`}<div><b>${t('🎉 第 7 天大禮：🌰 30＋{icon} {name}', { icon: f.icon, name: f.name })}</b><small>${t('已經放進你的帳篷背包')}</small></div></div>`);
    }
    if (today) rows.push(`<div class="lc-row" data-prev="outfit:${today.id}"><span class="ic">${today.icon}</span><div><b>${t('今天的每日造型：{name}', { name: t(today.zh) })} 🔍</b><small>${outfit?.dailyGot ? t('✅ 已經拿到了') : t('約朋友或做完今日挑戰就拿到')}</small></div></div>`);
    if (tmr) rows.push(`<div class="lc-row"><span class="ic lc-sil">${tmr.icon}</span><div><b>${t('明天的每日造型：？？？')}</b><small>${t('明天來揭曉 ✨')}</small></div></div>`);
    if (!daily.gift) {
      const left = 7 - ld;
      const nf = fur(daily.next);
      rows.push(`<div class="lc-row lc-wide"><span class="ic">🎁</span><div><b>${nf ? t('第 7 天大禮：🌰 30＋{icon} {name}', { icon: nf.icon, name: nf.name }) : t('第 7 天大禮：🌰 30')}</b><small>${left ? t('再來 {n} 天就拿到（中間沒來也沒關係）', { n: left }) : ''}</small></div></div>`);
    }
    const el = document.createElement('div');
    el.className = 'login-back';
    el.id = 'login-card';
    el.innerHTML = `<div class="login-card"><h3>${hello}</h3><div class="lc-sub">${t('這是你這一輪來營地的第 {n} 天 🔥', { n: ld })}</div><div class="lc-days">${cells}</div>${rows.join('')}<button type="button" class="lc-btn">${t('收下 🌰 {n}', { n: daily.gain })}</button></div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    const close = () => {
      audio.sfx('bell');
      el.remove();
    };
    el.querySelector('.lc-btn').addEventListener('click', close);
    el.addEventListener('click', (e) => e.target === el && close());
    el.querySelector('[data-prev]')?.addEventListener('click', () => previewItem('outfit', today.id, t('今天的每日造型')));
    document.body.appendChild(el);
  }

  // ---------- 🎉 開心時刻分享小泡泡（11/09）：★4 以上的魚、圖鑑收集滿一個分類；8 秒自己消失、一天最多 3 次 ----------
  /** 🏆 圖鑑收集滿一個分類 → 分享小泡泡 */
  const dexPop = (name, icon) =>
    sharePop(t('🏆 <b>{name}</b>全部收集完成！', { name }), {
      icon: '🏆',
      big: t('{name}全部收集完成！', { name }),
      small: t('{icon} 一樣一樣慢慢找齊了', { icon }),
      text: t('我在迷霧森林露營地把{name}全部收集完了 🏆 沒力氣出門的夜晚，一起來營火旁坐一下吧', { name }),
    });
  function sharePop(text, card) {
    try {
      const d = new Date().toDateString();
      const rec = JSON.parse(localStorage.getItem('cozy-share-pop') || '{}');
      const n = rec.d === d ? rec.n : 0;
      if (n >= 3) return;
      localStorage.setItem('cozy-share-pop', JSON.stringify({ d, n: n + 1 }));
    } catch {
      /* 沒有 localStorage 也照樣跳 */
    }
    document.querySelector('.share-pop.happy')?.remove();
    const el = document.createElement('div');
    el.className = 'share-pop happy';
    el.innerHTML = `<span class="sp-t">${text}</span><button type="button" class="sp-go">${t('📸 分享')}</button><button type="button" class="sp-x">✕</button>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('.sp-go').addEventListener('click', () => {
      el.remove();
      shareCard.open(card);
    });
    el.querySelector('.sp-x').addEventListener('click', () => el.remove());
    document.body.appendChild(el);
    setTimeout(() => el.isConnected && el.remove(), 8000);
  }
  /** 小舖裡的東西：名字、圖示、價格、預覽圖 */
  const shopItemInfo = (id, c) => {
    if (id === 'tent') return { icon: '⛺', name: t('我的小帳篷'), price: TENT_PRICE, desc: t('買下來就是你的家，可以擺家具、換造型') };
    if (id === 'expand') {
      const g = gridOf(myHome) + 1;
      return { icon: '📐', name: t('擴建成 {n}×{n}', { n: g }), price: expandPrice(myHome) ?? 0, desc: t('整頂帳篷會變大一圈，家具會挪到新地板的中間') };
    }
    if (id.startsWith('shape_')) {
      const sh = TENT_SHAPE_BY_ID[id.slice(6)];
      // 🖼️ 用自己帳篷現在的花色畫一張這個造型的樣子
      const st = styleOf(myHome?.style ?? 'classic');
      const img = snapshot(`${id}:${st.id}`, () => {
        const tex = tentTexture(st);
        const mats = {
          canvas: new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : st.canvas, map: tex, roughness: 1, side: THREE.DoubleSide }),
          accent: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, flatShading: true }),
          accentDouble: new THREE.MeshStandardMaterial({ color: st.accent, roughness: 1, side: THREE.DoubleSide }),
          wood: lowpoly(0x7a5236),
          trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.DoubleSide }),
          gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
          gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, metalness: 0.3 }),
          window: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
        };
        const g = buildTentShell(id.slice(6), mats, { outside: true });
        g.rotation.y = -0.5;
        return g;
      });
      return { icon: sh?.icon, name: sh?.name, price: sh?.price ?? 0, img, desc: t('解鎖之後可以隨時換回其他造型') };
    }
    if (id.startsWith('sign_')) {
      const sg = SIGN_BY_ID[id.slice(5)];
      const label = myHome?.plot ? plotName(myHome.plot) : t('A 區 7 號');
      return { icon: sg?.icon, name: t(sg?.zh ?? ''), price: sg?.price ?? 0, desc: t(sg?.note ?? ''), img: snapshot(id, () => buildSign(id.slice(5), label, myHome?.name ?? '')) };
    }
    if (id.startsWith('yard_')) {
      const y = YARD_BY_ID[id.slice(5)];
      return { icon: y?.icon, name: t(y?.zh ?? ''), price: y?.price ?? 0, desc: t(y?.note ?? ''), img: snapshot(id, () => buildYard(id.slice(5))) };
    }
    const f = FURNITURE_BY_ID[id];
    const cv = c ? FURNITURE_COLORS[c] : null;
    // 🐟 魚缸：大字寫能放幾星，再列出「你釣過、放得進去的魚」
    let desc = '';
    if (f?.fish) {
      const big = f.fish >= 6 ? t('👑 連魚王都能放') : t('{stars} 可以放 {n} 星以下的魚', { stars: '⭐'.repeat(f.fish), n: f.fish });
      const caught = FISH.map((x, i) => ({ x, i })).filter(({ x, i }) => !x.junk && fishingUI.creel[i]?.count);
      const fit = caught.filter(({ x }) => fishFits(f, x));
      const chips = caught
        .sort((a, b) => (a.x.legend ? 9 : a.x.rarity) - (b.x.legend ? 9 : b.x.rarity))
        .map(({ x }) => `<span class="tank-fish${fishFits(f, x) ? '' : ' no'}">${x.legend ? '👑' : '★'.repeat(x.rarity)} ${x.name}</span>`)
        .join('');
      desc = `<div class="tank-big">${big}</div><div>${t('可以放 1 條你釣過的魚')}</div>
        <div class="tank-n">${caught.length ? t('你現在能放的魚：{n} 種', { n: fit.length }) : t('還沒釣過魚：先去湖邊釣一條吧 🎣')}</div>
        ${chips ? `<div class="tank-list">${chips}</div>` : ''}`;
    }
    return {
      icon: f?.icon,
      name: `${f?.name ?? ''}${cv ? `（${cv.icon} ${t(cv.zh)}）` : ''}`,
      price: f?.price ?? 0,
      desc,
      img: snapshot(`${id}|${c || 0}`, () => buildFurniture(id, { color: c || 0 })),
    };
  };
  const shopPanel = new ShopPanel({
    getCoins: () => (net.online || demo ? pinecones : null),
    getHome: () => myHome,
    onGoHome: goHome,
    onGift: (id) => (id === PASS.style ? openPass() : giftPanel.open()),
    onEdit: async (op, data) => {
      const res = await homeReq('homeEdit', { op, ...data });
      if (res?.ok) setMyHome({ ...res.home });
      else if (res?.reason === 'smallFull') hud.toast(t('小型擺設最多擺 3 個，先收起一個再擺'));
      else if (res) hud.toast(t('沒換成，再試一次吧'));
    },
    onBuy: (id, c) => buyItem(id, c),
  });
  shopPanel.onConfirm = (id, c) => confirmBuy.ask({ ...shopItemInfo(id, c), coins: net.online || demo ? pinecones : null });
  actions.onShop = () => shopPanel.open();
  { // 🌱 新手小任務「去小舖看帳篷」：不管從哪裡打開小舖都算
    const open = shopPanel.open.bind(shopPanel);
    shopPanel.open = (tab) => {
      open(tab);
      ritual?.event('shop');
    };
  }
  shopPanel.passStar = () => !!(passState?.active && passState?.tier === 'star'); // 🌌 星空門牌

  // ---------- 👫 好友、💌 密頻、✉️ 聯絡作者 ----------
  let friendView = null; // 'list' | { hid } | 'support'（收到新訊息時重畫用）
  const fmtTime = (at) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at));
  const setFriendBadge = (b) => social.setBadge((b?.dm ?? 0) + (b?.req ?? 0) + (b?.sup ?? 0));
  net.on('socialBadge', setFriendBadge);
  const friendErr = (r) =>
    ({ notFound: t('找不到這個玩家編號'), self: t('這是你自己喔'), already: t('你們已經是好友了'), full: t('好友已經滿 100 位了'), tooFast: t('慢慢來 🙂'), notFriend: t('要互相加好友才能密頻'), short: t('多寫幾個字吧'), tooMany: t('今天已經寄很多封了，作者看到會回你'), offline: t('還沒連上伺服器') })[r?.reason] ?? t('沒有成功，再試一次');
  async function addFriend(data) {
    if (!net.online) return hud.toast(t('還沒連上伺服器'));
    const r = await net.request('friendAdd', data);
    if (!r?.ok) return hud.toast(friendErr(r));
    audio.sfx('bell');
    hud.toast(r.now ? t('👫 你和 {name} 成為好友了！', { name: r.name ?? '' }) : t('👫 已經送出好友邀請，等對方同意'));
    if (friendView === 'list') openFriends();
  }
  async function openFriends() {
    if (!net.online) return hud.toast(t('連上伺服器才能用好友'));
    const r = await net.request('friendList');
    if (!r?.ok) return hud.toast(t('還沒連上伺服器'));
    friendView = 'list';
    setFriendBadge(r.badge);
    const known = new Set(r.known ?? []);
    const here = [...remotes.players.values()].filter((p) => !p.npc && p.name && !known.has(p.id));
    const reqs = r.reqs.map((q) => `<div class="craft-row"><div class="craft-info"><b>👋 ${escapeHtml(q.name)}</b><small>${t('想加你好友')}</small></div><button type="button" class="mini-btn" data-acc="${q.hid}">${t('同意')}</button><button type="button" class="mini-btn ghost" data-rej="${q.hid}">${t('拒絕')}</button></div>`).join('');
    // 11/09 作者：聊過的也不用一直顯示最後一句（會越來越多）→ 全部改小方塊，點名字再看紀錄。
    // 有未讀＝右上角紅點＋數字、排最前面；等對方同意的照舊用一行放最上面（要處理）
    const pending = r.friends.filter((f) => !f.mutual);
    const mutual = r.friends
      .filter((f) => f.mutual)
      .map((f, i) => ({ f, i }))
      .sort((a, b) => (b.f.unread ? 1 : 0) - (a.f.unread ? 1 : 0) || (b.f.online ? 1 : 0) - (a.f.online ? 1 : 0) || (b.f.last?.at ?? 0) - (a.f.last?.at ?? 0) || a.i - b.i)
      .map((x) => x.f);
    const chips = mutual
      .map((f) => `<button type="button" class="fr-chip${f.unread ? ' has-new' : ''}" data-chat="${f.hid}"><b>${f.online ? '🟢' : '⚪'} ${escapeHtml(f.name)}</b>${f.plot ? `<small>🏕️ ${plotName(f.plot)}</small>` : ''}${f.unread ? `<i class="fr-new">${f.unread}</i>` : ''}</button>`)
      .join('');
    const fr =
      pending.map((f) => `<div class="craft-row fr-row" data-chat="${f.hid}"><div class="craft-info"><b>⚪ ${escapeHtml(f.name)}${f.plot ? ` <span class="fr-plot">🏕️ ${plotName(f.plot)}</span>` : ''}</b><small>${t('⏳ 等對方同意')}</small></div><span class="fr-go">›</span></div>`).join('') +
      (chips ? `<div class="dex-note fr-sub">${t('點名字打開密頻、看聊天紀錄')}</div><div class="fr-chips">${chips}</div>` : '');
    modal.open(
      t('👫 好友'),
      `<div class="dex-note">${t('🆔 我的玩家編號：{id}', { id: `<b class="gift-id-inline">${r.code}</b>` })}</div>
      ${reqs ? `<div class="dex-note">${t('📮 好友邀請')}</div>${reqs}` : ''}
      <div class="dex-note">${t('💌 我的好友（互相加好友才能密頻，對方不在線上也會留著）')}</div>
      ${fr || `<div class="dex-note">${t('還沒有好友，從下面加一位吧')}</div>`}
      <div class="dex-note">${t('＋ 加好友')}</div>
      ${here.length ? `<div class="fr-here">${here.map((p) => `<button type="button" class="mini-btn" data-add="${p.id}">＋ ${escapeHtml(p.name)}</button>`).join('')}</div>` : `<div class="dex-note">${known.size && remotes.players.size ? t('這裡的人都加過了，也可以輸入對方的玩家編號') : t('這裡現在沒有別人，可以輸入對方的玩家編號')}</div>`}
      <div class="fr-add"><input class="join-input" id="fr-hid" maxlength="24" placeholder="${t('輸入對方的玩家編號')}" /><button type="button" class="mini-btn" id="fr-hid-go">${t('加好友')}</button></div>
      <div class="yard-opts"><button type="button" class="mini-btn" id="fr-support">${t('✉️ 聯絡作者')}</button></div>`,
      (body) => {
        const inp = body.querySelector('#fr-hid');
        inp.addEventListener('keydown', (e) => e.stopPropagation());
        body.querySelector('#fr-hid-go').addEventListener('click', () => inp.value.trim() && addFriend({ hid: inp.value.trim() }));
        for (const b of body.querySelectorAll('[data-add]')) b.addEventListener('click', () => addFriend({ sid: b.dataset.add }));
        for (const b of body.querySelectorAll('[data-acc]'))
          b.addEventListener('click', async () => {
            await net.request('friendAnswer', { hid: b.dataset.acc, ok: true });
            audio.sfx('bell');
            openFriends();
          });
        for (const b of body.querySelectorAll('[data-rej]'))
          b.addEventListener('click', async () => {
            await net.request('friendAnswer', { hid: b.dataset.rej, ok: false });
            openFriends();
          });
        for (const row of body.querySelectorAll('[data-chat]')) row.addEventListener('click', () => openDm(row.dataset.chat));
        body.querySelector('#fr-support').addEventListener('click', openSupport);
      },
    );
  }
  async function openDm(hid) {
    const r = await net.request('dmHistory', { hid });
    if (!r?.ok) return hud.toast(t('找不到這位好友'));
    friendView = { hid };
    setFriendBadge(r.badge);
    const msgs = r.msgs.map((m) => `<div class="dm-msg${m.me ? ' me' : ''}"><span>${escapeHtml(m.t)}</span><small>${fmtTime(m.at)}</small></div>`).join('');
    modal.open(
      `💌 ${r.name}`,
      `<div class="dm-top"><button type="button" class="mini-btn ghost" id="dm-back">‹ ${t('好友')}</button><small>${r.online ? t('🟢 在線上') : t('⚪ 不在線上，下次上線會看到')}・${r.hid}</small>${r.plot ? `<button type="button" class="mini-btn" id="dm-visit">${t('🏕️ 去他家（{p}）', { p: plotName(r.plot) })}</button>` : ''}</div>
      <div class="dm-list" id="dm-list">${msgs || `<div class="dex-note">${r.mutual ? t('打聲招呼吧 👋') : t('⏳ 對方還沒同意好友邀請，同意後才能密頻')}</div>`}</div>
      ${r.mutual ? `<div class="fr-add"><input class="join-input" id="dm-text" maxlength="200" placeholder="${t('想說的話（200 字內）')}" enterkeyhint="send" /><button type="button" class="mini-btn" id="dm-send">${t('送出')}</button><button type="button" class="mini-btn" id="dm-gift">${t('🎁 送禮')}</button></div>
` : ''}
      <div class="dm-tools"><button type="button" class="mini-btn ghost" id="dm-del">${t('刪除好友')}</button><button type="button" class="mini-btn ghost" id="dm-block">${t('🚫 封鎖')}</button></div>`,
      (body) => {
        const list = body.querySelector('#dm-list');
        list.scrollTop = list.scrollHeight;
        // 🌐 密頻也自動翻譯（11/08 作者）：對方用別國語言寫的，下面多一行翻譯；只翻最近 20 則，跟聊天框的 🌐 開關一起
        for (const el of [...list.querySelectorAll('.dm-msg:not(.me)')].slice(-20)) {
          const span = el.querySelector('span');
          translateChat(span.textContent).then((tr) => {
            if (!tr || !el.isConnected) return;
            const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
            const em = document.createElement('em');
            em.className = 'dm-tr';
            em.textContent = `🌐 ${tr}`;
            span.after(em);
            if (nearBottom) list.scrollTop = list.scrollHeight;
          });
        }
        body.querySelector('#dm-back').addEventListener('click', openFriends);
        const inp = body.querySelector('#dm-text');
        const send = async () => {
          const text = inp.value.trim();
          if (!text) return;
          const res = await net.request('dmSend', { hid, text });
          if (!res?.ok) return hud.toast(friendErr(res));
          inp.value = '';
          openDm(hid);
        };
        inp?.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.isComposing) send();
        });
        body.querySelector('#dm-send')?.addEventListener('click', send);
        body.querySelector('#dm-gift')?.addEventListener('click', () => openGiftPick(hid, r.name));
        body.querySelector('#dm-visit')?.addEventListener('click', () => (modal.close(), hud.onGo(`camp:${r.plot.z}`)));
        const drop = async (block) => {
          if (!confirm(block ? t('封鎖 {name}？封鎖後他不能再加你好友、密你', { name: r.name }) : t('刪除好友 {name}？', { name: r.name }))) return;
          await net.request('friendRemove', { hid, block });
          openFriends();
        };
        body.querySelector('#dm-del').addEventListener('click', () => drop(false));
        body.querySelector('#dm-block').addEventListener('click', () => drop(true));
      },
    );
  }
  /** 🎁 送禮給好友：選分類 → 點東西送 1 個 */
  async function openGiftPick(hid, name, cat = 'gather') {
    const info = await net.request('friendGiftInfo', { hid });
    if (!info?.ok) return hud.toast(t('沒有成功，再試一次'));
    // 自己身上能送的東西
    const own = [];
    if (cat === 'dish') for (const [id, n] of Object.entries(dishes ?? {})) n > 0 && own.push({ id, n });
    else if (cat === 'furn') for (const [id, n] of Object.entries(myHome?.inv ?? {})) n > 0 && own.push({ id, n });
    else for (const [id, n] of Object.entries(basket ?? {})) n > 0 && basketCat(id) === cat && own.push({ id, n });
    const rows = own
      .map((o) => ({ ...o, g: giftInfo(cat, o.id) }))
      .filter((o) => o.g)
      .sort((a, b) => a.g.value - b.g.value)
      .map((o) => {
        const tooMuch = o.g.value > info.left;
        return `<div class="craft-row"><i class="dex-emoji">${o.g.icon}</i><div class="craft-info"><b>${t(o.g.zh)} ×${o.n}</b><small>${t('價值 {v} 🌰', { v: o.g.value })}</small></div><button type="button" class="mini-btn" data-give="${o.id}" ${tooMuch ? 'disabled' : ''}>${t('送 1 個')}</button></div>`;
      })
      .join('');
    const block = !info.account
      ? t('🔒 要先按上面「👤 存檔」建立帳號，才能送禮')
      : info.age < GIFT_MIN_DAYS
        ? t('🔒 玩滿 {d} 天才能送禮（還差 {n} 天）', { d: GIFT_MIN_DAYS, n: GIFT_MIN_DAYS - info.age })
        : '';
    modal.open(
      t('🎁 送禮給 {name}', { name }),
      `<div class="dm-top"><button type="button" class="mini-btn ghost" id="gf-back">‹ ${t('回到密頻')}</button></div>
      <div class="dex-note">${t('{name} 今天還可以收 <b>{n}</b> 🌰 價值的禮物（每人每天最多 {cap}）', { name: escapeHtml(name), n: info.left, cap: GIFT_DAILY_CAP })}</div>
      ${block ? `<div class="dex-note gift-block">${block}</div>` : ''}
      <div class="shop-cats">${GIFT_CATS.map((c) => `<button type="button" data-gcat="${c.id}" class="${c.id === cat ? 'on' : ''}">${c.icon} ${t(c.zh)}</button>`).join('')}</div>
      ${cat === 'furn' && !info.tent ? `<div class="dex-note">${t('對方還沒有帳篷，家具先不能送')}</div>` : rows || `<div class="dex-note">${t('這一類你現在沒有東西可以送')}</div>`}`,
      (body) => {
        body.querySelector('#gf-back').addEventListener('click', () => openDm(hid));
        for (const b of body.querySelectorAll('[data-gcat]')) b.addEventListener('click', () => openGiftPick(hid, name, b.dataset.gcat));
        for (const b of body.querySelectorAll('[data-give]')) {
          if (block) b.disabled = true;
          b.addEventListener('click', async () => {
            const g = giftInfo(cat, b.dataset.give);
            if (!(await confirmBuy.ask({ icon: '🎁', name: t('送 {icon} {item} 給 {name}', { icon: g.icon, item: t(g.zh), name }), price: 0, desc: t('送出去就會從你的身上拿走喔'), title: t('🎁 要送這個嗎？'), yes: t('送出') }))) return openGiftPick(hid, name, cat);
            const res = await net.request('giftSend', { hid, cat, id: b.dataset.give, n: 1 });
            if (!res?.ok) {
              hud.toast(
                ({
                  account: t('要先建立帳號才能送禮'),
                  young: t('玩滿 {d} 天才能送禮（還差 {n} 天）', { d: GIFT_MIN_DAYS, n: res?.days ?? 1 }),
                  cap: t('{name} 今天收的禮物已經夠多了，明天再送吧 🎁', { name }),
                  sendMax: t('今天已經送很多次了，明天再送吧'),
                  noTent: t('對方還沒有帳篷，家具先不能送'),
                  notFriend: t('要互相加好友才能送禮'),
                  tooFast: t('慢慢來 🙂'),
                })[res?.reason] ?? t('沒有成功，再試一次'),
                4000,
              );
              return openGiftPick(hid, name, cat);
            }
            basket = res.basket ?? basket;
            dishes = res.dishes ?? dishes;
            if (res.home) setMyHome(res.home);
            audio.sfx('bell');
            hud.toast(t('🎁 送給 {name} 了：{icon} {item}', { name, icon: g.icon, item: t(g.zh) }), 4000);
            openDm(hid);
          });
        }
      },
    );
  }
  net.on('giftGot', (g) => {
    basket = g.basket ?? basket;
    dishes = g.dishes ?? dishes;
    if (g.home) setMyHome(g.home);
    audio.sfx('bell');
    hud.toast(t('🎁 {name} 送你 {icon} {item} ×{n}！', { name: g.name, icon: g.icon, item: t(g.zh), n: g.n }), 6000);
  });
  async function openSupport() {
    if (!net.online) return hud.toast(t('連上伺服器才能聯絡作者'));
    const r = await net.request('supportList');
    if (!r?.ok) return hud.toast(t('還沒連上伺服器'));
    friendView = 'support';
    setFriendBadge(r.badge);
    const past = r.list.map((x) => `<div class="sup-item"><div>🙋 ${escapeHtml(x.t)}<small>${fmtTime(x.at)}</small></div>${x.re ? `<div class="sup-re">🛠️ ${t('作者回覆：')}${escapeHtml(x.re)}<small>${fmtTime(x.reAt)}</small></div>` : `<div class="sup-wait">${t('⏳ 作者還沒回覆，回覆後你會收到通知')}</div>`}</div>`).join('');
    modal.open(
      t('✉️ 聯絡作者'),
      `<div class="dex-note">${t('想對作者說的話、遊戲建議、遇到的 bug 寫在這裡，會自動附上你的玩家編號（{id}）。', { id: r.code })}</div>
      <textarea class="join-input sup-text" id="sup-text" maxlength="300" rows="4" placeholder="${t('例：在湖邊釣魚時畫面卡住了')}"></textarea>
      <div class="yard-opts"><button type="button" class="mini-btn" id="sup-send">${t('寄出')}</button><button type="button" class="mini-btn ghost" id="sup-back">‹ ${t('好友')}</button></div>
      ${past ? `<div class="dex-note">${t('我寄過的')}</div>${past}` : ''}`,
      (body) => {
        const ta = body.querySelector('#sup-text');
        ta.addEventListener('keydown', (e) => e.stopPropagation());
        body.querySelector('#sup-back').addEventListener('click', openFriends);
        body.querySelector('#sup-send').addEventListener('click', async () => {
          const res = await net.request('supportSend', { text: ta.value });
          if (!res?.ok) return hud.toast(res?.reason === 'tooFast' ? t('一分鐘只能寄一封，等一下再寄') : friendErr(res));
          audio.sfx('bell');
          hud.toast(t('✉️ 寄出了！作者回覆後你會收到通知'));
          openSupport();
        });
      },
    );
  }
  net.on('dm', ({ hid, name, t: text }) => {
    if (modal.isOpen && friendView?.hid === hid) return openDm(hid);
    audio.sfx('tap');
    hud.toast(t('💌 {name}：{text}', { name, text: text.length > 30 ? `${text.slice(0, 30)}⋯` : text }), 5000);
  });
  net.on('friendReq', ({ name }) => {
    hud.toast(t('👋 {name} 想加你好友，按左下角「👫 好友」看看', { name }), 6000);
    if (modal.isOpen && friendView === 'list') openFriends();
  });
  net.on('friendNew', ({ name }) => {
    audio.sfx('bell');
    hud.toast(t('👫 你和 {name} 成為好友了！可以密頻囉', { name }), 5000);
    if (modal.isOpen && friendView === 'list') openFriends();
  });
  net.on('supportReply', () => {
    audio.sfx('bell');
    hud.toast(t('🛠️ 作者回覆你的來信了！按左下角「👫 好友」→「✉️ 聯絡作者」看看'), 7000);
    if (modal.isOpen && friendView === 'support') openSupport();
  });

  // ---------- 🎵 帳篷裡的小功能家具（按 E） ----------
  const starTalk = () => { const a = [t('✨ 看到北斗七星了，像一支大勺子'), t('✨ 那顆最亮的是織女星'), t('✨ 獵戶座的三顆星排成一直線'), t('✨ 銀河像一條淡淡的牛奶河'), t('✨ 月亮旁邊有一顆好亮的星星'), t('✨ 好像看到一隻星星做的狐狸')]; return a[Math.floor(Math.random() * a.length)]; };
  async function openFridge(mine) {
    const info = net.online ? await net.request('fridgeInfo') : null;
    const box = info?.fridge;
    const boxName = box ? `${DISH_BY_ID[box.dish]?.icon ?? ''} ${t(DISH_BY_ID[box.dish]?.zh ?? '')}` : '';
    if (!mine) {
      const btn = !box ? `<div class="dex-note">${t('冰箱裡空空的')}</div>` : box.took ? `<div class="dex-note">${t('今天已經拿過一份了')}</div>` : `<div class="yard-opts"><button type="button" class="mini-btn" id="fr-take">${t('😋 拿一份{icon} {name}（還有 {n} 份）', { icon: DISH_BY_ID[box.dish]?.icon ?? '', name: t(DISH_BY_ID[box.dish]?.zh ?? ''), n: box.n })}</button></div>`;
      return modal.open(t('🧊 小冰箱'), `<div class="dex-note">${t('主人放進冰箱的料理，來玩的客人每天可以拿一份')}</div>${btn}`, (body) => {
        body.querySelector('#fr-take')?.addEventListener('click', async () => {
          const r = await net.request('picnicTake', { where: 'fridge' });
          modal.close();
          if (r?.ok) {
            dishes = r.dishes;
            audio.sfx('bell');
            hud.toast(t('😋 拿到一份{icon} {name}！到「📖 圖鑑 → 🍲 料理」可以吃', { icon: DISH_BY_ID[r.dish]?.icon ?? '', name: t(DISH_BY_ID[r.dish]?.zh ?? '') }), 5000);
          } else hud.toast(r?.reason === 'took' ? t('今天已經拿過一份了') : t('冰箱裡的料理被拿完了'));
        });
      });
    }
    const mineDishes = DISHES.filter((d) => dishes[d.id] > 0);
    modal.open(
      t('🧊 我的小冰箱'),
      `<div class="dex-note">${t('放進冰箱的料理，來玩的客人每天可以拿一份（同一種最多 5 份）')}</div>
      <div class="dex-note">${box ? t('冰箱裡有 {n} 份{name}', { n: box.n, name: boxName }) : t('冰箱裡空空的')}</div>
      <div class="yard-opts"><button type="button" class="mini-btn" id="fr-cook">${t('🍲 看我的料理（可以吃）')}</button>${box ? `<button type="button" class="mini-btn" id="fr-back">${t('↩️ 把冰箱裡的拿回來')}</button>` : ''}</div>
      ${mineDishes.map((d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${t(d.zh)} ×${dishes[d.id]}</b></div><button type="button" class="mini-btn" data-put="${d.id}">${t('放一份')}</button></div>`).join('')}`,
      (body) => {
        body.querySelector('#fr-cook').addEventListener('click', () => {
          modal.close();
          fishingUI.openCreel('cook');
        });
        body.querySelector('#fr-back')?.addEventListener('click', async () => {
          const r = await net.request('fridgeBack');
          if (r?.ok) {
            dishes = r.dishes;
            audio.sfx('tap');
            openFridge(true);
          }
        });
        for (const b of body.querySelectorAll('[data-put]')) {
          b.addEventListener('click', async () => {
            const r = await net.request('picnicPut', { id: b.dataset.put, where: 'fridge' });
            if (r?.ok) {
              dishes = r.dishes;
              audio.sfx('bell');
              hud.toast(t('🧊 放進冰箱了（裡面 {n} 份）', { n: r.n }));
              openFridge(true);
            } else hud.toast(r?.reason === 'other' ? t('冰箱裡已經有別的料理，等大家拿完或先拿回來') : r?.reason === 'full' ? t('冰箱已經放滿 5 份了') : t('沒有放成功'));
          });
        }
      },
    );
  }
  /** 🪑 家具小互動用的小語、占卜（11/07） */
  const BOOK_LINES = ['今天也辛苦了，坐下來休息一下吧', '慢慢來，比較快', '星星不會因為你走得慢就不等你', '泡一杯熱茶，什麼事都會好一點', '今天的你，已經很棒了', '火光暖暖的，心也暖暖的', '累了就停下來，聽聽風的聲音', '好好吃飯，好好睡覺', '明天又是新的一天', '有朋友在身邊真好'];
  const FORTUNES = ['大吉：今天會遇到好事 ✨', '中吉：多喝水，心情會很好 💧', '小吉：適合跟朋友聊聊天 💬', '吉：釣魚會有好運 🎣', '末吉：慢慢來就會順利 🐢', '大吉：適合烤一個完美棉花糖 🍡'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const popEmoji = (e) => {
    bubbles.show('self', e, { emoji: true });
    net.emoji(e);
  };
  actions.onGadget = async (id, mine, g) => {
    if (id === 'book') {
      audio.sfx('tap');
      bubbles.show('self', '📖', { emoji: true });
      return hud.toast(`📖 「${t(pick(BOOK_LINES))}」`, 4500);
    }
    if (id === 'clock') {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const next = [570, 1290, 570 + 1440].find((m) => m > mins);
      const left = next - mins;
      return hud.toast(t('⏰ 現在 {h}:{m}・離營火時間還有 {a} 小時 {b} 分', { h: now.getHours(), m: String(now.getMinutes()).padStart(2, '0'), a: Math.floor(left / 60), b: left % 60 }), 4500);
    }
    if (id === 'globe') {
      audio.sfx('tap');
      const n = Object.values(hud.areas ?? {}).reduce((s, v) => s + (v || 0), 0);
      return hud.toast(n ? t('🌍 轉呀轉～ 現在營地有 {n} 位旅人在線上', { n }) : t('🌍 轉呀轉～ 世界好大'), 4000);
    }
    if (id === 'crystal') {
      bubbles.show('self', '🔮', { emoji: true });
      return hud.toast(t('🔮 今日小占卜：{f}', { f: t(pick(FORTUNES)) }), 4500);
    }
    if (id === 'easel') return popEmoji('🎨');
    if (id === 'tea') {
      popEmoji('☕');
      return hud.toast(t('☕ 喝一口，暖呼呼的'));
    }
    if (id === 'plush') return popEmoji('💕');
    if (id === 'chime') {
      audio.sfx('bell');
      return popEmoji('🎐');
    }
    if (id === 'lamp') {
      const on = rooms.home.toggleLamp?.(g);
      audio.sfx('tap');
      return hud.toast(on === false ? t('💡 關燈了') : t('💡 開燈了'));
    }
    if (id === 'feed') {
      rooms.home.feedFish?.();
      bubbles.show('self', '🐟', { emoji: true });
      return hud.toast(t('🐟 撒了一點飼料，魚游過來吃了'));
    }
    if (id === 'water') {
      rooms.home.wiggle?.(g);
      bubbles.show('self', '💧', { emoji: true });
      return hud.toast(t('💧 澆了水，葉子晃了晃 🌱'));
    }
    if (id === 'radio') {
      const i = audio.songIndex;
      const n = i + 1 >= SONGS.length ? -1 : i + 1;
      audio.setSong(n);
      audio.sfx('needle');
      hud.toast(n < 0 ? t('📻 關掉收音機了') : t('📻 收音機播著「{song}」', { song: SONGS[n].name }));
    } else if (id === 'guitar') {
      audio.sfx('strum');
      bubbles.show('self', '🎵', { emoji: true });
      net.emoji('🎵');
    } else if (id === 'telescope') {
      if (!net.online) return hud.toast(isNight() ? starTalk() : t('☀️ 白天看不到星星，晚上再來看看吧'));
      const r = await net.request('telescope');
      if (r?.reason === 'day') return hud.toast(t('☀️ 白天看不到星星，晚上再來看看吧'));
      if (!r?.ok) return;
      if (r.meteor) {
        bubbles.show('self', '🌠', { emoji: true });
        net.emoji('🌠');
        audio.sfx('bell');
        hud.toast(r.got ? t('🌠 看到流星了！快許個願～（+{n} 🌰）', { n: r.got }) : t('🌠 流星一顆接一顆劃過去…'), 4500);
      } else hud.toast(starTalk(), 4000);
    } else if (id === 'fridge') openFridge(mine);
  };
  actions.onWarm = () => hud.toast(t('🔥 小暖爐暖呼呼的'));

  const buildPanel = new BuildPanel({
    getHome: () => homeRoom.home,
    onShop: () => shopPanel.open('furn'), // 🛒 布置時直接買家具，買完回背包就能擺
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
    onExpand: async () => {
      if (await confirmBuy.ask({ ...shopItemInfo('expand'), coins: pinecones })) return buyItem('expand');
    },
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
    cameraRig.focusTarget = null;
    buildPanel.stop();
    if (inHome() && homeRoom.mine) buildPanel.showTools(true, myHome?.open !== false);
  };
  buildPanel.onEnter = startBuild;
  // 🐠 大魚缸：釣過的魚（稀有的排前面）
  buildPanel.getCaught = () =>
    FISH.map((f, i) => ({ f, i }))
      .filter(({ f, i }) => !f.junk && fishingUI.creel[i]?.count)
      .sort((a, b) => (b.f.legend ? 9 : b.f.rarity) - (a.f.legend ? 9 : a.f.rarity))
      .map(({ i }) => i);
  buildPanel.onFloor = (f) => {
    homeRoom.setBuildFloor(f);
    homeRoom.select(null);
    // 布置二樓：鏡頭移到二樓中間
    const c = f === 2 ? homeRoom.loftCenter : null;
    cameraRig.focusTarget = c ? new THREE.Vector3(c.x, c.y, c.z) : null;
    cameraRig.focusMix = 1;
  };
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
      homeRoom.setHome(home, homeRoom.mine, true); // 同一個帳篷更新：留在幾樓、坐著的就繼續坐
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
  /**
   * 🌙 新朋友的「明天見」卡片：告訴他明天回來有什麼，順便請他建帳號存檔（換手機、清瀏覽器也找得回來）
   * 前兩天各出現一次（教學做完，或玩滿 15 分鐘）
   */
  function showSeeYou() {
    if (myAge >= 2 || !net.online) return;
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem('cozy-seeyou') === today) return;
      localStorage.setItem('cozy-seeyou', today);
    } catch {
      return;
    }
    const next = Math.min(9, 2 + Math.min(myStreak + 1, 7));
    const saved = hasAccount();
    modal.open(t('🌙 明天見！'), `
      <div class="seeyou">
        <p>${t('營地每天都有新東西，明天記得回來看看：')}</p>
        <ul>
          <li>${t('🌰 明天一進來就送 {n} 顆松果（連續來越多）', { n: next })}</li>
          <li>${t('🌅 早上 9:30、晚上 9:30 營火時間：魚王、流星雨、松果加倍')}</li>
          <li>${t('👒 每天都有新的每日造型，朋友點你的連結進來玩 1 分鐘就拿到')}</li>
          <li>${t('🌙 晚上 7～11 點每半小時一場小活動')}</li>
        </ul>
        ${saved ? `<p class="seeyou-ok">${t('✅ 你已經有帳號了，換手機登入也找得回來')}</p>` : `<p class="seeyou-warn">${t('⚠️ 還沒建帳號：松果、帳篷只存在這台裝置，清掉瀏覽器資料或換手機就找不回來')}</p>
        <button type="button" class="seeyou-save" id="seeyou-save">${t('👤 建立帳號存檔（30 秒）')}</button>`}
        <p class="seeyou-tip">${t('💡 把這個網頁加到主畫面或書籤，下次一點就到')}</p>
      </div>`, (body) => {
      body.querySelector('#seeyou-save')?.addEventListener('click', () => {
        modal.close();
        hud.onMeClick?.({ focusAccount: true });
      });
    });
  }
  setTimeout(() => showSeeYou(), 15 * 60000);
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
      net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '' });
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
    // 營火火力條放到標題旁邊，按鈕列（人數、分流、名字、松果⋯）就能排到最上面
    document.querySelector('.title')?.appendChild(document.getElementById('fire-meter'));
    for (const id of ['online', 'lake-news', 'sound-unlock', 'today', 'event-line', 'mini-line', 'ritual', 'pomodoro']) {
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
    // 電腦版：左上那幾行（按鈕列、累計、營火時間、小活動）也排成一欄，字放大後才不會互相疊到
    const dstack = document.createElement('div');
    dstack.className = 'd-stack';
    document.getElementById('ui').appendChild(dstack);
    for (const id of ['online', 'lake-news', 'today', 'event-line', 'mini-line']) {
      const el = document.getElementById(id);
      if (el) dstack.appendChild(el);
    }
    // 電腦版：右上角一欄（專注計時器在上、湖畔動態在下），才不會和左上那排按鈕疊在一起
    const rstack = document.createElement('div');
    rstack.className = 'r-stack';
    document.getElementById('ui').appendChild(rstack);
    for (const id of ['pomodoro']) {
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
  let frameNo = 0;
  // ?fps：畫面左下角顯示每秒張數（比對效能用）
  let fpsEl = null;
  let fpsN = 0;
  let fpsT = performance.now();
  if (params.has('fps')) {
    fpsEl = document.createElement('div');
    fpsEl.style.cssText = 'position:fixed;left:8px;bottom:60px;z-index:50;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.6);color:#9f9;font:12px monospace;pointer-events:none';
    document.body.appendChild(fpsEl);
  }
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
    if (!actions.seat) remotes.pushOut(player.position, player.radius); // 坐在圓木上不要被旁邊的人推走
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
    if (goTo?.startsWith?.('zone:')) {
      // 🏕️ 走進中央草原的區域拱門：換到隔壁區
      const z = Number(goTo.slice(5));
      if (!zoneBusy) switchZone(z, z > campZone ? 'next' : 'prev');
    } else if (goTo) roomMgr.switchTo(goTo, switchOnServer);

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
      mobile.setInteract(actions.state === 'free' || actions.seat ? (roomMgr.current.interactHint?.(actions) ?? null) : null); // 坐在圓木上：互動按鈕變成「起身」
      mobile.setRoast(roomMgr.current.roastHint?.(actions) ?? null);
      const p = actions.prompt;
      hud.setPrompt(p && p.replace(/<kbd>([^<]*)<\/kbd>/g, (_, k) => {
        const icon = mobile.keyIcon(k);
        return icon ? `<kbd class="key-icon">${icon}</kbd>` : '';
      }));
    } else hud.setPrompt(actions.prompt);
    ritual?.update(dt, elapsed, ritualState);
    // 🪨 累計旅人・石頭那一行：只在石塔、石頭堆附近顯示
    if (roomMgr?.current.id === 'forest_main') {
      const p = player.position;
      const nc = garden.nearestCairn(p);
      const c = nc >= 0 ? garden.cairns[nc]?.spot : null;
      const d = Math.min(c ? Math.hypot(p.x - c.x, p.z - c.z) : 99, garden.pile ? Math.hypot(p.x - garden.pile.x, p.z - garden.pile.z) : 99);
      hud.setTodayNear(d < 4);
    } else hud.setTodayNear(false);
    document.body.classList.toggle('in-action', actions.state !== 'free');

    // 營火的點光源影子每次要把整個場景多畫 6 次：隔一幀才重畫一次（角色影子幾乎看不出差別）
    if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = (frameNo & 1) === 0;
    frameNo++;
    renderer.render(scene, camera);
    if (fpsEl) {
      fpsN++;
      const now = performance.now();
      if (now - fpsT >= 1000) {
        const info = renderer.info.render;
        fpsEl.textContent = `${Math.round((fpsN * 1000) / (now - fpsT))} fps · ${info.calls} calls · ${Math.round(info.triangles / 1000)}k △`;
        fpsN = 0;
        fpsT = now;
      }
    }
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
  const applyLook = ({ fur, species, tail = '', ear = '' }) => {
    const c = player.character;
    if (isProcedural && (c.speciesIndex !== species || (c.tailId ?? '') !== tail || (c.earId ?? '') !== ear)) {
      player.setCharacter(new ProceduralFox({ fur, species, tail, ears: ear }));
      applyWear();
      player.character.setAccessory?.(myReward);
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
    net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '' });
    net.rejoin({ auto: !profile.custom, name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '', code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
    hud.toast(t('✨ 換好了，{name}', { name: myName }));
  };
  net.connect({
    name: profile.name,
    fur: profile.fur,
    species: isProcedural ? profile.species : 0,
    tail: profile.tail || '',
    ear: profile.ear || '',
    code: profile.code || '',
    vid: visitorId(),
    auto: !profile.custom, // 隨機名字：撞名時伺服器從 alts 換一個
    alts: Array.from({ length: 6 }, () => randomName()),
    touch: !!mobile,
    staff: isStaff(), // 作者自己的裝置：不算進統計
    with: params.get('with') || undefined, // 朋友的邀請連結
    src: detectSource(), // 來源統計：從哪個網站來的
    inapp: inAppKind() || undefined, // 📱 從 LINE、IG 等 App 內建瀏覽器或嵌入網頁進來（統計用）
    pwa: isStandalone() || undefined, // 📲 從手機桌面的圖示打開（統計用）
    ch: Math.floor(Number(profile.ch ?? params.get('ch')) || 0),
    room: roomMgr.current.id,
    x: player.position.x,
    z: player.position.z,
    ry: player.rotationY,
  });

  // 方便在瀏覽器 console 除錯（開發模式或網址加 ?debug）
  if (import.meta.env.DEV || params.has('debug')) {
    window.__cozy = { renderer, forest, scene, camera, player, campfire, world, cameraRig, actions, input, hud, net, remotes, rooms, roomMgr, audio, pomodoro, fishing, fishingUI, social, bubbles, shrinePanel, noticePanel, channelPanel, cairnPanel, ritual, treePanel, shareCard, world, shopPanel, buildPanel, homeRoom: rooms.home, goHome, openBag, showDailyCard, sharePop, openMoveMap, openFriends, _setBag: (d, bk) => ((dishes = d), (basket = bk)) };
  }
}

init().catch((err) => {
  console.error(err);
  window.__bootFail?.(); // 打不開 3D 畫面：在載入畫面上說明
});
