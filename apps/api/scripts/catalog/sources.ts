export const CATALOG_SOURCES = {
  DISTRICO: { origin: 'https://www.districo.com.uy', hosts: ['www.districo.com.uy', 'districo.com.uy'] },
  RAICOR: { origin: 'https://raicor.com.uy', hosts: ['raicor.com.uy', 'www.raicor.com.uy'] },
  MAGNIS: { origin: 'https://magnis.com.uy', hosts: ['magnis.com.uy', 'www.magnis.com.uy'] },
} as const;

export type CatalogSource = keyof typeof CATALOG_SOURCES;

export function parseCatalogSource(value: unknown): CatalogSource {
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(CATALOG_SOURCES, value)) {
    throw new Error('Origen de catalogo invalido. Usar DISTRICO, RAICOR o MAGNIS.');
  }
  return value as CatalogSource;
}

export function catalogConfig(value: unknown) {
  const source = parseCatalogSource(value);
  const config = CATALOG_SOURCES[source];
  return {
    ...config,
    source,
    endpoint: `${config.origin}/wp-json/wc/store/v1/products`,
    slugPrefix: `${source.toLowerCase()}-web`,
  };
}
