import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { BrandsModule } from './catalog/brands/brands.module';
import { LaboratoriesModule } from './catalog/laboratories/laboratories.module';
import { CategoriesModule } from './catalog/categories/categories.module';
import { AttributesModule } from './catalog/attributes/attributes.module';
import { ProductsModule } from './catalog/products/products.module';
import { PricingModule } from './pricing/pricing.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApplicationsModule } from './applications/applications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    LaboratoriesModule,
    CategoriesModule,
    AttributesModule,
    ProductsModule,
    PricingModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PromotionsModule,
    RecommendationsModule,
    AuditModule,
    NotificationsModule,
    ApplicationsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
