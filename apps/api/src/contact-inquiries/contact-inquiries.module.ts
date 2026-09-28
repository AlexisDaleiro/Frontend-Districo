import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactInquiriesController, AdminContactInquiriesController } from './contact-inquiries.controller';
import { ContactInquiriesService } from './contact-inquiries.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ContactInquiriesController, AdminContactInquiriesController],
  providers: [ContactInquiriesService],
})
export class ContactInquiriesModule {}
