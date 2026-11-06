import * as THREE from 'three';
import { makeRadialTexture } from './textures.js';

/**
 * 假的光源：一團加亮的光暈貼圖，用法跟 THREE.PointLight 一樣（color、intensity、distance）。
 * 真的點光源每多一盞，畫面上每個東西都要多算一次光，營火區有 17 盞會很卡；
 * 裝飾用的小燈改用這個，只留營火主光（和小舖的燈）是真的光源。
 *   intensity：越大光暈越亮（0＝關燈，看不到）
 *   distance：光暈大小大約是照亮範圍的一半
 */
let tex = null;
export class GlowLight extends THREE.Sprite {
  constructor(color = 0xffc27a, intensity = 1, distance = 6) {
    tex ??= makeRadialTexture([
      [0, 'rgba(255,255,255,0.9)'],
      [0.2, 'rgba(255,255,255,0.35)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    super(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.isGlowLight = true;
    this.castShadow = false;
    this.renderOrder = 2;
    this._i = 0;
    this.distance = distance;
    this.scale.setScalar(Math.max(0.8, distance * 0.42));
    this.intensity = intensity;
  }
  get intensity() {
    return this._i;
  }
  set intensity(v) {
    this._i = v;
    this.material.opacity = Math.min(0.85, Math.max(0, v) * 0.16);
    this.visible = v > 0.01;
  }
}
