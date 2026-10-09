"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const revealSelector = [
  ".species-card",
  ".category-tile",
  ".hero:not(.home-carousel-slide) .hero-copy",
  ".hero:not(.home-carousel-slide) .hero-visual",
  ".section-title",
  ".brand-promo",
  ".brand-promo-wide",
  ".product-card",
  ".cta-band",
  ".page-heading",
  ".directory-grid > *",
  ".detail-grid > *",
  ".company-page section",
  ".company-facts dl > div",
  ".company-card",
  ".company-value",
  ".company-operation-card",
  ".company-benefit",
  ".contact-page section",
  ".contact-branch-card",
  ".contact-store-results",
  ".contact-store-card",
  ".auth-layout > *",
  ".auth-layout form > *",
  ".account-panels > *",
  ".cart-item",
  ".cart-layout > .summary",
  ".orders-list > *",
  ".admin-sidebar",
  ".admin-toolbar",
  ".admin-cards > *",
  ".admin-main tbody > tr:not([data-bulk-entry])",
  ".stats > *",
  ".panel",
  ".empty",
  ".error-page > *",
  ".site-story-grid > *",
  ".site-facts > *",
  ".site-purpose-image",
  ".site-purpose-copy",
  ".site-section-heading",
  ".site-line:not([aria-hidden='true'])",
  ".site-product-card:not(.site-product-skeleton)",
  ".site-steps > *",
  ".site-operation-photo",
  ".site-operation-cards > *",
  ".site-timeline > *",
  ".site-news-card",
  ".site-benefits > *",
  ".site-contact-grid > *",
  ".reference-line-copy > *",
  ".reference-line-visual",
].join(", ");

// Entran con un pequeño rebote de escala en vez de subir.
const popSelector = ".need, .brand-word, .stats > *, .site-line";
const parallaxSelector =
  ".hero:not(.home-carousel-slide) .hero-visual img, .company-hero-visual img, .site-story-media img, .site-operation-photo > img";
const lineSelector = ".reference-line";
const staggerSelector =
  ".species-grid, .category-tiles, .brand-promos, .featured-track, .product-grid, .directory-grid, .company-facts dl, .company-card-grid, .contact-branch-grid, .contact-store-list, .auth-layout form, .cart-items, .account-panels, .orders-list, .admin-cards, tbody, .stats, .error-page, .site-line-list, .site-product-grid, .site-facts, .site-steps, .site-operation-cards, .site-news-grid, .site-benefits, .reference-line-copy";

// Mientras corre la transición de página, lo que ya está en pantalla entra con
// ella; solo las grillas escalonan por su cuenta.
const pageTransitionWindow = 450;

const rise: Keyframe[] = [
  { opacity: 0, translate: "0 28px" },
  { opacity: 1, translate: "0 0" },
];
const pop: Keyframe[] = [
  { opacity: 0, scale: "0.82" },
  { opacity: 1, scale: "1" },
];

export function MotionSystem() {
  const pathname = usePathname();
  const navigatedAt = useRef(-Infinity);
  const firstPath = useRef(true);

  // useLayoutEffect: queda registrado antes de que el MutationObserver vea el
  // contenido de la página nueva.
  useLayoutEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    navigatedAt.current = performance.now();
  }, [pathname]);

  useEffect(() => {
    const root = document.getElementById("contenido");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Sin View Transitions la navegación no anima: cada bloque hace su entrada.
    const viewTransitions = typeof document.startViewTransition === "function";
    const seen = new WeakSet<Element>();
    const delays = new WeakMap<Element, number>();
    const parallax = new Set<HTMLElement>();
    const lines = new Set<HTMLElement>();
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    const reveal = (element: Element, animate = true) => {
      if (element.closest("[contenteditable]")) return;
      observer?.unobserve(element);
      element.setAttribute("data-motion-state", "in");
      if (!animate || reduced.matches || !(element instanceof HTMLElement))
        return;
      // "backwards" mantiene el primer cuadro durante el retraso escalonado:
      // sin él la tarjeta se ve, desaparece y recién ahí entra.
      const popping = element.matches(popSelector);
      const lineVisual = element.matches(".reference-line-visual");
      element.animate(lineVisual
        ? [{ opacity: 0, translate: "0 54px", scale: "0.94" }, { opacity: 1, translate: "0 0", scale: "1" }]
        : popping ? pop : rise, {
        duration: lineVisual ? 850 : popping ? 700 : 680,
        delay: delays.get(element) ?? 0,
        easing: popping
          ? "cubic-bezier(0.34, 1.4, 0.64, 1)"
          : "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "backwards",
      });
    };

    const revealAll = () => {
      root
        .querySelectorAll('[data-motion-state="pending"]')
        .forEach((element) => element.setAttribute("data-motion-state", "in"));
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target);
            // Las listas con scroll horizontal (destacados) recortan
            // sus hijos: se revelan juntos con los hermanos de la misma fila.
            const parent = entry.target.parentElement;
            if (!parent?.matches(staggerSelector)) continue;
            for (const sibling of parent.children) {
              if (
                sibling.getAttribute("data-motion-state") === "pending" &&
                sibling.getBoundingClientRect().top < innerHeight
              )
                reveal(sibling);
            }
          }
        },
        // El margen superior amplio revela lo que quedó por encima al
        // desplazarse rápido, para que nada quede oculto. Umbral 0: dentro de
        // listas con scroll propio basta con que asome.
        { rootMargin: "100000px 0px -24px 0px", threshold: 0 },
      );
    }

    const updateParallax = () => {
      frame = 0;
      if (document.hidden || reduced.matches) return;
      for (const element of parallax) {
        if (!element.isConnected) {
          parallax.delete(element);
          continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const center = rect.top + rect.height / 2;
        const progress = Math.max(
          -1,
          Math.min(1, (center - innerHeight / 2) / innerHeight),
        );
        element.style.setProperty(
          "--motion-parallax",
          `${(-progress * 24).toFixed(2)}px`,
        );
      }
      for (const line of lines) {
        if (!line.isConnected) {
          lines.delete(line);
          continue;
        }
        const rect = line.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const progress = Math.max(-1, Math.min(1,
          (rect.top + rect.height / 2 - innerHeight / 2) / ((rect.height + innerHeight) / 2),
        ));
        const distance = innerWidth < 768 ? 22 : 38;
        line.style.setProperty("--line-product-y", `${(-progress * distance).toFixed(2)}px`);
      }
    };

    const scheduleParallax = () => {
      if (!frame && !document.hidden && !reduced.matches)
        frame = requestAnimationFrame(updateParallax);
    };

    const register = (element: Element) => {
      // Rich-text editors own their DOM; animating their rows triggers mutation loops.
      if (element.closest("[contenteditable]")) return;
      if (seen.has(element)) return;
      seen.add(element);
      const parent = element.parentElement;
      const staggered = !!parent?.matches(staggerSelector);
      if (staggered) {
        const index = Array.prototype.indexOf.call(
          parent!.children,
          element,
        ) as number;
        delays.set(element, Math.min(index, 5) * 65);
      }
      if (reduced.matches || !observer) {
        reveal(element, false);
        return;
      }
      const top = element.getBoundingClientRect().top;
      if (top < innerHeight) {
        const navigating =
          viewTransitions &&
          performance.now() - navigatedAt.current < pageTransitionWindow;
        // Lo visible al cargar anima directamente; al navegar, lo mueve la
        // transición de página salvo las grillas escalonadas.
        reveal(element, !navigating || staggered);
        return;
      }
      // Solo se oculta de antemano lo que está por debajo de la pantalla.
      element.setAttribute("data-motion-state", "pending");
      observer.observe(element);
    };

    const scan = (node: ParentNode) => {
      if (node instanceof Element && node.matches(revealSelector))
        register(node);
      node.querySelectorAll(revealSelector).forEach(register);
      if (node instanceof Element && node.matches(parallaxSelector))
        parallax.add(node as HTMLElement);
      node
        .querySelectorAll(parallaxSelector)
        .forEach((element) => parallax.add(element as HTMLElement));
      if (node instanceof Element && node.matches(lineSelector))
        lines.add(node as HTMLElement);
      node
        .querySelectorAll(lineSelector)
        .forEach((element) => lines.add(element as HTMLElement));
      scheduleParallax();
    };

    scan(root);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) scan(node);
        }
      }
    });
    mutations.observe(root, { childList: true, subtree: true });

    const onPreferenceChange = () => {
      if (reduced.matches) {
        observer?.disconnect();
        revealAll();
        root
          .getAnimations({ subtree: true })
          .forEach((animation) => animation.cancel());
        for (const element of parallax)
          element.style.removeProperty("--motion-parallax");
        for (const line of lines) {
          line.style.removeProperty("--line-product-y");
          line.style.removeProperty("--line-glow-y");
          line.style.removeProperty("--line-glow-scale");
          line.style.removeProperty("--line-glow-opacity");
        }
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else scheduleParallax();
    };
    const onVisibilityChange = () => {
      document.documentElement.classList.toggle(
        "motion-tab-hidden",
        document.hidden,
      );
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else scheduleParallax();
    };
    reduced.addEventListener("change", onPreferenceChange);
    window.addEventListener("scroll", scheduleParallax, { passive: true });
    window.addEventListener("resize", scheduleParallax, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange();
    return () => {
      mutations.disconnect();
      observer?.disconnect();
      reduced.removeEventListener("change", onPreferenceChange);
      window.removeEventListener("scroll", scheduleParallax);
      window.removeEventListener("resize", scheduleParallax);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.documentElement.classList.remove("motion-tab-hidden");
      if (frame) cancelAnimationFrame(frame);
      revealAll();
      for (const element of parallax)
        element.style.removeProperty("--motion-parallax");
      for (const line of lines) {
        line.style.removeProperty("--line-product-y");
        line.style.removeProperty("--line-glow-y");
        line.style.removeProperty("--line-glow-scale");
        line.style.removeProperty("--line-glow-opacity");
      }
    };
  }, []);

  return null;
}
