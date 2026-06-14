import { toSearchParams, type ApiClient } from "@/services/api-client";
import type { Lead, LeadInput, LeadListQuery, LeadStatus } from "@/types/lead";

export const leadsService = {
  list(client: ApiClient, query: LeadListQuery = {}) {
    return client.requestPage<Lead>(`/api/leads${toSearchParams(query)}`);
  },
  get(client: ApiClient, id: string) {
    return client.request<Lead>(`/api/leads/${encodeURIComponent(id)}`);
  },
  create(client: ApiClient, input: LeadInput) {
    return client.request<Lead>("/api/leads", { method: "POST", body: input });
  },
  updateStatus(client: ApiClient, id: string, status: LeadStatus) {
    return client.request<Lead>(`/api/leads/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
};
