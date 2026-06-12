# Carbadia 交易所完全体升级 — 设计文档

日期: 2026-06-13
状态: 已与用户确认方案 A（精品自绘 + 轻量炫效）

## 1. 背景与目标

Carbadia 当前是一个可用的碳信用交易所 MVP：订单簿撮合（限价/市价）、OTC 挂牌、投资组合、登录注册。但作为"交易所"仍有明显缺口：没有行情图表、盘面是静止的演示数据、缺少碳交易所特色功能（注销/退役）、没有资金管理，且动画几乎为零。

本次升级目标：

1. **功能做全** — 价格图表与深度图、模拟行情机器人、碳信用注销/退役证书、资金钱包。
2. **设计感动画（越炫越好）** — 在保持 Apple Light 设计语言的前提下，做全站动效体系：首页 canvas 粒子 hero、页面转场、数字滚动、价格闪烁、图表入场动画、证书仪式动画等。

非目标（明确不做）：真实行情接入、期货/杠杆/保证金、SSE/WebSocket 推送（沿用轮询，缩短到 2 秒）、暗色模式、移动原生 App、国际化。

## 2. 技术选型

- **动画**: `motion`（framer-motion 的当前发行名）。用于页面转场、layout 动画、stagger 入场、数字滚动、whileInView reveal。
- **庆祝动效**: `canvas-confetti`（约 2KB），用于注销证书生成、大额成交。
- **图表**: 不引入图表库，全部自绘 SVG/Canvas（K 线、深度图、迷你走势图），保证设计统一并可深度动画化。
- **行情机器人**: 跑在 Next.js 服务端（`instrumentation.ts` 启动后台循环）。实现前必须先阅读 `node_modules/next/dist/docs/` 中 instrumentation 相关文档（AGENTS.md 约束：本项目的 Next.js 与训练数据可能不同）。

## 3. 数据模型变更（prisma/schema.prisma）

沿用现有约定：数量 = Int（吨），金额 = Float（元，2 位小数）。

```prisma
model User {
  // ……现有字段不变，新增：
  isBot       Boolean  @default(false)   // 做市机器人账户
  cashTxns    CashTransaction[]
  retirements Retirement[]
}

model Asset {
  // ……现有字段不变，新增：
  anchorPrice Float?   // 机器人均值回归锚定价(初始公允价)
  retirements Retirement[]
}

// 资金流水(仅记录充值/提现; 交易结算流水由 Trade/OtcDeal 推导)
model CashTransaction {
  id           String   @id @default(cuid())
  userId       String
  type         String   // DEPOSIT | WITHDRAW
  amount       Float    // 正数
  balanceAfter Float    // 操作后可用余额
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
  @@index([userId, createdAt])
}

// 碳信用注销/退役记录
model Retirement {
  id          String   @id @default(cuid())
  serial      String   @unique  // 证书编号 CBR-YYYY-NNNNNN
  userId      String
  assetId     String
  quantity    Int      // 注销数量(吨)
  beneficiary String   // 受益人(为谁抵消)
  reason      String   // 注销事由
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  asset       Asset    @relation(fields: [assetId], references: [id])
  @@index([userId, createdAt])
}
```

迁移方式：`prisma migrate dev`，并更新 `prisma/seed.ts`（见 §4）。

## 4. 模拟行情机器人

**目的**：让盘面活起来——价格持续波动、订单簿翻动、成交带打印、图表有数据。

**账户**：seed 新增 3 个 `isBot: true` 用户（如 mm1/mm2/mm3@carbonex.bot），每个初始 ¥50,000,000 现金 + 每个标的 1,000,000 吨持仓。机器人账户不出现在任何排行/列表中（API 查询时过滤 `isBot`，仅限新增展示处；现有接口行为不变）。

**生命周期**：`instrumentation.ts` 的 `register()` 在 Node.js runtime 启动一次后台循环（`globalThis` 单例守卫防止 dev HMR 重复启动）。环境变量 `BOT_DISABLED=1` 可关闭。

**每轮 tick（约 2.5s，逐标的串行执行避免事务冲突）**：

1. 公允价随机游走：`fair = last * (1 + N(0, 0.002))`，并以 2% 力度向 `anchorPrice` 均值回归（防止长期漂移到离谱价位）；`last` 取 `asset.lastPrice ?? anchorPrice`。
2. 撤掉偏离 fair 超过 ±2% 的机器人挂单（复用 `cancelOrder`）。
3. 两侧各补足约 5 档限价单：价格在 fair ±(0.1%~1.2%) 随机分布，数量 10~200 吨，随机选一个机器人账户下单（复用 `placeOrder`）。
4. 以 30% 概率发一笔吃单（穿越价差的小额限价单，10~80 吨），打印成交、驱动 lastPrice 变化。
5. 自动补给：机器人可用现金 < ¥1,000,000 或可用持仓 < 10,000 吨时直接 DB 重置回初始值（演示盘不破产）。

**错误处理**：整轮 tick 包 try/catch，单标的失败跳过、记录 console.error，下一轮继续；机器人崩溃不影响主服务。

## 5. 图表

### 5.1 K 线数据 API

`GET /api/assets/[symbol]/candles?interval=1m|5m|1h|1d`

- 从 `Trade` 表聚合 OHLCV。SQLite 用 `$queryRaw` + `strftime` 按桶分组；空桶不补（前端按时间轴摆放）。
- 回看窗口固定：1m→近 4 小时，5m→近 24 小时，1h→近 7 天，1d→近 90 天；最多返回 240 根。
- 返回 `{ candles: [{ t, o, h, l, c, v }] }`，t 为桶起始 ISO 时间。

### 5.2 组件（src/components/charts/）

- **`CandleChart`** — SVG K 线 + 底部成交量柱。涨绿跌红（沿用 --up/--down）。交互：crosshair 跟随、悬浮 OHLCV 信息条、周期切换（1分/5分/1时/1日）。动画：首次加载蜡烛自中轴向上下展开 + 逐根 stagger；新蜡烛从右侧滑入；最新价水平虚线带脉冲点。
- **`DepthChart`** — SVG 阶梯累计面积图，买侧绿、卖侧红，中间标注价差；悬浮显示该价位累计量；入场时面积自中间向两侧生长。
- **`Sparkline`** — 首页行情表每行的迷你折线（取最近 24h 收盘序列，由 assets API 一并返回），路径 pathLength 描画入场，整体涨绿跌红。

### 5.3 交易页改版（/market/[symbol]）

布局升级为两栏：左侧（约 2/3）为图表卡片（K线 ⇄ 深度图 Tab 切换，带 layoutId 滑动指示）+ 最近成交；右侧（约 1/3）为订单簿 + 下单面板。下方保留"我的当前委托"。头部增加 24h 涨跌幅、24h 最高/最低、24h 量（由 trades 聚合，随 `/api/assets/[symbol]` 返回）。

### 5.4 首页行情表增强

`GET /api/assets` 增加返回：`change24h`（相对 24h 前首笔成交价的涨跌幅）、`spark`（24h 收盘序列，最多 48 点）。表格新增"24h 涨跌"列（红绿色块）与迷你走势图列。

## 6. 碳信用注销/退役

**业务规则**：注销 = 永久销毁持仓中的碳信用以抵消排放。只能注销"可用持仓"（quantity - locked）；不可逆。

**API**：

- `POST /api/retire` `{ assetId, quantity, beneficiary, reason }`（zod 校验，登录态必需）。事务内：校验可用持仓 → `holding.quantity` 扣减 → 创建 `Retirement`，serial 生成规则 `CBR-<年份>-<6位序号>`（序号 = 当年记录数 + 1，事务内计数保证唯一，serial 唯一索引兜底）。
- `GET /api/retire` — 我的注销记录列表。
- `GET /api/retire/[serial]` — 证书公开数据（无需登录，凭编号可查验）。

**页面**：

- `/retire` — 注销发起页：选持仓（展示可用量）→ 数量 → 受益人/事由 → 确认弹层（强调不可逆）→ 提交成功后跳转证书页。portfolio 页持仓行加"注销"入口，并显示累计注销吨数统计卡。
- `/retire/[serial]` — 证书页：精装设计（细描金双线边框、衬线感标题、圆形印章、证书编号、资产/数量/受益人/日期、可查验文案），`@media print` 友好。**仪式动画**：边框描画 → 内容逐行浮现 → 印章从上方盖落（spring 缩放+轻微旋转）→ confetti。

## 7. 资金钱包（/wallet）

- **API**: `GET /api/wallet`（余额 + 合并流水：CashTransaction ∪ 我的 Trade 结算 ∪ OtcDeal，按时间倒序，最多 100 条）；`POST /api/wallet` `{ type: DEPOSIT|WITHDRAW, amount }`。
- **规则**: 模拟充值单笔上限 ¥1,000,000；提现 ≤ 可用余额（cashBalance，不含 lockedCash）；金额 > 0，两位小数。事务内更新余额并写 `CashTransaction`（记录 balanceAfter）。
- **页面**: 顶部余额大卡（可用/冻结/总额，NumberTicker 滚动），充值/提现表单（成功时按钮形变 + 余额滚动到新值），下方流水表（类型徽标：充值/提现/买入/卖出/OTC，stagger 入场）。Nav 增加"钱包"入口。

## 8. 动画体系（src/components/anim/ + 全局）

通用组件：

- **`NumberTicker`** — 数字滚动（motion spring 驱动，保持 tnum 等宽）。
- **`FlashCell`** — 值变化时背景闪烁（涨绿/跌红，500ms 渐隐）。用于：订单簿价格档、行情表最新价、交易页最新成交价。
- **`Reveal`** — whileInView 上浮淡入，支持 stagger 容器。
- **`PageTransition`** — `app/template.tsx`，路由切换时淡入 + 8px 上移。
- **`Toast`** — 全局通知（context + portal，右上滑入，自动消退）。下单/撤单/注销/充提的成功与失败统一走 Toast。
- **`ParticleHero`** — 首页全宽 canvas：漂浮碳分子光点（绿色系、少量连线），鼠标移动视差偏移，背景叠加缓慢呼吸的径向渐变光晕；`requestAnimationFrame` 驱动，标签页隐藏时暂停。

局部动效：

- 首页标题逐词上浮入场；CTA 按钮 hover 微缩放。
- Nav active 指示条 `layoutId` 滑动；Nav 毛玻璃在滚动后加深。
- 订单簿深度条宽度变化用 motion 弹簧过渡；新档位行淡入。
- 下单按钮提交成功形变为对勾后回弹。
- 图表入场动画见 §5；证书仪式动画见 §6。

**降级**：所有动效经 `useReducedMotion` / `prefers-reduced-motion` 媒体查询降级为直接呈现；粒子 hero 直接渲染静态渐变。

## 9. 错误处理汇总

- 机器人：单标的 try/catch，失败跳过下轮重试；启动单例守卫；`BOT_DISABLED=1` 逃生门。
- 注销/提现：严格校验可用量/可用余额，全部走事务；注销确认弹层防误触。
- API 一律沿用现有模式：zod 校验 → 业务 TradingError → 统一错误响应。
- K 线接口对无成交标的返回空数组，前端展示空状态插画文案。

## 10. 测试与验证

- 引入 `vitest`（devDependency），单测覆盖新增纯逻辑：K 线聚合桶函数、注销序列号生成与校验、机器人定价数学（随机游走+均值回归边界）。现有撮合引擎不在本次补测范围。
- 端到端手动验证（preview 工具）：行情自动波动、K线/深度图渲染与交互、下单成交全链路、注销出证书、充值提现与流水、动画与 reduced-motion 降级、打印证书样式。

## 11. 实施顺序（供计划阶段细化）

1. 依赖与基建：motion、canvas-confetti、vitest；阅读 Next.js instrumentation/路由文档。
2. schema 迁移 + seed 更新（机器人账户、anchorPrice）。
3. 行情机器人（先让数据流动起来，后续图表才有料）。
4. K 线 API + 图表组件 + 交易页改版。
5. 注销/退役 + 证书页。
6. 钱包。
7. 动画体系铺满全站 + 首页 hero。
8. 联调验证。
