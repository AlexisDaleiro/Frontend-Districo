import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductVariant } from '@prisma/client';
import { validateQuantityRule } from '../common/business/commerce-rules';
import { PrismaService } from '../prisma/prisma.service';

type StockFields = Pick<ProductVariant, 'id' | 'physicalStock' | 'reservedStock' | 'minimumOrderQuantity' | 'saleMultiple' | 'active' | 'deletedAt'>;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  availableStock(variant: Pick<ProductVariant, 'physicalStock' | 'reservedStock'>) {
    return variant.physicalStock - variant.reservedStock;
  }

  validateQuantityRules(variant: Pick<ProductVariant, 'minimumOrderQuantity' | 'saleMultiple'>, quantity: number) {
    const result = validateQuantityRule({
      quantity,
      minimumOrderQuantity: variant.minimumOrderQuantity,
      saleMultiple: variant.saleMultiple,
      availableStock: Number.MAX_SAFE_INTEGER,
    });
    if (!result.valid) {
      throw new BadRequestException(result.reason);
    }
  }

  validateAvailableStock(variant: StockFields, quantity: number) {
    if (!variant.active || variant.deletedAt) {
      throw new BadRequestException('La variante no esta disponible para la venta.');
    }
    const availableStock = this.availableStock(variant);
    const result = validateQuantityRule({
      quantity,
      minimumOrderQuantity: variant.minimumOrderQuantity,
      saleMultiple: variant.saleMultiple,
      availableStock,
    });
    if (!result.valid) {
      throw new BadRequestException(result.reason);
    }
  }

  async getVariantStock(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || variant.deletedAt) {
      throw new NotFoundException('Variante no encontrada.');
    }
    return {
      id: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      sku: variant.sku,
      physicalStock: variant.physicalStock,
      reservedStock: variant.reservedStock,
      availableStock: this.availableStock(variant),
      saleMultiple: variant.saleMultiple,
      minimumOrderQuantity: variant.minimumOrderQuantity,
      active: variant.active,
    };
  }

  async updateStock(variantId: string, physicalStock: number, reservedStock?: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.deletedAt) {
      throw new NotFoundException('Variante no encontrada.');
    }
    const nextReservedStock = reservedStock ?? variant.reservedStock;
    if (nextReservedStock > physicalStock) {
      throw new BadRequestException('El stock reservado no puede superar el stock fisico.');
    }
    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { physicalStock, reservedStock: nextReservedStock },
    });
    return {
      ...updated,
      availableStock: this.availableStock(updated),
    };
  }
}
