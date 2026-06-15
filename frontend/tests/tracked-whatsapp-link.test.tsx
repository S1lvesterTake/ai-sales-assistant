import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TrackedWhatsappLink } from "@/components/marketing/tracked-whatsapp-link";

const mockTrackClick = jest.fn().mockRejectedValue(new Error("offline"));

jest.mock("@/services/whatsapp.service", () => ({
  whatsappService: {
    trackClick: (...args: unknown[]) => mockTrackClick(...args),
  },
}));

describe("TrackedWhatsappLink", () => {
  it("keeps native navigation available when tracking fails", async () => {
    render(
      <TrackedWhatsappLink
        businessSlug="kopi-senja-umkm"
        href="https://wa.me/6281234567890"
      >
        Hubungi penjual
      </TrackedWhatsappLink>,
    );
    const link = screen.getByRole("link", { name: "Hubungi penjual" });
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(link).toHaveAttribute("href", "https://wa.me/6281234567890");
    expect(link).toHaveAttribute("target", "_blank");
    await waitFor(() =>
      expect(mockTrackClick).toHaveBeenCalledWith("kopi-senja-umkm"),
    );
  });
});
