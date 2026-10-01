BEGIN;

ALTER TABLE "CustomerAddress" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "CustomerAddress" FROM PUBLIC;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "CustomerAddress" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "CustomerAddress" FROM authenticated;
  END IF;
END;
$migration$;

COMMIT;
