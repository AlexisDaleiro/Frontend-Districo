import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user, dto.acceptManualReview ?? false);
  }

  @Get('me')
  findMine(@CurrentUser() user: JwtUser) {
    return this.ordersService.findMyOrders(user);
  }

  @Get('me/:id')
  findMineOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.ordersService.findMyOrder(user, id);
  }
}
