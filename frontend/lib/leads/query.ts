import type { LeadListQuery, LeadStatus } from "@/types/lead";

export interface LeadFilters {
  search: string;
  status: LeadStatus | "all";
}

const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "closed",
  "lost",
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isLeadStatus(value: string | undefined): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

export function parseLeadSearchParams(
  params: Record<string, string | string[] | undefined>,
): { filters: LeadFilters; query: LeadListQuery } {
  const parsedPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const search = first(params.search)?.trim().slice(0, 100) ?? "";
  const rawStatus = first(params.status);
  const status = isLeadStatus(rawStatus) ? rawStatus : "all";

  return {
    filters: { search, status },
    query: {
      page,
      limit: 10,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status } : {}),
    },
  };
}

export function leadPageHref(page: number, filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  const query = params.toString();
  return query ? `/dashboard/leads?${query}` : "/dashboard/leads";
}
