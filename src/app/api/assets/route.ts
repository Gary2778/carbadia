import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";
import { bucketTrades } from "@/lib/candles";

// 进程内 TTL 缓存: 行情列表对所有访客相同, 单实例部署下把 N 个访客的查询坍缩为每 2s 一次
const CACHE_TTL_MS = 2000;
let cache: { data: unknown; ts: number } | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return ok(cache.data);

    const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });

    // 计算每个标的最优买卖价 + 24h 成交量
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Promise.all(
      assets.map(async (a) => {
        const [bestBid, bestAsk, vol, first, t24] = await Promise.all([
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
          // 成交量交给数据库聚合, 涨跌幅只取窗口内第一条成交对比 lastPrice, 避免全量拉行遍历
          prisma.trade.aggregate({
            where: { assetId: a.id, createdAt: { gte: since } },
            _sum: { quantity: true },
          }),
          prisma.trade.findFirst({
            where: { assetId: a.id, createdAt: { gte: since } },
            orderBy: { createdAt: "asc" },
            select: { price: true },
          }),
          prisma.trade.findMany({
            where: { assetId: a.id, createdAt: { gte: since } },
            orderBy: { createdAt: "asc" },
            select: { price: true, quantity: true, createdAt: true },
          }),
        ]);
        const change24h = first && a.lastPrice != null ? ((a.lastPrice - first.price) / first.price) * 100 : null;
        const spark = bucketTrades(t24, 30 * 60_000).map((c) => c.c).slice(-48);
        return {
          ...a,
          bestBid: bestBid?.price ?? null,
          bestAsk: bestAsk?.price ?? null,
          volume24h: vol._sum.quantity ?? 0,
          change24h,
          spark,
        };
      })
    );
    cache = { data: result, ts: Date.now() };
    return ok(result);
  } catch (err) {
    return handle(err);
  }
}
