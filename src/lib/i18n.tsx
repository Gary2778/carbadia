"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "carbadia-lang";
const DEFAULT_LANG: Lang = "en"; // 界面默认英文

type LangCtx = { lang: Lang; setLang: (l: Lang) => void };
const Ctx = createContext<LangCtx>({ lang: DEFAULT_LANG, setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // 挂载后读取已保存的偏好（SSR 始终按默认英文渲染，避免水合不一致）
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "zh" || saved === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 水合安全模式:SSR 按默认英文渲染,挂载后才能读 localStorage 纠正
      setLangState(saved);
      document.documentElement.lang = saved === "zh" ? "zh-CN" : "en";
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/**
 * 组件就近携带自己的文案：
 *   const t = useT({ en: { hi: "Hi" }, zh: { hi: "你好" } });
 *   t.hi
 * 无需中央字典，便于各页独立维护与并行开发。
 */
export function useT<T>(dict: { en: T; zh: T }): T {
  const { lang } = useLang();
  return dict[lang];
}
