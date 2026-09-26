import { ProductSource, ProductType } from '@prisma/client';
export interface DemoImportVariant {
    sku: string;
    ean?: string;
    name: string;
    presentation?: string;
    saleMultiple: number;
    minimumOrderQuantity: number;
    physicalStock: number;
}
export interface DemoImportProduct {
    name: string;
    shortDescription: string;
    productType: ProductType;
    categoryName: string;
    brandName?: string;
    laboratoryName?: string;
    requiresMedicationPermission?: boolean;
    variants: DemoImportVariant[];
    imageUrl?: string;
}
export declare function importDemoProducts(source: ProductSource, products: DemoImportProduct[]): Promise<void>;
