import type { Attribute } from "./types";

export const petStage = (attributes: Attribute[] = []) =>
  attributes.find((attribute) => attribute.active !== false && attribute.slug === "etapa");

export const juvenileStageId = (attributes: Attribute[] = []) =>
  petStage(attributes)?.values.find((value) => value.slug === "cachorro-gatito")?.id;

export const demoPetStage: Attribute = {
  id: "demo-etapa", name: "Etapa", slug: "etapa", active: true,
  values: [
    { id: "demo-etapa-juvenil", value: "Cachorro / gatito", slug: "cachorro-gatito" },
    { id: "demo-etapa-adulto", value: "Adulto", slug: "adulto" },
    { id: "demo-etapa-senior", value: "Senior", slug: "senior" },
    { id: "demo-etapa-todas", value: "Todas las etapas", slug: "todas-las-etapas" },
  ],
};
