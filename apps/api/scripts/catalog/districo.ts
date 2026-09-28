import { parseDocument } from 'htmlparser2';
import robotsParser from 'robots-parser';
import { setTimeout as sleep } from 'node:timers/promises';
import { catalogConfig, CatalogSource } from './sources';

export const ORIGIN = catalogConfig('DISTRICO').origin;
export const PRODUCTS_URL = catalogConfig('DISTRICO').endpoint;
const AGENT = 'DistricoCatalogImporter/1.0';
const UNAVAILABLE_ROBOTS_STATUSES = [403, 404, 410];

interface RobotsCheck {
  url: string;
  httpStatus: number;
  checkedAt: string;
  handling: 'rules' | 'unavailable-rfc9309';
}

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
  source: CatalogSource;
  endpoint: string;
  fetchedAt: string;
  total: number;
  products: CatalogProduct[];
  robots?: RobotsCheck;
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

export function sourceUrl(value: unknown, source: CatalogSource = 'DISTRICO'): string {
  const config = catalogConfig(source);
  const url = new URL(string(value, 4096));
  if (
    url.protocol !== 'https:' ||
    !config.hosts.some((host) => host === url.hostname) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error(`URL fuera del catalogo permitido de ${source}.`);
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

export function parseSourceProduct(value: unknown, source: CatalogSource = 'DISTRICO'): CatalogProduct {
  const item = record(value);
  const name = htmlText(item.name);
  if (!name || name.length > 1000) throw new Error('Producto sin nombre valido.');
  return {
    externalId: externalId(item.id),
    sourceUrl: sourceUrl(item.permalink, source),
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
      return { url: sourceUrl(image.src, source), alt: htmlText(image.alt) || name };
    }),
  };
}

export function parseSnapshot(value: unknown): CatalogSnapshot {
  const data = record(value);
  const config = catalogConfig(data.source);
  if (
    data.version !== 1 ||
    data.endpoint !== config.endpoint ||
    typeof data.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.fetchedAt))
  ) {
    throw new Error('Formato u origen del archivo no reconocido.');
  }
  let robots: RobotsCheck | undefined;
  if (data.robots !== undefined) {
    const check = record(data.robots);
    if (
      check.url !== `${config.origin}/robots.txt` ||
      typeof check.httpStatus !== 'number' ||
      !Number.isInteger(check.httpStatus) ||
      typeof check.checkedAt !== 'string' ||
      !Number.isFinite(Date.parse(check.checkedAt)) ||
      !(
        (check.handling === 'rules' && check.httpStatus >= 200 && check.httpStatus < 300) ||
        (check.handling === 'unavailable-rfc9309' && UNAVAILABLE_ROBOTS_STATUSES.includes(check.httpStatus))
      )
    ) throw new Error('Registro de consulta de robots.txt invalido.');
    robots = {
      url: check.url as string,
      httpStatus: check.httpStatus,
      checkedAt: check.checkedAt,
      handling: check.handling as RobotsCheck['handling'],
    };
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
      sourceUrl: sourceUrl(item.sourceUrl, config.source),
      description: string(item.description),
      shortDescription: string(item.shortDescription),
      sourceType: string(item.sourceType, 100),
      publicSku: string(item.publicSku, 200),
      categories,
      images: array(item.images).map((value) => {
        const image = record(value);
        return { url: sourceUrl(image.url, config.source), alt: string(image.alt, 2000) };
      }),
    };
  });
  if (!products.length || data.total !== products.length) throw new Error('Catalogo vacio o incompleto.');
  return {
    version: 1,
    source: config.source,
    endpoint: config.endpoint,
    fetchedAt: data.fetchedAt,
    total: products.length,
    products,
    ...(robots ? { robots } : {}),
  };
}

interface ScrapeOptions {
  pageSize?: number;
  maxPages?: number;
  delayMs?: number;
  fetcher?: typeof fetch;
  wait?: (ms: number) => Promise<unknown>;
  onPage?: (page: number, count: number) => void;
  allowUnavailableRobots?: boolean;
  onWarning?: (message: string) => void;
}

export async function scrapeDistrico(options: ScrapeOptions = {}): Promise<CatalogSnapshot> {
  return scrapeCatalog('DISTRICO', options);
}

export async function scrapeCatalog(source: CatalogSource, options: ScrapeOptions = {}): Promise<CatalogSnapshot> {
  const config = catalogConfig(source);
  const {
    pageSize = 50, maxPages = 100, delayMs = 1000, fetcher = fetch, wait = sleep,
    onPage, allowUnavailableRobots = false, onWarning,
  } = options;
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
  async function request(url: string, isRobots = false): Promise<Response> {
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
      if (!response.ok && !(isRobots && allowUnavailableRobots && UNAVAILABLE_ROBOTS_STATUSES.includes(response.status)))
        throw new Error(`${source} respondio HTTP ${response.status} en ${new URL(url).pathname}; descarga detenida.`);
      return response;
    }
    throw new Error('No se pudo leer el catalogo.');
  }
  const robotsUrl = `${config.origin}/robots.txt`;
  const robotsResponse = await request(robotsUrl, true);
  const robotsCheck: RobotsCheck = {
    url: robotsUrl,
    httpStatus: robotsResponse.status,
    checkedAt: new Date().toISOString(),
    handling: robotsResponse.ok ? 'rules' : 'unavailable-rfc9309',
  };
  const robots = robotsResponse.ok ? robotsParser(robotsUrl, await robotsResponse.text()) : undefined;
  if (!robots) {
    // RFC 9309 2.3.1.3 permits public reads when robots is unavailable; never ignore catalog errors.
    await robotsResponse.body?.cancel();
    onWarning?.(`${source}: robots.txt no disponible (HTTP ${robotsResponse.status}); consulta publica explicita segun RFC 9309.`);
  }
  const crawlDelay = robots?.getCrawlDelay(AGENT);
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
    const url = new URL(config.endpoint);
    url.search = new URLSearchParams({
      per_page: String(pageSize),
      page: String(page),
      orderby: 'id',
      order: 'asc',
      catalog_visibility: 'visible',
    }).toString();
    if (robots && robots.isAllowed(url.href, AGENT) !== true) throw new Error('robots.txt no permite consultar este catalogo.');
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
      const item = parseSourceProduct(raw, source);
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
        source,
        endpoint: config.endpoint,
        fetchedAt: new Date().toISOString(),
        total: products.length,
        products,
        robots: robotsCheck,
      });
    }
    if (!batch.length) throw new Error('Pagina vacia antes del final del catalogo.');
  }
  throw new Error('Se alcanzo el limite de paginas; no se guardara una captura parcial.');
}
