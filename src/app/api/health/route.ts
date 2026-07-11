import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ db: true });
  } catch {
    return fail("db unavailable", 500);
  }
}
