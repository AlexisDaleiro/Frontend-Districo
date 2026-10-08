import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';
import { CustomerInvoicesService } from './customer-invoices.service';
import { CustomerInvoiceQueryDto } from './dto/customer-invoice-query.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly invoices: CustomerInvoicesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user, dto.acceptManualReview ?? false, dto.deliveryAddressId);
  }

  @Get('me')
  findMine(@CurrentUser() user: JwtUser) {
    return this.ordersService.findMyOrders(user);
  }

  @Get('me/invoices')
  findMyInvoices(@CurrentUser() user: JwtUser, @Query() query: CustomerInvoiceQueryDto) {
    return this.invoices.list(user.sub, query);
  }

  @Get('me/invoices/:invoiceId/pdf')
  async downloadMyInvoice(@CurrentUser() user: JwtUser, @Param('invoiceId') invoiceId: string, @Res({ passthrough: true }) response: Response) {
    const invoice = await this.invoices.pdf(user.sub, invoiceId);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.name}"`,
      'Content-Length': String(invoice.bytes.length),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(invoice.bytes);
  }

  @Get('me/:id')
  findMineOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.ordersService.findMyOrder(user, id);
  }
}
