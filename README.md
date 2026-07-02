# CarbonEx · 线上碳信用交易所 (MVP)

一个可运行的碳信用(碳减排量)在线交易所原型。支持两种交易模式：

- **订单簿撮合**：标准化现货交易，限价单 / 市价单，价格-时间优先撮合引擎。
- **OTC 挂牌**：面向大宗的场外交易，卖方挂牌、买方按单价直接成交（支持部分成交、最小购买量）。

> ⚠️ 仅供学习演示，非真实交易、不涉及真实资金或碳资产。

## 技术栈

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**（深色交易终端风格 UI）
- **Prisma 6 + SQLite**（零外部依赖，开箱即跑）
- **Zod** 入参校验；Node `crypto` scrypt 密码哈希 + HMAC 签名会话 Cookie

## 快速开始

```bash
npm install
npm run db:migrate      # 建库 + 生成 Prisma Client（首次）
npm run db:seed         # 写入演示用户/标的/订单簿/OTC 挂牌
npm run dev             # http://localhost:3000
```

### 演示账号（密码均为 `password123`）

| 邮箱 | 角色 |
|---|---|
| alice@carbonex.io | 碳资产开发商（主要卖方） |
| bob@carbonex.io   | 减排企业 |
| carol@carbonex.io | 碳基金 |
| dave@carbonex.io  | 履约企业 |

每个账号初始 ¥500,000 演示资金；新注册账号赠送 ¥100,000。

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
    api.ts             统一响应与错误处理
    format.ts          前端 fetch 封装 + 数字格式化
  app/
    page.tsx           行情总览
    market/[symbol]/   交易页（订单簿 / 下单 / 最近成交 / 我的委托）
    otc/               OTC 挂牌板
    portfolio/         我的资产（持仓 / 委托 / 成交历史）
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
| `RETENTION_DAYS` | 否 | 历史成交/终态订单保留天数,默认 `7`(机器人清理任务与容器启动清理共用;500MB 卷约容纳一周数据) |

## 常用脚本

```bash
npm run db:reset    # 重置数据库（清空并重跑迁移）
npm run db:seed     # 重新灌入演示数据
npm run db:studio   # Prisma Studio 可视化查看数据
npm run build       # 生产构建
```

## 后续可扩展方向

- KYC / 实名与合规、托管账户与法币出入金
- K 线行情、WebSocket 实时推送（替代当前 3s 轮询）
- 碳信用注销（retirement）与抵消证书、项目尽职调查资料
- 管理后台、风控限额与审计日志
- 金额改用整数最小单位（分）以彻底规避浮点误差
