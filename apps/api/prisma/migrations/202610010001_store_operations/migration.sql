ALTER TABLE "Order"
  ADD COLUMN "deliveryAddressId" TEXT,
  ADD COLUMN "deliveryLabel" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "deliveryCity" TEXT,
  ADD COLUMN "deliveryDepartment" TEXT;

ALTER TABLE "OrderPayment"
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" TEXT,
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidRequestId" TEXT;

CREATE UNIQUE INDEX "OrderPayment_voidRequestId_key" ON "OrderPayment"("voidRequestId");

ALTER TABLE "OrderInvoice"
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" TEXT,
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidRequestId" TEXT,
  ADD COLUMN "replacesInvoiceId" TEXT,
  ADD COLUMN "replacementReason" TEXT;

CREATE UNIQUE INDEX "OrderInvoice_voidRequestId_key" ON "OrderInvoice"("voidRequestId");

CREATE TABLE "StoreBanner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "actionLabel" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "desktopImagePath" TEXT NOT NULL,
  "mobileImagePath" TEXT,
  "alt" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreBanner_active_position_idx" ON "StoreBanner"("active", "position");
ALTER TABLE "StoreBanner" ENABLE ROW LEVEL SECURITY;
