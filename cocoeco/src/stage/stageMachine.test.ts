import { describe, expect, it } from "vitest";
import { next } from "./stageMachine";

describe("stageMachine", () => {
  it("走完幸福路径:loading→lampIntro→awaitTrace→pullback→explore→advance", () => {
    expect(next("loading", "ASSETS_READY")).toBe("lampIntro");
    expect(next("lampIntro", "INTRO_DONE")).toBe("awaitTrace");
    expect(next("awaitTrace", "TRACE_CLICKED")).toBe("pullback");
    expect(next("pullback", "PULLBACK_DONE")).toBe("explore");
    expect(next("explore", "WINDOW_CLICKED")).toBe("advance");
  });

  it("手势兜底:awaitTrace 和 explore 里滑动/滚轮等效推进", () => {
    expect(next("awaitTrace", "GESTURE_ADVANCE")).toBe("pullback");
    expect(next("explore", "GESTURE_ADVANCE")).toBe("advance");
  });

  it("非法转移返回 null(如加载中点击、探索态重复启程)", () => {
    expect(next("loading", "TRACE_CLICKED")).toBeNull();
    expect(next("explore", "TRACE_CLICKED")).toBeNull();
    expect(next("advance", "GESTURE_ADVANCE")).toBeNull();
  });
});
