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
import { JoinScreen, autoProfile } from './ui/JoinScreen.js';
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
const PLACE = { forest_main: '營火旁', tent_focus: '帳篷裡', treehouse_music: '樹屋上', lake_dock: '湖畔', tent_social: '交流帳篷裡' };

async function init() {
  translateStatic(); // index.html 裡的固定文字
  // ---------- Renderer ----------
  const container = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
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
  };
  const { world, campfire } = forest;
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

  // ---------- 松果與心願大樹 ----------
  /** 我的松果（null＝還沒連上伺服器） */
  let pinecones = null;
  const setCoins = (n, delta = 0) => {
    pinecones = n;
    hud.setPinecones(n, delta);
    treePanel.refresh();
  };
  const treePanel = new TreePanel({
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
      if (res?.reason === 'poor') hud.toast(t('松果不夠喔，做小任務或釣魚可以撿到更多 🌰'));
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
  const cairnPanel = new CairnPanel({ getCairns: () => cairnData, getName: () => myName });
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
  net.on('stone', ({ i, stone, count, by, today }) => {
    addStone(i, stone);
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
    if (res.today) hud.setToday(res.today);
    if (res.lakeNews) lakeNews.setAll(res.lakeNews);
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
    refreshOnline();
    // 斷線時記下目前位置，重連時從這裡回來
    if (st !== 'online') net.updateJoinData({ x: player.position.x, z: player.position.z, ry: player.rotationY });
  });
  net.on('joined', (res) => {
    // 伺服器判斷是不是贊助者：是的話頭上開一朵小花
    if (res.reward && res.reward !== myReward) {
      hud.toast(res.reward === 2 ? t('🍀 謝謝你的支持！頭上長出了一片四葉草') : t('🌼 謝謝你的支持！頭上開了一朵小黃花'), 5000);
    }
    myReward = res.reward || 0;
    // 松果：每天第一次來會送松果（連續越多天越多）
    if (res.wallet) {
      const w = res.wallet;
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
    hud.toast(t('{name} 來到了{place} 🦊', { name: info.name, place: t(placeName()) }));
    refreshOnline();
  });
  net.on('playerLeft', ({ id }) => {
    if (remotes.remove(id)) hud.toast(t('{name} 離開了 🌙', { name: names.get(id) ?? t('有人') }));
    names.delete(id);
    refreshOnline();
  });
  net.on('states', (batch) => remotes.applyStates(batch, net.id));
  net.on('fire', ({ fuel, by, name }) => {
    if (by === net.id) {
      campfire.fuel = fuel; // 自己丟的：特效已經播過，只校正數值
    } else {
      campfire.addFuel(0); // 播放火星特效與劈啪聲
      campfire.fuel = fuel;
      if (roomMgr?.current === forest) hud.toast(t('{name} 添了一根柴 🔥', { name }));
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
    social.addLog(name, text);
  });
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

  // ---------- 手機版面：左上角的資訊排成一欄，才不會互相重疊 ----------
  if (mobile) {
    const stack = document.createElement('div');
    stack.className = 'm-stack';
    document.getElementById('ui').appendChild(stack);
    for (const id of ['sound-unlock', 'fire-meter', 'online', 'today', 'ritual', 'lake-news']) {
      const el = document.getElementById(id);
      if (el) stack.appendChild(el);
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

  renderer.setAnimationLoop(() => {
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
  hud.onMeClick = async () => {
    if (editing) return;
    editing = true;
    input.enabled = false;
    const next = await new JoinScreen({
      onPreview: applyLook,
      allowSpecies: isProcedural,
      edit: { name: myName, fur: profile.fur, species: profile.species, code: profile.code, custom: profile.custom, customLook: profile.customLook },
    }).show();
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
    ch: Math.floor(Number(profile.ch ?? params.get('ch')) || 0),
    room: roomMgr.current.id,
    x: player.position.x,
    z: player.position.z,
    ry: player.rotationY,
  });

  // 方便在瀏覽器 console 除錯（開發模式或網址加 ?debug）
  if (import.meta.env.DEV || params.has('debug')) {
    window.__cozy = { scene, camera, player, campfire, world, cameraRig, actions, input, hud, net, remotes, rooms, roomMgr, audio, pomodoro, fishing, fishingUI, social, bubbles, shrinePanel, noticePanel, channelPanel, cairnPanel, ritual, treePanel };
  }
}

init();
