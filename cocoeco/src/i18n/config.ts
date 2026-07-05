// 16 语配置,与 carbadia 交易所对齐(LANG_META 逐字复制仓库根 src/i18n/config.ts)。
// M1 仅 zh 有词典,其余语言 M8 接入。
export type Lang =
  | "en" | "da" | "de" | "es" | "fr" | "it" | "nl" | "pl"
  | "pt" | "fi" | "sv" | "ja" | "ko" | "ar" | "zh" | "zh-TW";

export const DEFAULT_LANG: Lang = "zh";

export const LANG_META: Record<Lang, { label: string; htmlLang: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", htmlLang: "en", dir: "ltr" },
  da: { label: "Dansk", htmlLang: "da", dir: "ltr" },
  de: { label: "Deutsch", htmlLang: "de", dir: "ltr" },
  es: { label: "Español", htmlLang: "es", dir: "ltr" },
  fr: { label: "Français", htmlLang: "fr", dir: "ltr" },
  it: { label: "Italiano", htmlLang: "it", dir: "ltr" },
  nl: { label: "Nederlands", htmlLang: "nl", dir: "ltr" },
  pl: { label: "Polski", htmlLang: "pl", dir: "ltr" },
  pt: { label: "Português", htmlLang: "pt-BR", dir: "ltr" },
  fi: { label: "Suomi", htmlLang: "fi", dir: "ltr" },
  sv: { label: "Svenska", htmlLang: "sv", dir: "ltr" },
  ja: { label: "日本語", htmlLang: "ja", dir: "ltr" },
  ko: { label: "한국어", htmlLang: "ko", dir: "ltr" },
  ar: { label: "العربية", htmlLang: "ar", dir: "rtl" },
  zh: { label: "简体中文", htmlLang: "zh-CN", dir: "ltr" },
  "zh-TW": { label: "繁體中文", htmlLang: "zh-TW", dir: "ltr" },
};
