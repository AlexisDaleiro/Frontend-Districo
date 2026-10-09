import { SalesLine } from '@prisma/client';

type Classification = {
  slug: string;
  name: string;
  salesLine: SalesLine;
  basis: 'UY_OBSERVED' | 'INFERRED';
  note: string;
  sources: string[];
};
const brf = 'https://lfneto.com.br/assets/catalogos/CAT%C3%81LOGO%20BRF.pdf';
const districoCare = 'https://www.districo.com.uy/cuidado-mascotas/';
const petmas = 'https://www.petmas.com.uy/mascotas/alimentos?marca=three-cats';
const grupal = 'https://supermercadosgrupal.com.uy/images/custom/mailing/Ofertas-Supermercados-Grupal-04-2026.pdf';

// Initial channel classification, not exclusivity or permission to buy medication.
export const brandSalesLines: Classification[] = [
  { slug: 'biofresh', name: 'Biofresh', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Catalogo de Puntovet y canal pet del fabricante.', sources: ['https://www.puntovet.com.uy/alimentos', brf] },
  { slug: 'guabi-natural', name: 'Guabi Natural', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Venta en veterinaria Espacio Mascota.', sources: ['https://www.espaciomascota.com.uy/guabi'] },
  { slug: 'three-dogs', name: 'Three Dogs', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Venta en tiendas de mascotas uruguayas.', sources: ['https://tiendapet.uy/categoria-producto/perro/three-dogs/'] },
  { slug: 'three-cats', name: 'Three Cats', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Catalogo local Pet+.', sources: [petmas] },
  { slug: 'gran-plus', name: 'Gran Plus', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Catalogo de Puntovet.', sources: ['https://www.puntovet.com.uy/alimentos'] },
  { slug: 'apolo', name: 'Apolo', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Venta local especializada en alimento para mascotas.', sources: ['https://dogcenter.uy/', brf] },
  { slug: 'atila', name: 'Atila', salesLine: 'SPECIALIZED', basis: 'INFERRED', note: 'Canal pet declarado por BRF; confirmar canal actual de DISTRICO en Uruguay.', sources: [brf, 'https://www.brf-global.com/brf-pet/es/nuestras-marcas/'] },
  { slug: 'balance', name: 'Balance', salesLine: 'COMMERCIAL', basis: 'INFERRED', note: 'Fabricante orientado a supermercados de Brasil; falta confirmacion comercial local.', sources: ['https://www.balance.com.br/'] },
  { slug: 'faro', name: 'Faro', salesLine: 'COMMERCIAL', basis: 'INFERRED', note: 'Canal alimentar declarado por BRF; falta confirmacion comercial local.', sources: [brf] },
  { slug: 'mutts', name: 'Mutts', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Alimento en tienda pet y comercio de consumo masivo.', sources: ['https://aridapet.com/collections/perro-adulto-raza-mediana-y-grande', 'https://www.elclon.com.uy/catalogo/alimento-para-perro-mutts-7k_30774_0'] },
  { slug: 'primocao', name: 'Primocao', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Marca presente en Pet+ y supermercados uruguayos.', sources: [petmas, 'https://www.disco.com.uy/productos/landing/GR_COL_10050', grupal] },
  { slug: 'primogato', name: 'Primogato', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Marca presente en Pet+ y supermercados Grupal.', sources: [petmas, grupal] },
  { slug: 'beny', name: 'Beny', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Veterinaria La Hacienda y supermercado El Dorado.', sources: ['https://www.mercadolibre.com.uy/alimento-seco-beny-para-perro-adulto-de-carne-y-cereales-15-kg/p/MLU61877090', 'https://www.eldorado.com.uy/beny'] },
  { slug: '4pets', name: '4Pets', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Arena de la marca de DISTRICO, no la app homonima; venta en Espacio Mascota.', sources: ['https://www.espaciomascota.com.uy/4pets'] },
  { slug: 'kets', name: 'Kets', salesLine: 'SPECIALIZED', basis: 'INFERRED', note: 'Arena sanitaria del catalogo DISTRICO; asignacion orientativa, sin prueba de exclusividad ni canal minorista local.', sources: ['https://www.districo.com.uy/marcas/kets/'] },
  { slug: 'eco-cane', name: 'Eco Cane', salesLine: 'SPECIALIZED', basis: 'INFERRED', note: 'Arena ecologica del catalogo DISTRICO; confirmar distribucion local por canal.', sources: ['https://www.districo.com.uy/arenas-sanitarias/eco-cane-cat-litter/'] },
  { slug: 'pipicat', name: 'Pipicat', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Oferta de veterinarias y supermercado Ta-Ta.', sources: ['https://listado.mercadolibre.com.uy/pipicat', 'https://www.tata.com.uy/sanitario-para-gatos-pipicat-4-kg/p'] },
  { slug: 'putz', name: 'Putz', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Oferta local de Veterinaria La Hacienda; ficha oficial Kelco.', sources: ['https://www.mercadolibre.com.uy/piedras-sanitarias-aglomerantes-putz-smart-204kg/p/MLU2041544611', 'https://www.kelcopetcare.com.br/para-o-seu-gato/putz/'] },
  { slug: 'procao', name: 'Procao', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Shampoos en TuRacion, tienda especializada local.', sources: ['https://kiosco.turacion.com/shampoos', districoCare] },
  { slug: 'amazonia', name: 'Amazonia', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Shampoos en TuRacion y catalogo de cuidado de DISTRICO.', sources: ['https://kiosco.turacion.com/shampoos', districoCare] },
  { slug: 'proauto', name: 'Proauto', salesLine: 'COMMERCIAL', basis: 'INFERRED', note: 'Fabricante de limpieza automotriz vendido en supermercados; no confundir especializacion automotriz con canal veterinario. Confirmar productos locales.', sources: ['https://proauto.com.br/', 'https://www.districo.com.uy/'] },
  { slug: 'tapet', name: 'TAPET', salesLine: 'SPECIALIZED', basis: 'INFERRED', note: 'Alfombras para mascotas del catalogo DISTRICO; confirmar distribucion local por canal.', sources: ['https://www.districo.com.uy/cuidado-mascotas/educadores/alfombra-de-entrenamiento-para-perros-tapet/'] },
  { slug: 'megazoo', name: 'Megazoo', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Alimento para pequenos animales vendido por Veterinaria La Hacienda.', sources: ['https://www.mercadolibre.com.uy/mega-zoo-alimento-super-premium-para-hamster-y-jerbos-350-gr/up/MLUU2673665463', 'https://megazoo.com.br/where-to-find/'] },
  { slug: 'yowup', name: 'YowUp!', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Venta en tienda local Distripets y TuRacion. No extrapolar supermercados de otros paises.', sources: ['https://distripetsuy.com/', 'https://turacion.com/snacks-premios-y-pates-gato'] },
  { slug: 'lopets', name: 'LoPets', salesLine: 'BOTH', basis: 'UY_OBSERVED', note: 'Snacks en FigaroPet y supermercado Disco.', sources: ['https://www.figaropet.com.uy/shop/creamy-snacks-lopets-para-gatos-331', 'https://www.disco.com.uy/product/snack-cremoso-lopets-para-gato-60g-salmon/379756'] },
  { slug: 'toh', name: 'TOH', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Accesorios en tienda local SUCAN.', sources: ['https://www.sucan.uy/toh?page=2'] },
  { slug: 'nexgard', name: 'NexGard', salesLine: 'SPECIALIZED', basis: 'UY_OBSERVED', note: 'Venta en veterinaria Espacio Mascota; no cambia permisos de medicamentos.', sources: ['https://www.espaciomascota.com.uy/nexgard-2'] },
  { slug: 'stack', name: 'STACK', salesLine: 'COMMERCIAL', basis: 'UY_OBSERVED', note: 'Snacks para consumo humano de DISTRICO presentes en Ta-Ta.', sources: ['https://www.tata.com.uy/palito-de-jamon-stack-450-g/p', 'https://www.districo.com.uy/marcas/stack/'] },
];

export function planBrandSalesLines<T extends { id: string; slug: string; salesLine: SalesLine | null; deletedAt: Date | null }>(brands: T[]) {
  const bySlug = new Map(brandSalesLines.map((entry) => [entry.slug, entry]));
  return brands.flatMap((brand) => {
    const classification = bySlug.get(brand.slug);
    return classification && brand.salesLine === null && brand.deletedAt === null ? [{ brand, classification }] : [];
  });
}
