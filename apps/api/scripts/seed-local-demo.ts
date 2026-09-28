import { parseArgs } from 'node:util';
import { Permission, Prisma, PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  assertDemoTarget,
  demoProductProfile,
  DEMO_LABORATORY,
  DEMO_PRICE_LIST,
  DEMO_TAG,
  DEMO_USERS,
} from './catalog/demo-data';
import { databaseError, loadBackendEnv } from './script-env';
import { DISTRICO_BRANDS } from './catalog/districo-brands';

async function seed(tx: Prisma.TransactionClient, passwordHash: string, apply: boolean) {
  const products = await tx.product.findMany({
    where: { source: 'DISTRICO', sourceExternalId: { not: null }, deletedAt: null },
    include: { categories: { include: { category: true } }, variants: { select: { id: true } } },
    orderBy: { sourceExternalId: 'asc' },
  });
  const pending = products.filter(
    (product) => !product.active && !product.variants.length && !product.tags.includes(DEMO_TAG),
  );
  const users = await tx.user.findMany({
    where: {
      OR: [
        { id: { in: DEMO_USERS.map((user) => `local-demo-user-${user.key}`) } },
        { email: { in: DEMO_USERS.map((user) => user.email) } },
      ],
    },
    select: { id: true, email: true },
  });
  for (const user of DEMO_USERS) {
    if (users.some((stored) => stored.email === user.email && stored.id !== `local-demo-user-${user.key}`)) {
      throw new Error('Un correo de prueba ya pertenece a otro usuario. No se sobrescribe.');
    }
  }
  const newUsers = DEMO_USERS.filter((user) => !users.some((stored) => stored.id === `local-demo-user-${user.key}`));
  const result = {
    productsPrepared: pending.length,
    productsUnchanged: products.length - pending.length,
    usersCreated: newUsers.length,
  };
  if (!apply) return result;

  const brandIds = new Map<string, string>();
  for (const { name, slug } of DISTRICO_BRANDS) {
    const stored = await tx.brand.upsert({ where: { slug }, create: { name, slug }, update: {} });
    brandIds.set(slug, stored.id);
  }
  await tx.laboratory.upsert({ where: { id: DEMO_LABORATORY.id }, create: DEMO_LABORATORY, update: {} });
  await tx.priceList.upsert({ where: { id: DEMO_PRICE_LIST.id }, create: DEMO_PRICE_LIST, update: {} });

  const variants: Prisma.ProductVariantCreateManyInput[] = [];
  const prices: Prisma.PriceCreateManyInput[] = [];
  const groups = new Map<string, { ids: string[]; data: Prisma.ProductUpdateManyMutationInput }>();
  for (const product of pending) {
    const profile = demoProductProfile(
      product.sourceExternalId!,
      product.categories.map((link) => link.category.slug),
    );
    variants.push({
      id: profile.variantId,
      productId: product.id,
      sku: profile.sku,
      name: 'Presentacion de prueba',
      presentation: 'Unidad ficticia',
      unitOfMeasure: 'UNIT',
      saleMultiple: 1,
      minimumOrderQuantity: 1,
      physicalStock: profile.stock,
      reservedStock: 0,
      active: true,
      isDemoData: true,
    });
    prices.push({
      id: profile.priceId,
      productVariantId: profile.variantId,
      priceListId: DEMO_PRICE_LIST.id,
      amount: profile.price,
      currency: 'UYU',
      validFrom: new Date('2020-01-01T00:00:00Z'),
    });
    const data = {
      active: true,
      brandId: product.brandId ?? (profile.brandSlug ? brandIds.get(profile.brandSlug) : null),
      laboratoryId: profile.laboratoryId,
      requiresMedicationPermission: profile.requiresMedicationPermission,
      tags: [...product.tags, DEMO_TAG],
    };
    const key = JSON.stringify(data);
    const group = groups.get(key) ?? { ids: [] as string[], data };
    group.ids.push(product.id);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const updated = await tx.product.updateMany({
      where: { id: { in: group.ids }, active: false, variants: { none: {} } },
      data: group.data,
    });
    if (updated.count !== group.ids.length) throw new Error('El catalogo cambio durante la preparacion.');
  }
  if (variants.length) await tx.productVariant.createMany({ data: variants });
  if (prices.length) await tx.price.createMany({ data: prices });

  for (const user of newUsers) {
    const id = `local-demo-user-${user.key}`;
    const accountId = `local-demo-account-${user.key}`;
    const medicationPermission = user.permissions.includes(Permission.CAN_BUY_MEDICATIONS);
    if (user.role !== Role.ADMIN) {
      await tx.customerAccount.create({
        data: {
          id: accountId,
          businessName: `Cliente ficticio ${user.key}`,
          legalName: `Empresa ficticia ${user.key}`,
          rut: `00000000000${DEMO_USERS.indexOf(user)}`,
          address: 'Direccion ficticia 123',
          city: 'Montevideo',
          department: 'Montevideo',
          accountStatus: 'APPROVED',
          medicationPermission,
          creditStatus: user.key === 'pago' ? 'PAYMENT_PENDING' : 'GOOD_STANDING',
          creditLimit: 100000,
          internalCreditNote: 'DATOS FICTICIOS: solo pruebas locales, sin ventas reales.',
        },
      });
    }
    await tx.user.create({
      data: {
        id,
        email: user.email,
        passwordHash,
        role: user.role,
        active: true,
        emailVerified: true,
        customerAccountId: user.role === Role.ADMIN ? undefined : accountId,
        permissions: { create: user.permissions.map((permission) => ({ permission })) },
      },
    });
  }
  if (pending.length || newUsers.length) {
    await tx.auditLog.create({
      data: {
        action: 'LOCAL_TEST_DATA_SEEDED',
        entityType: 'Catalog',
        metadata: { ...result, tag: DEMO_TAG, productionReady: false },
      },
    });
  }
  return result;
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      'project-ref': { type: 'string' },
    },
  });
  loadBackendEnv();
  assertDemoTarget(process.env, values['project-ref'] ?? '');
  const password = process.env.DEMO_SEED_PASSWORD ?? '';
  if (values.apply && password.length < 16) throw new Error('DEMO_SEED_PASSWORD debe tener al menos 16 caracteres.');
  const passwordHash = values.apply ? await hash(password, 10) : '';
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction((tx) => seed(tx, passwordHash, values.apply), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 60000,
    });
    console.log(values.apply ? 'Datos ficticios preparados:' : 'Vista previa, sin cambios:');
    console.log(JSON.stringify(result));
    console.log('Cuentas de prueba: ' + DEMO_USERS.map((user) => user.email).join(', '));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(databaseError(error));
  process.exitCode = 1;
});
