import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { workbookBrands, workbookProducts, validateWorkbookCatalog, WORKBOOK_DRAFT_TAG } from "../catalog/workbook-catalog";
import { findWorkbookProduct, planWorkbookAssignments, planWorkbookBrands, planWorkbookProducts, workbookProductData, type StoredWorkbookBrand, type StoredWorkbookProduct, type WorkbookAsset } from "../catalog/workbook-import-plan";

const assets: WorkbookAsset[] = JSON.parse(readFileSync(resolve(__dirname, "../catalog/workbook-assets.generated.json"), "utf8")).assets;
const brands: StoredWorkbookBrand[] = workbookBrands.map((b) => ({ id: `existing-${b.slug}`, name: b.slug === "atila" ? "Atila" : b.name, slug: b.slug, active: true, imageUrl: null, deletedAt: null }));
const stored = (values: Partial<StoredWorkbookProduct> = {}): StoredWorkbookProduct => ({
  id: "existing-product", slug: "existing-product", name: "Existing product", source: "DISTRICO", sourceExternalId: null, sourceUrl: null, brandId: null,
  laboratoryId: null, requiresMedicationPermission: false, deletedAt: null, ...values,
});

test("workbook has 28 distinct confirmed brands and no unverified ISO PRO-T", () => {
  validateWorkbookCatalog();
  assert.equal(workbookBrands.length, 28);
  assert.ok(!workbookBrands.some((b) => /iso.?pro/i.test(b.name)));
  assert.equal(workbookProducts.length, 10);
  assert.ok(workbookProducts.every((p) => p.productType !== "MEDICATION"));
});
test("only missing brands are created, normalized identities and custom logos are preserved", () => {
  const existing = brands.filter((b) => !["balance", "faro", "yowup", "lopets", "megazoo", "proauto", "tapet", "nexgard", "toh"].includes(b.slug));
  const plan = planWorkbookBrands(existing, assets);
  assert.equal(plan.create.length, 9);
  const customized = brands.map((b) => b.slug === "biofresh" ? { ...b, imageUrl: "https://example.com/custom-logo.png" } : b);
  assert.ok(!planWorkbookBrands(customized, assets).logos.some((l) => l.id === "existing-biofresh"));
  const alternate = brands.map((b) => b.slug === "primocao" ? { ...b, slug: "legacy-primo", name: "PRIMOCAO" } : b);
  assert.equal(planWorkbookBrands(alternate, assets).create.length, 0);
  assert.throws(() => planWorkbookBrands([...brands, { ...brands[0], id: "duplicate", slug: "duplicate" }], assets), /duplicada/);
  assert.throws(() => planWorkbookBrands(brands.map((b, index) => index ? b : { ...b, active: false }), assets), /retirada/);
});
test("repeat brand import is a no-op and unavailable logos are not fabricated", () => {
  const first = planWorkbookBrands([], assets);
  const repeat = planWorkbookBrands(first.create.map((b) => ({ ...b, active: true, deletedAt: null })), assets);
  assert.equal(repeat.create.length, 0);
  assert.equal(repeat.logos.length, 0);
  assert.ok(first.create.filter((b) => ["lopets", "proauto", "tapet"].includes(b.slug)).every((b) => b.imageUrl === null));
});
test("all imported models are drafts with no invented prices, inventory, barcodes or permissions", () => {
  for (const product of workbookProducts) {
    const data = workbookProductData(product, "brand", "category", assets);
    assert.equal(data.active, false);
    assert.equal(data.requiresMedicationPermission, false);
    assert.equal(data.sourceUrl, product.sourceUrl);
    assert.ok((data.tags as string[]).includes(WORKBOOK_DRAFT_TAG));
    for (const variant of data.variants!.create as PrismaVariant[]) {
      assert.equal(variant.physicalStock, 0);
      assert.equal(variant.reservedStock, 0);
      assert.equal(variant.isDemoData, false);
      assert.equal(variant.prices, undefined);
      assert.equal(variant.ean, undefined);
    }
  }
});
type PrismaVariant = { physicalStock?: number; reservedStock?: number; isDemoData?: boolean; prices?: unknown; ean?: unknown };
test("verified presentations use declared units rather than interpreting medicine dosage or inventing weights", () => {
  const item = workbookProducts.find((p) => p.key === "megazoo-conejos-adultos")!;
  assert.deepEqual(item.variants.map((v) => [v.weight, v.unit]), [["500", "G"], ["1.2", "KG"], ["5", "KG"]]);
  assert.equal(workbookProducts.find((p) => p.brandSlug === "lopets")!.variants[0].weight, "60");
  assert.ok(workbookProducts.filter((p) => p.brandSlug === "toh").every((p) => p.variants.every((v) => !v.weight && v.unit === "UNIT")));
});
test("existing product is detected by source URL or normalized name, never overwritten or resurrected", () => {
  const item = workbookProducts[0];
  const existing = stored({ sourceUrl: item.sourceUrl.replace("www.", ""), brandId: "brand", name: "Edited title" });
  assert.equal(findWorkbookProduct(item, "brand", [existing])?.id, existing.id);
  assert.equal(findWorkbookProduct(item, "brand", [stored({ brandId: "brand", name: item.name.toUpperCase() })])?.id, "existing-product");
  assert.throws(() => findWorkbookProduct(item, "brand", [existing, { ...existing, id: "duplicate" }]), /duplicado/);
  assert.throws(() => findWorkbookProduct(item, "brand", [{ ...existing, deletedAt: new Date() }]), /retirado/);
  const ids = planWorkbookBrands(brands, assets).ids;
  const imported = workbookProducts.map((p) => stored({ id: p.key, slug: `workbook-${p.key}`, brandId: ids.get(p.brandSlug)! }));
  assert.equal(planWorkbookProducts(imported, ids).create.length, 0);
});
test("TAPET and local NexGard are reassigned without editing commercial or medical data", () => {
  const ids = planWorkbookBrands(brands, assets).ids;
  const tapet = stored({ sourceExternalId: "1517", brandId: "districo-brand-procao" });
  const nexgard = stored({ id: "nexgard", source: "RAICOR", name: "NEXGARD 2-4 KG X3 COMP", laboratoryId: "provider-laboratory-boehringer-ingelheim", requiresMedicationPermission: true });
  const foreign = stored({ id: "foreign", source: "MAGNIS", name: nexgard.name });
  const changes = planWorkbookAssignments([tapet, nexgard, foreign], ids);
  assert.equal(changes.length, 2);
  assert.ok(changes.every((change) => Object.keys(change).sort().join() === "beforeBrandId,brandId,id"));
  assert.equal(planWorkbookAssignments([ { ...tapet, brandId: ids.get("tapet")! }, { ...nexgard, brandId: ids.get("nexgard")! } ], ids).length, 0);
  assert.throws(() => planWorkbookAssignments([{ ...nexgard, requiresMedicationPermission: false }], ids), /permisos/);
  assert.throws(() => planWorkbookAssignments([{ ...tapet, brandId: "custom" }], ids), /manualmente/);
});
test("each packaged image matches its checksum and product assets are not thumbnails or upscaled", () => {
  for (const asset of assets) {
    assert.ok(asset.url && !asset.error);
    const bytes = readFileSync(resolve(__dirname, "../../../web/public", `.${asset.url}`));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    if (!asset.vector) {
      assert.ok(asset.width! <= asset.originalWidth!);
      assert.ok(asset.height! <= asset.originalHeight!);
    }
    if (asset.key.startsWith("product-")) assert.ok(Math.max(asset.originalWidth!, asset.originalHeight!) >= 500);
  }
  assert.throws(() => workbookProductData(workbookProducts[0], "brand", "category", []), /imagen verificada/);
});
