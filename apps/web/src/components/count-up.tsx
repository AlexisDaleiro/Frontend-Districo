"use client";

import { useEffect, useRef } from "react";

const reducedQuery = "(prefers-reduced-motion: reduce)";

// Conteo animado solo visual: el valor final se renderiza desde el servidor y
// es el que leen los lectores de pantalla; los números intermedios se escriben
// en un span oculto a la accesibilidad cuando el elemento entra en pantalla.
export function CountUp({
  value,
  from = 0,
  suffix = "",
  grouping = true,
  duration = 1100,
}: {
  value: number;
  from?: number;
  suffix?: string;
  grouping?: boolean;
  duration?: number;
}) {
  const visual = useRef<HTMLSpanElement>(null);
  const format = (n: number) =>
    `${Math.round(n).toLocaleString("es-UY", { useGrouping: grouping })}${suffix}`;
  const final = format(value);

  useEffect(() => {
    const element = visual.current;
    if (!element || value === from) return;
    if (window.matchMedia(reducedQuery).matches) return;
    // Se reescribe el nodo de texto que creó React para no romper sus
    // referencias al volver a renderizar.
    const write = (text: string) => {
      if (element.firstChild) element.firstChild.nodeValue = text;
      else element.textContent = text;
    };
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic: arranca rápido y frena al llegar.
        const eased = 1 - (1 - t) ** 3;
        write(format(from + (value - from) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      write(format(from));
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Si todavía no se ve, se deja listo en el valor inicial para que el
    // conteo arranque desde ahí sin saltos.
    if (element.getBoundingClientRect().top >= innerHeight) write(format(from));
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      write(final);
    };
    // format depende solo de suffix y grouping, que ya están en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, from, suffix, grouping, duration]);

  return (
    <span className="count-up">
      <span aria-hidden="true" ref={visual}>
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
