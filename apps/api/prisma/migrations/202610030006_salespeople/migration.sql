CREATE TABLE "Salesperson" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Salesperson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Salesperson_userId_key" ON "Salesperson"("userId");
ALTER TABLE "Salesperson" ADD CONSTRAINT "Salesperson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerAccount" ADD COLUMN "salespersonId" TEXT;
CREATE INDEX "CustomerAccount_salespersonId_idx" ON "CustomerAccount"("salespersonId");
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Salesperson" ENABLE ROW LEVEL SECURITY;
