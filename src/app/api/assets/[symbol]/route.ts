import { prisma } from "@/lib/db";
import { getOrderBook } from "@/lib/matching";
import { ok, fail, handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await ctx.params;
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) return fail("标的不存在", 404);

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

    return ok({ asset, book, trades, holding, myOrders });
  } catch (err) {
    return handle(err);
  }
}
