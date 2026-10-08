ALTER TABLE "CustomStaffRole" ADD COLUMN "retiredAt" TIMESTAMP(3);

CREATE TABLE "OrderReturn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderReturn_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "restockedQuantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderReturnItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderReturnItem_valid_quantities" CHECK ("quantity" > 0 AND "restockedQuantity" >= 0 AND "restockedQuantity" <= "quantity")
);
CREATE UNIQUE INDEX "OrderReturn_requestId_key" ON "OrderReturn"("requestId");
CREATE INDEX "OrderReturn_orderId_createdAt_idx" ON "OrderReturn"("orderId", "createdAt");
CREATE UNIQUE INDEX "OrderReturnItem_returnId_orderItemId_key" ON "OrderReturnItem"("returnId", "orderItemId");
CREATE INDEX "OrderReturnItem_orderItemId_idx" ON "OrderReturnItem"("orderItemId");
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderReturnItem" ADD CONSTRAINT "OrderReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "OrderReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderReturnItem" ADD CONSTRAINT "OrderReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderReturn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderReturnItem" ENABLE ROW LEVEL SECURITY;
