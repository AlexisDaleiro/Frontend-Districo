import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule, InventoryModule, RecommendationsModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
