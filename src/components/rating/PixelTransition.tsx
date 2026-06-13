"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { useTheme } from "@/lib/theme";

export type Pt = { x: number; y: number };
type Origin = { points: Pt[]; click: Pt };

const GREEN = "#0a8a52";
const GLOW = "#16d97f";
// 深色模式:覆盖层由不同深浅的紫色方块拼成(由深到浅)
const PURPLES = ["#2c1a52", "#3b2470", "#4c2f93", "#5d3bb5", "#6f49d6", "#8159ee", "#9a72ff"];
const PURPLE_GLOW = "#b794ff";
const TARGET = "/rating";

type TransitionApi = { enter: (o: Origin) => void };
const TransitionCtx = createContext<TransitionApi>({ enter: () => {} });
const RevealCtx = createContext<() => void>(() => {});

export const useRatingTransition = () => useContext(TransitionCtx);

/** /rating 页挂载时调用：若正处于像素遮罩态则丝滑揭开，否则无副作用 */
export function useRatingReveal() {
  const reveal = useContext(RevealCtx);
  useEffect(() => {
    reveal();
  }, [reveal]);
}

const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Phase = "idle" | "rush" | "cover" | "reveal";

export function PixelTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { theme } = useTheme();
  const darkRef = useRef(false);
  darkRef.current = theme === "dark";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const frameRef = useRef<() => void>(() => {});
  const st = useRef({
    phase: "idle" as Phase,
    t0: 0,
    coverT0: 0,
    pendingReveal: false,
    parts: [] as { x: number; y: number; vx: number; vy: number; sz: number }[],
    cells: [] as { x: number; y: number; cell: number; delay: number; color: string }[],
    W: 0,
    H: 0,
  });

  const fit = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.current.W = W;
    st.current.H = H;
    return ctx;
  };

  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, st.current.W, st.current.H);
  };

  const buildCells = () => {
    const { W, H } = st.current;
    const dark = darkRef.current;
    const cell = 24;
    const cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const cells: typeof st.current.cells = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        cells.push({
          x: x * cell,
          y: y * cell,
          cell,
          delay: (y / rows) * 0.5 + Math.random() * 0.18,
          // 深色:每格随机一档紫色 → 不同深浅的紫色方块拼出覆盖层;浅色保持原绿
          color: dark ? PURPLES[(Math.random() * PURPLES.length) | 0] : GREEN,
        });
    st.current.cells = cells;
  };

  const loop = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = st.current;
    const dark = darkRef.current;
    const now = performance.now();
    ctx.clearRect(0, 0, s.W, s.H);

    // 深色:用不同深浅的紫色方格铺满;浅色:沿用整片绿
    const paint = (alpha: number) => {
      ctx.globalAlpha = alpha;
      if (dark) {
        for (const c of s.cells) {
          ctx.fillStyle = c.color;
          ctx.fillRect(c.x, c.y, c.cell + 1, c.cell + 1);
        }
      } else {
        ctx.fillStyle = GREEN;
        ctx.fillRect(0, 0, s.W, s.H);
      }
      ctx.globalAlpha = 1;
    };

    if (s.phase === "rush") {
      const e = (now - s.t0) / 520;
      for (const p of s.parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 1.04;
        p.vy *= 1.04;
        p.sz *= 1.085;
        ctx.fillStyle = dark ? PURPLE_GLOW : GLOW;
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      }
      paint(clamp((e - 0.45) / 0.55, 0, 1));
      if (e >= 1) {
        s.phase = "cover";
        s.coverT0 = now;
        router.push(TARGET);
      }
    } else if (s.phase === "cover") {
      paint(1);
      const held = now - s.coverT0;
      if ((s.pendingReveal && held > 200) || held > 1600) {
        s.phase = "reveal";
        s.t0 = now;
      }
    } else if (s.phase === "reveal") {
      const e = (now - s.t0) / 720;
      for (const c of s.cells) {
        const k = easeIO(clamp((e - c.delay) / 0.4, 0, 1));
        if (k < 1) {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = c.color;
          const sh = k * c.cell;
          ctx.fillRect(c.x, c.y + sh * 0.6, c.cell + 1, c.cell - sh + 1);
        }
      }
      ctx.globalAlpha = 1;
      if (e >= 1.25) {
        s.phase = "idle";
        s.pendingReveal = false;
        stop();
        return;
      }
    }
    raf.current = requestAnimationFrame(() => frameRef.current());
  }, [router]);

  useEffect(() => {
    frameRef.current = loop;
  }, [loop]);

  const enter = useCallback(
    (o: Origin) => {
      if (reduced) {
        router.push(TARGET);
        return;
      }
      const s = st.current;
      if (s.phase !== "idle") return;
      if (!fit()) {
        router.push(TARGET);
        return;
      }
      buildCells(); // 预先生成紫色方格(供 rush 渐显 / cover 覆盖 / reveal 揭开复用)
      s.parts = o.points.map((p) => {
        const dx = p.x - o.click.x;
        const dy = p.y - o.click.y;
        const m = Math.hypot(dx, dy) || 1;
        const sp = 3 + Math.random() * 5;
        return { x: p.x, y: p.y, vx: (dx / m) * sp, vy: (dy / m) * sp, sz: 6 };
      });
      s.phase = "rush";
      s.t0 = performance.now();
      s.pendingReveal = false;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => frameRef.current());
      // 兜底：若 rAF 被节流/暂停（后台标签页等），保证仍会导航
      window.setTimeout(() => {
        if (st.current.phase === "rush") {
          st.current.phase = "cover";
          st.current.coverT0 = performance.now();
          router.push(TARGET);
        }
      }, 700);
    },
    [reduced, router]
  );

  const reveal = useCallback(() => {
    const s = st.current;
    if (s.phase === "rush" || s.phase === "cover") s.pendingReveal = true;
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <TransitionCtx.Provider value={{ enter }}>
      <RevealCtx.Provider value={reveal}>
        {children}
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 80 }}
        />
      </RevealCtx.Provider>
    </TransitionCtx.Provider>
  );
}
