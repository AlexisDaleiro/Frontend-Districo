import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planLaboratoryBrandCleanup } from '../catalog/laboratory-brand-cleanup';

const brand = { id: 'provider-brand-zoetis', name: 'Zoetis', slug: 'zoetis', imageUrl: null, products: [{ id: 'product-1', laboratoryId: 'provider-laboratory-zoetis' }] };
const lab = { id: 'provider-laboratory-zoetis', name: 'Zoetis', slug: 'zoetis' };

test('retires only provider brands duplicated by their laboratory', () => {
  assert.deepEqual(planLaboratoryBrandCleanup([brand], [lab], []), [{ brandId: brand.id, laboratoryId: lab.id, name: brand.name, productIds: ['product-1'] }]);
  assert.deepEqual(planLaboratoryBrandCleanup([brand], [], []), []);
  assert.deepEqual(planLaboratoryBrandCleanup([{ ...brand, name: 'Other' }], [lab], []), []);
});

test('preserves brands with independent product, logo or marketing associations', () => {
  assert.throws(() => planLaboratoryBrandCleanup([{ ...brand, products: [{ id: 'other', laboratoryId: null }] }], [lab], []), /otro laboratorio/);
  assert.throws(() => planLaboratoryBrandCleanup([{ ...brand, imageUrl: '/logo.png' }], [lab], []), /logo o reglas/);
  assert.throws(() => planLaboratoryBrandCleanup([brand], [lab], [brand.id]), /logo o reglas/);
  assert.throws(() => planLaboratoryBrandCleanup([{ ...brand, id: 'manual' }], [lab], []), /identidad/);
});
