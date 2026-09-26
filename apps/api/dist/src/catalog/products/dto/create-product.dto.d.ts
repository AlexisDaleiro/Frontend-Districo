import { ProductSource, ProductType } from '@prisma/client';
export declare class CreateProductDto {
    name: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    productType?: ProductType;
    brandId?: string;
    laboratoryId?: string;
    source?: ProductSource;
    requiresMedicationPermission?: boolean;
    active?: boolean;
    featured?: boolean;
    newProduct?: boolean;
    tags?: string[];
    categoryIds?: string[];
    attributeValueIds?: string[];
}
