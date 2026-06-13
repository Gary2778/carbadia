// K线聚合 — 从成交记录在内存中聚合 OHLCV, 纯函数
export type CandleInput = { price: number; quantity: number; createdAt: Date };
export type Candle = { t: string; o: number; h: number; l: number; c: number; v: number };

export const INTERVALS = {
  "1m": { ms: 60_000, lookbackMs: 4 * 3_600_000 },
  "5m": { ms: 300_000, lookbackMs: 24 * 3_600_000 },
  "1h": { ms: 3_600_000, lookbackMs: 7 * 86_400_000 },
  "1d": { ms: 86_400_000, lookbackMs: 90 * 86_400_000 },
} as const;
export type IntervalKey = keyof typeof INTERVALS;

export function bucketTrades(trades: CandleInput[], intervalMs: number): Candle[] {
  const sorted = [...trades].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const map = new Map<number, Candle>();
  for (const tr of sorted) {
    const bucket = Math.floor(tr.createdAt.getTime() / intervalMs) * intervalMs;
    const c = map.get(bucket);
    if (!c) {
      map.set(bucket, { t: new Date(bucket).toISOString(), o: tr.price, h: tr.price, l: tr.price, c: tr.price, v: tr.quantity });
    } else {
      c.h = Math.max(c.h, tr.price);
      c.l = Math.min(c.l, tr.price);
      c.c = tr.price;
      c.v += tr.quantity;
    }
  }
  return [...map.values()].slice(-240);
}
