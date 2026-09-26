import { ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type StockFields = Pick<ProductVariant, 'id' | 'physicalStock' | 'reservedStock' | 'minimumOrderQuantity' | 'saleMultiple' | 'active' | 'deletedAt'>;
export declare class InventoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    availableStock(variant: Pick<ProductVariant, 'physicalStock' | 'reservedStock'>): number;
    validateQuantityRules(variant: Pick<ProductVariant, 'minimumOrderQuantity' | 'saleMultiple'>, quantity: number): void;
    validateAvailableStock(variant: StockFields, quantity: number): void;
    getVariantStock(variantId: string): Promise<{
        id: string;
        productId: string;
        productName: string;
        sku: string;
        physicalStock: number;
        reservedStock: number;
        availableStock: number;
        saleMultiple: number;
        minimumOrderQuantity: number;
        active: boolean;
    }>;
    updateStock(variantId: string, physicalStock: number, reservedStock?: number): Promise<{
        availableStock: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        deletedAt: Date | null;
        productId: string;
        sku: string;
        ean: string | null;
        presentation: string | null;
        weight: import("@prisma/client/runtime/library").Decimal | null;
        unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
        saleMultiple: number;
        minimumOrderQuantity: number;
        physicalStock: number;
        reservedStock: number;
        isDemoData: boolean;
    }>;
}
export {};
