import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { assertDemoTarget } from './catalog/demo-data';
import { taxonomyCategories } from './catalog/store-taxonomy';
import { normalizedCategoryName } from '../src/catalog/categories/category-groups';
import { loadBackendEnv } from './script-env';

type Backup = { products: { id: string; active: boolean; requiresMedicationPermission: boolean; productType: string;
  categories: { categoryId: string }[]; variants: { id: string; active: boolean; physicalStock: number; reservedStock: number;
    prices: { id: string; amount: string; currency: string }[] }[] }[] };

async function main() {
  const { values } = parseArgs({ options: { 'project-ref': { type: 'string' }, backup: { type: 'string' } } });
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  if (!values.backup || basename(values.backup) !== values.backup || !/^store-taxonomy-before-.*\.json$/.test(values.backup)) throw new Error('Indicar el nombre del respaldo guardado en imports.');
  const before = JSON.parse(readFileSync(resolve(__dirname, '../imports', values.backup), 'utf8')) as Backup;
  const prisma = new PrismaClient();
  try {
    const current = await prisma.product.findMany({ where: { deletedAt: null }, include: { categories: true, variants: { where: { deletedAt: null }, include: { prices: { include: { priceList: true } } } } } });
    assert.equal(current.length, before.products.length, 'No se deben agregar ni quitar productos');
    let newPrices = 0;
    for (const previous of before.products) {
      const product = current.find((item) => item.id === previous.id)!;
      assert.ok(product, 'Producto original no encontrado');
      for (const key of ['active', 'requiresMedicationPermission', 'productType'] as const) assert.equal(product[key], previous[key], `Se modifico ${key}`);
      for (const category of previous.categories) assert.ok(product.categories.some((item) => item.categoryId === category.categoryId), 'Se perdio una asociacion anterior');
      for (const oldVariant of previous.variants) {
        const variant = product.variants.find((item) => item.id === oldVariant.id)!;
        assert.ok(variant, 'Presentacion original no encontrada');
        assert.equal(variant.active, oldVariant.active);
        assert.equal(variant.reservedStock, oldVariant.reservedStock);
        const extraPrices = variant.prices.filter((price) => !oldVariant.prices.some((item) => item.id === price.id));
        newPrices += extraPrices.length;
        const expectedStock = extraPrices.length && oldVariant.physicalStock === 0 && oldVariant.reservedStock === 0 && oldVariant.id.startsWith('workbook-') ? 30 : oldVariant.physicalStock;
        assert.equal(variant.physicalStock, expectedStock, 'Se altero stock preexistente');
        for (const price of oldVariant.prices) {
          const saved = variant.prices.find((item) => item.id === price.id)!;
          assert.ok(saved, 'Se elimino un precio anterior');
          assert.equal(saved.amount.toString(), String(price.amount));
          assert.equal(saved.currency, price.currency);
        }
      }
    }
    const categories = await prisma.category.findMany({ where: { deletedAt: null } });
    assert.equal(categories.length, taxonomyCategories.length);
    const siblings = categories.map((category) => `${category.parentId ?? 'root'}:${normalizedCategoryName(category.name)}`);
    assert.equal(new Set(siblings).size, siblings.length, 'Categorias duplicadas en un mismo nivel');
    assert.equal(categories.filter((category) => !category.parentId).length, 6);
    const now = new Date();
    const withoutPrice = current.flatMap((product) => product.variants).filter((variant) => variant.active && !variant.prices.some((price) => price.amount.gt(0) && price.priceList.active && price.validFrom <= now && (!price.validUntil || price.validUntil >= now)));
    assert.equal(withoutPrice.length, 0, 'Presentaciones activas sin precio vigente');
    console.log(JSON.stringify({ products: current.length, categories: categories.length, roots: 6, newDemoPrices: newPrices, activeVariantsWithoutPrice: withoutPrice.length, preservedPermissionsPricesAndReservations: true }, null, 2));
  } finally { await prisma.$disconnect(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[conexion privada]') : 'No se pudo verificar el catalogo.');
  process.exitCode = 1;
});
