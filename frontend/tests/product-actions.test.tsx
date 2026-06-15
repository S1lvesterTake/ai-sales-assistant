import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import {
  ProductActions,
  ProductAvailabilityToggle,
} from "@/components/products/product-actions";
import type { Product } from "@/types/product";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const product: Product = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300100",
  name: "Kopi Uji",
  price: 18000,
  isAvailable: true,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("product actions", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("updates availability once and refreshes server data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: "Updated", data: product }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<ProductAvailabilityToggle product={product} />);

    await user.click(
      screen.getByRole("switch", { name: "Ubah ketersediaan Kopi Uji" }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/dashboard/products/${product.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isAvailable: false }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Produk dinonaktifkan.");
  });

  it("keeps failed availability and delete actions recoverable", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: "Unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { rerender } = render(<ProductAvailabilityToggle product={product} />);

    await user.click(
      screen.getByRole("switch", { name: "Ubah ketersediaan Kopi Uji" }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Status produk belum dapat diperbarui.",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();

    rerender(<ProductActions product={product} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await user.click(screen.getByRole("button", { name: "Hapus produk" }));

    expect(
      await screen.findByText("Tindakan belum berhasil. Silakan coba lagi."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
