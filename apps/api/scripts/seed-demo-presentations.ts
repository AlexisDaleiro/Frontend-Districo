import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertDemoTarget, DEMO_PRICE_LIST } from './catalog/demo-data';
import {
  APOLO_ADULT_PRESENTATIONS,
  assertDemoPresentationEligibility,
  demoPresentationPrice,
} from './catalog/demo-presentations';
import { databaseError, loadBackendEnv } from './script-env';

const productWhere = { source_sourceExternalId: { source: 'DISTRICO' as const, sourceExternalId: '1461' } };

async function inspect(tx: Prisma.TransactionClient) {
  const product = await tx.product.findUnique({
    where: productWhere,
    select: {
      id: true, source: true, sourceExternalId: true, sourceUrl: true, active: true, tags: true,
      variants: {
        orderBy: { id: 'asc' },
        select: {
          id: true, sku: true, name: true, presentation: true, active: true, isDemoData: true,
          deletedAt: true, physicalStock: true, reservedStock: true,
          prices: { select: { id: true, priceListId: true, amount: true, currency: true, validUntil: true } },
          cartItems: { select: { id: true } },
          stockReservations: { select: { id: true } },
          priceHistory: { select: { id: true } },
        },
      },
    },
  });
  if (!product) throw new Error('APOLO Adultos no existe en esta base.');
  const orderItems = await tx.orderItem.count({ where: { variantId: { in: product.variants.map((variant) => variant.id) } } });
  const state = assertDemoPresentationEligibility({ ...product, orderItems });
  const legacy = product.variants.find((variant) => variant.id === 'local-demo-variant-1461');
  const oldPrice = legacy?.prices.find((price) => price.priceListId === DEMO_PRICE_LIST.id);
  if (
    !legacy ||
    legacy.reservedStock !== 0 ||
    legacy.prices.length !== 1 ||
    !oldPrice ||
    oldPrice.currency !== 'UYU' ||
    oldPrice.validUntil !== null ||
    oldPrice.amount.lessThanOrEqualTo(0)
  ) throw new Error('Precio, stock o variante de base no son los datos de prueba esperados.');
  return { product, legacy, oldPrice, state };
}

async function main() {
  const { values } = parseArgs({
    options: { apply: { type: 'boolean', default: false }, 'project-ref': { type: 'string' }, help: { type: 'boolean' } },
  });
  if (values.help) {
    console.log('npm run demo:presentations -- --project-ref <proyecto> [--apply]');
    console.log('Solo APOLO Adultos (1461), base de prueba. Sin --apply no cambia datos.');
    return;
  }
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  const prisma = new PrismaClient();
  try {
    const before = await prisma.$transaction(inspect, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    console.log(`APOLO Adultos: ${before.state}; presentaciones verificadas: ${APOLO_ADULT_PRESENTATIONS.join(', ')} kg.`);
    if (before.state === 'complete' || !values.apply) return;

    const backupDir = resolve(__dirname, '../imports');
    await mkdir(backupDir, { recursive: true });
    const backupPath = resolve(backupDir, `apolo-1461-before-${Date.now()}.json`);
    await writeFile(
      backupPath,
      JSON.stringify({ product: before.product, capturedAt: new Date().toISOString() }, null, 2) + '\n',
      { flag: 'wx' },
    );

    await prisma.$transaction(async (tx) => {
      const { product, legacy, oldPrice, state } = await inspect(tx);
      if (state !== 'pending') throw new Error('El producto cambio durante la carga; no se aplicaron datos.');
      const basePrice = oldPrice.amount.toNumber();
      await tx.productVariant.update({
        where: { id: legacy.id },
        data: { name: 'Bolsa de 1 kg', presentation: '1 kg', weight: 1, unitOfMeasure: 'UNIT' },
      });
      for (const kg of APOLO_ADULT_PRESENTATIONS.filter((weight) => weight !== 1)) {
        const id = `local-demo-variant-1461-${kg}kg`;
        await tx.productVariant.create({
          data: {
            id,
            productId: product.id,
            sku: `DEMO-DIS-1461-${kg}KG`,
            name: `Bolsa de ${kg} kg`,
            presentation: `${kg} kg`,
            weight: kg,
            unitOfMeasure: 'UNIT',
            physicalStock: Math.max(1, Math.floor(legacy.physicalStock / Math.sqrt(kg))),
            reservedStock: 0,
            active: true,
            isDemoData: true,
          },
        });
        await tx.price.create({
          data: {
            id: `local-demo-price-1461-${kg}kg`,
            productVariantId: id,
            priceListId: DEMO_PRICE_LIST.id,
            amount: demoPresentationPrice(basePrice, kg),
            currency: 'UYU',
            validFrom: new Date('2020-01-01T00:00:00Z'),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          action: 'DEMO_PRESENTATIONS_PREPARED',
          entityType: 'Product',
          entityId: product.id,
          metadata: { sourceExternalId: '1461', weightsKg: APOLO_ADULT_PRESENTATIONS, commercialDataFictitious: true },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 60000 });
    console.log(`Presentaciones de prueba cargadas; respaldo previo: ${backupPath}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      throw new Error(databaseError(error));
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudieron cargar presentaciones.');
  process.exitCode = 1;
});
