"use client";

import { useQuery } from "@tanstack/react-query";

// La API no guarda ficha técnica ni características principales: salen de
// public/data/fichas-tecnicas.json (scripts/fichas-tecnicas.mts), indexado por
// el sourceUrl de cada producto.
export type TechnicalBlock = { label: string; html?: string; text?: string };
export type ProductSheet = {
  technical?: TechnicalBlock[];
  benefits?: { icon: string; label: string }[];
};

const sheetKey = (url?: string) => url?.toLowerCase().replace(/\/+$/, "");

export function useProductSheet(sourceUrl?: string): ProductSheet {
  const key = sheetKey(sourceUrl);
  const sheets = useQuery({
    queryKey: ["fichas-tecnicas"],
    queryFn: async () => {
      const response = await fetch("/data/fichas-tecnicas.json");
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as Record<string, ProductSheet>;
    },
    enabled: Boolean(key),
    staleTime: Infinity,
  });
  return (key && sheets.data?.[key]) || {};
}

export function TechnicalAccordions({ blocks }: { blocks: TechnicalBlock[] }) {
  return blocks.map((block) => (
    <details className="tech-acc" key={block.label}>
      <summary>{block.label}</summary>
      {block.html ? (
        // HTML propio, validado contra una lista de etiquetas al generarlo.
        <div
          className="tech-acc-body"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      ) : (
        <div className="tech-acc-body">
          <p>{block.text}</p>
          <p className="tech-acc-note">
            Los ingredientes se listan en orden de proporción en la fórmula.
          </p>
        </div>
      )}
    </details>
  ));
}
