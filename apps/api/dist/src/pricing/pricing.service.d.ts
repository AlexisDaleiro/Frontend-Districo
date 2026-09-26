import { PrismaService } from '../prisma/prisma.service';
export declare class PricingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    defaultPriceList(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
    }>;
    currentVariantPrice(productVariantId: string, priceListId?: string): Promise<({
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
    }) | null>;
    setVariantPrice(productVariantId: string, amount: number, currency?: string, changedById?: string, priceListId?: string): Promise<{
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
    }>;
    private findPriceList;
}
