import { prisma } from "./db";

export class OtcError extends Error {}

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

interface CreateListingInput {
  sellerId: string;
  assetId: string;
  quantity: number;
  pricePerUnit: number;
  minQuantity?: number;
}

/** 创建 OTC 挂牌: 冻结卖方对应持仓 */
export async function createListing(input: CreateListingInput) {
  const quantity = Math.trunc(input.quantity);
  const pricePerUnit = round2(input.pricePerUnit);
  const minQuantity = Math.max(1, Math.trunc(input.minQuantity ?? 1));

  if (quantity <= 0) throw new OtcError("Quantity must be a positive integer");
  if (pricePerUnit <= 0) throw new OtcError("Unit price must be greater than 0");
  if (minQuantity > quantity) throw new OtcError("Min buy cannot exceed listing quantity");

  return prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findUnique({
      where: { userId_assetId: { userId: input.sellerId, assetId: input.assetId } },
    });
    const available = (holding?.quantity ?? 0) - (holding?.locked ?? 0);
    if (available < quantity) throw new OtcError("Insufficient available holdings");

    await tx.holding.update({
      where: { userId_assetId: { userId: input.sellerId, assetId: input.assetId } },
      data: { locked: { increment: quantity } },
    });

    return tx.otcListing.create({
      data: {
        sellerId: input.sellerId,
        assetId: input.assetId,
        quantity,
        pricePerUnit,
        minQuantity,
      },
    });
  });
}

/** 撤销 OTC 挂牌: 解冻剩余持仓 */
export async function cancelListing(sellerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.otcListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new OtcError("Listing not found");
    if (listing.sellerId !== sellerId) throw new OtcError("Not your listing");
    if (listing.status !== "ACTIVE") throw new OtcError("Listing can no longer be cancelled");

    await tx.holding.update({
      where: { userId_assetId: { userId: sellerId, assetId: listing.assetId } },
      data: { locked: { decrement: listing.quantity } },
    });

    return tx.otcListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
  });
}

/** 购买 OTC 挂牌(可部分成交) */
export async function buyListing(buyerId: string, listingId: string, qty: number) {
  const quantity = Math.trunc(qty);
  if (quantity <= 0) throw new OtcError("Purchase quantity must be a positive integer");

  return prisma.$transaction(async (tx) => {
    const listing = await tx.otcListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new OtcError("Listing not found");
    if (listing.status !== "ACTIVE") throw new OtcError("Listing is not available");
    if (listing.sellerId === buyerId) throw new OtcError("You cannot buy your own listing");
    if (quantity > listing.quantity) throw new OtcError("Exceeds available listing quantity");
    if (quantity < listing.minQuantity && quantity < listing.quantity) {
      throw new OtcError(`Below the minimum purchase (${listing.minQuantity} t)`);
    }

    const total = round2(listing.pricePerUnit * quantity);
    const buyer = await tx.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new OtcError("Buyer not found");
    if (buyer.cashBalance < total) throw new OtcError("Insufficient available cash");

    // 资金: 买方 -> 卖方
    await tx.user.update({ where: { id: buyerId }, data: { cashBalance: { decrement: total } } });
    await tx.user.update({ where: { id: listing.sellerId }, data: { cashBalance: { increment: total } } });

    // 持仓: 卖方交付(已冻结) -> 买方
    await tx.holding.update({
      where: { userId_assetId: { userId: listing.sellerId, assetId: listing.assetId } },
      data: { quantity: { decrement: quantity }, locked: { decrement: quantity } },
    });
    await tx.holding.upsert({
      where: { userId_assetId: { userId: buyerId, assetId: listing.assetId } },
      create: { userId: buyerId, assetId: listing.assetId, quantity, locked: 0 },
      update: { quantity: { increment: quantity } },
    });

    // 更新挂牌
    const remaining = listing.quantity - quantity;
    await tx.otcListing.update({
      where: { id: listingId },
      data: { quantity: remaining, status: remaining === 0 ? "SOLD" : "ACTIVE" },
    });

    // 参考价
    await tx.asset.update({ where: { id: listing.assetId }, data: { lastPrice: listing.pricePerUnit } });

    return tx.otcDeal.create({
      data: { listingId, buyerId, quantity, price: listing.pricePerUnit, total },
    });
  });
}
