import { JwtUser } from '../common/types/jwt-user.type';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';
export declare class CartController {
    private readonly cartService;
    private readonly recommendationsService;
    constructor(cartService: CartService, recommendationsService: RecommendationsService);
    getCart(user: JwtUser): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    addItem(user: JwtUser, dto: AddCartItemDto): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    updateItem(user: JwtUser, itemId: string, dto: UpdateCartItemDto): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    removeItem(user: JwtUser, itemId: string): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    reserveCart(user: JwtUser): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    releaseReservations(user: JwtUser): Promise<{
        id: string;
        items: {
            id: string;
            quantity: number;
            product: {
                id: string;
                name: string;
                slug: string;
                requiresMedicationPermission: boolean;
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
            };
            variant: {
                id: string;
                sku: string;
                ean: string | null;
                name: string;
                presentation: string | null;
                saleMultiple: number;
                minimumOrderQuantity: number;
                availableStock: number;
            };
            unitPrice: number;
            currency: string;
            subtotal: number;
        }[];
        reservations: {
            id: string;
            createdAt: Date;
            variantId: string;
            status: import(".prisma/client").$Enums.StockReservationStatus;
            quantity: number;
            expiresAt: Date;
            cartId: string | null;
            orderId: string | null;
            releasedAt: Date | null;
            consumedAt: Date | null;
        }[];
        total: number;
    }>;
    recommendations(user: JwtUser): Promise<{
        rule: string;
        product: {
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
            variants: {
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
            }[];
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
        };
    }[]>;
}
