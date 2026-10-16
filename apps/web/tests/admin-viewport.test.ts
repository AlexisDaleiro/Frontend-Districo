import { afterEach, expect, it, vi } from "vitest";
import { adminViewportPath, preserveAdminViewport } from "../src/lib/admin-viewport";

afterEach(() => vi.unstubAllGlobals());

it("uses the same viewport key for Summary with or without its trailing slash", () => {
  expect(adminViewportPath("/tienda/admin/")).toBe("/tienda/admin");
  expect(adminViewportPath("/tienda/admin")).toBe("/tienda/admin");
  expect(adminViewportPath("/")).toBe("/");
  const main = { dataset: {} as Record<string, string>, style: { minHeight: "" }, getBoundingClientRect: () => ({ top: -500 }) };
  vi.stubGlobal("document", { querySelector: () => main });
  vi.stubGlobal("window", { location: { href: "https://store.example/tienda/admin/catalogo" }, scrollY: 700, innerHeight: 844 });
  preserveAdminViewport("/tienda/admin/?from=catalog");
  expect(main.dataset.preserveViewport).toBe("/tienda/admin");
  expect(main.style.minHeight).toBe("1344px");
});
