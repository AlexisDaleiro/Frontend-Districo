import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { assertDemoTarget, DEMO_PRICE_LIST } from "./catalog/demo-data";
import {
  PresentationCapture,
  PresentationRecord,
} from "./catalog/official-presentations";
import {
  ExistingProduct,
  fictionalVariantPrice,
  planOfficialPresentation,
  presentationRatio,
  presentationWeightKg,
  validatePresentationCapture,
} from "./catalog/official-presentation-plan";
import { databaseError, loadBackendEnv } from "./script-env";

type Database = Prisma.TransactionClient;
const productSelect = {
  id: true,
  source: true,
  sourceExternalId: true,
  sourceUrl: true,
  name: true,
  active: true,
  deletedAt: true,
  tags: true,
  variants: {
    select: {
      id: true,
      sku: true,
      name: true,
      presentation: true,
      active: true,
      isDemoData: true,
      deletedAt: true,
      physicalStock: true,
      reservedStock: true,
      prices: {
        select: {
          id: true,
          priceListId: true,
          amount: true,
          currency: true,
          validUntil: true,
        },
      },
      cartItems: { select: { id: true } },
      stockReservations: { select: { id: true } },
      priceHistory: { select: { id: true } },
    },
  },
} satisfies Prisma.ProductSelect;

async function loadStates(tx: Database, records: PresentationRecord[]) {
  const products = await tx.product.findMany({
    where: {
      OR: records.map((entry) => ({
        source: entry.source,
        sourceExternalId: entry.externalId,
      })),
    },
    select: productSelect,
  });
  const variantIds = products.flatMap((product) =>
    product.variants.map((variant) => variant.id),
  );
  const orders = await tx.orderItem.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true },
  });
  const ordered = new Set(orders.map((item) => item.variantId));
  const states = new Map<
    string,
    { product: ExistingProduct; hasOrder: boolean }
  >();
  for (const product of products) {
    const state: ExistingProduct = {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        prices: variant.prices.map((price) => ({
          ...price,
          amount: price.amount.toNumber(),
        })),
      })),
    };
    states.set(`${product.source}:${product.sourceExternalId}`, {
      product: state,
      hasOrder: product.variants.some((variant) => ordered.has(variant.id)),
    });
  }
  return states;
}

function planned(
  records: PresentationRecord[],
  states: Awaited<ReturnType<typeof loadStates>>,
) {
  return records.map((record) => {
    const state = states.get(`${record.source}:${record.externalId}`);
    return {
      record,
      decision: planOfficialPresentation(
        record,
        state?.product,
        state?.hasOrder ?? false,
      ),
    };
  });
}

function summary(items: ReturnType<typeof planned>) {
  return Object.fromEntries(
    ["DISTRICO", "RAICOR", "MAGNIS"].map((source) => {
      const entries = items.filter(({ record }) => record.source === source);
      return [
        source,
        {
          total: entries.length,
          pending: entries.filter(
            ({ decision }) => decision.state === "pending",
          ).length,
          complete: entries.filter(
            ({ decision }) => decision.state === "complete",
          ).length,
          unresolved: entries.filter(
            ({ decision }) => decision.state === "unresolved",
          ).length,
          skipped: entries.filter(
            ({ decision }) => decision.state === "skipped",
          ).length,
        },
      ];
    }),
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      "project-ref": { type: "string" },
      apply: { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "npm run presentations:apply -- --input imports/official-presentations.json --project-ref <proyecto> [--apply]",
    );
    console.log(
      "Sin --apply solo informa. Con --apply modifica exclusivamente variantes de prueba sin referencias.",
    );
    return;
  }
  if (!values.input) throw new Error("Indicar --input con la captura oficial.");
  if ((await stat(values.input)).size > 10 * 1024 * 1024)
    throw new Error("Captura demasiado grande.");
  const capture = validatePresentationCapture(
    JSON.parse(await readFile(values.input, "utf8")) as PresentationCapture,
  );
  if (
    values.apply &&
    capture.products.some((entry) =>
      ["unvisited", "fetch-failed"].includes(entry.status),
    )
  ) {
    throw new Error(
      "Faltan fichas oficiales por consultar. Reanudar presentations:capture antes de aplicar.",
    );
  }
  loadBackendEnv();
  assertDemoTarget(process.env, values["project-ref"] ?? "");
  const prisma = new PrismaClient();
  try {
    const states = await prisma.$transaction(
      (tx) => loadStates(tx, capture.products),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 60000,
      },
    );
    const plan = planned(capture.products, states);
    console.log(
      JSON.stringify(
        {
          capture: capture.sources,
          summary: summary(plan),
          skipped: plan
            .filter(({ decision }) => decision.state === "skipped")
            .map(({ record, decision }) => ({
              source: record.source,
              externalId: record.externalId,
              reason: decision.reason,
            })),
        },
        null,
        2,
      ),
    );
    if (!values.apply) {
      console.log("Vista previa: no se modifico la base.");
      return;
    }
    const pending = plan
      .filter(({ decision }) => decision.state === "pending")
      .map(({ record }) => record);
    if (!pending.length) {
      console.log("No hay presentaciones pendientes de aplicar.");
      return;
    }
    const priceList = await prisma.priceList.findUnique({
      where: { id: DEMO_PRICE_LIST.id },
      select: { active: true },
    });
    if (!priceList?.active)
      throw new Error("No esta activa la lista de precios ficticios esperada.");
    const directory = resolve(__dirname, "../imports");
    await mkdir(directory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = resolve(
      directory,
      `presentations-before-${timestamp}.json`,
    );
    await writeFile(
      backupPath,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          products: plan
            .filter(({ decision }) => decision.state === "pending")
            .map(({ record }) => ({
              source: record.source,
              externalId: record.externalId,
              previous: states.get(`${record.source}:${record.externalId}`)
                ?.product,
            })),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    console.log(`Respaldo previo: ${backupPath}`);
    const applied: string[] = [];
    const changedDuringRun: string[] = [];
    for (let start = 0; start < pending.length; start += 20) {
      const batch = pending.slice(start, start + 20);
      const result = await prisma.$transaction(
        async (tx) => {
          const currentStates = await loadStates(tx, batch);
          const current = planned(batch, currentStates);
          const variants: Prisma.ProductVariantCreateManyInput[] = [];
          const prices: Prisma.PriceCreateManyInput[] = [];
          const updated: string[] = [];
          const skipped: string[] = [];
          for (const { record, decision } of current) {
            const identity = `${record.source}:${record.externalId}`;
            if (decision.state !== "pending") {
              skipped.push(identity);
              continue;
            }
            const { legacy, sizes } = decision;
            const first = sizes[0];
            await tx.productVariant.update({
              where: { id: legacy.id },
              data: {
                name: first.label,
                presentation: first.label,
                weight: presentationWeightKg(first),
                unitOfMeasure: "UNIT",
              },
            });
            for (const item of sizes.slice(1)) {
              const id = `${legacy.id}-presentation-${item.key}`;
              const ratio = presentationRatio(first, item);
              variants.push({
                id,
                productId: currentStates.get(identity)!.product.id,
                sku: `${legacy.sku}-${item.key.toUpperCase()}`,
                name: item.label,
                presentation: item.label,
                weight: presentationWeightKg(item),
                unitOfMeasure: "UNIT",
                physicalStock:
                  legacy.physicalStock === 0
                    ? 0
                    : Math.max(
                        1,
                        Math.floor(legacy.physicalStock / Math.sqrt(ratio)),
                      ),
                reservedStock: 0,
                active: true,
                isDemoData: true,
              });
              prices.push({
                id: `${legacy.prices[0].id}-presentation-${item.key}`,
                productVariantId: id,
                priceListId: DEMO_PRICE_LIST.id,
                amount: fictionalVariantPrice(
                  legacy.prices[0].amount,
                  first,
                  item,
                ),
                currency: "UYU",
                validFrom: new Date("2020-01-01T00:00:00Z"),
              });
            }
            updated.push(identity);
          }
          if (variants.length)
            await tx.productVariant.createMany({ data: variants });
          if (prices.length) await tx.price.createMany({ data: prices });
          if (updated.length)
            await tx.auditLog.create({
              data: {
                action: "OFFICIAL_PRESENTATIONS_DEMO_PREPARED",
                entityType: "Catalog",
                metadata: {
                  identities: updated,
                  commercialDataFictitious: true,
                },
              },
            });
          return { updated, skipped };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 120000,
        },
      );
      applied.push(...result.updated);
      changedDuringRun.push(...result.skipped);
      console.log(
        `Aplicados ${applied.length}/${pending.length}; sin tocar por cambios recientes: ${changedDuringRun.length}.`,
      );
    }
    const reportPath = resolve(
      directory,
      `presentations-report-${timestamp}.json`,
    );
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          applied,
          changedDuringRun,
          entries: plan.map(({ record, decision }) => ({
            source: record.source,
            externalId: record.externalId,
            sourceUrl: record.sourceUrl,
            sizes: record.sizes.map((item) => item.label),
            state: decision.state,
            reason: decision.reason,
          })),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    console.log(`Informe: ${reportPath}`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      throw new Error(databaseError(error));
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudieron preparar presentaciones.",
  );
  process.exitCode = 1;
});
