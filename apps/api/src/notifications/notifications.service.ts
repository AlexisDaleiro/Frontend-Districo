import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailProvider {
  send(event: string, recipient?: string, payload?: Prisma.InputJsonValue): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(event: string, recipient?: string) {
    console.log(`[notification:${event}] ${recipient ?? 'sin-recipient'}`);
  }
}

@Injectable()
export class NotificationsService {
  private readonly provider: EmailProvider = new ConsoleEmailProvider();

  constructor(private readonly prisma: PrismaService) {}

  async notify(event: string, recipient?: string, payload?: Prisma.InputJsonValue) {
    await this.provider.send(event, recipient, payload);
    return this.prisma.notificationLog.create({
      data: {
        event,
        recipient,
        payload,
      },
    });
  }
}
