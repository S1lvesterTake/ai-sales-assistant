import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LeadsPage } from "@/components/leads/leads-page";
import type { Lead } from "@/types/lead";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const lead: Lead = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300300",
  chatSessionId: "019b9d80-7a2e-7b4b-8dc1-secret-session",
  name: "Andi",
  phone: "6281234567890",
  interestSummary: "Tertarik paket kopi untuk rapat kantor.",
  source: "chatbot",
  status: "new",
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("LeadsPage", () => {
  it("renders responsive lead views, URL filters, canonical phone, status, and pagination", () => {
    render(
      <LeadsPage
        leads={[lead]}
        filters={{ search: "kopi kantor", status: "new" }}
        meta={{ page: 2, limit: 10, total: 12, totalPages: 2 }}
      />,
    );

    expect(screen.getAllByText("Andi")).toHaveLength(2);
    expect(screen.getAllByText("+62 812-3456-7890")).toHaveLength(2);
    expect(screen.getByLabelText("Cari lead")).toHaveValue("kopi kantor");
    expect(screen.getByLabelText("Filter status lead")).toHaveValue("new");
    expect(screen.getByRole("link", { name: "Sebelumnya" })).toHaveAttribute(
      "href",
      "/dashboard/leads?search=kopi+kantor&status=new",
    );
    expect(screen.getAllByLabelText("Ubah status lead Andi")).toHaveLength(2);
  });

  it("shows authorized conversation context without rendering the raw session ID", async () => {
    const user = userEvent.setup();
    render(
      <LeadsPage
        leads={[lead]}
        filters={{ search: "", status: "all" }}
        meta={{ page: 1, limit: 10, total: 1, totalPages: 1 }}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Detail" })[0]!);
    expect(screen.getByText("Konteks percakapan")).toBeInTheDocument();
    expect(
      screen.getByText(/terhubung ke percakapan chatbot yang telah diotorisasi/),
    ).toBeInTheDocument();
    expect(screen.queryByText(lead.chatSessionId!)).not.toBeInTheDocument();
    const whatsapp = screen.getByRole("link", { name: "Follow up via WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("wa.me/6281234567890"));
  });

  it("distinguishes empty data from filtered no-result states", () => {
    const { rerender } = render(
      <LeadsPage
        leads={[]}
        filters={{ search: "", status: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );
    expect(screen.getByText("Belum ada lead")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tambah lead" })).toHaveLength(2);

    rerender(
      <LeadsPage
        leads={[]}
        filters={{ search: "pengiriman", status: "lost" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );
    expect(screen.getByText("Lead tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua lead" })).toHaveAttribute(
      "href",
      "/dashboard/leads",
    );
  });

  it("offers a server refresh after load failure", async () => {
    const user = userEvent.setup();
    render(
      <LeadsPage
        error
        leads={[]}
        filters={{ search: "", status: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
