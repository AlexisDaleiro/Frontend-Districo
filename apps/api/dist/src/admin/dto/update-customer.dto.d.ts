import { AccountStatus, CreditStatus } from '@prisma/client';
export declare class UpdateCustomerDto {
    accountStatus?: AccountStatus;
    medicationPermission?: boolean;
    creditStatus?: CreditStatus;
    creditLimit?: number;
    internalCreditNote?: string;
}
