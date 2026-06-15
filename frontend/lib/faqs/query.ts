import type { FaqListQuery } from "@/types/faq";

export interface FaqFilters {
  search: string;
  category: string;
  activeStatus: "all" | "active" | "inactive";
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFaqSearchParams(
  params: Record<string, string | string[] | undefined>,
): { filters: FaqFilters; query: FaqListQuery } {
  const parsedPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const search = first(params.search)?.trim().slice(0, 300) ?? "";
  const category = first(params.category)?.trim().slice(0, 100) ?? "";
  const rawActive = first(params.isActive);
  const activeStatus =
    rawActive === "true"
      ? "active"
      : rawActive === "false"
        ? "inactive"
        : "all";

  return {
    filters: { search, category, activeStatus },
    query: {
      page,
      limit: 10,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(activeStatus === "active"
        ? { isActive: true }
        : activeStatus === "inactive"
          ? { isActive: false }
          : {}),
    },
  };
}

export function faqPageHref(page: number, filters: FaqFilters): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.activeStatus === "active") params.set("isActive", "true");
  if (filters.activeStatus === "inactive") params.set("isActive", "false");
  const query = params.toString();
  return query ? `/dashboard/faqs?${query}` : "/dashboard/faqs";
}
