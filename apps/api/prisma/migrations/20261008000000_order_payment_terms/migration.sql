ALTER TABLE "CustomerAccount" ADD COLUMN "creditStatusAutomatic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentTermMonths" INTEGER,
  ADD COLUMN "installmentCount" INTEGER,
  ADD COLUMN "paymentSchedule" JSONB,
  ADD COLUMN "paymentDueAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "Order_customerAccountId_paymentDueAt_idx" ON "Order"("customerAccountId", "paymentDueAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_payment_terms_check" CHECK (
  "paymentMethod" IS NULL OR COALESCE(
  ("paymentMethod" = 'CASH' AND "paymentTermMonths" IS NULL AND "installmentCount" = 1 AND "paymentSchedule" = '[]'::jsonb) OR
  ("paymentMethod" = 'INSTALLMENTS' AND "paymentTermMonths" IN (1, 3, 6) AND "installmentCount" = "paymentTermMonths"
    AND jsonb_typeof("paymentSchedule") = 'array' AND jsonb_array_length("paymentSchedule") = "installmentCount" AND "paymentDueAt" IS NOT NULL), false)
);

-- Payments and credit notes settle the earliest installments first. Legacy orders
-- contribute to pending debt but never receive invented retroactive due dates.
CREATE FUNCTION public.refresh_customer_payment_status(account_id TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  account_row public."CustomerAccount"%ROWTYPE;
  next_status public."CreditStatus";
  has_pending BOOLEAN;
  has_overdue BOOLEAN;
BEGIN
  SELECT * INTO account_row FROM public."CustomerAccount" WHERE "id" = account_id FOR UPDATE;
  IF NOT FOUND OR account_row."creditStatus" = 'RESTRICTED' OR
     (account_row."creditStatus" = 'PAYMENT_DELAY' AND NOT account_row."creditStatusAutomatic") THEN RETURN; END IF;
  IF NOT account_row."creditStatusAutomatic" AND NOT EXISTS
     (SELECT 1 FROM public."Order" WHERE "customerAccountId" = account_id AND "paymentMethod" IS NOT NULL) THEN RETURN; END IF;

  SELECT COALESCE(bool_or(balance > 0), false), COALESCE(bool_or(balance > 0 AND (
    ("paymentMethod" = 'CASH' AND "paymentDueAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) OR
    ("paymentMethod" = 'INSTALLMENTS' AND due_amount > settled)
  )), false) INTO has_pending, has_overdue
  FROM (
    SELECT o.*, GREATEST(o."total" - o."creditedTotal" - o."paidTotal" + o."refundedTotal", 0) AS balance,
      GREATEST(o."paidTotal" - o."refundedTotal", 0) + o."creditedTotal" AS settled,
      COALESCE((SELECT SUM((q->>'amountCents')::numeric / 100) FROM jsonb_array_elements(COALESCE(o."paymentSchedule", '[]'::jsonb)) q
        WHERE (q->>'dueAt')::timestamptz <= CURRENT_TIMESTAMP), 0) AS due_amount
    FROM public."Order" o WHERE o."customerAccountId" = account_id
      AND o."status" NOT IN ('DRAFT', 'REJECTED', 'CANCELLED')
  ) open_orders;
  next_status := CASE WHEN has_overdue THEN 'PAYMENT_DELAY'::public."CreditStatus"
    WHEN has_pending THEN 'PAYMENT_PENDING'::public."CreditStatus" ELSE 'GOOD_STANDING'::public."CreditStatus" END;
  IF account_row."creditStatus" IS DISTINCT FROM next_status THEN
    INSERT INTO public."AuditLog" ("id", "action", "entityType", "entityId", "metadata", "createdAt")
    VALUES (gen_random_uuid()::text, 'CUSTOMER_PAYMENT_STATUS_AUTOMATIC', 'CustomerAccount', account_id,
      jsonb_build_object('before', jsonb_build_object('creditStatus', account_row."creditStatus"),
        'after', jsonb_build_object('creditStatus', next_status), 'source', 'PAYMENT_TERMS'), CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
  END IF;
  UPDATE public."CustomerAccount" SET "creditStatus" = next_status, "creditStatusAutomatic" = true,
    "updatedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
    WHERE "id" = account_id AND ("creditStatus" IS DISTINCT FROM next_status OR NOT "creditStatusAutomatic");
END;
$$;

CREATE FUNCTION public.refresh_all_customer_payment_statuses() RETURNS VOID
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE account_id TEXT;
BEGIN
  FOR account_id IN SELECT c."id" FROM public."CustomerAccount" c
    WHERE c."creditStatusAutomatic" OR EXISTS
      (SELECT 1 FROM public."Order" o WHERE o."customerAccountId" = c."id" AND o."paymentMethod" IS NOT NULL)
    ORDER BY c."id"
  LOOP PERFORM public.refresh_customer_payment_status(account_id); END LOOP;
END;
$$;

CREATE FUNCTION public.set_order_delivery_payment_due() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW."status" = 'DELIVERED' AND NEW."deliveredAt" IS NULL THEN
    NEW."deliveredAt" := CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
  END IF;
  IF NEW."paymentMethod" = 'CASH' AND NEW."deliveredAt" IS NOT NULL AND NEW."paymentDueAt" IS NULL THEN
    NEW."paymentDueAt" := NEW."deliveredAt";
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_delivery_payment_due BEFORE INSERT OR UPDATE ON "Order"
  FOR EACH ROW EXECUTE FUNCTION public.set_order_delivery_payment_due();

CREATE FUNCTION public.refresh_payment_status_from_order() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."customerAccountId" IS NOT NULL THEN PERFORM public.refresh_customer_payment_status(OLD."customerAccountId"); END IF;
  ELSE
    IF NEW."customerAccountId" IS NOT NULL THEN PERFORM public.refresh_customer_payment_status(NEW."customerAccountId"); END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER order_payment_status_changed AFTER INSERT OR DELETE OR UPDATE OF
  "status", "total", "paidTotal", "creditedTotal", "refundedTotal", "paymentSchedule", "paymentDueAt" ON "Order"
  FOR EACH ROW EXECUTE FUNCTION public.refresh_payment_status_from_order();

REVOKE ALL ON FUNCTION public.refresh_customer_payment_status(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_all_customer_payment_statuses() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_order_delivery_payment_due() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_payment_status_from_order() FROM PUBLIC;
