import * as THREE from 'three';
import { makeRadialTexture } from './textures.js';

const FLAME_COUNT = 140;
const SPARK_RATIO = 0.14;

const COL_CORE = new THREE.Color(1.0, 0.88, 0.45);
const COL_MID = new THREE.Color(1.0, 0.45, 0.1);
const COL_TIP = new THREE.Color(0.55, 0.08, 0.03);

/**
 * 石圍營火：石頭圈 + 木柴 + 火焰粒子 + 閃爍點光源 + 地面暖光
 * 營火生命值 `fuel`（0 ~ 100）會隨時間慢慢燒掉；添柴火（addFuel）讓火勢變大並噴出火星。
 * `strength` 由 fuel 推算（0.35 ~ 1.75），控制火焰大小、亮度與烤棉花糖的速度。
 * M3 之後 fuel 改由伺服器統一管理，所有人看到同一團火。
 */
const MAX_FUEL = 100;
const BURN_RATE = 0.22; // 每秒燒掉的 fuel（滿的火約 7~8 分鐘燒完）

export class Campfire {
  constructor() {
    this.group = new THREE.Group();
    this.radius = 1.15; // 碰撞半徑（不讓玩家走進火堆）
    this.fuel = 55;
    this.strength = this.#strengthFromFuel();
    this._boost = 0;

    this.#buildStones();
    this.#buildLogs();
    this.#buildEmbers();
    this.#buildFlames();
    this.#buildLight();

    this._flicker = 1;
    this._flickerTarget = 1;
    this._flickerTimer = 0;
  }

  #buildStones() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b6862, flatShading: true, roughness: 1 });
    const count = 11;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.15;
      const r = 0.82 + Math.random() * 0.08;
      const s = 0.17 + Math.random() * 0.07;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
      stone.position.set(Math.sin(a) * r, s * 0.55, Math.cos(a) * r);
      stone.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      stone.scale.set(1.25, 0.8, 1);
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
    }
  }

  #buildLogs() {
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3020, flatShading: true, roughness: 1 });
    const charred = new THREE.MeshStandardMaterial({
      color: 0x1d130d,
      emissive: 0xff5a14,
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    const geo = new THREE.CylinderGeometry(0.07, 0.09, 0.95, 6);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const log = new THREE.Mesh(geo, i % 2 ? bark : charred);
      // 帳篷式（teepee）斜靠堆疊
      log.position.set(Math.sin(a) * 0.22, 0.32, Math.cos(a) * 0.22);
      log.rotation.set(0, 0, 0);
      log.lookAt(0, 1.4, 0);
      log.rotateX(Math.PI / 2);
      log.castShadow = true;
      this.group.add(log);
    }
  }

  #buildEmbers() {
    // 炭床
    const embers = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a0d08, emissive: 0xff4a10, emissiveIntensity: 0.6, flatShading: true }),
    );
    embers.rotation.x = -Math.PI / 2;
    embers.position.y = 0.02;
    this.embersMat = embers.material;
    this.group.add(embers);

    // 地面暖光（加法混合的光暈貼片）
    const glowTex = makeRadialTexture([
      [0, 'rgba(255,150,60,0.55)'],
      [0.35, 'rgba(255,110,40,0.22)'],
      [1, 'rgba(255,90,30,0)'],
    ]);
    this.groundGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.y = 0.03;
    this.group.add(this.groundGlow);

    // 火焰中心光暈
    const haloTex = makeRadialTexture([
      [0, 'rgba(255,200,120,0.9)'],
      [0.25, 'rgba(255,130,50,0.35)'],
      [1, 'rgba(255,80,20,0)'],
    ]);
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.halo.position.y = 0.65;
    this.halo.scale.setScalar(2.4);
    this.group.add(this.halo);
  }

  #buildFlames() {
    const geo = new THREE.BufferGeometry();
    this.fPos = new Float32Array(FLAME_COUNT * 3);
    this.fCol = new Float32Array(FLAME_COUNT * 3);
    this.fSize = new Float32Array(FLAME_COUNT);
    this.fAlpha = new Float32Array(FLAME_COUNT);

    this.particles = Array.from({ length: FLAME_COUNT }, (_, i) => ({
      spark: i < FLAME_COUNT * SPARK_RATIO,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 1, size: 1,
    }));
    for (const p of this.particles) {
      this.#respawn(p);
      p.life = Math.random() * p.maxLife; // 錯開初始相位
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.fPos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.fCol, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.fSize, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.fAlpha, 1));

    this.flameMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 300 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(vColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.flames = new THREE.Points(geo, this.flameMat);
    this.flames.frustumCulled = false;
    this.group.add(this.flames);
  }

  #respawn(p) {
    const s = this.strength;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.32;
    p.x = Math.sin(a) * r;
    p.z = Math.cos(a) * r;
    p.y = 0.12 + Math.random() * 0.1;
    p.life = 0;
    if (p.spark) {
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vz = (Math.random() - 0.5) * 0.6;
      p.vy = 1.6 + Math.random() * 1.6 * s;
      p.maxLife = 1.2 + Math.random() * 1.4;
      p.size = 0.035 + Math.random() * 0.03;
    } else {
      p.vx = -p.x * 0.9;
      p.vz = -p.z * 0.9;
      p.vy = (0.7 + Math.random() * 0.8) * (0.7 + s * 0.3);
      p.maxLife = (0.45 + Math.random() * 0.55) * (0.8 + s * 0.2);
      p.size = (0.42 + Math.random() * 0.3) * (0.75 + s * 0.25);
    }
  }

  #buildLight() {
    this.light = new THREE.PointLight(0xff8a3d, 40, 32, 1.6);
    this.light.position.set(0, 1.0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.bias = -0.002;
    this.light.shadow.normalBias = 0.03; // 避免圓滑角色身上出現陰影鋸齒
    this.light.shadow.radius = 4;
    this.group.add(this.light);
  }

  #strengthFromFuel() {
    return 0.35 + (this.fuel / MAX_FUEL) * 1.4;
  }

  /** 添柴：增加生命值、短暫爆旺、噴出一陣火星 */
  addFuel(amount) {
    this.fuel = Math.min(MAX_FUEL, this.fuel + amount);
    this._boost = 0.7;
    for (const p of this.particles) {
      if (!p.spark) continue;
      this.#respawn(p);
      p.vy *= 1.6;
      p.vx *= 2.5;
      p.vz *= 2.5;
    }
    this.onCrackle?.(); // M4 音訊：劈啪聲
  }

  get fuelRatio() {
    return this.fuel / MAX_FUEL;
  }

  setPixelScale(heightPx, fovDeg) {
    // 讓粒子大小以「公尺」為單位，與螢幕解析度無關
    this.flameMat.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  update(dt, elapsed) {
    this.fuel = Math.max(0, this.fuel - BURN_RATE * dt);
    this._boost *= Math.exp(-1.2 * dt);
    const targetStrength = this.#strengthFromFuel() + this._boost;
    this.strength += (targetStrength - this.strength) * (1 - Math.exp(-3 * dt));
    const s = this.strength;

    // 粒子
    for (let i = 0; i < FLAME_COUNT; i++) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) this.#respawn(p);
      const t = p.life / p.maxLife;

      if (p.spark) {
        p.vx += Math.sin(elapsed * 3 + i) * dt * 0.8;
        p.vy *= 1 - dt * 0.6;
      } else {
        p.vx += Math.sin(elapsed * 6 + i * 1.7) * dt * 0.4;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      this.fPos[i * 3] = p.x;
      this.fPos[i * 3 + 1] = p.y;
      this.fPos[i * 3 + 2] = p.z;

      let c;
      if (p.spark) {
        c = COL_CORE.clone().lerp(COL_MID, t);
        this.fSize[i] = p.size;
        this.fAlpha[i] = (1 - t) * (0.6 + 0.4 * Math.sin(elapsed * 25 + i));
      } else {
        c = t < 0.4 ? COL_CORE.clone().lerp(COL_MID, t / 0.4) : COL_MID.clone().lerp(COL_TIP, (t - 0.4) / 0.6);
        this.fSize[i] = p.size * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) * 0.85);
        this.fAlpha[i] = Math.sin(Math.min(t, 1) * Math.PI) * 0.75;
      }
      this.fCol[i * 3] = c.r;
      this.fCol[i * 3 + 1] = c.g;
      this.fCol[i * 3 + 2] = c.b;
    }
    const attrs = this.flames.geometry.attributes;
    attrs.position.needsUpdate = true;
    attrs.aColor.needsUpdate = true;
    attrs.aSize.needsUpdate = true;
    attrs.aAlpha.needsUpdate = true;

    // 閃爍：多組正弦 + 平滑隨機，形成自然的明暗呼吸
    this._flickerTimer -= dt;
    if (this._flickerTimer <= 0) {
      this._flickerTarget = 0.82 + Math.random() * 0.3;
      this._flickerTimer = 0.06 + Math.random() * 0.12;
    }
    this._flicker += (this._flickerTarget - this._flicker) * (1 - Math.exp(-14 * dt));
    const breath = 1 + Math.sin(elapsed * 1.3) * 0.06 + Math.sin(elapsed * 7.7) * 0.04;
    const f = this._flicker * breath;

    this.light.intensity = 40 * s * f;
    this.light.position.x = Math.sin(elapsed * 5.1) * 0.05;
    this.light.position.z = Math.cos(elapsed * 4.3) * 0.05;

    this.halo.material.opacity = 0.75 * f;
    this.halo.scale.setScalar(2.2 * (0.8 + s * 0.2) * (0.95 + f * 0.08));
    this.groundGlow.material.opacity = 0.85 * f;
    this.embersMat.emissiveIntensity = 0.45 + f * 0.35;
  }
}
