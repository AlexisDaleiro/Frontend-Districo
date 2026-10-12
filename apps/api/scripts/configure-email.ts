import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

if (!process.argv.includes('--apply')) throw new Error('Usa --apply para preparar la configuracion privada local.');
const path = resolve('.env');
let source = readFileSync(path, 'utf8');
const settings = parse(source);
if (settings.EMAIL_ENCRYPTION_KEY && Buffer.from(settings.EMAIL_ENCRYPTION_KEY, 'base64').length !== 32)
  throw new Error('La clave existente no es valida; no se regenera automaticamente.');
const defaults: Record<string, string> = {
  EMAIL_PROVIDER: 'resend', RESEND_API_KEY: '', EMAIL_FROM: 'DISTRICO <onboarding@resend.dev>',
  EMAIL_PUBLIC_URL: 'http://127.0.0.1:3002', EMAIL_WORKER_ENABLED: 'true',
  EMAIL_ENCRYPTION_KEY: randomBytes(32).toString('base64'), EMAIL_DISPATCH_SECRET: randomBytes(32).toString('base64url'),
};
for (const [name, value] of Object.entries(defaults)) {
  if (settings[name]) continue;
  const entry = `${name}=${JSON.stringify(value)}`;
  const line = new RegExp(`^${name}[ \\t]*=.*$`, 'm');
  source = line.test(source) ? source.replace(line, () => entry) : `${source.trimEnd()}\n${entry}\n`;
}
writeFileSync(path, source, 'utf8');
console.log('Configuracion privada preparada; claves existentes conservadas.');
console.log(settings.RESEND_API_KEY ? 'Clave de Resend existente conservada; verificar envio.' : 'Falta RESEND_API_KEY en .env. Nunca compartirla por chat ni subirla a Git.');
