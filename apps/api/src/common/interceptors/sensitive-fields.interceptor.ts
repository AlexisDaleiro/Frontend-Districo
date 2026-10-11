import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

export function redactSecurityFields(value: unknown): unknown {
  if (value instanceof Date || Buffer.isBuffer(value) || Prisma.Decimal.isDecimal(value)) return value;
  if (Array.isArray(value)) return value.map(redactSecurityFields);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['passwordHash', 'tokenHash', 'mfaSecretEncrypted', 'pendingMfaSecret', 'codeHash', 'mfaLastStep'].includes(key)).map(([key, item]) => [key, redactSecurityFields(item)]));
  return value;
}
@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) { return next.handle().pipe(map(redactSecurityFields)); }
}
