-- Supabase default privileges may explicitly grant RPC execution to API roles.
-- These bookkeeping functions are private to the backend database connection.
DO $$
DECLARE api_role TEXT; signature TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH signature IN ARRAY ARRAY[
        'public.refresh_customer_payment_status(TEXT)',
        'public.refresh_all_customer_payment_statuses()',
        'public.set_order_delivery_payment_due()',
        'public.refresh_payment_status_from_order()'
      ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', signature, api_role);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
