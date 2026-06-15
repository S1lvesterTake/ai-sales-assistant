import { redirect } from "next/navigation";

import { FaqsPage } from "@/components/faqs/faqs-page";
import { ApiClientError } from "@/lib/api-errors";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import { faqPageHref, parseFaqSearchParams } from "@/lib/faqs/query";
import { listFaqs } from "@/lib/faqs/server-faqs";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Faq } from "@/types/faq";

export default async function FaqsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, query } = parseFaqSearchParams(await searchParams);
  let response: ApiPaginatedResponse<Faq> | null = null;
  try {
    response = await listFaqs(query);
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "unauthorized") {
      redirect(sessionExpiredHref(faqPageHref(query.page ?? 1, filters)));
    }
  }

  if (
    response &&
    response.meta.totalPages > 0 &&
    response.meta.page > response.meta.totalPages
  ) {
    redirect(faqPageHref(response.meta.totalPages, filters));
  }

  return response ? (
    <FaqsPage faqs={response.data} filters={filters} meta={response.meta} />
  ) : (
    <FaqsPage
      error
      faqs={[]}
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
