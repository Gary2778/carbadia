import { prisma } from "@/lib/db";
import { getOrderBook } from "@/lib/matching";
import { ok, fail, handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await ctx.params;
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) return fail("Instrument not found", 404);

    const [book, trades, user] = await Promise.all([
      getOrderBook(asset.id),
      prisma.trade.findMany({
        where: { assetId: asset.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, price: true, quantity: true, createdAt: true },
      }),
      getCurrentUser(),
    ]);

    const since = new Date(Date.now() - 24 * 3_600_000);
    const t24 = await prisma.trade.findMany({
      where: { assetId: asset.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { price: true, quantity: true },
    });
    let high24h: number | null = null;
    let low24h: number | null = null;
    let vol24h = 0;
    for (const t of t24) {
      high24h = high24h == null ? t.price : Math.max(high24h, t.price);
      low24h = low24h == null ? t.price : Math.min(low24h, t.price);
      vol24h += t.quantity;
    }
    const change24h = t24.length >= 2 ? ((t24[t24.length - 1].price - t24[0].price) / t24[0].price) * 100 : null;
    const stats = { high24h, low24h, vol24h, change24h };

    let holding = null;
    let myOrders: unknown[] = [];
    if (user) {
      holding = await prisma.holding.findUnique({
        where: { userId_assetId: { userId: user.id, assetId: asset.id } },
      });
      myOrders = await prisma.order.findMany({
        where: { userId: user.id, assetId: asset.id, status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { createdAt: "desc" },
      });
    }

    return ok({ asset, stats, book, trades, holding, myOrders });
  } catch (err) {
    return handle(err);
  }
}
