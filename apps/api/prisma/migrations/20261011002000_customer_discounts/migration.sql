CREATE TYPE "CustomerDiscountMode" AS ENUM ('BEST_PRICE', 'STACK');

ALTER TABLE "CustomerAccount"
  ADD COLUMN "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountMode" "CustomerDiscountMode" NOT NULL DEFAULT 'BEST_PRICE',
  ADD CONSTRAINT "CustomerAccount_discountPercentage_check" CHECK ("discountPercentage" BETWEEN 0 AND 100);

ALTER TABLE "Order"
  ADD COLUMN "customerDiscountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "customerDiscountMode" "CustomerDiscountMode" NOT NULL DEFAULT 'BEST_PRICE',
  ADD COLUMN "customerDiscountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Order_customerDiscountPercentage_check" CHECK ("customerDiscountPercentage" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Order_customerDiscountTotal_check" CHECK ("customerDiscountTotal" >= 0 AND "customerDiscountTotal" <= "discountTotal");
