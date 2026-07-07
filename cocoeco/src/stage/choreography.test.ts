import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { buildPullback, extractPose } from "./choreography";

function cam(x: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(40);
  c.position.set(x, 0, 0);
  return c;
}

describe("choreography", () => {
  it("reduced-motion:时间线总时长为 0(跳切)且完成回调触发,位姿落到终点", () => {
    const onDone = vi.fn();
    const c = cam(0);
    const tl = buildPullback(c, extractPose(cam(0)), extractPose(cam(5)), { reduced: true, onDone });
    tl.progress(1);
    expect(tl.duration()).toBe(0);
    expect(onDone).toHaveBeenCalled();
    expect(c.position.x).toBeCloseTo(5);
  });

  it("正常模式:时长 >1.5s,结束位姿=目标", () => {
    const onDone = vi.fn();
    const c = cam(0);
    const tl = buildPullback(c, extractPose(cam(0)), extractPose(cam(5)), { reduced: false, onDone });
    tl.progress(1);
    expect(tl.duration()).toBeGreaterThan(1.5);
    expect(c.position.x).toBeCloseTo(5);
    expect(onDone).toHaveBeenCalled();
  });
});
