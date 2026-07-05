import { describe, expect, it } from "vitest";
import { SCENES, SCENE_THEME } from "./registry";

describe("scene registry", () => {
  it("有且仅有 10 幕,顺序为序幕→黎明", () => {
    expect(SCENES).toEqual([
      "prologue", "bedroom", "city", "atmosphere", "forestSea",
      "market", "rating", "rebirth", "camp", "dawn",
    ]);
  });

  it("id 无重复", () => {
    expect(new Set(SCENES).size).toBe(SCENES.length);
  });

  it("每幕都有光谱背景色(夜→黎明),黎明段标记深色文字", () => {
    for (const id of SCENES) {
      expect(SCENE_THEME[id].bg).toMatch(/^#[0-9a-f]{6}$/i);
    }
    // 光谱首端是深夜,末端是黎明
    expect(SCENE_THEME.prologue.ink).toBe("light");
    expect(SCENE_THEME.dawn.ink).toBe("dark");
  });
});
