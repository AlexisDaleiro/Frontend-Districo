import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NotificationsService } from './notifications.service';

@Controller('internal/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('dispatch')
  async dispatch(@Headers('authorization') authorization?: string) {
    const settings = this.notifications.settings();
    const secrets = [settings.dispatchSecret, process.env.CRON_SECRET].filter(
      (secret): secret is string => Boolean(secret && secret.length >= 32),
    );
    const provided = createHash('sha256').update(authorization ?? '').digest();
    const authorized = secrets.some((secret) => {
      const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
      return timingSafeEqual(expected, provided);
    });
    if (!authorized) throw new UnauthorizedException();
    return this.notifications.dispatch();
  }
}
