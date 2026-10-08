import { expect, it } from "vitest";
import { adminRecordHref, readAdminListValue, safeAdminListReturn, updateAdminListValue } from "../src/lib/admin-list-navigation";

it("restores URL values with defaults and rejects malformed pages, roles and dates", () => {
  const params = new URLSearchParams("page=3&search=mail%2Btest%40example.test&withoutStock=true&status=ACTIVE&role=custom%3Ar1");
  expect(readAdminListValue(params, "page", 1)).toBe(3);
  expect(readAdminListValue(params, "search", "")).toBe("mail+test@example.test");
  expect(readAdminListValue(params, "withoutStock", false)).toBe(true);
  expect(readAdminListValue(params, "status", "", ["", "ACTIVE"])).toBe("ACTIVE");
  expect(readAdminListValue(params, "role", "")).toBe("custom:r1");
  for (const value of ["-1", "0", "NaN", "2.5", "Infinity", "999999999999"]) expect(readAdminListValue(new URLSearchParams({ page: value }), "page", 1)).toBe(1);
  for (const value of ["2026-02-31", "no-date", "01/01/2026"]) expect(readAdminListValue(new URLSearchParams({ dateFrom: value }), "dateFrom", "")).toBe("");
  expect(readAdminListValue(new URLSearchParams("role=invalid"), "role", "")).toBe("");
  expect(readAdminListValue(new URLSearchParams("status=INVALID"), "status", "", ["", "ACTIVE"])).toBe("");
});
it("updates one filter, preserves others, resets page and distinguishes empty from default", () => {
  const params = new URLSearchParams("page=4&brandId=b1&categoryId=c1&search=foo");
  const changed = updateAdminListValue(params, "search", "a+b & c", "");
  expect(changed.get("brandId")).toBe("b1"); expect(changed.get("categoryId")).toBe("c1");
  expect(changed.has("page")).toBe(false); expect(params.get("page")).toBe("4");
  expect(updateAdminListValue(changed, "page", 2, 1).get("page")).toBe("2");
  expect(updateAdminListValue(new URLSearchParams(), "status", "", "PENDING").get("status")).toBe("");
  expect(updateAdminListValue(changed, "withoutStock", false, false).has("withoutStock")).toBe(false);
});
it("return URLs stay within the expected admin list, never external destinations or scripts", () => {
  const fallback = "/tienda/admin/clientes";
  for (const value of ["https://evil.test/tienda/admin/clientes", "//evil.test/tienda/admin/clientes", "javascript:alert(1)", "/tienda/admin/clientes/other", "/tienda/admin/personal?search=x", "/tienda/admin/clientes#other", "/tienda/admin/clientes\\evil"]) expect(safeAdminListReturn(value, "clientes")).toBe(fallback);
  const list = `${fallback}?page=2&search=mail%2Btest%40example.test`;
  expect(safeAdminListReturn(list, "clientes")).toBe(list);
  const record = adminRecordHref("/tienda/admin/clientes/c1#credit", list);
  expect(new URL(record, "https://example.test").searchParams.get("back")).toBe(list);
  expect(record).toMatch(/#credit$/);
});
