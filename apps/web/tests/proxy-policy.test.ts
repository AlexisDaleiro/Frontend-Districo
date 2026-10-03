import { describe, expect, it } from "vitest";
import { allowedPath } from "../src/lib/proxy-policy";

describe("admin catalog and marketing proxy routes", () => {
  it("exposes only staff role configuration routes", () => {
    expect(allowedPath("admin/staff/access", "GET")).toBe(true);
    expect(allowedPath("admin/staff/access/SALES", "PATCH")).toBe(true);
    expect(allowedPath("admin/staff/access/CLIENT", "PATCH")).toBe(false);
    expect(allowedPath("admin/staff/roles", "POST")).toBe(true);
    expect(allowedPath("admin/staff/roles/custom-1/access", "PATCH")).toBe(true);
    expect(allowedPath("admin/staff/roles/custom-1/access", "GET")).toBe(false);
  });
  it("allows private application-document download only through the admin route", () => {
    expect(allowedPath("applications", "POST")).toBe(true);
    expect(allowedPath("admin/applications/app-1/documents/doc-1", "GET")).toBe(true);
    expect(allowedPath("applications/app-1/documents/doc-1", "GET")).toBe(false);
  });
  it("allows only the intended image upload and logo management methods", () => {
    expect(allowedPath("products/product-1/media/upload", "POST")).toBe(true);
    expect(allowedPath("brands/brand-1/logo", "POST")).toBe(true);
    expect(allowedPath("laboratories/lab-1/logo", "DELETE")).toBe(true);
    expect(allowedPath("products/product-1/media/upload", "GET")).toBe(false);
    expect(allowedPath("brands/brand-1/logo/../../secret", "POST")).toBe(false);
  });

  it("allows editing and retiring commercial rules", () => {
    expect(allowedPath("promotions/promo-1", "PATCH")).toBe(true);
    expect(allowedPath("promotions/promo-1/deactivate", "PATCH")).toBe(true);
    expect(allowedPath("promotions/expiration/expiry-1", "DELETE")).toBe(true);
    expect(allowedPath("recommendations/rule-1/active", "PATCH")).toBe(true);
    expect(allowedPath("recommendations/rule-1", "DELETE")).toBe(true);
  });
});
