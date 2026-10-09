import type { SalesLine } from "./types";

export const salesLineOptions: { value: SalesLine; label: string }[] = [
  { value: "SPECIALIZED", label: "Línea especializada" },
  { value: "COMMERCIAL", label: "Línea comercial" },
  { value: "BOTH", label: "Ambos" },
];

export function isSalesLine(value: unknown): value is SalesLine {
  return salesLineOptions.some((option) => option.value === value);
}

export function salesLineLabel(value?: SalesLine | null) {
  return salesLineOptions.find((option) => option.value === value)?.label;
}
