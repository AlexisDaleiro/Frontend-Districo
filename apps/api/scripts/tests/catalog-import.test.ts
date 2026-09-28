import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  CatalogSnapshot,
  htmlText,
  parseSnapshot,
  parseSourceProduct,
  PRODUCTS_URL,
  scrapeCatalog,
  scrapeDistrico,
  sourceUrl,
} from '../catalog/districo';
import { importCatalog, productCreateData } from '../catalog/import';
import { catalogConfig, CatalogSource, parseCatalogSource } from '../catalog/sources';
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

const providerRaw = (source: CatalogSource, id = 1739) => ({
  ...raw(id),
  permalink: `${catalogConfig(source).origin}/producto/producto-${id}/`,
  images: [{ src: `${catalogConfig(source).origin}/wp-content/uploads/producto.jpg`, alt: '' }],
});
const providerSnapshot = (source: CatalogSource): CatalogSnapshot => ({
  ...snapshot(),
  source,
  endpoint: catalogConfig(source).endpoint,
  products: [parseSourceProduct(providerRaw(source), source)],
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

test('only configured providers and their own HTTPS hosts are accepted', () => {
  for (const invalid of ['OTHER', 'raicor', '__proto__', 'constructor', '', null]) {
    assert.throws(() => parseCatalogSource(invalid), /Origen/);
  }
  for (const source of ['DISTRICO', 'RAICOR', 'MAGNIS'] as const) {
    const config = catalogConfig(source);
    assert.equal(parseCatalogSource(source), source);
    assert.equal(parseSnapshot(providerSnapshot(source)).source, source);
    assert.equal(sourceUrl(`${config.origin}/producto/#detalle`, source), `${config.origin}/producto/`);
    for (const url of [
      'http://127.0.0.1/private',
      `${config.origin.replace('https://', 'https://user:password@')}/producto/`,
      `${config.origin}:8443/producto/`,
      `${config.origin}.example.org/producto/`,
      'https://foreign.example/producto/',
    ]) assert.throws(() => sourceUrl(url, source));
    const other = source === 'RAICOR' ? 'MAGNIS' : 'RAICOR';
    assert.throws(() => sourceUrl(catalogConfig(other).origin, source));
  }
});

test('rejects mismatched provider endpoints, product URLs and media before database access', async () => {
  const prisma = {
    $transaction: () => assert.fail('An invalid snapshot must not access the database.'),
  } as unknown as PrismaClient;
  const raicor = providerSnapshot('RAICOR');
  const magnis = providerSnapshot('MAGNIS');
  for (const invalid of [
    { ...raicor, endpoint: magnis.endpoint },
    { ...raicor, products: [{ ...raicor.products[0], sourceUrl: magnis.products[0].sourceUrl }] },
    { ...raicor, products: [{ ...raicor.products[0], images: magnis.products[0].images }] },
    { ...raicor, products: [raicor.products[0], raicor.products[0]], total: 2 },
  ]) await assert.rejects(importCatalog(prisma, invalid));
});

test('Raicor and Magnis use their own robots rules, pagination and provenance', async () => {
  for (const source of ['RAICOR', 'MAGNIS'] as const) {
    const mocked = mockFetch([
      robots(),
      page([providerRaw(source, 1)], 2, 2),
      page([providerRaw(source, 2)], 2, 2),
    ]);
    const result = await scrapeCatalog(source, { ...mocked, pageSize: 1, wait: noWait });
    assert.equal(result.source, source);
    assert.equal(result.endpoint, catalogConfig(source).endpoint);
    assert.equal(result.total, 2);
    assert.equal(mocked.urls[0], `${catalogConfig(source).origin}/robots.txt`);
    assert.ok(mocked.urls.every((url) => new URL(url).origin === catalogConfig(source).origin));
    assert.equal(new URL(mocked.urls[2]).searchParams.get('page'), '2');
    assert.ok(result.products.every((item) => item.sourceUrl.startsWith(catalogConfig(source).origin)));
  }
});

test('Raicor and Magnis stop on robots errors or prohibitions without requesting products', async () => {
  for (const source of ['RAICOR', 'MAGNIS'] as const) {
    const blocked = mockFetch([new Response('Forbidden', { status: 403 })]);
    await assert.rejects(scrapeCatalog(source, { ...blocked, wait: noWait }), /HTTP 403 en \/robots.txt/);
    assert.equal(blocked.urls.length, 1);
    const forbidden = mockFetch([robots('User-agent: *\nDisallow: /wp-json/\n')]);
    await assert.rejects(scrapeCatalog(source, { ...forbidden, wait: noWait }), /robots.txt no permite/);
    assert.equal(forbidden.urls.length, 1);
  }
});

test('explicit unavailable-robots mode records provenance for public reads without disguising identity', async () => {
  for (const source of ['RAICOR', 'MAGNIS'] as const) {
    for (const status of [403, 404, 410]) {
      const mocked = mockFetch([new Response('Unavailable', { status }), page([providerRaw(source)], 1, 1)]);
      const warnings: string[] = [];
      const result = await scrapeCatalog(source, {
        ...mocked,
        fetcher: async (input, init) => {
          assert.equal(new Headers(init?.headers).get('user-agent'), 'DistricoCatalogImporter/1.0');
          assert.equal(new Headers(init?.headers).has('authorization'), false);
          return mocked.fetcher(input, init);
        },
        wait: noWait,
        allowUnavailableRobots: true,
        onWarning: (message) => warnings.push(message),
      });
      assert.equal(result.total, 1);
      assert.equal(result.robots?.httpStatus, status);
      assert.equal(result.robots?.handling, 'unavailable-rfc9309');
      assert.equal(result.robots?.url, `${catalogConfig(source).origin}/robots.txt`);
      assert.ok(Number.isFinite(Date.parse(result.robots!.checkedAt)));
      assert.equal(warnings.length, 1);
      assert.equal(mocked.urls.length, 2);
    }
  }
});

test('unavailable-robots mode never bypasses explicit rules or access denial on products', async () => {
  const rules = mockFetch([robots('User-agent: *\nDisallow: /wp-json/\n')]);
  await assert.rejects(
    scrapeCatalog('RAICOR', { ...rules, wait: noWait, allowUnavailableRobots: true }),
    /robots.txt no permite/,
  );
  assert.equal(rules.urls.length, 1);
  for (const status of [401, 403]) {
    const denied = mockFetch([new Response('', { status: 403 }), new Response('', { status })]);
    await assert.rejects(
      scrapeCatalog('RAICOR', { ...denied, wait: noWait, allowUnavailableRobots: true }),
      new RegExp(`HTTP ${status} en /wp-json/`),
    );
    assert.equal(denied.urls.length, 2);
  }
});

test('unavailable-robots mode still stops on network, server and persistent rate-limit failures', async () => {
  for (const status of [401, 429, 500, 503]) {
    const mocked = mockFetch(Array.from({ length: 3 }, () => new Response('', { status })));
    await assert.rejects(
      scrapeCatalog('MAGNIS', { ...mocked, wait: noWait, allowUnavailableRobots: true }),
      new RegExp(`HTTP ${status} en /robots.txt`),
    );
    assert.ok(mocked.urls.every((url) => url.endsWith('/robots.txt')));
  }
  await assert.rejects(
    scrapeCatalog('MAGNIS', {
      fetcher: async () => { throw new Error('Network failure'); },
      wait: noWait,
      allowUnavailableRobots: true,
    }),
    /Network failure/,
  );
});

test('snapshots validate robots provenance without breaking older captures', () => {
  const original = providerSnapshot('RAICOR');
  assert.equal(parseSnapshot(original).robots, undefined);
  const robots = {
    url: `${catalogConfig('RAICOR').origin}/robots.txt`,
    httpStatus: 200,
    checkedAt: original.fetchedAt,
    handling: 'rules',
  };
  assert.deepEqual(parseSnapshot({ ...original, robots }).robots, robots);
  for (const invalid of [
    { ...robots, url: `${catalogConfig('MAGNIS').origin}/robots.txt` },
    { ...robots, httpStatus: 403 },
    { ...robots, httpStatus: 503, handling: 'unavailable-rfc9309' },
    { ...robots, httpStatus: 429, handling: 'unavailable-rfc9309' },
    { ...robots, checkedAt: 'invalid' },
  ]) assert.throws(() => parseSnapshot({ ...original, robots: invalid }), /robots.txt invalido/);
});

test('source namespaces separate identical external product and category IDs', async () => {
  const records = new Map<string, Prisma.ProductCreateInput>();
  const key = (source: unknown, externalId: unknown) => `${source}:${externalId}`;
  const product = {
    findUnique: async ({ where }: { where: { source_sourceExternalId: { source: string; sourceExternalId: string } } }) =>
      records.get(key(where.source_sourceExternalId.source, where.source_sourceExternalId.sourceExternalId)) ?? null,
    create: async ({ data }: { data: Prisma.ProductCreateInput }) => {
      records.set(key(data.source, data.sourceExternalId), data);
      return data;
    },
  };
  const prisma = {
    product,
    $transaction: async (fn: (tx: { product: typeof product }) => unknown) => fn({ product }),
  } as unknown as PrismaClient;
  for (const source of ['DISTRICO', 'RAICOR', 'MAGNIS'] as const) {
    const data = providerSnapshot(source);
    assert.deepEqual(await importCatalog(prisma, data), { created: 1, skipped: 0 });
    const created = records.get(key(source, '1739'))!;
    assert.equal(created.source, source);
    assert.equal(created.slug, `${source.toLowerCase()}-web-1739`);
    assert.equal(created.sourceUrl, data.products[0].sourceUrl);
    assert.deepEqual(created.sourceFetchedAt, new Date(data.fetchedAt));
    assert.equal(created.active, false);
    assert.equal(created.requiresMedicationPermission, true);
    assert.equal(created.productType, 'OTHER');
    assert.equal(created.variants, undefined);
    const categories = created.categories?.create;
    assert.ok(Array.isArray(categories));
    assert.ok('category' in categories[0]);
    assert.equal(categories[0].category.connectOrCreate?.where.slug, `${source.toLowerCase()}-web-category-52`);
    created.name = `${source} revisado manualmente`;
    created.active = true;
    assert.deepEqual(await importCatalog(prisma, data), { created: 0, skipped: 1 });
    assert.equal(created.name, `${source} revisado manualmente`);
    assert.equal(created.active, true);
  }
  assert.equal(records.size, 3);
  assert.equal(records.get('DISTRICO:1739')!.name, 'DISTRICO revisado manualmente');
});

test('does not log database credentials in error messages', () => {
  const message = databaseError({ code: 'P1001', message: 'postgresql://admin:private-password@db.example/db' });
  assert.match(message, /P1001/);
  assert.ok(!message.includes('private-password') && !message.includes('db.example'));
});

test('prepared migrations include every application table and its RLS protection', () => {
  const migrations = resolve(__dirname, '../../prisma/migrations');
  const initial = readFileSync(resolve(migrations, '202609270001_init/migration.sql'), 'utf8');
  const prepared = readdirSync(migrations, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(resolve(migrations, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName ?? model.name;
    assert.ok(prepared.includes(`CREATE TABLE "${table}"`), `Missing table: ${table}`);
    assert.ok(prepared.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`), `Missing RLS: ${table}`);
  }
  assert.ok(initial.includes('CREATE UNIQUE INDEX "Product_source_sourceExternalId_key"'));
  assert.ok(!prepared.includes('DROP TABLE'));
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
