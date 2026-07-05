"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_LANG, type Lang } from "./config";
import { resolveDict, type Dict } from "@/content/dictionary";

type I18nValue = { lang: Lang; dict: Dict };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // M1 固定 zh;M8 引入语言切换后由此处派发 setLang
  const [value] = useState<I18nValue>(() => ({
    lang: DEFAULT_LANG,
    dict: resolveDict(DEFAULT_LANG),
  }));
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n 必须在 I18nProvider 内使用");
  return ctx;
}

export function useDict(): Dict {
  return useI18n().dict;
}

export function useLang(): Lang {
  return useI18n().lang;
}
