import { ProductSource, ProductType } from '@prisma/client';
import { importDemoProducts } from './import-utils';

importDemoProducts(ProductSource.RAICOR, [
  {
    name: 'Raicor Demo Antiparasitario',
    shortDescription: 'Producto veterinario demo desde Raicor, marcado como restringido.',
    productType: ProductType.MEDICATION,
    categoryName: 'Antiparasitarios',
    laboratoryName: 'Laboratorio Demo',
    requiresMedicationPermission: true,
    variants: [
      {
        sku: 'RAI-IMP-0001',
        ean: '7730000010023',
        name: 'Caja x 10',
        presentation: 'Caja x 10 comprimidos',
        saleMultiple: 10,
        minimumOrderQuantity: 10,
        physicalStock: 35,
      },
    ],
  },
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
