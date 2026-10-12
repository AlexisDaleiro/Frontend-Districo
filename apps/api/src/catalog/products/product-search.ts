import { Prisma } from "@prisma/client";

const synonymGroups = [
  ["alimento", "comida", "racion", "ración", "balanceado"],
  ["humedo", "húmedo", "wet"],
  ["seco", "dry"],
  ["arnes", "arnés", "pretal"],
  ["arena", "sanitaria", "sanitario"],
  ["antipulgas", "pulgas"],
  ["champu", "champú", "shampoo"],
];
const key = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function searchTerms(search: string): string[][] {
  return search
    .trim()
    .split(/\s+/)
    .filter(
      (term) =>
        !["de", "para", "con", "y", "el", "la"].includes(term.toLowerCase()),
    )
    .slice(0, 8)
    .map((term) => [
      ...new Set([
        term,
        ...(synonymGroups.find((group) =>
          group.some((word) => key(word) === key(term)),
        ) ?? []),
      ]),
    ]);
}
export function productSearchWhere(
  search?: string,
): Prisma.ProductWhereInput[] {
  if (!search?.trim()) return [];
  return searchTerms(search).map((terms) => ({
    OR: terms.flatMap((term): Prisma.ProductWhereInput[] => [
      { name: { contains: term, mode: "insensitive" } },
      {
        variants: {
          some: {
            active: true,
            deletedAt: null,
            OR: [
              { sku: { contains: term, mode: "insensitive" } },
              { ean: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      },
      { brand: { name: { contains: term, mode: "insensitive" } } },
      { laboratory: { name: { contains: term, mode: "insensitive" } } },
    ]),
  }));
}
