import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { FaqActions, FaqActiveToggle } from "@/components/faqs/faq-actions";
import type { Faq } from "@/types/faq";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const faq: Faq = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300200",
  question: "Apakah buka hari Minggu?",
  answer: "Ya, kami buka setiap hari.",
  isActive: true,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("FAQ actions", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("updates active status and refreshes server data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: faq }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<FaqActiveToggle faq={faq} />);

    await user.click(
      screen.getByRole("switch", { name: `Ubah status ${faq.question}` }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/dashboard/faqs/${faq.id}`,
      expect.objectContaining({ body: JSON.stringify({ isActive: false }) }),
    );
    expect(toast.success).toHaveBeenCalledWith("FAQ dinonaktifkan.");
  });

  it("keeps failed status and delete actions recoverable", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { rerender } = render(<FaqActiveToggle faq={faq} />);

    await user.click(
      screen.getByRole("switch", { name: `Ubah status ${faq.question}` }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Status FAQ belum dapat diperbarui.",
      ),
    );

    rerender(<FaqActions faq={faq} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await user.click(screen.getByRole("button", { name: "Hapus FAQ" }));
    expect(
      await screen.findByText("Tindakan belum berhasil. Silakan coba lagi."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
