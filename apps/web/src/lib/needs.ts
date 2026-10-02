import type { Entity } from "@/lib/types";

export const needs = [
  {
    name: "Alimentación",
    match: ["alimentacion", "alimentos", "alimento para mascotas"],
    image: "/images/product-0-0.jpg",
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
  },
  {
    name: "Control de plagas",
    match: ["control de plagas", "raticidas"],
    image: "/images/magnis-raticidas-0.png",
  },
] as const;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function mappedNeeds(categories: Entity[] = []) {
  return needs
    .flatMap((need) => {
      const category = categories.find((item) =>
        need.match.some(
          (term) =>
            term === normalize(item.name) ||
            term === normalize(item.slug ?? "").replaceAll("-", " "),
        ),
      );
      return category ? [{ ...need, id: category.id }] : [];
    })
    .filter(
      (need, index, all) =>
        all.findIndex((item) => item.id === need.id) === index,
    );
}
