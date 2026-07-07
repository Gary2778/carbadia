import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { tracePath, createMotes } from "./motes";

const A = new THREE.Vector3(2.12, 1.25, -0.3); // 灯上方(glTF Y-up 示意)
const B = new THREE.Vector3(2.53, 1.65, 0); // 窗

describe("motes", () => {
  it("路径两端命中起终点", () => {
    expect(tracePath(A, B, 0).distanceTo(A)).toBeLessThan(1e-6);
    expect(tracePath(A, B, 1).distanceTo(B)).toBeLessThan(1e-6);
  });

  it("路径中段高于两端(向上弧)", () => {
    const mid = tracePath(A, B, 0.5);
    expect(mid.y).toBeGreaterThan(Math.max(A.y, B.y) - 0.01);
  });

  it("生成 13 粒微光", () => {
    const pts = createMotes(A, B);
    expect(pts.geometry.getAttribute("position").count).toBe(13);
    expect(pts.name).toBe("motes");
  });
});
