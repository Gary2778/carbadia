-- 真实市场只读镜像表(与模拟交易域零外键)+ 修复迁移重放顺序缺陷(见文末)

-- CreateTable
CREATE TABLE "RegistryProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registry" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "country" TEXT,
    "category" TEXT,
    "projectType" TEXT,
    "protocol" TEXT,
    "status" TEXT,
    "isCompliance" BOOLEAN NOT NULL DEFAULT false,
    "issued" BIGINT NOT NULL DEFAULT 0,
    "retired" BIGINT NOT NULL DEFAULT 0,
    "listedAt" TEXT,
    "projectUrl" TEXT,
    "syncedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registry" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "tonnes" BIGINT NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "RegistryBeneficiary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tonnes" BIGINT NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CcerProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataType" TEXT NOT NULL,
    "applyStatus" TEXT NOT NULL,
    "statusName" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "owner" TEXT,
    "projectType" TEXT,
    "methodology" TEXT,
    "province" TEXT,
    "expectYearNum" INTEGER,
    "certifiedNum" INTEGER,
    "publicStart" TEXT,
    "publicEnd" TEXT,
    "syncedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
    "dataAsOf" TEXT,
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "RegistryProject_registry_category_idx" ON "RegistryProject"("registry", "category");

-- CreateIndex
CREATE INDEX "RegistryProject_country_idx" ON "RegistryProject"("country");

-- CreateIndex
CREATE INDEX "RegistryProject_retired_idx" ON "RegistryProject"("retired");

-- CreateIndex
CREATE UNIQUE INDEX "RegistryStat_registry_year_kind_key" ON "RegistryStat"("registry", "year", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "RegistryBeneficiary_name_key" ON "RegistryBeneficiary"("name");

-- CreateIndex
CREATE INDEX "CcerProject_dataType_applyStatus_idx" ON "CcerProject"("dataType", "applyStatus");

-- CreateIndex
CREATE INDEX "SyncRun_source_startedAt_idx" ON "SyncRun"("source", "startedAt");

-- 修复迁移重放顺序缺陷:20260717134904_trade_order_ref_indexes(文件名序在前)建的两个索引,
-- 会被 20260717205529_cents_and_ledger(文件名序在后)的 Trade 表重建(DROP+RENAME)删掉——
-- 现存 dev/生产库因实际应用顺序相反而带着索引,但任何全新重放(migrate reset / 新环境)会丢失它们,
-- 悄悄复现 2026-07-17 清理任务全表扫描事故。此处幂等补建:重放场景真正创建,存量库 no-op。
CREATE INDEX IF NOT EXISTS "Trade_buyOrderId_idx" ON "Trade"("buyOrderId");
CREATE INDEX IF NOT EXISTS "Trade_sellOrderId_idx" ON "Trade"("sellOrderId");
