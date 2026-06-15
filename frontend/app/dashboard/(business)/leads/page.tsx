import { redirect } from "next/navigation";

import { LeadsPage } from "@/components/leads/leads-page";
import { ApiClientError } from "@/lib/api-errors";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import { leadPageHref, parseLeadSearchParams } from "@/lib/leads/query";
import { listLeads } from "@/lib/leads/server-leads";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Lead } from "@/types/lead";

export default async function LeadsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, query } = parseLeadSearchParams(await searchParams);
  let response: ApiPaginatedResponse<Lead> | null = null;
  try {
    response = await listLeads(query);
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "unauthorized") {
      redirect(sessionExpiredHref(leadPageHref(query.page ?? 1, filters)));
    }
  }

  if (
    response &&
    response.meta.totalPages > 0 &&
    response.meta.page > response.meta.totalPages
  ) {
    redirect(leadPageHref(response.meta.totalPages, filters));
  }

  return response ? (
    <LeadsPage leads={response.data} filters={filters} meta={response.meta} />
  ) : (
    <LeadsPage
      error
      leads={[]}
      filters={filters}
      meta={{
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total: 0,
        totalPages: 0,
      }}
    />
  );
}
