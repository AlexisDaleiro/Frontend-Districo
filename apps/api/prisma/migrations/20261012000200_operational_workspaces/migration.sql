BEGIN;
ALTER TABLE "ContactInquiry" ADD COLUMN "customerId" TEXT, ADD COLUMN "orderId" TEXT, ADD COLUMN "assignedToId" TEXT, ADD COLUMN "responseDueAt" TIMESTAMP(3);
CREATE INDEX "ContactInquiry_customerId_createdAt_idx" ON "ContactInquiry"("customerId", "createdAt");
CREATE INDEX "ContactInquiry_assignedToId_responseDueAt_idx" ON "ContactInquiry"("assignedToId", "responseDueAt");
ALTER TABLE "JobApplication" ADD COLUMN "cvDeletedAt" TIMESTAMP(3), ADD COLUMN "cvDeleteAfter" TIMESTAMP(3), ADD COLUMN "cvRetentionMonths" INTEGER NOT NULL DEFAULT 0 CHECK ("cvRetentionMonths" IN (0,6,12));
CREATE INDEX "JobApplication_cvDeleteAfter_cvDeletedAt_idx" ON "JobApplication"("cvDeleteAfter", "cvDeletedAt");
CREATE TABLE "BankMovement" (
 "id" TEXT PRIMARY KEY, "reference" VARCHAR(120) NOT NULL UNIQUE, "occurredAt" TIMESTAMP(3) NOT NULL,
 "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0), "currency" TEXT NOT NULL DEFAULT 'UYU',
 "description" VARCHAR(300) NOT NULL, "recordedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BankMovement_occurredAt_idx" ON "BankMovement"("occurredAt");
CREATE TABLE "PaymentReconciliation" (
 "id" TEXT PRIMARY KEY, "movementId" TEXT NOT NULL REFERENCES "BankMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "paymentId" TEXT NOT NULL REFERENCES "OrderPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0), "recordedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "voidedAt" TIMESTAMP(3), "voidedById" TEXT, "voidReason" VARCHAR(500)
);
CREATE INDEX "PaymentReconciliation_movementId_voidedAt_idx" ON "PaymentReconciliation"("movementId", "voidedAt");
CREATE INDEX "PaymentReconciliation_paymentId_voidedAt_idx" ON "PaymentReconciliation"("paymentId", "voidedAt");
CREATE TABLE "CollectionFollowup" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT,
 "note" VARCHAR(2000) NOT NULL, "nextContactAt" TIMESTAMP(3), "recordedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CollectionFollowup_orderId_createdAt_idx" ON "CollectionFollowup"("orderId", "createdAt");
CREATE TABLE "OrderFulfillment" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "recordedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "deliveredAt" TIMESTAMP(3), "receivedBy" VARCHAR(120), "proof" VARCHAR(1000)
);
CREATE INDEX "OrderFulfillment_orderId_createdAt_idx" ON "OrderFulfillment"("orderId", "createdAt");
CREATE TABLE "FulfillmentItem" (
 "id" TEXT PRIMARY KEY, "fulfillmentId" TEXT NOT NULL REFERENCES "OrderFulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE RESTRICT, "quantity" INTEGER NOT NULL CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "FulfillmentItem_fulfillmentId_orderItemId_key" ON "FulfillmentItem"("fulfillmentId", "orderItemId");
CREATE TABLE "InquiryEntry" (
 "id" TEXT PRIMARY KEY, "inquiryId" TEXT NOT NULL REFERENCES "ContactInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "body" VARCHAR(4000) NOT NULL, "visibility" TEXT NOT NULL DEFAULT 'INTERNAL' CHECK ("visibility" IN ('INTERNAL', 'CUSTOMER')),
 "recordedById" TEXT NOT NULL, "notificationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InquiryEntry_inquiryId_createdAt_idx" ON "InquiryEntry"("inquiryId", "createdAt");
CREATE TABLE "CandidateActivity" (
 "id" TEXT PRIMARY KEY, "candidateId" TEXT NOT NULL REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('NOTE', 'INTERVIEW', 'EMAIL')), "body" VARCHAR(4000) NOT NULL,
 "scheduledAt" TIMESTAMP(3), "recordedById" TEXT NOT NULL, "notificationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CandidateActivity_candidateId_scheduledAt_idx" ON "CandidateActivity"("candidateId", "scheduledAt");
CREATE INDEX "CandidateActivity_kind_scheduledAt_idx" ON "CandidateActivity"("kind", "scheduledAt");
CREATE TABLE "UsageEvent" (
 "id" TEXT PRIMARY KEY, "sessionId" VARCHAR(36) NOT NULL, "kind" VARCHAR(30) NOT NULL CHECK ("kind" IN ('SEARCH', 'NO_RESULTS', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "UsageEvent_sessionId_kind_key" ON "UsageEvent"("sessionId", "kind");
CREATE INDEX "UsageEvent_kind_createdAt_idx" ON "UsageEvent"("kind", "createdAt");
ALTER TABLE "BankMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentReconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollectionFollowup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderFulfillment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfillmentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InquiryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;
COMMIT;
