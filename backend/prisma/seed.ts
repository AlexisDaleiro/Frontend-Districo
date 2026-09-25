import {
  CampaignChannel,
  CreditStatus,
  OrderStatus,
  PrismaClient,
  Permission,
  ProductSource,
  ProductType,
  PromotionMetric,
  PromotionRewardType,
  PromotionTargetType,
  PromotionType,
  RecommendationTriggerType,
  Role,
  UnitOfMeasure,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureUser(email: string, password: string, role: Role, permissions: Permission[], customer?: { businessName: string; legalName: string; rut: string; medicationPermission: boolean }) {
  const passwordHash = await bcrypt.hash(password, 10);
  let customerAccountId: string | undefined;

  if (customer) {
    const account = await prisma.customerAccount.upsert({
      where: { rut: customer.rut },
      create: {
        businessName: customer.businessName,
        legalName: customer.legalName,
        rut: customer.rut,
        accountStatus: 'APPROVED',
        medicationPermission: customer.medicationPermission,
      },
      update: {
        businessName: customer.businessName,
        legalName: customer.legalName,
        medicationPermission: customer.medicationPermission,
      },
    });
    customerAccountId = account.id;
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role,
      active: true,
      emailVerified: true,
      customerAccountId,
    },
    update: {
      passwordHash,
      role,
      active: true,
      emailVerified: true,
      customerAccountId,
    },
  });

  await prisma.userPermission.deleteMany({ where: { userId: user.id } });
  if (permissions.length) {
    await prisma.userPermission.createMany({
      data: permissions.map((permission) => ({ userId: user.id, permission })),
      skipDuplicates: true,
    });
  }

  return user;
}

async function ensurePrice(productVariantId: string, priceListId: string, amount: number) {
  await prisma.price.deleteMany({ where: { productVariantId, priceListId } });
  return prisma.price.create({
    data: {
      productVariantId,
      priceListId,
      amount,
      currency: 'UYU',
      validFrom: new Date(),
    },
  });
}

async function main() {
  await ensureUser('admin@districo.com', 'Demo1234!', Role.ADMIN, []);
  await ensureUser(
    'clientemed@gmail.com',
    'Demo1234!',
    Role.CLIENT,
    [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS, Permission.CAN_BUY_MEDICATIONS],
    { businessName: 'Veterinaria Demo Med', legalName: 'Veterinaria Demo Med SRL', rut: '210000010018', medicationPermission: true },
  );
  await ensureUser(
    'cliente@gmail.com',
    'Demo1234!',
    Role.CLIENT,
    [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS],
    { businessName: 'Pet Shop Demo', legalName: 'Pet Shop Demo SAS', rut: '210000020017', medicationPermission: false },
  );
  const pendingPaymentUser = await ensureUser(
    'clientepago@gmail.com',
    'Demo1234!',
    Role.CLIENT,
    [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS],
    { businessName: 'Pago Pendiente Demo', legalName: 'Pago Pendiente Demo SAS', rut: '210000030016', medicationPermission: false },
  );
  if (pendingPaymentUser.customerAccountId) {
    await prisma.customerAccount.update({
      where: { id: pendingPaymentUser.customerAccountId },
      data: { creditStatus: CreditStatus.PAYMENT_PENDING, internalCreditNote: 'Cliente demo para pedidos sujetos a revision.' },
    });
  }

  const priceList = await prisma.priceList.upsert({
    where: { name: 'Lista Mayorista Districo' },
    create: { name: 'Lista Mayorista Districo', active: true },
    update: { active: true },
  });

  const mascotas = await prisma.category.upsert({
    where: { slug: 'mascotas' },
    create: { name: 'Mascotas', slug: 'mascotas' },
    update: {},
  });
  const perros = await prisma.category.upsert({
    where: { slug: 'perros' },
    create: { name: 'Perros', slug: 'perros', parentId: mascotas.id },
    update: { parentId: mascotas.id },
  });
  const alimentos = await prisma.category.upsert({
    where: { slug: 'perros-alimentos' },
    create: { name: 'Alimentos', slug: 'perros-alimentos', parentId: perros.id },
    update: { parentId: perros.id },
  });
  const veterinaria = await prisma.category.upsert({
    where: { slug: 'veterinaria' },
    create: { name: 'Veterinaria', slug: 'veterinaria' },
    update: {},
  });

  const granPlus = await prisma.brand.upsert({
    where: { slug: 'gran-plus' },
    create: { name: 'Gran Plus', slug: 'gran-plus' },
    update: {},
  });
  const biofresh = await prisma.brand.upsert({
    where: { slug: 'biofresh' },
    create: { name: 'Biofresh', slug: 'biofresh' },
    update: {},
  });
  const labDemo = await prisma.laboratory.upsert({
    where: { slug: 'laboratorio-demo' },
    create: { name: 'Laboratorio Demo', slug: 'laboratorio-demo' },
    update: {},
  });

  const especie = await prisma.attributeDefinition.upsert({
    where: { slug: 'especie' },
    create: { name: 'Especie', slug: 'especie', type: 'SELECT' },
    update: {},
  });
  const perro = await prisma.attributeValue.upsert({
    where: { attributeId_slug: { attributeId: especie.id, slug: 'perro' } },
    create: { attributeId: especie.id, value: 'Perro', slug: 'perro' },
    update: {},
  });

  const food = await prisma.product.upsert({
    where: { slug: 'gran-plus-adultos-razas-pequenas' },
    create: {
      name: 'Gran Plus Adultos Razas Pequeñas',
      slug: 'gran-plus-adultos-razas-pequenas',
      shortDescription: 'Alimento seco demo para perros adultos de razas pequeñas.',
      productType: ProductType.FOOD,
      source: ProductSource.DISTRICO,
      brandId: granPlus.id,
      categories: { create: [{ categoryId: alimentos.id }] },
      attributes: { create: [{ attributeValueId: perro.id }] },
      media: {
        create: [{ type: 'IMAGE', url: 'https://www.districo.com.uy/wp-content/uploads/2022/09/00403-Gran-Plus-Cao-Adulto-Mini-Frango-e-Arroz-10.1kgFRENTE-1.png', alt: 'Gran Plus Adultos Razas Pequeñas', position: 1, isPrimary: true }],
      },
    },
    update: {
      brandId: granPlus.id,
      productType: ProductType.FOOD,
      source: ProductSource.DISTRICO,
      requiresMedicationPermission: false,
      active: true,
    },
  });

  await prisma.productCategory.deleteMany({ where: { productId: food.id } });
  await prisma.productCategory.createMany({ data: [{ productId: food.id, categoryId: alimentos.id }], skipDuplicates: true });
  await prisma.productAttributeValue.deleteMany({ where: { productId: food.id } });
  await prisma.productAttributeValue.createMany({ data: [{ productId: food.id, attributeValueId: perro.id }], skipDuplicates: true });

  const variants = await Promise.all([
    prisma.productVariant.upsert({
      where: { sku: 'DIS-DEMO-0001' },
      create: { productId: food.id, sku: 'DIS-DEMO-0001', ean: '7730000000017', name: '1 kg', presentation: 'Bolsa 1 kg', unitOfMeasure: UnitOfMeasure.KG, weight: 1, saleMultiple: 1, minimumOrderQuantity: 1, physicalStock: 50, isDemoData: true },
      update: { productId: food.id, name: '1 kg', saleMultiple: 1, minimumOrderQuantity: 1, physicalStock: 50, active: true },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'DIS-DEMO-0002' },
      create: { productId: food.id, sku: 'DIS-DEMO-0002', ean: '7730000000024', name: '3 kg', presentation: 'Bolsa 3 kg', unitOfMeasure: UnitOfMeasure.KG, weight: 3, saleMultiple: 2, minimumOrderQuantity: 2, physicalStock: 40, isDemoData: true },
      update: { productId: food.id, name: '3 kg', saleMultiple: 2, minimumOrderQuantity: 2, physicalStock: 40, active: true },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'DIS-DEMO-0003' },
      create: { productId: food.id, sku: 'DIS-DEMO-0003', ean: '7730000000031', name: '15 kg', presentation: 'Bolsa 15 kg', unitOfMeasure: UnitOfMeasure.KG, weight: 15, saleMultiple: 5, minimumOrderQuantity: 5, physicalStock: 25, isDemoData: true },
      update: { productId: food.id, name: '15 kg', saleMultiple: 5, minimumOrderQuantity: 5, physicalStock: 25, active: true },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'DIS-DEMO-0004' },
      create: { productId: food.id, sku: 'DIS-DEMO-0004', ean: '7730000000055', name: 'Display x 10', presentation: 'Display mayorista', saleMultiple: 5, minimumOrderQuantity: 10, physicalStock: 20, isDemoData: true },
      update: { productId: food.id, name: 'Display x 10', saleMultiple: 5, minimumOrderQuantity: 10, physicalStock: 20, active: true },
    }),
  ]);

  const biofreshProduct = await prisma.product.upsert({
    where: { slug: 'biofresh-demo-adulto' },
    create: {
      name: 'Biofresh Demo Adulto',
      slug: 'biofresh-demo-adulto',
      shortDescription: 'Producto normal adicional para validar filtros y precios.',
      productType: ProductType.FOOD,
      source: ProductSource.DISTRICO,
      brandId: biofresh.id,
      categories: { create: [{ categoryId: alimentos.id }] },
    },
    update: { brandId: biofresh.id, active: true },
  });
  const biofreshVariant = await prisma.productVariant.upsert({
    where: { sku: 'DIS-DEMO-0100' },
    create: { productId: biofreshProduct.id, sku: 'DIS-DEMO-0100', ean: '7730000001007', name: 'Caja x 2', presentation: 'Caja x 2 unidades', saleMultiple: 2, minimumOrderQuantity: 2, physicalStock: 18, isDemoData: true },
    update: { productId: biofreshProduct.id, saleMultiple: 2, minimumOrderQuantity: 2, physicalStock: 18, active: true },
  });

  const medication = await prisma.product.upsert({
    where: { slug: 'antiparasitario-demo-veterinario' },
    create: {
      name: 'Antiparasitario Demo Veterinario',
      slug: 'antiparasitario-demo-veterinario',
      shortDescription: 'Producto veterinario demo con compra restringida.',
      productType: ProductType.MEDICATION,
      source: ProductSource.RAICOR,
      laboratoryId: labDemo.id,
      requiresMedicationPermission: true,
      categories: { create: [{ categoryId: veterinaria.id }] },
      attributes: { create: [{ attributeValueId: perro.id }] },
    },
    update: {
      laboratoryId: labDemo.id,
      productType: ProductType.MEDICATION,
      source: ProductSource.RAICOR,
      requiresMedicationPermission: true,
      active: true,
    },
  });
  const medicationVariant = await prisma.productVariant.upsert({
    where: { sku: 'RAI-DEMO-0001' },
    create: { productId: medication.id, sku: 'RAI-DEMO-0001', ean: '7730000000048', name: 'Caja x 10', presentation: 'Caja x 10 comprimidos', saleMultiple: 10, minimumOrderQuantity: 10, physicalStock: 30, isDemoData: true },
    update: { productId: medication.id, saleMultiple: 10, minimumOrderQuantity: 10, physicalStock: 30, active: true },
  });

  const allPricedVariants = [...variants, biofreshVariant, medicationVariant];
  const prices = [390, 990, 3790, 1450, 840, 1250];
  await Promise.all(allPricedVariants.map((variant, index) => ensurePrice(variant.id, priceList.id, prices[index])));

  await prisma.promotion.deleteMany({ where: { name: 'Promo cruzada Gran Plus hacia Biofresh' } });
  await prisma.promotion.create({
    data: {
      name: 'Promo cruzada Gran Plus hacia Biofresh',
      description: 'Si compra 10 unidades Gran Plus, recibe 15% en Biofresh.',
      type: PromotionType.CROSS_DISCOUNT,
      startsAt: new Date(),
      priority: 10,
      combinable: false,
      conditions: {
        create: [
          {
            targetType: PromotionTargetType.BRAND,
            targetId: granPlus.id,
            metric: PromotionMetric.MIN_QUANTITY,
            minQuantity: 10,
          },
        ],
      },
      rewards: {
        create: [
          {
            targetType: PromotionTargetType.BRAND,
            targetId: biofresh.id,
            rewardType: PromotionRewardType.PERCENTAGE,
            percentage: 15,
          },
        ],
      },
    },
  });

  await prisma.expirationPromotion.deleteMany({ where: { variantId: medicationVariant.id } });
  await prisma.expirationPromotion.create({
    data: {
      variantId: medicationVariant.id,
      batch: 'DEMO-VTO-01',
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      discountPercentage: 20,
      startsAt: new Date(),
      active: true,
    },
  });

  await prisma.recommendationRule.deleteMany({ where: { name: 'Recomendar Biofresh por Gran Plus' } });
  await prisma.recommendationRule.create({
    data: {
      name: 'Recomendar Biofresh por Gran Plus',
      active: true,
      priority: 5,
      triggerType: RecommendationTriggerType.BRAND,
      triggerId: granPlus.id,
      minimumQuantity: 1,
      products: {
        create: [{ productId: biofreshProduct.id, variantId: biofreshVariant.id, position: 1 }],
      },
    },
  });

  await prisma.order.deleteMany({ where: { orderNumber: { in: ['DIS-SEED-SUBMITTED', 'DIS-SEED-REVIEW'] } } });
  await prisma.order.create({
    data: {
      orderNumber: 'DIS-SEED-SUBMITTED',
      userId: pendingPaymentUser.id,
      customerAccountId: pendingPaymentUser.customerAccountId,
      status: OrderStatus.PENDING_REVIEW,
      requiresManualReview: true,
      reviewReason: CreditStatus.PAYMENT_PENDING,
      acceptedManualReview: true,
      subtotal: 1980,
      discountTotal: 0,
      total: 1980,
      items: {
        create: [
          {
            productId: food.id,
            variantId: variants[1].id,
            productName: food.name,
            variantName: variants[1].name,
            sku: variants[1].sku,
            quantity: 2,
            unitPrice: 990,
            discount: 0,
            subtotal: 1980,
          },
        ],
      },
    },
  });
  await prisma.order.create({
    data: {
      orderNumber: 'DIS-SEED-REVIEW',
      userId: pendingPaymentUser.id,
      customerAccountId: pendingPaymentUser.customerAccountId,
      status: OrderStatus.SUBMITTED,
      subtotal: 390,
      discountTotal: 0,
      total: 390,
      items: {
        create: [
          {
            productId: food.id,
            variantId: variants[0].id,
            productName: food.name,
            variantName: variants[0].name,
            sku: variants[0].sku,
            quantity: 1,
            unitPrice: 390,
            discount: 0,
            subtotal: 390,
          },
        ],
      },
    },
  });

  await prisma.campaign.upsert({
    where: { id: 'demo-campaign-email' },
    create: {
      id: 'demo-campaign-email',
      name: 'Campania demo clientes mayoristas',
      channel: CampaignChannel.EMAIL,
      content: 'Contenido demo para futuro proveedor de email.',
    },
    update: {
      name: 'Campania demo clientes mayoristas',
      channel: CampaignChannel.EMAIL,
      content: 'Contenido demo para futuro proveedor de email.',
    },
  });

  console.log('Seed listo:', {
    products: [food.name, biofreshProduct.name, medication.name],
    priceList: priceList.name,
    variants: allPricedVariants.length,
    promotion: 'Promo cruzada Gran Plus hacia Biofresh',
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
