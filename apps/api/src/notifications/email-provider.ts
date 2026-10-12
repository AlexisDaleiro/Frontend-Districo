import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  reply_to?: string;
}

export class EmailDeliveryError extends Error {
  constructor(readonly code: string, readonly retryable: boolean) { super(code); }
}

export function emailSettings(config: ConfigService) {
  const key = Buffer.from(config.get<string>('EMAIL_ENCRYPTION_KEY') ?? '', 'base64');
  const from = config.get<string>('EMAIL_FROM')?.trim();
  const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
  const dispatchSecret = config.get<string>('EMAIL_DISPATCH_SECRET') ?? '';
  const worker = config.get<string>('EMAIL_WORKER_ENABLED') === 'true' && !process.env.VERCEL;
  let origin: string | undefined;
  try {
    const url = new URL(config.get<string>('EMAIL_PUBLIC_URL') ?? '');
    if (!url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
        (url.protocol === 'https:' || (config.get<string>('NODE_ENV') !== 'production' &&
          url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) origin = url.origin;
  } catch { /* Invalid configuration keeps recovery disabled. */ }
  const ready = config.get<string>('EMAIL_PROVIDER') === 'resend' && !!apiKey && !!from &&
    !/[\r\n]/.test(from) && key.length === 32 && !!origin && (worker || dispatchSecret.length >= 32);
  return { ready, key, from, apiKey, origin, worker, dispatchSecret };
}

export function sealEmail(message: EmailMessage, key: Buffer, id: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const content = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), content.toString('base64url')].join('.');
}

export function openEmail(value: string, key: Buffer, id: string): EmailMessage {
  const [version, iv, tag, content, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !content || extra) throw new Error('Invalid encrypted email');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(content, 'base64url')), decipher.final()]).toString('utf8'));
}

export async function sendResend(message: EmailMessage, apiKey: string, id: string) {
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `districo/${id}` },
      body: JSON.stringify(message),
    });
  } catch { throw new EmailDeliveryError('NETWORK', true); }
  // Provider error bodies can contain addresses or reset links.
  if (!response.ok) throw new EmailDeliveryError(`HTTP_${response.status}`, response.status === 429 || response.status === 409 || response.status >= 500);
}
