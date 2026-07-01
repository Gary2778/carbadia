"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useLowPower } from "@/lib/useLowPower";

// 一个能抓起来甩、会落地弹跳/滚动的小足球。画布 pointer-events:none，
// 只有按在球上时才接管指针，别处点击照常穿透到页面。

const R = 26; // 半径
const GRAVITY = 0.6;
const REST = 0.72; // 弹性
const AIR = 0.995; // 空气阻力
const GROUND_FRICTION = 0.86; // 落地横向摩擦
const ROLL_FRICTION = 0.985; // 滚动摩擦

function pentagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
  // 影子
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.95, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  // 球体底色
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#e6efe9");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 黑绿色拼块（随旋转）
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(angle);
  ctx.fillStyle = "#07301f";
  pentagon(ctx, 0, 0, r * 0.34, -Math.PI / 2);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    pentagon(ctx, Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.26, a + Math.PI / 5);
  }
  ctx.restore();

  // 高光 + 描边
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.4, r * 0.26, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function SoccerBall() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const low = useLowPower(); // 手机/触屏:鼠标玩法用不上,且物理 rAF + 全局指针监听会拖慢、干扰滚动

  useEffect(() => {
    if (reduced || low) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    let last = 0; // 上一帧时间戳,用于按真实耗时缩放(高刷新率屏幕不再变快)
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const b = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0 };
    const drag = { on: false, ox: 0, oy: 0, px: 0, py: 0 };

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.x = Math.min(Math.max(b.x, R), W - R);
      b.y = Math.min(Math.max(b.y, R), H - R);
    }

    function start() {
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }

    function step(dt: number) {
      if (drag.on) return; // 抓着时由指针驱动
      const air = Math.pow(AIR, dt); // 阻尼/摩擦按帧数复利,保持与帧率无关
      b.vy += GRAVITY * dt;
      b.vx *= air;
      b.vy *= air;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < R) { b.x = R; b.vx = -b.vx * REST; }
      if (b.x > W - R) { b.x = W - R; b.vx = -b.vx * REST; }
      if (b.y < R) { b.y = R; b.vy = -b.vy * REST; }
      if (b.y > H - R) {
        b.y = H - R;
        b.vy = -b.vy * REST;
        b.vx *= Math.pow(GROUND_FRICTION, dt);
        if (Math.abs(b.vy) < 1.2) b.vy = 0; // 停止微弹
      }
      const onGround = b.y >= H - R - 0.5;
      if (onGround && b.vy === 0) b.vx *= Math.pow(ROLL_FRICTION, dt);

      // 旋转：地面滚动用速度换算，空中保持自转
      b.va = onGround ? -b.vx / R : b.va * Math.pow(0.99, dt);
      b.angle += b.va * dt;

      // 接近静止则停机
      if (onGround && Math.abs(b.vx) < 0.05 && b.vy === 0) {
        b.vx = 0;
        running = false;
      }
    }

    function loop() {
      const now = performance.now();
      const dt = Math.min((now - last) / 16.6667, 3); // 归一到 60fps 的帧数,clamp 防后台回来时跳变
      last = now;
      step(dt);
      ctx!.clearRect(0, 0, W, H);
      drawBall(ctx!, b.x, b.y, R, b.angle);
      if (running || drag.on) raf = requestAnimationFrame(loop);
    }

    function onDown(e: PointerEvent) {
      const dx = e.clientX - b.x;
      const dy = e.clientY - b.y;
      if (dx * dx + dy * dy > (R + 8) * (R + 8)) return; // 没按在球上 → 放行
      e.preventDefault();
      drag.on = true;
      drag.ox = dx;
      drag.oy = dy;
      drag.px = e.clientX;
      drag.py = e.clientY;
      b.vx = 0;
      b.vy = 0;
      start();
    }
    function onMove(e: PointerEvent) {
      if (!drag.on) return;
      e.preventDefault();
      const nx = e.clientX - drag.ox;
      const ny = e.clientY - drag.oy;
      // 速度 = 指针位移（带一点平滑），供释放时甩出
      b.vx = 0.6 * b.vx + 0.4 * (e.clientX - drag.px);
      b.vy = 0.6 * b.vy + 0.4 * (e.clientY - drag.py);
      drag.px = e.clientX;
      drag.py = e.clientY;
      b.x = Math.min(Math.max(nx, R), W - R);
      b.y = Math.min(Math.max(ny, R), H - R);
      b.angle += -b.vx / R;
    }
    function onUp() {
      if (!drag.on) return;
      drag.on = false;
      // 限制甩出的最大速度
      const max = 42;
      b.vx = Math.max(-max, Math.min(max, b.vx));
      b.vy = Math.max(-max, Math.min(max, b.vy));
      start();
    }
    function onVis() {
      if (document.visibilityState === "visible") start();
      else { running = false; cancelAnimationFrame(raf); }
    }

    resize();
    // 初始：从空中落下弹两下，吸引注意
    b.x = Math.min(W * 0.5, W - R - 16);
    b.y = R + 20;
    b.vx = 2.4;
    start();

    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced, low]);

  if (reduced || low) return null;
  return <canvas ref={ref} aria-hidden className="fixed inset-0 z-[15]" style={{ width: "100vw", height: "100vh", pointerEvents: "none" }} />;
}
