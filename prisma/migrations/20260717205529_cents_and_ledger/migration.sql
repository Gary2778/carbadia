-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "assetId" TEXT,
    "delta" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "vintage" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "registry" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "lastPrice" INTEGER,
    "anchorPrice" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 保值转换: 元(REAL) → 分(INTEGER)。必须 ROUND 再 CAST: REAL 的 11.5*100 可能是 1149.999…, 裸 CAST 截断。NULL 自动透传。
INSERT INTO "new_Asset" ("anchorPrice", "country", "createdAt", "description", "id", "lastPrice", "name", "projectType", "registry", "standard", "symbol", "vintage") SELECT CAST(ROUND("anchorPrice"*100) AS INTEGER), "country", "createdAt", "description", "id", CAST(ROUND("lastPrice"*100) AS INTEGER), "name", "projectType", "registry", "standard", "symbol", "vintage" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER,
    "quantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "avgFillPrice" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("assetId", "avgFillPrice", "createdAt", "filledQuantity", "id", "price", "quantity", "side", "status", "type", "userId") SELECT "assetId", CAST(ROUND("avgFillPrice"*100) AS INTEGER), "createdAt", "filledQuantity", "id", CAST(ROUND("price"*100) AS INTEGER), "quantity", "side", "status", "type", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_assetId_side_status_idx" ON "Order"("assetId", "side", "status");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE TABLE "new_OtcDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtcDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OtcListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OtcDeal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OtcDeal" ("buyerId", "createdAt", "id", "listingId", "price", "quantity", "total") SELECT "buyerId", "createdAt", "id", "listingId", CAST(ROUND("price"*100) AS INTEGER), "quantity", CAST(ROUND("total"*100) AS INTEGER) FROM "OtcDeal";
DROP TABLE "OtcDeal";
ALTER TABLE "new_OtcDeal" RENAME TO "OtcDeal";
CREATE TABLE "new_OtcListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtcListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OtcListing_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OtcListing" ("assetId", "createdAt", "id", "minQuantity", "pricePerUnit", "quantity", "sellerId", "status") SELECT "assetId", "createdAt", "id", "minQuantity", CAST(ROUND("pricePerUnit"*100) AS INTEGER), "quantity", "sellerId", "status" FROM "OtcListing";
DROP TABLE "OtcListing";
ALTER TABLE "new_OtcListing" RENAME TO "OtcListing";
CREATE INDEX "OtcListing_assetId_status_idx" ON "OtcListing"("assetId", "status");
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "buyOrderId" TEXT NOT NULL,
    "sellOrderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("assetId", "buyOrderId", "buyerId", "createdAt", "id", "price", "quantity", "sellOrderId", "sellerId") SELECT "assetId", "buyOrderId", "buyerId", "createdAt", "id", CAST(ROUND("price"*100) AS INTEGER), "quantity", "sellOrderId", "sellerId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_assetId_createdAt_idx" ON "Trade"("assetId", "createdAt");
CREATE INDEX "Trade_buyerId_createdAt_idx" ON "Trade"("buyerId", "createdAt");
CREATE INDEX "Trade_sellerId_createdAt_idx" ON "Trade"("sellerId", "createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "cashBalance" BIGINT NOT NULL DEFAULT 0,
    "lockedCash" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("cashBalance", "createdAt", "email", "id", "isBot", "lockedCash", "name", "passwordHash", "role") SELECT CAST(ROUND("cashBalance"*100) AS INTEGER), "createdAt", "email", "id", "isBot", CAST(ROUND("lockedCash"*100) AS INTEGER), "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_account_createdAt_idx" ON "LedgerEntry"("userId", "account", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_refType_refId_idx" ON "LedgerEntry"("refType", "refId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- 审计基线: 使 Σdelta == 当前余额 从迁移时刻起全局成立(须在 User/Holding 重建完成之后执行, 此时余额已是分)。
-- createdAt 与既有行同格式: unix 毫秒整数。
INSERT INTO "LedgerEntry" ("id","userId","account","assetId","delta","reason","refType","refId","createdAt")
SELECT lower(hex(randomblob(16))), "id", 'CASH', NULL, "cashBalance", 'MIGRATION_BASELINE', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)*1000
FROM "User" WHERE "cashBalance" <> 0;
INSERT INTO "LedgerEntry" ("id","userId","account","assetId","delta","reason","refType","refId","createdAt")
SELECT lower(hex(randomblob(16))), "id", 'CASH_LOCKED', NULL, "lockedCash", 'MIGRATION_BASELINE', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)*1000
FROM "User" WHERE "lockedCash" <> 0;
INSERT INTO "LedgerEntry" ("id","userId","account","assetId","delta","reason","refType","refId","createdAt")
SELECT lower(hex(randomblob(16))), "userId", 'HOLDING', "assetId", "quantity", 'MIGRATION_BASELINE', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)*1000
FROM "Holding" WHERE "quantity" <> 0;
INSERT INTO "LedgerEntry" ("id","userId","account","assetId","delta","reason","refType","refId","createdAt")
SELECT lower(hex(randomblob(16))), "userId", 'HOLDING_LOCKED', "assetId", "locked", 'MIGRATION_BASELINE', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)*1000
FROM "Holding" WHERE "locked" <> 0;

