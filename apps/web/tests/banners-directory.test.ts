import { describe, expect, it } from "vitest";
import { validBannerDestination } from "../src/lib/banners";
import { filterDirectory } from "../src/lib/entity-directory";

describe("banner placement", () => {
  it("isolates ecommerce destinations and rejects unsafe internal-looking URLs", () => {
    expect(validBannerDestination("/marcas", "INSTITUTIONAL")).toBe(true);
    expect(validBannerDestination("/", "INSTITUTIONAL")).toBe(true);
    expect(validBannerDestination("/marcas", "ECOMMERCE")).toBe(false);
    expect(validBannerDestination("/tienda/productos?brandId=uno", "ECOMMERCE")).toBe(true);
    for (const path of ["//evil.test", "/\\evil.test", "/tienda/../../externo", "/%2fevil.test", "javascript:alert(1)"]) expect(validBannerDestination(path, "ECOMMERCE")).toBe(false);
  });
});
describe("organization directory", () => {
  const items = [{ id: "a", name: "Álamo", active: true, imageUrl: "logo" }, { id: "b", name: "Beta", active: false }, { id: "c", name: "Cerezo", active: true }];
  it("combines accent-insensitive search, state, logo and ordering without mutating data", () => {
    expect(filterDirectory(items, "alamo", "active", "with", "asc").map((item) => item.id)).toEqual(["a"]);
    expect(filterDirectory(items, "", "inactive", "without", "asc").map((item) => item.id)).toEqual(["b"]);
    expect(filterDirectory(items, "", "", "", "desc").map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(items[0].id).toBe("a");
  });
});
