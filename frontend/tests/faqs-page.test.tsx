import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FaqsPage } from "@/components/faqs/faqs-page";
import type { Faq } from "@/types/faq";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const faq: Faq = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300200",
  question: "Apakah bisa pesan untuk acara?",
  answer: "Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.",
  category: "Pemesanan",
  isActive: true,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("FaqsPage", () => {
  it("renders responsive FAQ views, filters, active labels, and pagination", () => {
    render(
      <FaqsPage
        faqs={[faq]}
        filters={{
          search: "acara",
          category: "Pemesanan",
          activeStatus: "active",
        }}
        meta={{ page: 2, limit: 10, total: 12, totalPages: 2 }}
      />,
    );

    expect(screen.getAllByText(faq.question)).toHaveLength(2);
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    screen.getAllByRole("switch").forEach((control) => {
      expect(control).toBeChecked();
    });
    expect(screen.getByLabelText("Cari FAQ")).toHaveValue("acara");
    expect(screen.getByLabelText("Filter kategori FAQ")).toHaveValue(
      "Pemesanan",
    );
    expect(screen.getByLabelText("Filter status FAQ")).toHaveValue("true");
    expect(screen.getByRole("link", { name: "Sebelumnya" })).toHaveAttribute(
      "href",
      "/dashboard/faqs?search=acara&category=Pemesanan&isActive=true",
    );
  });

  it("distinguishes empty data from filtered no-result states", () => {
    const { rerender } = render(
      <FaqsPage
        faqs={[]}
        filters={{ search: "", category: "", activeStatus: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );

    expect(screen.getByText("Belum ada FAQ")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tambah FAQ" })).toHaveLength(2);

    rerender(
      <FaqsPage
        faqs={[]}
        filters={{ search: "pengiriman", category: "", activeStatus: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );
    expect(screen.getByText("FAQ tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua FAQ" })).toHaveAttribute(
      "href",
      "/dashboard/faqs",
    );
  });

  it("offers a server refresh after load failure", async () => {
    const user = userEvent.setup();
    render(
      <FaqsPage
        error
        faqs={[]}
        filters={{ search: "", category: "", activeStatus: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
