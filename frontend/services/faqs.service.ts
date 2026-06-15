import { toSearchParams, type ApiClient } from "@/services/api-client";
import type { Faq, FaqInput, FaqListQuery } from "@/types/faq";

export const faqsService = {
  list(client: ApiClient, query: FaqListQuery = {}) {
    return client.requestPage<Faq>(`/api/faqs${toSearchParams(query)}`);
  },
  get(client: ApiClient, id: string) {
    return client.request<Faq>(`/api/faqs/${encodeURIComponent(id)}`);
  },
  create(client: ApiClient, input: FaqInput) {
    return client.request<Faq>("/api/faqs", { method: "POST", body: input });
  },
  update(client: ApiClient, id: string, input: Partial<FaqInput>) {
    return client.request<Faq>(`/api/faqs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(client: ApiClient, id: string) {
    return client.request<null>(`/api/faqs/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
