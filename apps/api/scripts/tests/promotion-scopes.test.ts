import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PromotionMetric, PromotionRewardType, PromotionTargetType, PromotionType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { calculatePromotionDiscounts, promotionApplies, PromotionLine, PromotionSnapshot } from '../../src/common/business/promotion-rules';
import { PromotionsService } from '../../src/promotions/promotions.service';
import { CreatePromotionDto } from '../../src/promotions/dto/create-promotion.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { CategoryHierarchyService } from '../../src/catalog/categories/category-hierarchy.service';

const lines: PromotionLine[] = [
  { productId: 'p1', variantId: 'v1', brandId: 'b1', categoryIds: ['child'], quantity: 2, unitPrice: 100 },
  { productId: 'p2', variantId: 'v2', brandId: 'b2', categoryIds: ['other'], quantity: 1, unitPrice: 100 },
];
const base: PromotionSnapshot = {
  id: 'promotion', name: 'Alternativas', type: PromotionType.CROSS_DISCOUNT, priority: 0, combinable: false,
  conditions: [{ targetType: PromotionTargetType.PRODUCT, targetIds: ['p1', 'absent'], metric: PromotionMetric.MIN_QUANTITY, minQuantity: 2 }],
  rewards: [{ targetType: PromotionTargetType.BRAND, targetId: 'b2', rewardType: PromotionRewardType.PERCENTAGE, percentage: 10 }],
};

test('activation alternatives aggregate quantities, do not require every selection and recalculate on removal', () => {
  assert.deepEqual(calculatePromotionDiscounts(lines, [base]).map((item) => [item.lineIndex, item.amount]), [[1, 10]]);
  assert.equal(calculatePromotionDiscounts([lines[1]], [base]).length, 0);
  assert.equal(promotionApplies([{ ...lines[0], quantity: 1 }], base), false);
  assert.equal(promotionApplies([lines[1]], { ...base, conditions: [{ ...base.conditions[0], minQuantity: undefined }] }), false);
  assert.equal(promotionApplies(lines, { ...base, conditions: [{ ...base.conditions[0], minQuantity: undefined }] }), true);
  const amountRule = { ...base, conditions: [{ ...base.conditions[0], metric: PromotionMetric.MIN_AMOUNT, minAmount: 250, targetIds: ['p1', 'p2'] }] };
  assert.equal(promotionApplies(lines, amountRule), true);
  assert.equal(promotionApplies([lines[0]], amountRule), false);
});

test('all product/brand/category activation and reward combinations work independently', () => {
  for (const trigger of [PromotionTargetType.PRODUCT, PromotionTargetType.BRAND, PromotionTargetType.CATEGORY]) {
    for (const target of [PromotionTargetType.PRODUCT, PromotionTargetType.BRAND, PromotionTargetType.CATEGORY]) {
      const triggerId = trigger === 'PRODUCT' ? 'p1' : trigger === 'BRAND' ? 'b1' : 'child';
      const targetId = target === 'PRODUCT' ? 'p2' : target === 'BRAND' ? 'b2' : 'other';
      const promotion = { ...base, conditions: [{ ...base.conditions[0], targetType: trigger, targetIds: [triggerId, 'absent'] }], rewards: [{ ...base.rewards[0], targetType: target, targetId }] };
      assert.deepEqual(calculatePromotionDiscounts(lines, [promotion]).map((item) => [item.lineIndex, item.amount]), [[1, 10]]);
    }
  }
});

test('legacy conditions retain AND semantics and overlapping rewards are not doubled', () => {
  assert.equal(promotionApplies(lines, { ...base, conditions: [
    { targetType: PromotionTargetType.PRODUCT, targetId: 'p1', metric: PromotionMetric.MIN_QUANTITY, minQuantity: 1 },
    { targetType: PromotionTargetType.PRODUCT, targetId: 'missing', metric: PromotionMetric.MIN_QUANTITY, minQuantity: 1 },
  ] }), false);
  assert.equal(promotionApplies(lines, { ...base, conditions: [{ targetType: PromotionTargetType.PRODUCT, metric: PromotionMetric.MIN_QUANTITY, minQuantity: 3 }] }), true);
  assert.equal(calculatePromotionDiscounts(lines, [{ ...base, rewards: [base.rewards[0], base.rewards[0]] }]).length, 1);
});

test('parent categories include descendants on activation and rewards without counting one line twice', async () => {
  const prisma = { promotion: { findMany: async () => [{ ...base, conditions: [{ ...base.conditions[0], targetType: 'CATEGORY', targetIds: ['parent', 'child'], minQuantity: 3 }], rewards: [{ ...base.rewards[0], targetType: 'CATEGORY', targetId: 'reward-parent' }] }] } } as unknown as PrismaService;
  const hierarchy = { descendantIds: async (ids: string[]) => ids[0] === 'parent' ? ['parent', 'child'] : ids[0] === 'reward-parent' ? ['reward-parent', 'other'] : ids } as CategoryHierarchyService;
  const service = new PromotionsService(prisma, {} as AuditService, hierarchy);
  assert.equal((await service.calculateDiscounts(lines)).length, 0);
  assert.deepEqual((await service.calculateDiscounts([{ ...lines[0], quantity: 3 }, lines[1]])).map((item) => [item.lineIndex, item.amount]), [[1, 10]]);
});

const dto: CreatePromotionDto = {
  name: 'Alternativas', type: PromotionType.CROSS_DISCOUNT, startsAt: '2026-10-01T00:00:00.000Z',
  conditions: [{ targetType: PromotionTargetType.BRAND, targetIds: ['b1', 'b2'], minQuantity: 1 }],
  rewards: [{ targetType: PromotionTargetType.PRODUCT, targetId: 'p1', rewardType: PromotionRewardType.PERCENTAGE, percentage: 10 }],
};

test('create persists one alternative group, validates entities and audits', async () => {
  const calls: string[] = [];
  const entities = { findMany: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.filter((id) => id !== 'missing').map((id) => ({ id, name: id })) };
  const prisma = { product: entities, brand: entities, promotion: { create: async ({ data }: { data: { conditions: { create: { targetIds: string[] }[] } } }) => {
    assert.deepEqual(data.conditions.create[0].targetIds, ['b1', 'b2']); calls.push('create'); return { id: 'new', name: dto.name };
  } } } as unknown as PrismaService;
  const audit = { log: async () => { calls.push('audit'); } } as unknown as AuditService;
  const service = new PromotionsService(prisma, audit, {} as CategoryHierarchyService);
  await service.create(dto, 'admin');
  assert.deepEqual(calls, ['create', 'audit']);
  await assert.rejects(service.create({ ...dto, conditions: [{ ...dto.conditions[0], targetIds: ['missing'] }] }), /ya no existen/);
  await assert.rejects(service.create({ ...dto, conditions: [{ ...dto.conditions[0], targetIds: [] }] }), /cien/);
  await assert.rejects(service.create({ ...dto, conditions: [{ ...dto.conditions[0], targetId: 'b1' }] }), /No mezcles/);
  await assert.rejects(service.create({ ...dto, conditions: [{ ...dto.conditions[0], metric: PromotionMetric.MIN_AMOUNT, minAmount: 0 }] }), /mayor a cero/);
});

test('DTO rejects duplicate, empty, oversized groups and excessive discount', async () => {
  assert.equal((await validate(plainToInstance(CreatePromotionDto, dto))).length, 0);
  for (const targetIds of [[], ['b1', 'b1'], Array.from({ length: 101 }, (_, i) => `b${i}`)])
    assert.ok((await validate(plainToInstance(CreatePromotionDto, { ...dto, conditions: [{ ...dto.conditions[0], targetIds }] }))).length > 0);
  assert.ok((await validate(plainToInstance(CreatePromotionDto, { ...dto, rewards: [{ ...dto.rewards[0], percentage: 101 }] }))).length > 0);
});
