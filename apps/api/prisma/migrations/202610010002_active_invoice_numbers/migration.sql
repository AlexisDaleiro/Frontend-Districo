DROP INDEX "OrderInvoice_orderId_invoiceNumber_key";

CREATE UNIQUE INDEX "OrderInvoice_active_number_key"
  ON "OrderInvoice"("orderId", "invoiceNumber")
  WHERE "voidedAt" IS NULL AND "invoiceNumber" IS NOT NULL;
