import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SalesLine } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBrandDto } from '../../src/catalog/brands/dto/create-brand.dto';
import { UpdateBrandDto } from '../../src/catalog/brands/dto/update-brand.dto';
import { BrandsRepository } from '../../src/catalog/brands/brands.repository';
import { BrandsService } from '../../src/catalog/brands/brands.service';
import { brandSalesLines, planBrandSalesLines } from '../catalog/brand-sales-lines';

test('brand DTOs accept the three lines and reject unexpected input', async () => {
  for (const salesLine of Object.values(SalesLine)) {
    assert.equal((await validate(plainToInstance(CreateBrandDto, { name: 'Demo', salesLine }))).length, 0);
    assert.equal((await validate(plainToInstance(UpdateBrandDto, { salesLine }))).length, 0);
  }
  for (const salesLine of ['OTHER', [], {}, 12, false]) {
    assert.ok((await validate(plainToInstance(CreateBrandDto, { name: 'Demo', salesLine }))).length);
    assert.ok((await validate(plainToInstance(UpdateBrandDto, { salesLine }))).length);
  }
  assert.equal((await validate(plainToInstance(CreateBrandDto, { name: 'Legacy' }))).length, 0);
  assert.equal((await validate(plainToInstance(UpdateBrandDto, { name: 'Rename' }))).length, 0);
});

test('brand service persists the line without rewriting products', async () => {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const service = new BrandsService({
    create: async (data: unknown) => { created.push(data); return data; },
    update: async (id: string, data: unknown) => { updated.push({ id, data }); return data; },
  } as unknown as BrandsRepository);
  await service.create({ name: 'Demo', salesLine: SalesLine.BOTH });
  assert.deepEqual(created, [{ name: 'Demo', slug: 'demo', active: true, salesLine: SalesLine.BOTH }]);
  await service.update('brand', { salesLine: SalesLine.COMMERCIAL });
  assert.deepEqual(updated, [{ id: 'brand', data: { salesLine: SalesLine.COMMERCIAL, slug: undefined } }]);
});

test('research covers 28 distinct brands and both has evidence from two channels', () => {
  assert.equal(brandSalesLines.length, 28);
  assert.equal(new Set(brandSalesLines.map((entry) => entry.slug)).size, 28);
  for (const entry of brandSalesLines) {
    assert.ok(Object.values(SalesLine).includes(entry.salesLine));
    assert.ok(entry.sources.length);
    assert.ok(entry.sources.every((source) => new URL(source).protocol === 'https:'));
    if (entry.salesLine === SalesLine.BOTH) {
      assert.equal(entry.basis, 'UY_OBSERVED');
      assert.ok(entry.sources.length >= 2);
    }
  }
});

test('initial classification preserves assigned, deleted and unknown brands', () => {
  const make = (id: string, slug: string, salesLine: SalesLine | null = null, deletedAt: Date | null = null) => ({ id, slug, salesLine, deletedAt });
  const brands = [make('pending', 'mutts'), make('manual', 'biofresh', SalesLine.BOTH), make('deleted', 'primocao', null, new Date()), make('unknown', 'new-brand')];
  const plan = planBrandSalesLines(brands);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].brand.id, 'pending');
  assert.equal(plan[0].classification.salesLine, SalesLine.BOTH);
  assert.deepEqual(planBrandSalesLines([{ ...brands[0], salesLine: SalesLine.BOTH }]), []);
});
