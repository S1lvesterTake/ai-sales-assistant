import { redirect } from "next/navigation";

import { ProductsPage } from "@/components/products/products-page";
import { ApiClientError } from "@/lib/api-errors";
import { sessionExpiredHref } from "@/lib/auth/session-expiry";
import {
  parseProductSearchParams,
  productPageHref,
} from "@/lib/products/query";
import { listProducts } from "@/lib/products/server-products";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Product } from "@/types/product";

export default async function ProductsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, query } = parseProductSearchParams(await searchParams);
  let response: ApiPaginatedResponse<Product> | null = null;
  try {
    response = await listProducts(query);
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "unauthorized") {
      redirect(sessionExpiredHref(productPageHref(query.page ?? 1, filters)));
    }
  }

  if (
    response &&
    response.meta.totalPages > 0 &&
    response.meta.page > response.meta.totalPages
  ) {
    redirect(productPageHref(response.meta.totalPages, filters));
  }

  return response ? (
    <ProductsPage
      filters={filters}
      meta={response.meta}
      products={response.data}
    />
  ) : (
    <ProductsPage
      error
      filters={filters}
      meta={{
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total: 0,
        totalPages: 0,
      }}
      products={[]}
    />
  );
}
