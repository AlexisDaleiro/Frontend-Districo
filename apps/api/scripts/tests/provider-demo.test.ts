import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_TAG, demoProductProfile } from '../catalog/demo-data';
import {
  planProviderDemo,
  ProviderDraft,
  providerDemoProfile,
  providerLaboratory,
  PROVIDER_DEMO_TAG,
} from '../catalog/provider-demo';

const draft = (overrides: Partial<ProviderDraft> = {}): ProviderDraft => ({
  id: 'raicor-product-426',
  source: 'RAICOR',
  sourceExternalId: '426',
  active: false,
  deletedAt: null,
  brandId: null,
  laboratoryId: null,
  tags: [],
  variants: [],
  categories: [{ category: { slug: 'raicor-web-category-148' } }],
  ...overrides,
});

test('laboratories use source-specific category identities, including the spelling correction', () => {
  assert.equal(providerLaboratory('RAICOR', '426', ['raicor-web-category-148'])?.name, 'Virbac');
  assert.equal(
    providerLaboratory('RAICOR', '999', ['raicor-web-category-153'])?.name,
    'Boehringer Ingelheim',
  );
  assert.equal(providerLaboratory('MAGNIS', '1849', ['magnis-web-category-265'])?.name, 'Bimeda');
  assert.equal(providerLaboratory('MAGNIS', '426', ['raicor-web-category-148']), undefined);
  assert.equal(providerLaboratory('RAICOR', '426', ['magnis-web-category-265']), undefined);
  assert.equal(
    providerLaboratory('MAGNIS', '999', ['magnis-web-category-264'])?.slug,
    providerLaboratory('RAICOR', '999', ['raicor-web-category-151'])?.slug,
  );
});

test('reviewed exceptions identify Nutriblock and BASF without guessing manufacturers', () => {
  for (const id of ['1323', '1324', '1325', '1326', '1327', '1328', '1329', '1332']) {
    assert.equal(providerLaboratory('RAICOR', id, [])?.name, 'Nutriblock');
    assert.equal(providerLaboratory('MAGNIS', id, []), undefined);
  }
  assert.equal(providerLaboratory('MAGNIS', '1971', ['magnis-web-category-271'])?.name, 'BASF');
  const supplierLine = providerLaboratory('MAGNIS', '1962', ['magnis-web-category-270']);
  assert.equal(supplierLine?.name, 'Magnis');
  assert.equal(supplierLine?.manufacturerPending, true);
});

test('unknown or ambiguous laboratory identities are never silently assigned', () => {
  assert.equal(providerLaboratory('RAICOR', '999999', []), undefined);
  assert.throws(
    () => providerLaboratory('RAICOR', '426', ['raicor-web-category-148', 'raicor-web-category-151']),
    /ambiguo/,
  );
  assert.throws(() => providerLaboratory('RAICOR', '1323', ['raicor-web-category-148']), /ambiguo/);
  assert.equal(planProviderDemo([draft({ categories: [] })]).unresolved.length, 1);
  assert.equal(planProviderDemo([draft({ sourceExternalId: null })]).unresolved.length, 1);
});

test('synthetic prices and stock are stable, bounded and isolated by provider', () => {
  for (let id = 1; id <= 1000; id++) {
    const a = providerDemoProfile('RAICOR', String(id));
    const b = providerDemoProfile('MAGNIS', String(id));
    assert.deepEqual(a, providerDemoProfile('RAICOR', String(id)));
    assert.notEqual(a.variantId, b.variantId);
    assert.notEqual(a.priceId, b.priceId);
    assert.notEqual(a.sku, b.sku);
    assert.notEqual(a.variantId, demoProductProfile(String(id), []).variantId);
    assert.ok(a.price >= 450 && a.price <= 4200 && Number.isInteger(a.price));
    assert.ok(a.stock >= 20 && a.stock <= 100 && Number.isInteger(a.stock));
  }
  for (const invalid of ['', '0', '-1', '1.5', '../42', '9007199254740992']) {
    assert.throws(() => providerDemoProfile('RAICOR', invalid), /invalida/);
  }
});

test('only untouched provider drafts are eligible, with no changes to DISTRICO', () => {
  const input = [
    draft(),
    draft({ source: 'DISTRICO' }),
    draft({ active: true }),
    draft({ deletedAt: new Date() }),
    draft({ variants: [{ id: 'manual' }] }),
    draft({ tags: [DEMO_TAG] }),
    draft({ tags: [PROVIDER_DEMO_TAG] }),
  ];
  const before = JSON.stringify(input);
  const plan = planProviderDemo(input);
  assert.equal(plan.pending.length, 1);
  assert.equal(plan.skipped, 5);
  assert.deepEqual(plan.unresolved, []);
  assert.equal(JSON.stringify(input), before);
});

test('a prepared or manually modified product is not reset by a second run', () => {
  const profile = providerDemoProfile('RAICOR', '426');
  const prepared = draft({
    active: true,
    variants: [{ id: profile.variantId }],
    tags: [DEMO_TAG, PROVIDER_DEMO_TAG],
  });
  assert.equal(planProviderDemo([prepared]).pending.length, 0);
  assert.equal(planProviderDemo([{ ...prepared, active: false }]).pending.length, 0);
  assert.equal(planProviderDemo([{ ...prepared, active: false, variants: [] }]).pending.length, 0);
});
