import { MediaType } from '@prisma/client';
export declare class CreateProductMediaDto {
    variantId?: string;
    type?: MediaType;
    url: string;
    alt?: string;
    position?: number;
    isPrimary?: boolean;
}
