"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type P = { x: number; y: number; vx: number; vy: number; r: number };

export function ParticleHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const mouse = { x: 0.5, y: 0.5 };

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const N = 70;
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: 1 + Math.random() * 2,
    }));

    const px = (p: P) => p.x * w + (mouse.x - 0.5) * 24 * p.r;
    const py = (p: P) => p.y * h + (mouse.y - 0.5) * 24 * p.r;

    let t = 0;
    function frame() {
      if (!running) return;
      t += 0.008;
      ctx!.clearRect(0, 0, w, h);

      // 呼吸光晕
      const cx = w * (0.5 + (mouse.x - 0.5) * 0.06);
      const cy = h * (0.42 + (mouse.y - 0.5) * 0.06);
      const rad = Math.max(w, h) * (0.5 + Math.sin(t) * 0.06);
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, "rgba(10,138,82,0.10)");
      grad.addColorStop(1, "rgba(10,138,82,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // 粒子
      for (const p of ps) {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        ctx!.beginPath();
        ctx!.arc(px(p), py(p), p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(10,138,82,0.35)";
        ctx!.fill();
      }

      // 近距连线(碳分子感)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = px(ps[i]) - px(ps[j]);
          const dy = py(ps[i]) - py(ps[j]);
          const d2 = dx * dx + dy * dy;
          if (d2 < 90 * 90) {
            ctx!.strokeStyle = `rgba(10,138,82,${(0.12 * (1 - Math.sqrt(d2) / 90)).toFixed(3)})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(px(ps[i]), py(ps[i]));
            ctx!.lineTo(px(ps[j]), py(ps[j]));
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    const onVis = () => {
      const visible = document.visibilityState === "visible";
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {reduced ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(10,138,82,0.08),transparent_70%)]" />
      ) : (
        <canvas ref={ref} className="w-full h-full" />
      )}
    </div>
  );
}
