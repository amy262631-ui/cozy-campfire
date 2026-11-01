import * as THREE from 'three';
import { t } from '../i18n/i18n.js';

/**
 * 帳篷外觀風格（免費切換）。伺服器 server/homes.js 的 TENT_STYLES 要跟這裡的 id 一致。
 *   canvas：帆布底色　accent：門簾、收邊　pattern：花樣（null＝素色）
 */
export const TENT_STYLES = [
  { id: 'classic', icon: '🤍', name: t('米白鐘形帳'), canvas: '#e6d2ac', accent: '#c9a874', floor: 0x8a6644 },
  { id: 'forest', icon: '🌲', name: t('森林綠'), canvas: '#7d9a68', accent: '#4e6b40', floor: 0x7a5a3c },
  { id: 'stripe', icon: '🎪', name: t('紅白條紋'), canvas: '#f4ead8', accent: '#c94f43', floor: 0x8a6644, pattern: 'stripe', ink: '#c94f43' },
  { id: 'night', icon: '🌌', name: t('星空藍'), canvas: '#2e3d6b', accent: '#e8c76a', floor: 0x5e4632, pattern: 'stars', ink: '#ffe9a8' },
  { id: 'sakura', icon: '🌸', name: t('粉櫻'), canvas: '#f3c9d2', accent: '#d98aa0', floor: 0x9a7356, pattern: 'dots', ink: '#ffffff' },
  { id: 'redspot', icon: '🔴', name: t('紅點點'), canvas: '#d2453c', accent: '#f6efe2', floor: 0x8a6644, pattern: 'spots', ink: '#fbf4e6' },
  { id: 'patch', icon: '🧵', name: t('拼布'), canvas: '#d9b98c', accent: '#8a5a3a', floor: 0x7d5a3e, pattern: 'patch' },
];
export const TENT_STYLE_BY_ID = Object.fromEntries(TENT_STYLES.map((s) => [s.id, s]));
export const styleOf = (id) => TENT_STYLE_BY_ID[id] ?? TENT_STYLES[0];

const cache = new Map();
/** 帆布貼圖（花樣畫在 canvas 上，繞帳篷一圈重複） */
export function tentTexture(style) {
  if (!style.pattern) return null;
  if (cache.has(style.id)) return cache.get(style.id);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = style.canvas;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = style.ink;
  if (style.pattern === 'stripe') {
    g.fillRect(0, 0, 64, 128);
  } else if (style.pattern === 'stars') {
    const stars = [[20, 18, 3], [90, 30, 2], [52, 64, 3.5], [110, 86, 2.5], [28, 100, 2], [76, 112, 1.6], [8, 60, 1.4], [120, 8, 1.4]];
    for (const [x, y, r] of stars) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r * 1.4;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
  } else if (style.pattern === 'dots') {
    for (const [x, y] of [[24, 24], [88, 24], [56, 72], [120, 72], [-8, 72], [24, 120], [88, 120]]) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (style.pattern === 'spots') {
    for (const [x, y, r] of [[30, 34, 15], [96, 22, 10], [70, 90, 17], [12, 108, 9], [118, 110, 8]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  } else if (style.pattern === 'patch') {
    const cols = ['#c98a5a', '#7d9a68', '#d9b98c', '#b5655a', '#e8d6a8', '#6f86a8'];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = cols[(i * 3 + j * 5) % cols.length];
        g.fillRect(i * 32, j * 32, 32, 32);
      }
    g.strokeStyle = 'rgba(255,245,220,0.7)';
    g.setLineDash([4, 3]);
    g.lineWidth = 2;
    for (let k = 0; k <= 4; k++) {
      g.beginPath();
      g.moveTo(k * 32, 0);
      g.lineTo(k * 32, 128);
      g.moveTo(0, k * 32);
      g.lineTo(128, k * 32);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(style.pattern === 'stripe' ? 14 : style.pattern === 'spots' ? 18 : 22, style.pattern === 'stripe' ? 1 : style.pattern === 'spots' ? 2 : 2);
  cache.set(style.id, tex);
  return tex;
}
