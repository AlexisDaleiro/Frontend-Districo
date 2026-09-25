import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { CreateExpirationPromotionDto } from './dto/create-expiration-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findMany() {
    return this.promotionsService.findMany();
  }

  @Post()
  create(@Body() dto: CreatePromotionDto, @CurrentUser() user: JwtUser) {
    return this.promotionsService.create(dto, user.sub);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.promotionsService.updateActive(id, true, user.sub);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.promotionsService.updateActive(id, false, user.sub);
  }

  @Get('expiration')
  findExpirationPromotions() {
    return this.promotionsService.findExpirationPromotions();
  }

  @Post('expiration')
  createExpirationPromotion(@Body() dto: CreateExpirationPromotionDto, @CurrentUser() user: JwtUser) {
    return this.promotionsService.createExpirationPromotion(dto, user.sub);
  }
}
