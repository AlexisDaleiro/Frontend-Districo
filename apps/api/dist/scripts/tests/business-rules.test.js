"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const client_1 = require("@prisma/client");
const commerce_rules_1 = require("../../src/common/business/commerce-rules");
const promotion_rules_1 = require("../../src/common/business/promotion-rules");
function testPriceVisibility() {
    strict_1.default.equal((0, commerce_rules_1.canViewPrice)(undefined, undefined, false), false);
    strict_1.default.equal((0, commerce_rules_1.canViewPrice)(client_1.Role.CLIENT, [client_1.Permission.CAN_VIEW_PRICES], false), true);
    strict_1.default.equal((0, commerce_rules_1.canViewPrice)(client_1.Role.CLIENT, [client_1.Permission.CAN_VIEW_PRICES], true), false);
    strict_1.default.equal((0, commerce_rules_1.canViewPrice)(client_1.Role.CLIENT, [client_1.Permission.CAN_VIEW_PRICES, client_1.Permission.CAN_BUY_MEDICATIONS], true), true);
    strict_1.default.equal((0, commerce_rules_1.canViewPrice)(client_1.Role.ADMIN, [], true), true);
}
function testQuantityRules() {
    strict_1.default.equal((0, commerce_rules_1.validateQuantityRule)({ quantity: 6, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).valid, false);
    strict_1.default.match((0, commerce_rules_1.validateQuantityRule)({ quantity: 1, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).reason ?? '', /Cantidad minima/);
    strict_1.default.match((0, commerce_rules_1.validateQuantityRule)({ quantity: 10, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 4 }).reason ?? '', /Stock insuficiente/);
    strict_1.default.equal((0, commerce_rules_1.validateQuantityRule)({ quantity: 10, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).valid, true);
}
function testReservationMath() {
    const physicalStock = 20;
    const reservedStock = 5;
    const quantity = 5;
    strict_1.default.equal(physicalStock - reservedStock, 15);
    strict_1.default.equal(physicalStock - (reservedStock + quantity), 10);
    strict_1.default.equal(physicalStock - (reservedStock + quantity - quantity), 15);
}
function testCrossPromotion() {
    const lines = [
        { productId: 'food', variantId: 'food-15', brandId: 'gran-plus', laboratoryId: null, categoryIds: ['alimentos'], quantity: 10, unitPrice: 100 },
        { productId: 'bio', variantId: 'bio-2', brandId: 'biofresh', laboratoryId: null, categoryIds: ['alimentos'], quantity: 2, unitPrice: 200 },
    ];
    const promotions = [
        {
            id: 'promo-cross',
            name: 'Cruce Gran Plus Biofresh',
            type: client_1.PromotionType.CROSS_DISCOUNT,
            priority: 10,
            combinable: false,
            conditions: [{ targetType: client_1.PromotionTargetType.BRAND, targetId: 'gran-plus', metric: client_1.PromotionMetric.MIN_QUANTITY, minQuantity: 10 }],
            rewards: [{ targetType: client_1.PromotionTargetType.BRAND, targetId: 'biofresh', rewardType: client_1.PromotionRewardType.PERCENTAGE, percentage: 15 }],
        },
    ];
    const discounts = (0, promotion_rules_1.calculatePromotionDiscounts)(lines, promotions);
    strict_1.default.equal(discounts.length, 1);
    strict_1.default.equal(discounts[0].amount, 60);
}
function testCreditReview() {
    strict_1.default.equal((0, commerce_rules_1.requiresManualReview)(client_1.CreditStatus.GOOD_STANDING), false);
    strict_1.default.equal((0, commerce_rules_1.requiresManualReview)(client_1.CreditStatus.PAYMENT_PENDING), true);
    strict_1.default.equal((0, commerce_rules_1.submittedStatusForCredit)(client_1.CreditStatus.PAYMENT_PENDING), 'PENDING_REVIEW');
    strict_1.default.equal((0, commerce_rules_1.submittedStatusForCredit)(client_1.CreditStatus.GOOD_STANDING), 'SUBMITTED');
}
testPriceVisibility();
testQuantityRules();
testReservationMath();
testCrossPromotion();
testCreditReview();
console.log('Business rule tests passed');
//# sourceMappingURL=business-rules.test.js.map