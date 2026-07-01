import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma";

export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";

export class TradingError extends Error {}

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

interface PlaceOrderInput {
  userId: string;
  assetId: string;
  side: Side;
  type: OrderType;
  price?: number | null; // LIMIT 必填
  quantity: number; // 整数(吨)
}

/**
 * 下单 + 撮合。整个过程在一个事务中完成，保证资金/持仓与订单状态一致。
 * 撮合规则: 价格优先、时间优先。成交价取被动方(挂单方)价格。
 */
export async function placeOrder(input: PlaceOrderInput) {
  const { userId, assetId, side, type } = input;
  const quantity = Math.trunc(input.quantity);
  const price = input.price != null ? round2(input.price) : null;

  if (quantity <= 0) throw new TradingError("数量必须为正整数");
  if (type === "LIMIT") {
    if (price == null || price <= 0) throw new TradingError("限价单必须填写大于 0 的价格");
  }

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new TradingError("标的不存在");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new TradingError("用户不存在");

    // ---- 下单前冻结资源 ----
    if (side === "BUY" && type === "LIMIT") {
      const lock = round2(price! * quantity);
      if (user.cashBalance < lock) throw new TradingError("可用现金不足");
      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { decrement: lock }, lockedCash: { increment: lock } },
      });
    }
    if (side === "SELL") {
      const holding = await tx.holding.findUnique({
        where: { userId_assetId: { userId, assetId } },
      });
      const available = (holding?.quantity ?? 0) - (holding?.locked ?? 0);
      if (available < quantity) throw new TradingError("可用持仓不足");
      await tx.holding.update({
        where: { userId_assetId: { userId, assetId } },
        data: { locked: { increment: quantity } },
      });
    }

    // ---- 创建 taker 订单 ----
    const takerOrder = await tx.order.create({
      data: { userId, assetId, side, type, price, quantity, status: "OPEN" },
    });

    // ---- 拉取对手方挂单 (排除自成交) ----
    const candidates = await tx.order.findMany({
      where: {
        assetId,
        status: { in: ["OPEN", "PARTIAL"] },
        side: side === "BUY" ? "SELL" : "BUY",
        userId: { not: userId },
        ...(type === "LIMIT"
          ? side === "BUY"
            ? { price: { lte: price! } }
            : { price: { gte: price! } }
          : {}),
      },
      orderBy: side === "BUY" ? [{ price: "asc" }, { createdAt: "asc" }] : [{ price: "desc" }, { createdAt: "asc" }],
    });

    let remaining = quantity;
    let filledCost = 0; // 已成交金额
    let filledQty = 0;
    let takerCash = user.cashBalance; // 市价买单实时余额(限价买已冻结)

    for (const maker of candidates) {
      if (remaining <= 0) break;
      const makerRemaining = maker.quantity - maker.filledQuantity;
      if (makerRemaining <= 0) continue;
      const fp = maker.price!; // 挂单一定是限价单, price 非空

      let q = Math.min(remaining, makerRemaining);

      // 市价买单受可用现金约束
      if (side === "BUY" && type === "MARKET") {
        const affordable = Math.floor(takerCash / fp);
        q = Math.min(q, affordable);
        if (q <= 0) break;
      }

      const buyerId = side === "BUY" ? userId : maker.userId;
      const sellerId = side === "BUY" ? maker.userId : userId;
      const buyerIsTaker = side === "BUY";
      const amount = round2(fp * q);

      // --- 资金结算 ---
      // 卖方收款(进可用余额)
      await tx.user.update({ where: { id: sellerId }, data: { cashBalance: { increment: amount } } });
      // 买方付款
      if (buyerIsTaker) {
        if (type === "MARKET") {
          await tx.user.update({ where: { id: buyerId }, data: { cashBalance: { decrement: amount } } });
          takerCash = round2(takerCash - amount);
        } else {
          // 限价买 taker: 按下单价冻结, 成交价更优时退还差额
          // 冻结解除必须按下单价(price×q)而非成交价(amount), 否则差额会同时留在冻结里又退进余额
          const refund = round2((price! - fp) * q);
          await tx.user.update({
            where: { id: buyerId },
            data: { lockedCash: { decrement: round2(price! * q) }, cashBalance: { increment: refund } },
          });
        }
      } else {
        // 买方是挂单方: 按其挂单价(=fp)冻结, 直接从冻结扣除
        await tx.user.update({ where: { id: buyerId }, data: { lockedCash: { decrement: amount } } });
      }

      // --- 持仓结算 ---
      // 卖方交付(卖方下单时已冻结)
      await tx.holding.update({
        where: { userId_assetId: { userId: sellerId, assetId } },
        data: { quantity: { decrement: q }, locked: { decrement: q } },
      });
      // 买方收货
      await tx.holding.upsert({
        where: { userId_assetId: { userId: buyerId, assetId } },
        create: { userId: buyerId, assetId, quantity: q, locked: 0 },
        update: { quantity: { increment: q } },
      });

      // --- 更新挂单 ---
      const makerNewFilled = maker.filledQuantity + q;
      await tx.order.update({
        where: { id: maker.id },
        data: {
          filledQuantity: makerNewFilled,
          status: makerNewFilled >= maker.quantity ? "FILLED" : "PARTIAL",
        },
      });

      // --- 成交记录 ---
      await tx.trade.create({
        data: {
          assetId,
          buyOrderId: buyerIsTaker ? takerOrder.id : maker.id,
          sellOrderId: buyerIsTaker ? maker.id : takerOrder.id,
          buyerId,
          sellerId,
          price: fp,
          quantity: q,
        },
      });

      remaining -= q;
      filledQty += q;
      filledCost = round2(filledCost + amount);
    }

    // ---- 处理 taker 剩余 ----
    let finalStatus: string;
    if (remaining === 0) {
      finalStatus = "FILLED";
    } else if (type === "LIMIT") {
      finalStatus = filledQty > 0 ? "PARTIAL" : "OPEN"; // 挂在订单簿上
    } else {
      finalStatus = "CANCELLED"; // 市价单剩余撤销
      if (side === "SELL") {
        await tx.holding.update({
          where: { userId_assetId: { userId, assetId } },
          data: { locked: { decrement: remaining } },
        });
      }
    }

    const updatedTaker = await tx.order.update({
      where: { id: takerOrder.id },
      data: {
        filledQuantity: filledQty,
        status: finalStatus,
        avgFillPrice: filledQty > 0 ? round2(filledCost / filledQty) : null,
      },
    });

    if (filledQty > 0) {
      const lastPrice = round2(filledCost / filledQty);
      await tx.asset.update({ where: { id: assetId }, data: { lastPrice } });
    }

    return { order: updatedTaker, filledQty, filledCost };
  });
}

export async function cancelOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new TradingError("订单不存在");
    if (order.userId !== userId) throw new TradingError("无权操作该订单");
    if (!["OPEN", "PARTIAL"].includes(order.status)) throw new TradingError("订单当前状态不可撤销");

    const remaining = order.quantity - order.filledQuantity;
    if (order.side === "BUY" && order.price != null) {
      const unlock = round2(order.price * remaining);
      await tx.user.update({
        where: { id: userId },
        data: { lockedCash: { decrement: unlock }, cashBalance: { increment: unlock } },
      });
    } else if (order.side === "SELL") {
      await tx.holding.update({
        where: { userId_assetId: { userId, assetId: order.assetId } },
        data: { locked: { decrement: remaining } },
      });
    }

    return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });
}

/** 聚合订单簿(买卖各价位档位) */
export async function getOrderBook(assetId: string, depth = 12) {
  const open = await prisma.order.findMany({
    where: { assetId, status: { in: ["OPEN", "PARTIAL"] }, type: "LIMIT" },
    select: { side: true, price: true, quantity: true, filledQuantity: true },
  });

  const agg = (s: Side) => {
    const map = new Map<number, number>();
    for (const o of open) {
      if (o.side !== s || o.price == null) continue;
      const rem = o.quantity - o.filledQuantity;
      if (rem <= 0) continue;
      map.set(o.price, (map.get(o.price) ?? 0) + rem);
    }
    return [...map.entries()]
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => (s === "BUY" ? b.price - a.price : a.price - b.price))
      .slice(0, depth);
  };

  return { bids: agg("BUY"), asks: agg("SELL") };
}

export type OrderBook = Awaited<ReturnType<typeof getOrderBook>>;
export type TxClient = Prisma.TransactionClient;
