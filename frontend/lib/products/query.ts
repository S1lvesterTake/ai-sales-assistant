import type { ProductListQuery } from "@/types/product";

export interface ProductFilters {
  category: string;
  availability: "all" | "available" | "unavailable";
}

export function parseProductSearchParams(
  params: Record<string, string | string[] | undefined>,
): { filters: ProductFilters; query: ProductListQuery } {
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const category = rawCategory?.trim().slice(0, 100) ?? "";
  const rawAvailability = Array.isArray(params.isAvailable)
    ? params.isAvailable[0]
    : params.isAvailable;
  const availability =
    rawAvailability === "true"
      ? "available"
      : rawAvailability === "false"
        ? "unavailable"
        : "all";

  return {
    filters: { category, availability },
    query: {
      page,
      limit: 10,
      ...(category ? { category } : {}),
      ...(availability === "available"
        ? { isAvailable: true }
        : availability === "unavailable"
          ? { isAvailable: false }
          : {}),
    },
  };
}

export function productPageHref(
  page: number,
  filters: ProductFilters,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters.category) params.set("category", filters.category);
  if (filters.availability === "available") params.set("isAvailable", "true");
  if (filters.availability === "unavailable") params.set("isAvailable", "false");
  const query = params.toString();
  return query ? `/dashboard/products?${query}` : "/dashboard/products";
}
