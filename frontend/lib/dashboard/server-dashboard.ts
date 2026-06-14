import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAuthenticatedApiClient } from "@/services/api-client";
import { dashboardService } from "@/services/dashboard.service";
import type {
  DashboardOverviewData,
  DashboardWidgetResult,
} from "@/types/dashboard";

const MAX_WIDGET_ITEMS = 5;

function resultFromSettled<T>(
  result: PromiseSettledResult<T>,
): DashboardWidgetResult<T> {
  return result.status === "fulfilled"
    ? { status: "success", data: result.value }
    : { status: "error" };
}

async function getDashboardRequests() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
    const {
      dashboardSummaryFixture,
      leadFixtures,
      recentConversationFixtures,
      topQuestionFixtures,
    } = await import("@/mocks/fixtures");
    return [
      Promise.resolve(dashboardSummaryFixture),
      Promise.resolve(leadFixtures.slice(0, MAX_WIDGET_ITEMS)),
      Promise.resolve(recentConversationFixtures.slice(0, MAX_WIDGET_ITEMS)),
      Promise.resolve(topQuestionFixtures.slice(0, MAX_WIDGET_ITEMS)),
    ] as const;
  }

  const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    const missingSession = Promise.reject(new Error("Missing dashboard session"));
    return [missingSession, missingSession, missingSession, missingSession] as const;
  }
  const client = createAuthenticatedApiClient(accessToken, {
    baseUrl: getServerEnv().API_BASE_URL,
  });
  return [
    dashboardService.getSummary(client).then((response) => response.data),
    dashboardService
      .getRecentLeads(client)
      .then((response) => response.data.slice(0, MAX_WIDGET_ITEMS)),
    dashboardService
      .getRecentConversations(client)
      .then((response) => response.data.slice(0, MAX_WIDGET_ITEMS)),
    dashboardService
      .getTopQuestions(client)
      .then((response) => response.data.slice(0, MAX_WIDGET_ITEMS)),
  ] as const;
}

export async function loadDashboardOverview(): Promise<DashboardOverviewData> {
  const requests = await getDashboardRequests();
  const [summary, recentLeads, recentConversations, topQuestions] =
    await Promise.allSettled(requests);

  return {
    summary: resultFromSettled(summary),
    recentLeads: resultFromSettled(recentLeads),
    recentConversations: resultFromSettled(recentConversations),
    topQuestions: resultFromSettled(topQuestions),
  };
}
