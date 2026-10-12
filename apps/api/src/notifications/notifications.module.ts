import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
