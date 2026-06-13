"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fmtMoney, fmtQty } from "@/lib/format";

type Level = { price: number; quantity: number };
type CumLevel = { price: number; quantity: number; cum: number };

const W = 760;
const H = 300;
const PAD = 16;

export function DepthChart({ bids, asks }: { bids: Level[]; asks: Level[] }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<CumLevel | null>(null);

  const view = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) return null;
    // 累计深度: bids 已按价格从高到低, asks 已按价格从低到高
    const accumulate = (levels: Level[]): CumLevel[] => {
      const out: CumLevel[] = [];
      let sum = 0;
      for (const l of levels) {
        sum += l.quantity;
        out.push({ ...l, cum: sum });
      }
      return out;
    };
    const cumBids = accumulate(bids);
    const cumAsks = accumulate(asks);
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of [...bids, ...asks]) {
      lo = Math.min(lo, l.price);
      hi = Math.max(hi, l.price);
    }
    const span = hi - lo || 1;
    const maxCum = Math.max(cumBids[cumBids.length - 1]?.cum ?? 0, cumAsks[cumAsks.length - 1]?.cum ?? 0, 1);
    return {
      cumBids,
      cumAsks,
      x: (p: number) => PAD + ((p - lo) / span) * (W - PAD * 2),
      y: (c: number) => H - PAD - (c / maxCum) * (H - PAD * 2),
    };
  }, [bids, asks]);

  if (!view) return <div className="h-[300px] flex items-center justify-center text-muted text-sm">暂无挂单</div>;

  const { cumBids, cumAsks, x, y } = view;

  function stepPath(levels: CumLevel[], edgeX: number) {
    if (levels.length === 0) return "";
    let d = `M${x(levels[0].price)},${H - PAD}`;
    let prevY = H - PAD;
    for (const l of levels) {
      d += ` L${x(l.price)},${prevY} L${x(l.price)},${y(l.cum)}`;
      prevY = y(l.cum);
    }
    d += ` L${edgeX},${prevY} L${edgeX},${H - PAD} Z`;
    return d;
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: CumLevel | null = null;
    let bestD = Infinity;
    for (const l of [...cumBids, ...cumAsks]) {
      const d = Math.abs(x(l.price) - px);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    setHover(best);
  }

  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : null;

  return (
    <div className="relative">
      <div className="absolute top-0 left-2 z-10 text-[11px] tnum text-muted flex gap-3 bg-surface/80 backdrop-blur px-2 py-0.5 rounded">
        {hover ? (
          <>
            <span>价 {fmtMoney(hover.price)}</span>
            <span>档量 {fmtQty(hover.quantity)}</span>
            <span>累计 {fmtQty(hover.cum)} 吨</span>
          </>
        ) : spread != null ? (
          <span>价差 {fmtMoney(spread)}</span>
        ) : (
          <span>买卖盘深度</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <motion.path
          d={stepPath(cumBids, PAD)}
          className="fill-up/15 stroke-up"
          strokeWidth={1.5}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={stepPath(cumAsks, W - PAD)}
          className="fill-down/15 stroke-down"
          strokeWidth={1.5}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: reduced ? 0 : 0.15 }}
        />
        {hover && (
          <line x1={x(hover.price)} y1={PAD} x2={x(hover.price)} y2={H - PAD} className="stroke-muted" strokeDasharray="3 3" strokeWidth={0.75} />
        )}
      </svg>
    </div>
  );
}
