import assert from 'node:assert/strict';
import { CreditStatus, Permission, PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType, Role } from '@prisma/client';
import { canViewPrice, requiresManualReview, submittedStatusForCredit, validateQuantityRule } from '../../src/common/business/commerce-rules';
import { calculatePromotionDiscounts, PromotionLine, PromotionSnapshot } from '../../src/common/business/promotion-rules';

function testPriceVisibility() {
  assert.equal(canViewPrice(undefined, undefined, false), false);
  assert.equal(canViewPrice(Role.CLIENT, [Permission.CAN_VIEW_PRICES], false), true);
  assert.equal(canViewPrice(Role.CLIENT, [Permission.CAN_VIEW_PRICES], true), false);
  assert.equal(canViewPrice(Role.CLIENT, [Permission.CAN_VIEW_PRICES, Permission.CAN_BUY_MEDICATIONS], true), true);
  assert.equal(canViewPrice(Role.ADMIN, [], true), true);
}

function testQuantityRules() {
  assert.equal(validateQuantityRule({ quantity: 6, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).valid, false);
  assert.match(validateQuantityRule({ quantity: 1, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).reason ?? '', /Cantidad minima/);
  assert.match(validateQuantityRule({ quantity: 10, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 4 }).reason ?? '', /Stock insuficiente/);
  assert.equal(validateQuantityRule({ quantity: 10, minimumOrderQuantity: 5, saleMultiple: 5, availableStock: 20 }).valid, true);
}

function testReservationMath() {
  const physicalStock = 20;
  const reservedStock = 5;
  const quantity = 5;
  assert.equal(physicalStock - reservedStock, 15);
  assert.equal(physicalStock - (reservedStock + quantity), 10);
  assert.equal(physicalStock - (reservedStock + quantity - quantity), 15);
}

function testCrossPromotion() {
  const lines: PromotionLine[] = [
    { productId: 'food', variantId: 'food-15', brandId: 'gran-plus', laboratoryId: null, categoryIds: ['alimentos'], quantity: 10, unitPrice: 100 },
    { productId: 'bio', variantId: 'bio-2', brandId: 'biofresh', laboratoryId: null, categoryIds: ['alimentos'], quantity: 2, unitPrice: 200 },
  ];
  const promotions: PromotionSnapshot[] = [
    {
      id: 'promo-cross',
      name: 'Cruce Gran Plus Biofresh',
      type: PromotionType.CROSS_DISCOUNT,
      priority: 10,
      combinable: false,
      conditions: [{ targetType: PromotionTargetType.BRAND, targetId: 'gran-plus', metric: PromotionMetric.MIN_QUANTITY, minQuantity: 10 }],
      rewards: [{ targetType: PromotionTargetType.BRAND, targetId: 'biofresh', rewardType: PromotionRewardType.PERCENTAGE, percentage: 15 }],
    },
  ];
  const discounts = calculatePromotionDiscounts(lines, promotions);
  assert.equal(discounts.length, 1);
  assert.equal(discounts[0].amount, 60);
}

function testCreditReview() {
  assert.equal(requiresManualReview(CreditStatus.GOOD_STANDING), false);
  assert.equal(requiresManualReview(CreditStatus.PAYMENT_PENDING), true);
  assert.equal(submittedStatusForCredit(CreditStatus.PAYMENT_PENDING), 'PENDING_REVIEW');
  assert.equal(submittedStatusForCredit(CreditStatus.GOOD_STANDING), 'SUBMITTED');
}

testPriceVisibility();
testQuantityRules();
testReservationMath();
testCrossPromotion();
testCreditReview();

console.log('Business rule tests passed');
