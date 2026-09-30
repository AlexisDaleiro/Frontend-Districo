// A Vercel instance must not reserve several session-pool connections.
// Supabase's transaction pooler is intended for short-lived serverless work;
// DIRECT_URL remains untouched for Prisma migrations.
export function runtimeDatabaseUrl(raw: string | undefined, vercel: boolean): string | undefined {
  if (!raw || !vercel) return raw;
  const url = new URL(raw);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return raw;

  url.searchParams.set('connection_limit', '1');
  if (url.hostname.endsWith('.pooler.supabase.com')) {
    if (url.port === '5432') url.port = '6543';
    if (url.port === '6543') url.searchParams.set('pgbouncer', 'true');
  }
  return url.toString();
}
