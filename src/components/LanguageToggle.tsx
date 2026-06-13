"use client";

import { motion } from "motion/react";
import { useLang, type Lang } from "@/lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="relative flex items-center rounded-full bg-surface-2 border border-border p-0.5 text-xs">
      {OPTIONS.map((o) => {
        const active = lang === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setLang(o.value)}
            className="relative px-2 py-0.5 rounded-full font-medium"
            aria-pressed={active}
            aria-label={o.value === "en" ? "English" : "中文"}
          >
            {active && (
              <motion.span
                layoutId="lang-active"
                className="absolute inset-0 bg-surface rounded-full shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className={`relative ${active ? "text-foreground" : "text-muted"}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
