// 10 幕顺序唯一事实源:滚动顺序、锚点 id、章节菜单、进度条刻度都从这里来。
export const SCENES = [
  "prologue", "bedroom", "city", "atmosphere", "forestSea",
  "market", "rating", "rebirth", "camp", "dawn",
] as const;

export type SceneId = (typeof SCENES)[number];

// M0 定稿:每幕背景沿"夜→黎明"光谱推进;ink 标记该背景上的文字明暗。
export const SCENE_THEME: Record<SceneId, { bg: string; ink: "light" | "dark" }> = {
  prologue: { bg: "#0a0e1c", ink: "light" },
  bedroom: { bg: "#0b0f1a", ink: "light" },
  city: { bg: "#10142a", ink: "light" },
  atmosphere: { bg: "#1c1a3e", ink: "light" },
  forestSea: { bg: "#162830", ink: "light" },
  market: { bg: "#232048", ink: "light" },
  rating: { bg: "#3a2b56", ink: "light" },
  rebirth: { bg: "#6e3d6b", ink: "light" },
  camp: { bg: "#b4637a", ink: "light" },
  dawn: { bg: "#f5d9a8", ink: "dark" },
};
