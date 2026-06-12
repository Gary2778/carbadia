import { prisma } from "@/lib/db";
import { ok, fail, handle } from "@/lib/api";
import { bucketTrades, INTERVALS, type IntervalKey } from "@/lib/candles";

export async function GET(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await ctx.params;
    const interval = new URL(req.url).searchParams.get("interval") ?? "1m";
    const cfg = INTERVALS[interval as IntervalKey];
    if (!cfg) return fail("interval 必须是 1m/5m/1h/1d", 400);

    const asset = await prisma.asset.findUnique({ where: { symbol }, select: { id: true } });
    if (!asset) return fail("标的不存在", 404);

    const trades = await prisma.trade.findMany({
      where: { assetId: asset.id, createdAt: { gte: new Date(Date.now() - cfg.lookbackMs) } },
      select: { price: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return ok({ candles: bucketTrades(trades, cfg.ms) });
  } catch (err) {
    return handle(err);
  }
}
