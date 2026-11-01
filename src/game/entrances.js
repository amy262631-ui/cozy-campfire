/**
 * 森林裡各區入口的位置（純資料：前端畫建築、伺服器的營地居民走路都用這份）。
 *   angle：繞著營火的角度　trigger：走到這裡就進去　build：建築物中心
 * 交流帳篷、樹屋往外移，和營火河畔之間留多一點空間。
 */
export const ENTRANCE_GEO = {
  tent_focus: { angle: 2.6, trigger: 13.6, build: 15.3 },
  treehouse_music: { angle: -2.2, trigger: 15.6, build: 17.3 },
  lake_dock: { angle: 1.15, trigger: 13.6, build: 15.3 },
  tent_social: { angle: -1.25, trigger: 15.6, build: 17.3 },
  campground: { angle: -2.95, trigger: 13.6, build: 15.3 },
};

const polar = (a, r) => ({ x: Math.sin(a) * r, z: Math.cos(a) * r });
/** 入口觸發點往內（負）或往外（正）offset 公尺的位置 */
export const ENTRANCE_POS = Object.fromEntries(
  Object.entries(ENTRANCE_GEO).map(([id, g]) => [id, (offset = 0) => polar(g.angle, g.trigger + offset)]),
);
