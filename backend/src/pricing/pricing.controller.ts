import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { SetVariantPriceDto } from './dto/set-variant-price.dto';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@ApiBearerAuth()
@Controller('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('price-list/default')
  defaultPriceList() {
    return this.pricingService.defaultPriceList();
  }

  @Get('variants/:variantId/current')
  currentVariantPrice(@Param('variantId') variantId: string) {
    return this.pricingService.currentVariantPrice(variantId);
  }

  @Patch('variants/:variantId')
  setVariantPrice(@Param('variantId') variantId: string, @Body() dto: SetVariantPriceDto, @CurrentUser() user: JwtUser) {
    return this.pricingService.setVariantPrice(variantId, dto.amount, dto.currency, user.sub, dto.priceListId);
  }
}
