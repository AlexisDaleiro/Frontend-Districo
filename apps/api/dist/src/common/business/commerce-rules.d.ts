import { CreditStatus, Permission, Role } from '@prisma/client';
export interface QuantityRuleInput {
    quantity: number;
    minimumOrderQuantity: number;
    saleMultiple: number;
    availableStock: number;
}
export declare function validateQuantityRule(input: QuantityRuleInput): {
    valid: boolean;
    reason: string;
} | {
    valid: boolean;
    reason?: undefined;
};
export declare function canViewPrice(role: Role | undefined, permissions: Permission[] | undefined, requiresMedicationPermission: boolean): boolean;
export declare function requiresManualReview(creditStatus?: CreditStatus | null): creditStatus is "PAYMENT_DELAY" | "PAYMENT_PENDING" | "RESTRICTED";
export declare function submittedStatusForCredit(creditStatus?: CreditStatus | null): "SUBMITTED" | "PENDING_REVIEW";
