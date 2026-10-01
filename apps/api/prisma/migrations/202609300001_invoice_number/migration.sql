ALTER TABLE "OrderInvoice"
  ADD COLUMN "invoiceNumber" VARCHAR(80),
  ALTER COLUMN "storagePath" DROP NOT NULL,
  ALTER COLUMN "originalName" DROP NOT NULL,
  ALTER COLUMN "mimeType" DROP NOT NULL,
  ALTER COLUMN "size" DROP NOT NULL;

CREATE UNIQUE INDEX "OrderInvoice_orderId_invoiceNumber_key"
  ON "OrderInvoice"("orderId", "invoiceNumber");
