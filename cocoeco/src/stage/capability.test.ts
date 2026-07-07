import { describe, expect, it } from "vitest";
import { decideTier } from "./capability";

describe("decideTier", () => {
  it("全能设备 → full(reducedMotion 只影响动画不降档)", () => {
    expect(decideTier({ webgl2: true, deviceMemory: 8, reducedMotion: false })).toBe("full");
    expect(decideTier({ webgl2: true, deviceMemory: 8, reducedMotion: true })).toBe("full");
  });

  it("无 WebGL2 → static;省流模式 → static", () => {
    expect(decideTier({ webgl2: false, reducedMotion: false })).toBe("static");
    expect(decideTier({ webgl2: true, saveData: true, reducedMotion: false })).toBe("static");
  });

  it("内存 <2GB → reading", () => {
    expect(decideTier({ webgl2: true, deviceMemory: 1, reducedMotion: false })).toBe("reading");
  });
});
