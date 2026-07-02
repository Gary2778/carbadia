-- CreateIndex(幂等:部署重叠期迁移可能被写锁打断后重放,IF NOT EXISTS 保证可安全重试)
CREATE INDEX IF NOT EXISTS "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_buyerId_createdAt_idx" ON "Trade"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_sellerId_createdAt_idx" ON "Trade"("sellerId", "createdAt");
