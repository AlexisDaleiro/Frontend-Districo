// Marcas que trabaja DISTRICO (catálogo maestro de marcas, corte 06/10/2026).
// Alimentan la portada y la página /marcas. Las fotos de presentaciones son archivos de public/images.
export const brandLines = [
  ["alimento", "Alimento para mascotas"],
  ["arenas", "Arenas sanitarias"],
  ["cuidado", "Higiene y cuidado"],
  ["snacks-mascotas", "Snacks para mascotas"],
  ["accesorios", "Accesorios"],
  ["farmacia", "Farmacia veterinaria"],
  ["snacks-consumo", "Snacks para personas"],
] as const;

export type BrandLine = (typeof brandLines)[number][0];

export type BrandProduct = { name: string; image: string };

export type SiteBrand = {
  name: string;
  /** Slug de public/images/brands; sin logo oficial se muestra el nombre. */
  logo?: string;
  line: BrandLine;
  species: string;
  relation: string;
  description: string;
  products?: readonly BrandProduct[];
  /** Foto ambiente de public/images/brand-panels para el panel de marcas destacadas. */
  photo?: string;
};

const p = (name: string, image: string): BrandProduct => ({ name, image: `/images/${image}` });

export const siteBrands: readonly SiteBrand[] = [
  { name: "Biofresh", logo: "biofresh", line: "alimento", species: "Perros y gatos", relation: "Representación", photo: "guabi-natural.jpg",
    description: "Súper premium con alta inclusión de ingredientes frescos: mix de carnes, frutas, legumbres y hierbas, por etapa de vida y tamaño de raza.",
    products: [
      p("Cachorros razas medianas", "product-0-0.jpg"),
      p("Adultos razas pequeñas y mini", "product-0-3.png"),
      p("Senior razas grandes y gigantes", "product-0-2.png"),
      p("Gatos castrados", "hero-biofresh-castrados.png"),
    ] },
  { name: "Mutts", logo: "mutts", line: "alimento", species: "Perros", relation: "Representación", description: "Alimento para perros." },
  { name: "Primocão", logo: "primocao", line: "alimento", species: "Perros", relation: "Representación exclusiva", photo: "granplus.jpg",
    description: "La línea de Hercosul que DISTRICO importa en exclusiva para Uruguay desde 2004, junto con Primogato para gatos.",
    products: [p("Primocão Cachorros", "landing-lines/products/alimento-3.webp"), p("Primogato Gatitos", "landing-lines/products/alimento-4.webp")] },
  { name: "Apolo", logo: "apolo", line: "alimento", species: "Perros", relation: "Representación", description: "Alimento para perros." },
  { name: "Primogato", logo: "primogato", line: "alimento", species: "Gatos", relation: "Representación exclusiva",
    description: "La línea felina de Hercosul, junto a Primocão desde 2004.",
    products: [p("Primogato Gatitos", "landing-lines/products/alimento-4.webp")] },
  { name: "Átila", logo: "atila", line: "alimento", species: "Perros", relation: "Representación", description: "Átila y Átila Mix para perros." },
  { name: "Beny", logo: "beny", line: "alimento", species: "Perros y gatos", relation: "Representación",
    description: "Alimento para perros y gatos adultos de todas las razas.",
    products: [p("Beny gatos adultos", "landing-lines/products/alimento-1.webp")] },
  { name: "Three Dogs", logo: "three-dogs", line: "alimento", species: "Perros", relation: "Representación", description: "Líneas Super Premium y Original para perros." },
  { name: "Three Cats", logo: "three-cats", line: "alimento", species: "Gatos", relation: "Representación", description: "Líneas Super Premium y Original para gatos." },
  { name: "Guabi Natural", line: "alimento", species: "Perros y gatos", relation: "Distribución", description: "Alimento natural para perros y gatos." },
  { name: "Gran Plus", logo: "gran-plus", line: "alimento", species: "Perros y gatos", relation: "Distribución",
    description: "Gran Plus, Gran Plus Choice y Gourmet.",
    products: [p("Gran Plus Gourmet", "landing-lines/products/alimento-5.webp")] },
  { name: "Balance", line: "alimento", species: "Perros y gatos", relation: "Importación y distribución", description: "Alimento seco y húmedo para perros y gatos." },
  { name: "Faro", line: "alimento", species: "Perros y gatos", relation: "Importación y distribución", description: "Alimento húmedo: patés y sobres." },
  { name: "Megazoo", line: "alimento", species: "Conejos y cobayas", relation: "Importación y distribución", description: "Alimento para conejos y cobayas." },
  { name: "Eco Cane", logo: "eco-cane", line: "arenas", species: "Gatos", relation: "Comercialización", description: "Arena sanitaria para gatos." },
  { name: "Putz", logo: "putz", line: "arenas", species: "Gatos", relation: "Comercialización", description: "Sanitario granulado para gatos." },
  { name: "Pipicat", logo: "pipicat", line: "arenas", species: "Gatos", relation: "Comercialización", photo: "pipicat.jpg",
    description: "Arena sanitaria en variantes Classic, Campestre, Floral, Multi-Cat y Ultra Dry.",
    products: [
      p("Pipicat Classic", "landing-lines/arenas.webp"),
      p("Pipicat Campestre", "landing-lines/products/arenas-2.webp"),
      p("Pipicat Floral", "landing-lines/products/arenas-4.webp"),
    ] },
  { name: "4PETS", logo: "4pets", line: "arenas", species: "Gatos", relation: "Comercialización", description: "Arena sanitaria para gatos.",
    products: [p("4PETS arena sanitaria", "landing-lines/products/arenas-1.webp")] },
  { name: "KETS", logo: "kets", line: "arenas", species: "Gatos", relation: "Comercialización", description: "Arena sanitaria para gatos.",
    products: [p("Kets Tropical 4 kg", "product-1-1.jpg")] },
  { name: "Procão", logo: "procao", line: "cuidado", species: "Perros", relation: "Distribución", photo: "procao.jpg",
    description: "Colonias, shampoos y tapetes higiénicos de Trading Care Brasil, que DISTRICO distribuye en Uruguay.",
    products: [
      p("Colonia Cachorros", "landing-lines/products/cuidado-1.webp"),
      p("Colonia Hembra", "landing-lines/products/cuidado-2.webp"),
      p("Shampoo Cachorros", "landing-lines/products/cuidado-4.webp"),
      p("Shampoo Neutro", "landing-lines/cuidado.webp"),
      p("Tapetes higiénicos x30", "product-2-1.png"),
    ] },
  { name: "Proauto", line: "cuidado", species: "Mascotas", relation: "Distribución", description: "Línea de cuidado de Trading Care Brasil." },
  { name: "Amazonia", logo: "amazonia", line: "cuidado", species: "Perros y gatos", relation: "Distribución", description: "Cuidado e higiene natural y vegana." },
  { name: "TAPET", line: "cuidado", species: "Perros", relation: "Comercialización", description: "Alfombras de entrenamiento para perros.",
    products: [p("TAPET tapetes higiénicos x30", "product-2-0.png")] },
  { name: "YowUp!", line: "snacks-mascotas", species: "Perros y gatos", relation: "Importación y distribución", description: "Snacks funcionales y lácteos.",
    products: [
      p("Yogurt Digestive", "landing-lines/snacks-mascotas.webp"),
      p("Bone Broth de vacuno", "landing-lines/products/snacks-mascotas-2.webp"),
      p("Kéfir Flora Plus", "landing-lines/products/snacks-mascotas-4.webp"),
    ] },
  { name: "LoPets", line: "snacks-mascotas", species: "Gatos", relation: "Marca registrada", description: "Creamy snacks para gatos.",
    products: [
      p("Creamy Snack atún bonito", "landing-lines/products/snacks-mascotas-1.webp"),
      p("Creamy Snack katsuobushi y atún", "landing-lines/products/snacks-mascotas-3.webp"),
    ] },
  { name: "TOH", line: "accesorios", species: "Perros y gatos", relation: "Distribución", description: "Pecheras, correas y collares.",
    products: [
      p("Collar Breakaway para gatos", "landing-lines/products/accesorios-1.webp"),
      p("Correa de soga 1,20 m", "landing-lines/products/accesorios-2.webp"),
      p("Pechera antitirones", "landing-lines/products/accesorios-3.webp"),
    ] },
  { name: "NexGard", line: "farmacia", species: "Perros y gatos", relation: "Distribución", description: "Antiparasitario para perros y gatos." },
  { name: "Stack", logo: "stack", line: "snacks-consumo", species: "Personas", relation: "Marca propia", photo: "stack.jpg",
    description: "Nuestra marca propia de snacks para consumo humano, con varios años en el mercado uruguayo.",
    products: [
      p("Palitos sabor cebolla", "landing-lines/products/snacks-humanos-2.webp"),
      p("Papas acanaladas", "landing-lines/products/snacks-humanos-3.webp"),
      p("Papas sabor barbacoa", "landing-lines/products/snacks-humanos-4.webp"),
      p("Papas sabor cebolla", "landing-lines/products/snacks-humanos-5.webp"),
    ] },
];

export const featuredBrandNames = ["Biofresh", "Primocão", "Pipicat", "Procão", "Stack"] as const;

export const lineLabel = (line: BrandLine) => brandLines.find(([id]) => id === line)![1];

export const brandCatalogHref = (brand: SiteBrand) => `/productos?search=${encodeURIComponent(brand.name)}`;
