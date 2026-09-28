import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { ProductsRepository } from '../../src/catalog/products/products.repository';
import { PrismaService } from '../../src/prisma/prisma.service';

test('catalog reads products and count in parallel with joined relations', async () => {
  let resolveItems!: (items: never[]) => void;
  let countStarted = false;
  let listArgs: Prisma.ProductFindManyArgs | undefined;
  const prisma = {
    product: {
      findMany: (args: Prisma.ProductFindManyArgs) => {
        listArgs = args;
        return new Promise<never[]>((resolve) => { resolveItems = resolve; });
      },
      count: async () => {
        countStarted = true;
        return 42;
      },
    },
  } as unknown as PrismaService;
  const repository = new ProductsRepository(prisma);

  const pending = repository.findMany({ page: 2, limit: 12 });
  assert.equal(countStarted, true);
  assert.equal(listArgs?.relationLoadStrategy, 'join');
  assert.equal(listArgs?.skip, 12);
  assert.equal(listArgs?.take, 12);

  resolveItems([]);
  const result = await pending;
  assert.deepEqual(result.meta, { total: 42, page: 2, limit: 12 });
});

test('product detail loads relations in one joined query', async () => {
  let detailArgs: Prisma.ProductFindFirstArgs | undefined;
  const prisma = {
    product: {
      findFirst: async (args: Prisma.ProductFindFirstArgs) => {
        detailArgs = args;
        return null;
      },
    },
  } as unknown as PrismaService;
  const repository = new ProductsRepository(prisma);

  await repository.findBySlug('districo-web-1459');
  assert.equal(detailArgs?.relationLoadStrategy, 'join');
  assert.deepEqual(detailArgs?.where, {
    slug: 'districo-web-1459',
    deletedAt: null,
    active: true,
  });
});
