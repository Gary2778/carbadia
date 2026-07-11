import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { placeOrder } from "@/lib/matching";
import { ok, fail, handle, parseBody } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  assetId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["LIMIT", "MARKET"]),
  price: z.number().positive().nullable().optional(),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`orders:${clientIp(req)}`, 30, 60_000)) return fail("Too many requests, please retry later", 429);
    const user = await requireUser();
    const body = await parseBody(req, schema);
    const prior = await prisma.order.count({ where: { userId: user.id } });
    const result = await placeOrder({
      userId: user.id,
      assetId: body.assetId,
      side: body.side,
      type: body.type,
      price: body.price ?? null,
      quantity: body.quantity,
    });
    if (prior === 0) void prisma.event.create({ data: { name: "first_order" } }).catch(() => {});
    return ok(result);
  } catch (err) {
    return handle(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { asset: { select: { symbol: true, name: true } } },
    });
    return ok(orders);
  } catch (err) {
    return handle(err);
  }
}
