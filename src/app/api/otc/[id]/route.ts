import { requireUser } from "@/lib/auth";
import { cancelListing } from "@/lib/otc";
import { ok, handle } from "@/lib/api";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const listing = await cancelListing(user.id, id);
    return ok(listing);
  } catch (err) {
    return handle(err);
  }
}
