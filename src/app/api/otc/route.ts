import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createListing } from "@/lib/otc";
import { ok, handle, parseBody } from "@/lib/api";

export async function GET() {
  try {
    const listings = await prisma.otcListing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        asset: { select: { symbol: true, name: true, standard: true, projectType: true, vintage: true } },
        seller: { select: { name: true } },
      },
    });
    return ok(listings);
  } catch (err) {
    return handle(err);
  }
}

const schema = z.object({
  assetId: z.string().min(1),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().positive(),
  minQuantity: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, schema);
    const listing = await createListing({ sellerId: user.id, ...body });
    return ok(listing);
  } catch (err) {
    return handle(err);
  }
}
