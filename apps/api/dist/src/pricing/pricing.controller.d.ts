import { JwtUser } from '../common/types/jwt-user.type';
import { SetVariantPriceDto } from './dto/set-variant-price.dto';
import { PricingService } from './pricing.service';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    defaultPriceList(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        active: boolean;
    }>;
    currentVariantPrice(variantId: string): Promise<({
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
    setVariantPrice(variantId: string, dto: SetVariantPriceDto, user: JwtUser): Promise<{
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
}
