#!/bin/sh
# Railway 容器启动：迁移 → 仅在空库时灌种子 → 启动（instrumentation 会拉起做市机器人）
set -e

echo "[deploy] 应用数据库迁移…"
npx prisma migrate deploy

echo "[deploy] 检查种子数据（仅当数据库为空时写入）…"
npm run db:seed:if-empty

echo "[deploy] 启动 Next.js（端口 ${PORT:-3000}）…"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
