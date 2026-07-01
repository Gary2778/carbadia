"use client";

import { useT } from "@/lib/i18n";

/**
 * 行动点合规提示(下单/挂牌等处):简短一行,中英双语。
 * 完整合规声明在页脚 Footer。
 */
export function ComplianceNote({ className = "" }: { className?: string }) {
  const t = useT({
    en: { text: "Demo only — simulated orders involve no real funds or carbon assets, and are not investment advice." },
    zh: { text: "仅为模拟演示 — 下单不涉及任何真实资金或碳资产,且不构成投资建议。" },
  });
  return <p className={`text-[11px] leading-relaxed text-muted ${className}`}>{t.text}</p>;
}
