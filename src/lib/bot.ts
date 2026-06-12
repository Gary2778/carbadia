// 做市机器人: 每 ~2.5s 对每个标的随机游走报价、维护两侧 5 档、概率吃单
import type { Asset, User } from "@/generated/prisma";
import { prisma } from "./db";
import { cancelOrder, placeOrder } from "./matching";
import { buildQuoteLevels, nextFair, round2, shouldTake, takeQty } from "./bot-math";

const TICK_MS = 2500;
const MAX_DRIFT = 0.02; // 挂单偏离 fair 超过 ±2% 即撤
const CASH_FLOOR = 1_000_000;
const CASH_RESET = 50_000_000;
const QTY_FLOOR = 10_000;
const QTY_TOPUP = 1_000_000;

declare global {
  // dev HMR 下防止重复启动
  var __carbadiaBot: boolean | undefined;
}

export function startMarketBot() {
  if (globalThis.__carbadiaBot) return;
  globalThis.__carbadiaBot = true;
  console.log("[bot] 做市机器人启动");
  void loop();
}

async function loop() {
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[bot] tick 失败", e);
    }
    await new Promise((r) => setTimeout(r, TICK_MS + Math.random() * 800));
  }
}

async function tick() {
  const bots = await prisma.user.findMany({ where: { isBot: true } });
  if (bots.length === 0) return;
  const assets = await prisma.asset.findMany();
  for (const asset of assets) {
    try {
      await quoteAsset(asset, bots);
    } catch (e) {
      console.error(`[bot] ${asset.symbol} 报价失败`, e);
    }
  }
}

async function quoteAsset(asset: Asset, bots: User[]) {
  const anchor = asset.anchorPrice ?? asset.lastPrice;
  if (anchor == null) return;
  const last = asset.lastPrice ?? anchor;
  const rng = Math.random;
  const fair = nextFair(last, anchor, rng);
  const botIds = bots.map((b) => b.id);
  const pick = () => bots[Math.floor(Math.random() * bots.length)];

  // 1) 撤掉偏离过远的机器人挂单
  const open = await prisma.order.findMany({
    where: { assetId: asset.id, userId: { in: botIds }, status: { in: ["OPEN", "PARTIAL"] } },
  });
  const keep: typeof open = [];
  for (const o of open) {
    if (o.price != null && Math.abs(o.price - fair) / fair > MAX_DRIFT) {
      await cancelOrder(o.userId, o.id).catch(() => {});
    } else {
      keep.push(o);
    }
  }

  // 2) 两侧补足约 5 档
  const bidCount = keep.filter((o) => o.side === "BUY").length;
  const askCount = keep.filter((o) => o.side === "SELL").length;
  const { bids, asks } = buildQuoteLevels(fair, rng);
  for (const lvl of bids.slice(0, Math.max(0, 5 - bidCount))) {
    await placeOrder({ userId: pick().id, assetId: asset.id, side: "BUY", type: "LIMIT", price: lvl.price, quantity: lvl.quantity }).catch(() => {});
  }
  for (const lvl of asks.slice(0, Math.max(0, 5 - askCount))) {
    await placeOrder({ userId: pick().id, assetId: asset.id, side: "SELL", type: "LIMIT", price: lvl.price, quantity: lvl.quantity }).catch(() => {});
  }

  // 3) 概率吃单(穿越价差的限价单, 打印成交)
  if (shouldTake(rng)) {
    const side = Math.random() < 0.5 ? "BUY" : "SELL";
    const price = round2(side === "BUY" ? fair * 1.015 : fair * 0.985);
    await placeOrder({ userId: pick().id, assetId: asset.id, side, type: "LIMIT", price, quantity: takeQty(rng) }).catch(() => {});
  }

  // 4) 自动补给(演示盘不破产)
  for (const b of bots) {
    const fresh = await prisma.user.findUnique({ where: { id: b.id }, select: { cashBalance: true } });
    if (fresh && fresh.cashBalance < CASH_FLOOR) {
      await prisma.user.update({ where: { id: b.id }, data: { cashBalance: CASH_RESET } });
    }
    const h = await prisma.holding.findUnique({ where: { userId_assetId: { userId: b.id, assetId: asset.id } } });
    if (!h || h.quantity - h.locked < QTY_FLOOR) {
      await prisma.holding.upsert({
        where: { userId_assetId: { userId: b.id, assetId: asset.id } },
        create: { userId: b.id, assetId: asset.id, quantity: QTY_TOPUP, locked: 0 },
        update: { quantity: { increment: QTY_TOPUP } },
      });
    }
  }
}
