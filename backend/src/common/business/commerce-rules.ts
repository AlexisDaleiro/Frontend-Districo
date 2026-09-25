import { CreditStatus, OrderStatus, Permission, Role } from '@prisma/client';

export interface QuantityRuleInput {
  quantity: number;
  minimumOrderQuantity: number;
  saleMultiple: number;
  availableStock: number;
}

export function validateQuantityRule(input: QuantityRuleInput) {
  if (input.quantity < input.minimumOrderQuantity) {
    return { valid: false, reason: `Cantidad minima: ${input.minimumOrderQuantity}.` };
  }
  if (input.quantity % input.saleMultiple !== 0) {
    return {
      valid: false,
      reason: `Este producto se comercializa en multiplos de ${input.saleMultiple} unidades. Cantidad minima: ${input.minimumOrderQuantity}.`,
    };
  }
  if (input.quantity > input.availableStock) {
    return { valid: false, reason: `Stock insuficiente. Disponible: ${input.availableStock}.` };
  }
  return { valid: true };
}

export function canViewPrice(role: Role | undefined, permissions: Permission[] | undefined, requiresMedicationPermission: boolean) {
  if (!role || !permissions) return false;
  if (role === Role.ADMIN) return true;
  if (!permissions.includes(Permission.CAN_VIEW_PRICES)) return false;
  if (requiresMedicationPermission && !permissions.includes(Permission.CAN_BUY_MEDICATIONS)) return false;
  return true;
}

export function requiresManualReview(creditStatus?: CreditStatus | null) {
  return creditStatus === CreditStatus.PAYMENT_DELAY || creditStatus === CreditStatus.PAYMENT_PENDING || creditStatus === CreditStatus.RESTRICTED;
}

export function submittedStatusForCredit(creditStatus?: CreditStatus | null) {
  return requiresManualReview(creditStatus) ? OrderStatus.PENDING_REVIEW : OrderStatus.SUBMITTED;
}
