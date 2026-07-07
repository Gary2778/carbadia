"use client";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/content/dictionary";
import type { StageEvent, StageState } from "@/stage/stageMachine";
import { BEDROOM_HOTSPOTS } from "@/stage/hotspots";
import { KnowledgeCard } from "./KnowledgeCard";

export type ProjectFn = (anchor: string) => { x: number; y: number; inFront: boolean } | null;

// 舞台 DOM 覆盖层:所有文字与交互都在这里(SEO/无障碍/RTL 只作用于 DOM)。
export function StageOverlay({ state, dict, dispatch, project }: {
  state: StageState;
  dict: Dict;
  dispatch: (e: StageEvent) => void;
  project: ProjectFn;
}) {
  const [openCard, setOpenCard] = useState<number | null>(null);
  const lastGesture = useRef(0);

  // 手势兜底:滚轮/方向键/触摸滑动 = 推进(节流 800ms)
  useEffect(() => {
    if (state !== "awaitTrace" && state !== "explore") return;
    const fire = () => {
      const now = Date.now();
      if (now - lastGesture.current < 800) return;
      lastGesture.current = now;
      dispatch("GESTURE_ADVANCE");
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 20) fire(); };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) fire();
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY - e.touches[0].clientY > 40) fire();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [state, dispatch]);

  // 序幕旁白:lampIntro 逐行浮现,末行动画结束派发 INTRO_DONE
  const lines = dict.scenes.prologue.narration;

  return (
    <div className="pointer-events-none fixed inset-0 z-50" data-stage-overlay>
      {state === "loading" && (
        <div className="flex h-full items-center justify-center">
          <p className="voice animate-pulse text-lg text-[var(--gold)]">{dict.ui.loading}</p>
        </div>
      )}

      {state === "lampIntro" && (
        <div className="flex h-full flex-col items-start justify-center gap-3 px-8 sm:px-16">
          {lines.map((line, i) => (
            <p
              key={line}
              className="voice stage-line text-xl text-[var(--fg,#ece8dd)] sm:text-2xl"
              style={{ animationDelay: `${i * 900}ms` }}
              onAnimationEnd={i === lines.length - 1 ? () => dispatch("INTRO_DONE") : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {state === "awaitTrace" && (() => {
        const p = project("anchor_trace");
        return (
          <>
            {p?.inFront && (
              <button
                type="button"
                aria-label={dict.ui.hintTrace}
                onClick={() => dispatch("TRACE_CLICKED")}
                className="trace-glow pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: p.x, top: p.y }}
              >
                <span className="block h-6 w-6 rounded-full bg-[var(--accent)]/80 shadow-[0_0_24px_8px_rgba(122,208,166,0.55)]" />
                <span className="voice mt-3 block max-w-56 text-start text-sm leading-relaxed text-[var(--fg,#ece8dd)]/90">
                  {dict.ui.hintTrace}
                </span>
              </button>
            )}
            <p className="voice absolute bottom-6 end-6 text-xs opacity-50">{dict.ui.hintScroll}</p>
          </>
        );
      })()}

      {state === "explore" && (
        <>
          <p className="voice absolute left-1/2 top-8 max-w-xl -translate-x-1/2 px-4 text-center text-base text-[var(--fg,#ece8dd)]/90">
            {dict.scenes.bedroom.interactionHint}
          </p>
          {BEDROOM_HOTSPOTS.map((h) => {
            const p = project(h.anchor);
            if (!p?.inFront) return null;
            return (
              <button
                key={h.id}
                type="button"
                data-testid="hotspot"
                aria-label={dict.scenes.bedroom.cards![h.cardIndex].title}
                onClick={() => setOpenCard(h.cardIndex)}
                className="pointer-events-auto absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--gold)]/70 bg-[var(--gold)]/30 shadow-[0_0_14px_4px_rgba(245,201,123,0.35)] transition-transform hover:scale-125 motion-safe:animate-pulse"
                style={{ left: p.x, top: p.y }}
              />
            );
          })}
          {(() => {
            const p = project("anchor_window");
            if (!p?.inFront) return null;
            return (
              <button
                type="button"
                data-testid="advance-window"
                aria-label={dict.scenes.bedroom.transition}
                onClick={() => dispatch("WINDOW_CLICKED")}
                className="pointer-events-auto absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)]/80 shadow-[0_0_28px_10px_rgba(122,208,166,0.45)] transition-transform hover:scale-110 motion-safe:animate-pulse"
                style={{ left: p.x, top: p.y }}
              />
            );
          })()}
          {openCard !== null && (
            <div className="pointer-events-auto absolute inset-x-4 bottom-8 mx-auto max-w-xl sm:inset-x-auto sm:end-10">
              <div className="flex flex-col gap-2 rounded-lg bg-[#0b0f1a]/90 p-3 backdrop-blur">
                <KnowledgeCard {...dict.scenes.bedroom.cards![openCard]} />
                <button
                  type="button"
                  onClick={() => setOpenCard(null)}
                  className="self-end rounded-md border border-[var(--card-border)] px-3 py-1 text-sm opacity-80 hover:opacity-100"
                >
                  {dict.ui.cardClose}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
