// Marcas que distribuye DISTRICO: alimentan el carrusel de la landing y la página /marcas.
export const brandLines = [
  ["alimento", "Alimento para mascotas"],
  ["arenas", "Arenas sanitarias"],
  ["cuidado", "Cuidado de la mascota"],
  ["snacks-consumo", "Snacks para consumo humano"],
  ["accesorios", "Accesorios"],
  ["snacks-mascotas", "Snacks para mascotas"],
  ["farmacia", "Farmacia y Laboratorio"],
] as const;

export type BrandLine = (typeof brandLines)[number][0];

export const siteBrands: readonly { name: string; logo?: string; color: string; line: BrandLine }[] = [
  { name: "Gran Plus", logo: "gran-plus.png", color: "#84152a", line: "alimento" },
  { name: "Biofresh", logo: "biofresh.png", color: "#5b8474", line: "alimento" },
  { name: "Three Dogs", logo: "three-dogs.png", color: "#6d82aa", line: "alimento" },
  { name: "TOH", color: "#b96b4d", line: "accesorios" },
  { name: "Procão", logo: "procao.png", color: "#a5ad59", line: "cuidado" },
  { name: "Three Cats", logo: "three-cats.png", color: "#a07652", line: "alimento" },
  { name: "Stack", logo: "stack.png", color: "#bb777e", line: "snacks-consumo" },
  { name: "Guabi Natural", color: "#81a166", line: "alimento" },
  { name: "Primocão", logo: "primocao.png", color: "#9b7657", line: "alimento" },
  { name: "Primogato", logo: "primogato.png", color: "#808aa2", line: "alimento" },
  { name: "YowUp", color: "#5e96b2", line: "snacks-mascotas" },
  { name: "LoPets", color: "#ab7777", line: "snacks-mascotas" },
  { name: "Pipicat", logo: "pipicat.png", color: "#6c9ca0", line: "arenas" },
  { name: "Beny", logo: "beny.png", color: "#aa8c51", line: "alimento" },
  { name: "4 Pets", logo: "4pets.png", color: "#7a9262", line: "arenas" },
  { name: "Raicor", color: "#7479af", line: "farmacia" },
];
