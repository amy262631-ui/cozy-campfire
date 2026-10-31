import * as THREE from 'three';

/**
 * 角色手上的道具：烤棉花糖樹枝、木柴、毛毯。
 * 程序小狐狸與 GLB 角色共用。
 */

const DONENESS_STOPS = [
  [0.0, new THREE.Color(0xfff8ee)], // 生的：雪白
  [0.45, new THREE.Color(0xf0c070)], // 微焦：金黃
  [0.8, new THREE.Color(0x9a5a28)], // 偏焦：咖啡
  [1.0, new THREE.Color(0x2a1a12)], // 焦黑
];

export function donenessColor(p, target = new THREE.Color()) {
  if (p <= 0) return target.copy(DONENESS_STOPS[0][1]);
  for (let i = 1; i < DONENESS_STOPS.length; i++) {
    const [t1, c1] = DONENESS_STOPS[i];
    const [t0, c0] = DONENESS_STOPS[i - 1];
    if (p <= t1) return target.copy(c0).lerp(c1, (p - t0) / (t1 - t0));
  }
  return target.copy(DONENESS_STOPS[DONENESS_STOPS.length - 1][1]);
}

/** 樹枝串棉花糖，沿 +Z 方向伸出（長度 1m） */
export function createRoastStick() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 1 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, 1.0, 6).rotateX(Math.PI / 2), wood);
  stick.position.z = 0.5;
  stick.castShadow = true;
  group.add(stick);

  // 小分岔
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.14, 5), wood);
  twig.position.set(0.03, 0.03, 0.42);
  twig.rotation.set(0.6, 0, -0.8);
  group.add(twig);

  const marshMat = new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: 0.7 });
  const marshmallow = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.05, 6, 14).rotateX(Math.PI / 2), marshMat);
  marshmallow.position.z = 0.93;
  marshmallow.castShadow = true;
  group.add(marshmallow);

  return {
    group,
    marshmallow,
    setDoneness(p) {
      donenessColor(p, marshMat.color);
      // 烤到快焦時表面微微發光（餘燼感）
      marshMat.emissive.setRGB(0.5, 0.18, 0.02);
      marshMat.emissiveIntensity = THREE.MathUtils.clamp((p - 0.85) * 1.5, 0, 0.4);
    },
  };
}

/** 一根木柴（沿 X 軸） */
export function createLogProp() {
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.075, 0.5, 8).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 1 }),
  );
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xc89a66, roughness: 1 });
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.066, 8), ringMat);
    cap.position.x = side * 0.251;
    cap.rotation.y = side * Math.PI / 2;
    log.add(cap);
  }
  log.castShadow = true;
  return log;
}

function plaidTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#b8423a';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255, 236, 200, 0.55)';
  for (let i = 0; i < 128; i += 32) {
    g.fillRect(i + 10, 0, 6, 128);
    g.fillRect(0, i + 10, 128, 6);
  }
  g.fillStyle = 'rgba(60, 20, 20, 0.35)';
  for (let i = 0; i < 128; i += 32) {
    g.fillRect(i + 22, 0, 3, 128);
    g.fillRect(0, i + 22, 128, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * 格紋毛毯：身體的「毛球」＋頭上的兜帽（前方留開口露出臉）。
 * 回傳 { body, hood }，由角色各自掛到身體與頭上。
 */
export function createBlanket() {
  const mat = new THREE.MeshStandardMaterial({ map: plaidTexture(), roughness: 1, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), mat);
  body.scale.set(1.08, 0.92, 1.05);
  body.castShadow = true;

  // phi = π/2 是正前方，留 120° 的開口給臉
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 28, 16, Math.PI * 5 / 6, Math.PI * 4 / 3, 0, Math.PI * 0.62),
    mat,
  );
  hood.scale.set(1.1, 1.02, 1.05);
  hood.castShadow = true;
  return { body, hood };
}

/**
 * 釣竿：沿 +Z 方向伸出、往上翹。tip 是竿尖的參考點（釣線從這裡垂下）。
 */
export function createFishingRod() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 });
  const len = 1.5;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, len, 6).rotateX(Math.PI / 2), wood);
  rod.position.z = len / 2;
  rod.castShadow = true;
  group.add(rod);

  // 握把與捲線器
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3d2a1e, roughness: 1 }),
  );
  grip.position.z = 0.1;
  group.add(grip);
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.6 }),
  );
  reel.position.set(0, -0.04, 0.2);
  group.add(reel);

  const tip = new THREE.Object3D();
  tip.position.z = len;
  group.add(tip);
  return { group, tip };
}
