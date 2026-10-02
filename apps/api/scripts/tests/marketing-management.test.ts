import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { PromotionsService } from '../../src/promotions/promotions.service';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';
import { CreatePromotionDto } from '../../src/promotions/dto/create-promotion.dto';
import { CreateRecommendationRuleDto } from '../../src/recommendations/dto/create-recommendation-rule.dto';

test('editing a promotion replaces its conditions and rewards atomically', async () => {
  const calls: string[] = [];
  const tx = {
    promotionCondition: { deleteMany: async () => { calls.push('conditions'); } },
    promotionReward: { deleteMany: async () => { calls.push('rewards'); } },
    promotion: { update: async ({ data }: { data: Record<string, unknown> }) => {
      calls.push('update');
      assert.equal(data.name, 'Nueva regla');
      assert.equal((data.conditions as { create: unknown[] }).create.length, 2);
      return { id: 'promo-1', name: 'Nueva regla' };
    } },
  };
  const prisma = {
    promotion: { findFirst: async () => ({ id: 'promo-1' }) },
    $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const audit = { log: async () => { calls.push('audit'); } } as unknown as AuditService;
  await new PromotionsService(prisma, audit).update('promo-1', {
    name: 'Nueva regla', type: 'PERCENTAGE', startsAt: '2026-10-01T00:00:00.000Z',
    conditions: [
      { targetType: 'PRODUCT', targetId: 'p1', minQuantity: 2 },
      { targetType: 'BRAND', targetId: 'b1', minQuantity: 1 },
    ],
    rewards: [{ targetType: 'PRODUCT', targetId: 'p1', rewardType: 'PERCENTAGE', percentage: 10 }],
  } as CreatePromotionDto, 'admin-1');
  assert.deepEqual(calls, ['conditions', 'rewards', 'update', 'audit']);
});

test('recommendation activation is explicit and audited', async () => {
  const events: unknown[] = [];
  const prisma = {
    recommendationRule: {
      findUnique: async () => ({ id: 'rule-1', active: true }),
      update: async ({ data }: { data: { active: boolean } }) => { events.push(data.active); return { id: 'rule-1', ...data }; },
    },
  } as unknown as PrismaService;
  const audit = { log: async (...args: unknown[]) => { events.push(args[0]); } } as unknown as AuditService;
  const updated = await new RecommendationsService(prisma, audit).setActive('rule-1', false, 'admin-1');
  assert.equal(updated.active, false);
  assert.deepEqual(events, [false, 'RECOMMENDATION_RULE_UPDATED']);
});

test('editing a recommendation keeps all selected products', async () => {
  const tx = {
    recommendationRuleProduct: { deleteMany: async () => undefined },
    recommendationRule: { update: async ({ data }: { data: Record<string, unknown> }) => {
      assert.equal((data.products as { create: unknown[] }).create.length, 2);
      return { id: 'rule-1', products: (data.products as { create: unknown[] }).create };
    } },
  };
  const prisma = {
    recommendationRule: { findUnique: async () => ({ id: 'rule-1', active: true }) },
    $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const audit = { log: async () => undefined } as unknown as AuditService;
  const updated = await new RecommendationsService(prisma, audit).update('rule-1', {
    name: 'También llevar', triggerType: 'PRODUCT', triggerId: 'p1',
    products: [{ productId: 'p2' }, { productId: 'p3' }],
  } as CreateRecommendationRuleDto, 'admin-1');
  assert.equal(updated.products.length, 2);
});
