import { describe, expect, it } from "vitest";
import { brandLogoSrc } from "../src/lib/brand-logos";

describe("brand logos", () => {
  it("matches known brand slugs to their assets", () => {
    expect(brandLogoSrc("biofresh")).toBe("/images/brands/biofresh.png");
    expect(brandLogoSrc("three-dogs")).toBe("/images/brands/three-dogs.png");
    expect(brandLogoSrc("primocao")).toBe("/images/brands/primocao.png");
  });

  it("keeps the brand name when no matching logo was supplied", () => {
    expect(brandLogoSrc("guabi-natural")).toBeNull();
    expect(brandLogoSrc("gran-natural")).toBeNull();
    expect(brandLogoSrc(undefined)).toBeNull();
  });
});
