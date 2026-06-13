"use client";

import { useTheme } from "@/lib/theme";

// Peppa Pig 风格的星空：扁平大色块、手绘感、糖果色、会眨眼的卡通星星、
// 弯月与底部起伏的绿色小山丘。只在深色模式渲染，固定铺满视口、置于内容之后。

// 稳定伪随机（同一 seed 在服务端/客户端产生相同结果，避免水合不一致）
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260614);
type Star = { x: number; y: number; r: number; four: boolean; color: string; dur: number; delay: number };
const STAR_COLORS = ["#fffaf0", "#ffe9a8", "#ffffff", "#d8e9ff"];
const STARS: Star[] = Array.from({ length: 48 }, () => {
  const four = rnd() > 0.42;
  return {
    x: rnd() * 1440,
    y: 30 + rnd() * 600, // 集中在上方天空
    r: four ? 6 + rnd() * 7 : 1.4 + rnd() * 2.6,
    four,
    color: STAR_COLORS[Math.floor(rnd() * STAR_COLORS.length)],
    dur: 2.2 + rnd() * 3.4,
    delay: rnd() * 4,
  };
});

// 4 角星(剪影)路径：菱形 + 内凹腰身，卡通"闪光"感
function sparklePath(r: number) {
  const w = r * 0.2;
  return `M0,${-r} L${w},${-w} L${r},0 L${w},${w} L0,${r} L${-w},${w} L${-r},0 L${-w},${-w} Z`;
}

export function StarrySky() {
  const { theme } = useTheme();
  if (theme !== "dark") return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* 星星 + 弯月：铺满并按比例裁切 */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
          <mask id="crescent">
            <circle cx="1190" cy="150" r="62" fill="#fff" />
            <circle cx="1218" cy="134" r="56" fill="#000" />
          </mask>
        </defs>

        {/* 月晕 + 弯月 */}
        <circle cx="1190" cy="150" r="150" fill="url(#moonGlow)" />
        <circle cx="1190" cy="150" r="62" fill="#ffe9a8" mask="url(#crescent)" />

        {/* 卡通星星：CSS 眨眼动画，错峰；reduced-motion 由 globals.css 关闭 */}
        {STARS.map((s, i) => (
          <g
            key={i}
            className="carbadia-star"
            transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}
            style={{ animation: `carbadia-twinkle ${s.dur.toFixed(2)}s ease-in-out ${s.delay.toFixed(2)}s infinite` }}
          >
            {s.four ? (
              <path d={sparklePath(s.r)} fill={s.color} />
            ) : (
              <circle r={s.r} fill={s.color} />
            )}
          </g>
        ))}
      </svg>

      {/* 底部起伏小山丘：贴着视口底，水平拉伸 */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        style={{ height: "min(30vh, 240px)" }}
      >
        {/* 远山 */}
        <path
          d="M0,120 C220,60 380,70 560,108 C760,150 900,84 1130,112 C1290,132 1380,104 1440,118 L1440,240 L0,240 Z"
          fill="#0a3b26"
        />
        {/* 近山 */}
        <path
          d="M0,170 C240,128 440,168 660,156 C900,142 1060,188 1290,166 C1364,159 1410,168 1440,166 L1440,240 L0,240 Z"
          fill="#0e5234"
        />
        {/* 近山顶亮边 */}
        <path
          d="M0,170 C240,128 440,168 660,156 C900,142 1060,188 1290,166 C1364,159 1410,168 1440,166"
          fill="none"
          stroke="#1c7a4f"
          strokeWidth="3"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
