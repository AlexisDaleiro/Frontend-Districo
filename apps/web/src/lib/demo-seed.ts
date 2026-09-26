import catalog from "@/data/catalog.json";
import type { Customer, Entity, Product, User } from "./types";
export const categories: Entity[] = [
  { id: "alimentacion", name: "Alimentación", slug: "alimentacion" },
  { id: "arenas", name: "Arenas sanitarias", slug: "arenas" },
  { id: "higiene", name: "Higiene y cuidado", slug: "higiene" },
  { id: "snacks", name: "Snacks para personas", slug: "snacks" },
  { id: "veterinaria", name: "Veterinaria", slug: "veterinaria" },
  { id: "ganaderia", name: "Ganadería", slug: "ganaderia" },
  { id: "aves-y-cerdos", name: "Aves y cerdos", slug: "aves-y-cerdos" },
  { id: "raticidas", name: "Control de plagas", slug: "raticidas" },
];
export function seedProducts(): Product[] {
  return catalog.map((record, index) => {
    const id = `demo-product-${index}`;
    const brandName =
      record.source !== "DISTRICO"
        ? undefined
        : record.name.startsWith("BIOFRESH")
          ? "Biofresh"
          : record.category === "snacks"
            ? "Stack"
            : record.name.startsWith("4PETS")
              ? "4PETS"
              : record.name.startsWith("KETS")
                ? "Kets"
                : record.name.includes("Procão")
                  ? "Procão"
                  : undefined;
    const restricted = ["veterinaria", "ganaderia", "aves-y-cerdos"].includes(
      record.category,
    );
    return {
      id,
      name: record.name,
      slug: record.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, ""),
      source: record.source,
      sourceUrl: record.sourceUrl,
      shortDescription: record.name,
      description: `Producto del catálogo de ${record.source}. Consultá la información original del proveedor para conocer su presentación y características.`,
      productType: ["alimentacion", "snacks"].includes(record.category)
        ? "FOOD"
        : restricted
          ? "MEDICATION"
          : ["higiene", "arenas"].includes(record.category)
            ? "HYGIENE"
            : "OTHER",
      brand: brandName
        ? {
            id: brandName.toLowerCase(),
            name: brandName,
            slug: brandName.toLowerCase(),
          }
        : null,
      laboratory: null,
      categories: [
        {
          categoryId: record.category,
          category: categories.find((c) => c.id === record.category),
        },
      ],
      attributes: [],
      requiresMedicationPermission: restricted,
      featured: index < 4,
      active: true,
      media: [
        {
          id: `media-${index}`,
          url: record.image,
          type: "IMAGE",
          alt: record.name,
          isPrimary: true,
        },
      ],
      variants: [
        {
          id: `variant-${index}`,
          name: "Presentación de demostración",
          sku: `DEMO-${String(index + 1).padStart(4, "0")}`,
          presentation: "Unidad de prueba · confirmar presentación comercial",
          availableStock: 40,
          physicalStock: 40,
          reservedStock: 0,
          saleMultiple: record.category === "snacks" ? 5 : 1,
          minimumOrderQuantity: record.category === "snacks" ? 5 : 1,
          active: true,
          price: { amount: 390 + index * 85, currency: "UYU" },
        },
      ],
    };
  });
}
export function seedUsers(): User[] {
  const make = (
    id: string,
    email: string,
    businessName: string,
    medicationPermission: boolean,
    creditStatus = "GOOD_STANDING",
  ): User => {
    const account: Customer = {
      id: `account-${id}`,
      businessName,
      legalName: `${businessName} (ficticio)`,
      rut: `DEMO-${id}`,
      accountStatus: "APPROVED",
      creditStatus,
      medicationPermission,
    };
    return {
      id,
      email,
      role: "CLIENT",
      active: true,
      permissions: [
        "CAN_VIEW_PRICES",
        "CAN_PLACE_ORDERS",
        ...(medicationPermission ? ["CAN_BUY_MEDICATIONS" as const] : []),
      ],
      customerAccount: account,
    };
  };
  return [
    {
      id: "admin",
      email: "admin@districo.com",
      role: "ADMIN",
      permissions: [],
      active: true,
    },
    make("normal", "cliente@gmail.com", "Pet Shop Demo", false),
    make("med", "clientemed@gmail.com", "Veterinaria Demo", true),
    make(
      "review",
      "clientepago@gmail.com",
      "Comercio Demo",
      false,
      "PAYMENT_PENDING",
    ),
  ];
}
