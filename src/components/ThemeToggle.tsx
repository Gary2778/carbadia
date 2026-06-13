"use client";

import { motion } from "motion/react";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const tx = useT({
    en: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
    zh: { toLight: "切换到浅色模式", toDark: "切换到深色模式" },
  });

  return (
    <button
      onClick={toggle}
      aria-label={dark ? tx.toLight : tx.toDark}
      aria-pressed={dark}
      className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-foreground transition-colors hover:border-accent/50"
    >
      <motion.span
        key={dark ? "moon" : "sun"}
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="absolute"
        aria-hidden
      >
        {dark ? (
          // 弯月
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
              fill="#ffe9a8"
              stroke="#e8c96a"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // 太阳
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4.4" fill="#f5a623" />
            <g stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
            </g>
          </svg>
        )}
      </motion.span>
    </button>
  );
}
