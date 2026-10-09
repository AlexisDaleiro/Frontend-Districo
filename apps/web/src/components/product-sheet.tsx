"use client";

import type { TechnicalBlock } from "@/lib/types";

export function TechnicalAccordions({ blocks }: { blocks: TechnicalBlock[] }) {
  return blocks.map((block) => (
    <details className="tech-acc" key={block.label}>
      <summary>{block.label}</summary>
      {block.html ? (
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
      )}
    </details>
  ));
}
