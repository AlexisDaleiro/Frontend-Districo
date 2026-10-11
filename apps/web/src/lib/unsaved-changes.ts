"use client";

import { useEffect, useId } from "react";

const dirtyForms = new Set<string>();
export const confirmDiscardChanges = () => window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?");
export const confirmNavigation = () => !dirtyForms.size || confirmDiscardChanges();

export function useUnsavedChanges(dirty: boolean) {
  const id = useId();
  useEffect(() => {
    if (dirty) dirtyForms.add(id);
    else dirtyForms.delete(id);
    return () => { dirtyForms.delete(id); };
  }, [dirty, id]);
}

export function UnsavedChangesGuard() {
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (!dirtyForms.size) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (!dirtyForms.size || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.download || anchor.target === "_blank") return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || target.pathname + target.search === location.pathname + location.search) return;
      if (!confirmDiscardChanges()) { event.preventDefault(); event.stopPropagation(); }
    };
    // Track history entries so a cancelled Back/Forward returns to the same entry.
    const push = history.pushState;
    const replace = history.replaceState;
    let position = Number(history.state?.districoPosition ?? 0);
    let restoring = false;
    replace.call(history, { ...history.state, districoPosition: position }, "");
    history.pushState = function (state, title, url) {
      position += 1;
      push.call(this, { ...state, districoPosition: position }, title, url);
    };
    history.replaceState = function (state, title, url) {
      replace.call(this, { ...state, districoPosition: position }, title, url);
    };
    const pop = (event: PopStateEvent) => {
      const next = Number(event.state?.districoPosition ?? position - 1);
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (dirtyForms.size && !confirmDiscardChanges()) {
        event.stopImmediatePropagation();
        restoring = true;
        history.go(position - next || 1);
      } else position = next;
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
      history.pushState = push;
      history.replaceState = replace;
    };
  }, []);
  return null;
}
