"use client";

import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT({
    en: { text: "Carbadia · Carbon Credit Exchange · carbadia.io — demo only, not real trading" },
    zh: { text: "Carbadia · 碳信用交易所 · carbadia.io — 仅供演示, 非真实交易" },
  });
  return (
    <footer className="border-t border-border text-muted text-xs text-center py-6">{t.text}</footer>
  );
}
