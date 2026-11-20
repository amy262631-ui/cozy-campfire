/**
 * 🌟 森林傳說在畫面上經過（伺服器說「現在出現」→ 這裡放模型、照路線走，離開那個地方就收起來）。
 */
import * as THREE from 'three';
import { buildMossTortoise, buildCloudWhale, buildSantaSleigh } from './legends.js';

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class LegendShow {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.cur = null;
  }
  /** 開始：id、已經過了多久 el、總長 dur（毫秒）、方向 dir（1／-1）、在哪個房間 room、玩家位置 p */
  start({ id, el, dur, dir }, room, p) {
    this.stop();
    const model = id === 'tortoise' ? buildMossTortoise('star') : id === 'whale' ? buildCloudWhale() : buildSantaSleigh();
    const f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    f.y = 0;
    if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
    f.normalize();
    const r = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(dir || 1);
    let a;
    let b;
    let scale;
    if (id === 'whale') {
      // 湖在碼頭前面（z 是負的）：從湖的一邊浮起來游到另一邊，最後游上天
      a = new THREE.Vector3(-30 * dir, 0, -30);
      b = new THREE.Vector3(30 * dir, 0, -26);
      // ⛵ 坐在船上：從船的旁邊（湖心那一側）游過去（作者 11/19：雲鯨游到船邊）
      const bc = this.boatAt?.();
      if (bc) {
        a = new THREE.Vector3(bc.x - 30 * dir, 0, bc.z - 8);
        b = new THREE.Vector3(bc.x + 30 * dir, 0, bc.z - 6.5);
      }
      scale = 4;
    } else if (id === 'sleigh') {
      // 天空：從鏡頭看出去畫面上半部那一帶飛過（不然鏡頭往下看會看不到）
      const d3 = new THREE.Vector3();
      this.camera.getWorldDirection(d3);
      const c = this.camera.position.clone().addScaledVector(d3, 24);
      // 往上找一個高度，讓它在畫面上半部（螢幕 y 約 0.45）
      const v = new THREE.Vector3();
      for (let k = 0; k < 40; k++) {
        v.copy(c).project(this.camera);
        if (v.y > 0.3) break;
        c.y += 0.5;
      }
      c.y = Math.max(c.y, 2.5);
      a = c.clone().addScaledVector(r, -34);
      b = c.clone().addScaledVector(r, 34);
      this.skyY = c.y;
      scale = 2.4;
    } else {
      // 森林：在前面遠遠的地方，從一邊慢慢爬到另一邊
      const c = p.clone().addScaledVector(f, 15);
      a = c.clone().addScaledVector(r, -14);
      b = c.clone().addScaledVector(r, 14);
      scale = 3.2;
    }
    model.scale.setScalar(scale);
    model.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    this.scene.add(model);
    this.cur = { id, model, a, b, t: el / 1000, dur: dur / 1000, room };
    this.update(0);
  }
  stop() {
    if (!this.cur) return;
    this.scene.remove(this.cur.model);
    this.cur.model.traverse((o) => o.geometry?.dispose?.());
    this.cur = null;
  }
  get active() {
    return !!this.cur;
  }
  update(dt, roomId) {
    const c = this.cur;
    if (!c) return;
    if (roomId && roomId !== c.room) return this.stop();
    c.t += dt;
    const u = c.t / c.dur;
    if (u >= 1) return this.stop();
    const m = c.model;
    const pos = c.a.clone().lerp(c.b, u);
    if (c.id === 'whale') {
      // 先從水裡浮上來、噴水，後半段慢慢游到天上
      pos.y = -4 + smooth(0, 0.2, u) * 5 + Math.pow(Math.max(0, u - 0.55) / 0.45, 2) * 16;
      m.userData.baseY = pos.y;
      m.rotation.x = -smooth(0.5, 0.9, u) * 0.35;
    } else if (c.id === 'sleigh') {
      pos.y = (this.skyY ?? 8) + Math.sin(u * Math.PI * 2) * 1.0;
      m.rotation.z = Math.sin(u * Math.PI * 2) * 0.08;
    } else pos.y = 0;
    m.position.copy(pos);
    m.userData.tick?.(c.t);
  }
}
