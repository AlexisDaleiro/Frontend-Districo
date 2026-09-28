import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DISTRICO_BRANDS,
  districoBrandFor,
  LEGACY_DEMO_BRAND_IDS,
} from "../catalog/districo-brands";
import { planDistricoBrands } from "../catalog/brand-sync";
import { demoProductProfile } from "../catalog/demo-data";
import { productCreateData } from "../catalog/import";
import { orderBrands } from "../../src/catalog/brands/brand-order";

const legacy = LEGACY_DEMO_BRAND_IDS.map((id, i) => ({
  id,
  name: `Marca ficticia ${i}`,
  slug: `marca-ficticia-${i}`,
  active: true,
  deletedAt: null,
}));
const products = DISTRICO_BRANDS.flatMap((brand) =>
  brand.productIds.map((sourceExternalId, i) => ({
    id: `product-${sourceExternalId}`,
    source: "DISTRICO",
    sourceExternalId,
    brandId: legacy[i % legacy.length].id,
  })),
);
const storedBrands = DISTRICO_BRANDS.map(({ name, slug }) => ({
  id: `districo-brand-${slug}`,
  name,
  slug,
  active: true,
  deletedAt: null,
}));

test("verified registry covers 19 brands and 156 unique source products", () => {
  assert.equal(DISTRICO_BRANDS.length, 19);
  assert.equal(new Set(DISTRICO_BRANDS.map((brand) => brand.slug)).size, 19);
  assert.equal(products.length, 156);
  assert.equal(
    new Set(products.map((product) => product.sourceExternalId)).size,
    156,
  );
  for (const brand of DISTRICO_BRANDS)
    assert.ok(
      brand.sourceUrls.every((url) =>
        url.startsWith("https://www.districo.com.uy/marcas/"),
      ),
    );
});

test("uses explicit identities, including source typos and products outside brand archives", () => {
  for (const [id, slug] of [
    ["391", "primogato"],
    ["1517", "procao"],
    ["1221", "stack"],
    ["1295", "procao"],
    ["1729", "gran-plus"],
    ["1905", "three-cats"],
  ]) {
    assert.equal(districoBrandFor(id)?.slug, slug);
  }
  assert.equal(districoBrandFor("1739", "RAICOR"), undefined);
  assert.equal(districoBrandFor("1739", "MAGNIS"), undefined);
  assert.equal(districoBrandFor("9999999"), undefined);
});

test("plans only brand changes and never changes other providers", () => {
  const other = {
    ...products[0],
    id: "raicor-product",
    source: "RAICOR",
    brandId: null,
  };
  const plan = planDistricoBrands(legacy, [...products, other]);
  assert.equal(plan.create.length, 19);
  assert.equal(plan.update.length, 156);
  assert.deepEqual(plan.retire, LEGACY_DEMO_BRAND_IDS);
  assert.deepEqual(plan.unmapped, []);
  assert.ok(
    plan.update.every(
      (product) =>
        Object.keys(product).sort().join(",") === "beforeBrandId,brandId,id",
    ),
  );
  assert.ok(plan.update.every((product) => product.id !== other.id));
});

test("repeating synchronization is a no-op and existing brand IDs are reused", () => {
  const assigned = products.map((p) => ({
    ...p,
    brandId: `districo-brand-${districoBrandFor(p.sourceExternalId)!.slug}`,
  }));
  const plan = planDistricoBrands(
    [...storedBrands, ...legacy.map((b) => ({ ...b, active: false }))],
    assigned,
  );
  assert.deepEqual(plan, { create: [], update: [], retire: [], unmapped: [] });
  const existing = storedBrands.map((b) => ({
    ...b,
    id: `existing-${b.slug}`,
  }));
  const reused = planDistricoBrands(existing, [
    { ...products[0], brandId: null },
  ]);
  assert.equal(reused.create.length, 0);
  assert.equal(reused.update[0].brandId, "existing-guabi-natural");
});

test("fails closed on manual assignments, conflicting brands, or unresolved legacy references", () => {
  assert.throws(
    () =>
      planDistricoBrands(legacy, [{ ...products[0], brandId: "manual-brand" }]),
    /manualmente/,
  );
  assert.throws(
    () => planDistricoBrands([{ ...storedBrands[0], active: false }], products),
    /no se sobrescribe/,
  );
  assert.throws(
    () =>
      planDistricoBrands(
        [{ ...storedBrands[0], deletedAt: new Date() }],
        products,
      ),
    /no se sobrescribe/,
  );
  assert.throws(
    () => planDistricoBrands([{ ...storedBrands[0], name: "Otro" }], products),
    /no se sobrescribe/,
  );
  assert.throws(
    () =>
      planDistricoBrands(legacy, [
        { ...products[0], sourceExternalId: "999999" },
      ]),
    /sin marca verificada/,
  );
  assert.throws(
    () => planDistricoBrands(legacy, [{ ...products[0], source: "RAICOR" }]),
    /fuera del mapeo/,
  );
  assert.deepEqual(
    planDistricoBrands(
      [],
      [{ ...products[0], brandId: null, sourceExternalId: "999999" }],
    ).unmapped,
    [products[0].id],
  );
});

test("imports and demo preparation use real brands, not random fictional ones", () => {
  const item = {
    externalId: "1739",
    name: "4Pets",
    sourceUrl: "https://www.districo.com.uy/arenas/producto/",
    description: "",
    shortDescription: "",
    sourceType: "simple",
    publicSku: "",
    categories: [],
    images: [],
  };
  const data = productCreateData(item, "2026-09-27T00:00:00Z");
  assert.deepEqual(data.brand, {
    connectOrCreate: {
      where: { slug: "4pets" },
      create: { name: "4Pets", slug: "4pets" },
    },
  });
  assert.equal(data.active, false);
  assert.equal(
    productCreateData(item, "2026-09-27T00:00:00Z", "MAGNIS").brand,
    undefined,
  );
  assert.equal(
    productCreateData({ ...item, externalId: "999999" }, "2026-09-27T00:00:00Z")
      .brand,
    undefined,
  );
  assert.equal(demoProductProfile("1739", []).brandSlug, "4pets");
  assert.equal(demoProductProfile("999999", []).brandSlug, null);
});

test("brand strip prioritizes the requested brands and keeps all remaining brands", () => {
  const input = [...storedBrands].reverse();
  const original = [...input];
  const sorted = orderBrands(input);
  assert.deepEqual(
    sorted.slice(0, 6).map((b) => b.slug),
    [
      "guabi-natural",
      "biofresh",
      "gran-plus",
      "three-dogs",
      "three-cats",
      "stack",
    ],
  );
  assert.equal(sorted.length, 19);
  assert.deepEqual(input, original);
  assert.deepEqual(orderBrands([]), []);
  assert.deepEqual(
    orderBrands([
      { slug: "z", name: "Zeta" },
      { slug: "a", name: "Alfa" },
    ]).map((b) => b.slug),
    ["a", "z"],
  );
});
