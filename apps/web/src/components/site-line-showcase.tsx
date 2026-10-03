"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Picture } from "./ui";

type Product = { src: string; alt: string; brand: string };

const STEP_MS = 3800;

// Un producto por vez sobre el anillo: el que sale baja y se desvanece, el que
// entra sube con una leve escala. Rota solo con la sección en pantalla y se frena
// con puntero o foco adentro; elegir una miniatura lo lleva a ese producto y
// detiene la rotación.
export function SiteLineShowcase({ products, offset }: { products: readonly Product[]; offset: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hold, setHold] = useState(false);
  const [stopped, setStopped] = useState(false);
  const count = products.length;
  const current = products[active];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setStopped(true);
    const node = root.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || hold || stopped) return;
    // El desfase por línea evita que todas cambien en el mismo instante.
    let timer = window.setTimeout(function tick() {
      if (!document.hidden) setActive((index) => (index + 1) % count);
      timer = window.setTimeout(tick, STEP_MS);
    }, STEP_MS + offset);
    return () => window.clearTimeout(timer);
  }, [visible, hold, stopped, count, offset]);

  return (
    <div
      className="reference-showcase"
      ref={root}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div className="reference-showcase-stage">
        <span className="reference-line-ring" aria-hidden="true" />
        {products.map((product, index) => (
          <div key={product.src} className={`reference-showcase-item${index === active ? " is-active" : ""}`} aria-hidden={index !== active}>
            <Picture src={product.src} alt={index === active ? product.alt : ""} loading="lazy" sizes="(max-width: 767px) 60vw, 26vw" />
          </div>
        ))}
      </div>
      <div className="reference-showcase-thumbs" role="group" aria-label="Elegir producto">
        {products.map((product, index) => (
          <button
            key={product.src}
            type="button"
            aria-label={`Mostrar ${product.alt}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => { setStopped(true); setActive(index); }}
          >
            <Picture src={product.src} alt="" loading="lazy" sizes="56px" />
          </button>
        ))}
      </div>
      <Link className="reference-line-brand" href={`/productos?search=${encodeURIComponent(current.brand)}`}>
        Distribuimos {current.brand} <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
