import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CatalogImagesService } from '../../src/catalog/images/catalog-images.service';
import { BannerStorageService } from '../../src/banners/banner-storage.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProductsRepository } from '../../src/catalog/products/products.repository';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const file = { buffer: png, size: png.length, originalname: 'foto.png' };

test('several uploaded images become ordered media with one primary image', async () => {
  const saved: Record<string, unknown>[] = [];
  const uploaded: string[] = [];
  const prisma = {
    product: { findFirst: async () => ({ id: 'product-1', name: 'Producto' }) },
    productMedia: { findMany: async () => [] },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      productMedia: { create: async ({ data }: { data: Record<string, unknown> }) => { saved.push(data); return data; } },
    }),
  } as unknown as PrismaService;
  const storage = {
    upload: async (path: string) => { uploaded.push(path); },
    url: (path: string) => `https://example.supabase.co/storage/v1/object/public/store-banners/${path}`,
    remove: async () => undefined,
  } as unknown as BannerStorageService;
  const result = await new CatalogImagesService(prisma, storage).uploadProductImages('product-1', [file, file]);
  assert.equal(result.length, 2);
  assert.equal(uploaded.length, 2);
  assert.deepEqual(saved.map((media) => media.position), [0, 1]);
  assert.deepEqual(saved.map((media) => media.isPrimary), [true, false]);
});

test('invalid image is rejected before Storage is used', async () => {
  let called = false;
  const service = new CatalogImagesService({} as PrismaService, {
    upload: async () => { called = true; },
  } as unknown as BannerStorageService);
  await assert.rejects(service.uploadProductImages('product-1', [{ ...file, buffer: Buffer.from('not an image') }]), BadRequestException);
  assert.equal(called, false);
});

test('failed multi-image upload removes any objects from this batch', async () => {
  const removed: string[] = [];
  const prisma = {
    product: { findFirst: async () => ({ id: 'product-1', name: 'Producto' }) },
    productMedia: { findMany: async () => [] },
  } as unknown as PrismaService;
  let count = 0;
  const storage = {
    upload: async () => { if (++count === 2) throw new Error('Storage failed'); },
    remove: async (path: string) => { removed.push(path); },
  } as unknown as BannerStorageService;
  await assert.rejects(new CatalogImagesService(prisma, storage).uploadProductImages('product-1', [file, file]));
  assert.equal(removed.length, 2);
});

test('brand logo upload replaces its database URL and old object', async () => {
  const old = 'https://example.supabase.co/storage/v1/object/public/store-banners/brands/brand-1/old.png';
  const removed: string[] = [];
  const prisma = {
    brand: {
      findFirst: async () => ({ id: 'brand-1', imageUrl: old }),
      update: async ({ data }: { data: { imageUrl: string } }) => ({ id: 'brand-1', ...data }),
    },
  } as unknown as PrismaService;
  const storage = {
    upload: async () => undefined,
    url: (path: string) => `https://example.supabase.co/storage/v1/object/public/store-banners/${path}`,
    remove: async (path: string) => { removed.push(path); },
  } as unknown as BannerStorageService;
  const updated = await new CatalogImagesService(prisma, storage).uploadLogo('brands', 'brand-1', file);
  assert.match(updated.imageUrl!, /brands\/brand-1\/.*\.png$/);
  assert.deepEqual(removed, ['brands/brand-1/old.png']);
});

test('choosing a primary image clears the prior primary in one transaction', async () => {
  const calls: string[] = [];
  const tx = {
    productMedia: {
      findUniqueOrThrow: async () => ({ id: 'new', productId: 'product-1' }),
      updateMany: async () => { calls.push('clear'); },
      update: async () => { calls.push('set'); return { id: 'new', isPrimary: true }; },
    },
  };
  const prisma = { $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as PrismaService;
  await new ProductsRepository(prisma, {} as ConstructorParameters<typeof ProductsRepository>[1]).updateMedia('new', { isPrimary: true });
  assert.deepEqual(calls, ['clear', 'set']);
});
