"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const import_utils_1 = require("./import-utils");
(0, import_utils_1.importDemoProducts)(client_1.ProductSource.RAICOR, [
    {
        name: 'Raicor Demo Antiparasitario',
        shortDescription: 'Producto veterinario demo desde Raicor, marcado como restringido.',
        productType: client_1.ProductType.MEDICATION,
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
//# sourceMappingURL=import-raicor.js.map