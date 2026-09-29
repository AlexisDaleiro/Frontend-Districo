import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { CheckoutController } from './checkout.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderBillingService } from './order-billing.service';
import { InvoiceStorageService } from './invoice-storage.service';

@Module({
  imports: [PrismaModule, InventoryModule, PromotionsModule, AuditModule, NotificationsModule],
  controllers: [OrdersController, CheckoutController],
  providers: [OrdersService, OrderBillingService, InvoiceStorageService],
  exports: [OrdersService, OrderBillingService],
})
export class OrdersModule {}
