"use client";

import { useEffect } from "react";

export function SiteTimelineMotion() {
  useEffect(() => {
    const timeline = document.querySelector<HTMLElement>(".site-timeline");
    if (!timeline) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (document.hidden) return;
      if (reduced.matches) {
        timeline.style.setProperty("--timeline-progress", "1");
        return;
      }
      const box = timeline.getBoundingClientRect();
      const distance = box.height + innerHeight * 0.45;
      const progress = Math.min(
        1,
        Math.max(0, (innerHeight * 0.72 - box.top) / distance),
      );
      timeline.style.setProperty("--timeline-progress", progress.toFixed(3));
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);
  return null;
}
