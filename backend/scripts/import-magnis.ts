import { ProductSource, ProductType } from '@prisma/client';
import { importDemoProducts } from './import-utils';

importDemoProducts(ProductSource.MAGNIS, [
  {
    name: 'Magnis Demo Suplemento Veterinario',
    shortDescription: 'Producto veterinario demo desde Magnis, sin sincronizacion posterior.',
    productType: ProductType.SUPPLEMENT,
    categoryName: 'Nutraceuticos',
    laboratoryName: 'Magnis Demo Lab',
    requiresMedicationPermission: true,
    variants: [
      {
        sku: 'MAG-IMP-0001',
        ean: '7730000010030',
        name: 'Frasco x 1',
        presentation: 'Frasco demo',
        saleMultiple: 1,
        minimumOrderQuantity: 1,
        physicalStock: 24,
      },
    ],
  },
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
