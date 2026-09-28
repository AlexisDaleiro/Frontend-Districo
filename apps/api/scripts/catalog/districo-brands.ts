export interface DistricoBrand {
  name: string;
  slug: string;
  sourceUrls: string[];
  productIds: string[];
}

export const BRAND_VERIFICATION_DATE = "2026-09-27";
export const LEGACY_DEMO_BRAND_IDS = [
  "local-demo-brand-a",
  "local-demo-brand-b",
  "local-demo-brand-c",
];
const origin = "https://www.districo.com.uy";
const brand = (
  name: string,
  slug: string,
  archives: string[],
  ids: string,
): DistricoBrand => ({
  name,
  slug,
  sourceUrls: archives.map((path) => `${origin}/marcas/${path}/`),
  productIds: ids.split(" "),
});

// Reviewed archive IDs, not name matching: TAPET belongs to Procao in the source taxonomy.
export const DISTRICO_BRANDS: DistricoBrand[] = [
  brand(
    "Guabi Natural",
    "guabi-natural",
    ["guabi-natural"],
    "1618 1615 1611 1768 1764 1584 1576 1946 1594 1941 1587",
  ),
  brand(
    "Biofresh",
    "biofresh",
    ["biofresh"],
    "402 1477 1455 1361 1348 1342 1329 1496 1745 1494 1862 1841 1834 1832 1489 1483 1561 1223",
  ),
  brand(
    "Gran Plus",
    "gran-plus",
    ["granplus"],
    "1692 1688 1686 1601 1598 1682 1680 1678 1734 1732 1709 1706 1703 1608 1605 1671 1662 1657 1646 1729",
  ),
  brand(
    "Three Dogs",
    "three-dogs",
    ["three-dogs", "three-orig"],
    "1689 1750 1697 1695 1743 1558 1556 1554 1551 1546 1754 1871 1869 1896 1873 1911 1909 1907",
  ),
  brand(
    "Three Cats",
    "three-cats",
    ["three-cats-orig"],
    "1814 1812 1810 1808 1806 1804 1802 1903 1900 1898 1917 1915 1913 1905",
  ),
  brand(
    "Primoc\u00e3o",
    "primocao",
    ["primocao"],
    "1367 1549 1447 1445 1442 1439 1866 1860 1854 1848 1836",
  ),
  brand(
    "Primogato",
    "primogato",
    ["primogato"],
    "391 1457 1453 1451 1890 1883 1879 1875",
  ),
  brand("Apolo", "apolo", ["apolo"], "1461 1459"),
  brand("Atila", "atila", ["atila"], "1464"),
  brand("Beny", "beny", ["beny"], "1775 1771 1780"),
  brand("Mutts", "mutts", ["mutts"], "1467"),
  brand("Eco Cane", "eco-cane", ["eco-cane"], "400"),
  brand("Putz", "putz", ["putz"], "1340"),
  brand("Pipicat", "pipicat", ["pipicat"], "1364 1359 1356 1351 1345"),
  brand("4Pets", "4pets", ["4-pets"], "1739"),
  brand("Kets", "kets", ["kets"], "1736"),
  brand(
    "Proc\u00e3o",
    "procao",
    ["procao"],
    "1517 1509 1316 1314 1310 1307 1305 1300 1290 1286 1280 1272 1267 1260 394 1295",
  ),
  brand(
    "Amazonia",
    "amazonia",
    ["amazonia"],
    "1336 1333 1326 1321 1319 1312 1303 1298 1293 397",
  ),
  brand(
    "STACK",
    "stack",
    ["stack"],
    "1283 1278 1275 1270 1265 1257 1213 1210 1207 1203 1196 1193 392 1221",
  ),
];

// Four items are absent from brand archives, but their own official descriptions identify the brand.
export const BRAND_PRODUCT_EVIDENCE: Record<string, string> = {
  "1221": `${origin}/snacks-para-consumo-humano/papas/pancetitas/`,
  "1295": `${origin}/cuidado-mascotas/acondicionador/acondicionador-procao/`,
  "1729": `${origin}/alimento-para-mascotas/gatos/gran-plus-para-gatos-cachorros/`,
  "1905": `${origin}/alimento-para-mascotas/gatos/pate-three-cats-castrados-sabor-pollo/`,
};

const byProduct = new Map<string, DistricoBrand>();
for (const entry of DISTRICO_BRANDS) {
  for (const id of entry.productIds) {
    if (byProduct.has(id))
      throw new Error(`Marca ambigua para el producto DISTRICO ${id}.`);
    byProduct.set(id, entry);
  }
}

export function districoBrandFor(externalId: string, source = "DISTRICO") {
  return source === "DISTRICO" ? byProduct.get(externalId) : undefined;
}
