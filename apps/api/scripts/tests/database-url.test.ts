import assert from 'node:assert/strict';
import { runtimeDatabaseUrl } from '../../src/prisma/database-url';

const session = 'postgresql://user:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require&connection_limit=5';
const local = runtimeDatabaseUrl(session, false);
assert.equal(local, session);

const serverless = new URL(runtimeDatabaseUrl(session, true)!);
assert.equal(serverless.port, '6543');
assert.equal(serverless.searchParams.get('pgbouncer'), 'true');
assert.equal(serverless.searchParams.get('connection_limit'), '1');
assert.equal(serverless.searchParams.get('schema'), 'public');
assert.equal(serverless.searchParams.get('sslmode'), 'require');

const direct = new URL(runtimeDatabaseUrl('postgresql://user:secret@db.example.com:5432/postgres', true)!);
assert.equal(direct.port, '5432');
assert.equal(direct.searchParams.get('connection_limit'), '1');

console.log('Serverless database URL checks passed');
