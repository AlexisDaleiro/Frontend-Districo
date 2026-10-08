import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProductType, UnitOfMeasure } from "@prisma/client";

export const WORKBOOK_IMPORT_TAG = "IMPORTACION_EXCEL_MARCAS_2026";
export const WORKBOOK_DRAFT_TAG = "PENDIENTE_VALIDACION_COMERCIAL_UY";
export const WORKBOOK_FILE = "Districo_marcas_fuentes_imagenes_y_logos.xlsx";

export interface WorkbookBrand {
  name: string;
  slug: string;
  productsUrl: string;
  logoUrl: string | null;
  notes: string;
}
export const workbookBrands: WorkbookBrand[] = JSON.parse(
  readFileSync(resolve(__dirname, "workbook-brand-resources.json"), "utf8"),
).resources;

export interface WorkbookProduct {
  key: string;
  name: string;
  brandSlug: string;
  sourceUrl: string;
  sourceKind: "MANUFACTURER" | "UY_RETAILER";
  description: string;
  productType: ProductType;
  categorySlug: string;
  images: string[];
  variants: { label: string; weight?: string; unit: UnitOfMeasure }[];
}
const balance = "https://www.balance.com.br/";
const yowup = "https://yowup.com/";
const megazoo = "https://megazoo.com.br/";
const tohImages = "https://cdn.shopify.com/s/files/1/0919/7119/1123/files/";
const dogFood = "alimento-para-perro";
const grams = (amounts: number[]) => amounts.map((amount) => ({
  label: `${amount} g`, weight: String(amount), unit: "G" as const,
}));
const balanceWeights = [
  ...grams([900]),
  { label: "2,7 kg", weight: "2.7", unit: "KG" as const },
  { label: "10,1 kg", weight: "10.1", unit: "KG" as const },
];

// Only individually verified models. Manufacturer listings do not establish local availability.
export const workbookProducts: WorkbookProduct[] = [
  {
    key: "balance-adultos-pequenos", brandSlug: "balance",
    name: "Balance adultos razas peque\u00f1as - carne, pollo y vegetales",
    sourceUrl: `${balance}caes/produtos/racao-seca/adultos-pequenos-carne-frango-e-vegetais/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: dogFood,
    description: "Alimento seco Balance para perros adultos de razas peque\u00f1as, sabor carne, pollo y vegetales.",
    images: [`${balance}assets/images/produtos/racao/adultos-racas-pequenas/embalagem.jpg`],
    variants: balanceWeights,
  },
  {
    key: "balance-adultos-medianos-grandes", brandSlug: "balance",
    name: "Balance adultos razas medianas y grandes - carne, pollo y vegetales",
    sourceUrl: `${balance}caes/produtos/racao-seca/adultos-medios-carne-frango-e-vegetais/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: dogFood,
    description: "Alimento seco Balance para perros adultos de razas medianas y grandes, sabor carne, pollo y vegetales.",
    images: [`${balance}assets/images/produtos/racao/adultos-racas-medias-e-grandes/embalagem.jpg`],
    variants: balanceWeights,
  },
  {
    key: "balance-biscoitos-carne", brandSlug: "balance",
    name: "Balance galletas para perros adultos - carne",
    sourceUrl: `${balance}caes/produtos/biscoitos/adultos-carne/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: dogFood,
    description: "Galletas Balance sabor carne para perros adultos de todos los tama\u00f1os.",
    images: [`${balance}assets/images/produtos/biscoitos/carne/embalagem.jpg`],
    variants: grams([300]),
  },
  {
    key: "yowup-yogur-digestive", brandSlug: "yowup",
    name: "YowUp! Yogur Digestive natural para perros",
    sourceUrl: `${yowup}productos/yogur-digestive-natural/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: dogFood,
    description: "Yogur YowUp! Digestive natural para perros, en envase de 115 g.",
    images: [`${yowup}wp-content/uploads/2026/04/yogur-digestive-natural-perros-prin-yowup.webp`, `${yowup}wp-content/uploads/2026/04/yogurt-digestive-perros-detalle-yowup.webp`],
    variants: grams([115]),
  },
  {
    key: "yowup-yogur-salmon", brandSlug: "yowup",
    name: "YowUp! Yogur Skin & Hair salm\u00f3n para perros",
    sourceUrl: `${yowup}productos/yogur-skin-hair-salmon/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: dogFood,
    description: "Yogur YowUp! Skin & Hair sabor salm\u00f3n para perros, en envase de 115 g.",
    images: [`${yowup}wp-content/uploads/2026/04/yogur-skin-and-hair-salmon-perros-prin-yowup.webp`],
    variants: grams([115]),
  },
  {
    key: "megazoo-conejos-adultos", brandSlug: "megazoo",
    name: "Megazoo alimento para conejos adultos",
    sourceUrl: `${megazoo}produtos/coelhos-ornamentais/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: "pequenos-mamiferos",
    description: "Alimento extrusado Megazoo para conejos adultos. Presentaciones publicadas por el fabricante: 500 g, 1,2 kg y 5 kg.",
    images: [`${megazoo}wp-content/uploads/2023/05/coelho-adulto.png`],
    variants: [...grams([500]), { label: "1,2 kg", weight: "1.2", unit: "KG" }, { label: "5 kg", weight: "5", unit: "KG" }],
  },
  {
    key: "megazoo-anti-aging-conejos", brandSlug: "megazoo",
    name: "Megazoo Anti Aging para conejos",
    sourceUrl: `${megazoo}produtos/anti-aging-coelhos/`,
    sourceKind: "MANUFACTURER", productType: "FOOD", categorySlug: "pequenos-mamiferos",
    description: "Alimento Megazoo de la l\u00ednea Anti Aging para conejos, presentaci\u00f3n de 500 g.",
    images: [`${megazoo}wp-content/uploads/2024/08/3863-MGZ-EXT-ANTI-AGING-COELHO-500G.png`],
    variants: grams([500]),
  },
  {
    key: "lopets-snack-salmon", brandSlug: "lopets",
    name: "LoPets snack cremoso para gatos - salm\u00f3n",
    sourceUrl: "https://www.disco.com.uy/product/snack-cremoso-lopets-para-gato-60g-salmon/379756",
    sourceKind: "UY_RETAILER", productType: "FOOD", categorySlug: "alimento-para-gato",
    description: "Snack cremoso LoPets sabor salm\u00f3n para gatos. Envase de 60 g publicado por Disco Uruguay.",
    images: ["https://gdu-multimedia.azurewebsites.net/api/gdu/multimedia/8a12a9e0-08ed-4ea6-af7c-7ed7e8c60569/content"],
    variants: grams([60]),
  },
  {
    key: "toh-arnes-h-mesh-negro", brandSlug: "toh",
    name: "TOH arn\u00e9s H-Mesh para perros - negro",
    sourceUrl: "https://toh.pet/products/h-mesh-dog-harness-black",
    sourceKind: "MANUFACTURER", productType: "ACCESSORY", categorySlug: "accesorios",
    description: "Arn\u00e9s TOH H-Mesh negro para perros. Talles publicados por el fabricante: extra peque\u00f1o, peque\u00f1o, mediano y grande.",
    images: [`${tohImages}Prancheta17_2adb184e-589a-4e24-804f-5cfafba7f936.png?v=1737140302`, `${tohImages}Prancheta18_a82c3df8-4e16-41f9-b330-7b6828669390.png?v=1737140302`],
    variants: ["Extra peque\u00f1o", "Peque\u00f1o", "Mediano", "Grande"].map((label) => ({ label, unit: "UNIT" })),
  },
  {
    key: "toh-arnes-correa-gatos-noronha", brandSlug: "toh",
    name: "TOH conjunto arn\u00e9s y correa para gatos - Noronha",
    sourceUrl: "https://toh.pet/products/cat-h-harness-comfort-leash-set-noronha",
    sourceKind: "MANUFACTURER", productType: "ACCESSORY", categorySlug: "accesorios",
    description: "Conjunto TOH Cat H-Harness Comfort con correa para gatos, dise\u00f1o Noronha.",
    images: [`${tohImages}Prancheta1_a39e9a99-ee51-4cb9-8185-a226a6d02335.png?v=1737139243`, `${tohImages}Prancheta2_75d93f9e-f708-4433-aff8-9d3948a9e035.png?v=1737139243`],
    variants: [{ label: "Conjunto arn\u00e9s y correa", unit: "UNIT" }],
  },
];

export interface WorkbookAssetRequest {
  key: string;
  kind: "logo" | "product";
  sourceUrl: string;
  background?: string;
  trimBackground?: string;
}
const logoOverrides: Record<string, string> = {
  mutts: "https://www.brf-global.com/brf-pet/wp-content/themes/brf-pet-2026/assets/images/marca/logo-mutts.png",
  faro: "https://www.faropet.com.br/logo.png",
  megazoo: `${megazoo}wp-content/uploads/2023/02/logo-b.svg`,
  toh: "https://toh.pet/cdn/shop/files/Logotipo_TOH_Vetor_Laranja_PNG_-_Copia.png?v=1733225670",
  procao: "https://www.procao.ind.br/cdn/shop/files/PROCAO.png?v=1747240677",
  pipicat: "https://www.kelcopetcare.com.br/wp-content/uploads/2019/11/logo-pipicat.jpg",
  putz: "https://www.kelcopetcare.com.br/wp-content/uploads/2019/11/logo-putz-1.jpg",
  nexgard: "https://nexgardforpets.com/sites/default/files/styles/large/public/2025-03/ng1.png.webp?itok=DrBgnmuw",
};
export const workbookAssetRequests: WorkbookAssetRequest[] = [
  ...workbookBrands.flatMap((brand): WorkbookAssetRequest[] => {
    // Retain the generic Three Dogs/Cats logos; the workbook only links specific sub-lines.
    if (["three-dogs", "three-cats"].includes(brand.slug)) return [];
    const sourceUrl = logoOverrides[brand.slug] ?? brand.logoUrl;
    if (!sourceUrl || !/\.(png|jpg|svg|webp)(\?|$)/i.test(sourceUrl) || /elementor\/thumbs/.test(sourceUrl)) return [];
    return [{ key: `logo-${brand.slug}`, kind: "logo", sourceUrl, ...(brand.slug === "yowup" ? { background: "#173f4b" } : {}), ...(brand.slug === "toh" ? { trimBackground: "#ffffff" } : {}) }];
  }),
  ...workbookProducts.flatMap((product) => product.images.map((sourceUrl, index): WorkbookAssetRequest => ({
    key: `product-${product.key}-${index}`, kind: "product", sourceUrl,
  }))),
];

export const workbookPending = [
  { brand: "Faro", reason: "Sitio oficial sin fichas de productos accesibles; no se inventaron modelos ni presentaciones." },
  { brand: "Proauto", reason: "Referencia de rubro ambigua: fabricante de limpieza automotriz. Falta confirmar la linea distribuida." },
  { brand: "LoPets", reason: "Falta logo independiente original; foto del producto verificada en Disco Uruguay." },
  { brand: "TAPET", reason: "Falta logo independiente original; se conserva la imagen oficial y la ficha existente." },
  { brand: "ISO PRO-T", reason: "Marca de la hoja Por validar, sin evidencia confirmada; excluida de la importacion." },
];

export function normalizedWorkbookIdentity(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function validateWorkbookCatalog() {
  if (workbookBrands.length !== 28 || new Set(workbookBrands.map((b) => b.slug)).size !== 28)
    throw new Error("El listado de marcas del Excel es ambiguo o incompleto.");
  const brands = new Set(workbookBrands.map((brand) => brand.slug));
  if (new Set(workbookProducts.map((p) => p.key)).size !== workbookProducts.length)
    throw new Error("Identidades de productos repetidas.");
  for (const product of workbookProducts) {
    if (!brands.has(product.brandSlug) || !product.sourceUrl.startsWith("https://") || !product.images.length || !product.variants.length)
      throw new Error(`Referencia incompleta: ${product.key}`);
    if (product.productType === "MEDICATION") throw new Error("No se importan medicamentos extranjeros desde este listado.");
  }
}
