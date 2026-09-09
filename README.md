# Carbadia · Exchange / Observatory / Studio

Carbadia 包含三个独立板块：Exchange 提供碳信用模拟交易，Observatory 展示注明来源的市场研究与登记簿资料，Studio 介绍早期技术研发方向。首页还提供开发中的 Pro 概念预览。

Exchange 使用真实的订单簿撮合逻辑与 OTC 挂牌流程，行情由做市机器人生成，不涉及任何真实资金或碳资产。

- **订单簿撮合**：标准化现货交易，限价单 / 市价单，价格-时间优先撮合引擎。
- **OTC 挂牌**：面向大宗的场外交易，卖方挂牌、买方按单价直接成交（支持部分成交、最小购买量）。
- **自绘 K 线 / 深度图**：不依赖图表库，前端从成交记录实时聚合 OHLCV 并手写渲染分时 K 线与买卖盘深度图。
- **做市机器人**：7x24 随机游走报价、多档买卖盘挂单、概率吃单，持续生成行情与成交历史。
- **CCRC 评级演示页**：碳信用项目评级展示（额外性 / 持久性 / 防重复计算 / 共同效益等维度）。
- **15 种界面语言**（含阿拉伯语 RTL）：English 及丹麦语、德语、西班牙语、法语、意大利语、荷兰语、波兰语、葡萄牙语、芬兰语、瑞典语、日语、韩语、阿拉伯语、繁体中文；部分新板块提供英文与繁体中文。
- **模拟注销与私有凭证**：按账户记录模拟注销，使用幂等请求防止重复扣减，不产生登记簿注销或真实减排声明。
- **Studio 技术方向**：直接空气捕集、可再生电力合成燃料、二氧化碳还原、新型费托合成、化工过程柔性运行。
- **浅色 / 深色双主题**：浅色 "Apple-light"，深色"剪报拼贴"（stop-motion 抽帧美学、撕纸转场）。

> ⚠️ 仅供学习演示，非真实交易、不涉及真实资金或碳资产。

## 技术栈

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**（浅色 Apple-light / 深色剪报拼贴 双主题）
- **Prisma 6 + SQLite**（零外部依赖，开箱即跑）
- **Zod** 入参校验；Node `crypto` scrypt 密码哈希 + HMAC 签名会话 Cookie

## 快速开始

```bash
npm install
cp .env.example .env    # 本地开发环境变量(SQLite 路径;dev 有内置 SESSION_SECRET 回退)
npm run db:migrate      # 建库 + 生成 Prisma Client（首次）
npm run db:seed         # 写入演示用户/标的/订单簿/OTC 挂牌
npm run dev             # http://localhost:3000
```

### 演示账号（密码均为 `password123`）

| 邮箱 | 角色 |
|---|---|
| alice@carbadia.io | 碳资产开发商（主要卖方） |
| bob@carbadia.io   | 减排企业 |
| carol@carbadia.io | 碳基金 |
| dave@carbadia.io  | 履约企业 |

每个账号初始 $500,000 演示资金；新注册账号赠送 $100,000。

## 目录结构

```
prisma/
  schema.prisma        数据模型（User/Asset/Holding/Order/Trade/OtcListing/OtcDeal）
  seed.ts              种子数据
src/
  lib/
    db.ts              Prisma Client 单例
    auth.ts            密码哈希 + 会话 Cookie
    matching.ts        ★ 订单簿撮合引擎（限价/市价、资金与持仓冻结、原子结算）
    otc.ts             OTC 挂牌 / 撤销 / 购买
    bot.ts             做市机器人（随机游走报价 + 数据保留清理）
    candles.ts         K 线聚合（从成交记录内存聚合 OHLCV）
    i18n.tsx           界面 i18n（语言切换 / RTL）
    data-i18n.ts       数据层 i18n（种子数据的多语映射）
    api.ts             统一响应与错误处理
    format.ts          前端 fetch 封装 + 数字格式化
  i18n/
    config.ts          15 语言注册表（含 RTL 标记）
    messages/          各语言文案（en.ts 为 source of truth）
  components/
    charts/            自绘 CandleChart / DepthChart / Sparkline
    rating/            CCRC 评级页动效（撕纸转场等）
  app/
    page.tsx           产品首页
    exchange/          模拟市场、交易、持仓、委托、历史与注销
    observatory/       市场研究、外部登记簿数据与评级演示
    studio/            技术方向、发展计划与合作联系入口
    login, register/   认证
    api/               Route Handlers（auth / assets / orders / otc / portfolio）
```

## 撮合引擎要点（`src/lib/matching.ts`）

- **价格优先、时间优先**；成交价取被动挂单方价格（taker 获得价格改善）。
- **下单即冻结**：限价买冻结现金、卖单冻结持仓；成交按冻结结算，撤单/剩余精确解冻。
- **市价单**：买单受实时可用现金约束，剩余未成交部分自动撤销。
- **防自成交**：不与自己的挂单成交。
- 全流程在单个数据库事务中完成，保证资金 / 持仓 / 订单状态一致。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | 是 | SQLite 连接串。线上必须指向持久卷,形如 `file:/data/carbadia.db`(容器启动脚本会校验前缀) |
| `SESSION_SECRET` | 是 | 会话 cookie 的 HMAC 签名密钥,用 `openssl rand -hex 32` 生成;生产环境缺失会拒绝启动(本地 dev 有内置回退) |
| `BOT_DISABLED` | 否 | 设为 `1` 时不启动做市机器人 |
| `SYNC_DISABLED` | 否 | 设为 `1` 时不启动外部数据同步；本地页面预览建议与 `BOT_DISABLED=1` 一起使用 |
| `RETENTION_DAYS` | 否 | 历史数据保留天数,默认 `7`;只清理"机器人自成交"及机器人的孤儿终态订单,任何真人参与的成交/订单永久保留(机器人清理任务与容器启动清理共用;500MB 卷约容纳一周数据) |
| `PROXY_SECRET` | 否 | 反代密钥(生产建议设)。Cloudflare Worker 反代转发时注入请求头 `x-proxy-secret=<此值>`;应用只在该头匹配时才信任 `cf-connecting-ip` 做限流分桶,阻止直连 `*.up.railway.app` 伪造客户端 IP 绕过限流。用 `openssl rand -hex 32` 生成;未设时沿用旧行为(直接信任 `cf-connecting-ip`) |

## 常用脚本

```bash
npm run db:reset    # 重置数据库（清空并重跑迁移）
npm run db:seed     # 重新灌入演示数据
npm run db:studio   # Prisma Studio 可视化查看数据
RUST_LOG=info npm test # 完整测试；info 避免宿主日志设置干扰 Prisma 创建测试库
npm run lint
BOT_DISABLED=1 SYNC_DISABLED=1 npm run build # 生产构建
```

## 运行与发布

Railway 使用 Dockerfile 构建，并在构建时执行测试与 ESLint。容器启动时校验环境变量、应用 Prisma 迁移，然后启动 Next.js；生产 SQLite 必须挂载在 `/data` 持久化卷上。

本地界面预览使用 `BOT_DISABLED=1 SYNC_DISABLED=1 npm run dev`。测试使用独立测试库；部署前应验证待应用迁移并保留可恢复的数据库备份。
