import * as THREE from 'three';

function makeSnoreTexture(char) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 46px "Comic Sans MS", "Chalkboard SE", "Noto Sans TC", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(40, 50, 90, 0.85)';
  g.strokeText(char, 32, 34);
  g.fillStyle = '#eaf0ff';
  g.fillText(char, 32, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 頭頂飄出的 Zzz 泡泡（裹毯發呆時；Zzz 是國際通用的睡覺符號） */
export class ZzzBubbles {
  constructor(scene) {
    this.scene = scene;
    this.textures = [makeSnoreTexture('Z'), makeSnoreTexture('z')];
    this._next = 0;
    this.items = [];
  }

  spawn(headPos) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.textures[this._next++ % 2], transparent: true, depthWrite: false, fog: false }),
    );
    sprite.position.copy(headPos).add(new THREE.Vector3(0.18, 0.35, 0));
    sprite.scale.setScalar(0.01);
    sprite.material.rotation = 0.25;
    this.scene.add(sprite);
    this.items.push({ sprite, life: 0, dur: 2.4, base: sprite.position.clone(), size: 0.16 + Math.random() * 0.08 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life += dt;
      const u = it.life / it.dur;
      if (u >= 1) {
        this.scene.remove(it.sprite);
        it.sprite.material.dispose();
        this.items.splice(i, 1);
        continue;
      }
      it.sprite.position.set(
        it.base.x + Math.sin(u * 5) * 0.08 + u * 0.15,
        it.base.y + u * 0.6,
        it.base.z,
      );
      const grow = Math.min(1, u * 4);
      it.sprite.scale.setScalar(it.size * (0.5 + grow * 0.5 + u * 0.6));
      it.sprite.material.opacity = Math.min(1, u * 5) * (1 - Math.pow(u, 3));
    }
  }
}
