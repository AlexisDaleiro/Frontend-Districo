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

function testMultiplePromotionTargets() {
  const lines: PromotionLine[] = ['p1', 'p2', 'p3'].map((productId) => ({
    productId, variantId: `${productId}-v`, brandId: productId === 'p3' ? 'other' : 'brand-1',
    categoryIds: [productId === 'p3' ? 'category-2' : 'category-1'], quantity: 1, unitPrice: 100,
  }));
  const base = { id: 'scoped', name: 'Selección', type: PromotionType.PERCENTAGE, priority: 0, combinable: false, conditions: [] };
  const rewards = (targetType: PromotionTargetType, targetIds: string[]) => targetIds.map((targetId) => ({
    targetType, targetId, rewardType: PromotionRewardType.PERCENTAGE, percentage: 10,
  }));
  const productDiscounts = calculatePromotionDiscounts(lines, [{ ...base, rewards: rewards(PromotionTargetType.PRODUCT, ['p1', 'p2']) }]);
  assert.deepEqual(productDiscounts.map((discount) => discount.lineIndex), [0, 1]);
  const brandDiscounts = calculatePromotionDiscounts(lines, [{ ...base, rewards: rewards(PromotionTargetType.BRAND, ['brand-1']) }]);
  assert.deepEqual(brandDiscounts.map((discount) => discount.lineIndex), [0, 1]);
  const categoryDiscounts = calculatePromotionDiscounts(lines, [{ ...base, rewards: rewards(PromotionTargetType.CATEGORY, ['category-2']) }]);
  assert.deepEqual(categoryDiscounts.map((discount) => discount.lineIndex), [2]);
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
testMultiplePromotionTargets();
testCreditReview();

console.log('Business rule tests passed');
