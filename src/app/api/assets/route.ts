import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";
import { bucketTrades, INTERVALS } from "@/lib/candles";
import { selectHomeMarketPreview } from "@/lib/home-market-preview";

// 进程内 TTL 缓存: 行情列表对所有访客相同, 单实例部署下把 N 个访客的查询坍缩为每 2s 一次
const CACHE_TTL_MS = 2000;
const cache = new Map<"base" | "home", { data: unknown; ts: number }>();

// 行情列表对所有访客相同 → 允许 CDN(Cloudflare)吸收轮询流量, 减少打到源站的请求数
const PUBLIC_CACHE = { headers: { "Cache-Control": "public, max-age=1, s-maxage=2, stale-while-revalidate=4" } };

export async function GET(request: Request) {
  try {
    const isHomePreview = new URL(request.url).searchParams.get("preview") === "home";
    const cacheKey = isHomePreview ? "home" : "base";
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return ok(hit.data, PUBLIC_CACHE);

    const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });

    // 计算每个标的最优买卖价 + 24h 成交量
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Promise.all(
      assets.map(async (a) => {
        const [bestBid, bestAsk, vol, first, t24, supply] = await Promise.all([
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
          prisma.order.aggregate({
            where: { assetId: a.id, side: "SELL", type: "LIMIT", status: { in: ["OPEN", "PARTIAL"] } },
            _sum: { quantity: true, filledQuantity: true },
          }),
        ]);
        const change24h = first && a.lastPrice != null ? ((a.lastPrice - first.price) / first.price) * 100 : null;
        // Sample across the available day's trades, keeping the first and last
        // prices. Half-hour buckets hide all movement in a newly started market.
        const pointCount = Math.min(48, t24.length);
        const spark = Array.from({ length: pointCount }, (_, index) => {
          const tradeIndex = pointCount === 1
            ? 0
            : Math.round(index * (t24.length - 1) / (pointCount - 1));
          return t24[tradeIndex].price;
        });
        return {
          ...a,
          bestBid: bestBid?.price ?? null,
          bestAsk: bestAsk?.price ?? null,
          volume24h: vol._sum.quantity ?? 0,
          // Executable simulated asks; not project issuance or registry inventory.
          availableSupply: (supply._sum.quantity ?? 0) - (supply._sum.filledQuantity ?? 0),
          change24h,
          spark,
          ...(isHomePreview ? { miniCandles: bucketTrades(t24, INTERVALS["5m"].ms).slice(-16) } : {}),
        };
      })
    );
    const data = isHomePreview ? selectHomeMarketPreview(result) : result;
    cache.set(cacheKey, { data, ts: Date.now() });
    return ok(data, PUBLIC_CACHE);
  } catch (err) {
    return handle(err);
  }
}
