"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useRatingTransition, type Pt } from "./PixelTransition";
import { useLang, useT } from "@/lib/i18n";
import { isCJK } from "@/i18n/config";
import { useTheme } from "@/lib/theme";
import { useLowPower } from "@/lib/useLowPower";

// "Carbon Rating" 手写笔画:每条 path 是一支笔的运笔轨迹(monoline 圆头),
// 悬停时按笔顺依次描出(stroke-dashoffset,pathLength 归一 100)。
// 一条 path 内的多段子路径 = 抬笔再落笔(如 r 的肩、t 的横、i 的点),笔顺与真人书写一致。
// t 为该笔画的书写时长(秒),间隔 50ms 抬笔。
const TITLE_STROKES: { d: string; t: number }[] = [
  { d: "M57,33 C51,21 35,17 25,29 C14,43 14,67 26,79 C36,89 53,85 58,73", t: 0.32 }, // C
  { d: "M90,52 C81,46 68,50 66,63 C64,77 73,86 82,82 C89,79 91,68 91,55 C90,66 90,78 93,84 C96,88 101,85 103,80", t: 0.36 }, // a
  { d: "M106,52 C108,62 108,74 107,84 M107,63 C110,55 119,48 126,53", t: 0.24 }, // r
  { d: "M133,20 C131,42 131,66 133,84 C143,89 155,80 155,68 C155,57 144,52 134,58", t: 0.34 }, // b
  { d: "M177,50 C165,52 160,66 166,78 C173,89 187,85 191,73 C194,61 188,49 177,50", t: 0.3 }, // o
  { d: "M199,53 C201,63 201,74 200,84 M200,64 C205,54 217,48 223,56 C227,62 227,74 225,84", t: 0.32 }, // n
  { d: "M255,84 C253,62 253,40 255,21 C267,17 286,21 286,35 C286,48 269,52 257,50 M267,52 C275,62 284,73 291,84", t: 0.42 }, // R
  { d: "M320,52 C311,46 298,50 296,63 C294,77 303,86 312,82 C319,79 321,68 321,55 C320,66 320,78 323,84 C326,88 331,85 333,80", t: 0.36 }, // a
  { d: "M341,28 C339,46 339,66 341,80 C343,86 349,85 352,80 M330,47 L355,45", t: 0.32 }, // t(先竖后横)
  { d: "M362,53 C362,63 362,74 363,84 M362,39 L362.4,39.6", t: 0.2 }, // i(先竖后点)
  { d: "M374,53 C376,63 376,74 375,84 M375,64 C380,54 392,48 398,56 C402,62 402,74 400,84", t: 0.32 }, // n
  { d: "M436,52 C426,45 413,50 411,62 C409,75 419,85 429,80 C436,76 438,67 438,55 C438,73 441,93 435,106 C428,117 413,112 411,101", t: 0.44 }, // g
];

// 逐笔累计延迟:上一笔写完(+50ms 抬笔)才写下一笔
const TITLE_TIMING = (() => {
  let acc = 0;
  return TITLE_STROKES.map((s) => {
    const delay = acc;
    acc += s.t + 0.05;
    return { ...s, delay };
  });
})();

const MORPH = "CARBON RATING"; // 悬停后的像素英文（两种语言一致）
const GAP = 4; // 采样网格更细 → 字母分辨率更高、英文清晰
const SQ = 3; // 像素方块(留 1px 缝)
const GREEN = "#0a8a52";
const GLOW = "#16d97f";
const FONT = (fs: number) => `700 ${fs}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;

type Particle = {
  cx: number; cy: number; ex: number; ey: number;
  dirx: number; diry: number; ph: number; };

const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function sample(text: string, fs: number) {
  const off = document.createElement("canvas");
  const o = off.getContext("2d");
  if (!o) return { pts: [] as number[][], tw: 0, th: 0 };
  o.font = FONT(fs);
  const tw = Math.ceil(o.measureText(text).width);
  const th = Math.ceil(fs * 1.3);
  off.width = tw;
  off.height = th;
  o.font = FONT(fs);
  o.fillStyle = "#000";
  o.textBaseline = "middle";
  o.textAlign = "left";
  o.fillText(text, 0, th / 2);
  const d = o.getImageData(0, 0, tw, th).data;
  const pts: number[][] = [];
  for (let y = 0; y < th; y += GAP) for (let x = 0; x < tw; x += GAP) if (d[(y * tw + x) * 4 + 3] > 110) pts.push([x, y]);
  return { pts, tw, th };
}

// 深色模式下评级入口改用紫色(与全屏紫色覆盖层呼应);浅色保持品牌绿
const cBase = (dark: boolean) => (dark ? "#9b6dff" : GREEN);
const cGlow = (dark: boolean) => (dark ? "#c9a8ff" : GLOW);

// 刺绣贴纸层(与撕纸转场同一套素材),压在雾化底上、文字下
// [src, left%, top%, 宽 px, 旋转 deg]
const STICKERS: [string, number, number, number, number][] = [
  ["recycle", 2, 6, 60, -12],
  ["tv", 13, 58, 68, 8],
  ["ufo", 27, 4, 60, -6],
  ["heart", 40, 62, 62, 10],
  ["gameboy", 55, 3, 46, -14],
  ["earth", 67, 58, 58, 7],
  ["aware", 81, 6, 60, 12],
  ["ufo", 90, 60, 52, -9],
  ["heart", 2, 64, 50, -15],
  ["tv", 92, 20, 54, 6],
];

export function PixelMorphEntry() {
  const reduced = useReducedMotion();
  const low = useLowPower(); // 手机/触屏:像素 rAF + hover 唤醒无意义,回退到静态卡片
  const { lang } = useLang();
  const dark = useTheme().theme === "dark";
  // 卡片配色(深色紫 / 浅色绿)——完整类名字面量,便于 Tailwind 扫描生成
  const cGrad = dark ? "from-[#7e4ddb]/10" : "from-accent/[0.06]";
  const cBorderHover = dark ? "hover:border-[#9b6dff]/50" : "hover:border-accent/40";
  const cKicker = dark ? "text-[#b794ff]/80" : "text-accent/80";
  const cAccent = dark ? "text-[#b794ff]" : "text-accent";
  const tx = useT("pixelEntry");
  const { enter } = useRatingTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const st = useRef({
    parts: [] as Particle[],
    W: 0, H: 0, restFont: "",
    h: 0, hoverT: 0, t: 0, mouseX: -999, mouseY: -999,
    launched: false, // 点击后清空本地文字，让像素消散交给全屏覆盖层
  });

  useEffect(() => {
    if (reduced || low) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const s = st.current;
    const restText = tx.rest;
    const cjk = isCJK(lang);
    const colBase = cBase(dark);
    const colGlow = cGlow(dark);
    let last = 0; // delta-time:高刷新率屏幕不变快

    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cvs.clientWidth;
      const H = cvs.clientHeight;
      if (W === 0 || H === 0) return; // 画布已脱离布局(如切到低功耗回退),不要取样
      cvs.width = W * dpr;
      cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.W = W;
      s.H = H;
      const avail = W * 0.94;
      // 静止文字（平滑矢量字）：按宽度自适应字号
      let restFS = cjk ? Math.min(88, W / (restText.length + 0.8)) : Math.min(66, W / (restText.length * 0.55));
      let Z = sample(restText, restFS);
      if (Z.tw > avail) {
        restFS = Math.max(28, restFS * (avail / Z.tw));
        Z = sample(restText, restFS);
      }
      s.restFont = FONT(restFS);
      // 悬停像素英文：按宽度自适应，保证清晰且不溢出
      let enFS = Math.max(44, Math.min(84, W / (MORPH.length * 0.6)));
      let E = sample(MORPH, enFS);
      if (E.tw > avail) {
        enFS = Math.max(28, enFS * (avail / E.tw));
        E = sample(MORPH, enFS);
      }
      const exo = (W - E.tw) / 2, eyo = (H - E.th) / 2, zxo = (W - Z.tw) / 2, zyo = (H - Z.th) / 2;
      const cx = W / 2, cy = H / 2;
      s.parts = E.pts.map((p, i) => {
        const z = Z.pts[i % Math.max(1, Z.pts.length)] ?? p;
        const ex = exo + p[0], ey = eyo + p[1];
        const dx = ex - cx, dy = ey - cy, m = Math.hypot(dx, dy) || 1;
        return { cx: zxo + z[0], cy: zyo + z[1], ex, ey, dirx: dx / m, diry: dy / m, ph: Math.random() * 6.28 };
      });
    };

    const curPos = (p: Particle) => {
      const e = easeIO(clamp(s.h, 0, 1));
      const scat = Math.sin(clamp(s.h, 0, 1) * Math.PI) * 22;
      const br = clamp((s.h - 0.12) / 0.4, 0, 1);
      const ox = Math.sin(s.t * 1.7 + p.ph) * 1.1 * br;
      const oy = Math.cos(s.t * 1.7 + p.ph) * 1.1 * br;
      return { x: p.cx + (p.ex - p.cx) * e + p.dirx * scat + ox, y: p.cy + (p.ey - p.cy) * e + p.diry * scat + oy };
    };

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 16.6667, 3);
      last = now;
      s.t += 0.05 * dt;
      s.h += (s.hoverT - s.h) * (1 - Math.pow(1 - 0.07, dt));
      ctx.clearRect(0, 0, s.W, s.H);
      if (s.launched) {
        raf.current = requestAnimationFrame(frame);
        return;
      }
      const zhA = 1 - clamp(s.h / 0.32, 0, 1);
      if (zhA > 0) {
        ctx.globalAlpha = zhA;
        ctx.fillStyle = colBase;
        ctx.font = s.restFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(restText, s.W / 2, s.H / 2);
        ctx.globalAlpha = 1;
      }
      const pA = clamp((s.h - 0.1) / 0.4, 0, 1);
      if (pA > 0) {
        const full = s.h > 0.85;
        const R = 104, R2 = R * R;
        for (const p of s.parts) {
          const c = curPos(p);
          let infl = 0, px = c.x, py = c.y;
          const dx = c.x - s.mouseX, dy = c.y - s.mouseY, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            infl = 1 - d / R;
            infl *= infl;
            const push = infl * 11;
            px += (dx / d) * push;
            py += (dy / d) * push;
          }
          const tw = (Math.sin(s.t * 1.7 + p.ph) + 1) / 2;
          ctx.globalAlpha = clamp(pA * (0.78 + 0.22 * tw) + infl * 0.5, 0, 1);
          ctx.fillStyle = full || infl > 0.22 ? colGlow : colBase;
          const sz = SQ + (full ? tw * 0.8 : 0) + infl * 2;
          ctx.fillRect(px - (sz - SQ) / 2, py - (sz - SQ) / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
      }
      raf.current = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      s.mouseX = e.clientX - r.left;
      s.mouseY = e.clientY - r.top;
      s.hoverT = s.mouseY > s.H * 0.12 && s.mouseY < s.H * 0.88 ? 1 : 0;
    };
    const onLeave = () => {
      s.hoverT = 0;
      s.mouseX = -999;
      s.mouseY = -999;
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf.current);
        raf.current = 0;
      } else if (!raf.current) {
        last = performance.now();
        raf.current = requestAnimationFrame(frame);
      }
    };

    s.launched = false;
    build();
    last = performance.now();
    raf.current = requestAnimationFrame(frame);
    const rebuild = () => build();
    const rebuildTimer = setTimeout(rebuild, 300);
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", rebuild);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(rebuildTimer); // 防止卸载/切回退后延迟 rebuild 取样空画布
      cancelAnimationFrame(raf.current);
      cvs.removeEventListener("mousemove", onMove);
      cvs.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", rebuild);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced, low, lang, tx.rest, dark]);

  function onClick(e: React.MouseEvent) {
    if (reduced) return; // 让 <Link> 正常跳转
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // 新标签页等默认行为放行
    e.preventDefault();
    const cvs = canvasRef.current;
    const s = st.current;
    if (!cvs || s.parts.length === 0) {
      s.launched = true;
      enter({ points: [], click: { x: e.clientX, y: e.clientY } });
      return;
    }
    s.h = Math.max(s.h, 0.9);
    const r = cvs.getBoundingClientRect();
    const e2 = easeIO(clamp(s.h, 0, 1));
    const points: Pt[] = s.parts.map((p) => ({
      x: r.left + p.cx + (p.ex - p.cx) * e2,
      y: r.top + p.cy + (p.ey - p.cy) * e2,
    }));
    s.launched = true; // 立刻清空本地文字 → 像素随覆盖层飞散消散
    enter({ points, click: { x: e.clientX, y: e.clientY } });
  }

  // 深色模式:贴纸拼贴入口卡(与撕纸转场同一套贴纸素材)。点击从点击点飞出那张纸;
  // 低功耗/减弱动效下同样显示贴纸卡,但点击直接跳转不放转场
  if (dark) {
    const canTear = !reduced && !low;
    return (
      <Link
        href="/rating"
        aria-label={tx.aria}
        onClick={
          canTear
            ? (e) => {
                // 修饰键/中键交给浏览器默认行为(新标签页等),不劫持成当前页转场
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                // 键盘回车触发的 click 无坐标(0,0):退化为从卡片中心涨纸
                let x = e.clientX;
                let y = e.clientY;
                if (!x && !y) {
                  const r = e.currentTarget.getBoundingClientRect();
                  x = r.x + r.width / 2;
                  y = r.y + r.height / 2;
                }
                enter({ points: [], click: { x, y } });
              }
            : undefined
        }
        className="sticker-entry group relative grid place-items-center min-h-[210px] w-full max-w-2xl mx-auto overflow-x-clip px-6 py-9 text-center"
      >
        {/* 雾化磨砂底:backdrop-blur 只雾身后的星空,径向 mask 让边缘羽化渐隐;贴纸/文字在其上保持锐利 */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[#241d3f]/50 backdrop-blur-lg"
          style={{
            WebkitMaskImage: "radial-gradient(115% 115% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)",
            maskImage: "radial-gradient(115% 115% at 50% 50%, #000 42%, rgba(0,0,0,0.55) 68%, transparent 96%)",
          }}
        />
        {STICKERS.map(([src, left, top, w, r], i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 装饰贴纸小图,无需 next/image 优化
          <img
            key={i}
            src={`/patches/${src}.webp`}
            alt=""
            aria-hidden
            draggable={false}
            className="sticker-patch absolute select-none"
            style={
              {
                left: `${left}%`,
                top: `${top}%`,
                width: w,
                opacity: 0.92,
                "--r": `${r}deg`,
                transform: `rotate(${r}deg)`,
                filter: "drop-shadow(0 3px 5px rgba(10,4,28,0.45))",
              } as React.CSSProperties
            }
          />
        ))}
        {/* 只留标题;鼠标停在字上时按笔顺重新书写(stroke-dashoffset 描迹,CSS 见 globals 的 diary-title 规则) */}
        <div className="diary-title relative" role="img" aria-label="Carbon Rating">
          <svg
            viewBox="0 0 480 140"
            className="h-auto w-[clamp(250px,62vw,470px)]"
            style={{ filter: "drop-shadow(0 3px 6px rgba(10,4,28,0.75))" }}
            aria-hidden
          >
            {TITLE_TIMING.map((s, i) => (
              <path
                key={i}
                d={s.d}
                pathLength={100}
                className="stroke-path"
                fill="none"
                stroke="#efdcff"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ "--t": `${s.t}s`, "--d": `${s.delay}s` } as React.CSSProperties}
              />
            ))}
          </svg>
        </div>
      </Link>
    );
  }

  if (reduced || low) {
    return (
      <Link
        href="/rating"
        aria-label={tx.aria}
        className={`group block w-full max-w-2xl mx-auto rounded-3xl border border-border bg-gradient-to-b ${cGrad} to-transparent shadow-soft hover:shadow-card ${cBorderHover} transition-all duration-300 px-6 py-9 text-center`}
      >
        <p className={`font-mono text-[10px] tracking-[0.3em] ${cKicker} mb-3`}>{tx.kicker}</p>
        <div className={`text-3xl font-semibold ${cAccent}`}>{tx.rest}</div>
        <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${cAccent} mt-4`}>
          {tx.ctaReduced} <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/rating"
      onClick={onClick}
      aria-label={tx.aria}
      className={`group relative block w-full max-w-2xl mx-auto rounded-3xl border border-border bg-gradient-to-b ${cGrad} to-transparent shadow-soft hover:shadow-card ${cBorderHover} transition-all duration-300 cursor-pointer px-6 pt-5 pb-5`}
    >
      <p className={`font-mono text-[10px] tracking-[0.3em] ${cKicker} text-center`}>{tx.kicker}</p>
      <canvas ref={canvasRef} className="block w-full h-[150px]" />
      <div className={`flex items-center justify-center gap-1.5 text-sm font-medium ${cAccent}`}>
        {tx.cta}
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
