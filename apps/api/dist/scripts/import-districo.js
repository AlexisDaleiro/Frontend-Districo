"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const import_utils_1 = require("./import-utils");
(0, import_utils_1.importDemoProducts)(client_1.ProductSource.DISTRICO, [
    {
        name: 'Districo Demo Snack Mayorista',
        shortDescription: 'Producto de fuente Districo cargado por importador de una sola ejecucion.',
        productType: client_1.ProductType.FOOD,
        categoryName: 'Snacks',
        brandName: 'Districo Demo',
        variants: [
            {
                sku: 'DIS-IMP-0001',
                ean: '7730000010016',
                name: 'Pack x 5',
                presentation: 'Pack mayorista x 5 unidades',
                saleMultiple: 5,
                minimumOrderQuantity: 5,
                physicalStock: 60,
            },
        ],
    },
]).catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=import-districo.js.map