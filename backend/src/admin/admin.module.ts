import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, AuditModule, OrdersModule, ApplicationsModule, PromotionsModule, RecommendationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
