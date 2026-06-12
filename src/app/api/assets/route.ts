import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });

    // 计算每个标的最优买卖价 + 24h 成交量
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Promise.all(
      assets.map(async (a) => {
        const [bestBid, bestAsk, vol] = await Promise.all([
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
          prisma.trade.aggregate({
            where: { assetId: a.id, createdAt: { gte: since } },
            _sum: { quantity: true },
          }),
        ]);
        return {
          ...a,
          bestBid: bestBid?.price ?? null,
          bestAsk: bestAsk?.price ?? null,
          volume24h: vol._sum.quantity ?? 0,
        };
      })
    );
    return ok(result);
  } catch (err) {
    return handle(err);
  }
}
