import { describe, expect, it } from "vitest";
import { affectedAdminQueries } from "../src/lib/admin-query-invalidation";

describe("admin query invalidation", () => {
  it("refreshes only category and product queries after editing the tree", () => {
    expect(affectedAdminQueries("categories/one", "categories/admin")).toBe(true);
    expect(affectedAdminQueries("categories/one", "categories/catalog")).toBe(true);
    expect(affectedAdminQueries("categories/one", "products/admin/list?page=1")).toBe(true);
    expect(affectedAdminQueries("categories/one", "admin/orders/page?page=1")).toBe(false);
  });

  it("refreshes the relevant queue and dashboard without reloading other sections", () => {
    expect(affectedAdminQueries("admin/contact-inquiries/one", "admin/contact-inquiries/page?page=1")).toBe(true);
    expect(affectedAdminQueries("admin/contact-inquiries/one", "admin/dashboard")).toBe(true);
    expect(affectedAdminQueries("admin/contact-inquiries/one", "admin/customers/page?page=1")).toBe(false);
  });

  it("includes public banners after a banner edit", () => {
    expect(affectedAdminQueries("admin/banners/one", "banners")).toBe(true);
    expect(affectedAdminQueries("admin/banners/one", "products/cards?limit=8")).toBe(false);
  });
});
