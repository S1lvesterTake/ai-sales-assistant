import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import {
  dashboardSummaryFixture,
  leadFixtures,
  recentConversationFixtures,
  topQuestionFixtures,
} from "@/mocks/fixtures";
import type { DashboardOverviewData } from "@/types/dashboard";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const successData: DashboardOverviewData = {
  summary: { status: "success", data: dashboardSummaryFixture },
  recentLeads: { status: "success", data: leadFixtures },
  recentConversations: {
    status: "success",
    data: recentConversationFixtures,
  },
  topQuestions: { status: "success", data: topQuestionFixtures },
};

describe("DashboardOverview", () => {
  it("renders aggregate metrics and bounded activity widgets", () => {
    render(<DashboardOverview data={successData} />);

    expect(screen.getByText("Total lead")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("86")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(
      screen.getByText("Tertarik paket kopi untuk rapat kantor."),
    ).toBeInTheDocument();
    expect(screen.getByText("18 kali")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /Lihat semua/ })
        .map((link) => link.getAttribute("href")),
    ).toContain("/dashboard/leads");
  });

  it("keeps empty accounts useful", () => {
    render(
      <DashboardOverview
        data={{
          summary: {
            status: "success",
            data: {
              totalLeads: 0,
              newLeads: 0,
              totalChatSessions: 0,
              whatsappClicks: 0,
            },
          },
          recentLeads: { status: "success", data: [] },
          recentConversations: { status: "success", data: [] },
          topQuestions: { status: "success", data: [] },
        }}
      />,
    );

    expect(screen.getByText("Belum ada lead")).toBeInTheDocument();
    expect(screen.getByText("Belum ada percakapan")).toBeInTheDocument();
    expect(
      screen.getByText("Belum ada pertanyaan populer"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("renders successful widgets when one request fails", () => {
    render(
      <DashboardOverview
        data={{ ...successData, recentLeads: { status: "error" } }}
      />,
    );

    expect(screen.getByText("Lead terbaru belum dapat dimuat")).toBeInTheDocument();
    expect(screen.getByText("Percakapan terbaru")).toBeInTheDocument();
    expect(screen.getByText("Berapa harga Kopi Susu Gula Aren?")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("shows one recoverable full-error state", async () => {
    const user = userEvent.setup();
    render(
      <DashboardOverview
        data={{
          summary: { status: "error" },
          recentLeads: { status: "error" },
          recentConversations: { status: "error" },
          topQuestions: { status: "error" },
        }}
      />,
    );

    expect(screen.getByText("Ringkasan belum dapat dimuat")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(refresh).toHaveBeenCalled();
  });
});
