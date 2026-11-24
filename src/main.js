import { randomName, isAutoName } from './social/names.js';
import * as THREE from 'three';
import './style.css';
import { t, translateStatic, lang } from './i18n/i18n.js';
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
import { RemotePlayers, setRemoteHeight, setRemoteSpot, setCharScale, setRemoteFireSeats, setRemoteBoat } from './network/RemotePlayers.js';
import { BOAT_LIST, BOAT_FROM, BOAT_MS, FEED_PRICE, FEED_MS } from './game/boats.js';
import { FIRE_HOT, COOP_GAIN, COOP_MIN_TAPS, COOP_SEC } from './game/river.js';
import { POND } from './game/pondShape.js';
import { SpiritFollower } from './player/spiritFollower.js';
import { buildSpirit, SPIRIT_TYPES, SPIRIT_BY_ID } from './player/spirit.js';
import { parseSpirit } from './game/spiritRules.js';
import { SpiritGames, SPIRIT_GAMES } from './game/spiritGames.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SONGS } from './audio/music.js';
import { CHALLENGE_BY_ID } from './game/dailyChallenge.js';
import { HOLIDAYS, HOL_TASK_BY_ID, HOL_TASK_GAIN, HOL_STEP_GAIN, HOL_START } from './game/holiday.js';
import { DAILY_BY_ID, WEEKLY_BY_ID, CAT_TROPHY, CAT_NAME, WEEKLY_PLANT_AT, WEEKLY_BAIT_AT, DAILY_GAIN } from './game/quests.js';
import { RoomManager } from './rooms/RoomManager.js';
import { createForestRoom } from './rooms/forestRoom.js';
import { createTentRoom } from './rooms/tentRoom.js';
import { createTreehouseRoom } from './rooms/treehouseRoom.js';
import { createLakeRoom, LAKE_WATER_Y } from './rooms/lakeRoom.js';
import { createSocialTentRoom } from './rooms/socialTentRoom.js';
import { createHomeRoom } from './rooms/homeRoom.js';
import { ShopPanel, tintable } from './ui/ShopPanel.js';
import { BuildPanel } from './ui/BuildPanel.js';
import { createDemoHome } from './game/demoHome.js';
import { WelcomeCard } from './ui/WelcomeCard.js';
import { UpdateNews } from './ui/UpdateNews.js';
import { ConfirmBuy } from './ui/ConfirmBuy.js';
import { buildYard } from './rooms/yardModels.js';
import { buildSign } from './rooms/signModels.js';
import { SIGN_BY_ID } from './game/signCatalog.js';
import { ALL_COLORS, CATALOG_BY_ID, gridOf, expandPrice, fishFits, stackAt, canAddTo } from './game/furnitureCatalog.js';
import { YARD_BY_ID, YARD_USES } from './game/yardCatalog.js';
import { FUR_PALETTES } from './player/characters/furPalettes.js';
import { BASE_FUR, PREMIUM_FUR, TAILS, EARS, TAIL_BY_ID, EAR_BY_ID, SPECIES_TAIL, SPECIES_EARS } from './game/looks.js';
import { GuestPanel } from './ui/GuestPanel.js';
import { translateChat, translateEnabled, setTranslateEnabled } from './network/chatTranslate.js';
import { ANNOUNCE_TPL, ANNOUNCE_SHOW_MS } from './game/announce.js';
import { GiftPanel } from './ui/GiftPanel.js';
import { GIFT_FURNITURE } from './game/furniture.js';
import { TENT_STYLE_BY_ID, styleOf, tentTexture } from './game/tentStyles.js';
import { createCampgroundRoom } from './rooms/campgroundRoom.js';
import { RACE_LANTERNS, makeRaceRoute, HUNT_SPOTS, HUNT_COUNT, HUNT_GAIN } from './game/miniSpots.js';
import { TENT_SHAPE_BY_ID, buildTentShell } from './game/tentShapes.js';
import { lowpoly, updateNearFade } from './rooms/shared.js';
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
import { HelpPanel, spiritRuleLines } from './ui/HelpPanel.js';
import { isXmas } from './game/season.js';
import { setupFrameFocus } from './ui/FrameFocus.js';
import { BoardGameUI } from './ui/BoardGameUI.js';
import { GIFT_CATS, giftInfo, basketCat, GIFT_DAILY_CAP, GIFT_MIN_DAYS } from './game/gifts.js';
import { FIRE_SEATS } from './rooms/fireSeats.js';
import { SHOP_FRONT } from './rooms/shop.js';
import { LakeNews } from './ui/LakeNews.js';
import { TreePanel } from './ui/TreePanel.js';
import { ShareCard } from './ui/ShareCard.js';
import { ORNAMENT_BY_ID } from './game/ornaments.js';
import { STONE_FLAG, CAIRN_MAX } from './rooms/cairns.js';
import { FishingGame } from './fishing/FishingGame.js';
import { FISH, packFish, stars } from './fishing/fishData.js';
import { todaySpecial, isOpen } from './game/dailySpecial.js';
import { FishingUI } from './ui/FishingUI.js';
import { createMistForestRoom } from './rooms/mistForestRoom.js';
import { OUTFITS, OUTFIT_BY_ID, OUTFIT_SLOTS } from './game/outfits.js';
import { GATHER_ITEMS, GATHER_BY_ID, GATHER_TYPES, GATHER_DEX_BONUS, NET_PRICE, isNight, taipeiMonth, isLimited, gatherOpen, inSeason, gatherDexItems } from './game/gathering.js';
import { CROPS, CROP_BY_ID, WATER_MAX } from './game/garden.js';
import { haveOf, canMake, specLabel, materialOf, EGGS } from './game/materials.js';
import { RECIPES } from './game/crafting.js';
import { LegendShow } from './rooms/legendShow.js';
import { HEN_COLORS, HEN_MAX, COOP_PRICE, FEED_PER_DAY, HEN_FROM, canFeed } from './game/hens.js';
import { LEGENDS, LEGEND_BY_ID } from './game/legendRules.js';
import { SOOTY_AT, SEASONINGS, SEASON_BY_ID, SEASON_PRICE, SEASON_USES, SEASON_MAX, POT_MAX, POT_RECIPES, DARK, FLAVORS, FLAVOR_TOTAL, unlockHave, unlockLabel } from './game/potCooking.js';
import { DISHES, DISH_BY_ID, dishName, myDishes as ownedDishes, activeBuff, DISH_FX, BUFFS, BUFF_MS, homeCanCook } from './game/cooking.js';
import { museumItems, museumCats, MUSEUM_BY_ID } from './game/museum.js';
import { TRASH, TRASH_BY_ID, RECYCLE_DAILY_CAP } from './game/trash.js';
import { PASS, PASS_TIERS, PASS_TIER_LIST, PASS_PLANS, FREE, sponsorTier } from './game/pass.js';
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
  // 🔗 11/17 從嵌入的網站按「用瀏覽器打開」過來：用一次性代碼把原本的角色、進度接過來，再重新整理一次
  if (params.get('xfer')) {
    const clean = new URL(location.href);
    clean.searchParams.delete('xfer');
    try {
      const r = await fetch(`/api/xfer/${encodeURIComponent(params.get('xfer'))}`);
      const j = r.ok ? await r.json() : null;
      if (j?.ok && j.data?.['cozy-campfire-vid']) {
        for (const [k, v] of Object.entries(j.data)) if (/^cozy/.test(k)) localStorage.setItem(k, v);
      }
    } catch {
      /* 接不過來就當新的開始 */
    }
    location.replace(clean.href);
    return;
  }
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
  /** 📱 手機直放（作者 11/24 精簡用） */
  const compactPortrait = () => !!mobile && innerWidth < 600 && innerHeight > innerWidth;
  setupFrameFocus(); // 🖱️ 被遊戲入口網站嵌進去時：先「點一下開始」，鍵盤才收得到

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
  let shownHomeOwner = null; // 畫面上這個帳篷是誰的（伺服器的 owner 代碼）
  const remotes = new RemotePlayers(scene, zzz);
  /** 小任務引導（下面建立；先宣告，讓前面的事件也能通知它） */
  let ritual = null;
  const names = new Map();
  actions.onAddWood = () => {
    net.addWood();
    ritual?.event('wood');
  };
  actions.onRoastDone = (d) => {
    ritual?.event('roast', d);
    if (net.online) net.socket?.emit('roasted', { burnt: d >= 1 }); // 🍳 烤棉花糖幾次（解鎖隱藏食譜）
  };
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
    onCatch: (index, size, perfect, shiny) => {
      setStage(2); // 🌱 第一次釣到魚：造型、約朋友打開
      ritual?.event('fish', { junk: !!FISH[index]?.junk });
      if (!FISH[index]?.junk && size > (todayLog.size ?? 0)) logToday({ fish: index, size }); // 分享文案用：今天最大的魚
      const rec = fishingUI.record(index, size);
      lastCatch = { index, size, rec: { ...rec, shiny } };
      fishingUI.showCard(index, size, lastCatch.rec);
      const ff = FISH[index];
      if (ff && !ff.junk && (ff.legend || ff.rarity >= 4 || shiny)) {
        const stars = (shiny ? '✨' + t('異色') + ' ' : '') + (ff.legend ? '👑' : `★${ff.rarity}`);
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
    onKeep: (index, size, shiny) => {
      setTrophy({ index, size, shiny });
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
  const seatedNear = (x, z, r) => (['sofa', 'eat', 'sleep', 'bounce'].includes(actions.state) && Math.hypot(player.position.x - x, player.position.z - z) < r) || remotes.anySeatedNear?.(x, z, r);
  rooms.campground.occupied = seatedNear;
  if (rooms.home) rooms.home.occupied = seatedNear;
  // 特殊魚的出現條件：營火時間、整點釣魚大賽
  fishing.roll = () => (net.online ? net.request('fishRoll') : null); // 🎣 這一竿的魚由伺服器決定
  fishing.context = () => ({ event: !!currentEvent()?.active, contest: !!(miniState?.active && miniState.kind === 'fish') });

  // ---------- 表情、聊天 ----------
  let myName = '';
  const bubbles = new SpeechBubbles(scene);
  // 🐟 舉著大魚講話：泡泡往上移到魚的上面（作者 11/22：字被魚蓋住）
  const fishBox = new THREE.Box3();
  const aboveFish = (ch, out) => {
    const f = ch?.heldFish;
    if (!f?.visible || !f.children.length) return;
    fishBox.setFromObject(f);
    if (!fishBox.isEmpty()) out.y = Math.max(out.y, fishBox.max.y - 0.8);
  };
  const headOf = (id, out) => {
    if (id === 'self') {
      player.character.getHeadWorldPosition(out);
      aboveFish(player.character, out);
      return true;
    }
    const r = remotes.get(id);
    if (!r) return false;
    r.character.getHeadWorldPosition(out);
    aboveFish(r.character, out);
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
    onContact: () => openSupport(), // 💡 給建議 → ✉️ 聯絡作者（作者 11/17）
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
    race: () => t('🏃 燈籠賽跑開始了！依序跑過森林裡 1→5 號燈籠，最快的前三名送松果') + (isTouch() ? '' : ' ' + t('💡 電腦按 Shift 可以跑步，比較快')),
    hunt: () => t('✨ 找金松果開始了！森林裡會一顆一顆冒出 5 顆發光的金松果，找到一顆 +5 松果'),
    wood: () => t('🔥 添柴時光開始了！10 分鐘內每添一根柴多 1 顆松果'),
  };
  const applyMini = (m, announce = false) => {
    const sameRace = miniState?.active && miniState.kind === 'race' && m.active && m.kind === 'race';
    miniState = { ...m, top: m.top ?? [], spots: m.spots ?? [], at: performance.now() };
    // 森林裡的道具
    // 作者 11/24：燈籠位置每場隨機 → 新的一場先清掉，checkMini 再跟伺服器拿這場的位置
    if (!sameRace) forest.mini.setRace(false);
    if (m.active && m.kind === 'race') forest.mini.setRace(true, sameRace ? forest.mini.next : 0);
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
  // 下一顆金松果冒出來了
  net.on('miniHuntShow', (m) => {
    if (!m?.active) return;
    applyMini(m, false);
    hud.toast(t('✨ 森林裡冒出一顆金松果了！快去找找'), 4500);
    audio.sfx('bell');
  });
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
  let raceAskAt = 0;
  const checkMini = () => {
    const m = miniState;
    if (miniBusy || !m?.active || roomMgr?.current !== forest) return;
    const pos = player.position;
    if (m.kind === 'race') {
      if (!forest.mini.hasRoute) {
        // 還不知道這一場燈籠在哪：跟伺服器拿
        if (performance.now() < raceAskAt) return;
        raceAskAt = performance.now() + 3000;
        miniBusy = true;
        miniReq('race', { op: 'route' }).then((res) => {
          miniBusy = false;
          if (res?.ok && res.route) forest.mini.setRace(true, res.next ?? 0, res.route);
        });
        return;
      }
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
  net.on('invitedGift', ({ name, n }) => hud.toast(t('🎁 你是 {name} 邀請來的！送你 {n} 顆松果，一起玩吧 🔥', { name, n }), 6000));
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
    // 📱 作者 11/24（手機精簡）：一般的撿到松果，手機直放只在上方松果數字旁邊飄「+n」，不跳到畫面中間
    if (reason === 'sit') compactPortrait() || hud.toast(t('🌰 在營地待了一會兒，撿到 {n} 顆松果', { n: delta }));
    else if (reason === 'quest') hud.toast(t('🌰 完成任務，拿到 {n} 顆松果！可以去心願大樹換裝飾', { n: delta }), 3500);
    else if (reason === 'fish' && !fishingUI.addCoin(delta, !!fishing.active)) compactPortrait() || hud.toast(t('🌰 釣到魚，撿到 {n} 顆松果', { n: delta }));
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
    daily: [t('📅 每日造型：打開「📒 任務」→「📅 每日」，3 題做完就拿到；那天有朋友點你的連結來玩 1 分鐘也能拿（大約一個月輪一次，錯過會再回來）'), t('完成每日任務')],
    weekly: [t('🗓️ 每週限定：打開「📒 任務」→「🗓️ 每週」，5 題做完就拿到；或邀一位第一次來玩的新朋友（點你的連結、待滿 3 分鐘）。每週一換，8 週輪一次'), t('做完每週任務')],
    date: [t('🔥 營火之約：早上或晚上 9:30～10:00 營火時間，和互相加好友的朋友一起在營火廣場待 1 分鐘（或朋友點你的連結進來），兩個人各拿一款；7 款照順序送，同一位朋友一天算一次'), t('9:30 和好友一起烤火')],
    eco: [t('垃圾圖鑑全部收集完就拿到'), t('垃圾圖鑑收集完')],
    sponsor: [t('11 月支持營地限定：那個月贊助就送一頂（已經結束，之後的假髮改成月票用松果買）'), t('贊助限定（已結束）')],
    pass: [t('🎫 月票限定：有月票的人在「🏪 小舖 → 🎫 月票」用松果買（只賣那個月，隔年同月再回來）'), t('月票用松果買')],
    xmas: [t('聖誕限定：11/27～1/6 連續上線每滿 3 天送一款'), t('聖誕期間連續上線 3 天')],
    cook: [t('自由料理鍋煮失敗（黑暗料理）10 次就拿到'), t('煮失敗 10 次')],
    quest: [t('💄 任務本集章：一個月集滿 20 個章送 1 款（照順序）'), t('任務本集滿 20 章')],
  };
  const howOf = (o) => (o.src === 'sponsor' && o.month >= '2026-12' ? 'pass' : o.src); // 12 月起的假髮：月票用松果買
  // 🎄 聖誕造型：聖誕期間、或已經拿到的才顯示（11 月先不出現，也不算在總數裡）
  const showOutfit = (o) => (payOn || (o.src !== 'sponsor' && o.src !== 'pass')) && (o.src !== 'xmas' || isXmas() || look.outfits.includes(o.id)) && (isOpen(o) || look.outfits.includes(o.id));
  fishingUI.extraTabs.push({
    id: 'outfit',
    label: t('👒 造型'),
    title: () => t('👒 造型 {n}／{total}', { n: look.outfits.length, total: OUTFITS.filter(showOutfit).length }),
    render: () => {
      if (lookSlot === 'body') return renderBody();
      const owned = new Set(look.outfits);
      const today = look.daily ? OUTFIT_BY_ID[look.daily] : null;
      const week = look.weekly ? OUTFIT_BY_ID[look.weekly] : null;
      const cards = OUTFITS.filter((o) => o.slot === lookSlot && (o.src !== 'xmas' || isXmas() || owned.has(o.id)) && (isOpen(o) || owned.has(o.id)))
        .map((o) => {
          const has = owned.has(o.id);
          const worn = look.wear?.[o.slot] === o.id;
          const tag = o.src === 'weekly' ? t('每週限定') : o.src === 'date' ? t('營火之約') : o.src === 'eco' ? t('淨灘小隊') : o.src === 'sponsor' && o.month < '2026-12' ? t('{m} 贊助限定', { m: o.month }) : o.src === 'sponsor' || o.src === 'pass' ? t('{m} 月票限定', { m: o.month }) : o.src === 'xmas' ? t('聖誕限定') : o.src === 'cook' ? t('煮失敗紀念') : o.id === look.daily ? t('今天的') : t('每日');
          return has
            ? `<div class="dex-card outfit${worn ? ' worn' : ''}" data-id="${o.id}"><i class="dex-emoji">${o.icon}</i><b>${t(o.zh)}</b><small>${tag}</small><em>${worn ? t('穿著中・點一下脫掉') : t('點一下穿上')}</em></div>`
            : `<div class="dex-card unknown" title="${HOW[howOf(o)][0]}"><i class="dex-emoji">${o.icon}</i><b>${t('？？？')}</b><small>${tag}</small><em>${HOW[howOf(o)][1]}</em></div>`;
        })
        .join('');
      return `
        <div class="outfit-today">
          ${today ? (look.dailyGot ? t('✅ 今天的每日造型「{name}」已經拿到了', { name: outfitName(today.id) }) : t('🎁 今天的每日造型：{name}（朋友點你的連結進來玩 1 分鐘就拿到）', { name: outfitName(today.id) })) : ''}
          ${week ? `<br>${look.weeklyGot ? t('✅ 這週限定「{name}」已經拿到了', { name: outfitName(week.id) }) : t('🌟 這週限定：{name}（朋友透過你的連結來玩就拿到）', { name: outfitName(week.id) })}` : ''}
          <br>${t('🔥 營火之約：9:30 營火時間和互相加好友的朋友一起在營火廣場待 1 分鐘（新朋友點你的連結進來），兩個人都拿到限定造型')}
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
    `<div class="outfit-slot-tabs">${OUTFIT_SLOTS.filter((sl) => (sl.id !== 'hair' && sl.id !== 'clip') || (payOn && (sl.id !== 'clip' || isOpen({ from: '2026-11-27' }))) || look.outfits.some((id) => OUTFIT_BY_ID[id]?.slot === sl.id)).map((sl) => `<button type="button" data-slot="${sl.id}" class="${sl.id === lookSlot ? 'on' : ''}">${sl.icon} ${t(sl.zh)}</button>`).join('')}<button type="button" data-slot="body" class="${lookSlot === 'body' ? 'on' : ''}">${t('🐾 外型')}</button></div>`;
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
    // 11/09 玩家回報：買過大耳朵，重新進來又要再買 → 點之前一定先向伺服器問一次「買過哪些」（以前只有點「身體」分頁才會問）
    if (net.online) await refreshLooks();
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
      if (res?.reason === 'owned') {
        await refreshLooks(); // 其實買過了：不扣松果，直接換上
      } else if (!res?.ok) return hud.toast(res?.reason === 'poor' ? t('松果不夠喔 🌰') : t('沒買成，再試一次吧'));
      else {
        myLooks = res.looks ?? myLooks;
        audio.sfx('bell');
        hud.toast(t('🐾 買到了！已經幫你換上'));
      }
    }
    // 換上：動物本來的形狀記成空的（換動物時跟著變）
    const next = { ...profile };
    if (kind === 'fur') next.fur = val;
    else if (kind === 'tail') next.tail = SPECIES_TAIL[sp] === val ? '' : val;
    else next.ear = SPECIES_EARS[sp] === val ? '' : val;
    profile = { ...next, custom: true, customLook: true, lookAt: Date.now() };
    applyLook(profile);
    saveProfile(profile);
    pushLook();
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
      return hud.toast(t('🎁 拿到全部造型了！到「🎒 背包 → 👒 造型」挑一件穿'), 6000);
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
          : why === 'xmas'
            ? t('🎄 連續上線 3 天！拿到聖誕造型：{name}', { name: outfitName(id) })
          : why === 'cook'
            ? t('😵 煮失敗 10 次了⋯⋯拿到「灰頭土臉」造型！到「👒 造型 → 頭髮」可以戴', { name: outfitName(id) })
          : why === 'daily'
            ? t('👒 朋友點了你的連結！拿到今天的每日造型：{name}', { name: outfitName(id) })
            : why === 'chal'
            ? t('📒 今天的任務全部完成！拿到今天的每日造型：{name}', { name: outfitName(id) })
            : why === 'qweek'
            ? t('📒 這週的任務全部完成！拿到本週限定造型：{name}', { name: outfitName(id) })
            : why === 'stamp'
            ? t('💄 這個月集滿 20 個章！拿到臉妝：{name}', { name: outfitName(id) })
            : why === 'staff'
            ? t('🎁 營地作者送你一款造型：{name}', { name: outfitName(id) })
            : t('👒 拿到今天的每日造型：{name}', { name: outfitName(id) });
    hud.toast(`${msg}${t('（到「🎒 背包 → 👒 造型」穿上）')}`, 6500);
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
  net.on('staffGift', ({ kind, id, home, why }) => {
    if (home) setMyHome(home);
    audio.sfx('bell');
    if (kind === 'furn' && why === 'quest') return hud.toast(t('📒 任務獎勵：{icon} {name}！回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }), 6000);
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
      const n = gatherDexItems().filter((x) => found(x.id)).length;
      hud.toast(t('📖 圖鑑新收錄：{icon} {name}！+{n} 🌰（{c}／{t}）', { icon: it.icon, name: t(it.zh), n: res.gain, c: n, t: gatherDexItems().length }), 4500);
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
    title: () => t('🍄 採集圖鑑 {n}／{total}', { n: gatherDexItems().filter((x) => found(x.id)).length, total: gatherDexItems().length }),
    render: () => {
      const card = (x) =>
        found(x.id)
          ? `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${t(x.zh)}</b><small>${rarityStars(x.rarity)}${museum[x.id] ? ' 🏛️' : ''}</small><em>${t('採集籃裡 ×{n}', { n: basket[x.id] ?? 0 })}</em></div>`
          : `<div class="dex-card unknown"><i class="dex-emoji">${x.icon}</i><b>${t('？？？')}</b><small>${rarityStars(x.rarity)}${x.night ? ' 🌙' : x.day ? ' ☀️' : ''}</small><em>${t(x.hint)}</em></div>`;
      const groups = GATHER_TYPES.map((ty) => {
        const cards = GATHER_ITEMS.filter((x) => x.type === ty.id && !isLimited(x) && (gatherOpen(x) || found(x.id))).map(card).join('');
        return `<div class="dex-note">${ty.icon} ${t(ty.zh)}</div><div class="dex-grid">${cards}</div>`;
      }).join('');
      // 🗓️ 每月限定：這個月的、或撿過的才顯示（不算進全收集）
      const lim = GATHER_ITEMS.filter((x) => isLimited(x) && (inSeason(x) || found(x.id)));
      const limited = lim.length ? `<div class="dex-note">${t('🗓️ 限定（每月限定、❄️ 冬天限定；不算進全收集，每年會再出現）')}</div><div class="dex-grid">${lim.map(card).join('')}</div>` : '';
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
    const shinyDex = new Set((info.shinyDex ?? []).map(Number));
    const crops = new Set(info.crops ?? []);
    const tdex = new Set(info.tdex ?? []);
    const tbag = info.tbag ?? {};
    // 🥕✨♻️ 11/22 擴充：菜園蔬菜看收成過、異色魚拓看異色圖鑑、怪東西看垃圾袋（或採集籃）
    const has = (x) =>
      x.type === 'fish' ? fishDex.has(x.fish) : x.type === 'shiny' ? shinyDex.has(x.fish) : x.type === 'trash' ? tbag[x.trash] > 0 || basket[x.trash] > 0 : basket[x.id] > 0;
    const known = (x) => (x.type === 'fish' ? fishDex.has(x.fish) : x.type === 'shiny' ? shinyDex.has(x.fish) : x.type === 'trash' ? tdex.has(x.trash) : x.type === 'veg' ? crops.has(x.id) || basket[x.id] > 0 : found(x.id));
    const nameOf = (x) => (x.type === 'fish' || x.type === 'shiny' ? x.name : t(x.zh));
    const ITEMS = museumItems();
    const total = ITEMS.length;
    const n = Object.keys(museum).filter((id) => MUSEUM_BY_ID[id] && ITEMS.includes(MUSEUM_BY_ID[id])).length;
    if (!museumCats().some((c) => c.id === museumCat)) museumCat = 'mush';
    const tabs = museumCats().map((c) => {
      const items = ITEMS.filter((x) => x.type === c.id);
      const done = items.filter((x) => museum[x.id]).length;
      return `<button type="button" data-mcat="${c.id}" class="${c.id === museumCat ? 'on' : ''}">${c.icon} ${t(c.zh)}<small>${done}/${items.length}</small></button>`;
    }).join('');
    const cards = ITEMS.filter((x) => x.type === museumCat)
      .map((x) => {
        const d = museum[x.id];
        if (d) return `<div class="dex-card rarity-${x.rarity}"><i class="dex-emoji">${x.icon}</i><b>${nameOf(x)}</b><small>${t('第一個捐的人')}</small><em>${escapeHtml(d.n)}</em></div>`;
        const can = has(x) && info.left > 0;
        return `<div class="dex-card ${has(x) ? 'can-donate' : 'unknown'}"><i class="dex-emoji">${x.icon}</i><b>${known(x) ? nameOf(x) : t('？？？')}</b><small>${rarityStars(x.rarity)}</small>${has(x) ? `<button type="button" class="mini-btn" data-donate="${x.id}" ${can ? '' : 'disabled'}>${x.type === 'fish' || x.type === 'shiny' ? t('🎣 捐魚拓') : t('🎁 捐出')}</button>` : `<em>${t('還沒有人捐')}</em>`}</div>`;
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
              const mt = MUSEUM_BY_ID[b.dataset.donate]?.type;
              if (mt === 'trash') basket = res.basket ?? basket; // 垃圾袋沒有的話是從採集籃拿的
              else if (mt !== 'fish' && mt !== 'shiny') {
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
    if (it && n !== myName) hud.toast(t('🏛️ {name} 把{icon} {item}捐進了標本櫃', { name: n, icon: it.icon, item: it.type === 'fish' || it.type === 'shiny' ? it.name : t(it.zh) }), 4000);
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
    actions.buffSpeed = a?.k === 'speed' || a?.k === 'burnt' ? a.v : 1;
    player.character.setBurnt?.(a?.k === 'burnt'); // 😵 黑暗料理：臉焦黑、頭髮炸開、冒綠煙
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
  /** 🍳 在自己帳篷的爐子旁邊：回傳 'stove'（瓦斯爐、灶台）或 'oven'（小烤箱），不在就 null */
  const homeCookAt = () => {
    if (roomMgr?.current.id !== 'home' || !rooms.home.mine) return null;
    const p = player.position;
    let best = null;
    let bd = 1.8;
    for (const g of rooms.home.gadgets) {
      if (g.id !== 'cook') continue;
      const d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d < bd) [best, bd] = [g, d];
    }
    return best ? CATALOG_BY_ID[best.item]?.cook ?? null : null;
  };
  // ---------- 🍳 自由料理鍋（11/19 作者：進階玩法；原本的食譜保留給新手）----------
  let cookView = 'menu'; // menu＝原本的食譜、pot＝自由料理鍋、book＝料理圖鑑
  let pot = null; // 伺服器給的 { fk, sea, basket, tbag, fc, crops, cnt, pc, dishes, cooked }
  let potSel = []; // 鍋子裡的材料 token
  let potSea = {}; // 加了幾份調味料
  let potCat = 'veg';
  let potDone = null; // 剛煮好的結果卡
  const potHas = (tok) => {
    const [k, id] = tok.split(':');
    const n = (k === 'f' ? pot?.fk : k === 't' ? pot?.tbag : pot?.basket)?.[id] ?? 0;
    return n - potSel.filter((x) => x === tok).length;
  };
  const tokInfo = (tok) => {
    const [k, id] = tok.split(':');
    if (k === 'f') {
      const f = FISH[Number(id)];
      return { icon: f?.legend ? '🐉' : '🐟', name: f?.name ?? '', star: f ? stars(f.rarity) : '' };
    }
    const m = k === 't' ? TRASH_BY_ID[id] : materialOf(id);
    return { icon: m?.icon ?? '❔', name: t(m?.zh ?? id), star: '' };
  };
  const seaN = () => Object.values(potSea).reduce((a, b) => a + b, 0);
  const POT_CATS = [
    ['veg', t('🥬 蔬菜')],
    ['fruit', t('🍓 果實')],
    ['mush', t('🍄 蘑菇')],
    ['flower', t('🌼 花')],
    ...(isOpen({ from: HEN_FROM }) ? [['egg', t('🥚 雞蛋')]] : []),
    ['fish', t('🐟 魚')],
    ['weird', t('🥾 怪東西')],
    ['sea', t('🧂 調味料')],
  ];
  const potItems = () => {
    if (potCat === 'fish') return Object.keys(pot?.fk ?? {}).map((i) => `f:${i}`).sort((a, b) => FISH[a.slice(2)].rarity - FISH[b.slice(2)].rarity);
    if (potCat === 'weird')
      return [
        ...Object.keys(pot?.tbag ?? {}).map((id) => `t:${id}`),
        ...Object.keys(pot?.basket ?? {}).filter((id) => ['bug', 'stone', 'shell', 'treasure', 'trash'].includes(materialOf(id)?.type)).map((id) => `m:${id}`),
      ];
    return Object.keys(pot?.basket ?? {}).filter((id) => materialOf(id)?.type === potCat).map((id) => `m:${id}`);
  };
  const specText = (sp) =>
    sp === '*'
      ? t('❔ 任意一樣')
      : sp === 'F' || sp === 'f*'
      ? t('🐟 任意魚')
      : /^f\d+$/.test(sp)
        ? `🐟 ${FISH[Number(sp.slice(1))]?.name ?? ''}`
        : sp.startsWith('t:')
          ? `${TRASH_BY_ID[sp.slice(2)]?.icon ?? ''} ${t(TRASH_BY_ID[sp.slice(2)]?.zh ?? '')}`
          : sp[0] === '@'
            ? specLabel({ type: sp.slice(1) }, t)
            : specLabel({ id: sp }, t);
  const cookTabs = () =>
    !isOpen({ from: '2026-11-19' })
      ? '' // 🗓️ 11/20 跟小精靈更新一起開（網址 ?open1120=1 可以先看）
      : `<div class="pot-tabs">${[
      ['menu', t('🍲 食譜')],
      ['pot', t('🍳 自由料理鍋')],
      ['book', t('📖 料理圖鑑')],
    ]
      .map(([id, label]) => `<button type="button" class="${cookView === id ? 'on' : ''}" data-cookview="${id}">${label}</button>`)
      .join('')}</div>`;
  function potHtml() {
    if (!pot) return `<div class="dex-note">${t('讀取中⋯')}</div>`;
    const here = atPot() || atGrill() || !!homeCookAt();
    if (potDone) {
      const d = DISH_BY_ID[potDone.dish];
      const fx = d && DISH_FX[d.id];
      const b = fx && BUFFS[fx[0]];
      const tags = [
        potDone.firstKind ? t('🆕 新料理！') : potDone.first ? t('🆕 新口味！') : '',
        potDone.gain ? `+${potDone.gain} 🌰` : '',
        d?.dark ? t('💀 黑暗料理') : d?.kind === 'survival' ? t('🥾 求生料理') : d?.kind === 'hidden' || d?.kind === 'unlock' ? t('✨ 隱藏食譜') : '',
      ].filter(Boolean);
      return `<div class="pot-result ${d?.dark ? 'dark' : ''}"><div class="big">${d?.icon ?? '🍲'}</div><b>${dishName(d, t)}</b>
        <div>${tags.map((x) => `<span class="tag">${x}</span>`).join('')}</div>
        ${b ? `<small>${t('吃了：')}${b.icon} ${t(b.zh)}・${t(b.desc)}・${t('10 分鐘')}</small>` : ''}
        ${potDone.locked ? `<small class="pot-lock">${t('🤔 好像差一點點⋯⋯這個組合要先解鎖，去料理圖鑑看看條件吧')}</small>` : ''}
        <div class="pot-btns"><button type="button" class="mini-btn" data-eat="${potDone.dish}">${t('😋 現在吃')}</button><button type="button" class="mini-btn" data-potagain>${t('🍳 再煮一鍋')}</button></div></div>`;
    }
    const slots = [0, 1, 2, 3]
      .map((i) => {
        const tok = potSel[i];
        if (!tok) return `<div class="pot-slot">＋</div>`;
        const x = tokInfo(tok);
        return `<button type="button" class="pot-slot f" data-potout="${i}"><i>${x.icon}</i><small>${escapeHtml(x.name)}</small></button>`;
      })
      .join('');
    const seaChips = Object.entries(potSea)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `<button type="button" class="pot-sea" data-seaout="${k}">${SEASON_BY_ID[k].icon} ${t(SEASON_BY_ID[k].zh)} ×${n}</button>`)
      .join('');
    let list;
    if (potCat === 'sea') {
      list = `<div class="dex-note">${t('調味料：{n} 🌰 一包，一包可以用 {u} 次；一鍋最多加 {m} 份', { n: SEASON_PRICE, u: SEASON_USES, m: SEASON_MAX })}</div>${SEASONINGS.map((s) => {
        const have = (pot.sea?.[s.id] ?? 0) - (potSea[s.id] ?? 0);
        return `<div class="craft-row"><i class="dex-emoji">${s.icon}</i><div class="craft-info"><b>${t(s.zh)}</b><small>${t('還可以用 {n} 次', { n: have })}</small></div>
          <button type="button" class="mini-btn" data-seain="${s.id}" ${have > 0 && seaN() < SEASON_MAX ? '' : 'disabled'}>${t('加一份')}</button>
          <button type="button" class="mini-btn" data-seabuy="${s.id}" ${pot.pc >= SEASON_PRICE ? '' : 'disabled'}>${t('買一包 {n}🌰', { n: SEASON_PRICE })}</button></div>`;
      }).join('')}`;
    } else {
      const items = potItems().filter((tok) => potHas(tok) > 0 || potSel.includes(tok));
      list = items.length
        ? `<div class="inv-grid">${items
            .map((tok) => {
              const x = tokInfo(tok);
              const n = potHas(tok);
              return `<button type="button" class="inv-cell ${n > 0 ? '' : 'off'}" data-potin="${tok}" ${n > 0 && potSel.length < POT_MAX ? '' : 'disabled'}><i>${x.icon}</i><em>${n}</em><small>${escapeHtml(x.name)}${x.star ? `<br>${x.star}` : ''}</small></button>`;
            })
            .join('')}</div>`
        : `<div class="dex-note">${potCat === 'fish' ? t('保冷箱裡還沒有魚。從現在開始釣到的魚，都會放進保冷箱喔 🧊') : potCat === 'weird' ? t('還沒有怪東西。釣魚偶爾會釣到舊皮鞋、破襪子⋯⋯') : t('這一類還沒有材料')}</div>`;
    }
    return `<div class="pot-box"><div class="dex-note">${t('放 1～4 樣材料，想加調味料也可以。煮出什麼？試試看就知道！')}</div>
      <div class="pot-slots">${slots}</div><div class="pot-seas">${seaChips || `<small>${t('（還沒加調味料）')}</small>`}</div></div>
      <div class="pot-cats">${POT_CATS.map(([id, label]) => `<button type="button" class="${potCat === id ? 'on' : ''}" data-potcat="${id}">${label}</button>`).join('')}</div>
      ${list}
      <button type="button" class="shop-buy-tent pot-go" data-potgo ${potSel.length && here && net.online ? '' : 'disabled'}>${t('🔥 開煮！')}</button>
      <div class="dex-note">${here ? t('魚、材料、調味料用了會扣掉') : t('到中央營火的料理鍋、自家門口的烤肉爐，或帳篷裡的爐子旁邊才能煮')}</div>`;
  }
  function bookHtml() {
    if (!pot) return `<div class="dex-note">${t('讀取中⋯')}</div>`;
    const ck = new Set((pot.cooked ?? []).filter((k) => k.startsWith('p.')));
    const made = (rid) => [...ck].filter((k) => k === `p.${rid}` || k.startsWith(`p.${rid}.`) || k.startsWith(`p.${rid}~`));
    const flavorsMade = new Set([...ck].map((k) => k.split('~')[1]).filter(Boolean));
    const rows = (list) =>
      list
        .map((r) => {
          const m = made(r.id);
          const fishN = new Set(m.map((k) => k.split('~')[0].split('.')[2]).filter(Boolean)).size;
          const flN = new Set(m.map((k) => k.split('~')[1]).filter(Boolean)).size;
          const name = r.need.includes('F') || r.fishT ? t(r.zh, { fish: t('魚') }) : t(r.zh);
          if (m.length)
            return `<div class="craft-row"><i class="dex-emoji">${r.icon}</i><div class="craft-info"><b>${name}</b><small>${[fishN ? t('做過 {n} 種魚', { n: fishN }) : '', t('口味 {n}／{all}', { n: flN, all: FLAVOR_TOTAL })].filter(Boolean).join('・')}</small>${r.basic ? '' : `<div class="needs">${r.need.map((sp) => `<span class="need ok">${specText(sp)}</span>`).join('')}</div>`}</div></div>`;
          if (r.kind === 'unlock') {
            const have = unlockHave(pot, r.unlock);
            const open = have >= r.unlock.n;
            return `<div class="craft-row lock"><i class="dex-emoji">${open ? r.icon : '🔒'}</i><div class="craft-info"><b>${open ? `${name} ${t('（已解鎖！）')}` : t('？？？（解鎖型隱藏食譜）')}</b><small>${unlockLabel(r.unlock, t)}（${Math.min(have, r.unlock.n)}/${r.unlock.n}）</small>${open ? `<div class="needs">${r.need.map((sp) => `<span class="need">${specText(sp)}</span>`).join('')}</div>` : ''}</div></div>`;
          }
          if (r.kind === 'hidden') return `<div class="craft-row lock"><i class="dex-emoji">❓</i><div class="craft-info"><b>${t('？？？（隱藏食譜）')}</b><small>${t('提示：')}${t(r.hint)}</small></div></div>`;
          if (r.kind === 'survival') return `<div class="craft-row lock"><i class="dex-emoji">❓</i><div class="craft-info"><b>？？？</b><small>${t('用怪東西煮煮看⋯⋯')}</small></div></div>`;
          return `<div class="craft-row lock"><i class="dex-emoji">❔</i><div class="craft-info"><b>${t('？？？（還沒煮過）')}</b>${r.basic ? `<small>${t('隨便放幾樣正常的食材就會煮出來')}</small>` : `<div class="needs">${r.need.map((sp) => `<span class="need">${specText(sp)}</span>`).join('')}</div>`}</div></div>`;
        })
        .join('');
    const OPEN = POT_RECIPES.filter((r) => isOpen(r)); // 🗓️ 還沒開的食譜不列
    const normal = OPEN.filter((r) => !r.kind);
    const secret = OPEN.filter((r) => r.kind === 'hidden' || r.kind === 'unlock');
    const surv = OPEN.filter((r) => r.kind === 'survival');
    const doneOf = (list) => list.filter((r) => made(r.id).length).length;
    const darkDone = DARK.filter((d) => ck.has(`p.d_${d.id}`)).length;
    return `<div class="dex-note pot-progress">${t('收集進度：一般 {a}/{A}・隱藏 {b}/{B}・口味 {c}/{C}・黑暗 {d}/{D}・求生 {e}/{E}', { a: doneOf(normal), A: normal.length, b: doneOf(secret), B: secret.length, c: flavorsMade.size, C: FLAVOR_TOTAL, d: darkDone, D: DARK.length, e: doneOf(surv), E: surv.length })}</div>
      <div class="dex-note">${t('🍳 一般料理（第一次做出來 +3 🌰）')}</div>${rows(normal)}
      <div class="dex-note">${t('✨ 隱藏食譜（第一次做出來 +10 🌰）')}</div>${rows(secret)}
      <div class="dex-note">${t('🥾 求生料理')}</div>${rows(surv)}
      <div class="dex-note">${t('🧂 做過的口味')}</div><div class="needs">${Object.entries(FLAVORS).map(([k, v]) => `<span class="need ${flavorsMade.has(k) ? 'ok' : ''}">${flavorsMade.has(k) ? t(v) : '？？？'}</span>`).join('')}</div>
      <div class="dex-note">${t('💀 黑暗料理（吃了臉會焦黑 😵）')}・${t('煮失敗 {n}/{m} 次 → 😵 灰頭土臉造型', { n: Math.min(pot.cnt?.dark ?? 0, SOOTY_AT), m: SOOTY_AT })}</div><div class="inv-grid">${DARK.map((d) => `<div class="inv-cell ${ck.has(`p.d_${d.id}`) ? '' : 'off'}"><i>${ck.has(`p.d_${d.id}`) ? d.icon : '❔'}</i><small>${ck.has(`p.d_${d.id}`) ? t(d.zh) : '？？？'}</small></div>`).join('')}</div>`;
  }
  async function loadPot() {
    const res = await net.request('potInfo');
    if (res?.ok) {
      pot = res;
      dishes = res.dishes;
      cooked = new Set(res.cooked);
      basket = res.basket;
    }
    if (fishingUI._tab === 'cook' && fishingUI.el.modal.classList.contains('show')) fishingUI.openCreel('cook');
  }
  function bindPot(body) {
    const re = () => fishingUI.openCreel('cook');
    for (const b of body.querySelectorAll('[data-potcat]')) b.addEventListener('click', () => ((potCat = b.dataset.potcat), re()));
    for (const b of body.querySelectorAll('[data-potin]')) b.addEventListener('click', () => (potSel.length < POT_MAX && potSel.push(b.dataset.potin), audio.sfx('tap'), re()));
    for (const b of body.querySelectorAll('[data-potout]')) b.addEventListener('click', () => (potSel.splice(Number(b.dataset.potout), 1), re()));
    for (const b of body.querySelectorAll('[data-seain]')) b.addEventListener('click', () => ((potSea[b.dataset.seain] = (potSea[b.dataset.seain] ?? 0) + 1), audio.sfx('tap'), re()));
    for (const b of body.querySelectorAll('[data-seaout]'))
      b.addEventListener('click', () => {
        const k = b.dataset.seaout;
        potSea[k]--;
        if (potSea[k] <= 0) delete potSea[k];
        re();
      });
    for (const b of body.querySelectorAll('[data-seabuy]'))
      b.addEventListener('click', async () => {
        b.disabled = true;
        const res = await net.request('buySeason', { id: b.dataset.seabuy });
        if (res?.ok) {
          pot = { ...pot, ...res };
          hud.toast(t('🧂 買了一包{name}（可以用 {n} 次）', { name: t(SEASON_BY_ID[b.dataset.seabuy].zh), n: SEASON_USES }));
        } else hud.toast(res?.reason === 'full' ? t('調味料已經放滿了') : t('松果不夠喔'));
        re();
      });
    body.querySelector('[data-potagain]')?.addEventListener('click', () => ((potDone = null), re()));
    body.querySelector('[data-potgo]')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      const res = await net.request('potCook', { items: potSel, sea: potSea });
      if (res?.ok) {
        pot = res;
        dishes = res.dishes;
        cooked = new Set(res.cooked);
        basket = res.basket;
        potSel = [];
        potSea = {};
        potDone = res;
        audio.sfx('bell');
      } else hud.toast(res?.reason === 'notHere' ? t('到營火旁的料理鍋才能煮') : res?.reason === 'later' ? t('11/20 才開放喔') : t('材料不夠喔'));
      re();
    });
  }
  fishingUI.extraTabs.push({
    id: 'cook',
    label: t('🍲 料理'),
    title: () => t('🍲 營火料理 {n}／{total}', { n: DISHES.filter((d) => !d.month && cooked.has(d.id)).length, total: DISHES.filter((d) => !d.month).length }),
    render: () => {
      if (cookView === 'pot') return cookTabs() + potHtml();
      if (cookView === 'book') return cookTabs() + bookHtml();
      const grill = atGrill();
      const homeAt = homeCookAt();
      const here = atPot() || grill || !!homeAt;
      const mine = ownedDishes(dishes);
      const others = [...remotes.players.values()].filter((r) => !r.npc);
      const myDishes = mine.length
        ? mine
            .map(
              (d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${dishName(d, t)} ×${dishes[d.id]}</b>${fxTag(d.id)}</div>
                <button type="button" class="mini-btn" data-eat="${d.id}">${t('😋 吃')}</button>
                ${others.length ? `<select class="mini-sel" data-gift="${d.id}"><option value="">${t('🎁 送給⋯')}</option>${others.map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}</select>` : ''}</div>`,
            )
            .join('')
        : `<div class="dex-note">${t('還沒有料理，煮一道吧！')}</div>`;
      // 🗓️ 每月限定的料理：那個月才出現在食譜（煮過的一直看得到）
      const recipes = DISHES.filter((d) => !d.month || d.month === taipeiMonth() || cooked.has(d.id)).map((d) => {
        const season = !d.month || d.month === taipeiMonth();
        const ok = canMake(basket, d.need) && (homeAt ? homeCanCook(d, homeAt) : !d.grill || grill) && season;
        const tag = d.grill ? `<small class="grill-tag">${t('🍖 門口烤肉爐限定')}</small>` : homeAt === 'oven' && !homeCanCook(d, 'oven') ? `<small class="grill-tag">${t('🥧 烤箱做不了，用瓦斯爐或灶台')}</small>` : d.month ? `<small class="grill-tag">${t('🗓️ {m} 月限定', { m: d.month })}</small>` : '';
        return `<div class="craft-row ${cooked.has(d.id) ? '' : 'new-dish'}"><i class="dex-emoji">${cooked.has(d.id) ? d.icon : '❔'}</i><div class="craft-info"><b>${cooked.has(d.id) ? dishName(d, t) : t('？？？（還沒煮過）')}</b>${tag}${cooked.has(d.id) ? fxTag(d.id) : ''}<div class="needs">${needHtml(d.need)}</div></div><button type="button" class="mini-btn" data-cook="${d.id}" ${ok && here && net.online ? '' : 'disabled'}>${t('煮')}</button></div>`;
      }).join('');
      return `${cookTabs()}<div class="dex-note">${homeAt === 'oven' ? t('🥧 在小烤箱旁邊：可以烤甜點、烤地瓜、烤玉米') : homeAt ? t('🍳 在家裡的爐子旁邊，可以開始煮了！') : grill ? t('🍖 在自家門口的烤肉爐旁邊，可以開始煮了！（烤肉爐限定的料理也能做）') : here ? t('🔥 在料理鍋旁邊，可以開始煮了！') : t('到中央營火旁的「🍲 營火料理」鍋子才能煮（自家門口有烤肉爐的話，在家也能煮）。蔬菜在帳篷前的小菜園種。')}</div>
        <div class="dex-note">${t('🍱 我的料理')}</div>${myDishes}
        <div class="dex-note">${t('📖 食譜（第一次煮出新料理送松果）')}</div>${recipes}`;
    },
    bind: (body) => {
      for (const b of body.querySelectorAll('[data-cookview]'))
        b.addEventListener('click', () => {
          cookView = b.dataset.cookview;
          potDone = null;
          if (cookView !== 'menu') loadPot();
          fishingUI.openCreel('cook');
        });
      if (cookView !== 'menu') {
        bindPot(body);
        bindEat(body);
        return;
      }
      for (const b of body.querySelectorAll('[data-cook]')) {
        b.addEventListener('click', async () => {
          b.disabled = true;
          const at = homeCookAt();
          const res = await net.request('cook', at ? { id: b.dataset.cook, at } : { id: b.dataset.cook });
          if (res?.ok) {
            basket = res.basket;
            dishes = res.dishes;
            cooked = new Set(res.cooked);
            const d = DISH_BY_ID[b.dataset.cook];
            audio.sfx('bell');
            hud.toast(res.first ? t('🍲 第一次煮出「{icon} {name}」！+{n} 🌰', { icon: d.icon, name: dishName(d, t), n: res.gain }) : t('🍲 煮好了：{icon} {name}', { icon: d.icon, name: dishName(d, t) }), 4500);
            if (res.shared) setTimeout(() => hud.toast(t('🥢 大菜分給附近的 {n} 個人一起吃了', { n: res.shared }), 4000), 1200);
          } else hud.toast(res?.reason === 'notHere' ? t('到營火旁的料理鍋才能煮') : res?.reason === 'oven' ? t('🥧 烤箱做不了，用瓦斯爐或灶台') : res?.reason === 'grill' ? t('這道要用自家門口的烤肉爐做') : t('材料不夠喔'));
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
            hud.toast(t('🎁 把{icon} {dish}送給 {name} 了', { icon: d.icon, dish: dishName(d, t), name }), 4000);
          } else hud.toast(t('對方剛好離開了'));
          fishingUI.openCreel('cook');
        });
      }
    },
  });
  actions.onCook = () => fishingUI.openCreel('cook');

  // ---------- 🌟 森林傳說（11/19）：伺服器說「出現了」→ 在背景經過；看到 3 秒算遇見 ----------
  const legendShow = new LegendShow(scene, camera);
  legendShow.boatAt = () => (actions.boat ? rooms.lake_dock.boats.center(actions.boat.id) : null); // ⛵ 雲鯨從船旁邊游過
  let legendLg = null; // { id: 看過幾次 }
  net.on('legend', (d) => {
    if (!LEGEND_BY_ID[d.id] || roomMgr.busy) return;
    legendShow.start(d, roomMgr.current.id, player.position.clone());
    hud.toast(t('✨ 好像有什麼很大的東西經過了⋯⋯'), 4000);
    audio.sfx('ding');
    setTimeout(async () => {
      if (!legendShow.active) return;
      const r = await net.request('legendSeen', { id: d.id });
      if (!r?.ok) return;
      legendLg = r.lg;
      const L = LEGEND_BY_ID[d.id];
      const msg = r.first
        ? t('🌟 你遇見了傳說中的{icon} {name}！+{n} 🌰（📖 圖鑑 → 🌟 傳說）', { icon: L.icon, name: t(L.zh), n: r.gain })
        : t('🌟 {icon} {name} 經過了⋯⋯（看過 {n} 次）', { icon: L.icon, name: t(L.zh), n: r.lg[d.id] });
      hud.toast(msg, 6000);
      // 作者 11/23：掛機的人回來也要知道 → 記進聊天紀錄；在別的分頁時，分頁標題換成「🌟 守護神出現了！」
      social.addLog('', msg, { system: true, big: true });
      if (document.hidden) {
        const old = document.title;
        document.title = t('🌟 守護神出現了！');
        const back = () => {
          if (document.hidden) return;
          document.title = old;
          document.removeEventListener('visibilitychange', back);
        };
        document.addEventListener('visibilitychange', back);
      }
    }, 3000);
  });
  const LEGEND_HINT = { tortoise: '迷霧森林・晚上 7～12 點', whale: '湖畔碼頭・晚上 7～12 點', sleigh: '聖誕期間的晚上・抬頭看天空' };
  if (isOpen({ from: '2026-11-19' })) fishingUI.extraTabs.push({
    id: 'legend',
    label: t('🌟 傳說'),
    title: () => t('🌟 森林傳說 {n}／{total}', { n: LEGENDS.filter((L) => legendLg?.[L.id]).length, total: LEGENDS.length }),
    render: () => {
      if (!legendLg) {
        net.request('legendInfo').then((r) => {
          legendLg = r?.lg ?? {};
          if (fishingUI._tab === 'legend' && fishingUI.el.modal.classList.contains('show')) fishingUI.openCreel('legend');
        });
        return `<div class="dex-note">${t('讀取中⋯')}</div>`;
      }
      return `<div class="dex-note">${t('很少很少才會出現的大大守護神。同一區的人會一起看到，第一次遇見 +20 🌰')}</div>${LEGENDS.map((L) => {
        const n = legendLg[L.id] ?? 0;
        return `<div class="craft-row ${n ? '' : 'lock'}"><i class="dex-emoji">${n ? L.icon : '❔'}</i><div class="craft-info"><b>${n ? t(L.zh) : '？？？'}</b><small>${t('出沒：')}${t(LEGEND_HINT[L.id])}${n ? `・${t('看過 {n} 次', { n })}` : ''}</small></div></div>`;
      }).join('')}`;
    },
  });
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
          hud.toast(bf ? t('😋 {icon} {name}：{bicon} {buff} 10 分鐘', { icon: d?.icon ?? '', name: dishName(d, t), bicon: bf.icon, buff: t(bf.zh) }) : t('😋 好吃！{icon} {name}', { icon: d?.icon ?? '', name: dishName(d, t) }), 5000);
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
      ['furn', t('🪑 家具')],
      ['look', t('👒 造型')],
    ];
    // 11/09 作者：背包改成一般遊戲那種「格子＋縮圖」：大圖示、右下角數量、下面小字名稱；點一格看說明（料理可以吃）
    const cell = (icon, name, n, key) => `<button type="button" class="inv-cell" data-inv="${key}"><i>${icon}</i><em>${n}</em><small>${name}</small></button>`;
    let html = '';
    const info = {}; // 點格子後下面顯示的說明
    if (tab === 'dish') {
      const mine = ownedDishes(dishes);
      for (const d of mine) info[d.id] = `<b>${d.icon} ${dishName(d, t)} ×${dishes[d.id]}</b>${fxTag(d.id)}<button type="button" class="mini-btn" data-eat="${d.id}">${t('😋 吃')}</button>${giftInfo('dish', d.id) ? `<button type="button" class="mini-btn" data-giftfr="dish|${d.id}">${t('🎁 送朋友')}</button>` : ''}<button type="button" class="mini-btn bin-btn" data-bin="dish|${d.id}|${dishes[d.id]}">${t('🗑️ 丟掉')}</button>`;
      const darkN = mine.filter((d) => d.dark).reduce((a, d) => a + dishes[d.id], 0);
      if (darkN) html += `<div class="bin-dark"><span>${t('😵 黑暗料理 {n} 份', { n: darkN })}</span><button type="button" class="mini-btn bin-btn" data-bin="dark||${darkN}">${t('🗑️ 丟掉')}</button></div><div class="bin-ask" data-binfor="dark" hidden></div>`;
      html += mine.length
        ? `<div class="inv-grid">${mine.map((d) => cell(d.icon, dishName(d, t), dishes[d.id], d.id)).join('')}</div>`
        : `<div class="dex-note">${t('還沒有料理。到營火旁的「🍲 營火料理」鍋子煮一道吧！')}</div>`;
    } else if (tab === 'basket') {
      const groups = [
        ...GATHER_TYPES.map((ty) => [`${ty.icon} ${t(ty.zh)}`, GATHER_ITEMS.filter((x) => x.type === ty.id && basket[x.id] > 0)]),
        [t('🥕 蔬菜'), CROPS.filter((c) => basket[c.id] > 0)],
        [t('♻️ 回收材料'), TRASH.filter((x) => basket[x.id] > 0)],
        [t('🥚 雞蛋'), EGGS.filter((x) => basket[x.id] > 0)],
      ].filter(([, list]) => list.length);
      for (const [, list] of groups)
        for (const x of list) {
          const gc = basketCat(x.id);
          info[x.id] = `<b>${x.icon} ${t(x.zh)} ×${basket[x.id]}</b>${x.hint ? `<small class="fx-tag">${t(x.hint)}</small>` : ''}${gc && giftInfo(gc, x.id) ? `<button type="button" class="mini-btn" data-giftfr="${gc}|${x.id}">${t('🎁 送朋友')}</button>` : ''}<button type="button" class="mini-btn bin-btn" data-bin="bk|${x.id}|${basket[x.id]}">${t('🗑️ 丟掉')}</button>`;
        }
      html = groups.length
        ? groups.map(([title, list]) => `<div class="dex-note">${title}</div><div class="inv-grid">${list.map((x) => cell(x.icon, t(x.zh), basket[x.id], x.id)).join('')}</div>`).join('')
        : `<div class="dex-note">${t('採集籃是空的。去迷霧森林、湖邊採採看吧 🍄')}</div>`;
      html += `<div class="dex-note">${t('採集籃的東西可以煮料理（「🍲 營火料理」鍋子）、做家具（「📖 圖鑑 → 🔨 手作」）')}</div>`;
    } else if (tab === 'furn') {
      // 🪑 作者 11/24：家具也放進背包看得到（擺在家裡的也算在數量裡）
      const items = myHome?.items ?? [];
      const own = Object.entries(myHome?.inv ?? {})
        .filter(([id, n]) => n > 0 && FURNITURE_BY_ID[id])
        .map(([id, n]) => ({ id, n, f: FURNITURE_BY_ID[id], placed: items.filter((x) => x.i === id).length }));
      const atHome = inHome() && homeRoom.mine;
      for (const o of own) {
        const colored = Object.entries(myHome?.cinv ?? {}).reduce((a, [k, v]) => (k.startsWith(`${o.id}~`) ? a + v : a), 0);
        const spare = Math.max(0, o.n - colored - items.filter((x) => x.i === o.id && !x.c).length);
        info[o.id] = `<b>${o.f.icon} ${o.f.name} ×${o.n}</b><small class="fx-tag">${t('🏠 家裡擺了 {n} 個', { n: o.placed })}・${t('背包裡 {n} 個', { n: Math.max(0, o.n - o.placed) })}</small><button type="button" class="mini-btn" data-build="1">${atHome ? t('🛠️ 布置') : t('🏠 回家布置')}</button>${giftInfo('furn', o.id) && spare > 0 ? `<button type="button" class="mini-btn" data-giftfr="furn|${o.id}">${t('🎁 送朋友')}</button>` : ''}`;
      }
      html = !myHome?.tent
        ? `<div class="dex-note">${t('還沒有帳篷。到營火旁的「🏪 營地小舖」買一頂，就能放家具了')}</div>`
        : own.length
          ? `<div class="inv-grid">${own.map((o) => cell(o.f.icon, o.f.name, o.n, o.id)).join('')}</div>`
          : `<div class="dex-note">${t('還沒有家具。到「🏪 營地小舖」逛逛吧')}</div>`;
    }
    if (Object.keys(info).length) html += `<div class="inv-info" hidden></div><div class="bin-ask" data-binfor="item" hidden></div>`;
    // 🗑️ 丟掉：選數量（－／＋、可以直接打數字、全部），丟之前寫清楚丟幾個（作者 11/20）
    const bindBin = (btns, root) => {
      for (const b of btns) {
        b.addEventListener('click', () => {
          const [kind, id, maxS] = b.dataset.bin.split('|');
          const max = Number(maxS) || 1;
          const ask = root.querySelector(`.bin-ask[data-binfor="${kind === 'dark' ? 'dark' : 'item'}"]`);
          for (const o of root.querySelectorAll('.bin-ask')) if (o !== ask) o.hidden = true;
          let n = kind === 'dark' ? max : 1;
          ask.innerHTML = `<span>${t('要丟幾個？')}</span><div class="bin-step"><button type="button" data-d="-1">－</button><input type="number" inputmode="numeric" min="1" max="${max}" value="${n}"><button type="button" data-d="1">＋</button><button type="button" class="bin-all">${t('全部 {n}', { n: max })}</button></div><div class="bin-go"><button type="button" class="mini-btn bin-yes"></button><button type="button" class="mini-btn bin-no">${t('算了')}</button></div><small>${t('丟掉就拿不回來了，也不會拿到松果')}</small>`;
          ask.hidden = false;
          const inp = ask.querySelector('input');
          const yes = ask.querySelector('.bin-yes');
          const set = (v) => {
            n = Math.max(1, Math.min(max, Math.floor(Number(v) || 1)));
            inp.value = n;
            yes.textContent = t('🗑️ 丟掉 {n} 個', { n });
          };
          set(n);
          for (const d of ask.querySelectorAll('[data-d]')) d.addEventListener('click', () => set(n + Number(d.dataset.d)));
          inp.addEventListener('input', () => inp.value !== '' && set(inp.value));
          inp.addEventListener('blur', () => set(inp.value));
          ask.querySelector('.bin-all').addEventListener('click', () => set(max));
          ask.querySelector('.bin-no').addEventListener('click', () => (ask.hidden = true));
          yes.addEventListener('click', async () => {
            yes.disabled = true;
            const r = await net.request('discard', { kind, id, n });
            if (!r?.ok) return (yes.disabled = false), hud.toast(t('沒丟成，再試一次吧'));
            dishes = r.dishes ?? dishes;
            basket = r.basket ?? basket;
            hud.toast(t('🗑️ 丟掉 {n} 個了', { n: r.gone }));
            openBag(tab);
          });
          ask.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    };
    modal.open(
      t('🎒 背包'),
      `<div class="shop-cats bag-tabs bag-big">${tabs.map(([id, label]) => `<button type="button" data-bag="${id}" class="${id === tab ? 'on' : ''}">${label}</button>`).join('')}</div>${html}`,
      (body) => {
        for (const b of body.querySelectorAll('[data-bag]')) b.addEventListener('click', () => (b.dataset.bag === 'look' ? (modal.close(), hud.onLook()) : openBag(b.dataset.bag)));
        const box = body.querySelector('.inv-info');
        for (const c of body.querySelectorAll('[data-inv]')) {
          c.addEventListener('click', () => {
            for (const o of body.querySelectorAll('.inv-cell.on')) o.classList.remove('on');
            c.classList.add('on');
            box.innerHTML = info[c.dataset.inv] ?? '';
            box.hidden = false;
            bindEat(box);
            bindBin(box.querySelectorAll('[data-bin]'), body);
            body.querySelector('.bin-ask[data-binfor="item"]').hidden = true;
            box.querySelector('[data-giftfr]')?.addEventListener('click', (e) => {
              const [cat, id] = e.currentTarget.dataset.giftfr.split('|');
              pickFriendToGift(cat, id, tab);
            });
            // 🪑 家具：在自己家就直接開布置，不在家就先回家
            box.querySelector('[data-build]')?.addEventListener('click', () => {
              modal.close();
              if (inHome() && homeRoom.mine) startBuild();
              else goHome();
            });
          });
        }
        bindBin(body.querySelectorAll('.bin-dark [data-bin]'), body);
        // 料理：一打開就先選第一格，吃東西不用多點一下
        if (tab === 'dish') body.querySelector('[data-inv]')?.click();
      },
    );
  }
  /** 🎁 背包裡點東西 →「送朋友」→ 選一位好友送 1 個（作者 11/12：背包、密頻兩邊都能送） */
  async function pickFriendToGift(cat, id, backTab) {
    if (!net.online) return hud.toast(t('連上伺服器才能送禮'));
    const g = giftInfo(cat, id);
    const r = await net.request('friendList');
    if (!r?.ok || !g) return hud.toast(t('沒有成功，再試一次'));
    const mutual = r.friends.filter((f) => f.mutual).sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
    // 🍲 作者 11/24：料理也能送給同一個地方的人（還不是好友也可以）
    const frNames = new Set(mutual.map((f) => f.name));
    const near = cat === 'dish' ? [...(remotes?.players?.entries?.() ?? [])].filter(([, p]) => !p.npc && p.name && !frNames.has(p.name)).map(([sid, p]) => ({ sid, name: p.name })) : [];
    const nearHtml = near.length ? `<div class="dex-note">${t('📍 在你附近的人（還不是好友也能送料理）')}</div><div class="fr-chips">${near.map((f) => `<button type="button" class="fr-chip" data-sid="${escapeHtml(f.sid)}" data-name="${escapeHtml(f.name)}"><b><i class="fr-dot on"></i>${escapeHtml(f.name)}</b></button>`).join('')}</div>` : '';
    modal.open(
      t('🎁 把 {icon} {item} 送給誰？', { icon: g.icon, item: t(g.zh) }),
      `<div class="dm-top"><button type="button" class="mini-btn ghost" id="gfp-back">‹ ${t('回到背包')}</button></div>
      ${mutual.length ? `<div class="dex-note">${t('選一位好友，送 1 個（價值 {v} 🌰）', { v: g.value })}</div><div class="fr-chips">${mutual.map((f) => `<button type="button" class="fr-chip" data-to="${f.hid}" data-name="${escapeHtml(f.name)}"><b><i class="fr-dot${f.online ? ' on' : ''}"></i>${escapeHtml(f.name)}</b>${f.plot ? `<small>🏕️ ${plotName(f.plot)}</small>` : ''}</button>`).join('')}</div>` : `<div class="dex-note">${t('還沒有好友。點下面「👫 好友」加朋友，就能互相送禮了')}</div>`}${nearHtml}`,
      (body) => {
        body.querySelector('#gfp-back').addEventListener('click', () => openBag(backTab));
        for (const b of body.querySelectorAll('[data-to], [data-sid]'))
          b.addEventListener('click', async () => {
            const name = b.dataset.name;
            if (!(await confirmBuy.ask({ icon: '🎁', name: t('送 {icon} {item} 給 {name}', { icon: g.icon, item: t(g.zh), name }), price: 0, desc: t('送出去就會從你的身上拿走喔'), title: t('🎁 要送這個嗎？'), yes: t('送出') }))) return pickFriendToGift(cat, id, backTab);
            const res = await net.request('giftSend', b.dataset.sid ? { sid: b.dataset.sid, cat, id, n: 1 } : { hid: b.dataset.to, cat, id, n: 1 });
            if (!res?.ok) {
              hud.toast(
                ({
                  account: t('要先建立帳號才能送禮'),
                  cap: t('{name} 今天收的禮物已經夠多了，明天再送吧 🎁', { name }),
                  sendMax: t('今天已經送很多次了，明天再送吧'),
                  notFriend: b.dataset.sid ? t('對方已經離開這裡了') : t('要互相加好友才能送禮'),
                  tooFast: t('慢慢來 🙂'),
                })[res?.reason] ?? t('沒有成功，再試一次'),
                4000,
              );
              return;
            }
            basket = res.basket ?? basket;
            dishes = res.dishes ?? dishes;
            audio.sfx?.('bell');
            hud.toast(t('🎁 送給 {name} 了！', { name }), 3500);
            openBag(backTab);
          });
      },
    );
  }
  document.getElementById('bag-btn').addEventListener('click', () => openBag());
  // ---------- 📢 作者的全營地公告（作者 11/23，後台 /admin 發） ----------
  const annBox = document.createElement('div');
  annBox.className = 'announce-banner';
  annBox.hidden = true;
  document.getElementById('ui').appendChild(annBox);
  let annTimer = 0;
  let annSeen = 0;
  annBox.addEventListener('click', () => (annBox.hidden = true)); // 點一下就收起來
  net.on('announce', (m) => {
    if (!m || m.at === annSeen) return; // 晚進來補送的，同一則不重複跳
    annSeen = m.at;
    const show = (text) => {
      annBox.innerHTML = `<b>📢 ${escapeHtml(t('營地公告'))}</b><span>${escapeHtml(text)}</span>`;
      annBox.hidden = false;
      annBox.classList.remove('in');
      void annBox.offsetWidth;
      annBox.classList.add('in');
      clearTimeout(annTimer);
      annTimer = setTimeout(() => (annBox.hidden = true), ANNOUNCE_SHOW_MS);
    };
    if (m.tpl && ANNOUNCE_TPL[m.tpl]) {
      const text = t(ANNOUNCE_TPL[m.tpl]);
      social.addLog(`📢 ${t('營地公告')}`, text, { system: true });
      return show(text);
    }
    social.addLog(`📢 ${t('營地公告')}`, m.text, { system: true });
    show(m.text);
    translateChat(m.text, true).then((tr) => tr && !annBox.hidden && show(tr)); // 外國玩家：自動翻成自己的語言
  });
  // ---------- 📣 大聲公（作者 11/12：30 松果，全營地都看得到） ----------
  const shoutBox = document.createElement('div');
  shoutBox.className = 'shout-banner';
  shoutBox.hidden = true;
  document.getElementById('ui').appendChild(shoutBox);
  const shoutQ = [];
  let shoutBusy = false;
  const nextShout = () => {
    const m = shoutQ.shift();
    if (!m) return void ((shoutBusy = false), (shoutBox.hidden = true));
    shoutBusy = true;
    shoutBox.innerHTML = `<span>📣</span><b>${escapeHtml(m.name)}</b><em>${escapeHtml(m.text)}</em>`;
    shoutBox.hidden = false;
    shoutBox.classList.remove('in');
    void shoutBox.offsetWidth;
    shoutBox.classList.add('in');
    setTimeout(nextShout, 8000);
  };
  net.on('shout', (m) => {
    social.addLog(`📣 ${m.name}`, m.text);
    shoutQ.push(m);
    if (!shoutBusy) nextShout();
  });
  social.onShout = async (text, done) => {
    if (!net.online) return hud.toast(t('連上伺服器才能用大聲公'));
    if (!text) return hud.toast(t('📣 先在輸入框打想說的話，再按 📣'));
    if ((pinecones ?? 0) < 30) return hud.toast(t('松果不夠，需要 {n} 🌰', { n: 30 }));
    if (!confirm(t('花 30 🌰 用大聲公說：「{text}」？全營地的人都看得到', { text }))) return;
    const r = await net.request('shout', { text });
    if (r?.ok) return done?.();
    hud.toast(r?.reason === 'wait' ? t('📣 大聲公每 3 分鐘可以用一次，再等 {n} 秒', { n: r.sec }) : r?.reason === 'busy' ? t('📣 剛剛有人用過大聲公，{n} 秒後再試', { n: r.sec }) : r?.reason === 'poor' ? t('松果不夠，需要 {n} 🌰', { n: 30 }) : r?.reason === 'muted' ? t('🔇 你暫時不能說話') : t('沒送出去，再試一次'));
  };

  // ---------- ✨ 小精靈（作者 11/11：跟在肩膀旁邊飄、玩遊戲會長大） ----------
  const mySpirit = new SpiritFollower(scene);
  // 🎮 跟小精靈玩的小遊戲
  const spiritGames = new SpiritGames({ scene, player, spirit: mySpirit, actions, audio, root: document.getElementById('ui'), roomHeight: (x, z) => roomMgr.current?.heightAt?.(x, z) ?? player.position.y });
  const startSpiritGame = () => {
    const sp = spiritSt;
    if (!sp || sp.none) return;
    const kind = sp.stage ? sp.t : 'light';
    if (sp.off) return hud.toast(t('小精靈收起來了，先叫它出來再一起玩'));
    if (sp.playLeft <= 0) return hud.toast(t('今天玩過 3 次了，明天再一起玩吧'));
    if (actions.state !== 'free') actions.stop?.();
    modal.close();
    spiritGames.start(kind, async (score) => {
      const r = await net.request('spiritPlay', { g: kind, score });
      if (r?.sp) applySpirit(r.sp);
      if (r?.ok) hud.toast(r.gain > 0 ? t('🎮 玩得好開心！得分 {s}，親密度 +{n}', { s: score, n: r.gain }) : t('🎮 玩得好開心！得分 {s}（今天的親密度已經加滿了）', { s: score }), 5000);
      else if (r?.reason === 'full') hud.toast(t('今天玩過 3 次了，明天再一起玩吧'));
      else hud.toast(t('🎮 玩得好開心！得分 {s}', { s: score }));
    });
  };
  let spiritSt = null; // 伺服器給的小精靈資料
  const SPIRIT_NAME = { light: '小光點', drop: '水滴', flame: '火苗', leaf: '葉子', cloud: '雲朵', star: '星星', mush: '蘑菇' };
  const spiritKind = (sp) => (sp.stage === 0 ? t('✨ 小光點') : `${SPIRIT_BY_ID[sp.t]?.icon ?? '✨'} ${t(SPIRIT_NAME[sp.t])}${t('小精靈')}`);
  const spiritLabel = (sp) => (sp.nm ? `${sp.nm}（${spiritKind(sp)}）` : spiritKind(sp));
  /** 🎀 買／戴／拿下小精靈造型（蝴蝶結、帽子、圍巾戴頭上一次一個；翅膀配色另外一格）；戴著的再按一次＝拿下來 */
  const spiritAccTap = async (id, own) => {
    const x = spiritSt?.acc?.list.find((v) => v.id === id);
    if (!x) return;
    if (!own) {
      if ((pinecones ?? 0) < x.price) return hud.toast(t('松果不夠，需要 {n} 🌰', { n: x.price }));
      if (!confirm(t('花 {n} 🌰 買{icon} {name}？買一次每隻都能戴', { n: x.price, icon: x.icon, name: t(x.zh) }))) return;
    }
    const slot = x.slot === 'wing' ? 'wing' : 'head';
    const on = (slot === 'wing' ? spiritSt.acc.wing : spiritSt.acc.wear) === id;
    const r = await net.request('spiritAcc', own ? { op: 'wear', slot, id: on ? '' : id } : { op: 'buy', id });
    if (!r?.ok) return hud.toast(r?.reason === 'season' ? t('這個配件現在沒有賣了') : r?.reason === 'poor' ? t('松果不夠') : t('沒有成功，再試一次'));
    applySpirit(r.sp);
    mySpirit.react('love', 2, { hop: true, spin: true });
  };
  const spiritCodeOf = (sp) => (!sp || sp.off || sp.none ? '' : `${sp.stage === 0 ? 'light0' : `${sp.t}${sp.stage}`}${sp.acc?.wear ? `+${sp.acc.wear}` : ''}${sp.acc?.wing ? `~${sp.acc.wing}` : ''}`);
  const applySpirit = (sp) => {
    if (!sp) return;
    spiritSt = sp;
    if (sp.none) {
      // 還沒有小精靈（11/11 改：要到小舖買蛋）
      mySpirit.setCode('');
      mySpirit.hungry = false;
      return;
    }
    mySpirit.setCode(spiritCodeOf(sp));
    mySpirit.hungry = sp.stage > 0 && sp.feed === 0;
    mySpirit.setName(sp.nm);
  };
  const spiritNight = () => {
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    return h >= 23 || h < 6;
  };
  let spiritNightNow = spiritNight();
  setInterval(() => (spiritNightNow = spiritNight()), 60000);
  const SPIRIT_SIT = new Set(['sofa', 'eat', 'sit', 'fish', 'reel', 'roast', 'showFish', 'swing', 'stargaze']);
  // 🎲 營火桌遊（作者 11/13；boardGames.js 的 BOARD_ON 打開才會出現，?board=1 先試）
  const boardUI = new BoardGameUI({
    net,
    scene,
    hud,
    audio,
    remotes,
    self: () => ({ id: net.id, pos: player.position, inForest: roomMgr.current?.id === 'forest_main', sitting: roomMgr.current?.id === 'forest_main' && !!actions.seat?.fire && ['sofa', 'roast', 'addWood', 'blanket'].includes(actions.state), fishing: actions.state === 'fish' || actions.state === 'reel' }),
  });
  const spiritParty = (x, z) => world.eventShower && roomMgr.current?.id === 'forest_main' && Math.hypot(x, z) < 7;
  const spiritCam = new THREE.Vector3();
  // ☁️ 休息（坐著、睡覺、裹毯子）滿 1 分鐘、⭐ 看星星滿 10 秒：告訴伺服器（小精靈會往雲朵／星星長）
  let spiritRestT = 0;
  let spiritStarT = 0;
  let spiritIdleT = 0;
  const SPIRIT_REST = new Set(['sofa', 'sit', 'sleep', 'blanket', 'swing']);
  let spotSent = null;
  const sendSpot = (k) => {
    if (k === spotSent || !net.online) return;
    spotSent = k;
    net.socket?.emit?.('spSpot', { k });
  };
  const updateSpirits = (dt) => {
    camera.getWorldPosition(spiritCam);
    const a = player.actionState;
    if (spiritSt && !spiritSt.none && net.online) {
      spiritRestT = SPIRIT_REST.has(a) ? spiritRestT + dt : 0;
      spiritStarT = a === 'stargaze' ? spiritStarT + dt : 0;
      if (spiritRestT > 60) (spiritRestT = 0), net.socket?.emit?.('spiritAct', { k: 'rest' });
      if (spiritStarT > 10) (spiritStarT = -50), net.socket?.emit?.('spiritAct', { k: 'stargaze' });
    }
    const m = player.mesh.position;
    // ✨ 精靈家具（作者 11/16）：在自己帳篷裡站著不動一下子，身邊那隻自己跑去小窩、鞦韆、玩具玩；一動就飛回來
    const still = roomMgr.current === rooms.home && rooms.home.mine && a === 'idle' && Math.hypot(player.velocity.x, player.velocity.z) < 0.05 && !spiritGames.playing;
    spiritIdleT = still ? spiritIdleT + dt : 0;
    if (mySpirit.playAt && (!still || !mySpirit.playAt.alive())) (mySpirit.playAt.done(), (mySpirit.playAt = null), sendSpot(null));
    if (!mySpirit.playAt && spiritIdleT > 4 && mySpirit.obj) {
      mySpirit.playAt = rooms.home.spiritSpot(m.x, m.z, m.y > 1.2);
      if (!mySpirit.playAt) spiritIdleT = 2; // 沒有空的精靈家具：2 秒後再找（作者 11/20：以前等 20 幾秒，剛擺好家具它不會馬上過去）
      else sendSpot(mySpirit.playAt.key);
    }
    // 👀 別人（主人）的小精靈去玩精靈家具：我的畫面也讓它過去（作者 11/20：大家都看得到）
    for (const p of remotes.players.values()) {
      const sp = p.spirit;
      if (!sp) continue;
      const want = roomMgr.current === rooms.home && p.spk ? p.spk : null;
      if (sp.playAt && (sp.playAt.key !== want || !sp.playAt.alive())) (sp.playAt.done(), (sp.playAt = null));
      if (want && !sp.playAt) sp.playAt = rooms.home.spotByKey(want);
    }
    mySpirit.near = true; // 作者 11/21：主人自己一直看得到自己小精靈的名字（原本只有點它才出現 3 秒）
    mySpirit.update(dt, { x: m.x, y: m.y, z: m.z, ry: player.rotationY, scale: player.mesh.scale.x, speed: Math.hypot(player.velocity.x, player.velocity.z), state: a === 'sleep' || a === 'blanket' ? 'sleep' : SPIRIT_SIT.has(a) ? 'sit' : 'idle', cam: spiritCam, night: spiritNightNow, party: spiritParty(m.x, m.z) });
    return { cam: spiritCam, night: spiritNightNow, party: spiritParty, me: m };
  };
  net.on('spiritMe', (sp) => {
    const was = spiritSt?.stage ?? 0;
    applySpirit(sp);
    if (sp.grew) {
      mySpirit.react('wow', 3, { hop: true, spin: true });
      audio.sfx('bell');
      hud.toast(sp.grew === 1 ? t('✨ 你的小光點變成了{name}！（看你最常做什麼決定的）', { name: spiritLabel(sp) }) : t('🌟 你的{name}長大了！長出小翅膀和光環', { name: spiritLabel(sp) }), 7000);
      if (spiritOpen) openSpirit();
    } else if (sp.kind === 'fish') mySpirit.react('wow', 1.2, { hop: true }), setTimeout(() => mySpirit.react('happy', 1.5, { hop: true }), 1200);
    else if (sp.kind === 'cook') mySpirit.react('love', 2.5, { hop: true });
    else if (sp.kind === 'feed') mySpirit.react('love', 3, { hop: true });
    else mySpirit.react('happy', 1.2, { hop: true });
    void was;
  });
  net.on('spirit', ({ id, sr, sn }) => id !== net.id && remotes.setSpirit(id, sr, sn));
  net.on('spSpot', ({ id, k }) => {
    const p = id !== net.id && remotes.players.get(id);
    if (p) p.spk = k || undefined;
  });
  // 🤲 直接點小精靈＝摸摸（作者 11/11）：自己的、別人的都可以摸（別人的只有自己看得到反應）；點了名字會出現幾秒
  {
    let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8 || buildPanel?.active) return;
      const r = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const mine = mySpirit.screenPos(camera, r.width, r.height);
      const hit = mine && Math.hypot(mine.x - x, mine.y - y) < 48 ? mySpirit : remotes.spiritAt(x, y, camera, r.width, r.height);
      if (!hit) return;
      const kind = hit.pet();
      audio.sfx?.('pop');
      if (hit === mySpirit) bubbles.show('self', kind === 'sneeze' ? '🤧' : '💕', { emoji: true });
    });
  }
  net.on('spiritHatch', (sp) => {
    applySpirit(sp);
    audio.sfx('bell');
    hud.toast(t('🥚 蛋孵出來了！一顆新的小光點，點「✨ 小精靈」帶它出門'), 7000);
    if (modal.isOpen && spiritOpen) openSpirit();
  });
  net.on('spiritAte', ({ id }) => id !== net.id && remotes.spiritReact(id, 'love', 3, { hop: true }));
  net.on('cooked', ({ id }) => id !== net.id && remotes.spiritReact(id, 'love', 2.5, { hop: true }));
  net.on('caught', ({ id }) => id !== net.id && remotes.spiritReact(id, 'wow', 2, { hop: true }));
  net.on('joined', (res) => {
    if (!res.spirit) return;
    const first = !spiritSt;
    applySpirit(res.spirit);
    // 好幾天沒來：小精靈從遠遠的地方衝過來
    if (first && !res.spirit.none && res.spirit.away >= 2 && !res.spirit.off) {
      setTimeout(() => {
        const m = player.mesh.position;
        mySpirit.rushFrom(m.x + 6, m.z - 6);
        hud.toast(t('✨ {name}好想你！衝過來找你了', { name: spiritLabel(res.spirit) }), 5000);
      }, 2500);
    }
  });

  /** 小精靈的小視窗：看它、餵它、摸摸、換樣子 */
  let spiritOpen = false;
  let spiritPrev = null;
  const spiritPreview = () => {
    if (spiritPrev) return spiritPrev;
    const canvas = document.createElement('canvas');
    canvas.className = 'spirit-cv';
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setSize(150, 150, false);
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xfff2dd, 0x404060, 1.5));
    const d = new THREE.DirectionalLight(0xffefcc, 1.2);
    d.position.set(2, 4, 3);
    s.add(d);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 10);
    cam.position.set(0, 0.12, 1.3);
    cam.lookAt(0, 0.08, 0);
    let obj = null;
    let code = '';
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      if (!canvas.isConnected) return (raf = 0);
      const tm = (performance.now() - t0) / 1000;
      if (obj) {
        obj.rotation.y = Math.sin(tm * 0.6) * 0.35;
        obj.userData.update(0.016, tm, cam.position);
        obj.userData.setFace(mySpirit.face);
        // 跟遊戲裡的小精靈同步跳一下、轉圈（視窗擋住也看得到反應）
        obj.position.y = mySpirit.hop > 0 ? Math.sin((1 - mySpirit.hop) * Math.PI) * 0.12 : 0;
        obj.userData.body.rotation.y = mySpirit.spin;
      }
      r.render(s, cam);
      raf = requestAnimationFrame(loop);
    };
    spiritPrev = {
      canvas,
      show(c) {
        if (c !== code) {
          if (obj) s.remove(obj);
          const p = parseSpirit(c);
          obj = p ? buildSpirit(p.type, p.stage, 'happy', undefined, p.acc, p.wing) : null;
          if (obj) s.add(obj);
          code = c;
        }
        if (!raf) raf = requestAnimationFrame(loop);
      },
    };
    return spiritPrev;
  };
  const spiritRulesBox = () => `<details class="sp-rules"><summary>${t('📜 小精靈規則')}</summary><ul>${spiritRuleLines().map((x) => `<li>${x}</li>`).join('')}</ul></details>`;
  async function openSpirit() {
    if (!net.online) return hud.toast(t('連上伺服器才能看小精靈'));
    const res = await net.request('spiritInfo', {});
    if (!res?.ok) return;
    applySpirit(res.sp);
    dishes = res.dish ?? dishes;
    const sp = res.sp;
    spiritOpen = true;
    if (sp.none) {
      // 還沒有小精靈：介紹＋去小舖買蛋
      return modal.open(
        t('✨ 小精靈'),
        `<div class="sp-top"><div class="sp-cv"></div><div class="sp-info"><b>${t('你還沒有小精靈')}</b><small>${t('到「🏪 營地小舖 → ✨ 小精靈」買一顆小精靈蛋（附孵蛋器），第一顆 {n} 🌰，買了馬上孵出來！', { n: sp.eggPrice })}</small></div></div>
        <div class="dex-note">${t('孵出來是一顆小光點，飄在你肩膀旁邊。玩遊戲、餵料理，它就會慢慢長大，看你怎麼玩變成 💧 水滴、🔥 火苗、🍃 葉子、☁️ 雲朵、⭐ 星星或 🍄 蘑菇。')}</div>
        <div class="dex-note">${t('可以取名字、摸摸它；不養也沒關係，想養再買就好。')}</div>
        <button type="button" class="shop-buy-tent" data-eggshop>${t('🥚 去小舖買小精靈蛋')}</button>${spiritRulesBox()}`,
        (body) => {
          const pv = spiritPreview();
          body.querySelector('.sp-cv').appendChild(pv.canvas);
          pv.show('light0');
          body.querySelector('[data-eggshop]').addEventListener('click', () => (modal.close(), shopPanel.open('spirit')));
        },
      );
    }
    const pct = sp.next ? Math.round(((sp.xp - sp.prev) / (sp.next - sp.prev)) * 100) : 100;
    const nextTxt = sp.stage === 0 ? t('再 {n} 點變成小精靈', { n: sp.next - sp.xp }) : sp.stage === 1 ? t('再 {n} 點就會長大', { n: sp.next - sp.xp }) : t('已經長大了 🌟');
    const c = sp.c ?? {};
    const style = sp.stage === 0 ? `<div class="sp-style">${t('現在最像：')}<b>${[['💧', c.fish ?? 0], ['🔥', c.fire ?? 0], ['🍃', c.gather ?? 0], ['☁️', c.cloud ?? 0], ['⭐', c.star ?? 0], ['🍄', c.mush ?? 0]].map(([i, n]) => `${i} ${Math.floor(n)}`).join('　')}</b><small>${t('變成小精靈時，看你最常做什麼：釣魚 💧、顧火・煮菜 🔥、採集 🍃、休息・陪人聊天 ☁️、看星星・許願・晚上玩 ⭐、迷霧森林・採蘑菇・種菜收成 🍄')}</small></div>` : '';
    const favs = new Set(sp.fav ?? []);
    const mine = ownedDishes(dishes).sort((a, b) => favs.has(b.id) - favs.has(a.id));
    const feedLeft = sp.feedMax - sp.feed;
    const feed = mine.length
      ? `<div class="inv-grid sp-feed">${mine.map((d) => `<button type="button" class="inv-cell${favs.has(d.id) ? ' fav' : ''}" data-feed="${d.id}" ${feedLeft > 0 ? '' : 'disabled'}><i>${d.icon}</i><em>${dishes[d.id]}</em><small>${favs.has(d.id) ? '💗 ' : ''}${dishName(d, t)}</small></button>`).join('')}</div>`
      : `<div class="dex-note">${t('還沒有料理。到營火旁的「🍲 營火料理」鍋子煮一道吧！')}</div>`;
    const favLine = sp.fav ? `<div class="dex-note">${t('💗 最喜歡：')}${sp.fav.map((id) => DISH_BY_ID[id]).filter(Boolean).map((d) => `${d.icon} ${dishName(d, t)}`).join('、')}${t('（長得比較快）')}</div>` : '';
    const forms = sp.stage === 2
      ? `<div class="dex-note">${t('🌟 長大以後可以換樣子（每次 {n} 🌰）', { n: sp.price })}</div><div class="sp-forms">${SPIRIT_TYPES.map((x) => `<button type="button" data-form="${x.id}" class="${x.id === sp.t ? 'on' : ''}" ${x.id === sp.t ? 'disabled' : ''}>${x.icon}<small>${t(x.zh)}</small></button>`).join('')}</div>`
      : `<div class="dex-note">${t('🌟 長大以後可以花 {n} 🌰 換成任何樣子', { n: sp.price })}</div>`;
    modal.open(
      t('✨ 我的小精靈'),
      `<div class="sp-top"><div class="sp-cv"></div><div class="sp-info"><b>${spiritLabel(sp)}</b>
        <div class="sp-bar"><i style="width:${pct}%"></i></div><small>${t('親密度')} ${sp.xp}${sp.next ? ` / ${sp.next}` : ''}・${nextTxt}</small>
        <small>${t('今天在營地活動（釣魚、採集⋯）加了 {a} 點（一天最多 {b}）・今天餵了 {c}／{d} 次', { a: sp.dayXp, b: sp.dayCap, c: sp.feed, d: sp.feedMax })}</small>
        <small>${t('💡 在遊戲裡直接點小精靈也能摸摸它')}</small>
        <div class="sp-btns"><button type="button" class="mini-btn" data-rename>${t('✏️ 取名字')}</button><button type="button" class="mini-btn" data-pet>${t('🤲 摸摸')}</button><button type="button" class="mini-btn" data-hide>${sp.off ? t('✨ 叫它出來') : t('🙈 先收起來')}</button></div></div></div>
      ${style}
      <div class="dex-note">${t('怎麼長大：釣魚、添柴、煮菜、採集、休息、聊天、看星星、許願、種菜收成，都會加親密度；餵料理長最快')}</div>
      ${(() => {
        const g = SPIRIT_GAMES[sp.stage ? sp.t : 'light'];
        return `<div class="sp-play"><button type="button" class="shop-buy-tent" data-play ${sp.playLeft > 0 && !sp.off ? '' : 'disabled'}>${t('🎮 跟它玩：{icon} {name}', { icon: g.icon, name: t(g.zh) })}</button><small>${sp.playLeft > 0 ? t('今天還能玩 {n} 次・{how}', { n: sp.playLeft, how: t(g.how) }) : t('今天玩過 3 次了，明天再一起玩吧')}</small><small>${t('每種小精靈的小遊戲都不一樣，多養幾隻都玩玩看！')}</small></div>`;
      })()}
      <div class="dex-note"><b>${t('🍱 餵它吃料理')}</b>${feedLeft > 0 ? t('（今天還能餵 {n} 次）', { n: feedLeft }) : t('（今天吃飽了，明天再餵）')}</div>
      ${favLine}${feed}${forms}
      ${(() => {
        const a = sp.acc ?? { own: [], list: [] };
        const rows = a.list.filter((x) => x.sell || a.own.includes(x.id));
        if (!rows.length) return '';
        return `<div class="dex-note"><b>${t('🎀 小精靈造型')}</b>${t('（買一次每隻都能戴，每隻可以戴不一樣的）')}・${t('再按一次拿下來')}</div><div class="sp-forms">${rows.map((x) => { const own = a.own.includes(x.id); const on = (x.slot === 'wing' ? a.wing : a.wear) === x.id; return `<button type="button" data-acc="${x.id}" data-own="${own ? 1 : 0}" class="${on ? 'on' : ''}">${x.icon}<small>${t(x.zh)}</small><small>${on ? t('戴著') : own ? t('戴上') : `🌰 ${x.price}`}</small></button>`; }).join('')}</div>${sp.stage < 2 && rows.some((x) => x.slot === 'wing') ? `<div class="dex-note">${t('🦋 翅膀要長大的小精靈才看得到')}</div>` : ''}`;
      })()}
      <div class="dex-note"><b>${t('🏡 收起來的小精靈')}</b>（${1 + sp.box.length}／${sp.max}）</div>
      ${sp.box.length ? `<div class="sp-box">${sp.box.map((b, i) => `<button type="button" data-pick="${i}"><b>${b.stage ? SPIRIT_BY_ID[b.t]?.icon : '✨'}</b><small>${b.nm || t(SPIRIT_NAME[b.t])}</small><em>${t('帶出門')}</em></button>`).join('')}</div>` : ''}
      <div class="dex-note">${sp.egg ? t('🥚 蛋正在孵，大約再 {n} 分鐘', { n: Math.max(1, Math.ceil(sp.egg.left / 60000)) }) : t('想多養一隻？到「🏪 營地小舖 → ✨ 小精靈」買 🥚 孵蛋器（{n} 🌰）', { n: sp.eggPrice })}</div>
      ${sp.egg ? '' : `<button type="button" class="mini-btn" data-eggshop>${t('🥚 去買孵蛋器')}</button>`}
      <div class="dex-note">${t('沒來玩也不會生病、不會離開，它會一直等你 💛')}</div>${spiritRulesBox()}`,
      (body) => {
        const pv = spiritPreview();
        body.querySelector('.sp-cv').appendChild(pv.canvas);
        pv.show(spiritCodeOf(sp) || (sp.stage === 0 ? 'light0' : `${sp.t}${sp.stage}`));
        body.querySelector('[data-play]')?.addEventListener('click', () => startSpiritGame());
        for (const b of body.querySelectorAll('[data-acc]'))
          b.addEventListener('click', async () => {
            await spiritAccTap(b.dataset.acc, b.dataset.own === '1');
            openSpirit();
          });
        body.querySelector('[data-rename]').addEventListener('click', async () => {
          const nm = prompt(t('幫小精靈取個名字（最多 8 個字）'), sp.nm || '');
          if (nm == null) return;
          const r = await net.request('spiritName', { nm });
          if (r?.ok) applySpirit(r.sp), mySpirit.react('love', 2.5, { hop: true }), openSpirit();
        });
        for (const b of body.querySelectorAll('[data-pick]'))
          b.addEventListener('click', async () => {
            const r = await net.request('spiritPick', { i: Number(b.dataset.pick) });
            if (!r?.ok) return hud.toast(t('沒換成功，再試一次'));
            applySpirit(r.sp);
            mySpirit.placed = false;
            mySpirit.react('happy', 2, { hop: true, spin: true });
            openSpirit();
          });
        body.querySelector('[data-eggshop]')?.addEventListener('click', () => (modal.close(), shopPanel.open('spirit')));
        body.querySelector('[data-pet]').addEventListener('click', () => {
          const kind = mySpirit.pet(); // 每次隨機：害羞、轉圈、蹭蹭、打噴嚏
          audio.sfx?.('pop');
          // 小視窗裡飄出小愛心；遊戲裡角色頭上也冒愛心
          const box = body.querySelector('.sp-cv');
          for (let i = 0; i < 5; i++) {
            const h = document.createElement('i');
            h.className = 'sp-heart';
            h.textContent = kind === 'sneeze' ? (i % 2 ? '💨' : '✨') : i % 2 ? '💕' : '💗';
            h.style.left = `${20 + Math.random() * 60}%`;
            h.style.animationDelay = `${0.2 + i * 0.25}s`;
            box.appendChild(h);
            setTimeout(() => h.remove(), 2800);
          }
          bubbles.show('self', kind === 'sneeze' ? '🤧' : '💕', { emoji: true });
        });
        body.querySelector('[data-hide]').addEventListener('click', async () => {
          const r = await net.request('spiritHide', { off: !sp.off });
          if (r?.ok) applySpirit(r.sp), openSpirit();
        });
        for (const b of body.querySelectorAll('[data-feed]'))
          b.addEventListener('click', async () => {
            const r = await net.request('spiritFeed', { id: b.dataset.feed });
            if (!r?.ok) return hud.toast(r?.reason === 'full' ? t('今天吃飽了，明天再餵吧') : t('沒餵成功，再試一次'));
            dishes = r.dishes ?? dishes;
            hud.toast(r.fav ? t('💗 是它最喜歡的！親密度 +{n}', { n: 12 }) : t('😋 吃得好開心！親密度 +{n}', { n: 6 }));
            openSpirit();
          });
        for (const b of body.querySelectorAll('[data-form]'))
          b.addEventListener('click', async () => {
            const x = SPIRIT_BY_ID[b.dataset.form];
            if ((pinecones ?? 0) < sp.price) return hud.toast(t('松果不夠，需要 {n} 🌰', { n: sp.price }));
            if (!confirm(t('花 {n} 🌰 把小精靈換成{icon} {name}？', { n: sp.price, icon: x.icon, name: t(x.zh) }))) return;
            const r = await net.request('spiritForm', { t: x.id });
            if (!r?.ok) return hud.toast(r?.reason === 'poor' ? t('松果不夠，需要 {n} 🌰', { n: sp.price }) : t('沒換成功，再試一次'));
            applySpirit(r.sp);
            mySpirit.react('wow', 2.5, { hop: true, spin: true });
            openSpirit();
          });
      },
    );
  }
  document.getElementById('spirit-chip')?.addEventListener('click', () => openSpirit());
  // ---------- 📒 任務本（作者 11/22）：🌱 新手、📅 每日、🗓️ 每週、🎉 假日 ----------
  let questTab = 'daily';
  const CAT_ICON = { social: '💗', fish: '🎣', garden: '🥕', hen: '🐔', forest: '🍃', river: '🦆', cook: '🍳', camp: '🔥' };
  let questOpen = false;
  const qBar = (have, need) => `<div class="qb-bar"><i style="width:${Math.round((Math.min(have, need) / need) * 100)}%"></i></div>`;
  const qStamp = (ok, label) => `<span class="qb-st${ok ? ' ok' : ''}">${ok ? t('完成') : label}</span>`;
  const qRow = (q, x, extra = '') => `<div class="qb-q${x.have >= x.need ? ' done' : ''}"><span class="qb-ic">${q.icon}</span><div class="qb-t"><b>${t(q.zh)}</b><small>${x.have}／${x.need}</small>${qBar(x.have, x.need)}</div>${extra}</div>`;
  const outName = (id) => (OUTFIT_BY_ID[id] ? `${OUTFIT_BY_ID[id].icon} ${t(OUTFIT_BY_ID[id].zh)}` : '');
  const furnName = (id) => (FURNITURE_BY_ID[id] ? `${FURNITURE_BY_ID[id].icon} ${FURNITURE_BY_ID[id].name}` : '');
  async function openQuest(tab = questTab) {
    if (!net.online) return hud.toast(t('連上伺服器才能看任務'));
    const v = await net.request('questInfo', {});
    if (!v?.ok) return;
    questTab = tab;
    questOpen = true;
    const tabs = [['newbie', t('🌱 新手')], ['daily', t('📅 每日')], ['weekly', t('🗓️ 每週')], ['holiday', t('🎉 假日')]];
    let body = '';
    if (tab === 'newbie') {
      const st = ritual?.introStatus?.() ?? { done: 0, total: 6 };
      // 作者 11/22：不是新來的玩家（沒在做新手小任務）一律算完成
      body = st.done >= st.total || !ritual?.kidMode
        ? `<div class="qb-big">🌱 ${t('新手任務全部完成！')}</div><div class="dex-note">${t('接下來每天看「📅 每日」，每週看「🗓️ 每週」')}</div>`
        : `<div class="qb-q"><span class="qb-ic">🌱</span><div class="qb-t"><b>${t('新手小任務')}</b><small>${st.done}／${st.total}</small>${qBar(st.done, st.total)}</div></div><button type="button" class="shop-buy-tent" data-qintro>${t('👉 繼續新手任務')}</button>`;
    } else if (tab === 'daily') {
      const rows = v.daily.map((x) => qRow(DAILY_BY_ID[x.id], x, x.have >= x.need ? qStamp(true) : `${qStamp(false, `+${DAILY_GAIN}🌰`)}${v.swapped ? '' : `<button type="button" class="qb-swap" data-qswap="${x.id}" title="${t('換一題')}">🔄</button>`}`)).join('');
      const stamps = Array.from({ length: v.stampNeed }, (_, i) => `<span class="qb-mini${i < v.stamps ? ' ok' : ''}"></span>`).join('');
      body = `<div class="dex-note">${t('今天的 3 題・每題 +{n} 🌰；3 題都做完送今天的造型，再蓋 1 個章', { n: DAILY_GAIN })}${v.swapped ? '' : `・${t('🔄 每天可以換 1 題')}`}</div>${rows}
        <div class="qb-rew${v.dailyDone ? ' ok' : ''}">🎁 ${t('做完 3 題')}：<b>${outName(v.dailyOutfit)}</b>${v.dailyDone ? ' ✔' : ''}</div>
        <div class="dex-note">${t('📍 這個月集章 {n}／{need}', { n: Math.min(v.stamps, v.stampNeed), need: v.stampNeed })}${v.makeupNext && !v.stampGot ? `・${t('集滿送 💄 臉妝「{name}」和 🏆 金獎盃', { name: t(OUTFIT_BY_ID[v.makeupNext]?.zh ?? '') })}` : v.stampGot ? `・${t('這個月已經集滿了 🎉')}` : ''}</div><div class="qb-stamps">${stamps}</div>`;
    } else if (tab === 'weekly') {
      const rows = v.weekly.map((x) => qRow(WEEKLY_BY_ID[x.id], x, qStamp(x.have >= x.need, t('章')))).join('');
      const n = v.weekly.filter((x) => x.have >= x.need).length;
      body = `<div class="dex-note">${t('這週的 5 題（星期一換新）・已完成 {n}／5', { n })}</div>${rows}
        <div class="qb-rew${v.weeklyGot.plant ? ' ok' : ''}">🎁 ${t('做完 {k} 題', { k: WEEKLY_PLANT_AT })}：<b>${furnName('q_plant')}</b>${v.weeklyGot.plant ? ' ✔' : ''}</div>
        ${v.baitOn ? `<div class="qb-rew${v.weeklyGot.bait ? ' ok' : ''}">🎁 ${t('做完 {k} 題', { k: WEEKLY_BAIT_AT })}：<b>${t('🐟 魚飼料 1 包')}</b>${v.weeklyGot.bait ? ' ✔' : ''}</div>` : ''}
        <div class="qb-rew${v.weeklyGot.all ? ' ok' : ''}">🎁 ${t('做完 5 題')}：<b>${outName(v.weeklyOutfit)}</b>＋${furnName('q_tro_silver')}＋${t('3 個章')}${v.weeklyGot.all ? ' ✔' : ''}</div>
        <div class="dex-note">${t('🏆 同一類任務做完 {n} 題，送那一類的達人獎盃（可以擺在「獎盃展示牆」）', { n: v.catAt })}</div>
        <div class="qb-cats">${Object.entries(CAT_TROPHY).map(([c, id]) => `<span class="qb-cat${(v.cats[c] ?? 0) >= v.catAt ? ' ok' : ''}">${CAT_ICON[c] ?? '🏆'} ${t(CAT_NAME[c])} ${Math.min(v.cats[c] ?? 0, v.catAt)}/${v.catAt}</span>`).join('')}</div>`;
    } else {
      const h = v.hol ?? {};
      const def = HOLIDAYS[h.id];
      if (!def) {
        const nx = h.next && HOLIDAYS[h.next.id];
        const [, mm, dd] = (h.next?.day ?? '').split('-').map(Number);
        body = `<div class="qb-big">🎉 ${t('現在沒有假日活動')}</div><div class="dex-note">${nx ? t('下一場：{m}/{d} {h}:00 {icon} {name}', { m: mm, d: dd, h: HOL_START, icon: nx.icon, name: t(nx.zh) }) : ''}</div><div class="dex-note">${t('週六、週日 10:00～18:00 有全營地一起完成的主題活動，做完拿主題獎盃和小家具。')}</div>`;
      } else {
        const left = Math.max(1, Math.round(h.endIn / 60000));
        const rows = def.tasks.map((q, i) => qRow({ icon: q.icon, zh: q.zh }, h.tasks[i], qStamp(h.tasks[i].have >= h.tasks[i].need, `+${HOL_TASK_GAIN}🌰`))).join('');
        const steps = h.steps.map((s, i) => `${s} ${i === h.steps.length - 1 ? '🏆' : '🎁'}${h.got[i] ? '✔' : ''}`).join(' ・ ');
        body = `<div class="qb-hero qb-${h.id}"><b>${def.icon} ${t(def.zh)}</b><small>${t('還有 {h} 小時 {m} 分', { h: Math.floor(left / 60), m: left % 60 })}${h.peak ? `・${t('⏰ 整點小高潮中！')}` : ''}</small></div>
          <div class="qb-camp"><b>🌍 ${t(def.goal.zh, { n: h.goal })}</b>${qBar(h.n, h.goal)}<div class="qb-ms"><span>${Math.min(h.n, h.goal)}／${h.goal}</span><span>${steps}</span></div></div>
          ${rows}
          <div class="qb-rew${h.all ? ' ok' : ''}">🎁 ${t('3 題都做完')}：<b>${furnName(def.furn)}</b>${h.all ? ' ✔' : ''}<br>🏆 ${t('全營地達到 {n}：有參加的人都拿 {name}', { n: h.goal, name: furnName(def.trophy) })}<br><small>${t('中間每達到一段，有參加的人 +{g} 🌰', { g: HOL_STEP_GAIN })}</small></div>
          <div class="qb-peak">${t(def.peak)}</div>`;
      }
    }
    modal.open(
      t('📒 任務本'),
      `<div class="shop-tabs qb-tabs">${tabs.map(([id, l]) => `<button type="button" class="${id === tab ? 'on' : ''}" data-qtab="${id}">${l}${(id === 'daily' && !v.dailyDone) || (id === 'holiday' && v.hol?.id) ? ' •' : ''}</button>`).join('')}</div>${body}`,
      (b) => {
        for (const btn of b.querySelectorAll('[data-qtab]')) btn.addEventListener('click', () => openQuest(btn.dataset.qtab));
        b.querySelector('[data-qintro]')?.addEventListener('click', () => (modal.close(), ritual?.open()));
        for (const btn of b.querySelectorAll('[data-qswap]'))
          btn.addEventListener('click', async () => {
            const r = await net.request('questSwap', { id: btn.dataset.qswap });
            if (r?.ok) openQuest('daily');
            else hud.toast(r?.reason === 'used' ? t('今天已經換過了') : t('現在換不了'));
          });
      },
    );
  }
  document.getElementById('quest-chip')?.addEventListener('click', () => openQuest(questTab));
  // 🎉 假日活動：進來時看一下有沒有在辦，有的話任務按鈕亮起來、提示一次、任務本直接開「🎉 假日」
  const holCheck = async () => {
    if (!net.online) return;
    const v = await net.request('questInfo', {});
    const h = v?.hol;
    const def = h && HOLIDAYS[h.id];
    document.getElementById('quest-chip')?.classList.toggle('hol-on', !!def);
    if (!def) return;
    questTab = 'holiday';
    const k = `cozy-hol-seen`;
    try {
      if (localStorage.getItem(k) === `${new Date().toDateString()}:${h.id}`) return;
      localStorage.setItem(k, `${new Date().toDateString()}:${h.id}`);
    } catch {
      /* ignore */
    }
    hud.toast(t('🎉 今天是「{icon} {name}」！點上方「📒 任務 → 🎉 假日」看看大家的進度', { icon: def.icon, name: t(def.zh) }), 7000);
  };
  setTimeout(holCheck, 9000);
  setInterval(holCheck, 5 * 60000);
  net.on('holStep', ({ id, last, n }) => {
    const def = HOLIDAYS[id];
    if (!def) return;
    hud.toast(last ? t('🏆 全營地一起達到 {n} 了！有參加的人都拿到「{name}」', { n, name: FURNITURE_BY_ID[def.trophy]?.name ?? '' }) : t('🎉 全營地一起達到 {n}！有參加的人 +{g} 🌰', { n, g: HOL_STEP_GAIN }), 6000);
    audio.sfx?.('bell');
  });
  net.on('holGold', ({ name }) => hud.toast(t('🌟 {name} 找到大金蛋了！', { name }), 4500));
  net.on('holGoldShow', () => hud.toast(t('🌟 這附近藏了一顆大金蛋！先找到的 +20 🌰'), 5000));
  giftPanel.onQuest = () => openQuest('daily');
  net.on('quest', ({ done }) => {
    for (const [k, id] of done ?? []) {
      const q = k === 'd' ? DAILY_BY_ID[id] : k === 'h' ? HOL_TASK_BY_ID[id] : WEEKLY_BY_ID[id];
      if (q) hud.toast(t('📒 任務完成：{icon} {name}', { icon: q.icon, name: t(q.zh) }), 3500);
    }
    if (questOpen && modal.isOpen && fishingUI.el.modalTitle.textContent === t('📒 任務本')) openQuest();
  });
  fishingUI.el.modal.addEventListener('transitionend', () => (spiritOpen = modal.isOpen && spiritOpen));

  net.on('ate', ({ id, dish }) => {
    const d = DISH_BY_ID[dish];
    if (!d) return;
    const burnt = DISH_FX[dish]?.[0] === 'burnt';
    bubbles.show(id === net.id ? 'self' : id, burnt ? `${d.icon}😵💨` : `${d.icon}😋💕`, { emoji: true });
    // 😵 別人吃了黑暗料理：大家都看得到他的臉焦黑 10 分鐘
    if (burnt && id !== net.id) {
      const c = remotes.get(id)?.character;
      c?.setBurnt?.(true);
      setTimeout(() => c?.setBurnt?.(false), BUFF_MS);
    }
  });
  net.on('cooked', ({ id, name, dish }) => {
    const d = DISH_BY_ID[dish];
    // 作者 11/22：畫面中間太多別人的消息 → 別人煮了什麼改放左下聊天紀錄（小小一行），不跳在畫面中間
    // 作者 11/23：聊天紀錄不放了，改跑在上方的即時動態（跟釣魚同一條）
    if (d && id !== net.id) lakeNews.push({ kind: 'cook', name, text: t('🍲 {name} 煮了一道{icon} {dish}', { name, icon: d.icon, dish: dishName(d, t) }) });
  });
  net.on('dishGift', ({ from, dish, dishes: all, share }) => {
    dishes = all ?? dishes;
    const d = DISH_BY_ID[dish];
    audio.sfx('bell');
    if (share) return hud.toast(t('🥢 {name} 煮了一大鍋{icon} {dish}，分你一份！點「🎒 背包」就能吃', { name: from, icon: d?.icon ?? '', dish: dishName(d, t) }), 6000);
    hud.toast(t('🎁 {name} 送你一份{icon} {dish}！點「🎒 背包」就能吃', { name: from, icon: d?.icon ?? '', dish: dishName(d, t) }), 6000);
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
    // 🥕 作者 11/20：格子一覽（3 排），點空格才跳出要種什麼；可以一次種滿全部空格
    const emptyIdx = res.slots.map((sl, i) => (sl ? -1 : i)).filter((i) => i >= 0);
    const cell = (sl, i) => {
      if (!sl) {
        if (!mine) return `<div class="gcell empty"><i>🟫</i><b>${t('空著')}</b></div>`;
        return `<button type="button" class="gcell empty" data-pick="${i}"><span class="gck">☐</span><i>🌱</i><b>${t('空著')}</b><small>${t('點我種菜')}</small></button>`;
      }
      const c = CROP_BY_ID[sl.c];
      const remain = sl.ready - (Date.now() + skew);
      const wtag = sl.w ? `<small>💧×${sl.w}</small>` : '';
      if (remain <= 0) {
        // 🌙 只能晚上收的作物（月光白蘿蔔）：白天先顯示「晚上才能收」
        if (c.night && !isNight()) return `<div class="gcell ready"><i>${c.icon}</i><b>${t(c.zh)}</b><small>${t('晚上才能收 🌙')}</small>${wtag}</div>`;
        return `<div class="gcell ready"><i>${c.icon}</i><b>${t(c.zh)}</b>${wtag}${mine ? `<button type="button" class="mini-btn" data-harvest="${i}">${t('🧺 收成')}</button>` : `<small>${t('可以收成了')}</small>`}</div>`;
      }
      const wbtn = mine ? '' : sl.iw ? `<small>${t('澆過了 💧')}</small>` : sl.w >= WATER_MAX ? `<small>${t('澆滿了')}</small>` : `<button type="button" class="mini-btn" data-water="${i}">${t('💧 澆水')}</button>`;
      return `<div class="gcell"><i>${c.icon}</i><b>${t(c.zh)}</b><small>${t('還要 {t}', { t: left(remain) })}</small>${wtag}${wbtn}</div>`;
    };
    const readyN = mine ? res.slots.filter((sl) => sl && sl.ready - (Date.now() + skew) <= 0 && !(CROP_BY_ID[sl.c]?.night && !isNight())).length : 0;
    const allBtn = readyN >= 2 ? `<button type="button" class="garden-harvest-all" id="garden-harvest-all">${t('🧺 全部收成（{n} 格）', { n: readyN })}</button>` : '';
    const selBar = mine && emptyIdx.length > 1 ? `<div class="garden-selbar"><span class="gsel-tip">${t('點空格打勾，可以多選')}</span><button type="button" class="gp-all" id="garden-all">☐ ${t('全選空格（{n}）', { n: emptyIdx.length })}</button><button type="button" class="gp-all" id="garden-clr" hidden>✕ ${t('清除')}</button></div>` : '';
    const slots = `${allBtn}${selBar}<div class="garden-grid">${res.slots.map(cell).join('')}</div>${
      mine && emptyIdx.length
        ? `<div class="garden-pick" id="garden-pick" hidden><b id="garden-pick-t"></b><div class="crop-pick">${CROPS.filter((c) => isOpen(c)).map((c) => `<button type="button" class="mini-btn" data-c="${c.id}">${c.icon} ${t(c.zh)}<small>🌰 ${c.seed}・${t('{h} 小時', { h: c.hours })}・🧺 ${basket[c.id] ?? 0}</small></button>`).join('')}</div></div>`
        : ''
    }${!mine && !res.slots.some(Boolean) ? `<div class="dex-note">${t('菜園現在空空的')}</div>` : ''}`;
    const expand =
      mine && res.next
        ? `<div class="garden-slot empty"><b>${t('🌱 還可以再開墾（最多 {max} 格）', { max: res.max })}</b><button type="button" class="mini-btn" id="garden-expand" ${(pinecones ?? 0) < res.next ? 'disabled' : ''}>${t('➕ 開墾第 {n} 格 🌰 {p}', { n: res.slots.length + 1, p: res.next })}</button></div>`
        : '';
    const henBtn = mine && plot.tent.hens?.length ? `<div class="garden-slot empty"><button type="button" class="mini-btn" id="hen-open">${t('🐔 照顧小肥雞')}</button></div>` : mine && isOpen({ from: HEN_FROM }) && !plot.tent.hens?.length ? `<div class="garden-slot empty"><b>${t('🐔 想養小肥雞嗎？按下面的按鈕就可以養！')}</b><small>${t('餵牠蔬菜或果實，牠就會下蛋 🥚')}</small><button type="button" class="shop-buy-tent" id="hen-start">${t('🐔 雞舍＋一隻小肥雞 🌰 {p}', { p: COOP_PRICE })}</button></div>` : '';
    modal.open(
      (mine ? t('🥕 我的小菜園') : t('🥕 {name} 的小菜園', { name: plot.tent.name || t('旅人') })) + ` ${res.slots.length}/${res.max}`,
      `${henBtn}<div class="dex-note">${mine ? t('種子用松果買（越慢長的越貴），種下去等幾小時就能收成，放著不收也不會枯掉。朋友路過可以幫忙澆水，少等 30 分鐘、收成多一個。收成的蔬菜可以拿去營火旁煮料理，或當手作家具的材料。') : t('幫朋友的菜澆水，可以少等 30 分鐘、收成多一個 💧')}</div>${slots}${expand}`,
      (body) => {
        body.querySelector('#hen-start')?.addEventListener('click', () => buyHen(plot));
        body.querySelector('#hen-open')?.addEventListener('click', () => openCoop(plot));
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
        // 點空格 → 打勾（可以多選，作者 11/23：玩家建議；松果不夠時少勾幾格就能種）→ 下面選作物 → 一次種下去
        const sel = new Set();
        const pickEl = body.querySelector('#garden-pick');
        const allBtn = body.querySelector('#garden-all');
        const clrBtn = body.querySelector('#garden-clr');
        const drawPick = () => {
          const n = sel.size;
          pickEl.hidden = !n;
          body.querySelector('#garden-pick-t').innerHTML = t('已選 <b>{n}</b> 格要種什麼？（你有 🌰 {p}）', { n, p: pinecones ?? 0 });
          if (allBtn) {
            const all = n === emptyIdx.length;
            allBtn.textContent = (all ? '☑ ' : '☐ ') + t('全選空格（{n}）', { n: emptyIdx.length });
            allBtn.classList.toggle('on', all);
          }
          if (clrBtn) clrBtn.hidden = !n;
          for (const e of body.querySelectorAll('[data-pick]')) {
            const on = sel.has(Number(e.dataset.pick));
            e.classList.toggle('sel', on);
            const ck = e.querySelector('.gck');
            if (ck) ck.textContent = on ? '☑' : '☐';
          }
          for (const e of body.querySelectorAll('.crop-pick [data-c]')) {
            const c = CROP_BY_ID[e.dataset.c];
            const cost = c.seed * Math.max(1, n);
            e.disabled = (pinecones ?? 0) < cost;
            const sm = e.querySelector('small');
            if (sm) sm.textContent = `${t('{n} 格', { n: Math.max(1, n) })} 🌰 ${cost}・${t('{h} 小時', { h: c.hours })}${e.disabled ? `・${t('松果不夠')}` : ''}`;
          }
        };
        for (const e of body.querySelectorAll('[data-pick]')) {
          e.addEventListener('click', () => {
            const i = Number(e.dataset.pick);
            sel.has(i) ? sel.delete(i) : sel.add(i);
            drawPick();
            if (sel.size === 1) pickEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
        }
        allBtn?.addEventListener('click', () => {
          if (sel.size === emptyIdx.length) sel.clear();
          else for (const i of emptyIdx) sel.add(i);
          drawPick();
          if (sel.size) pickEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        clrBtn?.addEventListener('click', () => (sel.clear(), drawPick()));
        for (const b of body.querySelectorAll('.crop-pick [data-c]')) {
          b.addEventListener('click', async () => {
            if (!sel.size) return;
            const c = CROP_BY_ID[b.dataset.c];
            const idx = [...sel].sort((x, y) => x - y);
            const n = idx.length;
            const cost = c.seed * n;
            if ((pinecones ?? 0) < cost) return hud.toast(t('松果不夠，還差 {n} 顆 🌰，少勾幾格試試', { n: cost - (pinecones ?? 0) }));
            if (n > 1 && !(await confirmBuy.ask({ icon: c.icon, name: t('{crop}種子 ×{n}', { crop: t(c.zh), n }), price: cost, coins: pinecones }))) return;
            if (!act(idx[0], 'plant', 1.6)) return;
            for (const k of idx) camp.gardenFx(hid, k, 'dirt');
            audio.sfx('tap');
            await wait(1100); // 挖好土再種下去
            const r = n > 1 ? await net.request('gardenPlantAll', { c: c.id, idx }) : await net.request('gardenPlant', { slot: idx[0], c: c.id });
            if (r?.ok) {
              hud.toast(n > 1 ? t('🌱 {n} 格都種下{icon} {name}了！大約 {h} 小時後收成', { n: r.n ?? n, icon: c.icon, name: t(c.zh), h: c.hours }) : t('🌱 種下{icon} {name}了！大約 {h} 小時後收成', { icon: c.icon, name: t(c.zh), h: c.hours }), 4000);
              refreshCamp();
            } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : t('沒種成，再試一次吧'));
          });
        }
        // 🧺 全部收成（作者 11/21）
        body.querySelector('#garden-harvest-all')?.addEventListener('click', async (e) => {
          const ready = res.slots.map((sl, i) => (sl && sl.ready - (Date.now() + skew) <= 0 ? i : -1)).filter((i) => i >= 0);
          if (!ready.length || !act(ready[0], 'pick', 1.25)) return;
          e.currentTarget.disabled = true;
          for (const i of ready) camp.gardenFx(hid, i, 'pull', player.position);
          const r = await net.request('gardenHarvestAll', {});
          if (r?.ok) {
            basket = r.basket;
            await wait(500);
            audio.sfx('bell');
            const list = Object.entries(r.got).map(([id, n]) => `${CROP_BY_ID[id].icon}×${n}`).join(' ');
            hud.toast(t('🧺 收成了 {n} 格：{list}', { n: r.slots.length, list }) + (r.gain ? t('（第一次收成 +{g} 🌰）', { g: r.gain }) : '') + (r.skipNight ? t('・🌙 月光白蘿蔔晚上再收') : ''), 5000);
            await wait(800);
            refreshCamp();
          } else if (r?.reason === 'night') hud.toast(t('🌙 月光白蘿蔔要晚上才能收成喔'));
        });
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
    const mine = ownedDishes(dishes);
    if (!mine.length) return hud.toast(t('還沒有料理，先去煮一道吧'));
    modal.open(t('🧺 把料理放上野餐桌'), `<div class="dex-note">${t('放上桌的料理，路過的人每天可以拿一份（同一種最多 5 份）')}</div>${mine.map((d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${dishName(d, t)} ×${dishes[d.id]}</b></div><button type="button" class="mini-btn" data-put="${d.id}">${t('放一份')}</button></div>`).join('')}`, (body) => {
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
    // 🌳 樹屋鞦韆：坐上去時選盪的力道（3 段）
    if (yard.treeSwing) {
      for (const [lv, label] of [[1, t('🪢 坐上去・輕輕盪')], [2, t('🪢 坐上去・盪高一點')], [3, t('🪢 坐上去・用力盪')]])
        opts.push({
          label,
          fn: () => {
            if (sitYard(seats[0])) yard.treeSwing.userData.level = lv;
          },
        });
    }
    for (const st of yard.treeSwing ? [] : seats) {
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
              label: t('😋 拿一份{icon} {name}（還有 {n} 份）', { icon: DISH_BY_ID[pic.dish]?.icon ?? '', name: dishName(DISH_BY_ID[pic.dish], t), n: pic.n }),
              fn: async () => {
                const r = await net.request('picnicTake', { hid });
                if (r?.ok) {
                  dishes = r.dishes;
                  audio.sfx('bell');
                  hud.toast(t('😋 拿到一份{icon} {name}！到「📖 圖鑑 → 🍲 料理」可以吃', { icon: DISH_BY_ID[r.dish]?.icon ?? '', name: dishName(DISH_BY_ID[r.dish], t) }), 5000);
                } else hud.toast(r?.reason === 'took' ? t('今天已經拿過一份了') : t('桌上的料理被拿完了'));
              },
            });
        } else if (pic) opts.push({ label: t('桌上現在有 {n} 份{name}', { n: pic.n, name: dishName(DISH_BY_ID[pic.dish], t) }), off: true });
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
    const y = YARD_BY_ID[id] ?? { icon: yard.icon, zh: yard.name };
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
  // ---------- 🐔 小肥雞（11/27）：菜園面板可以買雞舍；走到雞舍旁按 E 打開 ----------
  const henColorOf = (c) => HEN_COLORS.find((x) => x.id === c) ?? HEN_COLORS[0];
  /** 🐔 作者 11/22：小朋友不知道怎麼養小肥雞 →「帶我去養雞」：傳送到自己家門口，直接打開菜園（最上面就是養雞） */
  async function goHens() {
    if (!myHome?.tent || !myHome.plot) return shopHint();
    modal.close();
    await teleportToPlot(myHome.plot.z, myHome.plot.n);
    let tries = 0;
    const tick = setInterval(() => {
      const plot = roomMgr.current?.id === 'campground' && camp.plots?.find((x) => x.tent?.mine);
      if (plot) {
        clearInterval(tick);
        openGarden(plot);
      } else if (++tries > 20) clearInterval(tick);
    }, 400);
  }
  async function buyHen(plot) {
    const pick = await new Promise((done) => {
      modal.open(
        t('🐔 挑一隻小肥雞'),
        `<div class="dex-note">${t('選毛色（之後還可以再養，最多 {n} 隻）', { n: HEN_MAX })}</div><div class="crop-pick">${HEN_COLORS.map((x) => `<button type="button" class="mini-btn" data-hc="${x.id}">${x.icon} ${t(x.zh)}</button>`).join('')}</div>`,
        (body) => {
          for (const b of body.querySelectorAll('[data-hc]')) b.addEventListener('click', () => done(Number(b.dataset.hc)));
        },
      );
    });
    if (pick == null) return;
    const info = await net.request('henInfo');
    const price = info?.price ?? COOP_PRICE;
    if (!(await confirmBuy.ask({ icon: '🐔', name: info?.hens?.length ? t('再養一隻小肥雞') : t('雞舍＋一隻小肥雞'), price, coins: pinecones }))) return;
    const r = await net.request('henBuy', { c: pick });
    if (r?.ok) {
      audio.sfx('bell');
      hud.toast(t('🐣 小肥雞來了！走到菜園旁邊的雞舍按 E 可以照顧牠'), 5000);
      refreshCamp();
      renderCoop(r, plot);
    } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : r?.reason === 'later' ? t('11/27 才開放喔') : t('現在不能養'));
  }
  let coopSel = -1;
  let coopMode = 'feed';
  async function openCoop(plot) {
    coopSel = -1;
    const hid = plot.tent.mine ? undefined : plot.tent.hid;
    const res = await net.request('henInfo', { hid });
    if (!res?.ok) return hud.toast(t('還沒連上伺服器，等一下再試'));
    renderCoop(res, plot);
  }
  function renderCoop(res, plot) {
    const mine = res.mine;
    const hm = (ms) => {
      const m = Math.max(1, Math.ceil(ms / 60000));
      return m >= 60 ? t('{h} 小時 {m} 分', { h: Math.floor(m / 60), m: m % 60 }) : t('{m} 分鐘', { m });
    };
    const feedable = Object.keys(basket).filter((id) => basket[id] > 0 && canFeed(materialOf(id))).sort((a, b) => basket[b] - basket[a]).slice(0, 6);
    const totalEggs = res.hens.reduce((a, h) => a + h.eggs, 0);
    // 🐔 作者 11/22：跟菜園一樣一隻一格（一排 2 隻）；點「🍞 餵牠」下面跳出要餵什麼，點名字 ✏️ 改名
    if (!res.hens[coopSel]) coopSel = -1;
    const cell = (h, i) => {
      const col = henColorOf(h.c);
      const full = h.fn >= FEED_PER_DAY;
      const waitTxt = mine && !full && h.wait > 0 ? t('⏳ {t} 後可以再餵', { t: hm(h.wait) }) : '';
      const st = [mine ? t('今天餵 {n}/{m}', { n: h.fn, m: FEED_PER_DAY }) : '', h.next ? t('再餵 {k} 次升級', { k: h.next }) : t('圓滾滾！')].filter(Boolean).join('・');
      const egg = h.eggIn ? `<small>${t('下一顆蛋：{t}', { t: hm(h.eggIn) })}</small>` : !h.eggs && mine && !full ? `<small>${t('餵牠就會下蛋 🥚')}</small>` : '';
      const nm = escapeHtml(h.nm || t('還沒取名'));
      return `<div class="hcell${h.eggs ? ' has-egg' : ''}${i === coopSel ? ' sel' : ''}">
        ${h.eggs ? `<span class="hc-badge">🥚×${h.eggs}</span>` : ''}${mine && full ? `<span class="hc-full">${t('😋 吃飽了')}</span>` : ''}
        <i>🐔</i>${mine ? `<button type="button" class="hc-nm" data-hedit="${i}">${nm} <small>✏️</small></button>` : `<b class="hc-nm">${nm}</b>`}
        <span class="hc-dots">${t('胖胖')} ${'●'.repeat(h.fat)}${'○'.repeat(3 - h.fat)}</span>
        <small>${col.icon} ${t(col.zh)}・${st}</small>${egg}
        ${waitTxt ? `<small>${waitTxt}</small>` : mine && !full ? `<button type="button" class="mini-btn" data-hsel="${i}">${t('🍞 餵牠')}</button>` : ''}
      </div>`;
    };
    const more = mine && res.hens.length < res.max ? `<div class="hcell empty"><i>🐣</i><b>${t('再養一隻')}</b><button type="button" class="mini-btn" id="hen-more">🌰 ${res.price}</button></div>` : '';
    const sel = res.hens[coopSel];
    const pick =
      mine && sel && coopMode === 'feed' && sel.fn < FEED_PER_DAY && !(sel.wait > 0)
        ? `<div class="garden-pick"><b>${t('🍞 餵「{name}」吃什麼？', { name: escapeHtml(sel.nm || t('還沒取名')) })}</b>${feedable.length ? `<div class="crop-pick">${feedable.map((id) => `<button type="button" class="mini-btn" data-feed="${coopSel}" data-id="${id}">${materialOf(id).icon} ${t(materialOf(id).zh)} ×${basket[id]}</button>`).join('')}</div>` : `<small>${t('採集籃裡沒有蔬菜或果實可以餵')}</small>`}</div>`
        : mine && sel && coopMode === 'name'
          ? `<div class="garden-pick"><b>${t('✏️ 幫牠取名字')}</b><div class="hen-name"><input type="text" maxlength="8" data-hnm="${coopSel}" value="${escapeHtml(sel.nm)}" placeholder="${t('幫牠取名字')}"><button type="button" class="mini-btn" data-hname="${coopSel}">${t('✏️ 取名')}</button></div></div>`
          : '';
    modal.open(
      (mine ? t('🐔 我的小肥雞') : t('🐔 {name} 的小肥雞', { name: plot.tent.name || t('旅人') })) + ` ${res.hens.length}/${res.max}`,
      `<div class="dex-note">${mine ? t('餵一次蔬菜或果實，1 小時後就下一顆蛋（沒餵不會下蛋）。每隻一天 3 次、每次要隔 1 小時。越餵越圓，3 級的一次下 2 顆，偶爾還會下金蛋！') : t('朋友家的小肥雞，看起來吃得很好 🐔')}</div>
       ${mine ? `<button type="button" class="shop-buy-tent" id="hen-eggs" ${totalEggs ? '' : 'disabled'}>${totalEggs ? t('🥚 撿蛋（{n} 顆）', { n: totalEggs }) : t('🥚 還沒有蛋可以撿')}</button>` : ''}
       <div class="hen-grid">${res.hens.map(cell).join('')}${more}</div>${pick}`,
      (body) => {
        body.querySelector('#hen-more')?.addEventListener('click', () => buyHen(plot));
        for (const b of body.querySelectorAll('[data-hsel]')) b.addEventListener('click', () => ((coopSel = Number(b.dataset.hsel)), (coopMode = 'feed'), renderCoop(res, plot)));
        for (const b of body.querySelectorAll('[data-hedit]')) b.addEventListener('click', () => ((coopSel = Number(b.dataset.hedit)), (coopMode = 'name'), renderCoop(res, plot)));
        body.querySelector('#hen-eggs')?.addEventListener('click', async () => {
          const r = await net.request('henEggs');
          if (!r?.ok) return hud.toast(t('還沒有蛋可以撿'));
          basket = r.basket ?? basket;
          audio.sfx('bell');
          hud.toast(r.got.gold ? t('🌟 哇！撿到金蛋 ×{g}，還有雞蛋 ×{n}', { g: r.got.gold, n: r.got.egg }) : t('🥚 撿到雞蛋 ×{n}，放進採集籃了', { n: r.got.egg }), 5000);
          renderCoop(r, plot);
        });
        for (const b of body.querySelectorAll('[data-feed]'))
          b.addEventListener('click', async () => {
            b.disabled = true;
            const r = await net.request('henFeed', { i: Number(b.dataset.feed), id: b.dataset.id });
            if (!r?.ok) return hud.toast(r?.reason === 'full' ? t('今天吃飽了，明天再餵') : r?.reason === 'wait' ? t('牠還飽飽的，{t} 後再餵', { t: hm(r.wait) }) : t('沒有成功，再試一次'));
            basket = r.basket ?? basket;
            audio.sfx('tap');
            hud.toast(r.up ? t('🐔 變圓了！胖胖 {n} 級', { n: r.up }) : t('🐔 吃得好開心 💕・1 小時後下蛋'), 3000);
            if (r.up) refreshCamp();
            renderCoop(r, plot);
          });
        for (const b of body.querySelectorAll('[data-hname]'))
          b.addEventListener('click', async () => {
            const nm = body.querySelector(`[data-hnm="${b.dataset.hname}"]`)?.value ?? '';
            const r = await net.request('henName', { i: Number(b.dataset.hname), nm });
            if (r?.ok) {
              coopMode = 'feed';
              renderCoop(r, plot);
            }
          });
      },
    );
  }
  actions.onCoop = (plot) => {
    if (!net.online) return hud.toast(t('連上伺服器才能照顧小肥雞'));
    if (plot.tent.demo) return;
    openCoop(plot);
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
  // ---------- ⛵ 租船（作者 11/19，11/27 開） ----------
  const lake = rooms.lake_dock;
  /** 跟伺服器的船名單對一下：我在不在船上 */
  const syncMyBoat = () => {
    lake.boats.setSelf(net.id);
    const m = roomMgr?.current?.id === 'lake_dock' ? lake.boats.mine() : null;
    if (m && !actions.boat) {
      if (actions.state !== 'free') actions.stop();
      setTrophy?.(null);
      actions.boat = { id: m.id, owner: m.owner, seat: () => lake.boats.seatOf(net.id), heading: () => lake.boats.center(m.id)?.ry };
      lake.boat = { owner: m.owner, ry: () => (actions.state === 'free' ? player.rotationY : (lake.boats.center(m.id)?.ry ?? player.rotationY)) }; // 釣魚時人轉向船邊，船不跟著轉
      const s = lake.boats.seatOf(net.id);
      if (s) {
        player.position.set(s.x, s.y, s.z);
        player.rotationY = s.ry;
      }
      const left = Math.max(1, Math.round((m.d.until - Date.now()) / 60000));
      hud.toast(m.owner ? t('⛵ 出發！WASD／搖桿划船，F 甩竿釣魚，E 下船（還有 {n} 分鐘）', { n: left }) : t('⛵ 坐上 {name} 的船了！F 甩竿釣魚，E 下船', { name: m.d.on }), 5000);
    } else if (!m && actions.boat) leaveBoatLocal();
    else if (m && actions.boat) actions.boat.owner = lake.boat.owner = m.owner;
  };
  const leaveBoatLocal = (at) => {
    if (actions.state === 'fish') actions.stop();
    actions.boat = null;
    lake.boat = null;
    player.position.y = 0;
    if (at) player.position.set(at.x, 0, at.z);
    player.velocity?.set(0, 0, 0);
  };
  net.on('boats', ({ list }) => {
    if (roomMgr?.current?.id !== 'lake_dock') return;
    lake.boats.setSelf(net.id);
    lake.boats.set(list);
    syncMyBoat();
  });
  net.on('boatPos', ([id, x, z, ry]) => lake.boats.move(id, x, z, ry));
  net.on('boatOff', ({ why, x, z }) => {
    if (!actions.boat) return;
    leaveBoatLocal({ x, z });
    player.rotationY = Math.PI;
    hud.toast(why === 'time' ? t('⏰ 10 分鐘到了，船划回碼頭囉') : why === 'owner' ? t('⛵ 船主下船了，大家回到碼頭上') : t('⛵ 回到碼頭上了'), 4000);
  });
  net.on('whaleTent', ({ tent }) => {
    audio.sfx('bell');
    hud.toast(tent ? t('🐳 釣到藍鯨寶寶！送你「藍鯨帳篷」，到小舖 → ⛵ 帳篷外觀換上') : t('🐳 釣到藍鯨寶寶！送你「藍鯨帳篷」，有了帳篷就能換上'), 7000);
  });
  actions.onBoatLeave = async () => {
    if (actions.boat?.owner) {
      const now = Date.now();
      if (!(lake._leaveAsk > now - 3000)) {
        lake._leaveAsk = now;
        return hud.toast(t('再按一次 E 下船（船會還回去，大家回到碼頭）'));
      }
    }
    lake._leaveAsk = 0;
    await net.request('boatLeave', {});
  };
  actions.onBoatJoin = async (b) => {
    const r = await net.request('boatJoin', { id: b.id });
    if (!r?.ok) hud.toast(r?.reason === 'full' ? t('這艘船坐滿了') : r?.reason === 'far' ? t('再靠近船一點') : t('船已經開走了'));
  };
  /** 🐟 魚飼料到幾點（撒了魚上鉤比較快） */
  let baitUntil = 0;
  let baitBag = 0; // 背包裡還有幾包（作者 11/22：買了先收著，釣魚時按「🐟 撒」）
  fishing.fast = () => Date.now() < baitUntil;
  fishing.hold = () => social.typing; // 💬 打字時魚先不咬鉤（作者 11/24）
  // 重新整理、換裝置進來：問一下魚飼料還剩多久、背包幾包
  net.on('joined', () => setTimeout(async () => {
    const r = await net.request('boatInfo', {});
    if (r?.feedLeft) baitUntil = Date.now() + r.feedLeft;
    baitBag = r?.bait ?? 0;
  }, 3000));
  /** 買一包魚飼料 → 放進背包 */
  const buyBait = async () => {
    if (!(await confirmBuy.ask({ icon: '🐟', name: t('特殊魚飼料（10 分鐘）'), price: FEED_PRICE, coins: pinecones }))) return false;
    const r = await net.request('buyFeed', {});
    if (r?.ok) {
      baitBag = r.bait ?? baitBag + 1;
      shopPanel.baitBag = baitBag;
      hud.toast(t('🐟 魚飼料放進背包了（{n} 包）！釣魚時按「🐟 撒」撒下去', { n: baitBag }), 4500);
      return true;
    }
    hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : r?.reason === 'bagFull' ? t('背包裡的魚飼料已經很多了，先用掉一些') : r?.reason === 'later' ? t('🐟 魚飼料 11/27 開賣喔') : t('現在買不了，等一下再試'));
    return false;
  };
  /** 🐟 撒魚飼料（釣魚時右邊的圓按鈕） */
  const useBait = async () => {
    if (!baitBag) return hud.toast(t('背包裡沒有魚飼料，到小舖「🎣 釣具」買'));
    if (!['fish', 'boat'].includes(actions.state)) return hud.toast(t('去水邊釣魚時再撒'));
    const r = await net.request('useFeed', {});
    if (!r?.ok) return hud.toast(r?.reason === 'tooMany' ? t('飼料已經夠多了，等一下再撒') : r?.reason === 'place' ? t('去水邊釣魚時再撒') : t('現在撒不了，等一下再試'));
    baitBag = r.bait;
    shopPanel.baitBag = baitBag;
    baitUntil = Date.now() + r.feedLeft;
    fishing.bait?.();
    bubbles.show('self', '🐟✨', { emoji: true });
    audio.sfx?.('splash');
    hud.toast(t('🐟 撒下魚飼料！{left} 內魚會比較快上鉤', { left: fmtLeft(r.feedLeft) }), 3000);
  };
  net.on('feedThrow', ({ id }) => bubbles.show(id, '🐟✨', { emoji: true }));
  const baitBtn = document.createElement('button');
  baitBtn.type = 'button';
  baitBtn.className = 'bait-btn';
  baitBtn.hidden = true;
  baitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    useBait();
  });
  document.getElementById('ui').appendChild(baitBtn);
  const baitChip = document.createElement('div');
  baitChip.className = 'bait-chip';
  baitChip.hidden = true;
  document.getElementById('ui').appendChild(baitChip);
  /** 😋 手機、平板：料理倒數放在上方按鈕最後一排的右邊空位（作者 11/22：原本固定位置會壓到「❓ 問題」）；放不下就放按鈕列下面 */
  const placeBuff = () => {
    const el = document.getElementById('buff-chip');
    // 作者 11/24（平板直放在湖畔）：寬畫面、營火廣場以外的地方原本固定在左上 (22,102)，平板按鈕排成三排時會壓在按鈕上 → 一樣找空位
    const inline = window.innerWidth >= 600 && document.body.classList.contains('room-forest_main');
    if (!el || el.hidden || inline) return el && (el.style.top = el.style.right = el.style.left = '');
    const bar = document.getElementById('online');
    const btns = [...(bar?.querySelectorAll('button, .chip, [class*="-chip"]') ?? [])].filter((b) => b !== el && b.offsetParent && b.getBoundingClientRect().width > 0);
    if (!btns.length) return;
    const rects = btns.map((b) => b.getBoundingClientRect());
    const lastTop = Math.max(...rects.map((r) => r.top));
    const row = rects.filter((r) => Math.abs(r.top - lastTop) < 8);
    const right = Math.max(...row.map((r) => r.right));
    const h = row[0].height;
    const w = el.getBoundingClientRect().width || 80;
    if (window.innerWidth - right > w + 26) el.style.top = `${Math.round(lastTop + (h - el.offsetHeight) / 2)}px`;
    else el.style.top = `${Math.round(Math.max(...rects.map((r) => r.bottom)) + 6)}px`;
    el.style.right = '14px';
    el.style.left = 'auto';
  };
  // 🍾 漂流瓶（作者 11/23，玩家建議）：釣魚時旁邊一顆「🍾 寫信」，寫一封信丟進湖裡；別人撈到漂流瓶時有一半機會讀到
  const bottleBtn = document.createElement('button');
  bottleBtn.type = 'button';
  bottleBtn.className = 'bait-btn bottle-btn';
  bottleBtn.hidden = true;
  bottleBtn.innerHTML = `🍾<small>${t('寫信')}</small>`;
  bottleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openBottle();
  });
  document.getElementById('ui').appendChild(bottleBtn);
  async function openBottle() {
    if (!net.online) return hud.toast(t('還沒連上伺服器，等一下再試'));
    const info = await net.request('bottleInfo', {});
    if (!info?.ok) return;
    const mine = (info.mine ?? [])
      .slice()
      .reverse()
      .map((b) => `<div class="btl-mine${b.hidden ? ' off' : ''}"><span>${escapeHtml(b.text)}</span><small>${b.hidden ? t('被檢舉，先收起來了') : t('被撈到 {n} 次・💗 {h}', { n: b.read, h: b.hearts })}</small></div>`)
      .join('');
    modal.open(
      t('🍾 漂流瓶'),
      `<div class="dex-note">${t('寫一封信裝進瓶子丟進湖裡，別人釣魚時可能會撈到、讀到你的信 💌')}</div>
       <textarea class="btl-text" maxlength="${info.len}" placeholder="${t('想對撈到的人說什麼？')}"></textarea>
       <div class="dex-note">${t('最多 {n} 字・今天還能丟 {left} 瓶・作者會看信，亂寫的會被收回', { n: info.len, left: info.left })}</div>
       <button type="button" class="shop-buy-tent" id="btl-go" ${info.left > 0 ? '' : 'disabled'}>${info.left > 0 ? t('🍾 丟進湖裡（🌰 {p}）', { p: info.price }) : t('今天丟完了，明天再來')}</button>
       ${mine ? `<div class="dex-note">${t('📮 我丟過的瓶子')}</div>${mine}` : ''}`,
      (body) => {
        const ta = body.querySelector('.btl-text');
        body.querySelector('#btl-go')?.addEventListener('click', async (e) => {
          const text = ta.value.trim();
          if (text.length < 2) return hud.toast(t('多寫幾個字吧 ✏️'));
          const btn = e.currentTarget; // await 之後 e.currentTarget 會是 null
          btn.disabled = true;
          const r = await net.request('bottleThrow', { text });
          if (!r?.ok) {
            btn.disabled = false;
            return hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : r?.reason === 'limit' ? t('今天丟完了，明天再來') : r?.reason === 'muted' ? t('🔇 你暫時不能說話') : r?.reason === 'where' ? t('要在湖邊或河邊才能丟') : t('沒丟成，再試一次吧'));
          }
          modal.close();
          audio.sfx('splash');
          hud.toast(t('🍾 撲通！瓶子漂走了，等有緣人撈到它 💌'), 4000);
        });
      },
    );
  }
  net.on('bottleLetter', ({ k, text, name, hearted }) => {
    audio.sfx('bell');
    modal.open(
      t('🍾 瓶子裡有一封信！'),
      `<div class="btl-paper">${escapeHtml(text)}<small>—— ${escapeHtml(name)}</small><div class="btl-tr" id="btl-tr" hidden></div></div>
       <div class="btl-row"><button type="button" class="mini-btn" id="btl-heart" ${hearted ? 'disabled' : ''}>${hearted ? t('💗 已經送過了') : t('💗 回一顆愛心')}</button><button type="button" class="mini-btn" id="btl-rep">${t('🚩 檢舉')}</button></div>
       <div class="dex-note">${t('想寫信給別人？釣魚時按旁邊的「🍾 寫信」')}</div>`,
      (body) => {
        // 🌐 11/23 作者：別國語言寫的信自動翻成自己的語言（信很少，不管聊天的 🌐 開關都翻）
        translateChat(text, true).then((tr) => {
          const el = body.querySelector('#btl-tr');
          if (!tr || !el?.isConnected) return;
          el.textContent = `🌐 ${tr}`;
          el.hidden = false;
        });
        body.querySelector('#btl-heart')?.addEventListener('click', async (e) => {
          // 作者 11/23 回報錯誤：await 之後 e.currentTarget 會變成 null，要先把按鈕存起來
          const btn = e.currentTarget;
          btn.disabled = true;
          const r = await net.request('bottleHeart', { k });
          btn.textContent = t('💗 已經送過了');
          if (r?.ok) hud.toast(t('💗 送出愛心了！{name} 會收到', { name }));
        });
        body.querySelector('#btl-rep')?.addEventListener('click', async (e) => {
          if (!confirm(t('確定要檢舉這封信嗎？'))) return;
          e.currentTarget.disabled = true;
          await net.request('bottleReport', { k });
          hud.toast(t('🚩 謝謝你，作者會看一下'));
          modal.close();
        });
      },
    );
  });
  net.on('bottleHeart', ({ name, text }) => hud.toast(t('💗 {name} 撈到你的漂流瓶「{text}⋯」，送你一顆愛心！', { name, text }), 6000));
  /** 每 0.25 秒：釣魚時顯示「🐟 撒」按鈕、飼料還剩多久 */
  let baitUiT = 0;
  const baitTick = (dt) => {
    if ((baitUiT -= dt) > 0) return;
    baitUiT = 0.25;
    // 🏆 11/27 起上方的「湖畔排行」按鈕拿掉（改在租船看板、河畔木牌裡）
    const rb = document.getElementById('fish-board-btn');
    if (rb) rb.hidden = isOpen({ from: BOAT_FROM });
    placeBuff();
    const fishingNow = ['fish', 'boat'].includes(actions.state);
    const btnOn = fishingNow && baitBag > 0 && isOpen({ from: BOAT_FROM });
    baitBtn.hidden = !btnOn;
    bottleBtn.hidden = !fishingNow;
    bottleBtn.classList.toggle('up', btnOn);
    if (btnOn) {
      const txt = `🐟<small>${t('撒')} ×${baitBag}</small>`;
      if (baitBtn._t !== txt) (baitBtn._t = txt), (baitBtn.innerHTML = txt);
    }
    const left = baitUntil - Date.now();
    const chipOn = fishingNow && left > 0 && !document.getElementById('fish-card')?.classList.contains('show');
    baitChip.hidden = !chipOn;
    if (chipOn) {
      baitChip.textContent = t('🐟 飼料 {t}・魚上鉤比較快', { t: `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}` });
      // 營火河畔的「火多旺」小條在的話排在它下面
      const fc = document.querySelector('.river-fire');
      let y = belowHud();
      if (fc && !fc.hidden) y = Math.round(fc.getBoundingClientRect().bottom + 6);
      const ts = document.getElementById('toasts');
      const tr = ts?.children.length ? ts.getBoundingClientRect() : null;
      if (tr && tr.top < y + 30) y = Math.max(y, Math.round(tr.bottom + 6));
      baitChip.style.top = `${y}px`;
    }
  };
  const fmtLeft = (ms) => t('{m} 分 {s} 秒', { m: Math.floor(ms / 60000), s: Math.floor((ms % 60000) / 1000) });
  actions.onBoatSign = async () => {
    if (!net.online) return hud.toast(t('還沒連上伺服器，等一下再試'));
    const info = await net.request('boatInfo', {});
    if (!info?.ok) return;
    if (!info.open) return hud.toast(t('⛵ 11/27 開放租船喔'));
    modal.open(
      t('⛵ 租船'),
      `${rankTab(t('⛵ 租船'))}<div class="dex-note">${t('租 10 分鐘：自己划、在湖上哪裡都能釣魚，還有 ⛵ 船釣限定魚！朋友走到船旁邊按 E 就能免費坐上來。')}</div>
      <div class="boat-pick">${BOAT_LIST.map((k) => `<button type="button" class="boat-card" data-boat="${k.id}" ${info.full ? 'disabled' : ''}><span class="bc-icon">${k.icon}</span><b>${t(k.zh)}</b><small>${t('{n} 人座', { n: k.people })}</small><em>🌰 ${k.price}</em></button>`).join('')}</div>
      ${info.full ? `<div class="shop-hint">${t('船都租出去了，等一下再來')}</div>` : ''}
      <div class="dex-note"><b>${t('🐟 特殊魚飼料')}</b>・${t('{n} 🌰：買了放進背包，釣魚時按「🐟 撒」，10 分鐘內魚上鉤比較快（等待時間減半）', { n: FEED_PRICE })}</div>
      <button type="button" class="mini-btn" data-feed>${t('🐟 買一包魚飼料 🌰 {n}', { n: FEED_PRICE })}${info.bait ? `（${t('背包裡 {n} 包', { n: info.bait })}）` : ''}</button>
      <div class="dex-note">${t('⏰ 時間到船會自己划回碼頭。🐳 傳說中，湖裡住著一隻藍鯨寶寶⋯')}</div>`,
      (body) => {
        bindRankTab(body);
        for (const b of body.querySelectorAll('[data-boat]'))
          b.addEventListener('click', async () => {
            const k = BOAT_LIST.find((x) => x.id === b.dataset.boat);
            if (!(await confirmBuy.ask({ icon: k.icon, name: t('{name}（10 分鐘）', { name: t(k.zh) }), price: k.price, coins: pinecones }))) return;
            const r = await net.request('boatRent', { k: k.id });
            if (r?.ok) {
              modal.close?.();
              audio.splash?.();
            } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : r?.reason === 'full' ? t('船都租出去了，等一下再來') : r?.reason === 'already' ? t('你已經在船上了') : r?.reason === 'far' ? t('走到租船看板旁邊再租') : r?.reason === 'later' ? t('⛵ 11/27 開放租船喔') : t('現在租不了，等一下再試'));
          });
        body.querySelector('[data-feed]')?.addEventListener('click', async () => {
          if (await buyBait()) modal.close?.();
        });
      },
    );
  };
  let boatSendT = 0;
  /** 每幀：船主把船的位置送出去（一秒 10 次） */
  const boatTick = (dt) => {
    if (!actions.boat) return;
    if (roomMgr.current?.id !== 'lake_dock') return leaveBoatLocal();

    if (!actions.boat.owner) return;
    boatSendT -= dt;
    if (boatSendT > 0) return;
    boatSendT = 0.1;
    const c = lake.boats.center(actions.boat.id);
    if (c && net.online) net.socket.emit('boatMove', [+c.x.toFixed(2), +c.z.toFixed(2), +c.ry.toFixed(3)]);
  };

  // ---------- 🔥 營火河畔新玩法（作者 11/20，11/27 開）：🪨 打水漂、🦆 迷你小鴨、🤝 河神大鯉魚、🔥 火越旺魚越多 ----------
  const river = forest.river;
  let myDuckUntil = 0;
  /** 別人的小鴨（加入、換地方時伺服器給的 dk） */
  function riverDucksOf(list = []) {
    if (roomMgr?.current?.id !== 'forest_main') return;
    for (const p of list) if (p.dk) river.setDuck(p.id, p.dk, null);
  }
  /** 🪨 進到營火河畔：木牌上的打水漂排行跟伺服器拿最新的 */
  function riverBoardSync() {
    if (roomMgr?.current?.id !== 'forest_main' || !net.online) return;
    net.request('skipInfo', {}).then((r) => r?.top && ((skipTop = r.top), river.setBoard(r.top)));
  }
  forest.riverPos = (id) => {
    if (id === net.id) return { x: player.position.x, z: player.position.z, ry: player.rotationY };
    const r = remotes.get(id);
    return r ? { x: r.group.position.x, z: r.group.position.z, ry: r.ry } : null;
  };
  net.on('duck', ({ id, until }) => {
    if (roomMgr?.current?.id !== 'forest_main') return;
    const r = id === net.id ? player.position : remotes.get(id)?.group.position;
    river.setDuck(id, until, r ? { x: r.x, z: r.z } : null);
  });
  actions.onDuckFeed = async () => {
    if (!net.online) return hud.toast(t('還沒連上伺服器，等一下再試'));
    // 作者 11/22：先問一下再餵（會用掉採集籃的東西，不小心按到才不會浪費）；跟伺服器挑的一樣：最常見、數量最多的蔬菜或果實
    const pick = Object.entries(basket ?? {})
      .filter(([id, n]) => n > 0 && ['veg', 'fruit'].includes(materialOf(id)?.type))
      .sort((a, b) => (materialOf(a[0]).rarity ?? 1) - (materialOf(b[0]).rarity ?? 1) || b[1] - a[1])[0];
    if (myDuckUntil > Date.now()) return hud.toast(t('🦆 小鴨已經跟著你囉'));
    if (!pick) return hud.toast(t('🦆 採集籃裡沒有蔬菜或果實，去菜園或迷霧森林找一些吧'));
    const fm = materialOf(pick[0]);
    if (!(await confirmBuy.ask({ title: t('🦆 要餵小鴨嗎？'), icon: '🦆', name: t('餵小鴨'), desc: t('會用掉採集籃的 {icon}{name} ×1（你有 {n} 個）。一次 1 隻小鴨跟著你走 3 分鐘，一天最多餵 3 次', { icon: fm.icon, name: t(fm.zh), n: pick[1] }), yes: t('🦆 餵牠') }))) return;
    const r = await net.request('duckFeed', {});
    if (r?.ok) {
      myDuckUntil = r.until;
      river.setDuck(net.id, r.until, player.position);
      if (r.basket) basket = r.basket;
      const m = materialOf(r.item);
      audio.sfx('ding');
      hud.toast(t('🦆 小鴨吃了 {icon}{name}，跟著你走 3 分鐘！（今天還能餵 {n} 次）', { icon: m?.icon ?? '', name: m ? t(m.zh) : '', n: r.left }) + (r.gain ? ` +${r.gain} 🌰` : ''), 4500);
    } else hud.toast(r?.reason === 'noFood' ? t('🦆 採集籃裡沒有蔬菜或果實，去菜園或迷霧森林找一些吧') : r?.reason === 'full' ? t('🦆 今天餵 3 次了，小鴨吃飽了，明天再來') : r?.reason === 'already' ? t('🦆 小鴨已經跟著你囉') : r?.reason === 'later' ? t('11/27 才開放喔') : t('現在餵不了，等一下再試'));
  };
  // 🪨 打水漂
  let skipTop = []; // 作者 11/22：木牌排行之前只靠廣播更新，重新整理後會變空的 → 丟石頭、打開木牌都跟伺服器拿最新的
  actions.onSkipPick = async () => {
    if (!net.online) return hud.toast(t('還沒連上伺服器，等一下再試'));
    const r = await net.request('skipInfo', {});
    if (!r?.ok || !r.open) return hud.toast(t('11/27 才開放喔'));
    if (r.top) (skipTop = r.top), river.setBoard(r.top);
    if (r.left <= 0) return hud.toast(t('🪨 今天的 10 顆扁石頭都丟完了，明天再來'));
    river.startAim();
    hud.toast(t('🪨 撿起一顆扁石頭（今天還有 {n} 顆）', { n: r.left }));
  };
  actions.onSkipThrow = async (p) => {
    if (p == null) return;
    // 面向池子丟
    const pos = player.position;
    player.rotationY = Math.atan2(POND.x - pos.x, POND.z - pos.z);
    actions.emote?.('bye');
    const r = await net.request('skipThrow', { p });
    if (!r?.ok) return hud.toast(r?.reason === 'none' ? t('🪨 今天的 10 顆扁石頭都丟完了，明天再來') : t('現在丟不了，等一下再試'));
    if (r.top) (skipTop = r.top), river.setBoard(r.top);
    river.throwStone(pos.x, pos.z, r.b, (i) => audio.sfx?.(i === r.b ? 'splash' : 'plop'));
    setTimeout(() => hud.toast(`${t('🪨 跳了 {n} 下！', { n: r.b })}${r.pb ? t('（今天最好）') : ''}${r.gain ? ' +1 🌰' : ''}${r.left ? t('・還有 {n} 顆', { n: r.left }) : ''}`, 3500), 600 + r.b * 220);
  };
  net.on('skip', ({ id, b, x, z }) => roomMgr?.current?.id === 'forest_main' && id !== net.id && river.throwStone(x, z, b));
  net.on('skipBoard', ({ top }) => ((skipTop = top ?? []), river.setBoard(top)));
  /** 🏆 釣魚排行（作者 11/22：上方按鈕拿掉，11/27 起改在湖畔租船看板、營火河畔木牌裡看；排行資料、視窗原封不動） */
  const rankTab = (here) => `<div class="shop-tabs rank-tabs"><button type="button" class="on">${here}</button><button type="button" data-rank>${t('🏆 釣魚排行')}</button></div>`;
  const bindRankTab = (body) =>
    body.querySelector('[data-rank]')?.addEventListener('click', () => {
      modal.close?.();
      fishingUI.openBoard('all');
    });
  actions.onRiverBoard = async () => {
    const info = net.online ? await net.request('skipInfo', {}) : null;
    if (info?.top) (skipTop = info.top), river.setBoard(info.top);
    const rows = skipTop.slice(0, 5).map((e, i) => `<div class="craft-row"><div class="craft-info"><b>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${escapeHtml(String(e.name).slice(0, 10))}</b></div><span>${t('{n} 下', { n: e.b })}</span></div>`).join('');
    modal.open(t('🏆 營火河畔排行'), `${rankTab(t('🪨 打水漂'))}<div class="dex-note">${t('🪨 今天打水漂排行')}</div>${rows || `<div class="dex-note">${t('還沒有人丟，快來當第一名！')}</div>`}`, bindRankTab);
  };
  // 🤝 河神大鯉魚：釣的人
  let coopId = null;
  let coopProgT = 0;
  fishing.onCoop = async (phase) => {
    if (phase === 'start') {
      coopMates.clear();
      coopMateEl.hidden = true;
      hud.toast(t('🐉 河神大鯉魚上鉤了！一個人要按很快，叫旁邊的人一起按「🤝 幫忙拉」就輕鬆了！'), 6000);
      const r = await net.request('coopStart', {});
      coopId = r?.ok ? r.id : null;
    } else {
      if (phase === 'fail' && coopId) net.online && net.socket.emit('coopStop');
      // 作者 11/22：拉上來時讓幫忙的人看到進度條跑滿（原本停在快滿的地方）
      if (phase === 'ok' && coopId && net.online) net.socket.emit('coopProg', { p: 1 });
      coopMateEl.hidden = true;
      if (phase === 'ok' && coopMates.size) hud.toast(t('🙏 謝謝 {list} 一起合力拉上河神大鯉魚！', { list: [...coopMates.keys()].join('、') }), 7000);
      coopId = null;
    }
  };
  // 🎣 釣的人：看得到誰在幫忙（作者 11/22：要知道是誰一起合力）
  const coopMates = new Map(); // 名字 → 幫了幾下
  const coopMateEl = document.createElement('div');
  coopMateEl.className = 'coop-mates';
  coopMateEl.hidden = true;
  document.getElementById('ui').appendChild(coopMateEl);
  net.on('coopPush', ({ id, name }) => {
    if (id !== coopId) return;
    // 作者 11/24 回報：別人那一下剛好把魚拉上來時，「正在幫你拉」又被打開、一直留著 → 先記名字、更新文字，最後才算進度
    if (name) {
      coopMates.set(name, (coopMates.get(name) ?? 0) + 1);
      coopMateEl.hidden = false;
      coopMateEl.textContent = t('🤝 {list} 正在幫你拉！', { list: [...coopMates.keys()].join('、') });
    }
    fishing.coopPush(1);
  });
  const COOP_PULL = FISH.find((f) => f.coop)?.pull ?? 60;
  // 🤝 旁邊的人看到的「幫忙拉」視窗
  const coopEl = document.createElement('div');
  coopEl.className = 'coop-panel';
  coopEl.hidden = true;
  document.getElementById('ui').appendChild(coopEl);
  let coopHelp = null; // { id, name, until, p, helpers }
  let coopLast = null; // 剛收起來的那一場：我拉了幾下（等 coopEnd 來時說謝謝）
  /** 上方按鈕列、活動提示最下面在哪裡（手機、平板、電腦排數不一樣） */
  const belowHud = () => {
    let y = 8;
    for (const hid of ['online', 'today', 'event-line', 'mini-line', 'buff-chip']) {
      const e = document.getElementById(hid);
      if (e && !e.hidden && e.offsetParent) y = Math.max(y, e.getBoundingClientRect().bottom);
    }
    return Math.round(y + 6);
  };
  let coopBuilt = null;
  /** 🤝 幫忙拉一下（按鈕、E、F、空白鍵都可以） */
  /** 作者 11/22：幫忙拉要跟自己釣魚一樣 → 用同一條收線進度條（畫面中間那條），點畫面任何地方、E、F、空白鍵都能拉 */
  const coopReel = () => {
    // 自己的魚上鉤／在收線：讓回自己的釣魚畫面（作者 11/24 玩家回報：自己釣到魚，畫面還卡著「幫 ○○ 一起拉」）
    if (fishing.phase === 'reel' || fishing.phase === 'bite') {
      if (fishingUI.el.reel.classList.contains('coop')) fishingUI.el.reel.classList.remove('coop'), coopEl.classList.remove('slim');
      return;
    }
    if (!coopHelp) return fishingUI.el.reel.classList.contains('coop') && (fishingUI.el.reel.classList.remove('coop'), fishingUI.showReel(false), coopEl.classList.remove('slim'));
    fishingUI.el.reel.classList.add('coop');
    fishingUI.onCoopPress = coopPullOnce;
    coopEl.classList.add('slim');
    fishingUI.showReel(true);
    fishingUI.setReel(coopHelp.p ?? 0.12, coopHelp.done ? 1 : Math.max(0, (coopHelp.until - Date.now()) / (COOP_SEC * 1000)), (coopHelp.mine ?? 0) > 0);
    fishingUI.el.reelTitle.textContent = coopHelp.done ? t('🎉 拉上來了！') : t('🤝 幫 {name} 一起拉！連點畫面', { name: coopHelp.name });
  };
  const coopPullOnce = () => {
    if (!coopHelp || coopHelp.done) return;
    if (net.online) net.socket.emit('coopPull', { id: coopHelp.id });
    // 作者 11/22：幫忙拉要跟自己釣魚一樣有感覺 → 進度條馬上往前、魚被拉近、手機震、有拉線聲、跳「+1」（之後以釣的人那邊的真實進度為準）
    coopHelp.p = Math.min(0.99, (coopHelp.p ?? 0.12) + 1 / COOP_PULL);
    coopHelp.mine = (coopHelp.mine ?? 0) + 1;
    coopEl.querySelector('.coop-bar i').style.width = `${Math.round(coopHelp.p * 100)}%`;
    coopEl.querySelector('.coop-fish').style.left = `${Math.round(coopHelp.p * 100)}%`;
    coopEl.querySelector('.coop-mine').textContent = t('你拉了 {n} 下', { n: coopHelp.mine });
    navigator.vibrate?.(12);
    audio.sfx('tap');
    const btn = coopEl.querySelector('.coop-btn');
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
    const plus = document.createElement('span');
    plus.className = 'coop-plus';
    plus.textContent = '+1';
    plus.style.left = `${30 + Math.random() * 40}%`;
    coopEl.appendChild(plus);
    setTimeout(() => plus.remove(), 700);
    coopEl.classList.remove('shake');
    void coopEl.offsetWidth;
    coopEl.classList.add('shake');
    // 畫面跟自己收線一樣輕輕震一下
    const cv = renderer.domElement;
    cv.classList.remove('coop-jolt');
    void cv.offsetWidth;
    cv.classList.add('coop-jolt');
    coopReel();
  };
  // 📱🖱️ 幫忙中：點畫面任何地方都算拉一下（跟自己釣魚一樣）
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!coopHelp || coopHelp.done || fishing.phase === 'reel' || fishing.phase === 'bite' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    coopPullOnce();
  });
  // ⌨️ 電腦：E、F、空白鍵也能幫忙拉（自己正在收線時不搶）
  window.addEventListener(
    'keydown',
    (e) => {
      if (!coopHelp || coopHelp.done || coopEl.hidden || e.repeat) return;
      if (!['KeyE', 'KeyF', 'Space'].includes(e.code)) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
      if (fishing.phase === 'reel' || fishing.phase === 'bite') return; // 自己的魚咬鉤／收線：按鍵給自己用
      e.preventDefault();
      e.stopImmediatePropagation();
      coopPullOnce();
    },
    { capture: true },
  );
  const drawCoop = () => {
    coopReel();
    if (!coopHelp) return (coopEl.hidden = true), (coopBuilt = null);
    const left = Math.max(0, Math.ceil((coopHelp.until - Date.now()) / 1000));
    coopEl.hidden = false;
    // 📱 觸控：放在上方按鈕列下面，不蓋住搖桿、右下動作鈕（作者 11/20 巡查）
    coopEl.style.top = document.body.classList.contains('touch') ? `${belowHud()}px` : '';
    const helpTxt = coopHelp.helpers?.length ? t('🤝 一起拉的人：{list}', { list: coopHelp.helpers.join('、') }) : '';
    // 只在換一場的時候重畫，之後只改文字（一直重畫按鈕，連按時會漏按）
    if (coopBuilt !== coopHelp.id) {
      coopBuilt = coopHelp.id;
      coopEl.innerHTML = `<b>${t('🐉 {name} 釣到河神大鯉魚了！', { name: coopHelp.name })}</b><small class="coop-left"></small><div class="coop-bar"><i></i><span class="coop-fish">🐉</span></div><small class="coop-mine"></small><small class="coop-who"></small><button type="button" class="coop-btn">${t('🤝 幫忙拉！（一直按）')}</button><small class="coop-keys">${document.body.classList.contains('touch') ? t('👆 點畫面任何地方也可以拉') : t('🖱️ 點畫面，或一直按 E、F、空白鍵')}</small>`;
      coopEl.querySelector('.coop-btn').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        coopPullOnce();
      });
    }
    coopEl.querySelector('.coop-left').textContent = coopHelp.done ? t('🎉 拉上來了！') : t('一個人很難拉，快來幫忙！（還有 {n} 秒）', { n: left });
    coopEl.querySelector('.coop-bar i').style.width = `${Math.round((coopHelp.p ?? 0.1) * 100)}%`;
    coopEl.querySelector('.coop-fish').style.left = `${Math.round((coopHelp.p ?? 0.1) * 100)}%`;
    const who = coopEl.querySelector('.coop-who');
    who.textContent = helpTxt;
    who.hidden = !helpTxt;
  };
  net.on('coop', ({ id, by, name, left }) => {
    if (by === net.id || roomMgr?.current?.id !== 'forest_main') return;
    coopHelp = { id, name, until: Date.now() + left, p: 0.12, helpers: [] };
    drawCoop();
    audio.sfx('bell');
  });
  net.on('coopProg', ({ id, p, helpers }) => {
    if (!coopHelp || coopHelp.id !== id) return;
    coopHelp.p = Math.max(p, p >= 1 ? 1 : Math.min(coopHelp.p ?? 0, p + 0.04)); // 剛按的還沒算進來前先不要倒退太多
    // 作者 11/22：魚已經拉上來，幫忙的視窗還要等秒數跑完 → 跑滿後 1 秒就收起來
    if (p >= 1 && !coopHelp.done) {
      coopHelp.done = true;
      coopHelp.until = Date.now() - 500;
      coopLast = { id, mine: coopHelp.mine ?? 0 };
    }
    coopHelp.helpers = helpers;
    drawCoop();
  });
  net.on('coopEnd', ({ id, ok, name, helpers }) => {
    const mine = coopHelp?.id === id ? (coopHelp.mine ?? 0) : coopLast?.id === id ? coopLast.mine : 0;
    if (coopHelp?.id === id) coopHelp = null;
    drawCoop();
    if (ok && mine >= COOP_MIN_TAPS) hud.toast(t('🎉 你幫 {name} 拉上了河神大鯉魚！{name} 謝謝你 +{g} 🌰', { name, g: COOP_GAIN }), 6000);
    else if (ok && !coopId && coopMates.size) return; // 釣的人自己：上面已經說過謝謝了
    else if (ok && roomMgr?.current?.id === 'forest_main') hud.toast(helpers?.length ? t('🎉 {name} 和 {list} 一起拉上了河神大鯉魚！', { name, list: helpers.join('、') }) : t('🎉 河神大鯉魚拉上來了！'), 6000);
    else if (!ok && id !== coopId && roomMgr?.current?.id === 'forest_main' && name) hud.toast(t('🌊 河神大鯉魚游走了⋯'), 3000);
  });
  /** 每幀：釣的人送進度、幫忙視窗倒數、🔥 營火多旺的提示 */
  const fireChip = document.createElement('div');
  fireChip.className = 'river-fire'; // ⚠️ 不能叫 fire-chip：HUD 的「🔥 回營火」按鈕已經用了
  let fireChipT = 0;
  let fireChipLv = -1;
  let fireChipLong = 0;
  let fireChipAt = 0;
  fireChip.addEventListener('click', () => (fireChipLong = 4)); // 點小小的那個：再看一次完整說明
  fireChip.hidden = true;
  document.getElementById('ui').appendChild(fireChip);
  const riverTick = (dt) => {
    if (coopId && fishing.phase === 'reel') {
      coopProgT -= dt;
      if (coopProgT <= 0 && net.online) {
        coopProgT = 0.25;
        net.socket.emit('coopProg', { p: Math.max(0, Math.min(1, fishing.progress ?? 0)) });
      }
    }
    if (coopHelp && Date.now() > coopHelp.until + 1500) (coopHelp = null), drawCoop();
    else if (coopHelp && (coopHelp._t = (coopHelp._t ?? 0) + dt) > 1) (coopHelp._t = 0), drawCoop();
    // 🔥 在營火河畔坐下釣魚：顯示現在火多旺
    // 作者 11/22：跟「釣到什麼魚」的卡片重疊 → 卡片出現時先藏起來；有提示訊息時排在提示下面
    const card = document.getElementById('fish-card');
    const show = roomMgr.current?.id === 'forest_main' && actions.state === 'fish' && river.riverOpen() && !card?.classList.contains('show');
    if (show) {
      const fr = campfire.fuelRatio;
      const lv = fr >= FIRE_HOT ? 2 : fr >= 0.4 ? 1 : 0;
      // 作者 11/22：畫面太擠 → 火的等級一變才把完整說明亮 4 秒，之後縮成小小的「🔥 ×1.6」
      if (lv !== fireChipLv) {
        // 火在兩個等級中間跳來跳去時不要一直放大：1 分鐘最多放大一次
        if (fireChipLv < 0 || performance.now() - fireChipAt > 60000) (fireChipLong = 4), (fireChipAt = performance.now());
        fireChipLv = lv;
      }
      fireChipLong -= dt;
      const long = fireChipLong > 0;
      const txt = long
        ? [t('🔥 火小小的：去添柴，河裡會更熱鬧'), t('🔥🔥 營火很旺：河畔稀有魚 ×1.3'), t('🔥🔥🔥 營火超旺！河畔稀有魚 ×1.6・火光魚出沒中')][lv]
        : ['🔥', '🔥🔥 ×1.3', '🔥🔥🔥 ×1.6'][lv];
      if (fireChip.textContent !== txt) fireChip.textContent = txt;
      fireChip.classList.toggle('mini', !long);
      // 放在上方按鈕列、活動提示的下面（手機、平板、電腦按鈕排數不一樣，不能寫死高度）
      if ((fireChipT -= dt) <= 0) {
        fireChipT = 0.2;
        let y = belowHud();
        const ts = document.getElementById('toasts');
        const tr = ts?.children.length ? ts.getBoundingClientRect() : null;
        // 縮小的標籤在右邊，不會蓋到中間的提示訊息 → 不跟著提示上上下下（作者 11/22）
        if (long && tr && tr.top < y + 34) y = Math.max(y, Math.round(tr.bottom + 6)); // 提示訊息會蓋到才往下挪
        fireChip.style.top = `${y}px`;
      }
    }
    fireChip.hidden = !show;
  };

  actions.onTrash = async (tb) => {
    const face = Math.atan2(tb.x - player.position.x, tb.z - player.position.z);
    // 🚲 騎車中：不用停下來彎腰，直接撿進垃圾袋
    if (actions.state !== 'ride' && !actions.perform('pick', 1.25, face)) return;
    const res = await net.request('pickTrash', { k: tb.k });
    if (!res?.ok) return hud.toast(res?.reason === 'gone' ? t('哎呀，被別人先撿走了') : t('再靠近一點'));
    if (res.egg) {
      audio.sfx('bell');
      return hud.toast(res.gold ? t('🌟 找到大金蛋了！+{g} 🌰', { g: res.gain }) : t('🥚 找到一顆彩蛋！'), 3000);
    }
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
  // ---------- 💇 假髮的照片（支持營地頁用） ----------
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
  let smallPick = null; // 🎁 禮盒小東西 3 選 1
  let bigPick = 'wig'; // NT$100：假髮（wig）或大件（big）二選一
  // ---------- 💝 支持營地（🎫 月票、🎁 本月支持營地）：選好 → 確認畫面（年齡勾選）→ 綠界付款 ----------
  let payTab = 'pass';
  /** 🌏 看起來不是台灣的玩家（遊戲語言不是中文、或手機時區不在台灣）：先提醒目前只能用台灣的卡 */
  const looksForeign = () => {
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    } catch {
      /* 舊瀏覽器 */
    }
    return !String(lang).startsWith('zh') || (tz && tz !== 'Asia/Taipei');
  };
  const askForeign = () =>
    new Promise((resolve) => {
      if (!looksForeign()) return resolve(true);
      net.request('foreignTry', {});
      modal.open(
        t('🌏 付款方式提醒'),
        `<div class="pay-foreign"><p>${t('目前只能用台灣發行的信用卡、Apple Pay、綠界Pay、台灣的 ATM 或超商條碼付款。')}</p><p>${t('國外的卡還在準備中，謝謝你的耐心 🙏')}</p></div>
        <div class="pay-btns"><button type="button" class="mini-btn ghost" id="pf-no">${t('取消')}</button><button type="button" class="mini-btn" id="pf-go">${t('我有台灣的卡，繼續付款')}</button></div>`,
        (body) => {
          body.querySelector('#pf-no').addEventListener('click', () => {
            modal.close();
            resolve(false);
          });
          body.querySelector('#pf-go').addEventListener('click', () => {
            net.request('foreignTry', { go: true });
            resolve(true);
          });
        },
      );
    });
  /** 確認畫面：金額、會拿到什麼、（月票）到期日、不會自動續扣、年齡勾選 → 前往付款 */
  function payConfirm({ icon, name, price, lines, onPay, back }) {
    modal.open(
      t('💝 確認一下'),
      `<div class="pay-confirm">
        <div class="pay-what">${icon} <b>${escapeHtml(name)}</b></div>
        <div class="pay-money">💳 NT$ ${price}</div>
        <ul class="pay-lines">${lines.map((x) => `<li>${x}</li>`).join('')}</ul>
        <label class="pay-age"><input type="checkbox" id="pay-age" /><span>${t('我已滿 18 歲；或未滿 18 歲，已經問過爸爸媽媽，他們同意我購買。')}</span></label>
        <div class="pay-small">${t('未成年請先問爸爸媽媽。虛擬商品付款後立即送達，送達後不提供退款；重複扣款或沒有收到，請到「👫 好友 → ✉️ 聯絡作者」告訴我們。')}</div>
      </div>
      <div class="pay-btns"><button type="button" class="mini-btn ghost" id="pay-back">${t('‹ 返回')}</button><button type="button" class="mini-btn pay-go" id="pay-go" disabled>${t('前往付款')}</button></div>`,
      (body) => {
        const age = body.querySelector('#pay-age');
        const go = body.querySelector('#pay-go');
        age.addEventListener('change', () => (go.disabled = !age.checked));
        body.querySelector('#pay-back').addEventListener('click', back);
        go.addEventListener('click', async () => {
          if (!age.checked) return;
          go.disabled = true;
          // 先開好新分頁（手機上非同步之後才開會被擋）
          let win = null;
          try {
            win = window.open('', '_blank');
          } catch {
            /* 被擋就在同一頁開 */
          }
          const res = await onPay();
          if (!res?.ok) {
            win?.close();
            go.disabled = false;
            return hud.toast(res?.reason === 'account' ? t('購買前要先建立帳號（👤 存檔）') : res?.reason === 'age' ? t('請先勾選年齡確認') : t('現在不能付款，等一下再試'));
          }
          if (win) win.location.href = res.url;
          else location.href = res.url;
          modal.close();
          hud.toast(t('💝 已經打開綠界付款頁，付款完成後回到遊戲就會自動送達'), 6000);
        });
      },
    );
  }
  async function openPass(tab) {
    if (tab) payTab = tab;
    // 👀 網址 ?xmas=1：支持營地也先看 12 月的禮盒（只能看，付款還是照真正的月份）
    const pvMonth = new URLSearchParams(location.search).get('xmas') === '1' ? '2026-12' : undefined;
    const [info, sp] = net.online ? await Promise.all([net.request('passInfo'), net.request('sponsorInfo', { preview: pvMonth })]) : [null, null];
    if (info?.ok) setPass(info);
    const off = !info?.on;
    const month = sp?.preview ? Number(pvMonth.slice(5)) : Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', month: 'numeric' }).format(new Date()));
    // 剩幾天：用台北的日期算（跟括號裡的「到 幾月幾日」一致）
    const tpDay = (ms) => Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ms)));
    const left = passState.active ? Math.max(1, Math.round((tpDay(passState.until) - tpDay(Date.now())) / 86400000)) : 0;
    const cur = passState.active ? PASS_TIERS[passState.tier] ?? PASS : null;
    // 🎫 作者 11/20：12/1 起贊助禮盒拿掉、全部併進月票（月票的人用松果買當月造型、家具）
    const sponsorEnded = !!sp?.ended;
    if (sponsorEnded) payTab = 'pass';
    const tabs = `<div class="pay-tabs"><button type="button" data-ptab="pass" class="${payTab === 'pass' ? 'on' : ''}">${t('🎫 月票')}</button>${sponsorEnded ? '' : `<button type="button" data-ptab="gift" class="${payTab === 'gift' ? 'on' : ''}">${t('🎁 {m} 月支持營地', { m: month })}</button>`}</div>`;
    let html = '';
    if (payTab === 'pass') {
      const status = cur ? t('✅ {icon} {name}月票使用中：到 {date}（還有 {n} 天）', { icon: cur.icon, name: t(cur.zh), date: fmtDate(passState.until), n: left }) : t('目前沒有月票');
      const plansOf = (T) => Object.values(PASS_PLANS).filter((p) => p.tier === T.id);
      const card = (T) => {
        let btns;
        if (cur?.id === 'star' && T.id === 'ember') btns = `<button type="button" disabled>${t('星空月票使用中')}</button>`;
        else
          btns = plansOf(T)
            .map((P) => `<button type="button" class="pay-plan" data-plan="${P.id}"><b>${P.months === 1 ? t('1 個月') : t('3 個月')}　NT$ ${P.price}</b>${P.save ? `<small>${t('省 {s} 元・先送 {n} 🌰', { s: P.save, n: P.first })}</small>` : `<small>${t('先送 {n} 🌰', { n: P.first })}</small>`}</button>`)
            .join('');
        if (cur?.id === 'ember' && T.id === 'star' && passState.upgrade) btns += `<button type="button" class="pay-plan" data-up="1"><b>${t('⬆️ 升級星空　NT$ {p}', { p: passState.upgrade })}</b><small>${t('剩下的天數不變')}</small></button>`;
        return `<div class="pass-tier pass-${T.id}${cur?.id === T.id ? ' on' : ''}">
          <div class="pass-tier-name">${T.icon} ${t(T.zh)}</div>
          <ul class="pass-list">
            <li>${t('🌰 每天第一次進來 +{n}', { n: T.daily })}</li>
            <li>${t('🎣 釣魚照價算 每天 {n} 條', { n: T.fish })}</li>
            <li>${t('💤 掛機每天上限 {n} 顆', { n: T.sit })}</li>
            <li>${t('🎫 可以買月票家具、跳色')}</li>
            ${sponsorEnded ? `<li>${t('💇 可以買每個月的限定假髮、髮夾、家具')}</li>` : ''}
            ${T.id === 'star' ? `<li>${t('🌌 星空門牌、每月搬家免費 2 次')}</li>` : ''}
            <li>${t('{icon} 名字前面的徽章', { icon: T.icon })}</li>
          </ul>
          <div class="pay-plans" ${off ? 'hidden' : ''}>${btns}</div>
        </div>`;
      };
      html = `<div class="pass-card">
        <div class="pass-tiers">${PASS_TIER_LIST.map(card).join('')}</div>
        <div class="outfit-today">${status}</div>
        <div class="dex-note">${t('免費玩家：釣魚每天前 {f} 條照價算、掛機每天最多 {s} 顆。月票只會加快松果累積，遊戲裡的東西不買也拿得到；到期後買過的東西都保留。', { f: FREE.fish, s: FREE.sit })}</div>
        <div class="dex-note">${t('一次付清，不會自動續扣。天數接在剩下的天數後面。可用台灣的信用卡、Apple Pay、綠界Pay、ATM、超商條碼。')}</div>
        ${info && !info.account ? `<div class="dex-note">${t('購買前要先建立帳號（👤 存檔），換手機登入月票才不會不見')}</div>` : ''}
        ${info?.test && !off ? `<div class="dex-note">${t('⚠️ 目前是綠界測試模式，不會真的扣款')}</div>` : ''}
        ${off ? `<div class="outfit-today">${t('🎫 月票即將推出，敬請期待！')}</div>` : ''}
        ${sponsorEnded ? `<div class="dex-note">${t('🎁 有月票的人，可以用松果買每個月的限定假髮、髮夾、限定家具（在「🏪 小舖 → 🎫 月票」）')}</div>` : ''}
      </div>`;
    } else {
      const wigs = sp?.wigs ?? [];
      const owned = sp?.owned ?? [];
      if (!wigs.includes(wigPick)) wigPick = wigs.find((id) => !owned.includes(id)) ?? wigs[0];
      const allOwned = wigs.length && wigs.every((id) => owned.includes(id));
      // 🎁 12 月起的禮盒：依金額送不同東西（pass.js 的 sponsorTier）
      const box = sp?.box ?? null;
      if (box && !box.small.includes(smallPick)) smallPick = box.small[0];
      const fz = (id) => `${CATALOG_BY_ID[id]?.icon ?? '🎁'} ${t(CATALOG_BY_ID[id]?.zh ?? id)}`;
      const furnPic = (id) => snapshot(`${id}|0`, () => buildFurniture(id, {}));
      const boxHtml = box
        ? `<p>${t('這座營地是一個人慢慢做出來的，伺服器需要一點費用。{m} 月的聖誕禮盒，依金額送你不同的東西：', { m: month })}</p>
          <table class="box-tiers">
            <tr><td><b>NT$ 60</b></td><td>${t('💇 限定假髮（2 選 1）')}</td></tr>
            <tr><td><b>NT$ 100</b></td><td>${t('假髮＋小東西 1 件（3 選 1）')}</td></tr>
            <tr><td><b>NT$ 150</b></td><td>${t('假髮＋{big}', { big: fz(box.big) })}</td></tr>
            <tr><td><b>NT$ 200</b></td><td>${t('假髮＋{big}＋小東西 3 件全部', { big: fz(box.big) })}</td></tr>
          </table>
          <div class="pay-gift-sub">${t('🎁 NT$100 的小東西選一件（NT$200 三件都送）')}</div>
          <div class="box-big">${(() => { const im = furnPic(box.big); return im ? `<img src="${im}" alt="">` : `<span>${CATALOG_BY_ID[box.big]?.icon ?? '🎁'}</span>`; })()}<small>${fz(box.big)}</small></div>
          <div class="box-smalls">${box.small.map((id) => { const im = furnPic(id); return `<button type="button" data-small="${id}" class="${id === smallPick ? 'on' : ''}">${im ? `<img src="${im}" alt="">` : `<span>${CATALOG_BY_ID[id]?.icon ?? '🎁'}</span>`}<small>${t(CATALOG_BY_ID[id]?.zh ?? id)}</small></button>`; }).join('')}</div>`
        : '';
      const card = (id) => {
        const o = OUTFIT_BY_ID[id];
        const pic = wigPicture(id);
        const picB = wigPicture(id, 2.6);
        const has = owned.includes(id);
        return `<button type="button" class="sw-card${id === wigPick ? ' on' : ''}${has ? ' has' : ''}" data-wig="${id}">
          ${pic ? `<span class="sw-pics"><img class="sw-pic" src="${pic}" alt=""><img class="sw-pic" src="${picB}" alt=""></span><small>${t('正面　　背面')}</small>` : `<div class="sw-emoji">${o.icon}</div>`}
          <span class="sw-name">${o.icon} ${t(o.zh)}</span>
          <small>${has ? t('✅ 已經有了') : o.sex === 'm' ? t('男生款') : t('女生款')}</small>
        </button>`;
      };
      html = `<div class="pay-gift">
        <div class="pay-gift-head">${t('謝謝你支持營地 🔥')}</div>
        ${box ? boxHtml : `<p>${t('這座營地是一個人慢慢做出來的，伺服器需要一點費用。贊助 NT${n} 以上，送你 {m} 月限定假髮（2 選 1）。', { n: sp?.min ?? 60, m: month })}</p>`}
        ${box ? `<div class="pay-gift-sub">${t('💇 選一款假髮（每個金額都送）')}</div>` : ''}
        ${wigs.length ? `<div class="sw-cards">${wigs.map(card).join('')}</div>` : ''}
        <div class="dex-note">${t('先點選喜歡的那一款。同一個月再贊助一次，送你另一款。')}</div>
        ${allOwned ? `<div class="sw-has">${t('✅ 這個月的兩款你都有了，謝謝你的支持 💛')}</div>` : ''}
        ${sp?.preview ? `<div class="sw-has">${t('👀 這是 {m} 月的預覽，{m} 月 1 日才能贊助', { m: month })}</div>` : off ? `<div class="sw-has">${t('🎁 即將推出，敬請期待！')}</div>` : `<div class="sw-amts">${(sp?.amounts ?? []).map((a) => `<button type="button" data-amt="${a}"><small>💝 ${t('贊助')}</small><b>NT$ ${a}</b></button>`).join('')}</div>`}
        <div class="dex-note">${t('一次付清，不會自動續扣。可用台灣的信用卡、Apple Pay、綠界Pay、ATM、超商條碼。')}</div>
        ${sp && !sp.account ? `<div class="dex-note">${t('贊助前要先建立帳號（👤 存檔），假髮才不會不見')}</div>` : ''}
      </div>`;
    }
    modal.open(t('💝 支持營地'), tabs + html, (body) => {
      for (const b of body.querySelectorAll('[data-ptab]')) b.addEventListener('click', () => openPass(b.dataset.ptab));
      const needAcct = (acc) => {
        if (acc) return false;
        modal.close();
        hud.onMeClick?.({ focusAccount: true });
        return true;
      };
      for (const b of body.querySelectorAll('[data-plan], [data-up]')) {
        b.addEventListener('click', async () => {
          if (needAcct(info?.account)) return;
          if (!(await askForeign())) return;
          const up = b.dataset.up === '1';
          const P = PASS_PLANS[b.dataset.plan];
          const T = up ? PASS_TIERS.star : PASS_TIERS[P.tier];
          const until = Math.max(Date.now(), passState.active ? passState.until : 0) + (up ? 0 : P.days * 86400000);
          payConfirm({
            icon: T.icon,
            name: up ? t('升級成星空月票') : t('{name}月票 {m}', { name: t(T.zh), m: P.months === 1 ? t('1 個月') : t('3 個月（90 天）') }),
            price: up ? passState.upgrade : P.price,
            lines: up
              ? [t('🌰 補送 {n} 顆松果', { n: PASS_TIERS.star.first - PASS_TIERS.ember.first }), t('📅 剩下的天數不變（到 {date}）', { date: fmtDate(passState.until) }), t('🔁 一次付清，不會自動續扣')]
              : [t('🌰 付款後先送 {n} 顆松果', { n: P.first }), t('📅 用到 {date}', { date: fmtDate(until) }), t('🔁 一次付清，不會自動續扣')],
            back: () => openPass('pass'),
            onPay: () => net.request('passOrder', { plan: up ? null : P.id, upgrade: up, age: true }),
          });
        });
      }
      for (const b of body.querySelectorAll('[data-wig]')) {
        b.addEventListener('click', () => {
          wigPick = b.dataset.wig;
          for (const x of body.querySelectorAll('[data-wig]')) x.classList.toggle('on', x === b);
        });
      }
      for (const b of body.querySelectorAll('[data-small]'))
        b.addEventListener('click', () => {
          smallPick = b.dataset.small;
          for (const x of body.querySelectorAll('[data-small]')) x.classList.toggle('on', x === b);
        });
      for (const b of body.querySelectorAll('[data-bpick]'))
        b.addEventListener('click', () => {
          bigPick = b.dataset.bpick;
          for (const x of body.querySelectorAll('[data-bpick]')) x.classList.toggle('on', x === b);
        });
      for (const b of body.querySelectorAll('[data-amt]')) {
        b.addEventListener('click', async () => {
          if (needAcct(sp?.account)) return;
          if (!(await askForeign())) return;
          const amt = Number(b.dataset.amt);
          const owned = sp?.owned ?? [];
          // 選的那款已經有了 → 送另一款；兩款都有了 → 單純支持
          const box = sp?.box ?? null;
          const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date());
          const tier = box ? sponsorTier(ym.slice(0, 7), amt) : null;
          const wantWig = box ? tier.wig || (tier.pick && bigPick === 'wig') : amt >= (sp?.min ?? 60);
          const give = wantWig ? ([wigPick, ...(sp?.wigs ?? [])].find((id) => id && !owned.includes(id)) ?? null) : null;
          const fz = (id) => `${CATALOG_BY_ID[id]?.icon ?? '🎁'} ${t(CATALOG_BY_ID[id]?.zh ?? id)}`;
          const gifts = [];
          if (box) {
            if (tier.small) gifts.push(...(tier.small >= 3 ? box.small : [smallPick ?? box.small[0]]).map(fz));
            if (tier.big || (tier.pick && bigPick === 'big')) gifts.push(fz(box.big));
          }
          if (give) gifts.push(outfitName(give));
          payConfirm({
            icon: '💝',
            name: t('支持營地'),
            price: amt,
            lines: [gifts.length ? t('🎁 送你：{name}', { name: gifts.join('、') }) : t('💛 單純支持營地（這個月的假髮你都有了）'), ...(box ? [t('🎒 家具會放進背包，到帳篷就能擺')] : []), t('🔁 一次付清，不會自動續扣')],
            back: () => openPass('gift'),
            onPay: () => net.request('sponsorOrder', { amt, wig: give ?? wigPick, small: smallPick, pick: bigPick, age: true }),
          });
        });
      }
    });
  }
  hud.onPass = () => openPass();
  net.on('sponsored', ({ wig, got, furn }) => {
    audio.sfx('bell');
    if (furn?.length) return hud.toast(t('💛 謝謝你的贊助！聖誕禮盒送到了：{list}（家具在背包裡，到帳篷就能擺）', { list: [...furn.map((id) => `${CATALOG_BY_ID[id]?.icon ?? ''} ${t(CATALOG_BY_ID[id]?.zh ?? id)}`), ...(wig && got ? [`💇 ${t(OUTFIT_BY_ID[wig]?.zh ?? '')}`] : [])].join('、') }), 9000);
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
  // ✨ 異色圖鑑收錄
  net.on('shinyDex', ({ fish, gain, bonus, count, total, shiny }) => {
    fishingUI.setShiny(shiny);
    const f = FISH[fish];
    setTimeout(() => {
      hud.toast(t('✨ 異色圖鑑新收錄：{name}！+{n} 🌰（{c}／{t}）', { name: f?.name ?? '', n: gain, c: count, t: total }), 5000);
      if (bonus) setTimeout(() => hud.toast(t('🏆 異色魚全部收集完成！再送你 {n} 顆松果', { n: bonus }), 6000), 2500);
      if (bonus) setTimeout(() => dexPop(t('異色魚圖鑑'), '✨'), 9000);
      audio.sfx('bell');
    }, 3400); // 等釣到魚的卡片、一般圖鑑的提示先秀完
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
  // 🐣 11/13 作者：新人一進來就跳「用瀏覽器打開」會把人推走（小雞秒玩來的人每個都看到）
  //    → 改成做完新手小任務、或玩滿 10 分鐘，才提醒一次（那時已經喜歡上了，比較會照做）
  let showInappTip = () => {};
  {
    const kind = inAppKind();
    let seen = false;
    try {
      seen = sessionStorage.getItem('cozy-inapp-tip') === '1';
    } catch {
      /* 存不了也沒關係 */
    }
    if (kind && !seen) {
      showInappTip = () => {
        showInappTip = () => {};
        try {
          sessionStorage.setItem('cozy-inapp-tip', '1');
        } catch {
          /* 同上 */
        }
        const name = { line: 'LINE', ig: 'Instagram', fb: 'Facebook', threads: 'Threads', wechat: t('微信'), iframe: '' }[kind] ?? '';
        const el = document.createElement('div');
        el.className = 'inapp-tip';
        const url = new URL(location.href);
        if (kind === 'line') url.searchParams.set('openExternalBrowser', '1'); // LINE 支援：加這個參數會改用手機的瀏覽器打開
        el.innerHTML = `<b>${kind === 'iframe' ? t('📌 用完整版玩，進度才會保存') : t('📌 在 {app} 裡玩，進度可能存不起來', { app: name })}</b>
        <span>${kind === 'line' || kind === 'iframe' ? t('點下面的按鈕，用瀏覽器打開') : t('點右上角「⋯」→「用瀏覽器開啟」')}</span>
        <div class="inapp-btns">${kind === 'line' || kind === 'iframe' ? `<a class="mini-btn" href="${url.href}" target="${kind === 'iframe' ? '_blank' : '_self'}" rel="noopener">${t('👉 用瀏覽器打開')}</a>` : ''}<button type="button" class="mini-btn ghost">${t('知道了')}</button></div>`;
        el.querySelector('button').addEventListener('click', () => el.remove());
        document.body.appendChild(el);
        // 🔗 11/17 嵌在別的網站：按鈕帶一次性代碼，新分頁接著玩同一個角色（不然會變成全新的人）
        if (kind === 'iframe') {
          try {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (/^cozy/.test(k) && k !== 'cozy-boot' && k !== 'cozy-campfire-staff') data[k] = localStorage.getItem(k);
            }
            fetch('/api/xfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => {
                if (!j?.tok) return;
                const u = new URL(url.href);
                u.searchParams.set('xfer', j.tok);
                const a = el.querySelector('a.mini-btn');
                if (a) a.href = u.href;
              })
              .catch(() => {});
          } catch {
            /* 存不了就照舊開新的 */
          }
        }
        setTimeout(() => el.remove(), 30000); // 不理它也會自己收起來，不一直擋著
      };
      setTimeout(() => showInappTip(), 10 * 60 * 1000);
    }
  }
  // 📊 新手小任務統計：還沒連上伺服器就等一下再送（最多等 1 分鐘）
  const kidStep = (id, tries = 0) => {
    if (net.online && net.socket) net.socket.emit('kidStep', { id });
    else if (tries < 20) setTimeout(() => kidStep(id, tries + 1), 3000);
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
    // 🌱 新手小任務 6 步做完：送 20 松果，再跳歡迎卡
    onIntroDone: async () => {
      if (net.online) await net.request('kidDone', {});
      setTimeout(() => shopPanel.refresh(), 400); // 第 6 步按「打開小舖」時，小舖已經開著 → 送的 20 松果要馬上顯示
      setTimeout(() => inviteNudge('intro', t('🎉 你學會了！邀朋友一起來烤火，新朋友來了你和他都 +10 🌰')), 45000); // 👫 11/14
      setTimeout(() => showInappTip(), 25000); // 歡迎卡、取名提醒之後再說
      setTimeout(showSeeYou, 8000);
      setTimeout(() => !welcome.visible && welcome.maybeShow(), 9000);
      // ✏️ 11/09 作者：隨機名字常撞名 → 新手小任務做完，如果還是隨機名字，輕輕提醒一次去取名（只提醒一次）
      setTimeout(() => {
        try {
          if (!isAutoName(myName) || localStorage.getItem('cozy-name-nudge')) return;
          localStorage.setItem('cozy-name-nudge', '1');
        } catch {
          return;
        }
        sharePop(t('✏️ 幫自己取個名字吧'), null, () => hud.onMeClick?.());
      }, 20000);
    },
    onComplete: (task, firstTime, id) => {
      if (firstTime) setStage(1);
      if (task?.kid) kidStep(id); // 📊 新手小任務每一步（/stats 看卡在哪）
    },
    onKidStep: (id) => kidStep(id),
    // 👉 帶我去：角色自己走過去（frame() 裡的 stepAutoWalk 負責走）
    onWalk: (kind) => {
      if (kind === 'shop') { // 🛒 新手第 6 步：直接打開小舖（打開就算完成）
        ritual.walking = false;
        shopPanel.open();
        return;
      }
      autoWalk = { kind, best: Infinity, stuckT: 0, sideT: 0, side: 1, tries: 0 };
      input.markActive();
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
    riverDucksOf(res.players);
    riverBoardSync();
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
  net.on('homeBack', (res) => {
    if (!inHome()) return;
    // ⛺ 重連後回到帳篷：換回帳篷裡的人；萬一回到的不是畫面上這個帳篷，就照伺服器的重畫，布置也先關掉
    if (res?.owner && shownHomeOwner && res.owner !== shownHomeOwner) {
      stopBuild();
      shownHomeOwner = res.owner;
      homeRoom.setHome(res.home, !!res.mine);
      buildPanel.showTools(homeRoom.mine, res.home?.open !== false);
    }
    applySnapshot(res);
  });
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
    // 💝 作者 11/22：上方「支持營地」按鈕拿掉了；月票在「🏪 小舖 → 🎫 月票」
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
      //   作者 11/13 回報：電腦改了名字，手機登入同一個帳號卻變回手機原本的隨機名字
      //   → 以「最後改的那一台」為準（lookAt 時間）；剛在這台登入帳號時，一律用帳號裡存的
      let adopt = false;
      try {
        adopt = localStorage.getItem('cozy-adopt-look') === '1';
        localStorage.removeItem('cozy-adopt-look');
      } catch {
        /* 無痕模式 */
      }
      const serverNewer = !!w.look?.name && (adopt || (w.look.at ?? 0) > (profile.lookAt ?? 0) || !profile.custom); // 這台的名字是隨機的（沒自己取過）→ 用帳號裡的
      if (serverNewer) {
        profile = { ...profile, ...w.look, custom: true, customLook: true, lookAt: w.look.at ?? Date.now() };
        delete profile.at;
        saveProfile(profile);
        myName = profile.name;
        applyLook(profile);
        hud.setMe(myName);
        net.rejoin({ auto: !profile.custom, name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '', code: profile.code || '', x: player.position.x, z: player.position.z, ry: player.rotationY });
      } else if (profile.custom || profile.customLook) {
        pushLook();
      } else if (!w.look?.name && accountName()) {
        // 有帳號但還沒存過名字：就算沒按過 ✏️，也把現在的名字固定下來
        profile = { ...profile, custom: true, customLook: true, lookAt: Date.now() };
        saveProfile(profile);
        pushLook();
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
      fishingUI.setShiny(w.shiny);
      // 以前存在這個瀏覽器裡的魚簍，也一起存進帳號（換手機登入就看得到）
      const local = Object.fromEntries(Object.entries(fishingUI.creel).filter(([, e]) => e?.count).map(([i, e]) => [i, e.best || 1]));
      if (Object.keys(local).length) net.request('dexSync', { dex: local }).then((r) => r?.dex && fishingUI.mergeDex(r.dex));
      setCoins(w.pc, (w.daily?.gain ?? 0) + (w.daily?.pass ?? 0));
      refreshLooks(); // 連上就先拿「買過的毛色、尾巴、耳朵」，打開外型頁才不會顯示成沒買過
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
    riverDucksOf([info]);
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
  net.on('rejected', (res) => {
    if (res?.reason === 'full') hud.toast(fullMsg(), 4000);
    if (res?.reason === 'banned') showBanned(res.until);
  });
  // ⛔ 被停權（作者 11/16 可以在後台停權）：蓋一層說明，進不了遊戲
  function showBanned(until) {
    if (document.getElementById('ban-card')) return;
    const el = document.createElement('div');
    el.id = 'ban-card';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(20,14,10,.92);color:#f5e6d3;font-size:18px;text-align:center;padding:24px;line-height:1.7';
    el.textContent = until ? t('⛔ 你的帳號暫停使用，到 {d} 才能再進來', { d: new Date(until).toLocaleDateString() }) : t('⛔ 你的帳號已經被停止使用');
    document.body.appendChild(el);
  }
  net.on('banned', ({ until } = {}) => showBanned(until));
  // ⚠️ 作者 11/18：營地管理員的警告（後台送的）。5 秒後才能按「我知道了」，按了告訴伺服器看過了
  //   作者：大陸的小朋友用簡體字比較有感 → 瀏覽器是 zh-CN／zh-Hans／zh-SG，或後台勾了「用簡體字」，就用簡體
  function showWarn(w = {}) {
    document.getElementById('warn-card')?.remove();
    const nav = (navigator.languages ?? [navigator.language ?? '']).join(',').toLowerCase();
    const sc = w.sc || /zh-(cn|sg|hans)/.test(nav);
    const zh = String(lang).startsWith('zh') || sc;
    const R = {
      curse: ['罵人、說髒話', '骂人、说脏话'],
      note: ['亂留言', '乱留言'],
      name: ['取了不恰當的名字', '取了不恰当的名字'],
      spam: ['洗版、一直刷聊天', '刷屏、一直刷聊天'],
    };
    const why = w.r === 'other' ? w.note : zh ? R[w.r]?.[sc ? 1 : 0] : t(R[w.r]?.[0] ?? '');
    const txt = sc
      ? { h: '营地管理员的警告', a: `你在营地里<b>${escapeHtml(why ?? '')}</b>，让其他人不舒服。`, b: '营地的对话都有记录。', c: '如果再这样，会被<b>禁止说话</b>或<b>封号</b>（进不了营地）。', d: '请大家当好邻居 🏕️', ok: '我知道了' }
      : { h: t('營地管理員的警告'), a: t('你在營地裡{why}，讓其他人不舒服。', { why: `<b>${escapeHtml(why ?? '')}</b>` }), b: t('營地的對話都有紀錄。'), c: t('如果再這樣，會被禁止說話或停權（進不了營地）。'), d: t('請大家當好鄰居 🏕️'), ok: t('我知道了') };
    const el = document.createElement('div');
    el.id = 'warn-card';
    el.innerHTML = `<div class="warn-box"><div class="warn-ic">⚠️</div><div class="warn-h">${txt.h}</div><div class="warn-t">${txt.a}<br>${txt.b}<br>${txt.c}</div><div class="warn-d">${txt.d}</div><button type="button" class="warn-ok" disabled>${txt.ok}（5）</button></div>`;
    document.body.appendChild(el);
    const btn = el.querySelector('.warn-ok');
    let n = 5;
    const tick = setInterval(() => {
      n--;
      if (n > 0) return void (btn.textContent = `${txt.ok}（${n}）`);
      clearInterval(tick);
      btn.textContent = txt.ok;
      btn.disabled = false;
    }, 1000);
    btn.addEventListener('click', () => {
      el.remove();
      net.request('warnSeen', {}).catch(() => {});
    });
  }
  net.on('warned', (w) => showWarn(w));
  // 🔇 被禁言：不能聊天、大聲公、留言、繪馬、密頻
  net.on('muted', ({ until } = {}) => {
    if (until === -1) return hud.toast(t('✅ 你可以再聊天了'));
    hud.toast(until ? t('🔇 你暫時不能說話，到 {d} 才可以', { d: new Date(until).toLocaleString() }) : t('🔇 你已經不能在營地說話了'), 4000);
  });
  net.on('caught', ({ id, name, fish, size, rank, shiny }) => {
    const f = FISH[fish];
    if (shiny && id !== net.id) return; // ✨ 異色魚：bigCatch 那邊會跳大公告
    if (id === net.id) {
      // 自己的：伺服器回報排名後，卡片補上「湖畔排行第 N 名」
      if (rank && lastCatch) fishingUI.showCard(lastCatch.index, lastCatch.size, { ...lastCatch.rec, rank });
      return;
    }
    if (!f) return;
    // 作者 11/23：一般的魚、垃圾不進聊天紀錄（上方即時動態已經有）；★4 以上才記在聊天
    if (f.junk || f.rarity < 4) return;
    else if (f.rarity >= 5) return; // ★5、傳說：bigCatch 那邊會跳大公告、也會記進聊天紀錄
    else if (f.rarity >= 4) {
      hud.toast(t('🎉 哇！{name} 釣到了 {size} 公分的{fish}！', { name, size, fish: f.name }), 4500);
      social.addLog('', t('🎉 {name} 釣到了 {size} 公分的{fish}！', { name, size, fish: f.name }), { system: true, feed: true, big: true });
    }
  });
  net.on('board', ({ board }) => fishingUI.setBoard(board, true));
  // 📣 五星魚、傳說之魚：全伺服器大公告
  net.on('bigCatch', ({ name, fish, size, place, shiny }) => {
    const f = FISH[fish];
    if (!f) return;
    const where = place === 'lake_dock' ? t('湖畔碼頭') : t('營火河畔');
    // 作者 11/22：五星大魚也要記在聊天紀錄（大公告一下就不見了）
    social.addLog('', t('📣 {name} 在{where}釣到了 {size} 公分的{fish}！', { name, where, size, fish: (shiny ? '✨' : '') + f.name }), { system: true, feed: true, big: true });
    const el = document.createElement('div');
    el.className = 'big-catch' + (f.legend ? ' legend' : '') + (shiny ? ' shiny' : '');
    el.innerHTML = `<b>${shiny ? t('✨ 異色魚出現了！') : f.legend ? t('🐉 傳說之魚現身！') : t('📣 五星大魚！')}</b><span></span>`;
    el.querySelector('span').textContent = t('{name} 在{where}釣到了 {size} 公分的{fish}', { name, where, size, fish: shiny ? t('異色{fish}', { fish: f.name }) : f.name });
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
  // 聊天框的 🎣：開關「大家釣魚、煮料理」的消息（作者 11/22；記在這台裝置）
  {
    const btn = document.getElementById('chat-feed-toggle');
    let off = false;
    try {
      off = localStorage.getItem('cozy-feed-off') === '1';
    } catch {
      /* ignore */
    }
    const paint = () => (btn?.classList.toggle('off', off), document.body.classList.toggle('feed-off', off));
    paint();
    btn?.addEventListener('click', () => {
      off = !off;
      try {
        localStorage.setItem('cozy-feed-off', off ? '1' : '0');
      } catch {
        /* ignore */
      }
      paint();
      hud.toast(off ? t('🎣 大家釣魚、煮料理的消息：關（五星大魚的大公告照樣會跳）') : t('🎣 大家釣魚、煮料理的消息：開'));
      document.getElementById('chat-text')?.focus();
    });
  }
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
    if (by && by !== net.id) hud.toast(t('📌 {name} 在告示牌貼了一張留言', { name })); // 沒有 by＝作者在後台刪了一張
  });
  net.on('wishes', ({ wishes, by, name }) => {
    applyWishes(wishes);
    if (by && by !== net.id) hud.toast(t('📝 {name} 在祈福處掛了一塊繪馬', { name }));
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
      setRemoteFireSeats(room.id === 'forest_main');
      setRemoteHeight(room.id === 'home' ? rooms.home.heightAt : room.id === 'campground' ? rooms.campground.heightAt : null); // 坐在門口擺設上的人高度
      setRemoteSpot(room.id === 'campground' ? rooms.campground.remoteSpot : null); // 🪢 別人坐在樹屋鞦韆上也跟著盪
      setRemoteBoat(room.id === 'lake_dock' ? (id) => rooms.lake_dock.boats.seatOf(id) : null); // ⛵ 別人坐在船上
      if (room.id !== 'lake_dock') rooms.lake_dock.boats.clear();
      // 🦆 離開營火廣場：別人的小鴨收起來；自己的小鴨在河邊等（回來時從河邊跑過來）
      rooms.forest_main.river.clearDucks();
      rooms.forest_main.river.cancelAim();
      if (room.id === 'forest_main' && myDuckUntil > Date.now()) rooms.forest_main.river.setDuck(net.id, myDuckUntil, player.position);
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
    // 📅 今日限定：第一次走到湖邊／迷霧森林時提醒一次（一天一次）
    {
      const x = todaySpecial().off ? null : todayText();
      const kind = !x ? null : room.id === 'lake_dock' ? 'fish' : room.id === 'mist_forest' ? 'gather' : null;
      const k = `cozy-today-${kind}`;
      try {
        if (kind && localStorage.getItem(k) !== x.sp.day) {
          localStorage.setItem(k, x.sp.day);
          setTimeout(() => hud.toast(kind === 'fish' ? [x.fish, x.shiny].filter(Boolean).join('・') : x.gather), 2600);
        }
      } catch {}
    }
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
      shownHomeOwner = res?.owner ?? null;
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
      riverDucksOf(res.players);
      riverBoardSync();
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
  updNews.payOn = () => payOn; // 💝 月票開通了才顯示月票的公告
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
  // 🌱 新手任務「去小舖看帳篷」：不在營火廣場（例如剛在湖邊釣完魚）也給一顆「🛒 小舖」（作者 11/15：任務叫人點小舖，湖邊卻沒有按鈕）
  const shopStepAway = () => ritual?.id === 'k_shop' && !ritual?.done && roomMgr?.current.id !== 'forest_main';
  let shopAwayShown = false;
  setInterval(() => shopStepAway() !== shopAwayShown && drawCampBar(), 1000);
  function drawCampBar() {
    const id = roomMgr?.current.id;
    shopAwayShown = shopStepAway();
    campBar.classList.toggle('show', id === 'campground' || id === 'home' || shopAwayShown);
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
  function moveMapSvg(tents, mineN, reserved, view = false) {
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
          return `<g class="mvp mine${view ? ' go' : ''}" data-n="${n}" ${at}><circle r="3.6" class="mv-halo"/><path d="M-2.6 1.6 L0 -2.6 L2.6 1.6 Z" fill="#ffb347" stroke="#7a3e10" stroke-width=".35"/><path d="M-.6 1.6 L0 .2 L.6 1.6Z" fill="#7a3e10"/><text y="-3.4" class="mv-star">⭐</text><text y="4.4" class="mv-nm mv-me">${t('我家')}</text></g>`;
        if (tn || reserved.includes(n)) {
          const nm = tn?.name ? escapeHtml(tn.name.slice(0, 6)) : '';
          const c = TENT_TINT[[...(tn?.name ?? '')].reduce((a, ch) => a + ch.charCodeAt(0), n) % TENT_TINT.length];
          const onl = view && tn?.on; // 🗺️ 營地地圖：主人在線上的亮一點
          return `<g class="mvp taken${view && tn ? ' go' : ''}${onl ? ' onl' : ''}" data-n="${n}" ${at}>${view && tn ? '<circle r="4" fill="transparent"/>' : ''}${onl ? '<circle r="3.4" class="mv-onl"/>' : ''}<path d="M-2.2 1.4 L0 -2.2 L2.2 1.4 Z" fill="${c}" stroke="#5a3a22" stroke-width=".3"/><path d="M-.5 1.4 L0 .2 L.5 1.4Z" fill="#5a3a22"/>${nm ? `<text y="3.9" class="mv-nm">${nm}</text>` : ''}</g>`;
        }
        if (view) return `<g class="mvp empty" ${at}><circle r="1.4" class="mv-ring2"/><text y="0.6" class="mv-num">${n}</text></g>`;
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
  /**
   * 🗺️ 營地地圖（作者 11/13：營地入口的地圖看板、「🧭 去哪裡」都能打開）
   *   看每一區有誰住、誰在線上；點某頂帳篷 → 問「要傳送到 〇〇 的家門口嗎？」→ 確定才傳
   */
  async function openCampMap(z = roomMgr.current.id === 'campground' ? campZone : myHome?.plot?.z ?? 0) {
    if (!net.online) return hud.toast(t('連上伺服器才能看營地地圖'));
    const list = await net.request('campList', { zone: z });
    if (!list?.ok) return hud.toast(t('連上伺服器才能看營地地圖'));
    const mine = myHome?.plot;
    const maxZ = Math.max((list.zones ?? []).length, mine ? mine.z + 1 : 1, z + 1);
    const cnt = (k) => list.online?.[k] ?? 0; // 那一區現在幾個人
    const tabs = Array.from({ length: maxZ }, (_, k) => `<button type="button" class="mini-btn${k === z ? ' on' : ''}" data-mz="${k}">${zoneName(k)}${mine?.z === k ? ' ⭐' : ''}${cnt(k) ? `<small> 👣${cnt(k)}</small>` : ''}</button>`).join('');
    const tents = list.tents;
    const svg = moveMapSvg(tents, mine && mine.z === z ? mine.n : 0, list.reserved ?? [], true);
    const here = roomMgr.current.id === 'campground' && campZone === z;
    modal.open(
      t('🗺️ 營地地圖・{z} 區', { z: zoneName(z) }),
      `<div class="mv-tabs">${tabs}</div><div class="mv-map">${svg}</div>
       <div class="mv-legend"><span>⭐ ${t('我家')}</span><span>⛺ ${t('有人住')}</span><span><i class="mv-onl-dot"></i> ${t('主人在線上')}</span></div>
       <div class="dex-note">${t('點一頂帳篷，可以直接傳送到他的家門口')}${here ? '' : `・<button type="button" class="mini-btn" id="mv-zone">${t('🏕️ 走去 {z} 區入口', { z: zoneName(z) })}</button>`}</div>`,
      (body) => {
        for (const b of body.querySelectorAll('[data-mz]')) b.addEventListener('click', () => (modal.close(), openCampMap(Number(b.dataset.mz))));
        body.querySelector('#mv-zone')?.addEventListener('click', () => (modal.close(), hud.onGo(`camp:${z}`)));
        for (const g of body.querySelectorAll('.mvp.go'))
          g.addEventListener('click', () => {
            const n = Number(g.dataset.n);
            const tn = tents[n - 1];
            const isMine = mine && mine.z === z && mine.n === n;
            audio.sfx?.('click');
            askTeleport(z, n, isMine ? t('我家') : tn?.name ?? t('{z} 區 {n} 號', { z: zoneName(z), n }), isMine);
          });
      },
    );
  }
  function askTeleport(z, n, name, isMine) {
    modal.open(
      t('🗺️ 傳送'),
      `<div class="mv-ask">${isMine ? t('要傳送到 <b>我家</b> 門口嗎？') : t('要傳送到 <b>{name}</b> 的家門口嗎？', { name: escapeHtml(name) })}<small>${t('{z} 區 {n} 號', { z: zoneName(z), n })}</small></div><div class="yard-opts"><button type="button" class="mini-btn" id="tp-ok">${t('確定傳送')}</button><button type="button" class="mini-btn" id="tp-no">${t('取消')}</button></div>`,
      (body) => {
        body.querySelector('#tp-no').addEventListener('click', () => (modal.close(), openCampMap(z)));
        body.querySelector('#tp-ok').addEventListener('click', () => (modal.close(), teleportToPlot(z, n)));
      },
    );
  }
  /** 傳送到某一區某一號的家門口（站在門口前面、面向帳篷） */
  let pendingPlace = null;
  async function teleportToPlot(z, n) {
    const p = CAMP_LAYOUT.plots[n - 1];
    if (!p) return;
    const f = { x: Math.sin(p.ry), z: Math.cos(p.ry) };
    const spot = { x: p.x + f.x * 4.2, z: p.z + f.z * 4.2, ry: p.ry + Math.PI };
    const place = () => {
      player.position.set(spot.x, 0, spot.z);
      player.rotationY = spot.ry;
      cameraRig.target.yaw = cameraRig.yaw = spot.ry + Math.PI;
    };
    if (roomMgr.current.id === 'campground') {
      // 已經在營地：換區（或同一區）都用 switchRoom 告訴伺服器新位置（不然會被當成瞬移拉回來）
      if (!net.online) return;
      if (z !== campZone) camp.setTents(Array(24).fill(null));
      campZone = z;
      camp.setZone(z);
      place();
      const res = await net.switchRoom('campground', { x: spot.x, z: spot.z, ry: spot.ry, zone: z });
      roomMgr.onSwitched?.(roomMgr.current, res);
    } else {
      shopPanel.close();
      stopBuild();
      forceZone = z;
      pendingPlace = { place, spot };
      roomMgr.switchTo('campground', (id) => {
        place();
        return switchOnServer(id);
      });
    }
    audio.sfx?.('bell');
    hud.toast(t('🗺️ 來到 {z} 區 {n} 號門口', { z: zoneName(z), n }));
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
  actions.onCampMap = () => openCampMap(campZone); // 🗺️ 營地入口的地圖看板
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
      return res.reason === 'tooFast' ? t('慢慢來，15 秒後再留言 🙂') : res.reason === 'muted' ? t('🔇 你暫時不能說話') : t('沒留成，再試一次吧');
    },
    onDelNote: async (at) => {
      const res = await net.request('homeNoteDel', { at });
      if (res?.ok) hud.toast(t('🗑️ 刪掉了'));
      return !!res?.ok;
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
  /** 🛠️ 布置面板靠右邊（電腦、手機橫放）：畫面中心往左移半個面板，帳篷不會被擋（作者 11/14） */
  const buildDocked = () => document.body.classList.contains('building') && innerWidth > innerHeight && innerWidth >= 700;
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    if (buildDocked()) {
      const panel = Math.min(360, Math.round(w * 0.36));
      camera.setViewOffset(w, h, Math.round(panel / 2), 0, w, h);
    } else if (document.body.classList.contains('building')) camera.setViewOffset(w, h, 0, Math.round(h * 0.13), w, h); // 手機直放：面板在下面 → 畫面往上挪
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    campfire.setPixelScale(h * renderer.getPixelRatio(), camera.fov);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /** 要送給伺服器的狀態 */
  let dozing = false; // 😴 掛機打瞌睡中（坐著、釣魚、看星星這些不能裹毯子的時候）
  function netState(actionState) {
    return {
      ...player.getNetworkState(),
      actionState: actionState ?? ((actions.state === 'fish' && fishing.netAction) || player.actionState), // 拉竿、舉魚
      doneness: actions.state === 'roast' ? actions.doneness : actions.state === 'eat' ? actions.eatDone : actions.state === 'sofa' && actions.seat?.treeSwing ? (actions.seat.treeSwing.userData.level || 1) / 2 : 0, // 🪢 樹屋鞦韆：盪的段數（別人看到一樣的力道） // 吃棉花糖：讓別人看到烤得怎樣的反應
      // 舉起來的魚（魚種＋公分）：釣魚中舉著、或舉著到處走；不然就是頭上頂著石頭
      extra: fishing.netExtra || (trophy ? packFish(trophy.index, trophy.size, trophy.shiny) : 0) || (forest.carrying ? STONE_FLAG : 0),
      zz: dozing, // 😴 坐著、釣魚、看星星時掛機打瞌睡
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
      ...(payOn ? [['🎫', t('有月票：每天第一次進來多 20～40 顆')]] : []),
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
    payOn: () => payOn, // 🎫 月票開通後，手冊、常見問題才說明月票
    go: {
      news: () => updNews.show(),
      quest: () => document.getElementById('quest-chip')?.click(),
      pass: () => openPass('pass'),
      spirit: () => openSpirit(),
      chat: () => social.openChat?.(),
      shop: () => shopPanel.open(),
      home: () => goHome(),
      move: () => openMoveMap(myHome?.plot?.z ?? 0),
      install: () => openInstall(),
      pine: () => openPineHelp(),
      bag: () => openBag('dish'),
      look: () => hud.onLook?.(),
      friends: () => document.getElementById('friend-btn')?.click(),
      camp: () => hud.onGo(`camp:${myHome?.plot?.z ?? 0}`),
      hen: () => goHens(),
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
    if (id === 'map') return openCampMap(); // 🗺️ 營地地圖
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
  const buyItem = async (id, c = 0, quiet = false) => {
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
      else if (!quiet) hud.toast(t('{icon} 買了{name}，回帳篷按「🛠️ 布置」擺出來', { icon: FURNITURE_BY_ID[id]?.icon ?? '', name: FURNITURE_BY_ID[id]?.name ?? '' }));
      return true;
    }
    const why = { later: t('🗓️ 11/20 才開賣喔'), poor: t('松果不夠喔 🌰'), owned: t('你已經有帳篷了'), noTent: t('先買帳篷，才能放家具 ⛺'), tooMany: t('這個已經買很多了'), tooFast: t('慢慢來 🙂'), maxed: t('已經是最大的帳篷了 🎉'), needPass: t('🎫 這是月票限定，有月票才能買'), off: t('🎫 月票商品還沒開放喔'), soon: t('🎄 11/27 才開賣喔'), season: t('🎄 聖誕家具只在 11/27～1/15 賣喔') };
    hud.toast(why[res?.reason] ?? t('沒買成，再試一次吧'));
    return false;
  };
  // ---------- 🛒 買東西前先確認（點商品是預覽，按「確定購買」才買） ----------
  const confirmBuy = new ConfirmBuy();
  const snapCache = new Map();
  /** 幫一個 3D 物件拍張照（奶油色背景），存成圖片給確認視窗用 */
  /** 第一張圖 → 全部的圖（會動的家具）；畫面上的 <img> 用到第一張，就每 0.3 秒換下一張 */
  const snapAnim = new Map();
  setInterval(() => {
    if (!snapAnim.size) return;
    for (const img of document.querySelectorAll('img[src^="data:image"]')) {
      // 圖換掉了（例如確認視窗換了顏色）就重新找這張圖的那組，不然會跑回原本的顏色（作者 11/22）
      const src = img.getAttribute('src');
      if (img._fr === undefined || (img._fr ? !img._fr.includes(src) : img._src0 !== src)) {
        img._fr = snapAnim.get(src) ?? null;
        img._src0 = src;
        img._fi = 0;
      }
      if (!img._fr || !img.offsetParent) continue;
      img._fi = ((img._fi ?? 0) + 1) % img._fr.length;
      img.src = img._fr[img._fi];
    }
  }, 300);
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
      obj.userData.tick?.(0.05, 0);
      r.render(sc, cam);
      url = r.domElement.toDataURL('image/png');
      // 🎄 會動的家具（燈會閃、火會燒、雪會飄）：多畫幾張，預覽圖輪流換（作者 11/16：購買的預覽圖都要會閃）
      if (obj.userData.tick) {
        const frames = [url];
        for (let i = 1; i < 8; i++) {
          obj.userData.tick(0.3, i * 0.3);
          r.render(sc, cam);
          frames.push(r.domElement.toDataURL('image/png'));
        }
        snapAnim.set(url, frames);
      }
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
  /** 📅 每天都有點不一樣（作者 11/16）：今天哪種魚好釣、哪種採集物多、週六異色魚日 */
  function todayText() {
    const sp = todaySpecial();
    const g = GATHER_ITEMS.find((x) => x.id === sp.gather);
    return { sp, fish: t('🐟 今天{name}比較好釣', { name: FISH[sp.fish].name }), gather: t('{icon} 今天森林裡{name}特別多', { icon: g.icon, name: t(g.zh) }), shiny: sp.shiny ? t('✨ 週六：異色魚比較容易出現') : '' };
  }
  function todayRow() {
    const x = todayText();
    return `<div class="lc-row lc-wide"><span class="ic">📅</span><div><b>${t('今日限定')}</b><small>${x.fish}・${x.gather}${x.shiny ? `<br>${x.shiny}` : ''}</small></div></div>`;
  }
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
    if (today) rows.push(`<div class="lc-row" data-prev="outfit:${today.id}"><span class="ic">${today.icon}</span><div><b>${t('今天的每日造型：{name}', { name: t(today.zh) })} 🔍</b><small>${outfit?.dailyGot ? t('✅ 已經拿到了') : t('做完「📒 任務」每日 3 題，或朋友點你的連結就拿到')}</small></div></div>`);
    const xm = daily.xmas;
    if (xm) {
      const go = xm.got ? OUTFIT_BY_ID[xm.got] : null;
      const nx = xm.next ? OUTFIT_BY_ID[xm.next] : null;
      if (go) rows.push(`<div class="lc-row lc-gift"><span class="ic">${go.icon}</span><div><b>${t('🎄 連續上線 3 天！送你聖誕造型：{name}', { name: t(go.zh) })}</b><small>${t('到「🎒 背包 → 👒 造型」穿上')}</small></div></div>`);
      else if (nx) rows.push(`<div class="lc-row"><span class="ic lc-sil">${nx.icon}</span><div><b>${t('🎄 連續上線 {n}／{need} 天', { n: xm.n, need: xm.need })}</b><small>${t('連續滿 3 天送一款聖誕造型（斷一天要重算）')}</small></div></div>`);
    }
    if (!todaySpecial().off) rows.push(todayRow()); // 📅 11/20 起
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
  /**
   * 👫 邀朋友提醒（作者 11/14：邀請連結來的人最會回來 → 放顯眼一點）
   * 每種提醒一天最多一次；按「👫 邀朋友」打開「🔥 約朋友」那頁
   */
  function inviteNudge(kind, text) {
    if (!net.online) return;
    try {
      const d = new Date().toDateString();
      const key = `cozy-invite-nudge-${kind}`;
      if (localStorage.getItem(key) === d) return;
      localStorage.setItem(key, d);
    } catch {
      return;
    }
    sharePop(text, null, () => giftPanel.open(), t('👫 邀朋友'), 12000);
  }
  // 一個人坐在營火旁 90 秒：「邀朋友來，每位 +10 🌰」
  let aloneSec = 0;
  setInterval(() => {
    const alone = roomMgr?.current.id === 'forest_main' && !!actions.seat?.fire && actions.state !== 'free' && remotes.count === 0 && stage >= 2;
    aloneSec = alone ? aloneSec + 5 : 0;
    if (aloneSec >= 90) {
      aloneSec = -1e9; // 這次進來就不再算
      inviteNudge('alone', t('🔥 一個人烤火有點安靜，邀朋友來一起坐？新朋友來了你和他都 +10 🌰'));
    }
  }, 5000);

  function sharePop(text, card, onGo, goLabel = t('✏️ 取名字'), ms = 8000) {
    // 取名提醒（onGo）不算在每天 3 次裡
    if (!onGo) try {
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
    el.innerHTML = `<span class="sp-t">${text}</span><button type="button" class="sp-go">${onGo ? goLabel : t('📸 分享')}</button><button type="button" class="sp-x">✕</button>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('.sp-go').addEventListener('click', () => {
      el.remove();
      if (onGo) return onGo();
      shareCard.open(card);
    });
    el.querySelector('.sp-x').addEventListener('click', () => el.remove());
    document.body.appendChild(el);
    setTimeout(() => el.isConnected && el.remove(), ms);
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
    const cv = c ? ALL_COLORS[c] : null;
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
  // 🎨 作者 11/22：顏色在確認視窗裡選；固定顏色的家具不出現顏色按鈕。回傳 false＝不買、數字＝選的顏色
  const colorChoices = (id) => {
    const f = FURNITURE_BY_ID[id];
    if (!f || !tintable(f)) return null;
    const rank = passState?.active ? (PASS_TIERS[passState.tier] ?? PASS).rank : 0;
    return ALL_COLORS.filter((c) => !c.pass || payOn).map((c) => ({ id: c.id, label: `${c.pass && rank < c.pass ? '🔒 ' : ''}${c.icon} ${t(c.zh)}`, locked: !!(c.pass && rank < c.pass) }));
  };
  shopPanel.onConfirm = async (id) => {
    const colors = colorChoices(id);
    const ok = await confirmBuy.ask({ ...shopItemInfo(id, 0), coins: net.online || demo ? pinecones : null, colors, look: (c) => shopItemInfo(id, c), fixed: !!FURNITURE_BY_ID[id] && !colors });
    return ok ? (colors ? confirmBuy.color : 0) : false;
  };
  actions.onShop = () => shopPanel.open();
  { // 🌱 新手小任務「去小舖看帳篷」：不管從哪裡打開小舖都算
    const open = shopPanel.open.bind(shopPanel);
    shopPanel.open = (tab) => {
      open(tab);
      ritual?.event('shop');
    };
  }
  shopPanel.passStar = () => !!(passState?.active && passState?.tier === 'star'); // 🌌 星空門牌
  // ✨ 小精靈分類：🥚 孵蛋器
  shopPanel.spirit = () => spiritSt;
  shopPanel.onSpirit = () => openSpirit();
  // 🎀 小舖「✨ 小精靈」分頁裡買／戴小精靈造型（11/16）
  shopPanel.onSpiritAcc = (id, own) => spiritAccTap(id, own);
  shopPanel.onEgg = async () => {
    const x = spiritSt;
    if (!x || !confirm(x.none ? t('花 {n} 🌰 買小精靈蛋（附孵蛋器）？買了馬上孵出來', { n: x.eggPrice }) : t('花 {n} 🌰 買一個孵蛋器？10 分鐘後孵出一顆新的小光點', { n: x.eggPrice }))) return;
    const r = await net.request('spiritEgg', {});
    if (!r?.ok) return hud.toast(r?.reason === 'poor' ? t('松果不夠，需要 {n} 🌰', { n: x.eggPrice }) : r?.reason === 'egg' ? t('已經有一顆蛋在孵了') : r?.reason === 'max' ? t('已經養滿了') : t('沒買成功，再試一次'));
    applySpirit(r.sp);
    audio.sfx('bell');
    if (r.first) {
      // 第一顆：馬上孵出來，從蛋的位置飛到肩膀旁
      const m = player.mesh.position;
      mySpirit.rushFrom(m.x + 1.2, m.z + 1.2);
      mySpirit.react('wow', 2.5, { hop: true, spin: true });
      return hud.toast(t('✨ 孵出來了！一顆小光點跟著你了，點上方「✨ 小精靈」看看它'), 7000);
    }
    hud.toast(t('🥚 放好蛋了！10 分鐘後就會孵出來'), 5000);
  };
  shopPanel.passOn = () => payOn; // 🎫 月票開通了才有「月票」分頁
  shopPanel.passRank = () => (passState?.active ? (PASS_TIERS[passState.tier] ?? PASS).rank : 0);
  // 🎁 星空月票每月免費挑 1 件月票家具
  shopPanel.passFree = () => (passState?.active && passState.tier === 'star' ? { star: true, ok: !!passState.freeOk, next: passState.freeNext ? fmtDate(passState.freeNext) : '' } : null);
  shopPanel.onFree = async (id) => {
    const f = FURNITURE_BY_ID[id];
    const colors = colorChoices(id);
    if (!(await confirmBuy.ask({ ...shopItemInfo(id, 0), price: 0, title: t('🎁 用這個月的免費名額拿這件嗎？'), desc: t('30 天後可以再挑一件'), yes: t('🎁 免費拿'), colors, look: (cc) => shopItemInfo(id, cc), fixed: !colors }))) return;
    const c = colors ? confirmBuy.color : 0;
    const res = await net.request('passFree', { id, c });
    if (!res?.ok) return hud.toast(res?.reason === 'used' ? t('這個月的免費家具已經拿過了') : res?.reason === 'noTent' ? t('先買帳篷，才能放家具 ⛺') : t('現在不能拿，等一下再試'));
    if (res.home) setMyHome(res.home);
    if (res.pass) setPass(res.pass);
    audio.sfx('bell');
    hud.toast(t('🎁 拿到「{icon} {name}」了！回帳篷按「🛠️ 布置」擺出來', { icon: f?.icon ?? '', name: f?.name ?? '' }), 5000);
  };
  // 🎫 月票本月造型、限定家具（作者 11/20：12/1 起贊助禮盒併進月票）
  shopPanel.outfitOf = (id) => OUTFIT_BY_ID[id];
  shopPanel.onPassTab = async () => {
    const preview = new URLSearchParams(location.search).get('xmas') === '1' ? '2026-12' : undefined;
    const r = await net.request('passMonthInfo', { preview });
    shopPanel.passMonth = r;
    if (shopPanel.tab === 'pass') shopPanel.refresh();
  };
  shopPanel.onPassMonth = async (id, kind) => {
    const o = kind === 'look' ? OUTFIT_BY_ID[id] : FURNITURE_BY_ID[id];
    const x = [...(shopPanel.passMonth?.looks ?? []), ...(shopPanel.passMonth?.furn ?? [])].find((y) => y.id === id);
    if (!o || !x) return;
    let img = '';
    try {
      if (kind === 'look') {
        const sp = profile?.species ?? 0;
        const lk = { fur: profile?.fur ?? 0, species: sp, tail: profile?.tail || SPECIES_TAIL[sp], ears: profile?.ear || SPECIES_EARS[sp] };
        img = snapshot(`wear:${id}:${sp}:${lk.fur}:${lk.tail}:${lk.ears}`, () => {
          const ch = new ProceduralFox(lk);
          ch.setOutfit({ [o.slot]: id });
          ch.root.rotation.y = o.slot === 'clip' ? -0.6 : 0.45; // 📎 髮夾在右邊：轉過來看得到
          const g = new THREE.Group();
          g.add(ch.root);
          return g;
        });
      } else img = snapshot(`${id}|0`, () => buildFurniture(id, {}));
    } catch {
      /* 畫不出來就只顯示圖示 */
    }
    if (!(await confirmBuy.ask({ icon: o.icon, name: kind === 'look' ? t(o.zh) : o.name, price: x.price, img, desc: t('🎫 月票限定・只賣這個月'), coins: pinecones }))) return;
    const r = await net.request('passMonthBuy', { id });
    if (r?.ok) {
      audio.sfx('bell');
      if (r.outfits) look.outfits = r.outfits;
      if (r.home) setMyHome(r.home);
      hud.toast(kind === 'look' ? t('💇 買到「{icon} {name}」了！到「🎒 背包 → 👒 造型」戴上', { icon: o.icon, name: t(o.zh) }) : t('🎁 買到「{icon} {name}」了！回帳篷按「🛠️ 布置」擺出來', { icon: o.icon, name: o.name }), 5000);
    } else hud.toast(r?.reason === 'poor' ? t('松果不夠喔') : r?.reason === 'needPass' ? t('🎫 這是月票限定，有月票才能買') : r?.reason === 'noTent' ? t('⛺ 先有帳篷，才能買家具') : r?.reason === 'notNow' ? t('這個月沒有賣這個喔') : t('現在買不了，等一下再試'));
    await shopPanel.onPassTab();
  };
  // 🎣 小舖「釣具」：特殊魚飼料（作者 11/20：在小舖買，不另外放攤子；11/27 開）
  shopPanel.fishOn = () => isOpen({ from: BOAT_FROM });
  shopPanel.baitPrice = FEED_PRICE;
  shopPanel.onFishTab = async () => {
    const r = await net.request('boatInfo', {});
    shopPanel.baitLeft = r?.feedLeft ?? 0;
    baitUntil = Date.now() + shopPanel.baitLeft;
    baitBag = r?.bait ?? baitBag;
    shopPanel.baitBag = baitBag;
    if (shopPanel.tab === 'fish') shopPanel.refresh();
  };
  shopPanel.onBait = async () => {
    if (await buyBait()) shopPanel.refresh?.();
  };
  shopPanel.onNeedPass = () => {
    hud.toast(t('🎫 這是月票限定，有月票才能買'));
    openPass();
  };

  // ---------- 👫 好友、💌 密頻、✉️ 聯絡作者 ----------
  let friendView = null; // 'list' | { hid } | 'support'（收到新訊息時重畫用）
  const fmtTime = (at) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at));
  const setFriendBadge = (b) => social.setBadge((b?.dm ?? 0) + (b?.req ?? 0) + (b?.sup ?? 0));
  net.on('socialBadge', setFriendBadge);
  // 👫 11/09 玩家建議：邀請、分享、營火之約成功後，問要不要加對方好友（兩邊都按就直接成為好友）
  // 👥 同一個人在別的視窗（或別的裝置）打開了營地：這個視窗先暫停，避免同一個人出現兩隻
  net.on('dupLogin', () => hud.toast(t('👥 你在別的視窗打開了營地，這裡先暫停。要回來玩就重新整理這一頁'), 15000));
  net.on('friendSuggest', ({ name, hid, role } = {}) => {
    if (!hid) return;
    const text = role === 'ref' ? t('🎉 <b>{name}</b> 來營地了！加好友？', { name: escapeHtml(name ?? '') }) : t('👋 <b>{name}</b> 邀你來的，加好友？', { name: escapeHtml(name ?? '') });
    setTimeout(() => sharePop(text, null, () => addFriend({ hid }), t('＋ 加好友'), 20000), 3000);
  });
  const friendErr = (r) =>
    ({ notFound: t('找不到這個玩家編號'), self: t('這是你自己喔'), already: t('你們已經是好友了'), full: t('好友已經滿 100 位了'), tooFast: t('慢慢來 🙂'), notFriend: t('要互相加好友才能密頻'), short: t('多寫幾個字吧'), tooMany: t('今天已經寄很多封了，作者看到會回你'), offline: t('還沒連上伺服器'), muted: t('🔇 你暫時不能說話') })[r?.reason] ?? t('沒有成功，再試一次');
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
      .map((f) => `<button type="button" class="fr-chip${f.unread ? ' has-new' : ''}" data-chat="${f.hid}"><b><i class="fr-dot${f.online ? ' on' : ''}"></i>${escapeHtml(f.name)}</b>${f.plot ? `<small>🏕️ ${plotName(f.plot)}</small>` : ''}${!f.online && f.away >= 1 ? `<small class="fr-away${f.away >= 7 ? ' long' : ''}">${f.away >= 30 ? t('💤 很久沒來了') : t('💤 {n} 天沒來', { n: f.away })}</small>` : ''}${f.unread ? `<i class="fr-new">${f.unread}</i>` : ''}</button>`)
      .join('');
    const fr =
      pending.map((f) => `<div class="craft-row fr-row" data-chat="${f.hid}"><div class="craft-info"><b><i class="fr-dot${f.online ? ' on' : ''}"></i>${escapeHtml(f.name)}${f.plot ? ` <span class="fr-plot">🏕️ ${plotName(f.plot)}</span>` : ''}</b><small>${t('⏳ 等對方同意')}</small></div><span class="fr-go">›</span></div>`).join('') +
      (chips ? `<div class="dex-note fr-sub">${t('點名字打開密頻、看聊天紀錄（最下面可以刪除好友）')}</div><div class="fr-chips">${chips}</div>` : '');
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
  async function openDm(hid, focus = false) {
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
        if (focus) inp?.focus();
        const send = async () => {
          const text = inp.value.trim();
          if (!text) return;
          const res = await net.request('dmSend', { hid, text });
          if (!res?.ok) return hud.toast(friendErr(res));
          inp.value = '';
          openDm(hid, true); // 送出後輸入框繼續可以打字
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
    else if (cat === 'furn')
      for (const [id, n] of Object.entries(myHome?.inv ?? {})) {
        if (!(n > 0)) continue;
        // 🪑 家裡擺了幾個、有配色的幾個：只能送收在背包的原色那些
        const placed = (myHome?.items ?? []).filter((x) => x.i === id).length;
        const colored = Object.entries(myHome?.cinv ?? {}).reduce((a, [k, v]) => (k.startsWith(`${id}~`) ? a + v : a), 0);
        const spare = Math.max(0, n - colored - (myHome?.items ?? []).filter((x) => x.i === id && !x.c).length);
        own.push({ id, n, placed, colored, spare });
      }
    else for (const [id, n] of Object.entries(basket ?? {})) n > 0 && basketCat(id) === cat && own.push({ id, n });
    const rows = own
      .map((o) => ({ ...o, g: giftInfo(cat, o.id) }))
      .filter((o) => o.g)
      .sort((a, b) => a.g.value - b.g.value)
      .map((o) => {
        const tooMuch = o.g.value > info.left;
        const furn = o.spare != null;
        const note = furn && (o.placed || o.colored) ? `<small class="gf-placed">${o.placed ? t('🏠 家裡擺了 {n} 個', { n: o.placed }) : ''}${o.placed && o.colored ? '・' : ''}${o.colored ? t('🎨 有配色的 {n} 個不能送', { n: o.colored }) : ''}・${t('可以送 {n} 個', { n: o.spare })}</small>` : '';
        const none = furn && o.spare <= 0;
        return `<div class="craft-row"><i class="dex-emoji">${o.g.icon}</i><div class="craft-info"><b>${t(o.g.zh)} ×${o.n}</b><small>${t('價值 {v} 🌰', { v: o.g.value })}</small>${note}</div><button type="button" class="mini-btn" data-give="${o.id}" ${tooMuch || none ? 'disabled' : ''}>${none ? t('都擺在家裡了') : t('送 1 個')}</button></div>`;
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
                  placed: t('這件擺在家裡（或是有配色的），要先收起來才能送'),
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
  net.on('dm', ({ hid, name, t: text, at }) => {
    // 💌 作者 11/18：密頻視窗開著時，對方回話只把新訊息加在最下面，不整個重畫（不然正在打的字會不見）
    const dmList = modal.isOpen && friendView?.hid === hid && document.getElementById('dm-list');
    if (dmList) {
      dmList.querySelector('.dex-note')?.remove();
      const nearBottom = dmList.scrollHeight - dmList.scrollTop - dmList.clientHeight < 60;
      const el = document.createElement('div');
      el.className = 'dm-msg';
      el.innerHTML = `<span>${escapeHtml(text)}</span><small>${fmtTime(at ?? Date.now())}</small>`;
      dmList.appendChild(el);
      if (nearBottom) dmList.scrollTop = dmList.scrollHeight;
      audio.sfx('tap');
      translateChat(text).then((tr) => {
        if (!tr || !el.isConnected) return;
        const em = document.createElement('em');
        em.className = 'dm-tr';
        em.textContent = `🌐 ${tr}`;
        el.querySelector('span').after(em);
        if (nearBottom) dmList.scrollTop = dmList.scrollHeight;
      });
      net.request('dmHistory', { hid }).catch(() => {}); // 標成已讀（好友按鈕的紅點）
      return;
    }
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
    const boxName = box ? `${DISH_BY_ID[box.dish]?.icon ?? ''} ${dishName(DISH_BY_ID[box.dish], t)}` : '';
    if (!mine) {
      const btn = !box ? `<div class="dex-note">${t('冰箱裡空空的')}</div>` : box.took ? `<div class="dex-note">${t('今天已經拿過一份了')}</div>` : `<div class="yard-opts"><button type="button" class="mini-btn" id="fr-take">${t('😋 拿一份{icon} {name}（還有 {n} 份）', { icon: DISH_BY_ID[box.dish]?.icon ?? '', name: dishName(DISH_BY_ID[box.dish], t), n: box.n })}</button></div>`;
      return modal.open(t('🧊 小冰箱'), `<div class="dex-note">${t('主人放進冰箱的料理，來玩的客人每天可以拿一份')}</div>${btn}`, (body) => {
        body.querySelector('#fr-take')?.addEventListener('click', async () => {
          const r = await net.request('picnicTake', { where: 'fridge' });
          modal.close();
          if (r?.ok) {
            dishes = r.dishes;
            audio.sfx('bell');
            hud.toast(t('😋 拿到一份{icon} {name}！到「📖 圖鑑 → 🍲 料理」可以吃', { icon: DISH_BY_ID[r.dish]?.icon ?? '', name: dishName(DISH_BY_ID[r.dish], t) }), 5000);
          } else hud.toast(r?.reason === 'took' ? t('今天已經拿過一份了') : t('冰箱裡的料理被拿完了'));
        });
      });
    }
    const mineDishes = ownedDishes(dishes);
    modal.open(
      t('🧊 我的小冰箱'),
      `<div class="dex-note">${t('放進冰箱的料理，來玩的客人每天可以拿一份（同一種最多 5 份）')}</div>
      <div class="dex-note">${box ? t('冰箱裡有 {n} 份{name}', { n: box.n, name: boxName }) : t('冰箱裡空空的')}</div>
      <div class="yard-opts"><button type="button" class="mini-btn" id="fr-cook">${t('🍲 看我的料理（可以吃）')}</button>${box ? `<button type="button" class="mini-btn" id="fr-back">${t('↩️ 把冰箱裡的拿回來')}</button>` : ''}</div>
      ${mineDishes.map((d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${dishName(d, t)} ×${dishes[d.id]}</b></div><button type="button" class="mini-btn" data-put="${d.id}">${t('放一份')}</button></div>`).join('')}`,
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
  // ---------- 🍽️ 餐桌請客（11/14）：主人擺料理、客人坐下吃一份（每人每天一份） ----------
  function openDine(cell, mine, seated) {
    const h = homeRoom.home;
    const list = h?.dine?.[`${cell.x},${cell.z}`] ?? [];
    const tb = stackAt(h?.items, cell.x, cell.z).map((it) => CATALOG_BY_ID[it.i]).find((f) => f?.dine);
    if (!tb) return;
    const plates = list.map((d) => `<span class="dine-plate">${DISH_BY_ID[d]?.icon ?? '🍲'}<small>${dishName(DISH_BY_ID[d], t)}</small></span>`).join('') + '<span class="dine-plate empty">🍽️</span>'.repeat(Math.max(0, tb.dine - list.length));
    if (!mine) {
      if (!list.length) return hud.toast(t('餐桌上還沒有料理，下次再來看看 🍽️'));
      if (!seated) return hud.toast(t('🪑 坐到椅子上，按 E 就能吃'));
      return dineEat(cell);
    }
    const mineDishes = ownedDishes(dishes);
    const full = list.length >= tb.dine;
    modal.open(
      t('🍽️ {name}', { name: t(tb.zh) }),
      `<div class="dine-row">${plates}</div>
      <div class="dex-note">${t('擺上去的料理，來玩的朋友坐下就能吃一份（每人每天一份）；朋友吃了你會拿到 1 顆松果')}</div>
      ${list.length ? `<div class="yard-opts"><button type="button" class="mini-btn ghost" id="dine-back">${t('↩️ 全部拿回來')}</button></div>` : ''}
      ${full ? `<div class="dex-note">${t('桌上擺滿了')}</div>` : mineDishes.length ? mineDishes.map((d) => `<div class="craft-row"><i class="dex-emoji">${d.icon}</i><div class="craft-info"><b>${dishName(d, t)} ×${dishes[d.id]}</b></div><button type="button" class="mini-btn" data-dput="${d.id}">${t('擺上桌')}</button></div>`).join('') : `<div class="dex-note">${t('還沒有料理：在家裡的瓦斯爐、灶台或營火旁的料理鍋煮一道吧')}</div>`}`,
      (body) => {
        body.querySelector('#dine-back')?.addEventListener('click', async () => {
          const r = await net.request('dineBack', cell);
          if (r?.ok) {
            dishes = r.dishes;
            setMyHome({ ...r.home });
            audio.sfx('tap');
            openDine(cell, true, seated);
          }
        });
        for (const b of body.querySelectorAll('[data-dput]')) {
          b.addEventListener('click', async () => {
            b.disabled = true;
            const r = await net.request('dinePut', { ...cell, id: b.dataset.dput });
            if (r?.ok) {
              dishes = r.dishes;
              setMyHome({ ...r.home });
              audio.sfx('stone');
              openDine(cell, true, seated);
            } else hud.toast(r?.reason === 'full' ? t('桌上擺滿了') : t('沒擺成，再試一次吧'));
          });
        }
      },
    );
  }
  async function dineEat(cell) {
    const r = await net.request('dineEat', cell);
    if (r?.ok) {
      const d = DISH_BY_ID[r.dish];
      actions.eatDish(d?.color ?? 0xe8a050);
      audio.sfx('bell');
      if (r.buff) setBuff(r.buff);
      return hud.toast(t('😋 吃了一份{icon} {name}，好好吃！', { icon: d?.icon ?? '', name: dishName(d, t) }), 4000);
    }
    hud.toast(r?.reason === 'took' ? t('今天已經在這裡吃過一份了，明天再來 😊') : t('餐桌上沒有料理了'));
  }
  net.on('dineAte', ({ name, dish, gain }) => {
    const d = DISH_BY_ID[dish];
    hud.toast(t('🍽️ {name} 吃了你的{icon} {dish}！', { name, icon: d?.icon ?? '', dish: dishName(d, t) }) + (gain ? ' +1 🌰' : ''), 5000);
  });
  actions.onGadget = async (id, mine, g) => {
    if (id === 'cook') return mine ? fishingUI.openCreel('cook') : hud.toast(t('這是主人的廚房，香香的 🍳'));
    if (id === 'dine') return openDine(g.cell, mine, !!g.seated);
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
    // 🎫 月票新家具（作者 11/22）
    if (id === 'tv' || id === 'starlamp') {
      const on = rooms.home.toggleOn?.(g);
      audio.sfx('tap');
      if (id === 'tv') return hud.toast(on ? t('📺 打開電視了，每 6 秒換一台') : t('📺 關掉電視了'));
      return hud.toast(on ? t('🪩 星空打開了，抬頭看看 ✨') : t('🪩 關掉星空了'));
    }
    if (id === 'coffee') {
      audio.sfx('tap');
      popEmoji('☕');
      return hud.toast(t('☕ 煮了一杯香香的咖啡，暖呼呼的'));
    }
    if (id === 'photo') {
      audio.sfx('tap');
      popEmoji('📸');
      net.emoji?.('📸');
      return hud.toast(t('📸 喀嚓！拍了一張可愛的照片'));
    }
    if (id === 'lamp') {
      const on = rooms.home.toggleLamp?.(g);
      audio.sfx('tap');
      return hud.toast(on === false ? t('💡 關燈了') : t('💡 開燈了'));
    }
    if (id === 'glowtree') {
      const k = rooms.home.cycleGlow?.(g) ?? 0;
      audio.sfx('tap');
      return hud.toast([t('🌳 小樹換成暖暖的黃光'), t('🌳 小樹換成粉紅色的光'), t('🌳 小樹換成藍色的光'), t('🌳 小樹換成綠色的光'), t('🌳 小樹換成彩色的光')][k]);
    }
    if (id === 'xmtree') {
      const k = rooms.home.cycleGlow?.(g) ?? 0;
      audio.sfx('bell');
      return hud.toast([t('🎄 聖誕樹換成暖暖的黃光'), t('🎄 聖誕樹換成粉紅色的光'), t('🎄 聖誕樹換成藍色的光'), t('🎄 聖誕樹換成綠色的光'), t('🎄 聖誕樹換成彩色的光')][k]);
    }
    if (id === 'snowglobe') {
      rooms.home.shakeGlobe?.(g);
      audio.sfx('bell');
      return hud.toast(t('❄️ 搖一搖～水晶球裡下起大雪了'));
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
  actions.onVanity = () => hud.onLook?.(); // 🪞 坐到化妝台前：打開換造型（作者 11/22）
  actions.onBath = () => {
    popEmoji('🫧');
    hud.toast(t('🛁 泡個熱水澡，好舒服～ 移動就起來'));
  };

  /** 布置時選到的格子＋第幾層 */
  let furnSel = null;
  const buildPanel = new BuildPanel({
    getHome: () => homeRoom.home,
    onShop: () => shopPanel.open('furn'), // 🛒 布置時直接買家具，買完回背包就能擺
    onEdit: async (op, data) => {
      const res = await homeReq('homeEdit', { op, ...data });
      if (res?.ok) {
        setMyHome({ ...res.home });
        audio.sfx(op === 'remove' || op === 'clearAll' ? 'tap' : 'stone');
        if (op === 'clearAll') hud.toast(t('📦 全部收回背包了，可以重新擺囉'));
        // 選取框跟著：搬過去就框新的那格，轉向框同一層，收起後框剩下的
        if (op === 'clearAll') furnSel = null;
        else if (op === 'move') furnSel = { x: data.tx, z: data.tz, layer: 0 };
        else if (op === 'remove' && furnSel) furnSel.layer = 0;
        else if (op === 'place') furnSel = { x: data.x, z: data.z, layer: stackAt(res.home.items, data.x, data.z).length - 1 };
        if (furnSel) homeRoom.select(furnSel, furnSel.layer);
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
    onResize(); // 面板靠右：畫面往左挪
    // 布置時鏡頭拉高往下看，整個帳篷一目了然
    buildCam = { pitch: cameraRig.target.pitch, distance: cameraRig.target.distance };
    cameraRig.target.pitch = 1.05;
    cameraRig.target.distance = buildDistance();
  };
  const stopBuild = () => {
    document.body.classList.remove('building');
    onResize();
    if (buildCam) {
      cameraRig.target.pitch = buildCam.pitch;
      cameraRig.target.distance = buildCam.distance;
      buildCam = null;
    }
    homeRoom.setBuild(false);
    furnSel = null;
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
  // ✋ 布置模式（作者 11/14：像線上遊戲）：點住家具直接拖到別格，放開就放好；點一下＝選這格（轉向、收起）；在空地上拖＝轉鏡頭
  buildPanel.freeCell = () => homeRoom.freeCell();
  buildPanel.onFull = () => hud.toast(t('帳篷裡沒有空格了，收起一些或擴建吧'));
  buildPanel.onPlaced = (cell) => (cell ? selectFurn(cell, furnSel?.layer ?? 0) : selectFurn(null));
  /** 選到的格子、第幾層（畫面上的外框、小按鈕跟著它） */
  // 🎥 布置時鏡頭跟著點的那一格走（作者 11/15：大帳篷布置邊邊的房間，畫面不會移過去）
  function buildFocus(cell) {
    if (!cell || !buildPanel.active) return;
    const p = homeRoom.cellWorld(cell.x, cell.z);
    const cur = cameraRig.focusTarget ?? player.position;
    if (Math.hypot(p.x - cur.x, p.z - cur.z) < 1.5) return; // 附近的格子不用動，免得畫面一直晃
    cameraRig.focusTarget = new THREE.Vector3(p.x, p.y, p.z);
    cameraRig.focusMix = 1;
  }
  function selectFurn(cell, layer = 0) {
    buildFocus(cell);
    furnSel = cell ? { x: cell.x, z: cell.z, layer } : null;
    homeRoom.select(furnSel, layer);
    // 選到家具：下面的背包留著（可以一直擺），動作用家具頭上的小按鈕；點到空格：下面列出可以放這格的東西
    const has = cell && stackAt(homeRoom.home?.items, cell.x, cell.z).length;
    buildPanel.select(cell && !has ? { x: cell.x, z: cell.z } : null);
    furnPop.querySelector('[data-fop="fish"]').hidden = !(has && CATALOG_BY_ID[stackAt(homeRoom.home.items, cell.x, cell.z)[layer]?.i]?.fish);
    // 作者 11/22：獎盃展示牆按了沒反應 → 上面能放東西的家具（櫃子、桌子、地墊），多一顆「⬆️ 放上去」，下面列出背包裡可以放的
    {
      const st = has ? stackAt(homeRoom.home.items, cell.x, cell.z) : [];
      const inv = homeRoom.home?.inv ?? {};
      const left = (id) => (inv[id] ?? 0) - (homeRoom.home?.items ?? []).filter((it) => it.i === id).length;
      furnPop.querySelector('[data-fop="stack"]').hidden = !(has && Object.keys(inv).some((id) => left(id) > 0 && canAddTo(st, id)));
    }
    furnPop.querySelector('[data-fop="buy"]').hidden = !(has && canRebuy(CATALOG_BY_ID[stackAt(homeRoom.home.items, cell.x, cell.z)[layer]?.i]));
  }
  // 🔘 選到家具：頭上浮一排小按鈕（轉向、移動、收起），跟著家具走
  const furnPop = document.createElement('div');
  furnPop.className = 'furn-pop';
  furnPop.hidden = true;
  furnPop.innerHTML = `<button type="button" data-fop="rotate">🔄<small>${t('轉向')}</small></button><button type="button" data-fop="move">✋<small>${t('移動')}</small></button><button type="button" data-fop="remove">📦<small>${t('收起')}</small></button><button type="button" data-fop="fish" hidden>🐠<small>${t('放魚')}</small></button><button type="button" data-fop="stack" hidden>⬆️<small>${t('放上去')}</small></button><button type="button" data-fop="buy" hidden>🛒<small>${t('再買')}</small></button><button type="button" data-fop="close" class="fp-x">✕</button>`;
  document.getElementById('ui').appendChild(furnPop);
  furnPop.addEventListener('pointerdown', (e) => e.stopPropagation());
  furnPop.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fop]');
    if (!b || !furnSel || buildPanel.busy) return;
    const op = b.dataset.fop;
    if (op === 'close') return selectFurn(null);
    if (op === 'move') return hud.toast(t('✋ 按住家具直接拖到想放的地方'), 2500);
    if (op === 'buy') return rebuyFurn(stackAt(homeRoom.home?.items, furnSel.x, furnSel.z)[furnSel.layer]);
    if (op === 'stack') {
      buildPanel.cell = { x: furnSel.x, z: furnSel.z };
      buildPanel.fishPick = null;
      return buildPanel.render();
    }
    if (op === 'fish') {
      // 🐠 魚缸：下面換成選魚
      buildPanel.cell = { x: furnSel.x, z: furnSel.z };
      buildPanel.fishPick = furnSel.layer;
      return buildPanel.render();
    }
    buildPanel.busy = true;
    await buildPanel.onEdit?.(op, { x: furnSel.x, z: furnSel.z, l: furnSel.layer });
    buildPanel.busy = false;
    if (op === 'remove') selectFurn(furnSel && stackAt(homeRoom.home?.items, furnSel.x, furnSel.z).length ? furnSel : null, 0);
    else buildPanel.render();
  });
  // 🛒 選到的家具直接「再買一個」（作者 11/15：不用跑去小舖）；同樣顏色，買了放進背包
  const canRebuy = (f) => !!f && !f.gift && !f.craft && !f.box && (f.price ?? 0) > 0;
  async function rebuyFurn(it) {
    const f = CATALOG_BY_ID[it?.i];
    if (!canRebuy(f)) return;
    const c = it.c ?? 0;
    const ok = await confirmBuy.ask({ icon: f.icon, name: t(f.zh), price: f.price, desc: t('同樣的顏色，買了會放進背包'), coins: pinecones });
    if (!ok) return;
    buildPanel.busy = true;
    const res = await buyItem(f.id, c, true);
    buildPanel.busy = false;
    buildPanel.render();
    if (res) hud.toast(t('🛒 又買了一個 {icon} {name}，在背包裡（點一下就擺出來）', { icon: f.icon, name: t(f.zh) }), 3500);
  }
  const _popV = new THREE.Vector3();
  function placeFurnPop() {
    const top = buildPanel.active && inHome() && furnSel && !homeRoom.dragging ? homeRoom.selTop : null;
    if (!top) {
      furnPop.hidden = true;
      return;
    }
    _popV.copy(top).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    const x = r.left + ((_popV.x + 1) / 2) * r.width;
    const y = r.top + ((1 - _popV.y) / 2) * r.height;
    furnPop.hidden = _popV.z > 1;
    furnPop.style.left = `${Math.round(Math.min(r.right - 110, Math.max(r.left + 110, x)))}px`;
    furnPop.style.top = `${Math.round(Math.max(70, y - 14))}px`;
  }
  {
    const dom = renderer.domElement;
    let down = null;
    dom.addEventListener(
      'pointerdown',
      (e) => {
        down = null;
        if (!buildPanel.active || !inHome() || buildPanel.busy) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const cell = homeRoom.cellAtScreen(e.clientX, e.clientY, camera, dom);
        down = { x: e.clientX, y: e.clientY, id: e.pointerId, cell, dragging: false };
        if (cell?.hit && !buildPanel.moving) {
          // 點到家具：這次不轉鏡頭（攔下來，鏡頭收不到這個 pointerdown）
          e.stopImmediatePropagation();
          dom.setPointerCapture?.(e.pointerId);
        }
      },
      { capture: true },
    );
    dom.addEventListener('pointermove', (e) => {
      if (!down?.cell?.hit || e.pointerId !== down.id || buildPanel.moving) return;
      if (!down.dragging) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) return;
        if (!homeRoom.dragStart(down.cell, down.cell.layer)) return;
        down.dragging = true;
        buildPanel.dragHint(true);
      }
      homeRoom.dragTo(homeRoom.cellAtScreen(e.clientX, e.clientY, camera, dom, true));
    });
    dom.addEventListener('pointerup', async (e) => {
      const d = down;
      down = null;
      if (!d || e.pointerId !== d.id) return;
      if (dom.hasPointerCapture?.(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      if (!buildPanel.active || !inHome()) return homeRoom.dragEnd();
      if (d.dragging) {
        const g = homeRoom.dragging;
        const from = { x: d.cell.x, z: d.cell.z };
        if (g?.target && g.ok && (g.target.x !== from.x || g.target.z !== from.z)) {
          const to = { x: g.target.x, z: g.target.z };
          const ok = await buildPanel.dragMove(from, g.l, to);
          homeRoom.dragEnd();
          selectFurn(ok ? to : from, 0);
        } else {
          if (g?.target && !g.ok) hud.toast(t('那一格放不下，換一格試試'));
          homeRoom.dragEnd();
          selectFurn(from, d.cell.layer ?? 0);
        }
        return;
      }
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || !d.cell) return; // 拖曳＝轉鏡頭
      const cell = { x: d.cell.x, z: d.cell.z };
      // 「✋ 移動」按鈕：點的這格就是要搬去的地方
      if (buildPanel.moving) return void buildPanel.moveTo(cell);
      // 點同一件第二次＝取消選取
      if (furnSel && furnSel.x === cell.x && furnSel.z === cell.z && furnSel.layer === (d.cell.layer ?? 0) && d.cell.hit) return selectFurn(null);
      selectFurn(cell, d.cell.layer ?? 0);
    });
    dom.addEventListener('pointercancel', () => {
      if (down?.dragging) {
        homeRoom.dragEnd();
        buildPanel.dragHint(false);
      }
      down = null;
    });
  }
  // 試玩版：模擬整點小活動（?mini=fish / stone / wood / race / hunt）
  const demoMini = demo && ['fish', 'stone', 'wood', 'race', 'hunt'].includes(params.get('mini')) ? params.get('mini') : null;
  if (demoMini) {
    const spots = [...HUNT_SPOTS].sort(() => Math.random() - 0.5).slice(0, HUNT_COUNT).map((p) => ({ ...p, by: null }));
    let race = { next: 0, t0: 0 };
    const demoRoute = makeRaceRoute();
    let best = null;
    localMini = (ev, data) => {
      const pos = player.position;
      if (ev === 'race') {
        if (data.op === 'route') return { ok: true, next: race.next, route: demoRoute };
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
  net.on('homeUpdate', ({ home, owner }) => {
    // 作者 11/22：布置到一半，畫面變成別人家（還在編輯模式）→ 不是現在這個帳篷的更新一律不理
    if (owner && shownHomeOwner && owner !== shownHomeOwner) return;
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
      profile = { ...profile, custom: true, customLook: true, lookAt: Date.now() };
      saveProfile(profile);
      pushLook();
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
        localStorage.setItem('cozy-adopt-look', '1'); // 重新進來時用帳號裡的名字和外型（不要被這台原本的隨機名字蓋掉）
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
  // 超過 3 分鐘沒操作（或分頁切到背景），角色睡著、頭上冒 Zzz；一動就醒來。
  //   站著（free）：裹上毯子打盹
  //   坐著、釣魚、看星星、烤火⋯：維持原本的動作，頭垂下來打瞌睡（作者 11/13：有的人掛機會睡、有的不會）
  //   手機切到背景、鎖螢幕：馬上睡（手機切出去後瀏覽器很快就停了，等 1 分鐘會來不及送出去）
  //   電腦切分頁：1 分鐘後才睡（常常只是切去查個東西）
  // 用 setInterval 檢查：分頁在背景時畫面不會更新，但計時器還會跑，別人才看得到他睡著了。
  const AFK_SLEEP = Number(params.get('afk')) || 180;
  const HIDDEN_SLEEP = 60;
  const isTouch = () => document.body.classList.contains('touch') || matchMedia('(pointer: coarse)').matches;
  let autoSleep = false;
  let hiddenSince = 0;
  const setDoze = (on) => {
    dozing = on;
    if (player.character) player.character.doze = on;
    net.update(1, netState()); // 馬上告訴大家（背景時畫面迴圈不會跑）
  };
  const fallAsleep = () => {
    if (autoSleep || dozing || roomMgr?.busy) return;
    if (actions.state === 'free') {
      forest.dropStone(player.character);
      actions.start('blanket');
      autoSleep = true;
      net.update(1, netState('blanket')); // 背景分頁不會跑畫面迴圈，直接送一次
    } else if (actions.state !== 'blanket' && actions.state !== 'sleep') {
      setDoze(true);
    }
  };
  document.addEventListener('visibilitychange', () => {
    hiddenSince = document.hidden ? performance.now() : 0;
    // 🎣 拉竿到一半切出去（鎖螢幕、回 LINE）：畫面會暫停，先告訴大家「坐回去釣魚了」（舉魚炫耀的話就繼續舉著）
    if (document.hidden && joined && actions.state === 'fish' && fishing.netAction === 'reel') net.update(1, netState('fish'));
    if (document.hidden && joined && !editing && isTouch()) fallAsleep();
  });
  setInterval(() => {
    if (!joined || editing) return;
    const idle = input.idleSeconds;
    const hiddenFor = hiddenSince ? (performance.now() - hiddenSince) / 1000 : 0;
    const awake = idle < 2 && !document.hidden; // 有操作（滑鼠、觸控、按鍵）
    if (dozing) {
      // 起身、換動作（例如釣到魚）或有操作：醒來
      if (awake || actions.state === 'free' || actions.state === 'blanket' || actions.state === 'sleep') setDoze(false);
      return;
    }
    if (!autoSleep) {
      if (idle > AFK_SLEEP || hiddenFor > HIDDEN_SLEEP) fallAsleep();
    } else if (actions.state !== 'blanket') {
      autoSleep = false; // 自己起身了（移動或按 Z）
    } else if (awake) {
      actions.stop();
      autoSleep = false;
    }
  }, 2000);
  // 打瞌睡時頭上也冒 Zzz（自己看得到）
  let dozeZzz = 0;
  const updateDozeZzz = (dt) => {
    if (player.character) player.character.doze = dozing; // 換造型後角色是新的，每幀補上
    if (!dozing) return void (dozeZzz = 0.6);
    dozeZzz -= dt;
    if (dozeZzz > 0) return;
    dozeZzz = 1.3 + Math.random() * 0.5;
    zzz.spawn(player.character.getHeadWorldPosition(new THREE.Vector3()));
  };

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

  // ---------- 👉 帶我去（新手第 1、2 步：自己走到營火／圓木，走到圓木就坐下） ----------
  /** @type {null | { kind: 'fire'|'seat', best: number, stuckT: number, sideT: number, side: number, tries: number }} */
  let autoWalk = null;
  const stopAutoWalk = (msg) => {
    autoWalk = null;
    input.autoMove = null;
    if (ritual) ritual.walking = false;
    if (msg) hud.toast(msg, 3500);
  };
  function stepAutoWalk(dt) {
    if (!autoWalk) return;
    const rid = roomMgr.current.id;
    // 🎣 去湖邊：從營火走進湖邊的路口，換到湖畔碼頭後接著走到碼頭盡頭（作者 11/15：第 5 步釣魚也要帶我去）
    if (autoWalk.kind === 'lake' && rid === 'lake_dock') Object.assign(autoWalk, { kind: 'dock', best: Infinity, stuckT: 0, tries: 0 });
    const okRoom = autoWalk.kind === 'dock' ? rid === 'lake_dock' : rid === 'forest_main';
    if (input.userMoving || !okRoom || actions.state !== 'free') return stopAutoWalk();
    const p = player.position;
    const tg = autoWalk.kind === 'seat' ? ritualState.freeSeat() : autoWalk.kind === 'lake' ? ritualState.lakeGate : autoWalk.kind === 'dock' ? ritualState.dockEnd : { x: 0, z: 0 };
    const stopAt = autoWalk.kind === 'seat' ? 0.75 : autoWalk.kind === 'lake' ? 0 : autoWalk.kind === 'dock' ? 0.8 : 2.4;
    let dx = tg.x - p.x;
    let dz = tg.z - p.z;
    const d = Math.hypot(dx, dz);
    // 🔥 去湖邊會經過營火：直線穿過營火和圓木那圈就繞著外圈走（不然會卡在圓木上）
    if (autoWalk.kind === 'lake') {
      const R = 2.7;
      const along = Math.max(0, Math.min(1, -(p.x * dx + p.z * dz) / (d * d || 1)));
      const cx = p.x + dx * along;
      const cz = p.z + dz * along;
      if (Math.hypot(p.x, p.z) > R - 0.3 && Math.hypot(cx, cz) < R) {
        const ap = Math.atan2(p.x, p.z);
        let diff = Math.atan2(tg.x, tg.z) - ap;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const wa = ap + Math.sign(diff) * Math.min(Math.abs(diff), 0.8);
        dx = Math.sin(wa) * (R + 0.6) - p.x;
        dz = Math.cos(wa) * (R + 0.6) - p.z;
      }
    }
    if (d <= stopAt) {
      const kind = autoWalk.kind;
      stopAutoWalk();
      if (kind === 'seat') actions.handleAction('interact'); // 圓木：走到了就幫他坐下
      if (kind === 'dock') actions.handleAction('roast'); // 碼頭盡頭：走到了就幫他甩竿
      return;
    }
    // 卡住（被石頭、木頭擋到）：往旁邊繞一下；繞 4 次還過不去就交給玩家
    if (d < autoWalk.best - 0.05) {
      autoWalk.best = d;
      autoWalk.stuckT = 0;
    } else if ((autoWalk.stuckT += dt) > 0.8) {
      autoWalk.stuckT = 0;
      autoWalk.best = d;
      autoWalk.side = -autoWalk.side;
      autoWalk.sideT = 0.7;
      if (++autoWalk.tries > 4) return stopAutoWalk(mobile ? t('走不過去，用左下角搖桿走走看 🕹️') : t('走不過去，用 WASD 走走看 🕹️'));
    }
    const dd = Math.hypot(dx, dz) || 1;
    let wx = dx / dd;
    let wz = dz / dd;
    if (autoWalk.sideT > 0) {
      autoWalk.sideT -= dt;
      const s2 = autoWalk.side;
      [wx, wz] = [wx * 0.35 - wz * s2, wz * 0.35 + wx * s2];
    }
    // 世界方向 → 搖桿方向（Player.update 的反過來；這個轉換剛好是自己的反矩陣）
    const yaw = cameraRig.yaw;
    const sn = Math.sin(yaw);
    const cs = Math.cos(yaw);
    const mx = wx * cs - wz * sn;
    const my = -wx * sn - wz * cs;
    const len = Math.hypot(mx, my) || 1;
    input.autoMove = { x: mx / len, y: my / len };
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); // 切換分頁回來時避免瞬移
    const elapsed = clock.elapsedTime;
    const room = roomMgr.current;

    stepAutoWalk(dt);
    boatTick(dt);
    riverTick(dt);
    baitTick(dt);
    legendShow.update(dt, roomMgr.current.id);
    placeFurnPop();
    const action = actions.update(dt, input.hasMoveInput);
    player.update(dt, input, cameraRig.yaw, room, elapsed, action);
    // 🍄 蘑菇彈跳：角色跳起來（只是畫面上跳，位置不變）
    if (player.hopT > 0) {
      player.hopT = Math.max(0, player.hopT - dt);
      player.mesh.position.y += Math.sin(Math.min(1, player.hopT / 0.8) * Math.PI) * 0.9;
    }
    spiritGames.update(dt);
    boardUI.update(dt, elapsed);
    if (!actions.seat && !actions.boat) remotes.pushOut(player.position, player.radius); // 坐在圓木上不要被旁邊的人推走
    remotes.update(dt, elapsed, updateSpirits(dt));
    net.update(dt, netState());
    cameraRig.showOff = fishing.showingOff;
    // 坐著釣魚：手機版左上的即時動態、活動時間先收起來，拉竿框、釣到的卡片才不會被擋
    const isFishing = actions.state === 'fish';
    if (isFishing !== wasFishing) {
      wasFishing = isFishing;
      document.body.classList.toggle('fishing', isFishing);
      if (!isFishing) social.resetPeek(); // 💬 釣完魚：聊天紀錄恢復顯示，「💬 N」歸零
    }
    // 舉著魚到處走：又坐下來釣魚、去做別的事（烤棉花糖、撿石頭、裹毯⋯）就收進魚簍
    if (trophy) {
      if (actions.state !== 'free' || forest.carrying) setTrophy(null);
      else if (player.character !== trophyChar) {
        player.character.setHeldFish?.(trophy.index, trophy.size, trophy.shiny);
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

    updateNearFade(camera, compactPortrait());
    updateDozeZzz(dt);
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
      mobile.setInteract(actions.state === 'free' || actions.seat || (actions.state === 'sofa' && actions.dineSeat) ? (roomMgr.current.interactHint?.(actions) ?? null) : null); // 坐在圓木上：互動按鈕變成「起身」
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
  /** 👤 把名字和外型存進帳號（at＝最後改的時間，換裝置時比新舊用） */
  function pushLook() {
    net.request('saveLook', { name: profile.name, fur: profile.fur, species: isProcedural ? profile.species : 0, tail: profile.tail || '', ear: profile.ear || '', at: profile.lookAt ?? 0 });
  }
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
    profile.lookAt = Date.now(); // 👤 改名字／外型的時間：換裝置時「最後改的那台」為準
    saveProfile(profile);
    pushLook();
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
    window.__cozy = { teleportToPlot, legendShow, boardUI, renderer, forest, scene, camera, player, campfire, world, cameraRig, actions, input, hud, net, remotes, rooms, roomMgr, audio, pomodoro, fishing, fishingUI, social, bubbles, shrinePanel, noticePanel, channelPanel, cairnPanel, ritual, treePanel, shareCard, world, shopPanel, buildPanel, homeRoom: rooms.home, goHome, openBag, mySpirit, spiritGames, showDailyCard, sharePop, openMoveMap, openFriends, inviteUrl, _setBag: (d, bk) => ((dishes = d), (basket = bk)) };
  }
}

init().catch((err) => {
  console.error(err);
  window.__bootFail?.(); // 打不開 3D 畫面：在載入畫面上說明
});
