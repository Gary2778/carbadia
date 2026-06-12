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

  if (quantity <= 0) throw new OtcError("数量必须为正整数");
  if (pricePerUnit <= 0) throw new OtcError("单价必须大于 0");
  if (minQuantity > quantity) throw new OtcError("最小购买量不能大于挂牌数量");

  return prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findUnique({
      where: { userId_assetId: { userId: input.sellerId, assetId: input.assetId } },
    });
    const available = (holding?.quantity ?? 0) - (holding?.locked ?? 0);
    if (available < quantity) throw new OtcError("可用持仓不足");

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
    if (!listing) throw new OtcError("挂牌不存在");
    if (listing.sellerId !== sellerId) throw new OtcError("无权操作该挂牌");
    if (listing.status !== "ACTIVE") throw new OtcError("挂牌当前状态不可撤销");

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
  if (quantity <= 0) throw new OtcError("购买数量必须为正整数");

  return prisma.$transaction(async (tx) => {
    const listing = await tx.otcListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new OtcError("挂牌不存在");
    if (listing.status !== "ACTIVE") throw new OtcError("挂牌不可购买");
    if (listing.sellerId === buyerId) throw new OtcError("不能购买自己的挂牌");
    if (quantity > listing.quantity) throw new OtcError("超过挂牌可售数量");
    if (quantity < listing.minQuantity && quantity < listing.quantity) {
      throw new OtcError(`低于最小购买量(${listing.minQuantity}吨)`);
    }

    const total = round2(listing.pricePerUnit * quantity);
    const buyer = await tx.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new OtcError("买方不存在");
    if (buyer.cashBalance < total) throw new OtcError("可用现金不足");

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
