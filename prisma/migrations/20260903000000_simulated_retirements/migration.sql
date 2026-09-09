-- Simulation receipts only. No external registry transaction or custody is represented.
CREATE TABLE "Retirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIMULATED' CHECK ("status" = 'SIMULATED'),
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "symbol" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "registry" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "vintage" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "publicMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Retirement_reference_key" ON "Retirement"("reference");
CREATE UNIQUE INDEX "Retirement_userId_idempotencyKey_key" ON "Retirement"("userId", "idempotencyKey");
CREATE INDEX "Retirement_userId_createdAt_idx" ON "Retirement"("userId", "createdAt");
