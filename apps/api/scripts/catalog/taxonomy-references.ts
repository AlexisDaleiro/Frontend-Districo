import type { Species } from './store-taxonomy';

type Reference = { pattern: RegExp; species: Species[]; url: string };
// References are limited to the named product family, never to its entire brand.
export const taxonomyReferences: Reference[] = [
  { pattern: /^veggiedent\b/i, species: ['dog'], url: 'https://uy.virbac.com/products/higiene-oral/veggiedent' },
  { pattern: /^lufectomax\b/i, species: ['dog'], url: 'https://uy.virbac.com/products/antiparasitarios-internos/lufectomax-duo' },
  { pattern: /^complephos\b/i, species: ['cattle', 'pig'], url: 'https://uy.virbac.com/products/vitaminicos-y-minerales/COMPLEPHOS' },
  { pattern: /^advocin\b/i, species: ['cattle'], url: 'https://ar.zoetis.com/products/bovinos/' },
  { pattern: /^terracortril spray\b/i, species: ['cattle', 'pig', 'horse', 'dog', 'cat', 'bird'], url: 'https://ar.zoetis.com/products/terra-cortril-spray.aspx' },
  { pattern: /^revolution.*6%/i, species: ['dog', 'cat'], url: 'https://ar.zoetis.com/products/caninos/revolution-6.aspx' },
  { pattern: /^mastin shampoo\b/i, species: ['dog', 'cat'], url: 'https://uy.virbac.com/productos/higiene-y-dermatologia/mastin-line-shampoo' },
  { pattern: /^shampoo (?:pelos negros procao|y acondicionador hierba de santa maria procao)\b/i, species: ['dog', 'cat'], url: 'https://www.procao.ind.br/pt/collections/higiene' },
  { pattern: /^shampoo neutro procao/i, species: ['dog', 'cat'], url: 'https://www.procao.ind.br/products/shampoo-procao-neutro-500-ml' },
  { pattern: /^shampoo cachorros procao/i, species: ['dog', 'cat'], url: 'https://www.procao.ind.br/products/shampoo-filhotes-500-ml' },
  { pattern: /^shampoo citronela procao/i, species: ['dog', 'cat'], url: 'https://www.procao.ind.br/pt/collections/cao/products/shampoo-citronela-500-ml' },
  { pattern: /^draxxin kp/i, species: ['cattle'], url: 'https://www.zoetisus.com/products/cattle/draxxin-kp/' },
  { pattern: /^revolution.*12%/i, species: ['dog'], url: 'https://ar.zoetis.com/products/caninos/revolution-12.aspx' },
  { pattern: /^simparica\s+(?:10|20|40|80|120)\s*mg\b/i, species: ['dog'], url: 'https://www.zoetis.com/global-assets/private/simparica_pi_final.pdf' },
  { pattern: /^cortavance 76/i, species: ['dog'], url: 'https://vet-uk.virbac.com/home/products/dogs/dermatology/cortavance.html' },
  { pattern: /^alizin\b/i, species: ['dog'], url: 'https://uy.virbac.com/productos/reproductiva/alizin' },
  { pattern: /^rabigen monodosis/i, species: ['dog', 'cat'], url: 'https://uy.virbac.com/productos/vacunas/rabigen-mono' },
  { pattern: /^feligen crp\/r/i, species: ['cat'], url: 'https://uy.virbac.com/products/vacunas/feligen-crp-r' },
  { pattern: /^bovisan lepto 8/i, species: ['cattle', 'sheep', 'pig'], url: 'https://uy.virbac.com/productos/reproductiva/bovisan-lepto-8' },
  { pattern: /^ricofull\b/i, species: ['cattle'], url: 'https://uy.virbac.com/productos/antibioticos/ricofull' },
  { pattern: /^(?:dorafull(?: top)?|carb up|effipro bovis|maxflor la|mexiver max mt|mexiver (?=\d)|reactimast|rilexine 500n|tubertest|curacef duo|complevit iny)\b/i, species: ['cattle'], url: 'https://uy.virbac.com/home/bovinos.html' },
  { pattern: /^(?:cuasan oral|mexiver triple|ectisan|mexiver nitro|clostrisan(?: 9\+t)?|duplex|nitrometionina|neumosan|carbusan|diclotrin)\b/i, species: ['sheep'], url: 'https://uy.virbac.com/home/ovinos.html' },
  { pattern: /^(?:totalject(?: mc)?|hidrotiazena|micoidena|shotapen la|tetanic|complevit oral)\b/i, species: ['horse'], url: 'https://uy.virbac.com/home/equinos.html' },
];

export function productReference(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return taxonomyReferences.find((reference) => reference.pattern.test(normalized));
}
