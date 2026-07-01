// 数据层 i18n:数据库中的标的/用户数据是中文种子,UI 文案(useT)无法覆盖。
// 这里按 symbol / 原值做英文映射,渲染时按当前语言取值;中文界面或未命中时回退原值。
// 标的集合是固定种子数据,故用前端映射即可,无需为双语字段做数据库迁移。

import type { Lang } from "./i18n";

// 项目名:按 symbol 唯一映射(与 /rating 页保持一致)
const ASSET_NAME_EN: Record<string, string> = {
  "VCS-FOR-2021": "Yunnan Forest Management Carbon Sink",
  "CCER-SOL-2023": "Qinghai Solar PV",
  "GS-WIND-2022": "Rajasthan Wind (India)",
  "GS-MANG-2022": "Indonesia Mangrove Blue Carbon Restoration",
  "VCS-COOK-2020": "Kenya Efficient Cookstoves",
  "CDM-METH-2019": "Brazil Landfill Gas Capture",
};

// 项目类型 / 国家 / 登记簿:按原值映射(共享词汇,已是英文的值自动回退原值)
const PROJECT_TYPE_EN: Record<string, string> = {
  "林业碳汇": "Forestry sink",
  "可再生能源": "Renewable energy",
  "蓝碳": "Blue carbon",
  "能效": "Efficiency",
  "甲烷回收": "Methane capture",
};

const COUNTRY_EN: Record<string, string> = {
  "中国": "China",
  "印度": "India",
  "印度尼西亚": "Indonesia",
  "肯尼亚": "Kenya",
  "巴西": "Brazil",
};

const REGISTRY_EN: Record<string, string> = {
  "国家温室气体自愿减排登记簿": "China CCER Registry",
};

// 用户名:种子里带中文角色后缀(如 "Alice(碳资产开发商)")
const USER_NAME_EN: Record<string, string> = {
  "Alice（碳资产开发商）": "Alice (Carbon Developer)",
  "Bob（减排企业）": "Bob (Abatement Firm)",
  "Carol（碳基金）": "Carol (Carbon Fund)",
  "Dave（履约企业）": "Dave (Compliance Buyer)",
};

export const tName = (symbol: string, raw: string, lang: Lang): string =>
  lang === "en" ? ASSET_NAME_EN[symbol] ?? raw : raw;

export const tProjectType = (raw: string, lang: Lang): string =>
  lang === "en" ? PROJECT_TYPE_EN[raw] ?? raw : raw;

export const tCountry = (raw: string, lang: Lang): string =>
  lang === "en" ? COUNTRY_EN[raw] ?? raw : raw;

export const tRegistry = (raw: string, lang: Lang): string =>
  lang === "en" ? REGISTRY_EN[raw] ?? raw : raw;

export const tUserName = (raw: string, lang: Lang): string => {
  if (lang !== "en") return raw;
  if (USER_NAME_EN[raw]) return USER_NAME_EN[raw];
  if (raw.startsWith("做市商 ")) return raw.replace("做市商 ", "Market Maker ");
  return raw;
};
