BEGIN;

ALTER TABLE "JobOpening" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "JobOpening" FROM PUBLIC;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "JobOpening" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "JobOpening" FROM authenticated;
  END IF;
END;
$migration$;

COMMIT;
