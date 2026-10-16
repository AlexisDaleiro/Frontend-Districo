import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';
import { EmailDeliveryError, emailSettings, openEmail, sealEmail, sendResend } from './email-provider';
import { notificationContent } from './email-templates';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService = new ConfigService()) {}

  settings() { return emailSettings(this.config); }

  onModuleInit() {
    if (!this.settings().ready || !this.settings().worker) return;
    this.timer = setInterval(() => { void this.dispatch().catch(() => this.logger.warn('EMAIL_DISPATCH_FAILED')); }, 10000);
    this.timer.unref();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async enqueue(event: string, recipient: string, content: { subject: string; text: string }, payload?: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient = this.prisma, expiresAt = new Date(Date.now() + 23 * 60 * 60000)) {
    const settings = this.settings();
    if (!settings.ready) throw new Error('EMAIL_NOT_CONFIGURED');
    const id = randomUUID();
    const message = { from: settings.from!, to: [recipient], ...content,
      ...(this.config.get<string>('EMAIL_REPLY_TO') ? { reply_to: this.config.get<string>('EMAIL_REPLY_TO') } : {}) };
    return tx.notificationLog.create({ data: {
      id, event, recipient, payload, provider: 'resend', status: 'PENDING', expiresAt,
      encryptedMessage: sealEmail(message, settings.key, id),
    } });
  }

  async notify(event: string, recipient?: string, payload?: Prisma.InputJsonValue) {
    try {
      const settings = this.settings();
      const content = settings.origin ? notificationContent(event, payload, settings.origin) : undefined;
      if (settings.ready && recipient && content) return await this.enqueue(event, recipient, content, payload);
      return await this.prisma.notificationLog.create({ data: { event, recipient, payload, provider: 'disabled', status: 'DISABLED' } });
    } catch {
      // Notifications must not turn a committed order into an HTTP error.
      this.logger.warn('EMAIL_ENQUEUE_FAILED');
      return undefined;
    }
  }

  async dispatch({ limit = 3, budgetMs = 40000 } = {}) {
    if (this.running || !this.settings().ready) return { processed: 0 };
    this.running = true;
    let processed = 0;
    const deadline = Date.now() + Math.min(40000, Math.max(10000, budgetMs));
    const batchSize = Math.min(30, Math.max(1, limit));
    try {
      const now = new Date();
      await this.prisma.notificationLog.updateMany({ where: {
        status: { in: ['PENDING', 'PROCESSING'] }, expiresAt: { lte: now },
      }, data: { status: 'CANCELLED', encryptedMessage: null, lockedAt: null, errorCode: 'EXPIRED' } });
      await this.prisma.notificationLog.updateMany({ where: {
        status: 'PROCESSING', lockedAt: { lt: new Date(now.getTime() - 120000) },
      }, data: { status: 'PENDING', lockedAt: null } });
      // Recovery links must not expire behind ordinary order notifications.
      const securityEvents = ['password.reset_requested', 'password.changed'];
      const pending = { status: 'PENDING', availableAt: { lte: now }, expiresAt: { gt: now } };
      const priority = await this.prisma.notificationLog.findMany({ where: { ...pending, event: { in: securityEvents } },
        orderBy: [{ expiresAt: 'asc' }, { availableAt: 'asc' }, { id: 'asc' }], take: batchSize });
      const ordinary = priority.length < batchSize ? await this.prisma.notificationLog.findMany({
        where: { ...pending, event: { notIn: securityEvents } },
        orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: batchSize - priority.length,
      }) : [];
      const rows = [...priority, ...ordinary];
      for (const row of rows) {
        // Leave room for the provider's 8s timeout and persisting its result.
        if (Date.now() + 9000 >= deadline) break;
        const lockedAt = new Date();
        const claimed = await this.prisma.notificationLog.updateMany({ where: {
          id: row.id, status: 'PENDING', availableAt: { lte: lockedAt }, expiresAt: { gt: lockedAt },
        },
          data: { status: 'PROCESSING', lockedAt, attempts: { increment: 1 } } });
        if (!claimed.count) continue;
        try {
          if (!row.encryptedMessage) throw new EmailDeliveryError('MISSING_CONTENT', false);
          if (!row.expiresAt || row.expiresAt <= lockedAt) throw new EmailDeliveryError('EXPIRED', false);
          const settings = this.settings();
          let message;
          try { message = openEmail(row.encryptedMessage, settings.key, row.id); }
          catch { throw new EmailDeliveryError('INVALID_CONTENT', false); }
          await sendResend(message, settings.apiKey!, row.id);
          await this.prisma.notificationLog.updateMany({ where: { id: row.id, status: 'PROCESSING', lockedAt },
            data: { status: 'ACCEPTED', acceptedAt: new Date(), lockedAt: null, encryptedMessage: null, errorCode: null } });
        } catch (cause) {
          const error = cause instanceof EmailDeliveryError ? cause : new EmailDeliveryError('INTERNAL', true);
          const retry = error.retryable && row.attempts + 1 < 5;
          await this.prisma.notificationLog.updateMany({ where: { id: row.id, status: 'PROCESSING', lockedAt },
            data: { status: retry ? 'PENDING' : 'FAILED', lockedAt: null, errorCode: error.code,
              availableAt: new Date(Date.now() + 30000 * 2 ** row.attempts), ...(retry ? {} : { encryptedMessage: null }) } });
        }
        processed++;
        if (processed < rows.length) await new Promise((resolve) => setTimeout(resolve, 650));
      }
      return { processed };
    } finally { this.running = false; }
  }
}
