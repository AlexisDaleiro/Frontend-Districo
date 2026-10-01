CREATE TABLE "CustomerAddress" (
  "id" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "department" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerAddress_customerAccountId_createdAt_idx"
  ON "CustomerAddress"("customerAccountId", "createdAt");

ALTER TABLE "CustomerAddress"
  ADD CONSTRAINT "CustomerAddress_customerAccountId_fkey"
  FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CustomerAddress" (
  "id", "customerAccountId", "label", "address", "city", "department", "createdAt", "updatedAt"
)
SELECT
  CONCAT('legacy-', "id"), "id", 'Principal', BTRIM("address"),
  NULLIF(BTRIM("city"), ''), NULLIF(BTRIM("department"), ''), "createdAt", CURRENT_TIMESTAMP
FROM "CustomerAccount"
WHERE NULLIF(BTRIM("address"), '') IS NOT NULL;
