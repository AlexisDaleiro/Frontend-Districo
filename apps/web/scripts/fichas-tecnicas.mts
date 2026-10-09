// Genera public/data/fichas-tecnicas.json (información técnica y características
// principales) desde el contenido de Importadora.
// Respaldo para la importación inicial al backend (catalog:import-technical-sheets).
// Las fichas visibles se guardan y editan en la API; regenerar este archivo no
// reemplaza cambios del dashboard. El respaldo se indexa por sourceUrl.
// Uso (Node 24, desde la raíz): node apps/web/scripts/fichas-tecnicas.mts ../Importadora
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const origen = resolve(process.argv[2] ?? "../Importadora");
const { normalizarTecnica } = await import(
  pathToFileURL(join(origen, "src/lib/tabla-tecnica.ts")).href
);

type Bloque = { label: string; html?: string; text?: string };
type Ficha = { technical?: Bloque[]; benefits?: { icon: string; label: string }[] };
const clave = (url: string) => url.toLowerCase().replace(/\/+$/, "");
// El HTML se inserta tal cual en la ficha: solo se aceptan estas etiquetas y
// atributos, que son los que produce el normalizador.
const permitido = /^<\/?(p|table|thead|tbody|tr|th|td|em|strong|b|h3|br)(\s+(scope|colspan|rowspan)="[a-z0-9]+")*\s*\/?>$/i;

const fichas: Record<string, Ficha> = {};
const dir = join(origen, "src/content/products");
for (const archivo of readdirSync(dir)) {
  const p = JSON.parse(readFileSync(join(dir, archivo), "utf8"));
  if (!p.sourceUrl) continue;
  const bloques: Bloque[] = (p.technicalSheet ?? [])
    .filter((b: Bloque & { content: string }) => !(p.composition && /ingredientes/i.test(b.label)))
    .map((b: { label: string; content: string }) => ({ label: b.label, html: normalizarTecnica(b.content) }));
  if (p.composition) {
    const i = bloques.findIndex((b) => /tabla nutricional/i.test(b.label));
    bloques.splice(i === -1 ? bloques.length : i, 0, { label: "Composición básica", text: p.composition });
  }
  for (const b of bloques)
    for (const tag of b.html?.match(/<[^>]*>/g) ?? [])
      if (!permitido.test(tag)) throw new Error(`${archivo}: etiqueta no permitida ${tag}`);
  const ficha: Ficha = {};
  if (bloques.length) ficha.technical = bloques;
  if (p.featuredBenefits?.length) ficha.benefits = p.featuredBenefits;
  if (Object.keys(ficha).length) fichas[clave(p.sourceUrl)] = ficha;
}

const salida = resolve(import.meta.dirname, "../public/data/fichas-tecnicas.json");
writeFileSync(salida, JSON.stringify(fichas));
console.log(`${Object.keys(fichas).length} fichas -> ${salida}`);
