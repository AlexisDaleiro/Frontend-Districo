import { DEMO_PRICE_LIST, DEMO_TAG } from "./demo-data";
import {
  parseDistricoRawPresentation,
  PresentationCapture,
  PresentationRecord,
  OfficialPresentation,
} from "./official-presentations";
import { sourceUrl } from "./districo";

export interface ExistingVariant {
  id: string;
  sku: string;
  name: string;
  presentation: string | null;
  active: boolean;
  isDemoData: boolean;
  deletedAt: Date | null;
  physicalStock: number;
  reservedStock: number;
  prices: {
    id: string;
    priceListId: string;
    amount: number;
    currency: string;
    validUntil: Date | null;
  }[];
  cartItems: unknown[];
  stockReservations: unknown[];
  priceHistory: unknown[];
}

export interface ExistingProduct {
  id: string;
  source: string;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  name: string;
  active: boolean;
  deletedAt: Date | null;
  tags: string[];
  variants: ExistingVariant[];
}

export function validatePresentationCapture(
  value: PresentationCapture,
): PresentationCapture {
  if (
    value.version !== 1 ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.products) ||
    value.products.length > 10000
  ) {
    throw new Error("Captura de presentaciones invalida.");
  }
  const expectedSources = new Set(["DISTRICO", "RAICOR", "MAGNIS"]);
  if (
    value.sources.length !== 3 ||
    value.sources.some(
      (entry) =>
        !expectedSources.delete(entry.source) ||
        !Number.isInteger(entry.total) ||
        entry.total < 1 ||
        !Number.isFinite(Date.parse(entry.fetchedAt)),
    )
  )
    throw new Error("Fuentes de captura invalidas.");
  if (
    value.sources.reduce((sum, entry) => sum + entry.total, 0) !==
    value.products.length
  ) {
    throw new Error("La captura esta incompleta.");
  }
  const identities = new Set<string>();
  for (const entry of value.products) {
    const identity = `${entry.source}:${entry.externalId}`;
    if (
      identities.has(identity) ||
      !/^[1-9]\d{0,14}$/.test(entry.externalId) ||
      sourceUrl(entry.sourceUrl, entry.source) !== entry.sourceUrl ||
      !entry.sourceName ||
      entry.sourceName.length > 1000 ||
      !["unvisited", "verified", "not-published", "fetch-failed"].includes(
        entry.status,
      ) ||
      !(entry.source === "DISTRICO"
        ? entry.method === "official-product-page"
        : ["official-catalog-title", "official-catalog-description"].includes(
            entry.method,
          )) ||
      (entry.status === "verified") !==
        (Array.isArray(entry.sizes) && entry.sizes.length > 0) ||
      !Array.isArray(entry.sizes) ||
      entry.sizes.length > 20 ||
      entry.sizes.some(
        (item) =>
          !/^[0-9]+(?:p[0-9]+)?-(?:kg|g|l|ml|unidades|comprimidos|capsulas|sobres|pipetas|jeringas|implantes|dosis|frascos|dispositivos)(?:-.*)?$/.test(
            item.key,
          ) ||
          !Number.isFinite(item.amount) ||
          item.amount <= 0 ||
          !item.label ||
          item.label.length > 100 ||
          ![
            "kg",
            "g",
            "l",
            "ml",
            "unidades",
            "comprimidos",
            "capsulas",
            "sobres",
            "pipetas",
            "jeringas",
            "implantes",
            "dosis",
            "frascos",
            "dispositivos",
          ].includes(item.unit),
      ) ||
      new Set(entry.sizes.map((item) => item.key)).size !==
        entry.sizes.length ||
      (entry.capturedAt !== null &&
        !Number.isFinite(Date.parse(entry.capturedAt)))
    )
      throw new Error(`Presentacion invalida o duplicada en ${identity}.`);
    if (entry.source === "DISTRICO" && entry.status === "verified") {
      const parsed = parseDistricoRawPresentation(entry.raw ?? "");
      if (JSON.stringify(parsed) !== JSON.stringify(entry.sizes))
        throw new Error(`Tamanos sin respaldo en ${identity}.`);
    }
    identities.add(identity);
  }
  for (const source of ["DISTRICO", "RAICOR", "MAGNIS"]) {
    if (
      value.products.filter((entry) => entry.source === source).length !==
      value.sources.find((entry) => entry.source === source)?.total
    )
      throw new Error(`Conteo inconsistente de ${source}.`);
  }
  return value;
}

function normalizedQuantity(item: OfficialPresentation): {
  type: "mass" | "volume" | "count";
  amount: number;
} {
  if (item.unit === "kg") return { type: "mass", amount: item.amount * 1000 };
  if (item.unit === "g") return { type: "mass", amount: item.amount };
  if (item.unit === "l") return { type: "volume", amount: item.amount * 1000 };
  if (item.unit === "ml") return { type: "volume", amount: item.amount };
  return { type: "count", amount: item.amount };
}

export function presentationRatio(
  first: OfficialPresentation,
  target: OfficialPresentation,
): number {
  const base = normalizedQuantity(first);
  const current = normalizedQuantity(target);
  if (base.type !== current.type)
    throw new Error("No se pueden comparar unidades diferentes.");
  return current.amount / base.amount;
}

export function sortPresentations(
  sizes: OfficialPresentation[],
): OfficialPresentation[] {
  const quantities = sizes.map(normalizedQuantity);
  if (new Set(quantities.map((entry) => entry.type)).size !== 1)
    throw new Error(
      "Presentaciones de unidades diferentes requieren revision.",
    );
  if (
    quantities[0]?.type !== "count" &&
    new Set(quantities.map((entry) => entry.amount)).size !== quantities.length
  ) {
    throw new Error("Presentaciones de igual cantidad requieren revision.");
  }
  return [...sizes].sort(
    (a, b) =>
      normalizedQuantity(a).amount - normalizedQuantity(b).amount ||
      a.key.localeCompare(b.key),
  );
}

export function presentationWeightKg(
  item: OfficialPresentation,
): number | null {
  if (item.unit === "kg") return item.amount;
  if (item.unit === "g") return item.amount / 1000;
  return null;
}

export function fictionalVariantPrice(
  basePrice: number,
  first: OfficialPresentation,
  target: OfficialPresentation,
): number {
  const ratio = presentationRatio(first, target);
  if (
    !Number.isFinite(basePrice) ||
    basePrice <= 0 ||
    ratio < 1 ||
    !Number.isFinite(ratio)
  )
    throw new Error("Precio ficticio invalido.");
  const discount =
    ratio >= 10 ? 0.75 : ratio >= 3 ? 0.85 : ratio > 1 ? 0.95 : 1;
  return Math.max(
    1,
    Math.min(999999, Math.round(basePrice * ratio * discount)),
  );
}

export function planOfficialPresentation(
  record: PresentationRecord,
  product: ExistingProduct | undefined,
  hasOrder: boolean,
) {
  if (record.status !== "verified")
    return { state: "unresolved" as const, reason: record.status };
  if (!product) return { state: "skipped" as const, reason: "not-in-database" };
  if (
    product.source !== record.source ||
    product.sourceExternalId !== record.externalId ||
    product.sourceUrl !== record.sourceUrl ||
    product.name !== record.sourceName ||
    !product.active ||
    product.deletedAt ||
    !product.tags.includes(DEMO_TAG)
  )
    return { state: "skipped" as const, reason: "product-changed" };
  let sizes: OfficialPresentation[];
  try {
    sizes = sortPresentations(record.sizes);
  } catch {
    return { state: "skipped" as const, reason: "ambiguous-units" };
  }
  const legacyId =
    record.source === "DISTRICO"
      ? `local-demo-variant-${record.externalId}`
      : `local-demo-${record.source.toLowerCase()}-variant-${record.externalId}`;
  if (
    record.source === "DISTRICO" &&
    record.externalId === "1461" &&
    product.variants.length === 3 &&
    sizes.map((item) => item.label).join("|") === "1 kg|7 kg|20 kg" &&
    product.variants.every(
      (variant) => variant.isDemoData && variant.active && !variant.deletedAt,
    ) &&
    product.variants
      .map((variant) => variant.presentation)
      .sort()
      .join("|") === ["1 kg", "7 kg", "20 kg"].sort().join("|")
  ) {
    return { state: "complete" as const, reason: "already-prepared" };
  }
  if (
    sizes.length > 1 &&
    product.variants.length === sizes.length &&
    sizes.every((item, index) => {
      const variant = product.variants.find(
        (candidate) =>
          candidate.id ===
          (index === 0 ? legacyId : `${legacyId}-presentation-${item.key}`),
      );
      return (
        variant?.isDemoData &&
        variant.active &&
        !variant.deletedAt &&
        variant.name === item.label &&
        variant.presentation === item.label
      );
    })
  )
    return { state: "complete" as const, reason: "already-prepared" };
  const [legacy] = product.variants;
  if (
    product.variants.length === 1 &&
    legacy?.id === legacyId &&
    legacy.isDemoData &&
    legacy.active &&
    legacy.presentation === sizes[0].label &&
    legacy.name === sizes[0].label &&
    sizes.length === 1
  ) {
    return { state: "complete" as const, reason: "already-prepared" };
  }
  if (
    hasOrder ||
    product.variants.length !== 1 ||
    !legacy ||
    legacy.id !== legacyId ||
    !legacy.isDemoData ||
    !legacy.active ||
    legacy.deletedAt ||
    legacy.reservedStock !== 0 ||
    legacy.name !== "Presentacion de prueba" ||
    legacy.presentation !== "Unidad ficticia" ||
    legacy.cartItems.length ||
    legacy.stockReservations.length ||
    legacy.priceHistory.length ||
    legacy.prices.length !== 1 ||
    legacy.prices[0].priceListId !== DEMO_PRICE_LIST.id ||
    legacy.prices[0].currency !== "UYU" ||
    legacy.prices[0].validUntil ||
    legacy.prices[0].amount <= 0
  )
    return {
      state: "skipped" as const,
      reason: "variant-changed-or-referenced",
    };
  return { state: "pending" as const, reason: "verified", sizes, legacy };
}
