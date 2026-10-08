import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { assertDemoTarget } from "./catalog/demo-data";
import { databaseError, loadBackendEnv } from "./script-env";
import { normalizedCategoryName } from "../src/catalog/categories/category-groups";
import { validateWorkbookCatalog, workbookPending, WORKBOOK_FILE } from "./catalog/workbook-catalog";
import { planWorkbookBrands, planWorkbookAssignments, planWorkbookProducts, workbookProductData, type WorkbookAsset } from "./catalog/workbook-import-plan";

async function main() {
  const { values } = parseArgs({ options: { apply: { type: "boolean", default: false }, "project-ref": { type: "string" } } });
  loadBackendEnv();
  assertDemoTarget(process.env, values["project-ref"] ?? "");
  validateWorkbookCatalog();
  const assets: WorkbookAsset[] = JSON.parse(readFileSync(resolve(__dirname, "catalog/workbook-assets.generated.json"), "utf8")).assets;
  for (const asset of assets) {
    if (asset.url) {
      if (!/^\/images\/workbook-catalog\/[a-z0-9-]+\.webp$/.test(asset.url)) throw new Error("Ruta de imagen invalida.");
      const content = readFileSync(resolve(__dirname, "../../web/public", `.${asset.url}`));
      const { createHash } = await import("node:crypto");
      if (createHash("sha256").update(content).digest("hex") !== asset.sha256) throw new Error("El archivo de imagen no coincide con su registro.");
    }
  }
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const brands = await tx.brand.findMany({ orderBy: { id: "asc" } });
      const products = await tx.product.findMany({ include: { variants: { include: { prices: true } }, media: true, categories: true }, orderBy: { id: "asc" } });
      const categories = await tx.category.findMany({ where: { active: true, deletedAt: null, mergedIntoId: null } });
      const brandPlan = planWorkbookBrands(brands, assets);
      const productPlan = planWorkbookProducts(products, brandPlan.ids);
      const assignments = planWorkbookAssignments(products, brandPlan.ids);
      const addedCategories: { id: string; name: string; slug: string; parentId: string }[] = [];
      const categoryIds = new Map<string, string>();
      const root = categories.find((item) => normalizedCategoryName(item.name) === normalizedCategoryName("Animales de compania"));
      for (const [slug, name] of [["pequenos-mamiferos", "Peque\u00f1os mam\u00edferos"], ["accesorios", "Accesorios"]]) {
        const matches = categories.filter((item) => item.slug === slug || normalizedCategoryName(item.name) === normalizedCategoryName(name));
        if (matches.length > 1) throw new Error(`Categoria duplicada: ${name}`);
        const existing = matches[0];
        if (existing) categoryIds.set(slug, existing.id);
        else if (productPlan.create.some((p) => p.categorySlug === slug)) {
          if (!root) throw new Error("Falta la categoria raiz de animales de compania.");
          const id = `workbook-category-${slug}`;
          categoryIds.set(slug, id);
          addedCategories.push({ id, name, slug, parentId: root.id });
        }
      }
      for (const product of productPlan.create) {
        const categoryId = categoryIds.get(product.categorySlug) ?? categories.find((c) => c.slug === product.categorySlug)?.id;
        if (!categoryId) throw new Error(`Falta categoria verificada: ${product.categorySlug}`);
        categoryIds.set(product.categorySlug, categoryId);
        workbookProductData(product, brandPlan.ids.get(product.brandSlug)!, categoryId, assets);
      }
      const summary = {
        brandsCreated: brandPlan.create.length, brandLogosUpdated: brandPlan.logos.length,
        productsCreatedAsDrafts: productPlan.create.length,
        variantsCreated: productPlan.create.reduce((count, p) => count + p.variants.length, 0),
        existingProductsAssigned: assignments.length, categoriesCreated: addedCategories.length,
        productsAlreadyPresent: productPlan.skip.length,
        missingLogos: ["lopets", "proauto", "tapet"], pending: workbookPending,
      };
      if (!values.apply || ![brandPlan.create.length, brandPlan.logos.length, productPlan.create.length, assignments.length].some(Boolean)) return summary;
      const directory = resolve(__dirname, "../imports");
      mkdirSync(directory, { recursive: true });
      const affectedIds = new Set(assignments.map((entry) => entry.id));
      const backupPath = resolve(directory, `workbook-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      writeFileSync(backupPath, JSON.stringify({ capturedAt: new Date().toISOString(), workbook: WORKBOOK_FILE, brands, categories, products: products.filter((p) => affectedIds.has(p.id)), plan: { brands: brandPlan.create, logos: brandPlan.logos, assignments, products: productPlan.create, categories: addedCategories } }, null, 2), { flag: "wx" });
      console.log(`Respaldo local: ${backupPath}`);
      if (brandPlan.create.length) await tx.brand.createMany({ data: brandPlan.create });
      for (const logo of brandPlan.logos) {
        const changed = await tx.brand.updateMany({ where: { id: logo.id, imageUrl: logo.beforeImageUrl, active: true, deletedAt: null }, data: { imageUrl: logo.imageUrl } });
        if (changed.count !== 1) throw new Error("Una marca cambio durante la importacion; se revierte.");
      }
      if (addedCategories.length) await tx.category.createMany({ data: addedCategories });
      for (const assignment of assignments) {
        const changed = await tx.product.updateMany({ where: { id: assignment.id, brandId: assignment.beforeBrandId, deletedAt: null }, data: { brandId: assignment.brandId } });
        if (changed.count !== 1) throw new Error("Un producto cambio durante la importacion; se revierte.");
      }
      for (const product of productPlan.create) await tx.product.create({ data: workbookProductData(product, brandPlan.ids.get(product.brandSlug)!, categoryIds.get(product.categorySlug)!, assets) });
      await tx.auditLog.create({ data: { action: "WORKBOOK_CATALOG_IMPORTED", entityType: "Product", metadata: { workbook: WORKBOOK_FILE, ...summary, assignments, createdProductKeys: productPlan.create.map((p) => p.key), logoChanges: brandPlan.logos } } });
      return summary;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 120000 });
    console.log(values.apply ? "Importacion aplicada:" : "Vista previa, sin cambios:");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(/^(Marca |Producto |Categoria |Falta |Referencia |La marca |NexGard |Una marca |Un producto |El archivo |Ruta de imagen|El listado|Identidades)/.test(message) ? message : databaseError(error));
  process.exitCode = 1;
});
