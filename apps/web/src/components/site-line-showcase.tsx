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
  const stage = useRef<HTMLButtonElement>(null);
  const tiltFrame = useRef<number | null>(null);
  const pendingTilt = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hold, setHold] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [tilted, setTilted] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(true);
  const count = products.length;
  const current = products[active];

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setMotionAllowed(!preference.matches);
      if (!preference.matches) return;
      setStopped(true);
      setTilted(false);
      if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
      tiltFrame.current = null;
      stage.current?.style.removeProperty("--product-tilt-x");
      stage.current?.style.removeProperty("--product-tilt-y");
      stage.current?.style.removeProperty("--product-lift");
    };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => {
      preference.removeEventListener("change", updatePreference);
      if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    };
  }, []);

  useEffect(() => {
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

  const queueTilt = (x: number, y: number) => {
    pendingTilt.current = { x, y };
    if (tiltFrame.current !== null) return;
    tiltFrame.current = requestAnimationFrame(() => {
      tiltFrame.current = null;
      const { x: nextX, y: nextY } = pendingTilt.current;
      stage.current?.style.setProperty("--product-tilt-x", `${(-nextY * 6).toFixed(2)}deg`);
      stage.current?.style.setProperty("--product-tilt-y", `${(nextX * 9).toFixed(2)}deg`);
      stage.current?.style.setProperty("--product-lift", `${(-(Math.abs(nextX) + Math.abs(nextY)) * 3).toFixed(2)}px`);
    });
  };

  return (
    <div
      className="reference-showcase"
      ref={root}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHold(false);
      }}
    >
      <button
        className="reference-showcase-stage"
        ref={stage}
        type="button"
        aria-label={`Inclinar producto: ${current.alt}`}
        aria-pressed={tilted}
        disabled={!motionAllowed}
        onPointerMove={(event) => {
          if (!motionAllowed || event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          queueTilt(((event.clientX - bounds.left) / bounds.width - .5) * 2, ((event.clientY - bounds.top) / bounds.height - .5) * 2);
        }}
        onPointerLeave={() => queueTilt(tilted ? .65 : 0, tilted ? -.5 : 0)}
        onClick={() => {
          const next = !tilted;
          setTilted(next);
          setStopped(true);
          queueTilt(next ? .65 : 0, next ? -.5 : 0);
        }}
      >
        <span className="reference-line-ring" aria-hidden="true" />
        {products.map((product, index) => (
          <span key={product.src} className={`reference-showcase-item${index === active ? " is-active" : ""}`} aria-hidden={index !== active}>
            <Picture src={product.src} alt={index === active ? product.alt : ""} loading="lazy" sizes="(max-width: 767px) 60vw, 26vw" />
          </span>
        ))}
      </button>
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
