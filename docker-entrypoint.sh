#!/bin/sh
# Railway 容器启动：校验环境 → 迁移 → 仅在空库时灌种子 → 启动（instrumentation 会拉起做市机器人）
set -e

# 启动前校验：配置缺失宁可快速失败，也不要带错误配置静默上线
if [ -z "$DATABASE_URL" ]; then
  echo "[deploy] 错误：DATABASE_URL 未设置，拒绝启动" >&2
  exit 1
fi
case "$DATABASE_URL" in
  file:/data/*) ;;
  *)
    echo "[deploy] 错误：DATABASE_URL 必须以 file:/data/ 开头（否则数据会写进镜像内临时库，重启即丢失）" >&2
    exit 1
    ;;
esac
if [ -z "$SESSION_SECRET" ]; then
  echo "[deploy] 错误：SESSION_SECRET 未设置，拒绝启动" >&2
  exit 1
fi

echo "[deploy] 应用数据库迁移…"
npx prisma migrate deploy

# WAL 模式：读写并发更好，且避免机器人写库时把页面读请求锁住
echo "[deploy] 启用 SQLite WAL…"
echo "PRAGMA journal_mode=WAL;" | npx prisma db execute --stdin --url "$DATABASE_URL"

echo "[deploy] 检查种子数据（仅当数据库为空时写入）…"
npm run db:seed:if-empty

echo "[deploy] 启动 Next.js（端口 ${PORT:-3000}）…"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
