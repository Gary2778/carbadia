# Carbadia 交易所完全体升级 — 设计文档

日期: 2026-06-13
状态: 已与用户确认方案 A（精品自绘 + 轻量炫效）；按用户反馈缩减范围——只做模拟交易，不做注销证书与钱包模块。

## 1. 背景与目标

Carbadia 当前是一个可用的碳信用交易所 MVP：订单簿撮合（限价/市价）、OTC 挂牌、投资组合、登录注册。但作为"交易所"仍有明显缺口：没有行情图表、盘面是静止的演示数据、动画几乎为零。

本次升级目标：

1. **行情图表** — K 线图、深度图、首页迷你走势图，全部自绘 SVG。
2. **模拟行情机器人** — 服务端做市，让价格持续波动、订单簿翻动、图表有数据。
3. **设计感动画（越炫越好）** — 在保持 Apple Light 设计语言的前提下做全站动效：首页 canvas 粒子 hero、页面转场、数字滚动、价格闪烁、图表入场动画等。
4. **明确模拟盘定位** — 全站清晰标注为模拟交易（Nav "模拟盘"徽标），不引入任何真实资金概念。

非目标（明确不做）：碳信用注销/退役证书、资金钱包/充值提现、真实行情接入、期货/杠杆/保证金、SSE/WebSocket 推送（沿用轮询，缩短到 2 秒）、暗色模式、移动原生 App、国际化。

## 2. 技术选型

- **动画**: `motion`（framer-motion 的当前发行名）。用于页面转场、layout 动画、stagger 入场、数字滚动、whileInView reveal。
- **图表**: 不引入图表库，全部自绘 SVG/Canvas（K 线、深度图、迷你走势图），保证设计统一并可深度动画化。
- **行情机器人**: 跑在 Next.js 服务端（`instrumentation.ts` 启动后台循环）。实现前必须先阅读 `node_modules/next/dist/docs/` 中 instrumentation 相关文档（AGENTS.md 约束：本项目的 Next.js 与训练数据可能不同）。

## 3. 数据模型变更（prisma/schema.prisma）

沿用现有约定：数量 = Int（吨），金额 = Float（元，2 位小数）。仅两个增量字段，无新表：

```prisma
model User {
  // ……现有字段不变，新增：
  isBot Boolean @default(false)   // 做市机器人账户
}

model Asset {
  // ……现有字段不变，新增：
  anchorPrice Float?   // 机器人均值回归锚定价(初始公允价)
}
```

迁移方式：`prisma migrate dev`，并更新 `prisma/seed.ts`（见 §4）。

## 4. 模拟行情机器人

**目的**：让盘面活起来——价格持续波动、订单簿翻动、成交带打印、图表有数据。

**账户**：seed 新增 3 个 `isBot: true` 用户（如 mm1/mm2/mm3@carbonex.bot），每个初始 ¥50,000,000 现金 + 每个标的 1,000,000 吨持仓。

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

## 6. 动画体系（src/components/anim/ + 全局）

通用组件：

- **`NumberTicker`** — 数字滚动（motion spring 驱动，保持 tnum 等宽）。用于：行情最新价、portfolio 统计卡、交易页头部。
- **`FlashCell`** — 值变化时背景闪烁（涨绿/跌红，500ms 渐隐）。用于：订单簿价格档、行情表最新价、交易页最新成交价。
- **`Reveal`** — whileInView 上浮淡入，支持 stagger 容器。
- **`PageTransition`** — `app/template.tsx`，路由切换时淡入 + 8px 上移。
- **`Toast`** — 全局通知（context + portal，右上滑入，自动消退）。下单/撤单的成功与失败统一走 Toast。
- **`ParticleHero`** — 首页全宽 canvas：漂浮碳分子光点（绿色系、少量连线），鼠标移动视差偏移，背景叠加缓慢呼吸的径向渐变光晕；`requestAnimationFrame` 驱动，标签页隐藏时暂停。

局部动效：

- 首页标题逐词上浮入场；CTA 按钮 hover 微缩放。
- Nav active 指示条 `layoutId` 滑动；Nav 毛玻璃在滚动后加深；"模拟盘"徽标。
- 订单簿深度条宽度变化用 motion 弹簧过渡；新档位行淡入。
- 下单按钮提交成功形变为对勾后回弹；成交时最新价脉冲。
- 图表入场动画见 §5。

**降级**：所有动效经 `useReducedMotion` / `prefers-reduced-motion` 媒体查询降级为直接呈现；粒子 hero 直接渲染静态渐变。

## 7. 错误处理汇总

- 机器人：单标的 try/catch，失败跳过下轮重试；启动单例守卫；`BOT_DISABLED=1` 逃生门。
- API 一律沿用现有模式：zod 校验 → 业务 TradingError → 统一错误响应。
- K 线接口对无成交标的返回空数组，前端展示空状态文案。

## 8. 测试与验证

- 引入 `vitest`（devDependency），单测覆盖新增纯逻辑：K 线聚合桶函数、机器人定价数学（随机游走+均值回归边界）。现有撮合引擎不在本次补测范围。
- 端到端手动验证（preview 工具）：行情自动波动、K线/深度图渲染与交互、下单成交全链路、动画与 reduced-motion 降级。

## 9. 实施顺序（供计划阶段细化）

1. 依赖与基建：motion、vitest；阅读 Next.js instrumentation/路由文档。
2. schema 迁移 + seed 更新（机器人账户、anchorPrice）。
3. 行情机器人（先让数据流动起来，后续图表才有料）。
4. K 线 API + 图表组件 + 交易页改版。
5. 首页行情表增强 + 粒子 hero。
6. 动画体系铺满全站。
7. 联调验证。
