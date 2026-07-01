"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "carbadia-theme";
const DEFAULT_THEME: Theme = "light"; // 默认浅色（首次访问）；深色（Peppa 星空 + Ransom 标题）需手动切换

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ theme: DEFAULT_THEME, setTheme: () => {}, toggle: () => {} });

/**
 * 主题在 SSR/首帧始终按默认浅色渲染（与 layout 上 data-theme="light" 一致），
 * 避免水合不匹配；layout 里的内联脚本会在首帧绘制前按 localStorage 纠正 CSS 主题，
 * 挂载后这里再同步 React 状态。Light 为默认；切到 Dark 才启用星空与 Ransom 文字。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  const apply = (t: Theme) => {
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = t;
      document.documentElement.style.colorScheme = t;
    }
  };

  // 挂载后读取偏好（SSR/首帧按默认深色，缺省时无需 setState，避免无谓重渲染）
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "light" || saved === "dark") apply(saved);
  }, []);

  const setTheme = (t: Theme) => {
    apply(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
