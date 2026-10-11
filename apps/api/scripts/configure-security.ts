import 'dotenv/config';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

async function main() {
  if (!process.argv.includes('--apply')) throw new Error('Usá --apply para configurar la clave local y el bucket privado.');
  const envPath = resolve('.env');
  const existing = readFileSync(envPath, 'utf8');
  const configuredKey = parse(existing).MFA_ENCRYPTION_KEY;
  if (!configuredKey) {
    const entry = `MFA_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`;
    if (/^MFA_ENCRYPTION_KEY[ \t]*=/m.test(existing)) writeFileSync(envPath, existing.replace(/^MFA_ENCRYPTION_KEY[ \t]*=.*$/m, entry));
    else appendFileSync(envPath, `\n${entry}\n`);
    console.log('Clave privada MFA configurada en .env; conservar una copia segura fuera del repositorio.');
  } else {
    if (Buffer.from(configuredKey, 'base64').length !== 32) throw new Error('La clave MFA existente no es válida. Revisarla sin regenerar secretos de cuentas activas.');
    console.log('Clave MFA existente conservada.');
  }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_CV_BUCKET ?? 'job-cvs';
  if (!url || !key || !/^[a-z0-9][a-z0-9-]*$/.test(bucket)) throw new Error('Configurá SUPABASE_URL y SUPABASE_SECRET_KEY.');
  const base = new URL(url);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) throw new Error('URL de Storage inválida.');
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${base.origin}/storage/v1/bucket/${bucket}`, { headers, signal: AbortSignal.timeout(15000) });
  if (response.ok) {
    const settings = await response.json();
    if (settings.public !== false) throw new Error('El bucket de CV existente es público. No se modificó; requiere revisión antes de recibir archivos.');
    console.log('Bucket privado de CV existente conservado.'); return;
  }
  const failure = await response.json().catch(() => ({}));
  if (response.status !== 404 && String(failure.statusCode) !== '404') throw new Error(`No se pudo comprobar el bucket (${response.status}).`);
  const created = await fetch(`${base.origin}/storage/v1/bucket`, { method: 'POST', headers, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ['application/pdf'] }), signal: AbortSignal.timeout(15000) });
  if (!created.ok) throw new Error(`No se pudo crear el bucket (${created.status}).`);
  console.log('Bucket privado job-cvs creado; sin enlaces públicos.');
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'No se pudo configurar.'); process.exitCode = 1; });
