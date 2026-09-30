"use client";

import { useEffect } from "react";

const revealSelector = [
  ".needs-intro",
  ".need",
  ".hero:not(.home-carousel-slide) .hero-copy",
  ".hero:not(.home-carousel-slide) .hero-visual",
  ".benefits > div",
  ".section-title",
  ".line-card",
  ".brand-word",
  ".product-card",
  ".cta-band",
  ".page-heading",
  ".directory-grid > *",
  ".detail-grid > *",
  ".company-page section",
  ".company-card",
  ".company-value",
  ".company-operation-card",
  ".company-benefit",
  ".contact-page section",
  ".contact-branch-card",
  ".contact-store-results",
  ".auth-layout > *",
  ".account-panels > *",
  ".cart-item",
  ".cart-layout > .summary",
  ".orders-list > *",
  ".admin-sidebar",
  ".admin-toolbar",
  ".admin-cards > *",
  ".stats > *",
  ".panel",
].join(", ");

const parallaxSelector =
  ".hero:not(.home-carousel-slide) .hero-visual img, .company-hero-visual img";
const staggerSelector =
  ".need-list, .benefits, .line-grid, .brand-list, .product-grid, .directory-grid, .company-card-grid, .contact-branch-grid, .account-panels, .orders-list, .admin-cards, .stats";

export function MotionSystem() {
  useEffect(() => {
    const root = document.getElementById("contenido");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<Element>();
    const delays = new WeakMap<Element, number>();
    const parallax = new Set<HTMLElement>();
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    const reveal = (element: Element) => {
      observer?.unobserve(element);
      if (!reduced.matches && element instanceof HTMLElement) {
        element.animate(
          [
            { opacity: 0, translate: "0 22px" },
            { opacity: 1, translate: "0 0" },
          ],
          {
            duration: 620,
            delay: delays.get(element) ?? 0,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          },
        );
      }
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) reveal(entry.target);
          }
        },
        { rootMargin: "0px 0px -24px 0px", threshold: 0.04 },
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
          `${(-progress * 20).toFixed(2)}px`,
        );
      }
    };

    const scheduleParallax = () => {
      if (!frame && !document.hidden && !reduced.matches)
        frame = requestAnimationFrame(updateParallax);
    };

    const register = (element: Element) => {
      if (seen.has(element)) return;
      seen.add(element);
      const parent = element.parentElement;
      if (parent?.matches(staggerSelector)) {
        const index = Array.prototype.indexOf.call(
          parent.children,
          element,
        ) as number;
        delays.set(element, Math.min(index, 5) * 65);
      }
      if (reduced.matches || !observer) reveal(element);
      else observer.observe(element);
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
        root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
        for (const element of parallax)
          element.style.removeProperty("--motion-parallax");
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else {
        root.querySelectorAll(revealSelector).forEach((element) => {
          if (seen.has(element)) observer?.observe(element);
        });
        scheduleParallax();
      }
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
      root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      for (const element of parallax)
        element.style.removeProperty("--motion-parallax");
    };
  }, []);

  return null;
}
