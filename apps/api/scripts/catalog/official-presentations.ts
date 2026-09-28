import { DomUtils, parseDocument } from "htmlparser2";
import type { CatalogSource } from "./sources";

export type PresentationUnit =
  | "kg"
  | "g"
  | "l"
  | "ml"
  | "unidades"
  | "comprimidos"
  | "capsulas"
  | "sobres"
  | "pipetas"
  | "jeringas"
  | "implantes"
  | "dosis"
  | "frascos"
  | "dispositivos";

export interface OfficialPresentation {
  key: string;
  label: string;
  amount: number;
  unit: PresentationUnit;
}

export interface PresentationRecord {
  source: CatalogSource;
  externalId: string;
  sourceUrl: string;
  sourceName: string;
  raw: string | null;
  sizes: OfficialPresentation[];
  status: "unvisited" | "verified" | "not-published" | "fetch-failed";
  method:
    | "official-product-page"
    | "official-catalog-title"
    | "official-catalog-description";
  capturedAt: string | null;
}

export interface PresentationCapture {
  version: 1;
  sources: { source: CatalogSource; fetchedAt: string; total: number }[];
  products: PresentationRecord[];
}

function normalizedAmount(raw: string): number {
  return Number(raw.replace(",", "."));
}

function size(
  amount: number,
  unit: PresentationUnit,
): OfficialPresentation | null {
  const limits: Record<PresentationUnit, number> = {
    kg: 100,
    g: 10000,
    l: 100,
    ml: 10000,
    unidades: 1000,
    comprimidos: 1000,
    capsulas: 1000,
    sobres: 1000,
    pipetas: 1000,
    jeringas: 1000,
    implantes: 1000,
    dosis: 100000,
    frascos: 1000,
    dispositivos: 1000,
  };
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > limits[unit] ||
    Math.round(amount * 1000) !== amount * 1000
  )
    return null;
  const printed = String(amount).replace(".", ",");
  const singular: Partial<Record<PresentationUnit, string>> = {
    unidades: "unidad",
    comprimidos: "comprimido",
    capsulas: "capsula",
    sobres: "sobre",
    pipetas: "pipeta",
    jeringas: "jeringa",
    implantes: "implante",
    dosis: "dosis",
    frascos: "frasco",
    dispositivos: "dispositivo",
  };
  return {
    key: `${String(amount).replace(".", "p")}-${unit}`,
    label: `${printed} ${amount === 1 ? (singular[unit] ?? unit) : unit}`,
    amount,
    unit,
  };
}

function unique(
  items: (OfficialPresentation | null)[],
): OfficialPresentation[] {
  return [
    ...new Map(
      items
        .filter((item): item is OfficialPresentation => item !== null)
        .map((item) => [item.key, item]),
    ).values(),
  ];
}

export function parsePhysicalSizes(value: string): OfficialPresentation[] {
  const items: (OfficialPresentation | null)[] = [];
  const pattern =
    /([0-9]+(?:[.,][0-9]{1,3})?)\s*(kg|kgs|kgrs?|grs?|gr|g|ml|cc|litros?|lts?|lt|l)(?![a-z0-9])/gi;
  for (const match of value.matchAll(pattern)) {
    const rawUnit = match[2].toLowerCase();
    const unit: PresentationUnit = rawUnit.startsWith("k")
      ? "kg"
      : rawUnit.startsWith("g")
        ? "g"
        : rawUnit === "ml" || rawUnit === "cc"
          ? "ml"
          : "l";
    items.push(size(normalizedAmount(match[1]), unit));
  }
  return unique(items);
}

export function parseDistricoRawPresentation(
  raw: string,
): OfficialPresentation[] {
  const sizes = parsePhysicalSizes(
    raw.replace(/(kg|g|ml|l)(?=[0-9])/gi, "$1 "),
  );
  if (sizes.length) return sizes;
  const mats: OfficialPresentation[] = [];
  for (const part of raw.split(/\s*\|\s*/)) {
    const match =
      /^([0-9]+)\s+unidades?\s+([0-9]+)\s*[x×]\s*([0-9]+)\s*cm$/i.exec(
        part.trim(),
      );
    if (!match) return [];
    const count = Number(match[1]);
    const width = Number(match[2]);
    const height = Number(match[3]);
    if (
      count < 1 ||
      count > 1000 ||
      width < 1 ||
      width > 500 ||
      height < 1 ||
      height > 500
    )
      return [];
    mats.push({
      key: `${count}-unidades-${width}x${height}cm`,
      label: `${count} unidades · ${width} x ${height} cm`,
      amount: count,
      unit: "unidades",
    });
  }
  return unique(mats);
}

export function parseDistricoPresentation(
  html: string,
): { raw: string; sizes: OfficialPresentation[] } | null {
  if (html.length > 4_000_000) throw new Error("Ficha HTML demasiado grande.");
  const document = parseDocument(html);
  const elements = DomUtils.findAll(() => true, document.children);
  const heading = elements.findIndex(
    (element) =>
      element.name === "h2" &&
      /^PRESENTACI[OÓ]N\s*:/i.test(DomUtils.textContent(element).trim()),
  );
  if (heading < 0) return null;
  for (const element of elements.slice(heading + 1)) {
    const className = element.attribs.class ?? "";
    if (className.split(/\s+/).includes("titulo-beneficios")) break;
    if (
      ![
        "jet-listing-dynamic-field__content",
        "jet-listing-dynamic-repeater__items",
      ].some((name) => className.split(/\s+/).includes(name))
    )
      continue;
    const raw = DomUtils.textContent(element).replace(/\s+/g, " ").trim();
    if (raw.length > 500) return null;
    const sizes = parseDistricoRawPresentation(raw);
    return sizes.length ? { raw, sizes } : null;
  }
  return null;
}

export function parseProviderTitlePresentation(
  source: CatalogSource,
  name: string,
  categoryNames: string[],
): OfficialPresentation[] {
  if (source === "DISTRICO")
    throw new Error("Usar la ficha de DISTRICO, no el titulo.");
  let text = name
    .replace(
      /[0-9]+(?:[.,][0-9]+)?\s*[-–]\s*[0-9]+(?:[.,][0-9]+)?\s*(?:kg|kgs?|kgrs?)\b/gi,
      " ",
    )
    .replace(/\bP\s*\/\s*[0-9]+\s*KGRS?\b/gi, " ");
  const physical = parsePhysicalSizes(text)
    .filter((entry) => {
      if (entry.unit !== "kg") return true;
      return categoryNames.some((category) =>
        /nutrici[oó]n|raticidas|arenas|alimento/i.test(category),
      );
    })
    .filter((entry) => !(entry.unit === "g" && /^DIB\b/i.test(name)));
  if (/\bnutrici[oó]n\b/i.test(categoryNames.join(" "))) {
    for (const match of text.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*K\b/gi)) {
      const parsed = size(normalizedAmount(match[1]), "kg");
      if (parsed) physical.push(parsed);
    }
  }
  const countUnits: Record<string, PresentationUnit> = {
    uni: "unidades",
    unid: "unidades",
    unidad: "unidades",
    unidades: "unidades",
    comp: "comprimidos",
    compr: "comprimidos",
    comprimido: "comprimidos",
    comprimidos: "comprimidos",
    cap: "capsulas",
    caps: "capsulas",
    capsula: "capsulas",
    capsulas: "capsulas",
    sobre: "sobres",
    sobres: "sobres",
    pipeta: "pipetas",
    pipetas: "pipetas",
    jer: "jeringas",
    jeringa: "jeringas",
    jeringas: "jeringas",
    implante: "implantes",
    implantes: "implantes",
    dosis: "dosis",
    ds: "dosis",
    frasco: "frascos",
    frascos: "frascos",
  };
  const counts: OfficialPresentation[] = [];
  for (const match of text.matchAll(
    /\b(?:x\s*|\*\s*)?([0-9]+)\s*(unidades?|unid\.?|uni\.?|comprimidos?|compr\.?|comp\.?|capsulas?|caps?\.?|sobres?|pipetas?|jeringas?|jer\.?|implantes?|dosis|ds|frascos?)\b/gi,
  )) {
    const unit = countUnits[match[2].toLowerCase().replace(".", "")];
    const parsed = unit && size(Number(match[1]), unit);
    if (parsed) counts.push(parsed);
  }
  const measurements = unique(physical);
  const packages = unique(counts);
  if (measurements.length > 1 || packages.length > 1) return [];
  if (measurements.length && packages.length) {
    return [
      {
        ...measurements[0],
        key: `${measurements[0].key}-${packages[0].key}`,
        label: `${measurements[0].label} · ${packages[0].label}`,
      },
    ];
  }
  if (measurements.length) {
    const pack =
      /\b([0-9]+)\s*x\s*[0-9]+(?:[.,][0-9]+)?\s*(?:kg|kgs?|grs?|gr|g|ml|cc|l|lts?)\b/i.exec(
        text,
      );
    if (pack && Number(pack[1]) > 1 && Number(pack[1]) <= 1000) {
      return [
        {
          ...measurements[0],
          key: `${measurements[0].key}-pack-${pack[1]}`,
          label: `${pack[1]} x ${measurements[0].label}`,
        },
      ];
    }
  }
  return measurements.length ? measurements : packages;
}

export function parseProviderDescriptionPresentation(
  description: string,
): OfficialPresentation[] {
  const match = /\bcontiene\s+([0-9]+)\s+dispositivos\s+por\s+bolsa\b/i.exec(
    description,
  );
  if (!match) return [];
  const parsed = size(Number(match[1]), "dispositivos");
  return parsed ? [{ ...parsed, label: `Bolsa de ${parsed.label}` }] : [];
}
