import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const [holdings, openOrders, trades, otcListings] = await Promise.all([
      prisma.holding.findMany({
        where: { userId: user.id, quantity: { gt: 0 } },
        include: { asset: true },
      }),
      prisma.order.findMany({
        where: { userId: user.id, status: { in: ["OPEN", "PARTIAL"] } },
        orderBy: { createdAt: "desc" },
        include: { asset: { select: { symbol: true, name: true } } },
      }),
      prisma.trade.findMany({
        where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { asset: { select: { symbol: true, name: true } } },
      }),
      prisma.otcListing.findMany({
        where: { sellerId: user.id, status: "ACTIVE" },
        include: { asset: { select: { symbol: true, name: true } } },
      }),
    ]);

    // 持仓市值(按最新价)
    const positions = holdings.map((h) => {
      const mark = h.asset.lastPrice ?? 0;
      return {
        assetId: h.assetId,
        symbol: h.asset.symbol,
        name: h.asset.name,
        quantity: h.quantity,
        locked: h.locked,
        lastPrice: h.asset.lastPrice,
        marketValue: Math.round(mark * h.quantity * 100) / 100,
      };
    });
    const holdingsValue = positions.reduce((s, p) => s + p.marketValue, 0);

    return ok({
      cashBalance: user.cashBalance,
      lockedCash: user.lockedCash,
      holdingsValue: Math.round(holdingsValue * 100) / 100,
      totalAssets: Math.round((user.cashBalance + user.lockedCash + holdingsValue) * 100) / 100,
      positions,
      openOrders,
      trades: trades.map((t) => ({
        ...t,
        direction: t.buyerId === user.id ? "BUY" : "SELL",
      })),
      otcListings,
    });
  } catch (err) {
    return handle(err);
  }
}
