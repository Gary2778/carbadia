"use client";

import { useEffect, useState } from "react";
import { SCENES } from "@/scenes/registry";
import { useDict } from "@/i18n/I18nProvider";

// 分子进度条:细轨 + 发光分子沿旅程移动;刻度可点击跳章。
export function ProgressBar() {
  const dict = useDict();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      role="navigation"
      aria-label={dict.ui.progressAria}
      className="fixed inset-x-0 top-[52px] z-40 h-4"
    >
      <div className="relative mx-auto h-full max-w-5xl px-4">
        <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/15" />
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-[var(--accent)] transition-[width] duration-150"
          style={{ insetInlineStart: "1rem", width: `calc(${progress} * (100% - 2rem))` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
          style={{ insetInlineStart: `calc(1rem + ${progress} * (100% - 2rem) - 4px)` }}
        />
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
          {SCENES.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              title={dict.scenes[id].menuName}
              aria-label={dict.scenes[id].menuName}
              className="size-3 -translate-y-[5px] rounded-full border border-white/25 bg-transparent transition-colors hover:border-[var(--accent)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
