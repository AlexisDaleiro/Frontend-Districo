import { htmlText } from './districo';
import { productReference } from './taxonomy-references';

export type Species = 'dog' | 'cat' | 'cattle' | 'sheep' | 'horse' | 'pig' | 'bird' | 'small';
export type TaxonomyProduct = {
  id: string; name: string; sourceUrl?: string | null; shortDescription?: string | null;
  description?: string | null; productType: string;
  categories: { category: { name: string } }[];
};
export type TaxonomyCategory = { key: string; name: string; parent?: string; reuse?: string };

export const taxonomyCategories: TaxonomyCategory[] = [
  { key: 'perros', name: 'Perros', reuse: 'Perros' },
  { key: 'gatos', name: 'Gatos', reuse: 'Gatos' },
  { key: 'ganaderia', name: 'Ganader\u00eda', reuse: 'Ganader\u00eda' },
  { key: 'pequenos-animales', name: 'Peque\u00f1os animales' },
  { key: 'farmacia', name: 'Farmacia', reuse: 'Medicamentos' },
  { key: 'consumo-humano', name: 'Consumo humano', reuse: 'Snacks para consumo humano' },
  { key: 'alimento-perro', name: 'Alimento para perro', parent: 'perros', reuse: 'Alimento para perro' },
  { key: 'alimento-gato', name: 'Alimento para gato', parent: 'gatos', reuse: 'Alimento para gato' },
  { key: 'arneses-perro', name: 'Arneses para perro', parent: 'perros' },
  { key: 'arneses-gato', name: 'Arneses para gato', parent: 'gatos' },
  { key: 'snacks-perro', name: 'Snacks para perros', parent: 'perros' },
  { key: 'snacks-gato', name: 'Snacks para gatos', parent: 'gatos' },
  { key: 'higiene-perro', name: 'Higiene para perros', parent: 'perros' },
  { key: 'higiene-gato', name: 'Higiene para gatos', parent: 'gatos' },
  { key: 'accesorios-perro', name: 'Accesorios para perros', parent: 'perros' },
  { key: 'accesorios-gato', name: 'Accesorios para gatos', parent: 'gatos' },
  { key: 'salud-perro', name: 'Salud de perros', parent: 'perros' },
  { key: 'salud-gato', name: 'Salud de gatos', parent: 'gatos' },
  { key: 'arenas', name: 'Arenas sanitarias', parent: 'gatos', reuse: 'Arenas sanitarias' },
  { key: 'bovinos', name: 'Bovinos', parent: 'ganaderia' },
  { key: 'ovinos', name: 'Ovinos', parent: 'ganaderia' },
  { key: 'equinos', name: 'Equinos', parent: 'ganaderia', reuse: 'Equinos' },
  { key: 'porcinos', name: 'Porcinos', parent: 'ganaderia' },
  { key: 'conejos-roedores', name: 'Conejos y roedores', parent: 'pequenos-animales', reuse: 'Peque\u00f1os mam\u00edferos' },
  { key: 'aves', name: 'Aves', parent: 'pequenos-animales' },
  { key: 'farmacia-perros', name: 'Medicamentos para perros', parent: 'farmacia' },
  { key: 'farmacia-gatos', name: 'Medicamentos para gatos', parent: 'farmacia' },
  { key: 'farmacia-pequenos', name: 'Medicamentos para peque\u00f1os animales', parent: 'farmacia' },
  { key: 'farmacia-aves', name: 'Medicamentos para aves', parent: 'farmacia-pequenos' },
  { key: 'farmacia-roedores', name: 'Medicamentos para conejos y roedores', parent: 'farmacia-pequenos' },
  { key: 'farmacia-ganado', name: 'Medicamentos para ganado', parent: 'farmacia' },
  { key: 'farmacia-bovinos', name: 'Bovinos', parent: 'farmacia-ganado' },
  { key: 'farmacia-ovinos', name: 'Ovinos', parent: 'farmacia-ganado' },
  { key: 'farmacia-equinos', name: 'Equinos', parent: 'farmacia-ganado' },
  { key: 'farmacia-porcinos', name: 'Porcinos', parent: 'farmacia-ganado' },
  { key: 'plagas', name: 'Control de plagas y ambientes', parent: 'farmacia', reuse: 'Raticidas' },
  { key: 'por-verificar', name: 'Especie por verificar', parent: 'farmacia' },
  { key: 'manies', name: 'Man\u00edes', parent: 'consumo-humano', reuse: 'Man\u00edes' },
  { key: 'papas', name: 'Papas', parent: 'consumo-humano', reuse: 'Papas' },
  { key: 'palitos', name: 'Palitos', parent: 'consumo-humano', reuse: 'Palitos' },
  { key: 'packs', name: 'Packs', parent: 'consumo-humano', reuse: 'Packs' },
];

const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const patterns: Record<Species, RegExp> = {
  dog: /\b(perr[oa]s?|canin[oa]s?|dogs?|caes|cao)\b/,
  cat: /\b(gat[oa]s?|felin[oa]s?|cats?)\b/,
  cattle: /\b(bovin[oa]s?|vacun[oa]s?|vacas?|terneros?|novillos?|cattle)\b/,
  sheep: /\b(ovin[oa]s?|ovejas?|corderos?|sheep)\b/,
  horse: /\b(equin[oa]s?|caballos?|yeguas?|potros?|horses?)\b/,
  pig: /\b(porcin[oa]s?|suinos?|cerdos?|lechones?|pigs?)\b/,
  bird: /\b(aves?|pollos?|pollitos?|gallinas?|pavos?|canarios?|psitacidos?|birds?)\b/,
  small: /\b(conejos?|roedores?|hamsters?|hamsteres|cobayas?|cobayos?|coelhos|cuises|chinchillas?)\b/,
};

export function indicationText(product: TaxonomyProduct): string {
  const clean = htmlText(product.description ?? '').replace(/\[\/?et_[^\]]*\]/g, '');
  // Ingredients, withdrawal periods and contraindications are NOT target species.
  const description = clean.split(/\b(?:composici[o\u00f3]n|ingredientes|dosificaci[o\u00f3]n|dosis y pauta|contraindicaciones|precauciones|per[i\u00ed]odo de retiro|tiempo de retiro|tabla nutricional)\b/i)[0];
  const dose = clean.split(/\bdosificaci[o\u00f3]n\b/i)[1]?.split(/\b(?:contraindicaciones|precauciones|per[i\u00ed]odo de retiro|tiempo de retiro)\b/i)[0] ?? '';
  const speciesLabels = dose.match(/\b(?:Perros|Gatos|Caninos|Felinos|Bovinos|Ovinos|Equinos|Porcinos|Cerdos|Aves|Conejos)\s*:/gi)?.join(' ') ?? '';
  return `${product.name}. ${product.shortDescription ?? ''}. ${description}. ${speciesLabels}`;
}

export function classifyProduct(product: TaxonomyProduct) {
  const categories = product.categories.map((link) => normalized(link.category.name));
  const url = product.sourceUrl ?? '';
  const text = normalized(indicationText(product));
  const paths = new Set<string>();
  const evidence: { species: Species; text: string }[] = [];
  if (/snacks-para-consumo-humano/.test(url) || categories.includes('snacks para consumo humano') || categories.includes('consumo humano')) {
    paths.add(categories.includes('manies') ? 'manies' : categories.includes('palitos') ? 'palitos' : categories.includes('packs') ? 'packs' : 'papas');
    return { paths: [...paths], species: [] as Species[], evidence, pending: false, sourceUrl: url };
  }
  if (categories.includes('raticidas') || /\braticida|desinfectante.*ambient|storm (?:caja|balde|1kg)/.test(text)) {
    paths.add('plagas');
    return { paths: [...paths], species: [] as Species[], evidence, pending: false, sourceUrl: url };
  }
  const food = product.productType === 'FOOD' || categories.some((c) => /alimento|nutricion/.test(c)) || /\b(?:hpm (?:cat|dog|diet)|alimento (?:seco|extrusado)|yogur|galletas)\b/.test(text);
  const hygiene = categories.some((c) => /higiene|shampoo|acondicionador|pet spray|educadores|arenas/.test(c)) || /\b(?:shampoo|acondicionador|pasta dental|aquadent|veggiedent|alfombra|arena sanitaria)\b/.test(text);
  const accessory = product.productType === 'ACCESSORY' || /\b(?:arnes|arneses|correa|collar de paseo)\b/.test(text);
  const pharmacy = !food && !hygiene && !accessory;
  const sentences = text.split(/(?<=[.!?;])\s+|\n+/).filter((sentence) => !/\b(?:no usar|no (?:se )?(?:debe|deber|usar|utilizar|aplicar|administrar)|no recomendado|contraindicado|toxic[oa]|prohibido|evitar (?:su )?uso)\b/.test(sentence));
  for (const [species, pattern] of Object.entries(patterns) as [Species, RegExp][]) {
    // In feeds, animal proteins never imply the intended consumer species.
    const matches = sentences.filter((sentence) => pattern.test(sentence) && (!food || new RegExp(`\\bpara (?:los |las )?(?:${pattern.source.replace(/\\b/g, '')})`).test(sentence)));
    const title = normalized(product.name);
    const titleMatch = pattern.test(title) && (!food || ['dog', 'cat'].includes(species) || new RegExp(`\\bpara (?:${pattern.source.replace(/\\b/g, '')})`).test(title));
    const urlMatch = (species === 'dog' && /(?:\/(?:perros|caes)\/|para-perros)/.test(url)) || (species === 'cat' && /(?:\/gatos\/|para-gatos)/.test(url));
    if (!matches.length && !titleMatch && !urlMatch) continue;
    evidence.push({ species, text: matches[0]?.slice(0, 180) ?? product.name });
  }
  const reference = productReference(product.name);
  if (reference) {
    evidence.splice(0, evidence.length, ...reference.species.map((species) => ({ species, text: `Especie publicada por el fabricante: ${reference.url}` })));
  }
  if (categories.includes('equinos') && !evidence.some((entry) => entry.species === 'horse')) evidence.push({ species: 'horse', text: 'Categoria publicada por el proveedor: Equinos' });
  const species = evidence.map((item) => item.species);
  if (categories.includes('arenas sanitarias') && !species.includes('cat')) {
    species.push('cat');
    evidence.push({ species: 'cat', text: 'Categoria de origen: Arenas sanitarias' });
  }
  for (const target of species) {
    if (target === 'dog' || target === 'cat') {
      const suffix = target === 'dog' ? 'perro' : 'gato';
      const prefix = pharmacy ? 'salud' : /\barnes/.test(text) ? 'arneses' : accessory ? 'accesorios' : hygiene ? 'higiene' : /\b(?:snack|galletas?|bocados?|bocaditos?|masticables|yogur)\b/.test(text) ? 'snacks' : food ? 'alimento' : 'salud';
      paths.add(categories.includes('arenas sanitarias') ? 'arenas' : `${prefix}-${suffix}`);
      if (pharmacy) paths.add(target === 'dog' ? 'farmacia-perros' : 'farmacia-gatos');
    } else {
      const key = ({ cattle: 'bovinos', sheep: 'ovinos', horse: 'equinos', pig: 'porcinos', bird: 'aves', small: 'conejos-roedores' } as const)[target];
      paths.add(key);
      if (pharmacy) paths.add(target === 'small' ? 'farmacia-roedores' : `farmacia-${key}`);
    }
  }
  if (!paths.size) paths.add('por-verificar');
  return { paths: [...paths], species, evidence, pending: !species.length, sourceUrl: url, referenceUrl: reference?.url };
}

export const DEMO_INFORMATION_TAG = 'INFORMACION_DEMO_2026';

export function legacyCategoryLinks(products: { id: string; categories: { categoryId: string }[] }[], categories: { id: string; parentId: string | null }[], retiredIds: Set<string>) {
  const parents = new Map(categories.map((category) => [category.id, category.parentId]));
  return products.flatMap((product) => {
    const existing = new Set(product.categories.map((link) => link.categoryId));
    const legacy = new Set<string>();
    for (const link of product.categories) {
      const visited = new Set<string>();
      let parent = parents.get(link.categoryId);
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        if (retiredIds.has(parent) && !existing.has(parent)) legacy.add(parent);
        parent = parents.get(parent);
      }
    }
    return [...legacy].map((categoryId) => ({ productId: product.id, categoryId }));
  });
}

export function missingProductInformation(product: TaxonomyProduct) {
  const sourceText = htmlText(product.shortDescription ?? '').trim();
  const description = htmlText(product.description ?? '').replace(/\[\/?et_[^\]]*\]/g, '').trim();
  return {
    description: !description ? sourceText || `Ficha de demostracion de ${product.name}. Presentaciones y condiciones comerciales disponibles en esta tienda. Para indicaciones de uso, consultar exclusivamente la ficha original del proveedor.` : undefined,
    shortDescription: !sourceText ? description ? description.split(/(?<=[.!?])\s/)[0].slice(0, 240) : `Producto de demostracion: ${product.name}.` : undefined,
  };
}
