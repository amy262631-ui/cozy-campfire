/**
 * ⚡ 效能（11/20）：把一個不會動的小模型（船、小鴨⋯）裡同一種材質的小零件合成一塊
 *   畫面每一塊都要畫一次（draw call），零件很多的模型合起來，手機、平板比較不會卡
 *   keep(mesh)：回傳 true 的零件不合（例如會動的部分）
 *   opts.keepShadow：照原本零件有沒有影子（不設的話合起來的都有影子）
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function mergeStatic(group, keep = () => false, { keepShadow = false } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(); // 材質的樣子 → { mat, list: [幾何] }
  const drop = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o === group || keep(o) || o.material?.wireframe || Array.isArray(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    // 長得一樣的材質（顏色、亮度、透明⋯都一樣）算同一種，就算是不同的物件也合在一起
    const m = o.material;
    const key = [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.side, m.transparent, m.opacity, m.map?.uuid, m.vertexColors, m.fog, m.depthWrite, keepShadow && o.castShadow, keepShadow && o.receiveShadow].join('|');
    const b = buckets.get(key) ?? { mat: m, list: [], cast: o.castShadow, recv: o.receiveShadow };
    b.list.push(g);
    buckets.set(key, b);
    drop.push(o);
  });
  for (const o of drop) o.parent?.remove(o);
  for (const { mat, list, cast, recv } of buckets.values()) {
    // 同一塊裡每個零件都有的屬性才留（有的有 uv、有的沒有，合不起來）
    const common = Object.keys(list[0].attributes).filter((k) => list.every((g) => g.attributes[k]));
    for (const g of list) for (const k of Object.keys(g.attributes)) if (!common.includes(k)) g.deleteAttribute(k);
    const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = keepShadow ? cast : true;
    if (keepShadow) m.receiveShadow = recv;
    group.add(m);
  }
  return group;
}
