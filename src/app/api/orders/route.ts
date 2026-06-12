import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { placeOrder } from "@/lib/matching";
import { ok, handle, parseBody } from "@/lib/api";

const schema = z.object({
  assetId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["LIMIT", "MARKET"]),
  price: z.number().positive().nullable().optional(),
  quantity: z.number().int().positive("数量必须为正整数"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, schema);
    const result = await placeOrder({
      userId: user.id,
      assetId: body.assetId,
      side: body.side,
      type: body.type,
      price: body.price ?? null,
      quantity: body.quantity,
    });
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
