import { requireUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/matching";
import { ok, handle } from "@/lib/api";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const order = await cancelOrder(user.id, id);
    return ok(order);
  } catch (err) {
    return handle(err);
  }
}
