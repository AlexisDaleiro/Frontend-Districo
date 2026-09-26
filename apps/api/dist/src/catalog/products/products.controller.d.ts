import { JwtUser } from '../../common/types/jwt-user.type';
import { CreateProductMediaDto } from './dto/create-product-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateProductMediaDto } from './dto/update-product-media.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findMany(filters: ProductFilterDto, user?: JwtUser | null): Promise<{
        items: {
            medicationRestricted: boolean;
            variants: {
                availableStock: number;
                stockStatus: string;
                price: {
                    amount: number;
                    currency: string;
                    priceList: string;
                } | undefined;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                productId: string;
                sku: string;
                ean: string | null;
                presentation: string | null;
                weight: import("@prisma/client/runtime/library").Decimal | null;
                unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
                saleMultiple: number;
                minimumOrderQuantity: number;
            }[];
            brand: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                deletedAt: Date | null;
            } | null;
            laboratory: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                deletedAt: Date | null;
            } | null;
            categories: ({
                category: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                    slug: string;
                    parentId: string | null;
                    deletedAt: Date | null;
                };
            } & {
                categoryId: string;
                productId: string;
            })[];
            media: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                type: import(".prisma/client").$Enums.MediaType;
                url: string;
                alt: string | null;
                position: number;
                isPrimary: boolean;
                variantId: string | null;
                productId: string;
            }[];
            attributes: ({
                attributeValue: {
                    attribute: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        active: boolean;
                        slug: string;
                        type: import(".prisma/client").$Enums.AttributeType;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    slug: string;
                    attributeId: string;
                    value: string;
                };
            } & {
                attributeValueId: string;
                productId: string;
            })[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            shortDescription: string | null;
            description: string | null;
            productType: import(".prisma/client").$Enums.ProductType;
            brandId: string | null;
            laboratoryId: string | null;
            requiresMedicationPermission: boolean;
            featured: boolean;
            newProduct: boolean;
            tags: string[];
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    create(dto: CreateProductDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        laboratory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                parentId: string | null;
                deletedAt: Date | null;
            };
        } & {
            categoryId: string;
            productId: string;
        })[];
        variants: ({
            prices: ({
                priceList: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                productVariantId: string;
                priceListId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                currency: string;
                validFrom: Date;
                validUntil: Date | null;
            })[];
        } & {
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
        })[];
        media: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.MediaType;
            url: string;
            alt: string | null;
            position: number;
            isPrimary: boolean;
            variantId: string | null;
            productId: string;
        }[];
        attributes: ({
            attributeValue: {
                attribute: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                    slug: string;
                    type: import(".prisma/client").$Enums.AttributeType;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                attributeId: string;
                value: string;
            };
        } & {
            attributeValueId: string;
            productId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
        shortDescription: string | null;
        description: string | null;
        productType: import(".prisma/client").$Enums.ProductType;
        brandId: string | null;
        laboratoryId: string | null;
        source: import(".prisma/client").$Enums.ProductSource;
        requiresMedicationPermission: boolean;
        featured: boolean;
        newProduct: boolean;
        tags: string[];
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    createVariant(id: string, dto: CreateVariantDto): Promise<{
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
    updateVariant(id: string, dto: UpdateVariantDto): Promise<{
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
    createMedia(id: string, dto: CreateProductMediaDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.MediaType;
        url: string;
        alt: string | null;
        position: number;
        isPrimary: boolean;
        variantId: string | null;
        productId: string;
    }>;
    updateMedia(id: string, dto: UpdateProductMediaDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.MediaType;
        url: string;
        alt: string | null;
        position: number;
        isPrimary: boolean;
        variantId: string | null;
        productId: string;
    }>;
    deleteMedia(id: string): Promise<{
        success: boolean;
    }>;
    update(id: string, dto: UpdateProductDto): Promise<{
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        laboratory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                parentId: string | null;
                deletedAt: Date | null;
            };
        } & {
            categoryId: string;
            productId: string;
        })[];
        variants: ({
            prices: ({
                priceList: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                productVariantId: string;
                priceListId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                currency: string;
                validFrom: Date;
                validUntil: Date | null;
            })[];
        } & {
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
        })[];
        media: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.MediaType;
            url: string;
            alt: string | null;
            position: number;
            isPrimary: boolean;
            variantId: string | null;
            productId: string;
        }[];
        attributes: ({
            attributeValue: {
                attribute: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                    slug: string;
                    type: import(".prisma/client").$Enums.AttributeType;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                attributeId: string;
                value: string;
            };
        } & {
            attributeValueId: string;
            productId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        deletedAt: Date | null;
        shortDescription: string | null;
        description: string | null;
        productType: import(".prisma/client").$Enums.ProductType;
        brandId: string | null;
        laboratoryId: string | null;
        source: import(".prisma/client").$Enums.ProductSource;
        requiresMedicationPermission: boolean;
        featured: boolean;
        newProduct: boolean;
        tags: string[];
    }>;
    findBySlug(slug: string, user?: JwtUser | null): Promise<{
        medicationRestricted: boolean;
        variants: {
            availableStock: number;
            stockStatus: string;
            price: {
                amount: number;
                currency: string;
                priceList: string;
            } | undefined;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            productId: string;
            sku: string;
            ean: string | null;
            presentation: string | null;
            weight: import("@prisma/client/runtime/library").Decimal | null;
            unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
            saleMultiple: number;
            minimumOrderQuantity: number;
        }[];
        brand: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        laboratory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            slug: string;
            deletedAt: Date | null;
        } | null;
        categories: ({
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
                slug: string;
                parentId: string | null;
                deletedAt: Date | null;
            };
        } & {
            categoryId: string;
            productId: string;
        })[];
        media: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.MediaType;
            url: string;
            alt: string | null;
            position: number;
            isPrimary: boolean;
            variantId: string | null;
            productId: string;
        }[];
        attributes: ({
            attributeValue: {
                attribute: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    active: boolean;
                    slug: string;
                    type: import(".prisma/client").$Enums.AttributeType;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                attributeId: string;
                value: string;
            };
        } & {
            attributeValueId: string;
            productId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
        slug: string;
        shortDescription: string | null;
        description: string | null;
        productType: import(".prisma/client").$Enums.ProductType;
        brandId: string | null;
        laboratoryId: string | null;
        requiresMedicationPermission: boolean;
        featured: boolean;
        newProduct: boolean;
        tags: string[];
    }>;
}
