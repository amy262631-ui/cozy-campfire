import * as THREE from 'three';

const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

/** 把文字切成好幾行（中文逐字、英文盡量不切斷單字） */
function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of [...text]) {
    const test = line + ch;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function makeTexture(text, isEmoji) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (isEmoji) {
    c.width = c.height = 128;
    g.font = `96px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 64, 70);
  } else {
    const fontSize = 34;
    g.font = `500 ${fontSize}px ${FONT}`;
    const lines = wrap(g, text, 420);
    const w = Math.min(460, Math.max(...lines.map((l) => g.measureText(l).width)) + 44);
    const h = lines.length * (fontSize + 10) + 34;
    c.width = Math.ceil(w);
    c.height = Math.ceil(h + 16);
    g.font = `500 ${fontSize}px ${FONT}`;
    // 圓角對話框＋小尾巴
    g.fillStyle = 'rgba(255, 250, 240, 0.96)';
    g.strokeStyle = 'rgba(120, 80, 50, 0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, 22);
    g.moveTo(w / 2 - 12, h - 3);
    g.lineTo(w / 2, h + 13);
    g.lineTo(w / 2 + 12, h - 3);
    g.fill();
    g.stroke();
    g.fillStyle = '#3a2a20';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, w / 2, 20 + fontSize / 2 + i * (fontSize + 10)));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, w: c.width, h: c.height };
}

/**
 * 頭上的對話泡泡與表情符號。每位玩家同時最多一個泡泡（新的會取代舊的）。
 * show(id, text, { emoji }) 之後，每幀 update(dt, getHead) 讓泡泡跟著頭走。
 */
export class SpeechBubbles {
  constructor(scene) {
    this.scene = scene;
    this.items = new Map(); // id → { sprite, life, dur, emoji }
  }

  show(id, text, { emoji = false } = {}) {
    this.remove(id);
    const { tex, w, h } = makeTexture(text, emoji);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    sprite.renderOrder = 30;
    const height = emoji ? 0.36 : (h / 60) * 0.18;
    sprite.scale.set((height * w) / h, height, 1);
    sprite.userData.baseScale = sprite.scale.clone();
    this.scene.add(sprite);
    this.items.set(id, { sprite, life: 0, dur: emoji ? 3 : 6 + Math.min(4, text.length * 0.12), emoji, h: height });
  }

  remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    this.scene.remove(it.sprite);
    it.sprite.material.map.dispose();
    it.sprite.material.dispose();
    this.items.delete(id);
  }

  /** @param {(id: string, out: THREE.Vector3) => boolean} getHead 找不到這個人時回傳 false */
  update(dt, getHead) {
    const v = new THREE.Vector3();
    for (const [id, it] of this.items) {
      it.life += dt;
      if (it.life > it.dur || !getHead(id, v)) {
        this.remove(id);
        continue;
      }
      // 彈出來的動畫、最後淡出
      const pop = Math.min(1, it.life / 0.18);
      const s = (it.emoji ? 0.6 + pop * 0.4 + Math.sin(it.life * 6) * 0.04 : 0.8 + pop * 0.2);
      it.sprite.scale.copy(it.sprite.userData.baseScale).multiplyScalar(s);
      it.sprite.material.opacity = Math.min(1, (it.dur - it.life) / 0.5);
      const rise = it.emoji ? Math.min(0.15, it.life * 0.2) : 0;
      it.sprite.position.set(v.x, v.y + 0.88 + it.h / 2 + rise, v.z); // 在名牌上方
    }
  }
}
