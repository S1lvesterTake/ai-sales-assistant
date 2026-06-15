import type { ApiClient } from "@/services/api-client";
import type {
  DashboardSummary,
  RecentConversation,
  RecentLead,
  TopQuestion,
} from "@/types/dashboard";

export const dashboardService = {
  getSummary(client: ApiClient) {
    return client.request<DashboardSummary>("/api/dashboard/summary");
  },
  getRecentLeads(client: ApiClient) {
    return client.request<RecentLead[]>("/api/dashboard/recent-leads");
  },
  getRecentConversations(client: ApiClient) {
    return client.request<RecentConversation[]>(
      "/api/dashboard/recent-conversations",
    );
  },
  getTopQuestions(client: ApiClient) {
    return client.request<TopQuestion[]>("/api/dashboard/top-questions");
  },
};
