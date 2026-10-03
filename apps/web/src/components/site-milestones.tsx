"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Milestone = readonly [year: string, title: string, text: string];

// Línea de tiempo con años como pestañas (patrón WAI-ARIA tabs), portada de
// Importadora/src/components/MilestoneTimeline.astro.
export function SiteMilestones({ milestones }: { milestones: readonly Milestone[] }) {
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mantiene el año activo centrado en la pista (sin mover la página).
  useEffect(() => {
    const track = rail.current;
    const tab = tabs.current[active];
    if (!track || !tab) return;
    const left = tab.offsetLeft - (track.clientWidth - tab.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [active]);

  const go = (index: number, focus = false) => {
    const next = Math.min(Math.max(index, 0), milestones.length - 1);
    setActive(next);
    if (focus) tabs.current[next]?.focus({ preventScroll: true });
  };
  const [year, title, text] = milestones[active];

  return (
    <div className="site-milestones">
      <div className="site-milestones-nav">
        <button className="site-milestones-arrow" type="button" aria-label="Hito anterior" disabled={active === 0} onClick={() => go(active - 1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="site-milestones-rail" ref={rail} role="tablist" aria-label="Años de la historia de DISTRICO">
          {milestones.map(([tabYear], index) => (
            <button
              key={tabYear}
              ref={(node) => { tabs.current[index] = node; }}
              id={`hito-tab-${tabYear}`}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls="hito-panel"
              tabIndex={index === active ? 0 : -1}
              onClick={() => go(index)}
              onKeyDown={(event) => {
                const target = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: milestones.length - 1 }[event.key];
                if (target === undefined) return;
                event.preventDefault();
                go(target, true);
              }}
            >
              <span aria-hidden="true" />
              {tabYear}
            </button>
          ))}
        </div>
        <button className="site-milestones-arrow" type="button" aria-label="Hito siguiente" disabled={active === milestones.length - 1} onClick={() => go(active + 1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="site-milestones-panel" id="hito-panel" role="tabpanel" aria-labelledby={`hito-tab-${year}`} key={year}>
        <span className="site-milestones-count" aria-hidden="true">
          {String(active + 1).padStart(2, "0")} / {String(milestones.length).padStart(2, "0")}
        </span>
        <time dateTime={year}>{year}</time>
        <div>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>
    </div>
  );
}
