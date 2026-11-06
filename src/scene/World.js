import * as THREE from 'three';
import { makeRadialTexture, seededRandom } from './textures.js';

export const FOG_COLOR = 0x0f1a2c;
const PLAY_RADIUS = 18; // 玩家可活動的最大半徑（再外面就是濃霧與密林）

/**
 * 主地圖（forest_main）：草地、夜空、星星、月亮、松樹林、木頭長椅、落葉、地面霧氣、螢火蟲。
 * 回傳 world 物件，提供 colliders 與 resolveCollision() 給角色使用。
 */
/**
 * @param {THREE.Object3D & { fog?: any, background?: any }} scene 要放進去的容器（RoomManager 傳入森林房間的 Group）
 * @param {{ clearings?: { x: number, z: number, r: number }[] }} [options] clearings：不長樹、不放石頭的空地（子房間入口）
 */
export function createWorld(scene, { clearings = [] } = {}) {
  const inClearing = (x, z, pad = 0) => clearings.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + pad) ** 2);
  const rand = seededRandom(20261030);
  const colliders = []; // { x, z, r }
  const updaters = [];

  scene.background = new THREE.Color(FOG_COLOR);
  // Three.js 內建只有距離霧，這裡用 FogExp2 + 下方的「低空霧片」模擬高度霧的效果
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.042);

  // ---------- 燈光 ----------
  const hemi = new THREE.HemisphereLight(0x5a74a8, 0x2a2618, 1.6);
  scene.add(hemi);

  const moonDir = new THREE.Vector3(-0.5, 0.75, -0.45).normalize();
  const moonLight = new THREE.DirectionalLight(0x9db4ff, 0.9);
  moonLight.position.copy(moonDir).multiplyScalar(30);
  scene.add(moonLight);

  // ---------- 天空（跟著相機移動的大球） ----------
  const sky = new THREE.Group();
  scene.add(sky);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x02040b) },
      uMid: { value: new THREE.Color(0x0a1530) },
      uHorizon: { value: new THREE.Color(FOG_COLOR) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      varying vec3 vDir;
      void main() {
        float h = max(vDir.y, 0.0);
        vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
        c = mix(c, uTop, smoothstep(0.25, 1.0, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  sky.add(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyMat));

  // 星星（閃爍）
  const STAR_COUNT = 1800;
  const starPos = new Float32Array(STAR_COUNT * 3);
  const starPhase = new Float32Array(STAR_COUNT);
  const starSize = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = rand() * Math.PI * 2;
    const v = Math.acos(1 - rand() * 0.92); // 只分布在地平線以上
    const r = 140;
    starPos[i * 3] = Math.sin(v) * Math.cos(u) * r;
    starPos[i * 3 + 1] = Math.cos(v) * r;
    starPos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    starPhase[i] = rand();
    starSize[i] = 0.8 + Math.pow(rand(), 3) * 2.6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPR;
      attribute float aPhase;
      attribute float aSize;
      varying float vA;
      void main() {
        vA = 0.55 + 0.45 * sin(uTime * (0.8 + aPhase * 1.6) + aPhase * 6.283);
        vA *= smoothstep(0.0, 0.25, normalize(position).y); // 靠近地平線的星星被霧吃掉
        gl_PointSize = aSize * uPR;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(0.88, 0.92, 1.0, smoothstep(0.5, 0.05, d) * vA);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  sky.add(stars);

  // 月亮
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeRadialTexture([
        [0, 'rgba(255,250,235,1)'],
        [0.18, 'rgba(240,240,225,1)'],
        [0.22, 'rgba(200,215,255,0.35)'],
        [0.5, 'rgba(140,165,230,0.08)'],
        [1, 'rgba(120,150,220,0)'],
      ], 256),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  moon.position.copy(moonDir).multiplyScalar(135);
  moon.scale.setScalar(30);
  sky.add(moon);

  // ---------- 地面（低多邊形、每個三角面一個顏色） ----------
  const groundGeo = new THREE.PlaneGeometry(110, 110, 90, 90).toNonIndexed();
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    const d = Math.hypot(x, z);
    // 用確定性的雜訊讓相同頂點得到相同高度（避免面與面之間裂開）
    const n = Math.sin(x * 0.9 + z * 0.4) * Math.cos(z * 0.8 - x * 0.3);
    let y = n * 0.07 * THREE.MathUtils.smoothstep(d, 2.2, 5);
    y += Math.max(0, d - 30) * 0.12; // 遠處緩坡，自然遮住地平線
    gp.setY(i, y);
  }
  const groundColors = new Float32Array(gp.count * 3);
  const grassA = new THREE.Color(0x2c4a26);
  const grassB = new THREE.Color(0x385a2c);
  const leafy = new THREE.Color(0x5a4524);
  const dirt = new THREE.Color(0x3b2a1c);
  const tmpC = new THREE.Color();
  for (let i = 0; i < gp.count; i += 3) {
    const cx = (gp.getX(i) + gp.getX(i + 1) + gp.getX(i + 2)) / 3;
    const cz = (gp.getZ(i) + gp.getZ(i + 1) + gp.getZ(i + 2)) / 3;
    const d = Math.hypot(cx, cz);
    tmpC.copy(grassA).lerp(grassB, rand());
    const leafNoise = Math.sin(cx * 0.35) * Math.sin(cz * 0.42) + Math.sin((cx + cz) * 0.21);
    if (leafNoise > 0.6) tmpC.lerp(leafy, 0.55 + rand() * 0.3);
    if (d < 3.2) tmpC.lerp(dirt, THREE.MathUtils.smoothstep(3.2 - d, 0, 1.4));
    for (let k = 0; k < 3; k++) tmpC.toArray(groundColors, (i + k) * 3);
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- 落葉（Instanced） ----------
  const LEAF_COUNT = 700;
  const leaves = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.09, 4),
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }),
    LEAF_COUNT,
  );
  const leafColors = [0x9c4a1c, 0xb8752a, 0x7a3418, 0xc79a3a, 0x6b4a22].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < LEAF_COUNT; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.6 + Math.sqrt(rand()) * 24;
    dummy.position.set(Math.sin(a) * r, 0.05, Math.cos(a) * r);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.4, 0, rand() * Math.PI);
    dummy.scale.set(1, 0.55 + rand() * 0.5, 1);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, leafColors[Math.floor(rand() * leafColors.length)]);
  }
  leaves.receiveShadow = true;
  scene.add(leaves);

  // ---------- 松樹林（Instanced：樹幹 + 三層樹冠） ----------
  const treeSpots = [];
  let attempts = 0;
  while (treeSpots.length < 170 && attempts < 4000) {
    attempts++;
    const a = rand() * Math.PI * 2;
    const r = 12 + Math.pow(rand(), 0.8) * 30;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (treeSpots.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 2.4 ** 2)) continue;
    if (inClearing(x, z, 1.2)) continue;
    treeSpots.push({ x, z, s: 0.8 + rand() * 0.7, rot: rand() * Math.PI });
  }

  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.22, 1.6, 6).translate(0, 0.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x3d2a1c, flatShading: true, roughness: 1 }),
    treeSpots.length,
  );
  const tiers = [
    { r: 1.35, h: 1.9, y: 1.3 },
    { r: 1.05, h: 1.6, y: 2.25 },
    { r: 0.7, h: 1.3, y: 3.1 },
  ].map(({ r, h, y }) =>
    new THREE.InstancedMesh(
      new THREE.ConeGeometry(r, h, 7).translate(0, y + h / 2, 0),
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95 }),
      treeSpots.length,
    ),
  );
  const pineA = new THREE.Color(0x1d3b2a);
  const pineB = new THREE.Color(0x2d4f33);
  treeSpots.forEach((t, i) => {
    dummy.position.set(t.x, 0, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.set(t.s, t.s * (0.9 + rand() * 0.3), t.s);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    const col = pineA.clone().lerp(pineB, rand());
    for (const tier of tiers) {
      tier.setMatrixAt(i, dummy.matrix);
      tier.setColorAt(i, col);
    }
    if (Math.hypot(t.x, t.z) < PLAY_RADIUS + 2) colliders.push({ x: t.x, z: t.z, r: 0.25 * t.s + 0.1 });
  });
  for (const m of [trunkMesh, ...tiers]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // 營火旁的座位改成圓木座位（src/rooms/fireSeats.js，按 E 坐下、坐著就能烤棉花糖）

  // ---------- 零星石頭 ----------
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x55544f, flatShading: true, roughness: 1 });
  // 26 顆石頭用 InstancedMesh 一次畫完（以前一顆一個網格，要畫 26 次）
  const rockItems = [];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 5 + rand() * 16;
    const s = 0.12 + rand() * 0.35;
    if (inClearing(Math.sin(a) * r, Math.cos(a) * r, 0.5)) continue;
    const it = { x: Math.sin(a) * r, y: s * 0.35, z: Math.cos(a) * r, s, rx: rand() * 3, ry: rand() * 3, rz: rand() * 3 };
    rockItems.push(it);
    if (s > 0.25) colliders.push({ x: it.x, z: it.z, r: s * 0.9 });
  }
  {
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockMat, Math.max(1, rockItems.length));
    rocks.count = rockItems.length;
    const o = new THREE.Object3D();
    rockItems.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(it.rx, it.ry, it.rz);
      o.scale.set(it.s, it.s * 0.7, it.s);
      o.updateMatrix();
      rocks.setMatrixAt(i, o.matrix);
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    scene.add(rocks);
  }

  // ---------- 地面低空霧片（模擬高度霧） ----------
  const mistTex = makeRadialTexture([
    [0, 'rgba(170,190,225,0.55)'],
    [0.5, 'rgba(150,170,210,0.2)'],
    [1, 'rgba(140,160,200,0)'],
  ]);
  const mists = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.16 }),
    );
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 18;
    m.position.set(Math.sin(a) * r, 0.25 + rand() * 0.5, Math.cos(a) * r);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(10 + rand() * 10);
    m.userData = { a, r, speed: (rand() - 0.5) * 0.02, spin: (rand() - 0.5) * 0.05 };
    mists.push(m);
    scene.add(m);
  }

  // ---------- 螢火蟲 ----------
  const FLY_COUNT = 45;
  const flyBase = [];
  const flyPos = new Float32Array(FLY_COUNT * 3);
  for (let i = 0; i < FLY_COUNT; i++) {
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * 14;
    flyBase.push({ x: Math.sin(a) * r, y: 0.4 + rand() * 2.2, z: Math.cos(a) * r, p: rand() * 10 });
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyAlpha = new Float32Array(FLY_COUNT);
  flyGeo.setAttribute('aAlpha', new THREE.BufferAttribute(flyAlpha, 1));
  const flyMat = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      uniform float uPR;
      varying float vA;
      void main() {
        vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(60.0 / -mv.z, 2.0, 10.0) * uPR;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a * vA, a * vA);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fireflies = new THREE.Points(flyGeo, flyMat);
  fireflies.frustumCulled = false;
  scene.add(fireflies);

  updaters.push((dt, t) => {
    starMat.uniforms.uTime.value = t;
    for (let i = 0; i < FLY_COUNT; i++) {
      const b = flyBase[i];
      flyPos[i * 3] = b.x + Math.sin(t * 0.4 + b.p) * 0.8;
      flyPos[i * 3 + 1] = b.y + Math.sin(t * 0.7 + b.p * 2) * 0.35;
      flyPos[i * 3 + 2] = b.z + Math.cos(t * 0.35 + b.p) * 0.8;
      flyAlpha[i] = Math.max(0, Math.sin(t * 1.3 + b.p * 3)) ** 3;
    }
    flyGeo.attributes.position.needsUpdate = true;
    flyGeo.attributes.aAlpha.needsUpdate = true;

    for (const m of mists) {
      const u = m.userData;
      u.a += u.speed * dt;
      m.position.x = Math.sin(u.a) * u.r;
      m.position.z = Math.cos(u.a) * u.r;
      m.rotation.z += u.spin * dt;
    }
  });


  // ---------- 流星 ----------
  // 每顆流星是一串 Points：頭大而亮、尾巴漸細漸暗
  const TRAIL = 28;
  const METEOR_POOL = 4;
  const meteorMat = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uPR;
      varying float vA;
      void main() {
        vA = aAlpha;
        gl_PointSize = aSize * uPR;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const meteors = [];
  for (let m = 0; m < METEOR_POOL; m++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(TRAIL * 3);
    const size = new Float32Array(TRAIL);
    const alpha = new Float32Array(TRAIL);
    for (let i = 0; i < TRAIL; i++) size[i] = 1 + 5 * Math.pow(1 - i / TRAIL, 2);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    const pts = new THREE.Points(geo, meteorMat);
    pts.frustumCulled = false;
    pts.visible = false;
    sky.add(pts);
    meteors.push({ pts, pos, alpha, life: 0, dur: 1, start: new THREE.Vector3(), dir: new THREE.Vector3(), len: 0 });
  }
  let meteorTimer = 3;
  const api = { meteorMode: 'rare', eventShower: false, onMeteor: null, spawnMeteor: (camera) => spawnMeteor(camera) };

  const camDir = new THREE.Vector3();
  function spawnMeteor(camera) {
    const m = meteors.find((x) => !x.pts.visible);
    if (!m) return;
    // 流星雨時出現在玩家正在看的那片天空
    camera.getWorldDirection(camDir);
    const az =
      (api.meteorMode === 'shower' || api.eventShower)
        ? Math.atan2(camDir.x, camDir.z) + (Math.random() - 0.5) * 1.2
        : Math.random() * Math.PI * 2;
    const el = THREE.MathUtils.degToRad((api.meteorMode === 'shower' || api.eventShower) ? 28 + Math.random() * 22 : 40 + Math.random() * 35);
    m.start.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(120);
    // 方向：大致沿切線往下劃
    const tangent = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
    m.dir.copy(tangent).addScaledVector(new THREE.Vector3(0, -1, 0), 0.45 + Math.random() * 0.3).normalize();
    m.len = 14 + Math.random() * 10;
    m.dur = 0.8 + Math.random() * 0.6;
    m.life = 0;
    m.pts.visible = true;
    api.onMeteor?.();
  }

  updaters.push((dt, t, camera) => {
    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      spawnMeteor(camera);
      meteorTimer = (api.meteorMode === 'shower' || api.eventShower) ? 1.2 + Math.random() * 2.8 : 25 + Math.random() * 40;
    }
    // 切換成流星雨時，縮短等待
    if ((api.meteorMode === 'shower' || api.eventShower) && meteorTimer > 5) meteorTimer = 1.5;

    for (const m of meteors) {
      if (!m.pts.visible) continue;
      m.life += dt;
      const u = m.life / m.dur;
      if (u >= 1) {
        m.pts.visible = false;
        continue;
      }
      const travel = 60 * u; // 頭部位移
      const tail = m.len * Math.min(1, u * 3);
      const fade = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.6) / 0.4);
      for (let i = 0; i < TRAIL; i++) {
        const back = travel - (i / (TRAIL - 1)) * tail;
        m.pos[i * 3] = m.start.x + m.dir.x * back;
        m.pos[i * 3 + 1] = m.start.y + m.dir.y * back;
        m.pos[i * 3 + 2] = m.start.z + m.dir.z * back;
        m.alpha[i] = fade * Math.pow(1 - i / TRAIL, 1.5);
      }
      m.pts.geometry.attributes.position.needsUpdate = true;
      m.pts.geometry.attributes.aAlpha.needsUpdate = true;
    }
  });

  // ---------- 對外介面 ----------
  return Object.assign(api, {
    sky, // 戶外子房間（樹屋、湖畔）共用同一片星空
    colliders,
    occluders: [trunkMesh, ...tiers], // 給相機做遮擋檢測
    playRadius: PLAY_RADIUS,

    /** 每幀更新動態元素；camera 用來讓天空跟隨 */
    update(dt, elapsed, camera) {
      sky.position.copy(camera.position);
      for (const fn of updaters) fn(dt, elapsed, camera);
    },

    setPixelRatio(pr) {
      starMat.uniforms.uPR.value = pr;
      flyMat.uniforms.uPR.value = pr;
      meteorMat.uniforms.uPR.value = pr;
    },

    /** 簡易半徑碰撞：把位置推出所有圓形障礙物，並限制在可活動範圍內 */
    resolveCollision(pos, radius) {
      for (let pass = 0; pass < 2; pass++) {
        for (const c of colliders) {
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const min = c.r + radius;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.0001;
            const push = (min - d) / d;
            pos.x += dx * push;
            pos.z += dz * push;
          }
        }
      }
      const d = Math.hypot(pos.x, pos.z);
      if (d > PLAY_RADIUS) {
        pos.x *= PLAY_RADIUS / d;
        pos.z *= PLAY_RADIUS / d;
      }
    },
  });
}
