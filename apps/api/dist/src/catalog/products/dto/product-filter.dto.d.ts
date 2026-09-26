import { ProductType } from '@prisma/client';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';
export declare class ProductFilterDto extends PaginationQueryDto {
    search?: string;
    categoryId?: string;
    brandId?: string;
    laboratoryId?: string;
    productType?: ProductType;
    attributeValueIds?: string[];
    medicationRequired?: boolean;
    featured?: boolean;
}
