import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NotificationsService } from './notifications.service';

@Controller('internal/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('dispatch')
  async dispatch(@Headers('authorization') authorization?: string) {
    const secret = this.notifications.settings().dispatchSecret;
    const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
    const provided = createHash('sha256').update(authorization ?? '').digest();
    if (secret.length < 32 || !timingSafeEqual(expected, provided)) throw new UnauthorizedException();
    return this.notifications.dispatch({ limit: 30, budgetMs: 40000 });
  }
}
