"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { benefitIcons } from "@/lib/benefit-icons";
import type { ProductSheet, TechnicalBlock } from "@/lib/types";

function TechnicalBody({ block }: { block: TechnicalBlock }) {
  return block.html ? (
    // The API strips executable content and unsafe attributes before storing HTML.
    <div
      className="tech-acc-body"
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  ) : (
    <div className="tech-acc-body">
      <p style={{ whiteSpace: "pre-line" }}>{block.text}</p>
      {/composici[oó]n|ingredientes/i.test(block.label) && <p className="tech-acc-note">
        Los ingredientes se listan en orden de proporción en la fórmula.
      </p>}
    </div>
  );
}

export function TechnicalAccordions({ blocks }: { blocks: TechnicalBlock[] }) {
  return blocks.map((block) => (
    <details className="tech-acc" key={block.label}>
      <summary>{block.label}</summary>
      <TechnicalBody block={block} />
    </details>
  ));
}

export type ProductSection = { id: string; title: string; body: ReactNode };

export const technicalSections = (blocks: TechnicalBlock[]): ProductSection[] =>
  blocks.map((block, index) => ({
    id: `tecnica-${index}`,
    title: block.label,
    body: <TechnicalBody block={block} />,
  }));

// Pestañas verticales desde 900px; en móvil la misma estructura es un acordeón.
export function ProductSections({ sections }: { sections: ProductSection[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.id ?? null);
  return (
    <div
      className="product-sections"
      style={{ gridTemplateRows: `repeat(${sections.length}, auto) 1fr` }}
    >
      {sections.map((section) => (
        <Fragment key={section.id}>
          <h3 className="product-section-head">
            <button
              type="button"
              aria-expanded={open === section.id}
              aria-controls={`seccion-${section.id}`}
              onClick={() =>
                setOpen((current) =>
                  current === section.id &&
                  !window.matchMedia("(min-width: 900px)").matches
                    ? null
                    : section.id,
                )
              }
            >
              {section.title}
              <ChevronDown size={20} aria-hidden="true" />
            </button>
          </h3>
          <div
            className="product-section-body"
            id={`seccion-${section.id}`}
            hidden={open !== section.id}
          >
            {section.body}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function BenefitList({
  benefits,
  className = "",
}: {
  benefits: ProductSheet["benefits"];
  className?: string;
}) {
  const items = (benefits ?? []).filter((b) => benefitIcons[b.icon]);
  if (!items.length) return null;
  return (
    <ul className={`benefit-list ${className}`}>
      {items.map((benefit) => (
        <li key={benefit.label}>
          <svg
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            // Trazos fijos de src/lib/benefit-icons.ts, no datos externos.
            dangerouslySetInnerHTML={{ __html: benefitIcons[benefit.icon] }}
          />
          <span>{benefit.label}</span>
        </li>
      ))}
    </ul>
  );
}
