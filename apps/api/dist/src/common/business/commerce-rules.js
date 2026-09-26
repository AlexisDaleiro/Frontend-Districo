"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuantityRule = validateQuantityRule;
exports.canViewPrice = canViewPrice;
exports.requiresManualReview = requiresManualReview;
exports.submittedStatusForCredit = submittedStatusForCredit;
const client_1 = require("@prisma/client");
function validateQuantityRule(input) {
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
function canViewPrice(role, permissions, requiresMedicationPermission) {
    if (!role || !permissions)
        return false;
    if (role === client_1.Role.ADMIN)
        return true;
    if (!permissions.includes(client_1.Permission.CAN_VIEW_PRICES))
        return false;
    if (requiresMedicationPermission && !permissions.includes(client_1.Permission.CAN_BUY_MEDICATIONS))
        return false;
    return true;
}
function requiresManualReview(creditStatus) {
    return creditStatus === client_1.CreditStatus.PAYMENT_DELAY || creditStatus === client_1.CreditStatus.PAYMENT_PENDING || creditStatus === client_1.CreditStatus.RESTRICTED;
}
function submittedStatusForCredit(creditStatus) {
    return requiresManualReview(creditStatus) ? client_1.OrderStatus.PENDING_REVIEW : client_1.OrderStatus.SUBMITTED;
}
//# sourceMappingURL=commerce-rules.js.map