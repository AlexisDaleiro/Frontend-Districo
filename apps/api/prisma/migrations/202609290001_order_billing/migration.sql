ALTER TABLE "Order" ADD COLUMN "paidTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "requestId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderInvoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPayment_requestId_key" ON "OrderPayment"("requestId");
CREATE INDEX "OrderPayment_orderId_createdAt_idx" ON "OrderPayment"("orderId", "createdAt");
CREATE UNIQUE INDEX "OrderInvoice_storagePath_key" ON "OrderInvoice"("storagePath");
CREATE UNIQUE INDEX "OrderInvoice_requestId_key" ON "OrderInvoice"("requestId");
CREATE INDEX "OrderInvoice_orderId_createdAt_idx" ON "OrderInvoice"("orderId", "createdAt");

ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderInvoice" ADD CONSTRAINT "OrderInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderInvoice" ENABLE ROW LEVEL SECURITY;
