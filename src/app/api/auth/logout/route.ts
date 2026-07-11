import { destroySession } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (err) {
    return handle(err);
  }
}
