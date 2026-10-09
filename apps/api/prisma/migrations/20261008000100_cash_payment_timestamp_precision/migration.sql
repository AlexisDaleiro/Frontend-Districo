-- Match PostgreSQL's millisecond storage precision without rounding a cash due
-- date into the future relative to the transaction that records delivery.
CREATE OR REPLACE FUNCTION public.set_order_delivery_payment_due() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW."status" = 'DELIVERED' AND NEW."deliveredAt" IS NULL THEN
    NEW."deliveredAt" := date_trunc('milliseconds', CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
  END IF;
  IF NEW."paymentMethod" = 'CASH' AND NEW."deliveredAt" IS NOT NULL AND NEW."paymentDueAt" IS NULL THEN
    NEW."paymentDueAt" := NEW."deliveredAt";
  END IF;
  RETURN NEW;
END;
$$;
