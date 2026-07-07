// 序幕+卧室舞台状态机:纯函数,一切副作用(动画/音频/DOM)由调用方在转移后执行。
export type StageState = "loading" | "lampIntro" | "awaitTrace" | "pullback" | "explore" | "advance";
export type StageEvent =
  | "ASSETS_READY" | "INTRO_DONE" | "TRACE_CLICKED"
  | "PULLBACK_DONE" | "WINDOW_CLICKED" | "GESTURE_ADVANCE";

const TRANSITIONS: Record<StageState, Partial<Record<StageEvent, StageState>>> = {
  loading: { ASSETS_READY: "lampIntro" },
  lampIntro: { INTRO_DONE: "awaitTrace" },
  awaitTrace: { TRACE_CLICKED: "pullback", GESTURE_ADVANCE: "pullback" },
  pullback: { PULLBACK_DONE: "explore" },
  explore: { WINDOW_CLICKED: "advance", GESTURE_ADVANCE: "advance" },
  advance: {},
};

export function next(state: StageState, event: StageEvent): StageState | null {
  return TRANSITIONS[state][event] ?? null;
}
