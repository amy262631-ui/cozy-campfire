import * as THREE from 'three';

/** 浮在空中的文字招牌（不受霧影響，遠遠就看得到） */
export function makeSign(text, { height = 0.32, bg = 'rgba(30, 20, 14, 0.7)', color = '#ffe9c8' } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '700 40px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 56;
  c.width = w;
  c.height = 68;
  g.font = font;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(2, 4, w - 4, 60, 30);
  g.fill();
  g.strokeStyle = 'rgba(255, 200, 140, 0.45)';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, 36);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }),
  );
  sprite.scale.set((height * w) / 68, height, 1);
  sprite.renderOrder = 5;
  return sprite;
}

/**
 * 通用的圓形碰撞：把位置推出 colliders，並限制在 bounds 範圍內。
 * bounds：{ type: 'circle', r, cx?, cz? } 或 { type: 'rect', minX, maxX, minZ, maxZ }，
 * 也可以傳陣列（多個區域聯集，例如碼頭＋岸邊），玩家會被拉回最近的區域。
 */
export function makeResolver(colliders, bounds) {
  const areas = Array.isArray(bounds) ? bounds : [bounds];

  const clampTo = (area, pos, radius, out) => {
    if (area.type === 'circle') {
      const cx = area.cx ?? 0;
      const cz = area.cz ?? 0;
      const lim = area.r - radius;
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d = Math.hypot(dx, dz);
      if (d <= lim) return out.set(pos.x, 0, pos.z);
      return out.set(cx + (dx / d) * lim, 0, cz + (dz / d) * lim);
    }
    return out.set(
      THREE.MathUtils.clamp(pos.x, area.minX + radius, area.maxX - radius),
      0,
      THREE.MathUtils.clamp(pos.z, area.minZ + radius, area.maxZ - radius),
    );
  };

  const tmp = new THREE.Vector3();
  const best = new THREE.Vector3();

  return function resolveCollision(pos, radius) {
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
    // 拉回最近的可活動區域
    let bestD = Infinity;
    for (const a of areas) {
      clampTo(a, pos, radius, tmp);
      const d = (tmp.x - pos.x) ** 2 + (tmp.z - pos.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best.copy(tmp);
      }
      if (d === 0) break;
    }
    pos.x = best.x;
    pos.z = best.z;
  };
}

/** 低多邊形材質小工具 */
export const lowpoly = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1, ...extra });

export function shadowAll(obj, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = receive;
    }
  });
  return obj;
}
