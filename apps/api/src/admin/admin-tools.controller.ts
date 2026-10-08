import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/types/jwt-user.type';
import { AdminToolsService } from './admin-tools.service';
import { AdminSearchDto, BulkCustomerSellerDto, BulkHistoryDto, BulkProductActiveDto, BulkProductPricesDto } from './dto/admin-tools.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SALES, Role.CATALOG, Role.FINANCE, Role.CUSTOM)
export class AdminToolsController {
  constructor(private readonly tools: AdminToolsService) {}

  @Get('search')
  search(@Query() query: AdminSearchDto, @CurrentUser() user: JwtUser) {
    return this.tools.search(query.search, user);
  }

  @Get('bulk/history')
  history(@Query() query: BulkHistoryDto, @CurrentUser() user: JwtUser) {
    return this.tools.history(query, user);
  }

  @Post('bulk/products/active/preview')
  previewActive(@Body() dto: BulkProductActiveDto, @CurrentUser() user: JwtUser) {
    return this.tools.productsActive(dto, user, true);
  }

  @Post('bulk/products/active')
  active(@Body() dto: BulkProductActiveDto, @CurrentUser() user: JwtUser) {
    return this.tools.productsActive(dto, user);
  }

  @Post('bulk/products/prices/preview')
  previewPrices(@Body() dto: BulkProductPricesDto, @CurrentUser() user: JwtUser) {
    return this.tools.productsPrices(dto, user, true);
  }

  @Post('bulk/products/prices')
  prices(@Body() dto: BulkProductPricesDto, @CurrentUser() user: JwtUser) {
    return this.tools.productsPrices(dto, user);
  }

  @Post('bulk/customers/salesperson/preview')
  previewSeller(@Body() dto: BulkCustomerSellerDto, @CurrentUser() user: JwtUser) {
    return this.tools.customersSeller(dto, user, true);
  }

  @Post('bulk/customers/salesperson')
  seller(@Body() dto: BulkCustomerSellerDto, @CurrentUser() user: JwtUser) {
    return this.tools.customersSeller(dto, user);
  }
}
