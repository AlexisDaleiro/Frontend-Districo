import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CategoriesModule } from '../catalog/categories/categories.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [PrismaModule, AuditModule, CategoriesModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
