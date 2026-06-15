import { toSearchParams, type ApiClient } from "@/services/api-client";
import type { Product, ProductInput, ProductListQuery } from "@/types/product";

export const productsService = {
  list(client: ApiClient, query: ProductListQuery = {}) {
    return client.requestPage<Product>(
      `/api/products${toSearchParams(query)}`,
    );
  },
  get(client: ApiClient, id: string) {
    return client.request<Product>(`/api/products/${encodeURIComponent(id)}`);
  },
  create(client: ApiClient, input: ProductInput) {
    return client.request<Product>("/api/products", {
      method: "POST",
      body: input,
    });
  },
  update(client: ApiClient, id: string, input: Partial<ProductInput>) {
    return client.request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(client: ApiClient, id: string) {
    return client.request<null>(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
