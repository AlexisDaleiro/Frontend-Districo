import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

export function loadBackendEnv() {
  const path = resolve(__dirname, '../.env');
  if (existsSync(path)) loadEnvFile(path);
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en apps/api/.env.');
  const url = new URL(process.env.DATABASE_URL);
  if (!['postgresql:', 'postgres:'].includes(url.protocol))
    throw new Error('DATABASE_URL debe ser una conexion PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!local && !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')) {
    throw new Error('La conexion remota requiere sslmode=require o verify-full.');
  }
}

export function databaseError(error: unknown): string {
  // Database errors can contain connection strings. Never log the original message.
  const code =
    error && typeof error === 'object' && 'code' in error && /^P\d{4}$/.test(String(error.code))
      ? ` (${error.code})`
      : '';
  return `No se pudo completar la operacion de base de datos${code}. Revisar apps/api/.env, SSL y las migraciones.`;
}
