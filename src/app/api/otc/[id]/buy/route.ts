import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { buyListing } from "@/lib/otc";
import { ok, handle, parseBody } from "@/lib/api";

const schema = z.object({ quantity: z.number().int().positive() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { quantity } = await parseBody(req, schema);
    const deal = await buyListing(user.id, id, quantity);
    return ok(deal);
  } catch (err) {
    return handle(err);
  }
}
