import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.CAN_PLACE_ORDERS)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  getCart(@CurrentUser() user: JwtUser) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  addItem(@CurrentUser() user: JwtUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto.variantId, dto.quantity);
  }

  @Patch('items/:itemId')
  updateItem(@CurrentUser() user: JwtUser, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(user, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: JwtUser, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user, itemId);
  }

  @Post('reserve')
  reserveCart(@CurrentUser() user: JwtUser) {
    return this.cartService.reserveCart(user);
  }

  @Post('reservations/release')
  releaseReservations(@CurrentUser() user: JwtUser) {
    return this.cartService.releaseCartReservations(user);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: JwtUser) {
    return this.recommendationsService.recommendationsForUserCart(user);
  }
}
