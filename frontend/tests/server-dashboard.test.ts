import { loadDashboardOverview } from "@/lib/dashboard/server-dashboard";

describe("loadDashboardOverview", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
  });

  it("loads deterministic server-side widget data with bounded lists", async () => {
    const data = await loadDashboardOverview();

    expect(data.summary).toMatchObject({
      status: "success",
      data: { totalLeads: 24, totalChatSessions: 86 },
    });
    expect(data.recentLeads.status).toBe("success");
    expect(data.recentConversations.status).toBe("success");
    expect(data.topQuestions.status).toBe("success");
    if (data.recentLeads.status === "success") {
      expect(data.recentLeads.data.length).toBeLessThanOrEqual(5);
    }
    if (data.topQuestions.status === "success") {
      expect(data.topQuestions.data.length).toBeLessThanOrEqual(5);
    }
  });
});
