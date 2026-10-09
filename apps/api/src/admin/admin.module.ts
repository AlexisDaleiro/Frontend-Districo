import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SalespeopleController } from './salespeople.controller';
import { SalespeopleService } from './salespeople.service';
import { AdminToolsController } from './admin-tools.controller';
import { AdminToolsService } from './admin-tools.service';
import { SalesReportsService } from './sales-reports.service';

@Module({
  imports: [PrismaModule, AuditModule, OrdersModule, ApplicationsModule, PromotionsModule, RecommendationsModule],
  controllers: [AdminController, SalespeopleController, AdminToolsController],
  providers: [AdminService, SalespeopleService, AdminToolsService, SalesReportsService],
})
export class AdminModule {}
