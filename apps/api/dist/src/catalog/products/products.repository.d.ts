import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductFilterDto } from './dto/product-filter.dto';
export declare class ProductsRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMany(filters: ProductFilterDto): Promise<{
        items: ({
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
                    amount: Prisma.Decimal;
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
                weight: Prisma.Decimal | null;
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    findBySlug(slug: string): Prisma.Prisma__ProductClient<({
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
                amount: Prisma.Decimal;
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
            weight: Prisma.Decimal | null;
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.ProductCreateInput): Prisma.Prisma__ProductClient<{
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
                amount: Prisma.Decimal;
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
            weight: Prisma.Decimal | null;
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(id: string, data: Prisma.ProductUpdateInput): Prisma.Prisma__ProductClient<{
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
                amount: Prisma.Decimal;
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
            weight: Prisma.Decimal | null;
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    createVariant(productId: string, data: Prisma.ProductVariantCreateWithoutProductInput): Prisma.Prisma__ProductVariantClient<{
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
        weight: Prisma.Decimal | null;
        unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
        saleMultiple: number;
        minimumOrderQuantity: number;
        physicalStock: number;
        reservedStock: number;
        isDemoData: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updateVariant(id: string, data: Prisma.ProductVariantUpdateInput): Prisma.Prisma__ProductVariantClient<{
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
        weight: Prisma.Decimal | null;
        unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
        saleMultiple: number;
        minimumOrderQuantity: number;
        physicalStock: number;
        reservedStock: number;
        isDemoData: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string): Prisma.Prisma__ProductClient<{
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
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findVariantById(id: string): Prisma.Prisma__ProductVariantClient<{
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
        weight: Prisma.Decimal | null;
        unitOfMeasure: import(".prisma/client").$Enums.UnitOfMeasure;
        saleMultiple: number;
        minimumOrderQuantity: number;
        physicalStock: number;
        reservedStock: number;
        isDemoData: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    createMedia(productId: string, data: Prisma.ProductMediaCreateWithoutProductInput): Prisma.Prisma__ProductMediaClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findMediaById(id: string): Prisma.Prisma__ProductMediaClient<{
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
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updateMedia(id: string, data: Prisma.ProductMediaUpdateInput): Prisma.Prisma__ProductMediaClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    deleteMedia(id: string): Prisma.Prisma__ProductMediaClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    private categoryAndDescendantIds;
}
