import type { Entity } from "@/lib/types";
import { catalogCategoryKind, catalogNavigation } from "./catalog-navigation";

type Need = {
  name: string;
  match: readonly string[];
  image: string;
  line?: boolean;
};

export const needs = [
  {
    name: "Perros",
    match: ["perros", "perro"],
    image: "/images/product-0-0.jpg",
    line: true,
  },
  {
    name: "Gatos",
    match: ["gatos", "gato"],
    image: "/images/hero-biofresh-castrados.png",
  },
  {
    name: "Ganadería",
    match: ["ganaderia"],
    image: "/images/raicor-ganaderia-1.png",
  },
  {
    name: "Pequeños animales",
    match: ["pequenos animales"],
    image: "/images/workbook-catalog/product-megazoo-conejos-adultos-0-c14d3def9512.webp",
  },
  {
    name: "Farmacia",
    match: ["farmacia", "medicamentos"],
    image: "/images/raicor-animales-de-compania-0.png",
    line: true,
  },
  {
    name: "Consumo humano",
    match: ["consumo humano"],
    image: "/images/product-3-0.png",
    line: true,
  },
] as const;

const legacyNeeds: Need[] = [
  {
    name: "Alimentación",
    match: ["alimentacion", "alimentos", "alimento para mascotas"],
    image: "/images/product-0-0.jpg",
    line: true,
  },
  {
    name: "Higiene y cuidado",
    match: [
      "higiene",
      "higiene y cuidado",
      "cuidado de la mascota",
      "cuidado mascotas",
    ],
    image: "/images/product-2-1.png",
  },
  {
    name: "Arenas sanitarias",
    match: ["arenas", "arenas sanitarias"],
    image: "/images/product-1-0.jpg",
  },
  {
    name: "Veterinaria",
    match: ["veterinaria", "animales de compania"],
    image: "/images/raicor-animales-de-compania-0.png",
    line: true,
  },
  {
    name: "Ganadería",
    match: ["ganaderia"],
    image: "/images/raicor-ganaderia-0.png",
  },
  {
    name: "Aves y cerdos",
    match: ["aves y cerdos"],
    image: "/images/magnis-aves-y-cerdos-0.jpg",
  },
  {
    name: "Snacks",
    match: ["snacks", "snacks para personas", "snacks para consumo humano"],
    image: "/images/product-3-0.png",
    line: true,
  },
  {
    name: "Control de plagas",
    match: ["control de plagas", "raticidas"],
    image: "/images/magnis-raticidas-0.png",
  },
];
const categoryVisuals: readonly Need[] = [...needs, ...legacyNeeds];

export function mappedNeeds(categories: Entity[] = []) {
  return catalogNavigation(categories).map((category) => {
    const visual = categoryVisuals.find((need) =>
      need.match.some((term) =>
        term === catalogCategoryKind(category.name) ||
        term === catalogCategoryKind(category.slug ?? "").replaceAll("-", " "),
      ),
    );
    return {
      id: category.id,
      name: category.name,
      image: category.imageUrl || visual?.image || "/images/placeholder.svg",
      line: visual?.line ?? false,
    };
  });
}
