import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BEDROOM_HOTSPOTS, projectToScreen } from "./hotspots";

describe("hotspots", () => {
  it("热点表:4 项、cardIndex 覆盖 0-3、锚点名规范", () => {
    expect(BEDROOM_HOTSPOTS).toHaveLength(4);
    expect(new Set(BEDROOM_HOTSPOTS.map((h) => h.cardIndex))).toEqual(new Set([0, 1, 2, 3]));
    for (const h of BEDROOM_HOTSPOTS) expect(h.anchor).toMatch(/^anchor_hs_/);
  });

  it("镜头正前方的点投影到画面中心附近且 inFront", () => {
    const cam = new THREE.PerspectiveCamera(40, 1);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const p = projectToScreen(new THREE.Vector3(0, 0, 0), cam, 800, 600);
    expect(p.inFront).toBe(true);
    expect(p.x).toBeCloseTo(400);
    expect(p.y).toBeCloseTo(300);
  });

  it("镜头背后的点 inFront=false", () => {
    const cam = new THREE.PerspectiveCamera(40, 1);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    expect(projectToScreen(new THREE.Vector3(0, 0, 10), cam, 800, 600).inFront).toBe(false);
  });
});
