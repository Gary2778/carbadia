# Carbadia 交易所完全体升级 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Carbadia 模拟碳交易所补全行情图表（K线/深度/迷你走势）、服务端做市机器人和全站设计感动画。

**Architecture:** 机器人通过 `src/instrumentation.ts` 的 `register()` 在服务器启动时开启后台循环，复用现有 `placeOrder`/`cancelOrder` 撮合引擎做市；K线由 `Trade` 表在内存中聚合（纯函数，可单测）；图表全部自绘 SVG；动画统一用 `motion`（framer-motion 的发行名，import 自 `"motion/react"`）。

**Tech Stack:** Next.js 16.2.7 (App Router/Turbopack)、React 19、Prisma 6 + SQLite、Tailwind v4、motion、vitest。

**关键背景（执行者必读）：**
- 项目约定见 AGENTS.md：写代码前先读 `node_modules/next/dist/docs/` 对应指南。本计划撰写时已核实：`instrumentation.ts` 放在 `src/` 根下，导出的 `register()` 在每个 Next.js 服务器实例启动时调用一次（构建期不跑请求处理）；`app/template.tsx` 默认导出组件、每次顶级路由段切换时重挂载（适合页面转场）。其余 API 若有疑问再查该目录。
- 现有约定：数量 = `Int`（吨），金额 = `Float`（元，`round2` 两位小数）；API 返回 `{ ok, data }`（`src/lib/api.ts` 的 `ok/fail/handle`）；客户端请求用 `src/lib/format.ts` 的 `api<T>()`。
- 设计 Token 在 `src/app/globals.css`：`--up`(绿涨) `--down`(红跌) `--accent` `--surface` `--surface-2` `--border` `--muted`；Tailwind 类如 `text-up` `bg-surface-2` `shadow-card` `tnum` 可直接用。
- 开发数据库是 SQLite（`prisma/dev.db`）。如 dev server 已在跑，重置数据库前先停掉。

---

### Task 1: 依赖与 vitest 基建

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/gaptop/碳交易所
npm install motion
npm install -D vitest
```

Expected: 安装成功，`package.json` dependencies 出现 `motion`，devDependencies 出现 `vitest`。

- [ ] **Step 2: 加 test 脚本**

在 `package.json` 的 `scripts` 中 `"lint": "eslint",` 之后加一行：

```json
    "test": "vitest run",
```

- [ ] **Step 3: 创建 vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: 验证 vitest 可运行**

Run: `npm test`
Expected: `No test files found`（退出码非 0 没关系，能跑起来即可）。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: 引入 motion 与 vitest"
```

---

### Task 2: Schema 迁移 + 机器人种子账户

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: schema 加两个字段**

`prisma/schema.prisma` 的 `model User` 中，在 `role` 行之后加：

```prisma
  isBot        Boolean  @default(false)    // 做市机器人账户
```

`model Asset` 中，在 `lastPrice` 行之后加：

```prisma
  anchorPrice Float?                    // 机器人均值回归锚定价
```

- [ ] **Step 2: 迁移**

Run: `npx prisma migrate dev --name bot_market_fields`
Expected: 迁移成功，重新生成 client 到 `src/generated/prisma`。

- [ ] **Step 3: seed 增加机器人 + anchorPrice**

`prisma/seed.ts` 修改两处：

(a) 资产创建处给 `data` 加 `anchorPrice`（在 `lastPrice: a.mid,` 之后）：

```ts
          lastPrice: a.mid, anchorPrice: a.mid,
```

(b) 在 `const [alice, bob, carol, dave] = users;` 之后加机器人创建；并在「分配持仓…」的 for 循环里给机器人发持仓。完整新增代码：

```ts
  console.log("创建做市机器人…");
  const bots = await Promise.all(
    ["mm1", "mm2", "mm3"].map((n) =>
      prisma.user.create({
        data: { email: `${n}@carbonex.bot`, name: `做市商 ${n.toUpperCase()}`, passwordHash: pw, isBot: true, cashBalance: 50_000_000 },
      })
    )
  );
```

「分配持仓…」循环体内（`await grant(carol.id, ...)` 之后）加：

```ts
    for (const b of bots) await grant(b.id, asset.id, 1_000_000);
```

- [ ] **Step 4: 重置并播种数据库**

```bash
npm run db:reset
npm run db:seed
```

Expected: seed 输出包含「创建做市机器人…」。（注意：dev server 若在跑会锁 SQLite，先停掉。）

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations
git commit -m "feat: schema 增加 isBot/anchorPrice 并播种做市机器人"
```

---

### Task 3: 机器人定价纯逻辑（TDD）

**Files:**
- Create: `src/lib/bot-math.ts`
- Test: `src/lib/bot-math.test.ts`

设计：所有随机性通过注入的 `rng: () => number`（返回 [0,1)）实现，纯函数可确定性测试。

- [ ] **Step 1: 写失败的测试**

`src/lib/bot-math.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildQuoteLevels, nextFair, shouldTake, takeQty } from "./bot-math";

const mid = () => 0.5; // 恒定中值随机源

describe("nextFair", () => {
  it("rng=0.5 且 last=anchor 时价格不变(噪声为0、无回归力)", () => {
    expect(nextFair(100, 100, mid)).toBe(100);
  });
  it("last 高于 anchor 时向下回归", () => {
    expect(nextFair(110, 100, mid)).toBeLessThan(110);
  });
  it("last 低于 anchor 时向上回归", () => {
    expect(nextFair(90, 100, mid)).toBeGreaterThan(90);
  });
  it("永远为正且保留两位小数", () => {
    const v = nextFair(0.02, 0.01, () => 0); // 最大向下噪声
    expect(v).toBeGreaterThan(0);
    expect(v).toBe(Math.round(v * 100) / 100);
  });
});

describe("buildQuoteLevels", () => {
  it("买档全部低于 fair, 卖档全部高于 fair, 各5档", () => {
    const { bids, asks } = buildQuoteLevels(100, mid);
    expect(bids).toHaveLength(5);
    expect(asks).toHaveLength(5);
    for (const b of bids) expect(b.price).toBeLessThan(100);
    for (const a of asks) expect(a.price).toBeGreaterThan(100);
  });
  it("数量在 10~200 吨之间, 价格两位小数", () => {
    const { bids, asks } = buildQuoteLevels(57.3, mid);
    for (const l of [...bids, ...asks]) {
      expect(l.quantity).toBeGreaterThanOrEqual(10);
      expect(l.quantity).toBeLessThanOrEqual(200);
      expect(l.price).toBe(Math.round(l.price * 100) / 100);
    }
  });
});

describe("shouldTake / takeQty", () => {
  it("rng<0.3 时吃单", () => {
    expect(shouldTake(() => 0.1)).toBe(true);
    expect(shouldTake(() => 0.5)).toBe(false);
  });
  it("吃单量在 10~80 吨", () => {
    expect(takeQty(() => 0)).toBe(10);
    expect(takeQty(() => 0.9999)).toBeLessThanOrEqual(80);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL — `Cannot find module './bot-math'` 或类似。

- [ ] **Step 3: 实现 bot-math.ts**

```ts
// 做市机器人定价数学 — 全部纯函数, 随机性经 rng 注入以便测试
export type Rng = () => number;

export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** 公允价: 三角分布噪声(±0.4%) + 2% 力度向 anchor 均值回归 */
export function nextFair(last: number, anchor: number, rng: Rng): number {
  const noise = (rng() + rng() - 1) * 0.004;
  const reversion = (0.02 * (anchor - last)) / last;
  return Math.max(0.01, round2(last * (1 + noise + reversion)));
}

/** 两侧各 5 档报价: 偏移 0.1%~1.2%, 数量 10~200 吨 */
export function buildQuoteLevels(fair: number, rng: Rng) {
  const mk = (dir: 1 | -1) =>
    Array.from({ length: 5 }, (_, i) => {
      const pct = 0.001 + i * 0.0022 + rng() * 0.0008;
      return {
        price: Math.max(0.01, round2(fair * (1 + dir * pct))),
        quantity: 10 + Math.floor(rng() * 191),
      };
    });
  return { asks: mk(1), bids: mk(-1) };
}

/** 30% 概率发吃单 */
export const shouldTake = (rng: Rng) => rng() < 0.3;

/** 吃单量 10~80 吨 */
export const takeQty = (rng: Rng) => 10 + Math.floor(rng() * 71);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: 8 个测试全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot-math.ts src/lib/bot-math.test.ts
git commit -m "feat: 做市机器人定价纯逻辑(TDD)"
```

---

### Task 4: 机器人运行时 + instrumentation

**Files:**
- Create: `src/lib/bot.ts`
- Create: `src/instrumentation.ts`

- [ ] **Step 1: 实现 bot.ts**

```ts
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
```

- [ ] **Step 2: 创建 src/instrumentation.ts**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.BOT_DISABLED === "1") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startMarketBot } = await import("./lib/bot");
  startMarketBot();
}
```

- [ ] **Step 3: 启动 dev server 验证行情在动**

启动 dev server（推荐用 preview_start，或后台 `npm run dev`），等待约 15 秒后连续两次请求：

```bash
curl -s localhost:3000/api/assets | python3 -c "import sys,json; print([ (a['symbol'], a['lastPrice']) for a in json.load(sys.stdin)['data'] ])"
sleep 8
curl -s localhost:3000/api/assets | python3 -c "import sys,json; print([ (a['symbol'], a['lastPrice']) for a in json.load(sys.stdin)['data'] ])"
```

Expected: 服务端日志出现 `[bot] 做市机器人启动`；两次输出的 `lastPrice` 有变化（至少部分标的）。

- [ ] **Step 4: Commit**

```bash
git add src/lib/bot.ts src/instrumentation.ts
git commit -m "feat: 服务端做市机器人(instrumentation 启动)"
```

---

### Task 5: K 线聚合纯逻辑（TDD）

**Files:**
- Create: `src/lib/candles.ts`
- Test: `src/lib/candles.test.ts`

- [ ] **Step 1: 写失败的测试**

`src/lib/candles.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { bucketTrades, INTERVALS } from "./candles";

const T0 = Date.parse("2026-06-13T08:00:00.000Z");
const tr = (offsetSec: number, price: number, quantity = 10) => ({
  price,
  quantity,
  createdAt: new Date(T0 + offsetSec * 1000),
});

describe("bucketTrades", () => {
  it("空输入返回空数组", () => {
    expect(bucketTrades([], 60_000)).toEqual([]);
  });

  it("同一分钟内聚合出正确 OHLCV", () => {
    const out = bucketTrades([tr(0, 10), tr(10, 14), tr(20, 8), tr(30, 12, 5)], 60_000);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ o: 10, h: 14, l: 8, c: 12, v: 35 });
    expect(out[0].t).toBe("2026-06-13T08:00:00.000Z");
  });

  it("跨桶切分且按时间升序", () => {
    const out = bucketTrades([tr(70, 20), tr(5, 10)], 60_000); // 乱序输入
    expect(out).toHaveLength(2);
    expect(out[0].c).toBe(10);
    expect(out[1].o).toBe(20);
  });

  it("最多返回 240 根(保留最新的)", () => {
    const trades = Array.from({ length: 300 }, (_, i) => tr(i * 60, 100 + i));
    const out = bucketTrades(trades, 60_000);
    expect(out).toHaveLength(240);
    expect(out[239].c).toBe(100 + 299);
  });
});

describe("INTERVALS", () => {
  it("提供 1m/5m/1h/1d 四个周期", () => {
    expect(Object.keys(INTERVALS)).toEqual(["1m", "5m", "1h", "1d"]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL — `Cannot find module './candles'`。

- [ ] **Step 3: 实现 candles.ts**

```ts
// K线聚合 — 从成交记录在内存中聚合 OHLCV, 纯函数
export type CandleInput = { price: number; quantity: number; createdAt: Date };
export type Candle = { t: string; o: number; h: number; l: number; c: number; v: number };

export const INTERVALS = {
  "1m": { ms: 60_000, lookbackMs: 4 * 3_600_000 },
  "5m": { ms: 300_000, lookbackMs: 24 * 3_600_000 },
  "1h": { ms: 3_600_000, lookbackMs: 7 * 86_400_000 },
  "1d": { ms: 86_400_000, lookbackMs: 90 * 86_400_000 },
} as const;
export type IntervalKey = keyof typeof INTERVALS;

export function bucketTrades(trades: CandleInput[], intervalMs: number): Candle[] {
  const sorted = [...trades].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const map = new Map<number, Candle>();
  for (const tr of sorted) {
    const bucket = Math.floor(tr.createdAt.getTime() / intervalMs) * intervalMs;
    const c = map.get(bucket);
    if (!c) {
      map.set(bucket, { t: new Date(bucket).toISOString(), o: tr.price, h: tr.price, l: tr.price, c: tr.price, v: tr.quantity });
    } else {
      c.h = Math.max(c.h, tr.price);
      c.l = Math.min(c.l, tr.price);
      c.c = tr.price;
      c.v += tr.quantity;
    }
  }
  return [...map.values()].slice(-240);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: 全部 PASS（含 Task 3 的测试）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/candles.ts src/lib/candles.test.ts
git commit -m "feat: K线 OHLCV 聚合纯逻辑(TDD)"
```

---

### Task 6: K 线 API 路由

**Files:**
- Create: `src/app/api/assets/[symbol]/candles/route.ts`

- [ ] **Step 1: 实现路由**

```ts
import { prisma } from "@/lib/db";
import { ok, fail, handle } from "@/lib/api";
import { bucketTrades, INTERVALS, type IntervalKey } from "@/lib/candles";

export async function GET(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await ctx.params;
    const interval = new URL(req.url).searchParams.get("interval") ?? "1m";
    const cfg = INTERVALS[interval as IntervalKey];
    if (!cfg) return fail("interval 必须是 1m/5m/1h/1d", 400);

    const asset = await prisma.asset.findUnique({ where: { symbol }, select: { id: true } });
    if (!asset) return fail("标的不存在", 404);

    const trades = await prisma.trade.findMany({
      where: { assetId: asset.id, createdAt: { gte: new Date(Date.now() - cfg.lookbackMs) } },
      select: { price: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return ok({ candles: bucketTrades(trades, cfg.ms) });
  } catch (err) {
    return handle(err);
  }
}
```

- [ ] **Step 2: 验证**

dev server 运行中（机器人已产生成交）：

```bash
curl -s "localhost:3000/api/assets/VCS-FOR-2021/candles?interval=1m" | head -c 400
curl -s "localhost:3000/api/assets/VCS-FOR-2021/candles?interval=2m"
```

Expected: 第一条返回 `{"ok":true,"data":{"candles":[{"t":...,"o":...}]}}` 且数组非空；第二条返回 400 错误信息。

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/assets/[symbol]/candles/route.ts"
git commit -m "feat: K线数据 API"
```

---

### Task 7: assets API 增强（24h 涨跌 + spark + 24h 统计）

**Files:**
- Modify: `src/app/api/assets/route.ts`
- Modify: `src/app/api/assets/[symbol]/route.ts`

- [ ] **Step 1: 列表接口加 change24h 和 spark**

`src/app/api/assets/route.ts` 顶部加 import：

```ts
import { bucketTrades } from "@/lib/candles";
```

将 `Promise.all([...])` 中的 `prisma.trade.aggregate(...)` 一项替换为成交明细查询，并基于它计算 24h 量、涨跌幅与 spark。完整替换 `assets.map(async (a) => {...})` 回调体：

```ts
        const [bestBid, bestAsk, t24] = await Promise.all([
          prisma.order.findFirst({
            where: { assetId: a.id, side: "BUY", status: { in: ["OPEN", "PARTIAL"] } },
            orderBy: { price: "desc" },
            select: { price: true },
          }),
          prisma.order.findFirst({
            where: { assetId: a.id, side: "SELL", status: { in: ["OPEN", "PARTIAL"] } },
            orderBy: { price: "asc" },
            select: { price: true },
          }),
          prisma.trade.findMany({
            where: { assetId: a.id, createdAt: { gte: since } },
            orderBy: { createdAt: "asc" },
            select: { price: true, quantity: true, createdAt: true },
          }),
        ]);
        let volume24h = 0;
        for (const t of t24) volume24h += t.quantity;
        const change24h = t24.length >= 2 ? ((t24[t24.length - 1].price - t24[0].price) / t24[0].price) * 100 : null;
        const spark = bucketTrades(t24, 30 * 60_000).map((c) => c.c).slice(-48);
        return {
          ...a,
          bestBid: bestBid?.price ?? null,
          bestAsk: bestAsk?.price ?? null,
          volume24h,
          change24h,
          spark,
        };
```

- [ ] **Step 2: 详情接口加 24h 统计**

`src/app/api/assets/[symbol]/route.ts` 中，在 `let holding = null;` 之前加：

```ts
    const since = new Date(Date.now() - 24 * 3_600_000);
    const t24 = await prisma.trade.findMany({
      where: { assetId: asset.id, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { price: true, quantity: true },
    });
    let high24h: number | null = null;
    let low24h: number | null = null;
    let vol24h = 0;
    for (const t of t24) {
      high24h = high24h == null ? t.price : Math.max(high24h, t.price);
      low24h = low24h == null ? t.price : Math.min(low24h, t.price);
      vol24h += t.quantity;
    }
    const change24h = t24.length >= 2 ? ((t24[t24.length - 1].price - t24[0].price) / t24[0].price) * 100 : null;
    const stats = { high24h, low24h, vol24h, change24h };
```

并把返回改为：

```ts
    return ok({ asset, stats, book, trades, holding, myOrders });
```

- [ ] **Step 3: 验证**

```bash
curl -s localhost:3000/api/assets | python3 -c "import sys,json; a=json.load(sys.stdin)['data'][0]; print(a['change24h'], len(a['spark']))"
curl -s localhost:3000/api/assets/VCS-FOR-2021 | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['stats'])"
```

Expected: 第一条输出涨跌幅数字和 spark 长度；第二条输出含 high24h/low24h/vol24h/change24h 的 dict。

- [ ] **Step 4: Commit**

```bash
git add src/app/api/assets/route.ts "src/app/api/assets/[symbol]/route.ts"
git commit -m "feat: 行情 API 增加 24h 涨跌/统计与迷你走势数据"
```

---

### Task 8: 动画基础组件

**Files:**
- Create: `src/components/anim/NumberTicker.tsx`
- Create: `src/components/anim/FlashCell.tsx`
- Create: `src/components/anim/Reveal.tsx`
- Create: `src/components/anim/Toast.tsx`
- Create: `src/app/template.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: NumberTicker.tsx（数字滚动）**

```tsx
"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { fmtMoney, fmtQty } from "@/lib/format";

export function NumberTicker({
  value,
  format = "money",
  className,
}: {
  value: number;
  format?: "money" | "qty";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 80, damping: 20 });
  const text = useTransform(spring, (v) => (format === "money" ? fmtMoney(v) : fmtQty(Math.round(v))));

  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [value, spring, reduced]);

  return <motion.span className={className}>{text}</motion.span>;
}
```

- [ ] **Step 2: FlashCell.tsx（涨绿跌红闪烁）**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

export function FlashCell({
  value,
  children,
  className = "",
}: {
  value: number | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  const prev = useRef<number | null | undefined>(undefined);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const old = prev.current;
    prev.current = value;
    if (old != null && value != null && value !== old) {
      setFlash(value > old ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      className={`${className} rounded transition-colors duration-500 ${
        flash === "up" ? "bg-up/15" : flash === "down" ? "bg-down/15" : "bg-transparent"
      }`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Reveal.tsx（滚动入场）**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Toast.tsx（全局通知）**

```tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ToastItem = { id: number; type: "ok" | "err"; text: string };
type PushToast = (type: "ok" | "err", text: string) => void;

const ToastCtx = createContext<PushToast>(() => {});
export const useToast = () => useContext(ToastCtx);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<PushToast>((type, text) => {
    const id = nextId++;
    setToasts((ts) => [...ts, { id, type, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className={`px-4 py-2.5 rounded-xl shadow-card border text-sm bg-surface ${
                t.type === "ok" ? "border-up/40 text-up" : "border-down/40 text-down"
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
```

- [ ] **Step 5: src/app/template.tsx（页面转场）**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.21, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 6: layout.tsx 接入 ToastProvider**

`src/app/layout.tsx` 加 import：

```tsx
import { ToastProvider } from "@/components/anim/Toast";
```

body 内容包一层（Nav/main/footer 不变）：

```tsx
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <Nav />
          <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-8">{children}</main>
          <footer className="border-t border-border text-muted text-xs text-center py-6">
            Carbadia · 碳信用交易所 · carbadia.io — 仅供演示, 非真实交易
          </footer>
        </ToastProvider>
      </body>
```

- [ ] **Step 7: 验证**

dev server 下访问首页和 /otc，页面切换应有淡入上移转场，无控制台报错。

- [ ] **Step 8: Commit**

```bash
git add src/components/anim src/app/template.tsx src/app/layout.tsx
git commit -m "feat: 动画基础组件(NumberTicker/FlashCell/Reveal/Toast/转场)"
```

---

### Task 9: Nav 升级（模拟盘徽标 + 滑动指示 + 数字滚动）

**Files:**
- Modify: `src/components/Nav.tsx`（整文件替换）

- [ ] **Step 1: 整文件替换 Nav.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/format";
import { NumberTicker } from "@/components/anim/NumberTicker";

type Me = { id: string; name: string; email: string; cashBalance: number; lockedCash: number } | null;

const links = [
  { href: "/", label: "行情" },
  { href: "/otc", label: "OTC 挂牌" },
  { href: "/portfolio", label: "我的资产" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled ? "border-border bg-surface/80 shadow-soft" : "border-border/60 bg-surface/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-12 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-accent text-lg">🌿</span>
          <span>Carbadia</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
            模拟盘
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className="relative px-3 py-1.5 rounded-full">
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 bg-surface-2 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className={`relative transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {!loaded ? null : me ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted">可用现金</div>
                <div className="tnum text-accent">
                  ¥<NumberTicker value={me.cashBalance} />
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <span className="text-muted">{me.name}</span>
              <button onClick={logout} className="text-muted hover:text-down transition-colors">
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 验证**

浏览器中点击 行情/OTC/我的资产，active 圆角背景应平滑滑动；logo 旁出现"模拟盘"徽标；登录后现金数字随行情变化滚动（机器人成交不影响用户现金，但登录刚加载时会从 0 滚到实际值）。

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.tsx
git commit -m "feat: Nav 模拟盘徽标+滑动指示+数字滚动"
```

---

### Task 10: Sparkline 组件

**Files:**
- Create: `src/components/charts/Sparkline.tsx`

- [ ] **Step 1: 实现**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";

export function Sparkline({ data, width = 96, height = 28 }: { data: number[]; width?: number; height?: number }) {
  const reduced = useReducedMotion();
  if (data.length < 2) return <span className="text-muted text-xs">—</span>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 2 - ((v - min) / span) * (height - 4),
  ]);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.path
        d={d}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        className={up ? "stroke-up" : "stroke-down"}
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**（验证随 Task 14 首页一起做）

```bash
git add src/components/charts/Sparkline.tsx
git commit -m "feat: 迷你走势图组件"
```

---

### Task 11: CandleChart 组件

**Files:**
- Create: `src/components/charts/CandleChart.tsx`

- [ ] **Step 1: 实现**

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Candle } from "@/lib/candles";
import { fmtMoney, fmtQty } from "@/lib/format";

const W = 760;
const H = 360;
const VOL_H = 56;
const PAD_R = 56;
const PAD_T = 26;
const PAD_B = 8;

export function CandleChart({ candles, lastPrice }: { candles: Candle[]; lastPrice: number | null }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const view = useMemo(() => {
    if (candles.length === 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    let maxV = 1;
    for (const c of candles) {
      lo = Math.min(lo, c.l);
      hi = Math.max(hi, c.h);
      maxV = Math.max(maxV, c.v);
    }
    const span = hi - lo || hi * 0.01 || 1;
    const plotW = W - PAD_R;
    const plotH = H - VOL_H - PAD_T - PAD_B;
    const step = plotW / candles.length;
    const bw = Math.max(2, Math.min(12, step * 0.6));
    return {
      lo,
      hi,
      plotH,
      step,
      bw,
      x: (i: number) => i * step + step / 2,
      y: (p: number) => PAD_T + (1 - (p - lo) / span) * plotH,
      vy: (v: number) => (v / maxV) * (VOL_H - 6),
    };
  }, [candles]);

  if (!view) {
    return <div className="h-[360px] flex items-center justify-center text-muted text-sm">暂无成交数据，等待行情…</div>;
  }

  const { x, y, vy, bw } = view;
  const hc = hover != null ? candles[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round((px - view!.step / 2) / view!.step);
    setHover(Math.max(0, Math.min(candles.length - 1, i)));
  }

  return (
    <div className="relative">
      <div className="absolute top-0 left-2 z-10 text-[11px] tnum text-muted flex flex-wrap gap-x-3 bg-surface/80 backdrop-blur px-2 py-0.5 rounded">
        {hc ? (
          <>
            <span>{new Date(hc.t).toLocaleString("zh-CN", { hour12: false })}</span>
            <span>开 {fmtMoney(hc.o)}</span>
            <span className="text-up">高 {fmtMoney(hc.h)}</span>
            <span className="text-down">低 {fmtMoney(hc.l)}</span>
            <span>收 {fmtMoney(hc.c)}</span>
            <span>量 {fmtQty(hc.v)}</span>
          </>
        ) : (
          <span>{candles.length} 根 K 线</span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const price = view.lo + (view.hi - view.lo) * (1 - f);
          const gy = PAD_T + f * view.plotH;
          return (
            <g key={f}>
              <line x1={0} y1={gy} x2={W - PAD_R} y2={gy} className="stroke-border" strokeDasharray="2 4" strokeWidth={0.5} />
              <text x={W - PAD_R + 6} y={gy + 3.5} className="fill-muted" fontSize={10}>
                {fmtMoney(price)}
              </text>
            </g>
          );
        })}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const cls = up ? "fill-up stroke-up" : "fill-down stroke-down";
          const bodyTop = y(Math.max(c.o, c.c));
          const bodyH = Math.max(1, Math.abs(y(c.o) - y(c.c)));
          return (
            <motion.g
              key={c.t}
              className={cls}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : Math.min(i * 0.004, 0.5) }}
            >
              <line x1={x(i)} y1={y(c.h)} x2={x(i)} y2={y(c.l)} strokeWidth={1} />
              <rect x={x(i) - bw / 2} y={bodyTop} width={bw} height={bodyH} rx={1} />
              <rect x={x(i) - bw / 2} y={H - PAD_B - vy(c.v)} width={bw} height={vy(c.v)} opacity={0.35} />
            </motion.g>
          );
        })}
        {lastPrice != null && lastPrice >= view.lo && lastPrice <= view.hi && (
          <g>
            <line x1={0} y1={y(lastPrice)} x2={W - PAD_R} y2={y(lastPrice)} className="stroke-accent" strokeDasharray="4 4" strokeWidth={1} />
            <motion.circle
              cx={x(candles.length - 1)}
              cy={y(lastPrice)}
              r={3}
              className="fill-accent"
              animate={reduced ? undefined : { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
          </g>
        )}
        {hover != null && (
          <line
            x1={x(hover)}
            y1={PAD_T}
            x2={x(hover)}
            y2={H - PAD_B}
            className="stroke-muted pointer-events-none"
            strokeDasharray="3 3"
            strokeWidth={0.75}
          />
        )}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**（验证随 Task 15 交易页一起做）

```bash
git add src/components/charts/CandleChart.tsx
git commit -m "feat: 自绘 SVG K线图组件"
```

---

### Task 12: DepthChart 组件

**Files:**
- Create: `src/components/charts/DepthChart.tsx`

- [ ] **Step 1: 实现**

```tsx
"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fmtMoney, fmtQty } from "@/lib/format";

type Level = { price: number; quantity: number };
type CumLevel = { price: number; quantity: number; cum: number };

const W = 760;
const H = 300;
const PAD = 16;

export function DepthChart({ bids, asks }: { bids: Level[]; asks: Level[] }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<CumLevel | null>(null);

  const view = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) return null;
    let acc = 0;
    const cumBids: CumLevel[] = bids.map((b) => ({ ...b, cum: (acc += b.quantity) })); // bids 已按价格从高到低
    acc = 0;
    const cumAsks: CumLevel[] = asks.map((a) => ({ ...a, cum: (acc += a.quantity) })); // asks 已按价格从低到高
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of [...bids, ...asks]) {
      lo = Math.min(lo, l.price);
      hi = Math.max(hi, l.price);
    }
    const span = hi - lo || 1;
    const maxCum = Math.max(cumBids[cumBids.length - 1]?.cum ?? 0, cumAsks[cumAsks.length - 1]?.cum ?? 0, 1);
    return {
      cumBids,
      cumAsks,
      x: (p: number) => PAD + ((p - lo) / span) * (W - PAD * 2),
      y: (c: number) => H - PAD - (c / maxCum) * (H - PAD * 2),
    };
  }, [bids, asks]);

  if (!view) return <div className="h-[300px] flex items-center justify-center text-muted text-sm">暂无挂单</div>;

  const { cumBids, cumAsks, x, y } = view;

  function stepPath(levels: CumLevel[], edgeX: number) {
    if (levels.length === 0) return "";
    let d = `M${x(levels[0].price)},${H - PAD}`;
    let prevY = H - PAD;
    for (const l of levels) {
      d += ` L${x(l.price)},${prevY} L${x(l.price)},${y(l.cum)}`;
      prevY = y(l.cum);
    }
    d += ` L${edgeX},${prevY} L${edgeX},${H - PAD} Z`;
    return d;
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: CumLevel | null = null;
    let bestD = Infinity;
    for (const l of [...cumBids, ...cumAsks]) {
      const d = Math.abs(x(l.price) - px);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    setHover(best);
  }

  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : null;

  return (
    <div className="relative">
      <div className="absolute top-0 left-2 z-10 text-[11px] tnum text-muted flex gap-3 bg-surface/80 backdrop-blur px-2 py-0.5 rounded">
        {hover ? (
          <>
            <span>价 {fmtMoney(hover.price)}</span>
            <span>档量 {fmtQty(hover.quantity)}</span>
            <span>累计 {fmtQty(hover.cum)} 吨</span>
          </>
        ) : spread != null ? (
          <span>价差 {fmtMoney(spread)}</span>
        ) : (
          <span>买卖盘深度</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <motion.path
          d={stepPath(cumBids, PAD)}
          className="fill-up/15 stroke-up"
          strokeWidth={1.5}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={stepPath(cumAsks, W - PAD)}
          className="fill-down/15 stroke-down"
          strokeWidth={1.5}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: reduced ? 0 : 0.15 }}
        />
        {hover && (
          <line x1={x(hover.price)} y1={PAD} x2={x(hover.price)} y2={H - PAD} className="stroke-muted" strokeDasharray="3 3" strokeWidth={0.75} />
        )}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**（验证随 Task 15 交易页一起做）

```bash
git add src/components/charts/DepthChart.tsx
git commit -m "feat: 自绘 SVG 深度图组件"
```

---

### Task 13: ParticleHero 组件

**Files:**
- Create: `src/components/anim/ParticleHero.tsx`

- [ ] **Step 1: 实现**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type P = { x: number; y: number; vx: number; vy: number; r: number };

export function ParticleHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const mouse = { x: 0.5, y: 0.5 };

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const N = 70;
    const ps: P[] = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: 1 + Math.random() * 2,
    }));

    const px = (p: P) => p.x * w + (mouse.x - 0.5) * 24 * p.r;
    const py = (p: P) => p.y * h + (mouse.y - 0.5) * 24 * p.r;

    let t = 0;
    function frame() {
      if (!running) return;
      t += 0.008;
      ctx!.clearRect(0, 0, w, h);

      // 呼吸光晕
      const cx = w * (0.5 + (mouse.x - 0.5) * 0.06);
      const cy = h * (0.42 + (mouse.y - 0.5) * 0.06);
      const rad = Math.max(w, h) * (0.5 + Math.sin(t) * 0.06);
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, "rgba(10,138,82,0.10)");
      grad.addColorStop(1, "rgba(10,138,82,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // 粒子
      for (const p of ps) {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        ctx!.beginPath();
        ctx!.arc(px(p), py(p), p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(10,138,82,0.35)";
        ctx!.fill();
      }

      // 近距连线(碳分子感)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = px(ps[i]) - px(ps[j]);
          const dy = py(ps[i]) - py(ps[j]);
          const d2 = dx * dx + dy * dy;
          if (d2 < 90 * 90) {
            ctx!.strokeStyle = `rgba(10,138,82,${(0.12 * (1 - Math.sqrt(d2) / 90)).toFixed(3)})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(px(ps[i]), py(ps[i]));
            ctx!.lineTo(px(ps[j]), py(ps[j]));
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    const onVis = () => {
      const visible = document.visibilityState === "visible";
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {reduced ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(10,138,82,0.08),transparent_70%)]" />
      ) : (
        <canvas ref={ref} className="w-full h-full" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**（验证随 Task 14 首页一起做）

```bash
git add src/components/anim/ParticleHero.tsx
git commit -m "feat: 首页 canvas 粒子 hero 组件"
```

---

### Task 14: 首页改版（粒子 hero + 行情表增强）

**Files:**
- Modify: `src/app/page.tsx`（整文件替换）

- [ ] **Step 1: 整文件替换 page.tsx**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { Sparkline } from "@/components/charts/Sparkline";
import { FlashCell } from "@/components/anim/FlashCell";
import { ParticleHero } from "@/components/anim/ParticleHero";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  standard: string;
  projectType: string;
  vintage: number;
  country: string;
  lastPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  volume24h: number;
  change24h: number | null;
  spark: number[];
};

const HERO_LINES = ["让每一吨碳", "都有公允的价格"];

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    const load = () =>
      api<Asset[]>("/api/assets")
        .then((a) => {
          setAssets(a);
          setErr("");
        })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-10">
      <section className="relative text-center pt-12 pb-6 sm:pt-20 sm:pb-10">
        <ParticleHero />
        <motion.p
          className="text-accent font-semibold mb-4 tracking-tight"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Carbadia · 碳信用交易所 · 模拟盘
        </motion.p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          {HERO_LINES.map((line, li) => (
            <span key={li} className="block">
              {[...line].map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={reduced ? false : { opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.06 * (li * line.length + i) + 0.15, duration: 0.55, ease: [0.21, 0.7, 0.3, 1] }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>
        <motion.p
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.5 }}
        >
          交易经核证的碳减排量。订单簿撮合的标准化现货，面向大宗的 OTC 挂牌，
          清晰透明，一处成交。
        </motion.p>
        <motion.div
          className="flex flex-wrap gap-3 justify-center mt-9"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.05, duration: 0.5 }}
        >
          <motion.span whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/portfolio"
              className="inline-block px-6 py-3 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
            >
              开始交易
            </Link>
          </motion.span>
          <motion.span whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/otc"
              className="inline-block px-6 py-3 rounded-full bg-surface-2 text-foreground font-medium hover:bg-border/60 transition-colors"
            >
              浏览 OTC 挂牌 →
            </Link>
          </motion.span>
        </motion.div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">现货行情</h2>
          <span className="text-xs text-muted">{assets.length} 个标的 · 实时模拟行情</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted">加载中…</div>
        ) : err ? (
          <div className="p-8 text-center text-down">{err}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-5 py-3">代码 / 项目</th>
                  <th className="text-left font-medium px-3 py-3 hidden md:table-cell">标准</th>
                  <th className="text-right font-medium px-3 py-3">最新价</th>
                  <th className="text-right font-medium px-3 py-3">24h 涨跌</th>
                  <th className="text-center font-medium px-3 py-3 hidden lg:table-cell">24h 走势</th>
                  <th className="text-right font-medium px-3 py-3 hidden sm:table-cell">买一 / 卖一</th>
                  <th className="text-right font-medium px-5 py-3">24h 量(吨)</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    className="border-b border-border/50 hover:bg-surface-2 transition-colors"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduced ? 0 : i * 0.05, duration: 0.35 }}
                  >
                    <td className="px-5 py-3">
                      <Link href={`/market/${a.symbol}`} className="block group">
                        <div className="font-medium group-hover:text-accent transition-colors">{a.symbol}</div>
                        <div className="text-xs text-muted truncate max-w-[200px]">{a.name}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{a.standard}</span>
                    </td>
                    <td className="px-3 py-3 text-right tnum font-medium">
                      <FlashCell value={a.lastPrice} className="inline-block px-1 -mx-1">
                        {a.lastPrice == null ? <span className="text-muted">—</span> : `¥${fmtMoney(a.lastPrice)}`}
                      </FlashCell>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {a.change24h == null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span
                          className={`tnum text-xs px-1.5 py-0.5 rounded font-medium ${
                            a.change24h >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                          }`}
                        >
                          {a.change24h >= 0 ? "+" : ""}
                          {a.change24h.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex justify-center">
                        <Sparkline data={a.spark} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tnum hidden sm:table-cell">
                      <span className="text-up">{a.bestBid == null ? "—" : fmtMoney(a.bestBid)}</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-down">{a.bestAsk == null ? "—" : fmtMoney(a.bestAsk)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tnum text-muted">{fmtQty(a.volume24h)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

浏览器打开首页：hero 背景有漂浮粒子+连线+呼吸光晕并随鼠标视差；标题逐字上浮；行情表行依次入场；最新价随机器人成交闪烁；24h 涨跌列和迷你走势图出现。

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: 首页粒子 hero + 实时行情表(涨跌/走势图/闪烁)"
```

---

### Task 15: 交易页改版（图表 + 动效 + Toast）

**Files:**
- Modify: `src/app/market/[symbol]/page.tsx`（整文件替换）

- [ ] **Step 1: 整文件替换**

```tsx
"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { CandleChart } from "@/components/charts/CandleChart";
import { DepthChart } from "@/components/charts/DepthChart";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { FlashCell } from "@/components/anim/FlashCell";
import { useToast } from "@/components/anim/Toast";
import type { Candle, IntervalKey } from "@/lib/candles";

type Level = { price: number; quantity: number };
type MarketData = {
  asset: {
    id: string; symbol: string; name: string; standard: string; projectType: string;
    vintage: number; country: string; registry: string; description: string; lastPrice: number | null;
  };
  stats: { high24h: number | null; low24h: number | null; vol24h: number; change24h: number | null };
  book: { bids: Level[]; asks: Level[] };
  trades: { id: string; price: number; quantity: number; createdAt: string }[];
  holding: { quantity: number; locked: number } | null;
  myOrders: { id: string; side: string; type: string; price: number | null; quantity: number; filledQuantity: number; status: string }[];
};

const INTERVAL_TABS: { key: IntervalKey; label: string }[] = [
  { key: "1m", label: "1分" },
  { key: "5m", label: "5分" },
  { key: "1h", label: "1时" },
  { key: "1d", label: "1日" },
];

export default function MarketPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState<IntervalKey>("1m");
  const [tab, setTab] = useState<"candles" | "depth">("candles");
  const [err, setErr] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<MarketData>(`/api/assets/${symbol}`);
      setData(d);
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [symbol]);

  const loadCandles = useCallback(async () => {
    try {
      const d = await api<{ candles: Candle[] }>(`/api/assets/${symbol}/candles?interval=${period}`);
      setCandles(d.candles);
    } catch {
      /* 图表数据失败不打断页面 */
    }
  }, [symbol, period]);

  useEffect(() => {
    api("/api/auth/me").then((u) => setLoggedIn(!!u)).catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    loadCandles();
    const t = setInterval(loadCandles, 5000);
    return () => clearInterval(t);
  }, [loadCandles]);

  if (err) return <div className="text-down p-8 text-center">{err}</div>;
  if (!data) return <div className="text-muted p-8 text-center">加载中…</div>;

  const { asset, stats, book, trades, holding, myOrders } = data;
  const maxDepth = Math.max(1, ...book.bids.map((b) => b.quantity), ...book.asks.map((a) => a.quantity));

  return (
    <div className="space-y-4">
      {/* 标的头部 */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{asset.symbol}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{asset.standard}</span>
          </div>
          <div className="text-muted text-sm">{asset.name}</div>
        </div>
        <div>
          <div className="text-xs text-muted">最新成交价</div>
          <div className="flex items-baseline gap-2">
            <FlashCell value={asset.lastPrice} className="inline-block px-1 -mx-1">
              <span className="tnum text-2xl font-semibold text-accent">
                {asset.lastPrice == null ? "—" : <>¥<NumberTicker value={asset.lastPrice} /></>}
              </span>
            </FlashCell>
            {stats.change24h != null && (
              <span
                className={`tnum text-xs px-1.5 py-0.5 rounded font-medium ${
                  stats.change24h >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                }`}
              >
                {stats.change24h >= 0 ? "+" : ""}
                {stats.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-sm space-y-0.5">
          <div className="text-xs text-muted">24h 高 / 低 / 量</div>
          <div className="tnum">
            <span className="text-up">{stats.high24h == null ? "—" : fmtMoney(stats.high24h)}</span>
            <span className="text-muted mx-1">/</span>
            <span className="text-down">{stats.low24h == null ? "—" : fmtMoney(stats.low24h)}</span>
            <span className="text-muted mx-1">/</span>
            <span>{fmtQty(stats.vol24h)} 吨</span>
          </div>
        </div>
        <div className="text-sm text-muted space-y-0.5">
          <div>项目类型: <span className="text-foreground">{asset.projectType}</span></div>
          <div>签发年份: <span className="text-foreground">{asset.vintage}</span> · 地区: <span className="text-foreground">{asset.country}</span></div>
          <div>登记簿: <span className="text-foreground">{asset.registry}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 左侧: 图表 + 最近成交 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2 border-b border-border flex items-center gap-1">
              {(["candles", "depth"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="relative px-3 py-1.5 text-sm rounded-full">
                  {tab === t && (
                    <motion.span
                      layoutId="chart-tab"
                      className="absolute inset-0 bg-surface-2 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-foreground font-medium" : "text-muted"}`}>
                    {t === "candles" ? "K线" : "深度"}
                  </span>
                </button>
              ))}
              {tab === "candles" && (
                <div className="ml-auto flex gap-1">
                  {INTERVAL_TABS.map((it) => (
                    <button
                      key={it.key}
                      onClick={() => setPeriod(it.key)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        period === it.key ? "bg-surface-2 text-foreground border border-border" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3">
              {tab === "candles" ? (
                <CandleChart candles={candles} lastPrice={asset.lastPrice} />
              ) : (
                <DepthChart bids={book.bids} asks={book.asks} />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">最近成交</div>
            <div className="p-2">
              <div className="grid grid-cols-3 text-xs text-muted px-2 pb-1">
                <span>价格</span><span className="text-right">数量</span><span className="text-right">时间</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {trades.length === 0 ? (
                  <div className="text-center text-muted text-sm py-8">暂无成交</div>
                ) : (
                  trades.map((t) => (
                    <motion.div
                      key={t.id}
                      className="grid grid-cols-3 text-xs tnum px-2 py-1 hover:bg-surface-2 rounded"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-accent">{fmtMoney(t.price)}</span>
                      <span className="text-right">{fmtQty(t.quantity)}</span>
                      <span className="text-right text-muted">
                        {new Date(t.createdAt).toLocaleTimeString("zh-CN", { hour12: false })}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧: 订单簿 + 下单 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">订单簿</div>
            <div className="p-2">
              <DepthSide levels={book.asks} side="ask" max={maxDepth} reverse />
              <div className="py-2 px-2 my-1 border-y border-border tnum text-center text-lg font-semibold">
                <FlashCell value={asset.lastPrice} className="inline-block px-2 -mx-2">
                  {asset.lastPrice == null ? <span className="text-muted text-sm">暂无成交</span> : `¥${fmtMoney(asset.lastPrice)}`}
                </FlashCell>
              </div>
              <DepthSide levels={book.bids} side="bid" max={maxDepth} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">下单</div>
            <div className="p-4">
              {loggedIn === false ? (
                <div className="text-center text-muted text-sm py-8">
                  请先<Link href="/login" className="text-accent mx-1">登录</Link>后交易
                </div>
              ) : (
                <OrderForm
                  assetId={asset.id}
                  bestAsk={book.asks[0]?.price ?? null}
                  bestBid={book.bids[0]?.price ?? null}
                  holding={holding}
                  onDone={load}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 我的挂单 */}
      {loggedIn && (
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="px-4 py-2.5 border-b border-border font-semibold text-sm flex items-center justify-between">
            <span>我的当前委托</span>
            {holding && <span className="text-xs text-muted">持仓 {fmtQty(holding.quantity)} 吨(冻结 {fmtQty(holding.locked)})</span>}
          </div>
          {myOrders.length === 0 ? (
            <div className="text-center text-muted text-sm py-6">无未完成委托</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted text-xs">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">方向</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium">价格</th>
                  <th className="text-right px-3 py-2 font-medium">已成交/总量</th>
                  <th className="text-right px-4 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border/40">
                    <td className={`px-4 py-2 font-medium ${o.side === "BUY" ? "text-up" : "text-down"}`}>
                      {o.side === "BUY" ? "买入" : "卖出"}
                    </td>
                    <td className="px-3 py-2 text-muted">{o.type === "LIMIT" ? "限价" : "市价"}</td>
                    <td className="px-3 py-2 text-right tnum">{o.price == null ? "市价" : fmtMoney(o.price)}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtQty(o.filledQuantity)} / {fmtQty(o.quantity)}</td>
                    <td className="px-4 py-2 text-right">
                      <CancelOrderBtn id={o.id} onDone={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function DepthSide({ levels, side, max, reverse }: { levels: Level[]; side: "bid" | "ask"; max: number; reverse?: boolean }) {
  const rows = reverse ? [...levels].reverse() : levels;
  const color = side === "bid" ? "text-up" : "text-down";
  const bar = side === "bid" ? "bg-up/10" : "bg-down/10";
  return (
    <div>
      {rows.length === 0 && <div className="text-center text-muted text-xs py-3">无挂单</div>}
      {rows.map((l) => (
        <motion.div
          key={l.price}
          className="relative grid grid-cols-2 text-xs tnum px-2 py-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={`absolute inset-y-0 right-0 ${bar}`}
            animate={{ width: `${(l.quantity / max) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
          <span className={`relative ${color}`}>{fmtMoney(l.price)}</span>
          <span className="relative text-right">{fmtQty(l.quantity)}</span>
        </motion.div>
      ))}
    </div>
  );
}

function OrderForm({
  assetId, bestAsk, bestBid, holding, onDone,
}: {
  assetId: string;
  bestAsk: number | null;
  bestBid: number | null;
  holding: { quantity: number; locked: number } | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const available = holding ? holding.quantity - holding.locked : 0;
  const estTotal = type === "LIMIT" && price && quantity ? Number(price) * Number(quantity) : null;

  async function submit() {
    setBusy(true);
    try {
      const res = await api<{ filledQty: number; order: { status: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          assetId,
          side,
          type,
          price: type === "LIMIT" ? Number(price) : null,
          quantity: Number(quantity),
        }),
      });
      toast(
        "ok",
        res.filledQty > 0
          ? `成交 ${res.filledQty} 吨，订单${statusZh(res.order.status)}`
          : `已挂单（${statusZh(res.order.status)}）`
      );
      setQuantity("");
      setDone(true);
      setTimeout(() => setDone(false), 1200);
      onDone();
    } catch (e) {
      toast("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${side === "BUY" ? "bg-up text-background" : "bg-surface-2 text-muted hover:text-foreground"}`}
        >买入</button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${side === "SELL" ? "bg-down text-background" : "bg-surface-2 text-muted hover:text-foreground"}`}
        >卖出</button>
      </div>

      <div className="flex gap-2 text-xs">
        {(["LIMIT", "MARKET"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded ${type === t ? "bg-surface-2 text-foreground border border-border" : "text-muted"}`}
          >{t === "LIMIT" ? "限价单" : "市价单"}</button>
        ))}
      </div>

      {type === "LIMIT" && (
        <label className="block">
          <span className="text-xs text-muted">价格 (元/吨)</span>
          <div className="flex gap-2 mt-1">
            <input
              type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm tnum outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setPrice(String((side === "BUY" ? bestAsk : bestBid) ?? ""))}
              className="text-xs text-muted hover:text-foreground px-2 whitespace-nowrap"
            >对手价</button>
          </div>
        </label>
      )}

      <label className="block">
        <span className="text-xs text-muted">数量 (吨)</span>
        <input
          type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
          placeholder="0" min="1" step="1"
          className="w-full mt-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm tnum outline-none focus:border-accent"
        />
        {side === "SELL" && (
          <button type="button" onClick={() => setQuantity(String(available))} className="text-xs text-muted hover:text-foreground mt-1">
            可用 {fmtQty(available)} 吨 · 全部
          </button>
        )}
      </label>

      {estTotal != null && (
        <div className="text-xs text-muted flex justify-between">
          <span>预估金额</span>
          <span className="tnum text-foreground">¥{fmtMoney(estTotal)}</span>
        </div>
      )}

      <motion.button
        onClick={submit}
        disabled={busy || !quantity || (type === "LIMIT" && !price)}
        whileTap={{ scale: 0.97 }}
        animate={done ? { scale: [1, 1.04, 1] } : undefined}
        className={`w-full py-3 rounded-full font-medium text-background disabled:opacity-40 transition-colors ${
          done ? "bg-accent" : side === "BUY" ? "bg-up" : "bg-down"
        }`}
      >
        {busy ? "提交中…" : done ? "✓ 已提交" : side === "BUY" ? "买入" : "卖出"}
      </motion.button>
    </div>
  );
}

function CancelOrderBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/orders/${id}`, { method: "DELETE" });
          toast("ok", "已撤单");
          onDone();
        } catch (e) {
          toast("err", (e as Error).message);
          setBusy(false);
        }
      }}
      className="text-xs text-muted hover:text-down disabled:opacity-40"
    >撤单</button>
  );
}

function statusZh(s: string) {
  return ({ OPEN: "挂单中", PARTIAL: "部分成交", FILLED: "全部成交", CANCELLED: "已撤销" } as Record<string, string>)[s] ?? s;
}
```

- [ ] **Step 2: 验证**

打开 `/market/VCS-FOR-2021`：K线图渲染且每 5 秒刷新、周期切换工作、悬浮显示 OHLCV 与 crosshair；切到"深度"显示双色面积图；订单簿档位深度条弹性变化、最新价闪烁滚动；登录 alice 下一笔限价单 → Toast 出现、按钮变绿打勾；头部显示 24h 高/低/量与涨跌幅。

- [ ] **Step 3: Commit**

```bash
git add "src/app/market/[symbol]/page.tsx"
git commit -m "feat: 交易页改版 — K线/深度图+实时动效+Toast"
```

---

### Task 16: Portfolio / OTC 动效铺设

**Files:**
- Modify: `src/app/portfolio/page.tsx`
- Modify: `src/app/otc/page.tsx`

- [ ] **Step 1: portfolio 统计卡数字滚动 + 分区入场**

`src/app/portfolio/page.tsx` 顶部 import 增加：

```tsx
import { NumberTicker } from "@/components/anim/NumberTicker";
import { Reveal } from "@/components/anim/Reveal";
```

`Stat` 组件整体替换为（value 由 string 改 number，内部用 NumberTicker）：

```tsx
function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tnum text-lg font-semibold mt-1 ${accent ? "text-accent" : ""}`}>
        ¥<NumberTicker value={value} />
      </div>
    </div>
  );
}
```

四个 Stat 调用处替换为：

```tsx
        <Stat label="总资产估值" value={p.totalAssets} accent />
        <Stat label="可用现金" value={p.cashBalance} />
        <Stat label="冻结现金" value={p.lockedCash} />
        <Stat label="持仓市值" value={p.holdingsValue} />
```

并把页面主体各分区包上 Reveal（统计卡 grid 与每个 `<Card>` 外层各包一个，依次加 delay）：

```tsx
      <Reveal><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">…四个 Stat…</div></Reveal>
      <Reveal delay={0.05}><Card title="持仓">…</Card></Reveal>
      <Reveal delay={0.1}><Card title="当前委托">…</Card></Reveal>
      {p.otcListings.length > 0 && (<Reveal delay={0.15}><Card title="我的 OTC 挂牌">…</Card></Reveal>)}
      <Reveal delay={0.2}><Card title="成交历史">…</Card></Reveal>
```

（"…"表示保持原有 JSX 子内容不变，只加包装层。）

- [ ] **Step 2: portfolio 改为轮询刷新**

`useEffect(() => { load(); }, [load]);` 替换为：

```tsx
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);
```

- [ ] **Step 3: OTC 页 Toast + 入场动画**

`src/app/otc/page.tsx` 顶部 import 增加：

```tsx
import { Reveal } from "@/components/anim/Reveal";
import { useToast } from "@/components/anim/Toast";
```

(a) 挂牌列表卡片外层包 `<Reveal>`（即 `<div className="rounded-2xl border ...">` 那个卡片）。

(b) `BuyListing` 组件内加 `const toast = useToast();`（第一行），`buy()` 成功分支 `setOpen(false);` 之前加：

```tsx
      toast("ok", `已购买 ${qty} 吨`);
```

失败分支 `setErr((e as Error).message);` 替换为：

```tsx
      toast("err", (e as Error).message);
```

并删除组件内 `err` state 与 `{err && <span ...>}` 渲染（已由 Toast 取代）。

(c) `CreateListing` 组件内同样加 `const toast = useToast();`，`submit()` 成功的 `onDone();` 之前加：

```tsx
      toast("ok", "挂牌已发布");
```

- [ ] **Step 4: 验证**

/portfolio：四张统计卡数字滚动入场、分区依次上浮、行情变化时市值数字滚动更新。/otc：购买/发布操作弹出 Toast。

- [ ] **Step 5: Commit**

```bash
git add src/app/portfolio/page.tsx src/app/otc/page.tsx
git commit -m "feat: portfolio/OTC 动效与 Toast 接入"
```

---

### Task 17: 全链路验证

**Files:** 无新增（只验证与修复）

- [ ] **Step 1: 单测 + lint + build**

```bash
npm test          # 期望: bot-math + candles 全部 PASS
npm run lint      # 期望: 无 error
BOT_DISABLED=1 npm run build   # 期望: build 成功
```

任何失败先修复再继续。

- [ ] **Step 2: 端到端手动验证（preview 工具）**

dev server 下逐项确认：

1. 首页：粒子 hero、标题逐字入场、行情表每 2 秒刷新且最新价闪烁、24h 涨跌与迷你走势图渲染。
2. 交易页：K线 4 个周期都有数据（1d 可能只有 1 根，正常）；深度图渲染；订单簿持续翻动。
3. 登录 alice@carbonex.io / password123：下限价单（贴近盘口）→ 数秒内被机器人吃掉 → Toast 提示 + 委托列表变化。
4. 市价单买入 → 立即成交。撤单 → Toast"已撤单"。
5. /portfolio：数字滚动、3 秒轮询更新市值。
6. /otc：发布挂牌→Toast；另一账号购买→Toast。
7. 页面切换转场、Nav 指示条滑动、"模拟盘"徽标。
8. 系统设置开启"减弱动态效果"（或 DevTools 模拟 prefers-reduced-motion）→ 粒子变静态渐变、入场动画消失、功能正常。

- [ ] **Step 3: 提交收尾**

如验证过程中有修复，逐项提交；最后：

```bash
git status   # 确认无遗漏
```
