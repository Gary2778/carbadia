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

# 空间兜底：volume 写满时迁移与写入都会失败（SQLite 错误 13）。开机小批量清一点过期成交,
# 给迁移腾页;大头由应用内清理任务分批在线处理(网络卷 IO 慢, 大 DELETE 会把启动卡住几十分钟)。
# 每批一个独立小事务, 默认 journal, 任何时刻中断都安全;首次启动表不存在时报错属预期, || true 兜底。
RETENTION="${RETENTION_DAYS:-7}"
echo "[deploy] 开机清理: 删除 ${RETENTION} 天前的成交(每批 1 万行, 最多 5 批)…"
i=0
while [ $i -lt 5 ]; do
  npx prisma db execute --stdin --url "$DATABASE_URL" <<SQL || break
DELETE FROM "Trade" WHERE rowid IN (
  SELECT rowid FROM "Trade"
  WHERE createdAt < CAST((strftime('%s','now') - $RETENTION * 86400) AS INTEGER) * 1000
  LIMIT 10000
);
SQL
  i=$((i+1))
done

# P3009 自愈：部署重叠期旧容器还在写库，迁移可能被写锁打断并留下"未完成"记录，
# 之后每次启动 migrate deploy 都会拒绝执行。清掉未完成记录让其重放（迁移 SQL 均为幂等）。
# 首次启动时 _prisma_migrations 表不存在，报错属预期，|| true 兜底。
echo "DELETE FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;" \
  | npx prisma db execute --stdin --url "$DATABASE_URL" || true

echo "[deploy] 应用数据库迁移…"
npx prisma migrate deploy

# WAL 模式：读写并发更好，且避免机器人写库时把页面读请求锁住。
# WAL 一经设置持久化在库文件上；若本次因写锁失败，沿用现有模式启动，下次部署再试。
echo "[deploy] 启用 SQLite WAL…"
echo "PRAGMA journal_mode=WAL;" | npx prisma db execute --stdin --url "$DATABASE_URL" \
  || echo "[deploy] 警告：WAL 设置失败（库可能被占用），沿用现有 journal 模式继续启动" >&2

echo "[deploy] 检查种子数据（仅当数据库为空时写入）…"
npm run db:seed:if-empty

echo "[deploy] 启动 Next.js（端口 ${PORT:-3000}）…"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
