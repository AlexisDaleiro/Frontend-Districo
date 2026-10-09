import { parseDocument } from "htmlparser2";
import { z } from "zod";
import { benefitIcons } from "./benefit-icons";
import { ApiError } from "./http";
import type { ProductSheet } from "./types";

export const benefitLabels: Record<string, string> = {
  joints: "Articulaciones", digestion: "Digestión", coat: "Pelaje", dental: "Salud dental", urinary: "Salud urinaria",
  weight: "Peso", growth: "Crecimiento", cognition: "Cognición", energy: "Energía", natural: "Natural", protein: "Proteína",
  immunity: "Inmunidad", heart: "Corazón", vision: "Visión", odor: "Olores", hygiene: "Higiene", palatability: "Sabor",
  hydration: "Hidratación", safety: "Seguridad", fit: "Ajuste", durability: "Durabilidad", training: "Adiestramiento",
  sustainability: "Sustentabilidad", value: "Rendimiento", nutrition: "Nutrición", freshness: "Frescura",
};
export const escapeSheetText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const sheetTextHtml = (text: string) => text.split(/\r?\n/).map((line) => `<p>${escapeSheetText(line)}</p>`).join("");
const allowed = new Set(["p", "table", "thead", "tbody", "tr", "th", "td", "em", "strong", "b", "h3", "br", "ul", "ol", "li"]);
const blocked = new Set(["script", "style", "iframe", "object", "svg", "math", "template"]);

// Demo writes use the same HTML allowlist as the API, never raw pasted markup.
export function sanitizeSheetHtml(html: string): string {
  const document = parseDocument(html);
  const render = (node: typeof document.children[number]): string => {
    if (node.type === "text") return escapeSheetText(node.data);
    if (!("children" in node)) return "";
    if ("name" in node && blocked.has(node.name)) return "";
    const content = node.children.map(render).join("");
    if (!("name" in node) || !allowed.has(node.name)) return content;
    const attributes: string[] = [];
    if (node.name === "td" || node.name === "th") {
      for (const name of ["colspan", "rowspan"]) {
        const value = node.attribs[name];
        if (value && /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 100) attributes.push(`${name}="${Number(value)}"`);
      }
      if (["col", "row", "colgroup", "rowgroup"].includes(node.attribs.scope)) attributes.push(`scope="${node.attribs.scope}"`);
    }
    return `<${node.name}${attributes.length ? " " + attributes.join(" ") : ""}>${node.name === "br" ? "" : `${content}</${node.name}>`}`;
  };
  return document.children.map(render).join("");
}

const sheetSchema = z.object({
  technical: z.array(z.object({ label: z.string().trim().min(1).max(100), html: z.string().max(50000).optional(), text: z.string().max(30000).optional() }).strict()).max(20),
  benefits: z.array(z.object({ icon: z.string().max(40).refine((value) => Object.hasOwn(benefitIcons, value)), label: z.string().trim().min(1).max(160) }).strict()).max(12),
}).strict();

export function normalizeProductSheet(input: ProductSheet): Required<ProductSheet> {
  const parsed = sheetSchema.safeParse({ technical: input.technical ?? [], benefits: input.benefits ?? [] });
  if (!parsed.success || new TextEncoder().encode(JSON.stringify(input)).byteLength > 80000) throw new ApiError("Revisá los títulos, textos y características de la ficha.", 400);
  const sheet = parsed.data;
  if (new Set(sheet.technical.map((block) => block.label.toLocaleLowerCase("es"))).size !== sheet.technical.length) throw new ApiError("Los títulos de las secciones no pueden repetirse.", 400);
  sheet.technical = sheet.technical.map((block) => {
    if (block.html !== undefined && block.text !== undefined) throw new ApiError("Usá un solo formato por sección.", 400);
    const html = block.html !== undefined ? sanitizeSheetHtml(block.html) : undefined;
    const text = block.text?.trim();
    const document = parseDocument(html ?? sheetTextHtml(text ?? ""));
    const read = (node: typeof document.children[number]): string => node.type === "text" ? node.data : "children" in node ? node.children.map(read).join("") : "";
    if (!document.children.map(read).join("").trim()) throw new ApiError(`La sección ${block.label} está vacía.`, 400);
    return html !== undefined ? { label: block.label, html } : { label: block.label, text };
  });
  return sheet;
}
