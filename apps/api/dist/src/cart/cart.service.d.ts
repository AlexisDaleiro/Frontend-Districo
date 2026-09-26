import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/types/jwt-user.type';
export declare class CartService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly inventoryService;
    private expirationJob?;
    constructor(prisma: PrismaService, inventoryService: InventoryService);
    onModuleInit(): void;
    onModuleDestroy(): void;
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
    addItem(user: JwtUser, variantId: string, quantity: number): Promise<{
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
    updateItem(user: JwtUser, itemId: string, quantity: number): Promise<{
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
    releaseCartReservations(user: JwtUser): Promise<{
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
    expireReservations(): Promise<{
        expired: number;
    }>;
    private ensureCart;
    private findVariantForCart;
    private validateVariantForUser;
    private assertCanUseCart;
    private canBuyMedication;
    private releaseActiveCartReservations;
    private toCartResponse;
}
