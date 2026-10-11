import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const securityHash = (value: string) => createHash('sha256').update(value).digest('hex');
export function encryptMfa(secret: string, key: Buffer, userId: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function decryptMfa(value: string, key: Buffer, userId: string) {
  const [version, iv, tag, encrypted] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Invalid MFA ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(userId)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}
