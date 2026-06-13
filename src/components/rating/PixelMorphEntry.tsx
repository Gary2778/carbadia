"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useRatingTransition, type Pt } from "./PixelTransition";

const ZH = "碳信用评级";
const EN = "CARBON RATING";
const GAP = 4; // 采样网格更细 → 字母分辨率更高、英文清晰
const SQ = 3;  // 像素方块(留 1px 缝)
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

export function PixelMorphEntry() {
  const reduced = useReducedMotion();
  const { enter } = useRatingTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const st = useRef({
    parts: [] as Particle[],
    W: 0, H: 0, zhFont: "",
    h: 0, hoverT: 0, t: 0, mouseX: -999, mouseY: -999,
    launched: false, // 点击后清空本地文字，让像素消散交给全屏覆盖层
  });

  useEffect(() => {
    if (reduced) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const s = st.current;

    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = cvs.clientWidth;
      const H = cvs.clientHeight;
      cvs.width = W * dpr;
      cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.W = W;
      s.H = H;
      const zhFS = Math.max(40, Math.min(88, W / (ZH.length + 0.8)));
      s.zhFont = FONT(zhFS);
      // 英文按宽度自适应：先估字号，再按实测宽度收缩到画布内，保证清晰且不溢出
      let enFS = Math.max(44, Math.min(84, W / (EN.length * 0.6)));
      let E = sample(EN, enFS);
      const avail = W * 0.94;
      if (E.tw > avail) {
        enFS = Math.max(28, enFS * (avail / E.tw));
        E = sample(EN, enFS);
      }
      const Z = sample(ZH, zhFS);
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
      s.t += 0.05;
      s.h += (s.hoverT - s.h) * 0.07;
      ctx.clearRect(0, 0, s.W, s.H);
      if (s.launched) {
        // 文字已交给覆盖层飞散：本地保持清空
        raf.current = requestAnimationFrame(frame);
        return;
      }
      const zhA = 1 - clamp(s.h / 0.32, 0, 1);
      if (zhA > 0) {
        ctx.globalAlpha = zhA;
        ctx.fillStyle = GREEN;
        ctx.font = s.zhFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ZH, s.W / 2, s.H / 2);
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
          ctx.fillStyle = full || infl > 0.22 ? GLOW : GREEN;
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
        raf.current = requestAnimationFrame(frame);
      }
    };

    build();
    raf.current = requestAnimationFrame(frame);
    const rebuild = () => build();
    setTimeout(rebuild, 300);
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", rebuild);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf.current);
      cvs.removeEventListener("mousemove", onMove);
      cvs.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", rebuild);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  function onClick(e: React.MouseEvent) {
    if (reduced) return; // 让 <Link> 正常跳转
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

  if (reduced) {
    return (
      <Link
        href="/rating"
        aria-label="碳信用评级服务"
        className="group block w-full max-w-2xl mx-auto rounded-3xl border border-border bg-gradient-to-b from-accent/[0.06] to-transparent shadow-soft hover:shadow-card hover:border-accent/40 transition-all duration-300 px-6 py-9 text-center"
      >
        <p className="font-mono text-[10px] tracking-[0.3em] text-accent/80 mb-3">CARBADIA · 独家评级服务</p>
        <div className="text-3xl font-semibold text-accent">碳信用评级</div>
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-accent mt-4">
          进入评级服务 <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/rating"
      onClick={onClick}
      aria-label="碳信用评级服务"
      className="group relative block w-full max-w-2xl mx-auto rounded-3xl border border-border bg-gradient-to-b from-accent/[0.06] to-transparent shadow-soft hover:shadow-card hover:border-accent/40 transition-all duration-300 cursor-pointer px-6 pt-5 pb-5"
    >
      <p className="font-mono text-[10px] tracking-[0.3em] text-accent/80 text-center">CARBADIA · 独家评级服务</p>
      <canvas ref={canvasRef} className="block w-full h-[150px]" />
      <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-accent">
        悬停唤醒 · 点击进入
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
