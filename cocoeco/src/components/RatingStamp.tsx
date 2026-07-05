"use client";

import { useState } from "react";
import { useDict } from "@/i18n/I18nProvider";

// 评级所盖章交互(骨架版:按钮 + 反馈文案;3D 版在 M5 增强)
export function RatingStamp() {
  const dict = useDict();
  const it = dict.scenes.rating.interaction!;
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-5 py-4">
      <p className="font-medium">{it.prompt}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setFeedback(it.feedbackApprove!)}
          className="rounded-full border border-[var(--accent)] px-4 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          {it.approve}
        </button>
        <button
          type="button"
          onClick={() => setFeedback(it.feedbackDoubt!)}
          className="rounded-full border border-[var(--muted)] px-4 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
        >
          {it.doubt}
        </button>
      </div>
      <p aria-live="polite" className="min-h-6 text-sm opacity-80">
        {feedback ?? ""}
      </p>
    </div>
  );
}
