import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";
import { bucketTrades } from "@/lib/candles";

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });

    // 计算每个标的最优买卖价 + 24h 成交量
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Promise.all(
      assets.map(async (a) => {
        const [bestBid, bestAsk, t24] = await Promise.all([
          prisma.order.findFirst({
            where: { assetId: a.id, side: "BUY", status: { in: ["OPEN", "PARTIAL"] } },
            orderBy: { price: "desc" },
            select: { price: true },
          }),
          prisma.order.findFirst({
            where: { assetId: a.id, side: "SELL", status: { in: ["OPEN", "PARTIAL"] } },
            orderBy: { price: "asc" },
            select: { price: true },
          }),
          prisma.trade.findMany({
            where: { assetId: a.id, createdAt: { gte: since } },
            orderBy: { createdAt: "asc" },
            select: { price: true, quantity: true, createdAt: true },
          }),
        ]);
        let volume24h = 0;
        for (const t of t24) volume24h += t.quantity;
        const change24h = t24.length >= 2 ? ((t24[t24.length - 1].price - t24[0].price) / t24[0].price) * 100 : null;
        const spark = bucketTrades(t24, 30 * 60_000).map((c) => c.c).slice(-48);
        return {
          ...a,
          bestBid: bestBid?.price ?? null,
          bestAsk: bestAsk?.price ?? null,
          volume24h,
          change24h,
          spark,
        };
      })
    );
    return ok(result);
  } catch (err) {
    return handle(err);
  }
}
