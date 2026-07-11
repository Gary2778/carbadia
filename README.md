# Carbadia · 碳市场模拟交易所（Demo）

一个明确标注为模拟盘的碳信用交易所：真实的订单簿撮合引擎 + OTC 大宗挂牌，行情由做市机器人生成，不涉及任何真实资金或碳资产。

- **订单簿撮合**：标准化现货交易，限价单 / 市价单，价格-时间优先撮合引擎。
- **OTC 挂牌**：面向大宗的场外交易，卖方挂牌、买方按单价直接成交（支持部分成交、最小购买量）。
- **自绘 K 线 / 深度图**：不依赖图表库，前端从成交记录实时聚合 OHLCV 并手写渲染分时 K 线与买卖盘深度图。
- **做市机器人**：7x24 随机游走报价、多档买卖盘挂单、概率吃单，持续生成行情与成交历史。
- **CCRC 评级演示页**：碳信用项目评级展示（额外性 / 持久性 / 防重复计算 / 共同效益等维度）。
- **16 语言界面**（含阿拉伯语 RTL）：English 及丹麦语、德语、西班牙语、法语、意大利语、荷兰语、波兰语、葡萄牙语、芬兰语、瑞典语、日语、韩语、阿拉伯语、简体中文、繁体中文。
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
    config.ts          16 语言注册表（含 RTL 标记）
    messages/          各语言文案（en.ts 为 source of truth）
  components/
    charts/            自绘 CandleChart / DepthChart / Sparkline
    rating/            CCRC 评级页动效（撕纸转场等）
  app/
    page.tsx           行情总览
    market/[symbol]/   交易页（订单簿 / 下单 / K 线&深度图 / 最近成交 / 我的委托）
    otc/               OTC 挂牌板
    portfolio/         我的资产（持仓 / 委托 / 成交历史）
    rating/            CCRC 评级演示页
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
| `RETENTION_DAYS` | 否 | 历史数据保留天数,默认 `7`;只清理"机器人自成交"及机器人的孤儿终态订单,任何真人参与的成交/订单永久保留(机器人清理任务与容器启动清理共用;500MB 卷约容纳一周数据) |

## 常用脚本

```bash
npm run db:reset    # 重置数据库（清空并重跑迁移）
npm run db:seed     # 重新灌入演示数据
npm run db:studio   # Prisma Studio 可视化查看数据
npm run build       # 生产构建
```

## 后续可扩展方向

- KYC / 实名与合规、托管账户与法币出入金
- WebSocket 实时推送（替代当前 3s 轮询）
- 碳信用注销（retirement）与抵消证书、项目尽职调查资料
- 管理后台、风控限额与审计日志
- 金额改用整数最小单位（分）以彻底规避浮点误差
