import { describe, expect, it } from "vitest";
import { allowedPath } from "../src/lib/proxy-policy";

describe("admin catalog and marketing proxy routes", () => {
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
