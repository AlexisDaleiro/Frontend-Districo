import { parseDocument } from 'htmlparser2';
import robotsParser from 'robots-parser';
import { setTimeout as sleep } from 'node:timers/promises';

export const ORIGIN = 'https://www.districo.com.uy';
export const PRODUCTS_URL = `${ORIGIN}/wp-json/wc/store/v1/products`;
const AGENT = 'DistricoCatalogImporter/1.0';

export interface CatalogProduct {
  externalId: string;
  sourceUrl: string;
  name: string;
  description: string;
  shortDescription: string;
  sourceType: string;
  publicSku: string;
  categories: { externalId: string; name: string }[];
  images: { url: string; alt: string }[];
}

export interface CatalogSnapshot {
  version: 1;
  source: 'DISTRICO';
  endpoint: typeof PRODUCTS_URL;
  fetchedAt: string;
  total: number;
  products: CatalogProduct[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Registro de catalogo invalido.');
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error('Lista de catalogo invalida.');
  return value;
}

function string(value: unknown, max = 100000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Texto de catalogo invalido.');
  return value;
}

function externalId(value: unknown): string {
  if (!/^[1-9]\d{0,14}$/.test(String(value))) throw new Error('Identificador de origen invalido.');
  return String(value);
}

export function sourceUrl(value: unknown): string {
  const url = new URL(string(value, 4096));
  if (
    url.protocol !== 'https:' ||
    !['www.districo.com.uy', 'districo.com.uy'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error('URL fuera del catalogo permitido de DISTRICO.');
  url.hash = '';
  return url.href;
}

export function htmlText(value: unknown): string {
  const document = parseDocument(string(value ?? ''));
  type HtmlNode = (typeof document.children)[number];
  const text = (node: HtmlNode): string => {
    if (node.type === 'text') return node.data;
    if ('name' in node && ['script', 'style', 'template', 'noscript'].includes(node.name)) return '';
    if (!('children' in node)) return '';
    const content = node.children.map(text).join('');
    return (
      content + ('name' in node && ['p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'tr'].includes(node.name) ? '\n' : '')
    );
  };
  return document.children.map(text).join('').replace(/\s+/g, ' ').trim();
}

export function parseSourceProduct(value: unknown): CatalogProduct {
  const item = record(value);
  const name = htmlText(item.name);
  if (!name || name.length > 1000) throw new Error('Producto sin nombre valido.');
  return {
    externalId: externalId(item.id),
    sourceUrl: sourceUrl(item.permalink),
    name,
    description: htmlText(item.description),
    shortDescription: htmlText(item.short_description),
    sourceType: string(item.type ?? 'unknown', 100),
    publicSku: string(item.sku ?? '', 200),
    categories: array(item.categories).map((value) => {
      const category = record(value);
      const name = htmlText(category.name);
      if (!name || name.length > 1000) throw new Error('Categoria sin nombre valido.');
      return { externalId: externalId(category.id), name };
    }),
    images: array(item.images).map((value) => {
      const image = record(value);
      return { url: sourceUrl(image.src), alt: htmlText(image.alt) || name };
    }),
  };
}

export function parseSnapshot(value: unknown): CatalogSnapshot {
  const data = record(value);
  if (
    data.version !== 1 ||
    data.source !== 'DISTRICO' ||
    data.endpoint !== PRODUCTS_URL ||
    typeof data.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.fetchedAt))
  ) {
    throw new Error('Formato u origen del archivo no reconocido.');
  }
  const ids = new Set<string>();
  const products = array(data.products).map((value): CatalogProduct => {
    const item = record(value);
    const id = externalId(item.externalId);
    if (ids.has(id)) throw new Error(`Producto duplicado: ${id}.`);
    ids.add(id);
    const name = string(item.name, 1000).trim();
    if (!name) throw new Error('Producto sin nombre valido.');
    const categories = array(item.categories).map((value) => {
      const category = record(value);
      const name = string(category.name, 1000).trim();
      if (!name) throw new Error('Categoria sin nombre valido.');
      return { externalId: externalId(category.externalId), name };
    });
    if (new Set(categories.map((c) => c.externalId)).size !== categories.length)
      throw new Error(`Categorias duplicadas en ${id}.`);
    return {
      externalId: id,
      name,
      sourceUrl: sourceUrl(item.sourceUrl),
      description: string(item.description),
      shortDescription: string(item.shortDescription),
      sourceType: string(item.sourceType, 100),
      publicSku: string(item.publicSku, 200),
      categories,
      images: array(item.images).map((value) => {
        const image = record(value);
        return { url: sourceUrl(image.url), alt: string(image.alt, 2000) };
      }),
    };
  });
  if (!products.length || data.total !== products.length) throw new Error('Catalogo vacio o incompleto.');
  return {
    version: 1,
    source: 'DISTRICO',
    endpoint: PRODUCTS_URL,
    fetchedAt: data.fetchedAt,
    total: products.length,
    products,
  };
}

interface ScrapeOptions {
  pageSize?: number;
  maxPages?: number;
  delayMs?: number;
  fetcher?: typeof fetch;
  wait?: (ms: number) => Promise<unknown>;
  onPage?: (page: number, count: number) => void;
}

export async function scrapeDistrico(options: ScrapeOptions = {}): Promise<CatalogSnapshot> {
  const { pageSize = 50, maxPages = 100, delayMs = 1000, fetcher = fetch, wait = sleep, onPage } = options;
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !Number.isInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 100 ||
    !Number.isFinite(delayMs) ||
    delayMs < 0
  )
    throw new Error('Limites de descarga invalidos.');
  let delay = Math.max(500, delayMs);
  async function request(url: string): Promise<Response> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetcher(url, {
        headers: { 'User-Agent': AGENT, Accept: 'application/json, text/plain' },
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      });
      if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
        const retry = response.headers.get('retry-after');
        const retryMs =
          retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : retry ? Math.max(0, Date.parse(retry) - Date.now()) : 0;
        await response.body?.cancel();
        if (retryMs > 60000) throw new Error('El proveedor solicita una pausa prolongada. Reintentar mas tarde.');
        await wait(Math.max(delay, 1000 * 2 ** attempt, Number.isFinite(retryMs) ? retryMs : 0));
        continue;
      }
      if (!response.ok) throw new Error(`DISTRICO respondio HTTP ${response.status}; descarga detenida.`);
      return response;
    }
    throw new Error('No se pudo leer el catalogo.');
  }
  const robotsUrl = `${ORIGIN}/robots.txt`;
  const robots = robotsParser(robotsUrl, await (await request(robotsUrl)).text());
  const crawlDelay = robots.getCrawlDelay(AGENT);
  if (crawlDelay !== undefined) {
    if (!Number.isFinite(crawlDelay) || crawlDelay > 60)
      throw new Error('Crawl-delay requiere una ejecucion posterior.');
    delay = Math.max(delay, crawlDelay * 1000);
  }
  const products: CatalogProduct[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  let expectedPages: number | undefined;
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(PRODUCTS_URL);
    url.search = new URLSearchParams({
      per_page: String(pageSize),
      page: String(page),
      orderby: 'id',
      order: 'asc',
      catalog_visibility: 'visible',
    }).toString();
    if (robots.isAllowed(url.href, AGENT) !== true) throw new Error('robots.txt no permite consultar este catalogo.');
    await wait(delay);
    const response = await request(url.href);
    const total = response.headers.get('x-wp-total');
    const pages = response.headers.get('x-wp-totalpages');
    if (total !== null || pages !== null) {
      if (total === null || pages === null || !/^\d+$/.test(total) || !/^\d+$/.test(pages))
        throw new Error('Paginacion invalida.');
      if (page === 1) {
        expectedTotal = Number(total);
        expectedPages = Number(pages);
      }
      if (expectedTotal !== Number(total) || expectedPages !== Number(pages))
        throw new Error('El catalogo cambio durante la descarga. Repetir la captura.');
      if (Number(pages) > maxPages)
        throw new Error('El catalogo supera el limite de paginas; no se guardara una captura parcial.');
    } else if (expectedPages !== undefined) throw new Error('Faltan encabezados de paginacion.');
    const batch = array(await response.json());
    if (batch.length > pageSize) throw new Error('La respuesta supera el tamano de pagina solicitado.');
    for (const raw of batch) {
      const item = parseSourceProduct(raw);
      if (ids.has(item.externalId)) throw new Error(`Producto repetido entre paginas: ${item.externalId}.`);
      ids.add(item.externalId);
      products.push(item);
    }
    onPage?.(page, batch.length);
    const finished = expectedPages !== undefined ? page >= expectedPages : batch.length < pageSize;
    if (finished) {
      if (expectedTotal !== undefined && products.length !== expectedTotal)
        throw new Error('Conteo incompleto; no se guardara la captura.');
      return parseSnapshot({
        version: 1,
        source: 'DISTRICO',
        endpoint: PRODUCTS_URL,
        fetchedAt: new Date().toISOString(),
        total: products.length,
        products,
      });
    }
    if (!batch.length) throw new Error('Pagina vacia antes del final del catalogo.');
  }
  throw new Error('Se alcanzo el limite de paginas; no se guardara una captura parcial.');
}
