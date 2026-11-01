import * as THREE from 'three';
import { makeSign } from './shared.js';
import { RACE_LANTERNS, TOUCH_R } from '../game/miniSpots.js';

/**
 * 整點小活動在森林裡的道具：
 *   🏃 燈籠賽跑：1～5 號燈籠，下一個要跑的那盞會亮起光柱
 *   ✨ 找金松果：發光的金松果，被撿走就消失
 */
export function buildMiniLayer() {
  const group = new THREE.Group();
  group.name = 'mini-events';

  // ---- 燈籠 ----
  const paperOff = new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.9 });
  const paperOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3c26, roughness: 1, flatShading: true });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const lanterns = RACE_LANTERNS.map((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 6), wood);
    post.position.y = 0.85;
    g.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.05), wood);
    arm.position.set(0.2, 1.68, 0);
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 10), paperOff);
    lamp.position.set(0.38, 1.42, 0);
    g.add(lamp);
    const sign = makeSign(`${i + 1}`, { height: 0.42 });
    sign.position.y = 2.25;
    g.add(sign);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(TOUCH_R * 0.6, TOUCH_R * 0.8, 6, 18, 1, true), beamMat);
    beam.position.y = 3;
    beam.visible = false;
    g.add(beam);
    const light = new THREE.PointLight(0xffb45a, 0, 6, 1.6);
    light.position.set(0.38, 1.42, 0);
    g.add(light);
    group.add(g);
    return { g, lamp, beam, light };
  });

  // ---- 金松果 ----
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xc77a00, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.4, flatShading: true });
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const coneGeo = new THREE.ConeGeometry(0.22, 0.5, 7);
  let cones = [];

  let raceOn = false;
  let next = 0;
  setRace(false);

  function setRace(on, nextIndex = 0) {
    raceOn = on;
    next = nextIndex;
    lanterns.forEach((l, i) => {
      l.g.visible = on;
      const lit = on && i === next;
      l.lamp.material = lit ? paperOn : paperOff;
      l.beam.visible = lit;
      l.light.intensity = lit ? 6 : on ? 1.2 : 0;
    });
  }

  function setHunt(spots = []) {
    for (const c of cones) group.remove(c.g);
    cones = spots.map((p) => {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const cone = new THREE.Mesh(coneGeo, goldMat);
      cone.rotation.x = Math.PI;
      cone.position.y = 0.5;
      g.add(cone);
      const spark = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 4, 12, 1, true), sparkMat);
      spark.position.y = 2;
      g.add(spark);
      const light = new THREE.PointLight(0xffcf55, 3, 4, 1.8);
      light.position.y = 0.7;
      g.add(light);
      g.visible = !p.by;
      group.add(g);
      return { g, cone, taken: !!p.by, x: p.x, z: p.z };
    });
  }

  function take(i) {
    const c = cones[i];
    if (!c) return;
    c.taken = true;
    c.g.visible = false;
  }

  return {
    group,
    setRace,
    setHunt,
    take,
    get raceOn() {
      return raceOn;
    },
    get next() {
      return next;
    },
    /** 離自己最近、還沒被撿走的金松果（碰得到才回傳） */
    huntAt(pos) {
      return cones.findIndex((c) => !c.taken && Math.hypot(pos.x - c.x, pos.z - c.z) < TOUCH_R);
    },
    /** 有沒有碰到下一盞燈籠 */
    touchingLantern(pos) {
      if (!raceOn) return -1;
      const p = RACE_LANTERNS[next];
      if (Math.hypot(pos.x - p.x, pos.z - p.z) < TOUCH_R) return next;
      // 隨時可以回到 1 號重新開始
      const s = RACE_LANTERNS[0];
      if (next !== 0 && next !== 1 && Math.hypot(pos.x - s.x, pos.z - s.z) < TOUCH_R) return 0;
      return -1;
    },
    get huntLeft() {
      return cones.filter((c) => !c.taken).length;
    },
    update(dt, t) {
      for (const c of cones) {
        if (c.taken) continue;
        c.cone.rotation.y = t * 1.6;
        c.cone.position.y = 0.5 + Math.sin(t * 2.2 + c.x) * 0.08;
      }
      if (raceOn) for (const l of lanterns) if (l.beam.visible) l.beam.rotation.y = t * 0.5;
    },
  };
}
