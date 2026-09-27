BEGIN;

-- Migration history is private server metadata, not a Data API resource.
-- The table owner retains access; no public RLS policies are added.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM PUBLIC;

-- Supabase API roles are absent in ordinary local PostgreSQL installations.
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM authenticated;
    END IF;
END;
$migration$;

COMMIT;
