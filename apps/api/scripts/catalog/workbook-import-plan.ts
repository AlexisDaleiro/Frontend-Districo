import type { Prisma } from "@prisma/client";
import {
  normalizedWorkbookIdentity, workbookBrands, workbookProducts,
  WORKBOOK_DRAFT_TAG, WORKBOOK_IMPORT_TAG, type WorkbookProduct,
} from "./workbook-catalog";

export interface WorkbookAsset {
  key: string;
  url?: string;
  sourceUrl: string;
  sha256?: string;
  error?: string;
  originalWidth?: number;
  originalHeight?: number;
  width?: number;
  height?: number;
  vector?: boolean;
  nativeSmallLogo?: boolean;
}
export interface StoredWorkbookBrand {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  active: boolean;
  deletedAt: Date | null;
}
export interface StoredWorkbookProduct {
  id: string;
  slug: string;
  name: string;
  source: string;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  brandId: string | null;
  laboratoryId: string | null;
  requiresMedicationPermission: boolean;
  deletedAt: Date | null;
}
export function planWorkbookBrands(stored: StoredWorkbookBrand[], assets: WorkbookAsset[]) {
  const create: { id: string; slug: string; name: string; imageUrl: string | null }[] = [];
  const logos: { id: string; beforeImageUrl: string | null; imageUrl: string }[] = [];
  const ids = new Map<string, string>();
  for (const brand of workbookBrands) {
    const names = new Set([brand.slug, brand.name, brand.slug === "atila" ? "Atila" : brand.name].map(normalizedWorkbookIdentity));
    const matches = stored.filter((item) => item.slug === brand.slug || names.has(normalizedWorkbookIdentity(item.name)));
    if (matches.length > 1) throw new Error(`Marca duplicada para revisar: ${brand.slug}`);
    const existing = matches[0];
    if (existing && (!existing.active || existing.deletedAt)) throw new Error(`Marca retirada: ${brand.slug}; no se reactiva automaticamente.`);
    const imageUrl = assets.find((asset) => asset.key === `logo-${brand.slug}`)?.url ?? null;
    const id = existing?.id ?? `districo-brand-${brand.slug}`;
    ids.set(brand.slug, id);
    if (!existing) create.push({ id, slug: brand.slug, name: brand.slug === "atila" ? "Atila" : brand.name, imageUrl });
    else if (imageUrl && imageUrl !== existing.imageUrl && (!existing.imageUrl || existing.imageUrl.startsWith("/images/workbook-catalog/"))) {
      logos.push({ id, beforeImageUrl: existing.imageUrl, imageUrl });
    }
  }
  return { create, logos, ids };
}

function canonicalUrl(value: string | null) {
  if (!value) return "";
  const url = new URL(value);
  return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
}
export function findWorkbookProduct(item: WorkbookProduct, brandId: string, stored: StoredWorkbookProduct[]) {
  const matches = stored.filter((product) =>
    product.slug === `workbook-${item.key}` ||
    (product.source === "DISTRICO" && product.sourceExternalId === `workbook-${item.key}`) ||
    (product.sourceUrl && canonicalUrl(product.sourceUrl) === canonicalUrl(item.sourceUrl)) ||
    (product.brandId === brandId && normalizedWorkbookIdentity(product.name) === normalizedWorkbookIdentity(item.name)),
  );
  if (matches.length > 1) throw new Error(`Producto duplicado para revisar: ${item.key}`);
  if (matches[0]?.deletedAt) throw new Error(`Producto retirado: ${item.key}; no se recrea automaticamente.`);
  return matches[0];
}

export function workbookProductData(item: WorkbookProduct, brandId: string, categoryId: string, assets: WorkbookAsset[]): Prisma.ProductUncheckedCreateInput {
  const images = item.images.map((sourceUrl, index) => {
    const asset = assets.find((entry) => entry.key === `product-${item.key}-${index}`);
    if (!asset?.url || asset.sourceUrl !== sourceUrl) throw new Error(`Falta imagen verificada: ${item.key}-${index}`);
    return { url: asset.url, alt: item.name, type: "IMAGE" as const, position: index, isPrimary: index === 0 };
  });
  return {
    id: `workbook-product-${item.key}`, slug: `workbook-${item.key}`,
    name: item.name, description: item.description, shortDescription: item.description,
    brandId, productType: item.productType,
    // DISTRICO is the existing catalog namespace; the original publisher is retained explicitly.
    source: "DISTRICO", sourceExternalId: `workbook-${item.key}`, sourceUrl: item.sourceUrl,
    sourceFetchedAt: new Date(), active: false, requiresMedicationPermission: false,
    tags: [WORKBOOK_IMPORT_TAG, WORKBOOK_DRAFT_TAG, item.sourceKind === "MANUFACTURER" ? "REFERENCIA_FABRICANTE" : "REFERENCIA_MINORISTA_UY"],
    categories: { create: [{ categoryId }] },
    media: { create: images },
    variants: { create: item.variants.map((variant, index) => ({
      id: `workbook-variant-${item.key}-${index}`, sku: `WB-${item.key.toUpperCase()}-${index + 1}`,
      name: variant.label, presentation: variant.label, weight: variant.weight ?? null,
      unitOfMeasure: variant.unit, physicalStock: 0, reservedStock: 0, active: true,
      isDemoData: false, saleMultiple: 1, minimumOrderQuantity: 1,
    })) },
  };
}

export function planWorkbookAssignments(products: StoredWorkbookProduct[], brands: Map<string, string>) {
  const update: { id: string; beforeBrandId: string | null; brandId: string }[] = [];
  for (const product of products) {
    if (product.deletedAt) continue;
    let slug: string | undefined;
    if (product.source === "DISTRICO" && product.sourceExternalId === "1517") {
      if (product.brandId && !["districo-brand-procao", brands.get("tapet")].includes(product.brandId))
        throw new Error("La marca de TAPET fue editada manualmente; revisar antes de asignar.");
      slug = "tapet";
    } else if (product.source === "RAICOR" && /^NEXGARD(?:\s|$)/i.test(product.name) && product.laboratoryId === "provider-laboratory-boehringer-ingelheim") {
      if (!product.requiresMedicationPermission) throw new Error("NexGard requiere revisar sus permisos antes de importar.");
      if (product.brandId && product.brandId !== brands.get("nexgard"))
        throw new Error("La marca de NexGard fue editada manualmente; revisar antes de asignar.");
      slug = "nexgard";
    }
    if (slug) {
      const brandId = brands.get(slug);
      if (!brandId) throw new Error(`Falta marca: ${slug}`);
      if (brandId !== product.brandId) update.push({ id: product.id, beforeBrandId: product.brandId, brandId });
    }
  }
  return update;
}

export function planWorkbookProducts(products: StoredWorkbookProduct[], brands: Map<string, string>) {
  const create: WorkbookProduct[] = [];
  const skip: string[] = [];
  for (const item of workbookProducts) {
    const brandId = brands.get(item.brandSlug);
    if (!brandId) throw new Error(`Falta marca: ${item.brandSlug}`);
    if (findWorkbookProduct(item, brandId, products)) skip.push(item.key);
    else create.push(item);
  }
  return { create, skip };
}
