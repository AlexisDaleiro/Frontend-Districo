import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BrandsRepository } from '../../src/catalog/brands/brands.repository';
import { BrandsService } from '../../src/catalog/brands/brands.service';
import { LaboratoriesRepository } from '../../src/catalog/laboratories/laboratories.repository';
import { LaboratoriesService } from '../../src/catalog/laboratories/laboratories.service';
import { PrismaService } from '../../src/prisma/prisma.service';

test('brand deletion is a guarded soft delete', async () => {
  let where: unknown;
  const prisma = {
    brand: {
      findUnique: async () => ({ id: 'brand-1', deletedAt: null }),
      updateMany: async (args: { where: unknown; data: { active: boolean; deletedAt: Date; slug: string } }) => {
        where = args.where;
        assert.equal(args.data.active, false);
        assert.ok(args.data.deletedAt instanceof Date);
        assert.equal(args.data.slug, 'deleted-brand-1');
        return { count: 1 };
      },
    },
    promotionCondition: { count: async () => 0 },
    promotionReward: { count: async () => 0 },
    recommendationRule: { count: async () => 0 },
  } as unknown as PrismaService;
  const service = new BrandsService(new BrandsRepository(prisma));
  assert.deepEqual(await service.remove('brand-1'), { deleted: true });
  assert.deepEqual(where, { id: 'brand-1', deletedAt: null, products: { none: {} } });
});

test('brands with products cannot be deleted and missing brands return 404', async () => {
  let exists = true;
  const prisma = {
    brand: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => exists ? { id: 'brand-1', deletedAt: null } : null,
    },
    promotionCondition: { count: async () => 0 },
    promotionReward: { count: async () => 0 },
    recommendationRule: { count: async () => 0 },
  } as unknown as PrismaService;
  const service = new BrandsService(new BrandsRepository(prisma));
  await assert.rejects(service.remove('brand-1'), ConflictException);
  exists = false;
  await assert.rejects(service.remove('brand-1'), NotFoundException);
});

test('laboratory deletion has the same association guard', async () => {
  let linked = true;
  const prisma = {
    laboratory: {
      updateMany: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { id: 'lab-1', deletedAt: null, products: { none: {} } });
        return { count: linked ? 0 : 1 };
      },
      findUnique: async () => ({ id: 'lab-1', deletedAt: null }),
    },
    promotionCondition: { count: async () => 0 },
    promotionReward: { count: async () => 0 },
    recommendationRule: { count: async () => 0 },
  } as unknown as PrismaService;
  const service = new LaboratoriesService(new LaboratoriesRepository(prisma));
  await assert.rejects(service.remove('lab-1'), ConflictException);
  linked = false;
  assert.deepEqual(await service.remove('lab-1'), { deleted: true });
});

test('active marketing rules prevent deletion even without products', async () => {
  let called = false;
  const prisma = {
    brand: {
      findUnique: async () => ({ id: 'brand-1', deletedAt: null }),
      updateMany: async () => { called = true; return { count: 1 }; },
    },
    promotionCondition: { count: async ({ where }: { where: { targetId: string } }) => {
      assert.equal(where.targetId, 'brand-1');
      return 1;
    } },
    promotionReward: { count: async () => 0 },
    recommendationRule: { count: async () => 0 },
  } as unknown as PrismaService;
  await assert.rejects(new BrandsService(new BrandsRepository(prisma)).remove('brand-1'), ConflictException);
  assert.equal(called, false);
});
