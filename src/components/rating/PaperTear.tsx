"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLowPower } from "@/lib/useLowPower";

// 深色模式的撕纸转场覆盖层:紫色 note paper 拼贴(横线/红边线/褶皱/颗粒)+ 刺绣贴纸。
// grow 抽帧涨满 → hold 全覆盖(期间完成路由跳转)→ tear 撕成横向纸条,从点击那条向上下蔓延,
// 一条条被抽走:全程 ~10fps 离散跳变(stop-motion 手作感,刻意不平滑),每帧带随机抖动,
// 纸条越撕越揉皱收窄(scaleX 收 + 皱痕叠加变深)。毛边由 feTurbulence 一次性生成,低功耗跳过滤镜。
// 相位由 PixelTransitionProvider 的计时器状态机驱动;本组件对 transform 全部走命令式 DOM
// (JSX style 不写 transform,React 重渲染不会清掉步进引擎写入的值)。

export type PaperPhase = "grow" | "hold" | "tear";

export const PAPER_GROW_MS = 420;
export const PAPER_TEAR_MS = 1150;

const STRIPS = 5; // 撕成几条
const STEP_MS = 95; // 抽帧步长(~10fps)
const STAGGER_MS = 85; // 相邻纸条起撕间隔
const STEPS = 7; // 每条撕走的总帧数

// 贴纸布局:位置为视口百分比,宽度 clamp 自适应;recycle 放显眼位呼应碳主题
const PATCHES: { src: string; x: string; y: string; w: string; r: number }[] = [
  { src: "recycle", x: "7%", y: "9%", w: "clamp(76px, 11vw, 132px)", r: -8 },
  { src: "tv", x: "66%", y: "7%", w: "clamp(84px, 12vw, 148px)", r: 5 },
  { src: "ufo", x: "37%", y: "15%", w: "clamp(66px, 10vw, 120px)", r: 7 },
  { src: "aware", x: "57%", y: "40%", w: "clamp(60px, 9vw, 106px)", r: -11 },
  { src: "gameboy", x: "13%", y: "54%", w: "clamp(50px, 7.5vw, 86px)", r: 10 },
  { src: "heart", x: "41%", y: "66%", w: "clamp(64px, 10vw, 112px)", r: -5 },
  { src: "earth", x: "79%", y: "60%", w: "clamp(56px, 9vw, 100px)", r: -7 },
];

export const PATCH_URLS = PATCHES.map((p) => `/patches/${p.src}.webp`);

let preloaded = false;
/** 深色模式空闲时预载贴纸,保证首次撕纸不缺图 */
export function preloadPatches() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const u of PATCH_URLS) {
    const img = new Image();
    img.src = u;
  }
}

// 纸张颗粒(SVG turbulence 独立小纹理,平铺)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// 揉皱高光/暗部:斜向高光带 + 大块明暗,叠在横线之上模拟纸面起伏
const wrinkles = (hi: number, lo: number) =>
  [
    `linear-gradient(118deg, rgba(255,255,255,${hi}) 0 6%, transparent 11% 21%, rgba(28,10,60,${lo}) 25% 27%, transparent 33% 60%, rgba(255,255,255,${hi * 0.85}) 66% 70%, transparent 78%)`,
    `linear-gradient(64deg, rgba(28,10,60,${lo * 0.8}) 0 3%, transparent 9% 44%, rgba(255,255,255,${hi * 0.9}) 52% 55%, transparent 63%)`,
    `radial-gradient(55% 42% at 28% 22%, rgba(255,255,255,${hi * 0.8}), transparent 62%)`,
    `radial-gradient(50% 55% at 76% 74%, rgba(28,10,60,${lo}), transparent 58%)`,
  ].join(",");

// note paper 底:褶皱 → 颗粒 → 笔记横线 → 红页边线 → 纸色(层序自上而下)
const paperBg = (base: string, line: string, margin?: string) =>
  [
    wrinkles(0.32, 0.07),
    GRAIN,
    `repeating-linear-gradient(180deg, transparent 0 30px, ${line} 30px 31px)`,
    margin ? `linear-gradient(90deg, transparent 0 76px, ${margin} 76px 78px, transparent 78px)` : null,
    `linear-gradient(${base}, ${base})`,
  ]
    .filter(Boolean)
    .join(",");

const BASE_BG = paperBg("#cfc3f2", "rgba(96,52,190,0.22)", "rgba(233,88,128,0.5)");
const MINT_BG = paperBg("#cdeedd", "rgba(15,110,86,0.2)");
const PINK_BG = paperBg("#f9d3e4", "rgba(153,53,86,0.18)");
const CREAM_BG = [
  // 活页打孔:纵向重复的深色圆孔(露出深色页面底,像打穿的孔)
  `radial-gradient(circle at 20px 22px, rgba(17,16,24,0.85) 6px, transparent 7.5px)`,
  paperBg("#f6efdd", "rgba(133,79,11,0.18)"),
].join(",");

// 被揉皱时叠加变深的皱痕:密集斜向折线 + 重明暗(opacity 随撕扯步进上调)
const CRUMPLE_BG = [
  `repeating-linear-gradient(107deg, rgba(28,10,60,0.16) 0 2px, transparent 2px 14px)`,
  `repeating-linear-gradient(63deg, rgba(255,255,255,0.2) 0 1.5px, transparent 1.5px 11px)`,
  wrinkles(0.5, 0.2),
].join(",");

// 稳定伪随机(同一入参同一结果:抽帧抖动可复现,纸条边界两侧共用保证 hold 时缝对得上)
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const OVERSIZE = 32; // 纸条外扩 px:位移滤镜会侵蚀外缘,把侵蚀留在屏外
const SEG = 12; // 每条撕缝的锯齿段数

/** 横向撕缝:N 条纸条的 clip-path。相邻纸条上边缘上探 0.9% 压在上一条底下,hold 时无发丝缝 */
function buildStripClips(n: number): string[] {
  const bounds: [number, number][][] = [];
  for (let b = 0; b <= n; b++) {
    const pts: [number, number][] = [];
    const base = (b / n) * 100;
    const inner = b > 0 && b < n;
    for (let i = 0; i <= SEG; i++) {
      const amp = inner ? 0.9 + rnd(b * 17 + i) * 2.1 : 0;
      pts.push([(i / SEG) * 100, base + (i % 2 ? amp : -amp)]);
    }
    bounds.push(pts);
  }
  return Array.from({ length: n }, (_, s) => {
    const top = bounds[s].map(([x, y]) => `${x.toFixed(1)}% ${(y - (s === 0 ? 2 : 0.9)).toFixed(2)}%`);
    const bot = [...bounds[s + 1]]
      .reverse()
      .map(([x, y]) => `${x.toFixed(1)}% ${(y + (s === n - 1 ? 2 : 0)).toFixed(2)}%`);
    return `polygon(${top.join(",")},${bot.join(",")})`;
  });
}

function Collage() {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: BASE_BG }} />
      <div
        style={{
          position: "absolute", top: "-5%", right: "-4%", width: "44%", height: "48%",
          background: MINT_BG, transform: "rotate(3deg)", borderRadius: 6,
          boxShadow: "0 10px 24px rgba(10,4,28,0.22)",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: "-6%", left: "-3%", width: "40%", height: "42%",
          background: PINK_BG, transform: "rotate(-4deg)", borderRadius: 6,
          boxShadow: "0 10px 24px rgba(10,4,28,0.22)",
        }}
      />
      <div
        style={{
          position: "absolute", top: "30%", left: "-2%", width: "30%", height: "26%",
          background: CREAM_BG, backgroundRepeat: "repeat-y, no-repeat", backgroundSize: "40px 44px, auto",
          transform: "rotate(-2deg)", borderRadius: 6, boxShadow: "0 10px 24px rgba(10,4,28,0.22)",
        }}
      />
      {PATCHES.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element -- 转场覆盖层的装饰贴纸,固定小图无需 next/image 优化
        <img
          key={p.src}
          src={`/patches/${p.src}.webp`}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute", left: p.x, top: p.y, width: p.w,
            transform: `rotate(${p.r}deg)`,
            filter: "drop-shadow(0 5px 8px rgba(10,4,28,0.4))",
          }}
        />
      ))}
    </>
  );
}

export function PaperTear({ phase, ox, oy }: { phase: PaperPhase; ox: number; oy: number }) {
  const low = useLowPower();
  // 超大光栅面积(≈5K+/高分外接屏)或 Safari(SVG 引用滤镜走主线程软光栅)跳过位移滤镜,
  // 毛边退化为纯锯齿 clip-path。组件仅在客户端点击后挂载,懒初始化可直接读 window。
  const [heavy] = useState(() => {
    if (typeof window === "undefined") return false;
    const px = window.innerWidth * window.innerHeight * Math.pow(window.devicePixelRatio || 1, 2);
    const safari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|android/i.test(navigator.userAgent);
    return px > 10_000_000 || safari;
  });
  const noFx = low || heavy;
  const clips = useMemo(() => buildStripClips(STRIPS), []);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const crumpleRefs = useRef<(HTMLDivElement | null)[]>([]);

  const baseFilter = noFx ? "" : "url(#carbadia-tear-rough)";
  const tearFilter = noFx
    ? "drop-shadow(0 6px 10px rgba(0,0,0,0.45))"
    : "url(#carbadia-tear-rough) drop-shadow(0 8px 18px rgba(0,0,0,0.5))";
  // tear 引擎经 ref 取滤镜:低功耗媒体查询中途翻转时不重启引擎(deps 不含 tearFilter)
  const tearFilterRef = useRef(tearFilter);
  useEffect(() => {
    tearFilterRef.current = tearFilter;
  });

  // grow:抽帧涨满(4 帧硬切 + 落定,不用平滑缩放,和撕走同一套 stop-motion 语感)
  useEffect(() => {
    if (phase !== "grow") return;
    const el = wrapRef.current;
    if (!el) return;
    const frames = [
      "scale(0.16) rotate(-7deg)",
      "scale(0.48) rotate(4deg)",
      "scale(0.8) rotate(-2.5deg)",
      "scale(1.02) rotate(1deg)",
      "scale(1) rotate(0deg)",
    ];
    let i = 0;
    el.style.transform = frames[0];
    const iv = window.setInterval(() => {
      i++;
      if (i >= frames.length) {
        window.clearInterval(iv);
        return;
      }
      el.style.transform = frames[i];
    }, 88);
    return () => {
      window.clearInterval(iv);
      // 相位切到 hold/tear(或计时器被节流截断)时落定终帧:hold 必须从满屏开始,
      // 否则后台标签/首帧卡顿下纸只盖住一小块就发生路由切换,新页面穿帮
      el.style.transform = frames[frames.length - 1];
    };
  }, [phase]);

  // tear:从点击那条纸条向上下蔓延,逐条抽走;每帧硬切(离散 transform,无 transition)
  useEffect(() => {
    if (phase !== "tear") return;
    const vh = window.innerHeight || 800;
    const clickStrip = Math.min(STRIPS - 1, Math.max(0, Math.round((oy / vh) * (STRIPS - 1))));
    const t0 = performance.now();
    const lastK = new Array(STRIPS).fill(-1); // 帧未推进就不写样式:省样式重算,更省滤镜重光栅
    const iv = window.setInterval(() => {
      const t = performance.now() - t0;
      for (let s = 0; s < STRIPS; s++) {
        const el = stripRefs.current[s];
        if (!el) continue;
        const local = t - Math.abs(s - clickStrip) * STAGGER_MS;
        if (local < 0) continue;
        const k = Math.min(STEPS, Math.floor(local / STEP_MS) + 1);
        if (k === lastK[s]) continue;
        lastK[s] = k;
        const p = k / STEPS;
        const dir = s % 2 ? 1 : -1;
        const j = (n: number) => rnd(s * 31 + k * 7 + n) - 0.5;
        // 揉成纸条:横向收窄 + 轻微压扁,加速抽走,每帧位置/角度都在抖
        el.style.transform =
          `translate(${(dir * p * p * 135).toFixed(1)}%, ${(j(1) * 3 + p * (s % 2 ? 5 : -4)).toFixed(2)}%)` +
          ` rotate(${(dir * p * 9 + j(2) * 5).toFixed(2)}deg)` +
          ` scale(${(1 - p * 0.35).toFixed(3)}, ${(1 - p * 0.12 + j(3) * 0.06).toFixed(3)})`;
        if (k === 1) el.style.filter = tearFilterRef.current;
        const cr = crumpleRefs.current[s];
        if (cr) cr.style.opacity = Math.min(1, p * 1.3).toFixed(2);
      }
      if (t > STAGGER_MS * STRIPS + STEPS * STEP_MS + 80) window.clearInterval(iv);
    }, 45);
    return () => window.clearInterval(iv);
  }, [phase, oy]);

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "none" }}>
      {!noFx && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id="carbadia-tear-rough" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="3" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}
      {/* transform 由步进引擎命令式写入;JSX 不写 transform,重渲染不会回滚帧 */}
      <div ref={wrapRef} style={{ position: "absolute", inset: 0, transformOrigin: `${ox}px ${oy}px` }}>
        {clips.map((clip, s) => (
          <div
            key={s}
            ref={(el) => {
              stripRefs.current[s] = el;
            }}
            style={{
              position: "absolute",
              inset: -OVERSIZE,
              clipPath: clip,
              zIndex: STRIPS - s, // 上面的条压住下面的条的上探重叠区
              filter: baseFilter || undefined,
              willChange: "transform",
              overflow: "hidden",
            }}
          >
            <Collage />
            <div
              ref={(el) => {
                crumpleRefs.current[s] = el;
              }}
              style={{ position: "absolute", inset: 0, background: CRUMPLE_BG, opacity: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
