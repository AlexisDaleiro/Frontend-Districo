import { UpdateStockDto } from './dto/update-stock.dto';
import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
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
    updateStock(variantId: string, dto: UpdateStockDto): Promise<{
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
