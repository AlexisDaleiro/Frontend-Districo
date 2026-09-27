import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertDemoTarget, demoProductProfile, DEMO_USERS } from '../catalog/demo-data';

const project = 'exampledemoprojectref';
const environment = {
  NODE_ENV: 'development',
  DATABASE_URL: `postgresql://postgres.${project}:test@aws-0-us-east-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require`,
};

test('test data requires development and an explicitly matching project', () => {
  assert.doesNotThrow(() => assertDemoTarget(environment, project));
  assert.throws(() => assertDemoTarget({ ...environment, NODE_ENV: 'production' }, project));
  assert.throws(() => assertDemoTarget(environment, 'anotherdemoprojectref'));
  assert.throws(() => assertDemoTarget(environment, ''));
  assert.throws(() =>
    assertDemoTarget(
      { ...environment, DATABASE_URL: environment.DATABASE_URL.replace('sslmode=require', 'sslmode=disable') },
      project,
    ),
  );
});

test('commercial fixtures have stable identities and keep unknown categories restricted', () => {
  const first = demoProductProfile('1739', ['districo-web-category-52']);
  assert.deepEqual(first, demoProductProfile('1739', ['districo-web-category-52']));
  assert.equal(first.requiresMedicationPermission, false);
  assert.ok(first.sku.startsWith('DEMO-') && first.price > 0 && first.stock > 0);
  assert.equal(demoProductProfile('1740', []).requiresMedicationPermission, true);
  assert.equal(demoProductProfile('1740', ['districo-web-category-53']).requiresMedicationPermission, true);
  assert.throws(() => demoProductProfile('../invalid', []));
});

test('fictional identities use reserved email domains and distinct permission scenarios', () => {
  assert.equal(DEMO_USERS.length, 4);
  assert.ok(DEMO_USERS.every((user) => user.email.endsWith('@districo.test')));
  assert.equal(DEMO_USERS.find((user) => user.key === 'admin')?.role, 'ADMIN');
  assert.ok(DEMO_USERS.find((user) => user.key === 'medicamentos')?.permissions.includes('CAN_BUY_MEDICATIONS'));
  assert.ok(!DEMO_USERS.find((user) => user.key === 'cliente')?.permissions.includes('CAN_BUY_MEDICATIONS'));
});
