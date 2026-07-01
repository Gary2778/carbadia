import { prisma } from "@/lib/db";
import { ok, fail, handle } from "@/lib/api";
import { bucketTrades, INTERVALS, type IntervalKey, type Candle } from "@/lib/candles";

// 进程内 K 线缓存: 同一标的+周期的聚合结果 5s 内复用, 轮询访客共享同一份
const CACHE_TTL_MS = 5000;
const cache = new Map<string, { data: { candles: Candle[] }; ts: number }>();

export async function GET(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await ctx.params;
    const interval = new URL(req.url).searchParams.get("interval") ?? "1m";
    if (!Object.hasOwn(INTERVALS, interval)) return fail("interval 必须是 1m/5m/1h/1d", 400);
    const cfg = INTERVALS[interval as IntervalKey];

    const asset = await prisma.asset.findUnique({ where: { symbol }, select: { id: true } });
    if (!asset) return fail("标的不存在", 404);

    const key = `${asset.id}:${interval}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return ok(hit.data);

    const trades = await prisma.trade.findMany({
      where: { assetId: asset.id, createdAt: { gte: new Date(Date.now() - cfg.lookbackMs) } },
      select: { price: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const data = { candles: bucketTrades(trades, cfg.ms) };
    cache.set(key, { data, ts: Date.now() });
    return ok(data);
  } catch (err) {
    return handle(err);
  }
}
