"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { useTheme } from "@/lib/theme";
import { PaperTear, PAPER_GROW_MS, PAPER_TEAR_MS, preloadPatches, type PaperPhase } from "./PaperTear";

export type Pt = { x: number; y: number };
type Origin = { points: Pt[]; click: Pt };

const GREEN = "#0a8a52";
const GLOW = "#16d97f";
// 深色模式:统一的紫色覆盖层(粒子高光用更亮的一档)
const PURPLE = "#6d3fc4";
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

// 撕纸(深色)时序:涨满后 hold,rating 挂载(reveal)后稍候撕开;未收到 reveal 的兜底与 canvas 版一致
const PAPER_REVEAL_DELAY = 120;
const PAPER_HOLD_MAX = 650;

export function PixelTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { theme } = useTheme();
  const darkRef = useRef(false);
  useEffect(() => {
    darkRef.current = theme === "dark";
  }, [theme]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const frameRef = useRef<() => void>(() => {});
  // 深色撕纸:DOM 覆盖层用 React 状态渲染,相位由计时器推进(不依赖 rAF,后台标签页也能完成导航)
  const [paper, setPaper] = useState<{ phase: PaperPhase; ox: number; oy: number } | null>(null);
  const paperSt = useRef({ active: false, phase: "idle" as "idle" | PaperPhase, pendingReveal: false, timers: [] as number[] });
  const st = useRef({
    phase: "idle" as Phase,
    t0: 0,
    coverT0: 0,
    pendingReveal: false,
    parts: [] as { x: number; y: number; vx: number; vy: number; sz: number }[],
    cells: [] as { x: number; y: number; cell: number; delay: number }[],
    W: 0,
    H: 0,
    fromPath: "", // 转场发起页:rush 期间用户已导航离开时不再劫持 push
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
    const cell = 24;
    const cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const cells: typeof st.current.cells = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        cells.push({ x: x * cell, y: y * cell, cell, delay: (y / rows) * 0.5 + Math.random() * 0.18 });
    st.current.cells = cells;
  };

  const loop = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = st.current;
    const dark = darkRef.current;
    const now = performance.now();
    ctx.clearRect(0, 0, s.W, s.H);

    // 覆盖色:深色统一紫、浅色绿
    const coverColor = dark ? PURPLE : GREEN;
    const paint = (alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = coverColor;
      ctx.fillRect(0, 0, s.W, s.H);
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
        // rush 期间用户已后退/导航离开:覆盖继续走完自愈,但不再劫持导航
        if (window.location.pathname === s.fromPath) router.push(TARGET);
      }
    } else if (s.phase === "cover") {
      paint(1);
      const held = now - s.coverT0;
      if ((s.pendingReveal && held > 120) || held > 650) {
        s.phase = "reveal";
        s.t0 = now;
      }
    } else if (s.phase === "reveal") {
      const e = (now - s.t0) / 720;
      for (const c of s.cells) {
        const k = easeIO(clamp((e - c.delay) / 0.4, 0, 1));
        if (k < 1) {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = coverColor;
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

  const paperTimer = useCallback((fn: () => void, ms: number) => {
    paperSt.current.timers.push(window.setTimeout(fn, ms));
  }, []);

  const startTear = useCallback(() => {
    const p = paperSt.current;
    if (p.phase !== "hold") return;
    p.phase = "tear";
    setPaper((cur) => (cur ? { ...cur, phase: "tear" } : cur));
    paperTimer(() => {
      p.active = false;
      p.phase = "idle";
      p.pendingReveal = false;
      setPaper(null);
      p.timers.length = 0; // 本轮计时器已全部走完,防止数组随会话无限增长
    }, PAPER_TEAR_MS);
  }, [paperTimer]);

  // 深色模式:撕纸流程(grow 涨满 → push → hold → tear),时序语义与 canvas 版对齐
  const enterPaper = useCallback(
    (o: Origin) => {
      const p = paperSt.current;
      if (p.active || st.current.phase !== "idle") {
        // 转场进行中再点:调用方已 preventDefault,静默 return 会吞掉点击——至少保证导航
        router.push(TARGET);
        return;
      }
      p.active = true;
      p.phase = "grow";
      p.pendingReveal = false;
      const from = window.location.pathname;
      setPaper({ phase: "grow", ox: o.click.x, oy: o.click.y });
      paperTimer(() => {
        // 涨纸的 420ms 里用户已后退/点去别处:放弃转场,不劫持导航
        if (window.location.pathname !== from) {
          p.active = false;
          p.phase = "idle";
          p.pendingReveal = false;
          p.timers.length = 0;
          setPaper(null);
          return;
        }
        p.phase = "hold";
        setPaper((cur) => (cur ? { ...cur, phase: "hold" } : cur));
        router.push(TARGET);
        if (p.pendingReveal) paperTimer(startTear, PAPER_REVEAL_DELAY);
        else paperTimer(startTear, PAPER_HOLD_MAX); // rating 迟迟未挂载的兜底
      }, PAPER_GROW_MS);
    },
    [paperTimer, router, startTear]
  );

  const enter = useCallback(
    (o: Origin) => {
      if (reduced) {
        router.push(TARGET);
        return;
      }
      if (darkRef.current) {
        enterPaper(o);
        return;
      }
      const s = st.current;
      // 互斥双向都要查:撕纸(深色)进行中切到浅色再点入口,不能叠着启动 canvas 流程;
      // 但调用方已 preventDefault,静默 return 会吞掉点击——兜底导航
      if (s.phase !== "idle" || paperSt.current.active) {
        router.push(TARGET);
        return;
      }
      s.fromPath = window.location.pathname;
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
          if (window.location.pathname === st.current.fromPath) router.push(TARGET);
        }
      }, 700);
    },
    [reduced, router, enterPaper]
  );

  const reveal = useCallback(() => {
    const s = st.current;
    if (s.phase === "rush" || s.phase === "cover") s.pendingReveal = true;
    const p = paperSt.current;
    if (p.active) {
      if (p.phase === "grow") p.pendingReveal = true;
      else if (p.phase === "hold") paperTimer(startTear, PAPER_REVEAL_DELAY);
    }
  }, [paperTimer, startTear]);

  // 深色模式空闲时预载贴纸,首次撕纸不缺图
  useEffect(() => {
    if (theme !== "dark") return;
    const t = window.setTimeout(preloadPatches, 1200);
    return () => window.clearTimeout(t);
  }, [theme]);

  useEffect(() => {
    const pst = paperSt.current;
    return () => {
      cancelAnimationFrame(raf.current);
      for (const t of pst.timers) window.clearTimeout(t);
    };
  }, []);

  return (
    <TransitionCtx.Provider value={{ enter }}>
      <RevealCtx.Provider value={reveal}>
        {children}
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 80 }}
        />
        {paper && <PaperTear phase={paper.phase} ox={paper.ox} oy={paper.oy} />}
      </RevealCtx.Provider>
    </TransitionCtx.Provider>
  );
}
