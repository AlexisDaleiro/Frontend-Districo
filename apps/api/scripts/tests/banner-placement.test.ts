import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { BannersService } from '../../src/banners/banners.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BannerStorageService } from '../../src/banners/banner-storage.service';

test('public banners default to ecommerce and explicitly separate institutional placement', async () => {
  const queries: { where: { placement?: string; active?: boolean } }[] = [];
  const prisma = { storeBanner: { findMany: async (query: typeof queries[number]) => { queries.push(query); return []; } } } as unknown as PrismaService;
  const service = new BannersService(prisma, {} as BannerStorageService);
  await service.publicList();
  await service.publicList('INSTITUTIONAL');
  await service.adminList('INSTITUTIONAL');
  assert.deepEqual(queries.map((query) => query.where.placement), ['ECOMMERCE', 'INSTITUTIONAL', 'INSTITUTIONAL']);
  assert.equal(queries[0].where.active, true);
});
test('institutional destinations and ecommerce destinations are validated before uploading', async () => {
  const files = { desktop: [{ buffer: Buffer.from('png'), size: 3 }] };
  let uploads = 0;
  const storage = { upload: async () => { uploads++; } } as unknown as BannerStorageService;
  const prisma = { storeBanner: { findFirst: async () => ({ id: 'b', href: '/marcas', placement: 'INSTITUTIONAL' }) } } as unknown as PrismaService;
  const service = new BannersService(prisma, storage);
  for (const href of ['/marcas', '//outside.test', '/\\outside.test', '/tienda/../../marcas']) {
    await assert.rejects(() => service.create({ title: 'Banner', href, actionLabel: 'Ver', alt: 'Imagen', placement: 'ECOMMERCE' }, files, 'admin'), BadRequestException);
  }
  await assert.rejects(() => service.update('b', { placement: 'ECOMMERCE' }, {}, 'admin'), BadRequestException);
  assert.equal(uploads, 0);
});
