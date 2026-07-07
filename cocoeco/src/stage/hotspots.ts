import * as THREE from "three";

// 卧室知识卡热点:anchor = glb 内空节点名,cardIndex = dict.scenes.bedroom.cards 下标
// (0=台灯 1=空调 2=外卖盒 3=手机充电器,顺序与词典一致)
export const BEDROOM_HOTSPOTS = [
  { id: "lamp", anchor: "anchor_hs_lamp", cardIndex: 0 },
  { id: "ac", anchor: "anchor_hs_ac", cardIndex: 1 },
  { id: "takeout", anchor: "anchor_hs_takeout", cardIndex: 2 },
  { id: "charger", anchor: "anchor_hs_charger", cardIndex: 3 },
] as const;

export function projectToScreen(
  world: THREE.Vector3,
  cam: THREE.PerspectiveCamera,
  w: number,
  h: number,
): { x: number; y: number; inFront: boolean } {
  const v = world.clone().project(cam);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, inFront: v.z < 1 };
}
