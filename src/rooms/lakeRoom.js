import * as THREE from 'three';
import { makeResolver, makeSign, lowpoly, shadowAll } from './shared.js';
import { seededRandom } from '../scene/textures.js';
import { FOG_COLOR } from '../scene/World.js';
import { createFishMesh, fishScale } from '../fishing/fishModel.js';
import { rollFish, rollSize } from '../fishing/fishData.js';
import { t } from '../i18n/i18n.js';

export const LAKE_WATER_Y = -0.35;

const WATER_Y = -0.35;
const DOCK_END = -6.2;
const MOON_DIR = new THREE.Vector3(-0.5, 0.75, -0.45).normalize(); // 與森林同一顆月亮

function createWater() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoon: { value: MOON_DIR },
      uDeep: { value: new THREE.Color(0x0a1626) },
      uSky: { value: new THREE.Color(0x1d3150) },
      uFog: { value: new THREE.Color(FOG_COLOR) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMoon;
      uniform vec3 uDeep;
      uniform vec3 uSky;
      uniform vec3 uFog;
      varying vec3 vWorld;

      float wave(vec2 p, vec2 dir, float freq, float speed) {
        return sin(dot(p, dir) * freq + uTime * speed);
      }

      void main() {
        vec2 p = vWorld.xz;
        // 幾組小波浪疊加成法線擾動
        vec2 g = vec2(0.0);
        g += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 1.3 + uTime * 0.9) * 0.05;
        g += vec2(-0.5, 0.9) * cos(dot(p, vec2(-0.5, 0.9)) * 2.1 + uTime * 1.3) * 0.035;
        g += vec2(0.3, -1.0) * cos(dot(p, vec2(0.3, -1.0)) * 3.7 + uTime * 1.9) * 0.02;
        g += vec2(1.0, 0.1) * cos(dot(p, vec2(1.0, 0.1)) * 6.3 + uTime * 2.6) * 0.012;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 refl = reflect(-viewDir, n);
        float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
        vec3 col = mix(uDeep, uSky, clamp(fresnel * 1.4, 0.0, 1.0));

        // 月光倒影：一條碎碎閃爍的光帶
        float m = max(dot(refl, uMoon), 0.0);
        col += vec3(1.0, 0.96, 0.85) * (pow(m, 260.0) * 2.2 + pow(m, 40.0) * 0.18);

        // 手動距離霧
        float dist = length(cameraPosition - vWorld);
        float fog = 1.0 - exp(-pow(dist * 0.032, 2.0));
        col = mix(col, uFog, fog);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 1, 1), mat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER_Y, -50);
  return water;
}

/**
 * 湖畔釣魚碼頭（lake_dock）：岸邊草地、木頭碼頭、有月光倒影的湖面。
 * 碼頭上、岸邊靠水的地方都能按 F 坐下釣魚（釣魚流程見 fishing/FishingGame.js）。
 * 湖面上有魚影游來游去，偶爾有魚跳出水面。
 */
export function createLakeRoom() {
  const group = new THREE.Group();
  group.name = 'lake_dock';
  const rand = seededRandom(31);
  const occluders = [];

  group.add(new THREE.HemisphereLight(0x5a74a8, 0x1f2a22, 1.4));
  const moon = new THREE.DirectionalLight(0xa9bfff, 1.0);
  moon.position.copy(MOON_DIR).multiplyScalar(30);
  group.add(moon);

  const water = createWater();
  group.add(water);

  // 岸邊草地（往後延伸、微微往上）
  const shoreGeo = new THREE.PlaneGeometry(60, 26, 40, 16).toNonIndexed();
  shoreGeo.rotateX(-Math.PI / 2);
  const sp = shoreGeo.attributes.position;
  const colors = new Float32Array(sp.count * 3);
  const grassA = new THREE.Color(0x2c4a26);
  const grassB = new THREE.Color(0x3a5c2e);
  const sand = new THREE.Color(0x5e5240);
  const c = new THREE.Color();
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const z = sp.getZ(i) + 13; // 平面中心往後移
    sp.setZ(i, z);
    const y = Math.sin(x * 0.7 + z * 0.3) * 0.05 + Math.max(0, z - 10) * 0.18;
    sp.setY(i, z < 1.2 ? WATER_Y + 0.1 + (z - 0) * 0.25 : y);
  }
  for (let i = 0; i < sp.count; i += 3) {
    const z = (sp.getZ(i) + sp.getZ(i + 1) + sp.getZ(i + 2)) / 3;
    c.copy(grassA).lerp(grassB, rand());
    if (z < 2.2) c.lerp(sand, 0.7);
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  shoreGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  shoreGeo.computeVertexNormals();
  const shore = new THREE.Mesh(shoreGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  shore.receiveShadow = true;
  group.add(shore);

  // 碼頭
  const plank = lowpoly(0x7a5637);
  const dock = new THREE.Group();
  const dockLen = 2.6 - DOCK_END;
  for (let i = 0; i < Math.floor(dockLen / 0.32); i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.28), i % 3 === 0 ? lowpoly(0x6e4c30) : plank);
    p.position.set((rand() - 0.5) * 0.04, 0, 2.5 - i * 0.32);
    p.rotation.y = (rand() - 0.5) * 0.03;
    dock.add(p);
  }
  for (let z = 2.2; z > DOCK_END; z -= 2) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.5, 6), lowpoly(0x5b3f28));
      post.position.set(side * 0.72, -0.5, z);
      dock.add(post);
    }
  }
  dock.position.y = -0.03;
  group.add(dock);

  // 碼頭盡頭的提燈
  const lanterns = [];
  for (const [x, z] of [[-0.72, DOCK_END + 0.2], [0.72, 1.6]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), lowpoly(0x4d3524));
    pole.position.set(x, 0.6, z);
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0xffcf86 }));
    lamp.position.set(x, 1.3, z);
    group.add(lamp);
    const light = new THREE.PointLight(0xffbe70, 3.2, 7, 1.6);
    light.position.set(x, 1.3, z);
    group.add(light);
    lanterns.push(light);
  }

  // 蘆葦、石頭、後方的樹
  const reedMat = lowpoly(0x5a6a3a);
  for (let i = 0; i < 60; i++) {
    const x = (rand() - 0.5) * 22;
    if (Math.abs(x) < 1.4) continue;
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.8 + rand() * 0.7, 4), reedMat);
    reed.position.set(x, WATER_Y + 0.4, 0.4 + rand() * 1.4);
    reed.rotation.z = (rand() - 0.5) * 0.3;
    group.add(reed);
  }
  const rockMat = lowpoly(0x5f5d57);
  const colliders = [];
  for (let i = 0; i < 9; i++) {
    const x = (rand() < 0.5 ? -1 : 1) * (2.4 + rand() * 6);
    const z = 2.5 + rand() * 5;
    const s = 0.2 + rand() * 0.35;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(x, s * 0.3, z);
    rock.castShadow = true;
    group.add(rock);
    if (s > 0.3) colliders.push({ x, z, r: s * 0.9 });
  }
  const trunkMat = lowpoly(0x3d2a1c);
  const pineMat = lowpoly(0x1f3b2a);
  for (let i = 0; i < 26; i++) {
    const x = (rand() - 0.5) * 40;
    const z = 9.5 + rand() * 12;
    const s = 0.9 + rand() * 0.8;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), trunkMat);
    trunk.position.y = 0.8;
    tree.add(trunk);
    for (const [r, h, y] of [[1.35, 1.9, 1.3], [1.0, 1.6, 2.25], [0.68, 1.3, 3.1]]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), pineMat);
      cone.position.y = y + h / 2;
      tree.add(cone);
    }
    tree.position.set(x, Math.max(0, z - 10) * 0.18, z);
    tree.scale.setScalar(s);
    group.add(tree);
  }

  const sign = makeSign(t('🌲 回到營火'), { height: 0.24 });
  sign.position.set(0, 1.6, 7.9);
  group.add(sign);
  const fishSign = makeSign(t('🎣 碼頭和岸邊都能釣魚'), { height: 0.2 });
  fishSign.position.set(2.2, 1.5, 2.6);
  group.add(fishSign);

  // ---------- 熱鬧的湖面：水下魚影＋跳出水面的魚 ----------
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x02060c, transparent: true, opacity: 0.4, depthWrite: false });
  const shadows = Array.from({ length: 11 }, () => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), shadowMat);
    m.rotation.x = -Math.PI / 2;
    const s = 0.5 + rand() * 0.9;
    m.scale.set(s, s * 0.38, 1);
    group.add(m);
    return { m, cx: (rand() - 0.5) * 16, cz: -2 - rand() * 12, r: 1 + rand() * 2.5, speed: (0.15 + rand() * 0.25) * (rand() < 0.5 ? -1 : 1), a: rand() * 6.28 };
  });
  const jumpers = [];
  let nextJump = 2;
  const splashRings = Array.from({ length: 4 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 24), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    group.add(r);
    return { r, t: 1 };
  });
  const splash = (x, z) => {
    const s = splashRings.find((q) => q.t >= 1) ?? splashRings[0];
    s.t = 0;
    s.r.position.set(x, WATER_Y + 0.012, z);
  };

  shadowAll(dock);
  // 可活動區域：岸邊（矩形）＋碼頭（細長矩形）
  const resolveCollision = makeResolver(colliders, [
    { type: 'rect', minX: -9, maxX: 9, minZ: 1.6, maxZ: 8.6 },
    { type: 'rect', minX: -0.72, maxX: 0.72, minZ: DOCK_END, maxZ: 2.6 },
  ]);

  /**
   * 這個位置能不能釣魚？可以的話回傳面向水面的方向。
   *   碼頭盡頭 → 面向湖心；碼頭中段 → 面向比較近的那一側；岸邊靠水 → 面向湖
   */
  function fishingSpot(pos) {
    const onDock = Math.abs(pos.x) <= 0.8 && pos.z <= 1.0 && pos.z >= DOCK_END - 0.1;
    if (onDock) {
      if (pos.z < DOCK_END + 1.6) return { dir: [0, -1], face: Math.PI };
      return pos.x >= 0 ? { dir: [1, 0], face: Math.PI / 2 } : { dir: [-1, 0], face: -Math.PI / 2 };
    }
    if (pos.z <= 2.9 && Math.abs(pos.x) > 0.9) return { dir: [0, -1], face: Math.PI };
    return null;
  }

  return {
    id: 'lake_dock',
    label: t('🎣 湖畔碼頭'),
    group,
    fog: new THREE.FogExp2(FOG_COLOR, 0.03),
    background: new THREE.Color(FOG_COLOR),
    outdoor: true,
    occluders,
    entrances: [{ to: 'forest_main', x: 0, z: 8.3, r: 0.8, label: t('回到營火') }],
    spawn: { x: 0, z: 6.0, ry: Math.PI },
    /** 每日任務「湖邊釣魚」的指引位置：碼頭盡頭 */
    dockEnd: { x: 0, z: DOCK_END + 0.8 },
    cameraDistance: 6,
    audio: { fire: 0, wind: 0.6, ambient: 0.8, water: 1, music: 0.45, song: 1 },
    resolveCollision,
    fishSpot: null, // 坐下時記錄（ActionStateMachine 用來固定位置與面向）
    fishing: null, // 由 main.js 放入 FishingGame

    onAction(name, actions) {
      const fishingNow = actions.state === 'fish';
      if (fishingNow && (name === 'roast' || name === 'interact')) {
        if (this.fishing?.press()) return true; // 咬鉤、拉竿時的按鍵
        actions.stop(); // 等待中按 F＝收竿
        return true;
      }
      if (actions.state !== 'free') return false;
      if (name === 'roast') {
        const p = actions.player.position;
        const spot = fishingSpot(p);
        if (!spot) {
          actions.hud.toast(t('走到水邊或碼頭上再釣魚 🎣'));
          return true;
        }
        this.fishSpot = { x: p.x, z: p.z, face: spot.face };
        actions.start('fish');
        this.fishing?.start(actions, { x: p.x, z: p.z, dir: spot.dir });
        return true;
      }
      if (name === 'interact') {
        actions.hud.toast(t('湖邊沒有營火，走到水邊按 F 釣魚吧 🎣'));
        return true;
      }
      return false;
    },

    prompt(actions) {
      return fishingSpot(actions.player.position) ? t('<kbd>F</kbd> 坐下釣魚') : null;
    },

    /** 由 RoomManager 每幀呼叫 */
    update(dt, t, _camera, actions) {
      water.material.uniforms.uTime.value = t;
      lanterns.forEach((l, i) => (l.intensity = 3.2 * (0.92 + Math.sin(t * 2.7 + i) * 0.05)));

      // 釣魚：離開釣魚狀態（移動、換房間）就收竿
      if (this.fishing) {
        if (actions?.state !== 'fish' && this.fishing.active) this.fishing.stop();
        this.fishing.update(dt, t);
      }

      // 魚影
      for (const s of shadows) {
        s.a += s.speed * dt;
        const x = s.cx + Math.cos(s.a) * s.r;
        const z = s.cz + Math.sin(s.a) * s.r * 0.6;
        s.m.position.set(x, WATER_Y + 0.008, z);
        s.m.rotation.z = -s.a + (s.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      }

      // 跳出水面的魚
      nextJump -= dt;
      if (nextJump <= 0) {
        nextJump = 2.5 + Math.random() * 5;
        const idx = rollFish();
        const mesh = createFishMesh(idx);
        mesh.scale.setScalar(fishScale(rollSize(idx)) * 0.9);
        const x = (Math.random() - 0.5) * 14;
        const z = -3 - Math.random() * 12;
        const dir = Math.random() < 0.5 ? 1 : -1;
        mesh.rotation.y = dir > 0 ? 0 : Math.PI;
        group.add(mesh);
        jumpers.push({ mesh, x, z, dir, t: 0, dur: 0.9 + Math.random() * 0.4, h: 0.6 + Math.random() * 0.6 });
        splash(x, z);
        this.onSplash?.();
      }
      for (let i = jumpers.length - 1; i >= 0; i--) {
        const j = jumpers[i];
        j.t += dt;
        const u = j.t / j.dur;
        if (u >= 1) {
          splash(j.x + j.dir * 1.2, j.z);
          group.remove(j.mesh);
          jumpers.splice(i, 1);
          continue;
        }
        j.mesh.position.set(j.x + j.dir * 1.2 * u, WATER_Y + Math.sin(u * Math.PI) * j.h, j.z);
        j.mesh.rotation.z = 0.9 - u * 1.8; // 頭先朝上、落水時朝下
        if (j.mesh.userData.tail) j.mesh.userData.tail.rotation.y = Math.sin(t * 30) * 0.4;
      }
      for (const s of splashRings) {
        if (s.t >= 1) continue;
        s.t = Math.min(1, s.t + dt / 1.4);
        s.r.scale.setScalar(1 + s.t * 7);
        s.r.material.opacity = (1 - s.t) * 0.6;
      }
    },
  };
}
