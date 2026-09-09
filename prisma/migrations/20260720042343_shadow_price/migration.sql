-- 手写迁移(替换 Prisma 生成的表重建): SQLite 支持 ADD COLUMN ... NOT NULL DEFAULT,
-- 避免重建 Asset(生产曾因表重建丢 sqlite_stat1 引发写锁事故, 2026-07-17)。纯新增, 不动存量数据。

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "isScenario" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ShadowSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetSymbol" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "shadowClose" INTEGER,
    "shadowVolume" INTEGER NOT NULL DEFAULT 0,
    "realClose" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShadowSnapshot_assetSymbol_day_key" ON "ShadowSnapshot"("assetSymbol", "day");
