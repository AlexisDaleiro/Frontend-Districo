"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const import_utils_1 = require("./import-utils");
(0, import_utils_1.importDemoProducts)(client_1.ProductSource.MAGNIS, [
    {
        name: 'Magnis Demo Suplemento Veterinario',
        shortDescription: 'Producto veterinario demo desde Magnis, sin sincronizacion posterior.',
        productType: client_1.ProductType.SUPPLEMENT,
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
//# sourceMappingURL=import-magnis.js.map