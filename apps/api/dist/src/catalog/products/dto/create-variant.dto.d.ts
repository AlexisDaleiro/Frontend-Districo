import { UnitOfMeasure } from '@prisma/client';
export declare class CreateVariantDto {
    sku: string;
    ean?: string;
    name: string;
    presentation?: string;
    weight?: number;
    unitOfMeasure?: UnitOfMeasure;
    saleMultiple?: number;
    minimumOrderQuantity?: number;
    physicalStock?: number;
    reservedStock?: number;
    active?: boolean;
    isDemoData?: boolean;
}
