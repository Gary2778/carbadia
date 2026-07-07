// 设备分档:full=实时 3D 舞台;static=定妆图+DOM 热点;reading=只留阅读长页。
export type Tier = "full" | "static" | "reading";

export function decideTier(env: {
  webgl2: boolean;
  deviceMemory?: number;
  reducedMotion: boolean;
  saveData?: boolean;
}): Tier {
  if (env.deviceMemory !== undefined && env.deviceMemory < 2) return "reading";
  if (!env.webgl2 || env.saveData) return "static";
  return "full"; // reduced-motion 走 full 但全程跳切(spec:reduced ≠ 降级)
}

export function detectEnv(): Parameters<typeof decideTier>[0] {
  const canvas = document.createElement("canvas");
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    webgl2: !!canvas.getContext("webgl2"),
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
