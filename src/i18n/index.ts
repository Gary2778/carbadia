// 16 语文案注册表:全部静态导入(每个文件类型 = typeof en,编译期保证无缺翻译)。
// 静态导入而非按需 import():规避 SSR 水合与切换闪烁,总体积对演示盘可接受。
import type { Lang } from "./config";
import en, { type Messages } from "./messages/en";
import da from "./messages/da";
import de from "./messages/de";
import es from "./messages/es";
import fr from "./messages/fr";
import it from "./messages/it";
import nl from "./messages/nl";
import pl from "./messages/pl";
import pt from "./messages/pt";
import fi from "./messages/fi";
import sv from "./messages/sv";
import ja from "./messages/ja";
import ko from "./messages/ko";
import ar from "./messages/ar";
import zh from "./messages/zh";
import zhTW from "./messages/zh-TW";

export const MESSAGES: Record<Lang, Messages> = {
  en,
  da,
  de,
  es,
  fr,
  it,
  nl,
  pl,
  pt,
  fi,
  sv,
  ja,
  ko,
  ar,
  zh,
  "zh-TW": zhTW,
};

export type { Messages };
