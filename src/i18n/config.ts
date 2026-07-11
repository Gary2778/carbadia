// 语言注册表:16 种界面语言。
// LANGS 的顺序就是下拉菜单顺序:English 置顶(默认语言),欧语按本语言名 A–Z,
// 日韩、阿拉伯语随后,简繁中文按产品要求垫底。
export const LANGS = [
  "en",
  "da",
  "de",
  "es",
  "fr",
  "it",
  "nl",
  "pl",
  "pt",
  "fi",
  "sv",
  "ja",
  "ko",
  "ar",
  "zh",
  "zh-TW",
] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

// label 用本语言原名(endonym):丹麦用户找的是 "Dansk" 而不是 "Danish"
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

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

// CJK 标题字形高、行距要收紧;也用于首页 hero 字号策略
export const isCJK = (lang: Lang) => lang === "zh" || lang === "zh-TW" || lang === "ja" || lang === "ko";

// 阿拉伯文字母连写:逐字符拆分动画会破坏字形,必须按词拆分
export const splitsByWord = (lang: Lang) => lang === "ar";
