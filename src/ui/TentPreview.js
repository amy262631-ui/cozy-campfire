import * as THREE from 'three';
import { buildTentShell, buildTentFloor } from '../game/tentShapes.js';
import { styleOf, tentTexture } from '../game/tentStyles.js';

/**
 * 小舖裡的帳篷外觀預覽：一個小小的 3D 畫面，帳篷慢慢轉。
 * 只有面板打開時才會畫，關掉就停。
 */
export class TentPreview {
  constructor(width = 360, height = 200) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tent-preview';
    this.w = width;
    this.h = height;
    this.renderer = null;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffeedd, 0x3a4a2a, 1.6));
    const sun = new THREE.DirectionalLight(0xffe0b0, 2.2);
    sun.position.set(6, 10, 8);
    this.scene.add(sun);
    // 草地＋營火光
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const glow = new THREE.PointLight(0xffa860, 6, 10, 1.5);
    glow.position.set(0, 1.4, 1.5);
    this.scene.add(glow);
    this.mats = {
      canvas: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
      accent: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
      accentDouble: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
      wood: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 1, flatShading: true }),
      trim: new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1, side: THREE.DoubleSide }),
      gills: new THREE.MeshStandardMaterial({ color: 0xead9bd, roughness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.5, metalness: 0.3 }),
      window: new THREE.MeshBasicMaterial({ color: 0xffd98a }),
    };
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x8a6644, roughness: 1 });
    this.tent = new THREE.Group();
    this.scene.add(this.tent);
    this.angle = 0.5;
    this.key = '';
    this.running = false;
  }

  set(shape, style, frame = 'gold') {
    const key = `${shape}|${style}|${frame}`;
    if (key === this.key) return;
    this.key = key;
    const st = styleOf(style);
    const tex = tentTexture(st);
    this.mats.canvas.map = tex;
    this.mats.canvas.color.set(tex ? 0xffffff : st.canvas);
    this.mats.canvas.needsUpdate = true;
    this.mats.accent.color.set(st.accent);
    this.mats.accentDouble.color.set(st.accent);
    this.floorMat.color.setHex(st.floor);
    for (const c of this.tent.children) c.traverse((o) => o.geometry?.dispose());
    this.tent.clear();
    this.tent.add(buildTentShell(shape, this.mats, { outside: true, frame }));
    const floor = buildTentFloor(shape, this.floorMat);
    floor.position.y = 0.01;
    this.tent.add(floor);
    this.#draw();
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      // 每秒畫 30 張就夠，省電
      if (now - last >= 33) {
        this.angle += Math.min(0.1, (now - last) / 1000) * 0.45;
        last = now;
        this.#draw();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  #draw() {
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      } catch {
        return; // 不支援第二個 WebGL 畫面就算了
      }
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setSize(this.w, this.h, false);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    const d = 13.5;
    // 從正面偏一點開始轉，先看到門口
    this.camera.position.set(Math.sin(this.angle) * d, 5.0, Math.cos(this.angle) * d);
    this.camera.lookAt(0, 2.0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
