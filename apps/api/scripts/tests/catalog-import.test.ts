import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  CatalogSnapshot,
  htmlText,
  parseSnapshot,
  parseSourceProduct,
  PRODUCTS_URL,
  scrapeDistrico,
} from '../catalog/districo';
import { importCatalog, productCreateData } from '../catalog/import';
import { databaseError } from '../script-env';

const raw = (id = 1739) => ({
  id,
  name: '4PETS &#8211; Arena &amp; cuidado',
  type: 'simple',
  sku: '',
  permalink: `https://www.districo.com.uy/arenas/producto-${id}/`,
  description: '<p>Primera parte.</p><p>Segunda parte.</p><script>alert(1)</script>',
  short_description: '<b>Texto corto</b>',
  categories: [{ id: 52, name: 'Arenas sanitarias' }],
  images: [{ src: 'https://www.districo.com.uy/wp-content/uploads/producto.jpg', alt: '' }],
  prices: { price: '0' },
  is_in_stock: true,
});
const snapshot = (): CatalogSnapshot => ({
  version: 1 as const,
  source: 'DISTRICO' as const,
  endpoint: PRODUCTS_URL,
  fetchedAt: '2026-09-27T00:00:00.000Z',
  total: 1,
  products: [parseSourceProduct(raw())],
});

function mockFetch(responses: Response[]) {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    urls.push(String(input));
    assert.equal(init?.redirect, 'error');
    const response = responses.shift();
    assert.ok(response, 'Peticion HTTP inesperada.');
    return response;
  };
  return { fetcher, urls };
}
const robots = (rules = 'User-agent: *\nDisallow: /wp-admin/\n') => new Response(rules);
const page = (items: unknown[], total: number, pages: number) =>
  new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json', 'X-WP-Total': String(total), 'X-WP-TotalPages': String(pages) },
  });
const noWait = async () => {};

test('normalizes HTML and entities without scripts, styles or invented commerce data', () => {
  const product = parseSourceProduct(raw());
  assert.equal(product.name, '4PETS \u2013 Arena & cuidado');
  assert.equal(product.description, 'Primera parte. Segunda parte.');
  assert.equal(product.images[0].alt, product.name);
  assert.equal(product.externalId, '1739');
  assert.equal(htmlText('<style>bad</style><ul><li>Uno</li><li>Dos</li></ul>'), 'Uno Dos');
  assert.ok(!('price' in product) && !('stock' in product));
});

test('rejects invalid identifiers, missing names and foreign media URLs', () => {
  assert.throws(() => parseSourceProduct({ ...raw(), id: '../bad' }));
  assert.throws(() => parseSourceProduct({ ...raw(), name: '<script>bad</script>' }));
  assert.throws(() => parseSourceProduct({ ...raw(), permalink: 'http://127.0.0.1/private' }));
  assert.throws(() => parseSourceProduct({ ...raw(), images: [{ src: 'https://foreign.example/a.jpg' }] }));
});

test('validates snapshots before any database access', () => {
  assert.equal(parseSnapshot(snapshot()).total, 1);
  assert.throws(() => parseSnapshot({ ...snapshot(), total: 2 }), /incompleto/);
  assert.throws(() => parseSnapshot({ ...snapshot(), version: 2 }), /no reconocido/);
  assert.throws(() => parseSnapshot({ ...snapshot(), total: 0, products: [] }), /vacio/);
  assert.throws(
    () => parseSnapshot({ ...snapshot(), total: 2, products: [snapshot().products[0], snapshot().products[0]] }),
    /duplicado/,
  );
});

test('downloads every page sequentially and respects crawl-delay', async () => {
  const waits: number[] = [];
  const mocked = mockFetch([robots('User-agent: *\nCrawl-delay: 2\n'), page([raw(1)], 2, 2), page([raw(2)], 2, 2)]);
  const result = await scrapeDistrico({
    ...mocked,
    pageSize: 1,
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(result.total, 2);
  assert.deepEqual(
    result.products.map((p) => p.externalId),
    ['1', '2'],
  );
  assert.ok(mocked.urls[0].endsWith('/robots.txt'));
  assert.equal(new URL(mocked.urls[2]).searchParams.get('page'), '2');
  assert.deepEqual(waits, [2000, 2000]);
});

test('does not request products when robots forbids them', async () => {
  const mocked = mockFetch([robots('User-agent: *\nDisallow: /wp-json/\n')]);
  await assert.rejects(scrapeDistrico({ ...mocked, wait: noWait }), /robots.txt/);
  assert.equal(mocked.urls.length, 1);
});

test('fails closed if robots cannot be fetched', async () => {
  const mocked = mockFetch([new Response('', { status: 403 })]);
  await assert.rejects(scrapeDistrico({ ...mocked, wait: noWait }), /HTTP 403/);
  assert.equal(mocked.urls.length, 1);
});

test('retries rate limits without ignoring Retry-After', async () => {
  const waits: number[] = [];
  const mocked = mockFetch([
    robots(),
    new Response('', { status: 429, headers: { 'Retry-After': '3' } }),
    page([raw()], 1, 1),
  ]);
  const result = await scrapeDistrico({
    ...mocked,
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(result.total, 1);
  assert.deepEqual(waits, [1000, 3000]);
});

test('stops after bounded retries and on persistent authentication errors', async () => {
  const mocked = mockFetch([
    robots(),
    new Response('', { status: 503 }),
    new Response('', { status: 503 }),
    new Response('', { status: 503 }),
  ]);
  await assert.rejects(scrapeDistrico({ ...mocked, wait: noWait }), /HTTP 503/);
  assert.equal(mocked.urls.length, 4);
  await assert.rejects(
    scrapeDistrico({ ...mockFetch([robots(), new Response('', { status: 401 })]), wait: noWait }),
    /HTTP 401/,
  );
});

test('refuses changing totals, repeated pages and truncated catalogs', async () => {
  await assert.rejects(
    scrapeDistrico({ ...mockFetch([robots(), page([raw(1)], 2, 2), page([raw(2)], 3, 3)]), pageSize: 1, wait: noWait }),
    /cambio/,
  );
  await assert.rejects(
    scrapeDistrico({ ...mockFetch([robots(), page([raw(1)], 2, 2), page([raw(1)], 2, 2)]), pageSize: 1, wait: noWait }),
    /repetido/,
  );
  await assert.rejects(scrapeDistrico({ ...mockFetch([robots(), page([raw(1)], 2, 1)]), wait: noWait }), /incompleto/);
  await assert.rejects(
    scrapeDistrico({ ...mockFetch([robots(), page([raw(1)], 2, 2)]), maxPages: 1, wait: noWait }),
    /limite/,
  );
});

test('supports pagination without totals but never silently stops at the page limit', async () => {
  const response = () => new Response(JSON.stringify([raw()]));
  const result = await scrapeDistrico({ ...mockFetch([robots(), response()]), wait: noWait });
  assert.equal(result.total, 1);
  await assert.rejects(
    scrapeDistrico({ ...mockFetch([robots(), response()]), pageSize: 1, maxPages: 1, wait: noWait }),
    /limite/,
  );
});

test('creates only review drafts with stable identity and no commercial variants', () => {
  const data = productCreateData(snapshot().products[0], snapshot().fetchedAt);
  assert.equal(data.active, false);
  assert.equal(data.requiresMedicationPermission, true);
  assert.equal(data.productType, 'OTHER');
  assert.equal(data.sourceExternalId, '1739');
  assert.equal(data.slug, 'districo-web-1739');
  assert.equal(data.variants, undefined);
  assert.ok(data.media && data.categories);
});

test('reimporting skips existing identities instead of resetting edited products', async () => {
  const records = new Map<string, Record<string, unknown>>();
  const product = {
    findUnique: async ({ where }: { where: { source_sourceExternalId: { sourceExternalId: string } } }) =>
      records.get(where.source_sourceExternalId.sourceExternalId) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      records.set(String(data.sourceExternalId), data);
      return data;
    },
  };
  const database = {
    product,
    $transaction: async (fn: (tx: { product: typeof product }) => unknown) => fn({ product }),
  };
  const prisma = database as unknown as PrismaClient;
  assert.deepEqual(await importCatalog(prisma, snapshot()), { created: 1, skipped: 0 });
  records.get('1739')!.name = 'Nombre revisado manualmente';
  records.get('1739')!.active = true;
  assert.deepEqual(await importCatalog(prisma, snapshot()), { created: 0, skipped: 1 });
  assert.equal(records.size, 1);
  assert.equal(records.get('1739')!.name, 'Nombre revisado manualmente');
  assert.equal(records.get('1739')!.active, true);
});

test('does not log database credentials in error messages', () => {
  const message = databaseError({ code: 'P1001', message: 'postgresql://admin:private-password@db.example/db' });
  assert.match(message, /P1001/);
  assert.ok(!message.includes('private-password') && !message.includes('db.example'));
});

test('prepared migrations include every application table and its RLS protection', () => {
  const migrations = resolve(__dirname, '../../prisma/migrations');
  const initial = readFileSync(resolve(migrations, '202609270001_init/migration.sql'), 'utf8');
  const protection = readFileSync(resolve(migrations, '202609270002_enable_app_rls/migration.sql'), 'utf8');
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName ?? model.name;
    assert.ok(initial.includes(`CREATE TABLE "${table}"`), `Missing table: ${table}`);
    assert.ok(protection.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`), `Missing RLS: ${table}`);
  }
  assert.ok(initial.includes('CREATE UNIQUE INDEX "Product_source_sourceExternalId_key"'));
  assert.ok(!initial.includes('DROP TABLE') && !protection.includes('DROP TABLE'));
});

test('migration metadata protection is scoped, atomic and compatible with local PostgreSQL', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../prisma/migrations/202609270003_protect_prisma_metadata/migration.sql'),
    'utf8',
  );
  assert.match(migration, /^BEGIN;/);
  assert.match(migration.trim(), /COMMIT;$/);
  assert.ok(migration.includes('ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;'));
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    assert.ok(migration.includes(`REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM ${role};`));
  }
  for (const role of ['anon', 'authenticated']) {
    assert.ok(migration.includes(`IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${role}') THEN`));
  }
  assert.equal((migration.match(/ALTER TABLE /g) ?? []).length, 1);
  assert.equal((migration.match(/REVOKE /g) ?? []).length, 3);
  assert.doesNotMatch(migration, /FORCE ROW LEVEL SECURITY|ALL TABLES|ALTER DEFAULT PRIVILEGES|ALTER ROLE|DROP|CASCADE/);
});
