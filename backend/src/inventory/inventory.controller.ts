import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateStockDto } from './dto/update-stock.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('variants/:variantId/stock')
  getVariantStock(@Param('variantId') variantId: string) {
    return this.inventoryService.getVariantStock(variantId);
  }

  @Patch('variants/:variantId/stock')
  updateStock(@Param('variantId') variantId: string, @Body() dto: UpdateStockDto) {
    return this.inventoryService.updateStock(variantId, dto.physicalStock, dto.reservedStock);
  }
}
