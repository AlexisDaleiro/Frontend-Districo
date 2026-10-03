import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Permission, Prisma, Role } from '@prisma/client';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../src/common/guards/optional-jwt-auth.guard';
import { ProductsRepository } from '../../src/catalog/products/products.repository';
import { ProductsService } from '../../src/catalog/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CategoryHierarchyService } from '../../src/catalog/categories/category-hierarchy.service';
import { CategoriesService } from '../../src/catalog/categories/categories.service';
import { CategoriesRepository } from '../../src/catalog/categories/categories.repository';
import { groupEquivalentCategories } from '../../src/catalog/categories/category-groups';

const hierarchy = { descendantIds: async (ids: string[]) => ids } as CategoryHierarchyService;

test('optional catalog auth stays public without a token but rejects expired tokens', () => {
  const guard = new OptionalJwtAuthGuard();
  const context = (authorization?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  }) as unknown as ExecutionContext;
  const user = { sub: 'client-1' };

  assert.equal(guard.handleRequest(null, false, null, context()), null);
  assert.equal(guard.handleRequest(null, user, null, context('Bearer valid')), user);
  assert.throws(
    () => guard.handleRequest(null, false, null, context('Bearer expired')),
    UnauthorizedException,
  );
  assert.throws(
    () => guard.handleRequest(new Error('Invalid token'), false, null, context('Bearer invalid')),
    UnauthorizedException,
  );
});

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
  const repository = new ProductsRepository(prisma, hierarchy);

  const pending = repository.findMany({ page: 2, limit: 12 });
  await new Promise((resolve) => setImmediate(resolve));
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
  const repository = new ProductsRepository(prisma, hierarchy);

  await repository.findBySlug('districo-web-1459');
  assert.equal(detailArgs?.relationLoadStrategy, 'join');
  assert.deepEqual(detailArgs?.where, {
    slug: 'districo-web-1459',
    deletedAt: null,
    active: true,
  });
});

test('card listing selects only the fields used by product cards', async () => {
  let listArgs: Prisma.ProductFindManyArgs | undefined;
  const prisma = {
    product: {
      findMany: async (args: Prisma.ProductFindManyArgs) => {
        listArgs = args;
        return [];
      },
      count: async () => 0,
    },
  } as unknown as PrismaService;
  const repository = new ProductsRepository(prisma, hierarchy);

  await repository.findCards({ page: 1, limit: 12 });
  assert.equal(listArgs?.relationLoadStrategy, 'join');
  assert.equal(listArgs?.take, 12);
  assert.ok(listArgs?.select);
  assert.equal('description' in listArgs.select!, false);
  assert.equal('attributes' in listArgs.select!, false);
  assert.equal('categories' in listArgs.select!, false);
});

test('card prices keep the same account and medication restrictions as detail', async () => {
  const repository = {
    findCards: async () => ({
      items: [{
        id: 'p1', slug: 'professional', name: 'Professional', featured: false,
        requiresMedicationPermission: true, brand: null, laboratory: null, media: [],
        variants: [{
          id: 'v1', active: true,
          prices: [{ amount: new Prisma.Decimal('100'), currency: 'UYU', priceList: { name: 'General' } }],
        }],
      }],
      meta: { total: 1, page: 1, limit: 12 },
    }),
  } as unknown as ProductsRepository;
  const service = new ProductsService(repository, {} as ConstructorParameters<typeof ProductsService>[1]);
  const filters = { page: 1, limit: 12 };

  const anonymous = await service.findCards(filters);
  assert.equal(anonymous.items[0].variants[0].price, undefined);

  const pricesOnly = await service.findCards(filters, {
    sub: 'client', email: 'client@example.test', role: Role.CLIENT,
    permissions: [Permission.CAN_VIEW_PRICES],
  });
  assert.equal(pricesOnly.items[0].variants[0].price, undefined);

  const professional = await service.findCards(filters, {
    sub: 'professional', email: 'professional@example.test', role: Role.CLIENT,
    permissions: [Permission.CAN_VIEW_PRICES, Permission.CAN_BUY_MEDICATIONS],
  });
  assert.deepEqual(professional.items[0].variants[0].price, { amount: 100, currency: 'UYU' });
});

test('category hierarchy reuses a public read and reloads after invalidation', async () => {
  let reads = 0;
  const prisma = {
    category: {
      findMany: async () => {
        reads += 1;
        return [
          { id: 'root', name: 'Root', parentId: null },
          { id: 'child', name: 'Child', parentId: 'root' },
          { id: 'grandchild', name: 'Grandchild', parentId: 'child' },
        ];
      },
    },
  } as unknown as PrismaService;
  const cache = new CategoryHierarchyService(prisma);
  const oldVersion = cache.version;
  cache.remember([
    { id: 'root', name: 'Root', parentId: null },
    { id: 'child', name: 'Child', parentId: 'root' },
  ], oldVersion);
  assert.deepEqual(await cache.descendantIds(['root']), ['root', 'child']);
  assert.equal(reads, 0);

  cache.invalidate();
  cache.remember([{ id: 'stale', name: 'Stale', parentId: null }], oldVersion);
  assert.deepEqual(await cache.descendantIds(['root']), ['root', 'child', 'grandchild']);
  assert.equal(reads, 1);
  await cache.descendantIds(['root']);
  assert.equal(reads, 1);
});

test('catalog groups equivalent names without mixing different parent paths', async () => {
  const categories = [
    { id: 'pet-r', name: 'Animales de compañía', slug: 'raicor-pet', parentId: null },
    { id: 'pet-m', name: 'Animales de compania', slug: 'magnis-pet', parentId: null },
    { id: 'bio-r', name: 'Biológicos', slug: 'raicor-bio', parentId: 'pet-r' },
    { id: 'bio-m', name: 'BIOLOGICOS', slug: 'magnis-bio', parentId: 'pet-m' },
    { id: 'cattle', name: 'Ganadería', slug: 'raicor-cattle', parentId: null },
    { id: 'bio-c', name: 'Biológicos', slug: 'raicor-cattle-bio', parentId: 'cattle' },
  ];
  assert.equal(groupEquivalentCategories(categories).size, 4);
  const prisma = { category: { findMany: async () => categories } } as unknown as PrismaService;
  const cache = new CategoryHierarchyService(prisma);
  const repository = { findAll: async () => categories } as unknown as CategoriesRepository;
  const service = new CategoriesService(repository, cache);
  const tree = await service.findCatalogTree();
  assert.equal(tree.length, 2);
  const pets = tree.find((category) => category.name.startsWith('Animales'))!;
  const cattle = tree.find((category) => category.name === 'Ganadería')!;
  assert.equal(pets.children.length, 1);
  assert.equal(cattle.children.length, 1);
  assert.equal(pets.children[0].parentId, pets.id);
  assert.deepEqual(new Set(pets.aliasIds), new Set(['pet-r', 'pet-m']));
  assert.deepEqual(new Set(await cache.descendantIds(['pet-r'])),
    new Set(['pet-r', 'pet-m', 'bio-r', 'bio-m']));
  assert.deepEqual(new Set(await cache.descendantIds(['bio-m'])),
    new Set(['bio-r', 'bio-m']));
});

test('old merged category IDs still resolve after the visible category is renamed', async () => {
  const prisma = { category: { findMany: async () => [
    { id: 'current', name: 'Nueva etiqueta', parentId: null, mergedIntoId: null },
    { id: 'old', name: 'Etiqueta anterior', parentId: null, mergedIntoId: 'current' },
  ] } } as unknown as PrismaService;
  const hierarchy = new CategoryHierarchyService(prisma);
  assert.deepEqual(new Set(await hierarchy.descendantIds(['old'])), new Set(['old', 'current']));
});

test('inactive category branches stay in admin but disappear from the public tree', async () => {
  const categories = [
    { id: 'root', name: 'Root', slug: 'root', parentId: null, active: false, deletedAt: null },
    { id: 'child', name: 'Child', slug: 'child', parentId: 'root', active: true, deletedAt: null },
    { id: 'other', name: 'Other', slug: 'other', parentId: null, active: true, deletedAt: null },
  ];
  const repository = { findAll: async () => categories } as unknown as CategoriesRepository;
  const service = new CategoriesService(repository, new CategoryHierarchyService({} as PrismaService));
  assert.deepEqual((await service.findAdmin()).map((item) => item.id), ['root', 'child', 'other']);
  assert.deepEqual((await service.findCatalogTree()).map((item) => item.id), ['other']);
});

test('category editor rejects duplicate siblings and names reserved for brands', async () => {
  const repository = {
    findAll: async () => [{ id: 'existing', name: 'Biológicos', parentId: null, deletedAt: null }],
    organizationNames: async () => ['Zoetis'],
  } as unknown as CategoriesRepository;
  const service = new CategoriesService(repository, new CategoryHierarchyService({} as PrismaService));
  await assert.rejects(service.create({ name: 'BIOLOGICOS' }), /Ya existe/);
  await assert.rejects(service.create({ name: 'Zoetis' }), /marca o laboratorio/);
});

test('category product lists use exact membership and retain independent categories', async () => {
  const queries: unknown[] = [];
  const prisma = { product: {
    findMany: async (args: { where: unknown }) => { queries.push(args.where); return [{ id: 'product-1' }]; },
    count: async (args: { where: unknown }) => { queries.push(args.where); return 1; },
  } } as unknown as PrismaService;
  const repository = new CategoriesRepository(prisma);
  assert.deepEqual((await repository.products('category-1', 'DOG', true, 2, 10)).meta,
    { total: 1, page: 2, limit: 10 });
  await repository.products('category-1', undefined, false, 1, 20);
  assert.deepEqual(queries[0], {
    deletedAt: null,
    categories: { some: { categoryId: 'category-1' } },
    OR: [
      { name: { contains: 'DOG', mode: 'insensitive' } },
      { variants: { some: { sku: { contains: 'DOG', mode: 'insensitive' } } } },
    ],
  });
  assert.deepEqual(queries[2], {
    deletedAt: null,
    categories: { none: { categoryId: 'category-1' } },
    OR: undefined,
  });
});

test('category editor links and unlinks only the selected product relation', async () => {
  const links: string[] = [];
  const repository = {
    findById: async (id: string) => id === 'category-1' ? { id, deletedAt: null } : null,
    productExists: async (id: string) => id === 'product-1' ? { id } : null,
    linkProduct: async (categoryId: string, productId: string) => { links.push(`add:${categoryId}:${productId}`); },
    unlinkProduct: async (categoryId: string, productId: string) => { links.push(`remove:${categoryId}:${productId}`); },
  } as unknown as CategoriesRepository;
  const service = new CategoriesService(repository, new CategoryHierarchyService({} as PrismaService));
  await service.linkProduct('category-1', 'product-1');
  await service.unlinkProduct('category-1', 'product-1');
  assert.deepEqual(links, ['add:category-1:product-1', 'remove:category-1:product-1']);
  await assert.rejects(service.linkProduct('category-1', 'missing'), /Producto no encontrado/);
  await assert.rejects(service.linkProduct('missing', 'product-1'), /Categoria no encontrada/);
});
