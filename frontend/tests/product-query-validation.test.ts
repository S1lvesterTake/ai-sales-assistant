import { formatRupiah } from "@/lib/format";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import {
  parseProductSearchParams,
  productPageHref,
} from "@/lib/products/query";
import {
  productSchema,
  updateProductSchema,
} from "@/lib/products/validation";

describe("product query and validation", () => {
  it("normalizes bounded URL filters and pagination", () => {
    const parsed = parseProductSearchParams({
      page: "2",
      category: "  Kopi  ",
      isAvailable: "false",
    });

    expect(parsed).toEqual({
      filters: { category: "Kopi", availability: "unavailable" },
      query: { page: 2, limit: 10, category: "Kopi", isAvailable: false },
    });
    expect(productPageHref(3, parsed.filters)).toBe(
      "/dashboard/products?page=3&category=Kopi&isAvailable=false",
    );
  });

  it("falls back from invalid URL values and bounds category length", () => {
    const parsed = parseProductSearchParams({
      page: "-10",
      category: "x".repeat(120),
      isAvailable: "invalid",
    });

    expect(parsed.query.page).toBe(1);
    expect(parsed.filters.category).toHaveLength(100);
    expect(parsed.filters.availability).toBe("all");
    expect(productPageHref(1, { category: "", availability: "all" })).toBe(
      "/dashboard/products",
    );
  });

  it("accepts zero price and rejects missing, negative, decimal, and oversized values", () => {
    expect(
      productSchema.safeParse({
        name: "Produk gratis",
        price: 0,
        isAvailable: true,
      }).success,
    ).toBe(true);
    expect(
      productSchema.safeParse({ price: 0, isAvailable: true }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        name: "Produk",
        price: -1,
        isAvailable: true,
      }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        name: "Produk",
        price: 1.5,
        isAvailable: true,
      }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        name: "Produk",
        description: "x".repeat(1001),
        price: 1000,
        isAvailable: true,
      }).success,
    ).toBe(false);
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });

  it("formats Rupiah and preserves the complete dashboard return target", () => {
    expect(formatRupiah(18000)).toMatch(/Rp\s?18\.000/);
    expect(
      sessionExpiredHref("/dashboard/products?page=2&category=Kopi"),
    ).toBe(
      "/api/auth/session-expired?returnTo=%2Fdashboard%2Fproducts%3Fpage%3D2%26category%3DKopi",
    );
  });
});
