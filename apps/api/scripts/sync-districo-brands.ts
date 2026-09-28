import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { assertDemoTarget } from "./catalog/demo-data";
import { planDistricoBrands } from "./catalog/brand-sync";
import {
  BRAND_VERIFICATION_DATE,
  DISTRICO_BRANDS,
} from "./catalog/districo-brands";
import { databaseError, loadBackendEnv } from "./script-env";

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean", default: false },
      "project-ref": { type: "string" },
    },
  });
  loadBackendEnv();
  assertDemoTarget(process.env, values["project-ref"] ?? "");
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const brands = await tx.brand.findMany({ orderBy: { id: "asc" } });
        const products = await tx.product.findMany({
          select: {
            id: true,
            source: true,
            sourceExternalId: true,
            brandId: true,
          },
          orderBy: { id: "asc" },
        });
        const plan = planDistricoBrands(brands, products);
        const summary = {
          brandsCreated: plan.create.length,
          productsUpdated: plan.update.length,
          brandsRetired: plan.retire.length,
          unmapped: plan.unmapped,
        };
        if (
          !values.apply ||
          !(plan.create.length || plan.update.length || plan.retire.length)
        )
          return summary;

        const directory = resolve(__dirname, "../imports");
        mkdirSync(directory, { recursive: true });
        const backupPath = resolve(
          directory,
          `brands-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        );
        writeFileSync(
          backupPath,
          JSON.stringify(
            { capturedAt: new Date().toISOString(), brands, products, plan },
            null,
            2,
          ),
          { flag: "wx" },
        );
        console.log(`Respaldo local: ${backupPath}`);

        if (plan.create.length)
          await tx.brand.createMany({ data: plan.create });
        const groups = new Map<string, typeof plan.update>();
        for (const product of plan.update) {
          const key = JSON.stringify([product.beforeBrandId, product.brandId]);
          const group = groups.get(key) ?? [];
          group.push(product);
          groups.set(key, group);
        }
        for (const group of groups.values()) {
          const changed = await tx.product.updateMany({
            where: {
              id: { in: group.map((product) => product.id) },
              source: "DISTRICO",
              brandId: group[0].beforeBrandId,
            },
            data: { brandId: group[0].brandId },
          });
          if (changed.count !== group.length)
            throw new Error(
              "El catalogo cambio durante la asignacion. Se revierte la transaccion.",
            );
        }
        if (plan.retire.length) {
          if (
            await tx.product.count({ where: { brandId: { in: plan.retire } } })
          )
            throw new Error("Quedan productos en marcas ficticias.");
          await tx.brand.updateMany({
            where: { id: { in: plan.retire } },
            data: { active: false },
          });
        }
        await tx.auditLog.create({
          data: {
            action: "DISTRICO_BRANDS_VERIFIED",
            entityType: "Brand",
            metadata: {
              ...summary,
              verifiedAt: BRAND_VERIFICATION_DATE,
              brandSlugs: DISTRICO_BRANDS.map((brand) => brand.slug),
            },
          },
        });
        return summary;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 120000,
      },
    );
    console.log(
      values.apply
        ? "Marcas verificadas aplicadas:"
        : "Vista previa, sin cambios:",
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const known =
    error instanceof Error &&
    /^(Revisar la marca existente|El producto |Producto sin marca verificada|Una marca ficticia |El catalogo cambio|Quedan productos)/.test(
      error.message,
    );
  console.error(known ? (error as Error).message : databaseError(error));
  process.exitCode = 1;
});
