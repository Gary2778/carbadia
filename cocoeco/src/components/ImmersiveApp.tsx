"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useDict } from "@/i18n/I18nProvider";
import { decideTier, detectEnv, type Tier } from "@/stage/capability";
import { projectToScreen } from "@/stage/hotspots";
import type { StageHandle } from "@/stage/Stage";
import type { StageEvent, StageState } from "@/stage/stageMachine";
import { StageOverlay, type ProjectFn } from "./StageOverlay";

const Stage = dynamic(() => import("@/stage/Stage").then((m) => m.Stage), { ssr: false });

// 静态降级:fallback.jpg 上手工标定的热点位置(占视口百分比)
const STATIC_POS: Record<string, { x: number; y: number }> = {
  anchor_hs_lamp: { x: 0.32, y: 0.47 },
  anchor_hs_ac: { x: 0.34, y: 0.16 },
  anchor_hs_takeout: { x: 0.5, y: 0.38 },
  anchor_hs_charger: { x: 0.3, y: 0.49 },
  anchor_window: { x: 0.37, y: 0.3 },
  anchor_trace: { x: 0.33, y: 0.42 },
};

export function ImmersiveApp() {
  const dict = useDict();
  const [tier, setTier] = useState<Tier | null>(null); // null = SSR/未定档 → 只渲染阅读层
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<StageState>("loading");
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);
  const handleRef = useRef<StageHandle | null>(null);
  const reducedRef = useRef(false);

  // 客户端能力检测只能在挂载后做(SSR 无 DOM);首帧只渲染阅读层,定档后一次性切入。
  // 同步 setState 是有意为之(首帧就定档,避免闪烁),对 hooks 规则逐行豁免。
  useEffect(() => {
    if (sessionStorage.getItem("cocoecoMode") === "reading") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
      return;
    }
    const params = new URLSearchParams(location.search);
    const q = params.get("tier"); // 调试口:?tier=static
    const env = detectEnv();
    const red = env.reducedMotion || params.get("motion") === "reduced"; // 调试口:?motion=reduced
    reducedRef.current = red;
     
    setReduced(red);
     
    setTier(q === "static" ? "static" : q === "reading" ? "reading" : decideTier(env));
     
    if (q === "static") setState("explore");
  }, []);

  const active = !dismissed && (tier === "full" || tier === "static");

  // 舞台激活期间锁页面滚动(阅读长页仍在 DOM 里,SEO 不受影响)
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // 投影刷新:状态变化 / resize / 慢速心跳(相机静止时够用,拉镜期间热点本来就不渲染)
  useEffect(() => {
    if (!active || tier !== "full") return;
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("resize", bump);
    const iv = setInterval(bump, 250);
    return () => {
      window.removeEventListener("resize", bump);
      clearInterval(iv);
    };
  }, [active, tier]);

  const leaveToReading = useCallback(() => {
    sessionStorage.setItem("cocoecoMode", "reading");
    setDismissed(true);
  }, []);

  const advance = useCallback(() => {
    setDismissed(true);
    document.body.style.overflow = "";
    setTimeout(() => {
      document.getElementById("city")?.scrollIntoView({
        behavior: reducedRef.current ? "auto" : "smooth",
      });
    }, 0);
  }, []);

  const dispatch = useCallback(
    (e: StageEvent) => {
      if (tier === "full" && handleRef.current) {
        handleRef.current.dispatch(e);
        return;
      }
      // static 档:没有状态机运行时,窗口点击/手势直接推进
      if (e === "WINDOW_CLICKED" || e === "GESTURE_ADVANCE") advance();
    },
    [tier, advance],
  );

  const project: ProjectFn = useCallback(
    (anchor) => {
      void tick;
      if (tier === "static") {
        const p = STATIC_POS[anchor];
        return p ? { x: p.x * window.innerWidth, y: p.y * window.innerHeight, inFront: true } : null;
      }
      const h = handleRef.current;
      const cam = h?.camera();
      const world = h?.assets()?.anchors.get(anchor);
      if (!cam || !world) return null;
      return projectToScreen(world as THREE.Vector3, cam, window.innerWidth, window.innerHeight);
    },
    [tier, tick],
  );

  const onReady = useCallback((h: StageHandle) => {
    handleRef.current = h;
    h.onState(setState);
    h.onState(() => setTick((t) => t + 1));
  }, []);

  if (!active) return null; // 阅读层在下方长页(tier null/reading 或已退出)

  return (
    <>
      {tier === "full" ? (
        <Stage reduced={reduced} onReady={onReady} onAdvance={advance} />
      ) : (
        <div className="fixed inset-0 z-40 bg-[#0a0e1c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/stage/bedroom/fallback.jpg"
            alt={dict.meta.ogImageAlt}
            className="h-full w-full object-cover"
          />
          <p className="voice absolute inset-x-0 top-4 text-center text-xs opacity-60">
            {dict.ui.liteMode}
          </p>
        </div>
      )}
      <StageOverlay state={state} dict={dict} dispatch={dispatch} project={project} />
      <button
        type="button"
        onClick={leaveToReading}
        className="voice fixed end-4 top-4 z-[60] rounded-md border border-[var(--card-border)] bg-[var(--card)]/70 px-3 py-1.5 text-sm backdrop-blur hover:bg-[var(--card)]"
      >
        {dict.ui.readingMode}
      </button>
    </>
  );
}
