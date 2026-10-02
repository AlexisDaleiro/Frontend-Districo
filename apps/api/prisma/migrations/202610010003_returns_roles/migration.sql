ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CATALOG';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE';

ALTER TABLE "Order"
  ADD COLUMN "creditedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refundedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "OrderCreditNote" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "requestId" TEXT NOT NULL,
  "noteNumber" VARCHAR(80),
  "reason" VARCHAR(500) NOT NULL,
  "storagePath" TEXT,
  "originalName" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderCreditNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderCreditNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderCreditNote_requestId_key" ON "OrderCreditNote"("requestId");
CREATE UNIQUE INDEX "OrderCreditNote_storagePath_key" ON "OrderCreditNote"("storagePath");
CREATE INDEX "OrderCreditNote_orderId_createdAt_idx" ON "OrderCreditNote"("orderId", "createdAt");
ALTER TABLE "OrderCreditNote" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX "OrderCreditNote_orderId_noteNumber_key"
  ON "OrderCreditNote"("orderId", "noteNumber") WHERE "noteNumber" IS NOT NULL;

CREATE TABLE "OrderRefund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "requestId" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "reference" VARCHAR(120),
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderRefund_requestId_key" ON "OrderRefund"("requestId");
CREATE INDEX "OrderRefund_orderId_createdAt_idx" ON "OrderRefund"("orderId", "createdAt");
ALTER TABLE "OrderRefund" ENABLE ROW LEVEL SECURITY;
