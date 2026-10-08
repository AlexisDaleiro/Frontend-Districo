import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Permission, RecommendationTriggerType, Role } from '@prisma/client';
import { recommendationScope } from '../../src/recommendations/recommendation-scope';
import { CreateRecommendationRuleDto } from '../../src/recommendations/dto/create-recommendation-rule.dto';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { CategoryHierarchyService } from '../../src/catalog/categories/category-hierarchy.service';
import { JwtUser } from '../../src/common/types/jwt-user.type';

const dto = (values: Partial<CreateRecommendationRuleDto> = {}): CreateRecommendationRuleDto => ({ name: 'Regla de prueba', triggerType: 'PRODUCT', triggerIds: ['p1', 'p-other'], targetType: 'PRODUCT', targetIds: ['p2', 'p3'], ...values } as CreateRecommendationRuleDto);
test('normalizes both multiple scopes and preserves legacy presentation references', () => {
  assert.deepEqual(recommendationScope(dto()).products.map((item) => item.productId), ['p2', 'p3']);
  const legacy = recommendationScope(dto({ triggerIds: undefined, triggerId: 'variant-p1', targetIds: undefined, products: [{ productId: 'p2', variantId: 'v2', position: 7 }] }));
  assert.deepEqual(legacy.triggerIds, ['variant-p1']);
  assert.deepEqual(legacy.targetIds, ['p2']);
  assert.equal(legacy.products[0].variantId, 'v2');
  assert.equal(legacy.products[0].position, 7);
  assert.equal(recommendationScope(dto({ targetType: 'BRAND', targetIds: ['b1'] })).products.length, 0);
});
test('rejects empty, duplicate, oversized and mixed selections and inverted dates', () => {
  for (const change of [{ triggerIds: [] }, { targetIds: [] }, { triggerIds: ['p1', 'p1'] }, { targetIds: ['p2', 'p2'] }, { targetIds: Array.from({ length: 101 }, (_, i) => `p${i}`) }, { targetType: 'CATEGORY', products: [{ productId: 'p2' }] }, { products: [{ productId: 'not-selected' }] }, { startsAt: '2026-10-03', endsAt: '2026-10-01' }]) assert.throws(() => recommendationScope(dto(change as Partial<CreateRecommendationRuleDto>)));
});
test('DTO whitelist retains scopes and validates nested references', async () => {
  const valid = plainToInstance(CreateRecommendationRuleDto, dto({ products: [{ productId: 'p2' }, { productId: 'p3', variantId: 'v3' }] }));
  assert.equal((await validate(valid, { whitelist: true, forbidNonWhitelisted: true })).length, 0);
  assert.deepEqual(valid.triggerIds, ['p1', 'p-other']);
  assert.ok((await validate(plainToInstance(CreateRecommendationRuleDto, dto({ priority: -1 })))).length);
  assert.ok((await validate(plainToInstance(CreateRecommendationRuleDto, dto({ products: [{ productId: '' }] })))).length);
});

function runtime(ruleOverrides: Record<string, unknown> = {}, quantities = [2]) {
  const whereQueries: Record<string, unknown>[] = [], hierarchyCalls: string[][] = [];
  const rule = { id: 'r1', name: 'Relacionados', active: true, priority: 0, triggerType: 'PRODUCT', triggerId: 'p1', triggerIds: ['p-other', 'p1'], targetType: 'PRODUCT', targetIds: ['p2'], minimumQuantity: 2, minimumCartAmount: null, products: [{ productId: 'p2', variantId: null, position: 0 }], ...ruleOverrides };
  const variant = (id: string, stock = 10, reserved = 0) => ({ id, physicalStock: stock, reservedStock: reserved, active: true });
  const product = (id: string, restricted = false, stock = 10) => ({ id, name: id, active: true, requiresMedicationPermission: restricted, brandId: 'b2', laboratoryId: 'l2', categories: [{ categoryId: 'target-child' }], variants: [variant(`v-${id}`, stock)] });
  const prisma = {
    cart: { findUnique: async () => ({ items: quantities.map((quantity, index) => ({ quantity, productVariant: { id: `v1-${index}`, productId: 'p1', prices: [{ amount: 10 }], product: { id: 'p1', brandId: 'b1', laboratoryId: 'l1', categories: [{ categoryId: 'trigger-child' }] } } })) }) },
    recommendationRule: { findMany: async () => [rule] },
    productVariant: { fields: { reservedStock: 'RESERVED_FIELD' } },
    product: { findMany: async ({ where }: { where: Record<string, unknown> }) => { whereQueries.push(where); return [product('p2'), product('med', true), product('no-stock', false, 0)]; } },
  } as unknown as PrismaService;
  const hierarchy = { descendantIds: async (ids: string[]) => { hierarchyCalls.push(ids); return [...ids, ids.includes('trigger-root') ? 'trigger-child' : 'target-child']; } } as unknown as CategoryHierarchyService;
  const service = new RecommendationsService(prisma, {} as AuditService, hierarchy);
  const user = { sub: 'u1', role: Role.CLIENT, permissions: [] } as unknown as JwtUser;
  return { service, user, whereQueries, hierarchyCalls };
}
for (const triggerType of Object.values(RecommendationTriggerType)) for (const targetType of Object.values(RecommendationTriggerType)) {
  test(`cart resolves ${triggerType} triggers to ${targetType} targets`, async () => {
    const ids = { PRODUCT: 'p1', BRAND: 'b1', CATEGORY: 'trigger-root', LABORATORY: 'l1' };
    const targetIds = { PRODUCT: 'p2', BRAND: 'b2', CATEGORY: 'target-root', LABORATORY: 'l2' };
    const fixture = runtime({ triggerType, triggerIds: ['other', ids[triggerType]], targetType, targetIds: [targetIds[targetType]] });
    const results = await fixture.service.recommendationsForUserCart(fixture.user);
    assert.deepEqual(results.map((item) => item.product.id), ['p2']);
    assert.equal(fixture.whereQueries.length, 1);
    assert.equal(fixture.whereQueries[0].requiresMedicationPermission, false);
    assert.deepEqual(fixture.whereQueries[0].AND, [{ id: { notIn: ['p1'] } }]);
    assert.deepEqual(fixture.whereQueries[0].variants, { some: { active: true, deletedAt: null, physicalStock: { gt: 'RESERVED_FIELD' } } });
    if (triggerType === 'CATEGORY') assert.ok(fixture.hierarchyCalls.some((ids) => ids.includes('trigger-root')));
    if (targetType === 'CATEGORY') assert.ok(fixture.hierarchyCalls.some((ids) => ids.includes('target-root')));
    if (targetType === 'BRAND') assert.deepEqual(fixture.whereQueries[0].brandId, { in: ['b2'] });
  });
}
test('minimums aggregate matching lines once and respect minimum cart amount', async () => {
  const fixture = runtime({ minimumQuantity: 3 }, [1, 2]);
  assert.equal((await fixture.service.recommendationsForUserCart(fixture.user)).length, 1);
  const insufficient = runtime({ minimumQuantity: 4 }, [1, 2]);
  assert.equal((await insufficient.service.recommendationsForUserCart(insufficient.user)).length, 0);
  const amount = runtime({ minimumCartAmount: 21 });
  assert.equal((await amount.service.recommendationsForUserCart(amount.user)).length, 0);
});
test('specific variant targets and medication restrictions remain enforced', async () => {
  const fixture = runtime({ products: [{ productId: 'p2', variantId: 'non-available' }] });
  assert.equal((await fixture.service.recommendationsForUserCart(fixture.user)).length, 0);
  const allowed = runtime();
  allowed.user.permissions = [Permission.CAN_BUY_MEDICATIONS];
  assert.equal((await allowed.service.recommendationsForUserCart(allowed.user)).length, 2);
});
test('create validates both scopes and writes canonical selections and references', async () => {
  let data: Record<string, unknown> = {};
  const lookup = { findMany: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.map((id) => ({ id, name: id })) };
  const prisma = { brand: lookup, category: lookup, recommendationRule: { create: async (args: { data: Record<string, unknown> }) => { data = args.data; return { id: 'r1', ...data }; } } } as unknown as PrismaService;
  const service = new RecommendationsService(prisma, { log: async () => undefined } as unknown as AuditService, {} as CategoryHierarchyService);
  await service.create(dto({ triggerType: 'BRAND', triggerIds: ['b1', 'b2'], targetType: 'CATEGORY', targetIds: ['c1', 'c2'] }));
  assert.deepEqual(data.triggerIds, ['b1', 'b2']);
  assert.deepEqual(data.targetIds, ['c1', 'c2']);
  assert.deepEqual(data.products, { create: [] });
});
test('unknown targets are rejected before any write', async () => {
  const prisma = { product: { findMany: async () => [] }, productVariant: { findMany: async () => [] } } as unknown as PrismaService;
  const service = new RecommendationsService(prisma, {} as AuditService, {} as CategoryHierarchyService);
  await assert.rejects(service.create(dto()), /no existe/);
});
