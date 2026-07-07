import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyBakedMaterials, collectAnchors } from "./loadBedroom";

function fakeGroup(): THREE.Group {
  const g = new THREE.Group();
  const baked = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({
      emissiveMap: new THREE.Texture(),
      emissive: new THREE.Color(1, 1, 1),
    }),
  );
  baked.name = "g_bed";
  const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  glass.name = "win_glass.001";
  const anchor = new THREE.Object3D();
  anchor.name = "anchor_hs_lamp";
  anchor.position.set(0.3, 0.95, -2.12);
  g.add(baked, glass, anchor);
  return g;
}

describe("loadBedroom helpers", () => {
  it("烘焙组换成 MeshBasicMaterial 并沿用贴图", () => {
    const g = fakeGroup();
    applyBakedMaterials(g);
    const m = (g.getObjectByName("g_bed") as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(m.type).toBe("MeshBasicMaterial");
    expect(m.map).not.toBeNull();
  });

  it("窗玻璃(带 .001 后缀)变半透明", () => {
    const g = fakeGroup();
    applyBakedMaterials(g);
    const m = (g.getObjectByName("win_glass.001") as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(m.transparent).toBe(true);
    expect(m.opacity).toBeLessThan(0.4);
  });

  it("collectAnchors 抓出全部 anchor_* 的世界坐标", () => {
    const anchors = collectAnchors(fakeGroup());
    expect(anchors.get("anchor_hs_lamp")).toBeInstanceOf(THREE.Vector3);
    expect(anchors.get("anchor_hs_lamp")!.x).toBeCloseTo(0.3);
  });
});
