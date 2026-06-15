import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductsPage } from "@/components/products/products-page";
import type { Product } from "@/types/product";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const product: Product = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300100",
  name: "Kopi Susu Uji",
  description: "Espresso dan susu segar.",
  price: 18000,
  category: "Kopi",
  isAvailable: true,
  orderingInstruction: "Pesan via WhatsApp",
  additionalNotes: "Tanpa catatan",
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("ProductsPage", () => {
  it("renders responsive product views, active filters, Rupiah, and pagination", () => {
    render(
      <ProductsPage
        filters={{ category: "Kopi", availability: "available" }}
        meta={{ page: 2, limit: 10, total: 12, totalPages: 2 }}
        products={[product]}
      />,
    );

    expect(screen.getAllByText("Kopi Susu Uji")).toHaveLength(2);
    expect(screen.getAllByText(/Rp\s?18\.000/)).toHaveLength(2);
    expect(screen.getByLabelText("Filter kategori")).toHaveValue("Kopi");
    expect(screen.getByLabelText("Filter ketersediaan")).toHaveValue("true");
    expect(screen.getByRole("link", { name: "Sebelumnya" })).toHaveAttribute(
      "href",
      "/dashboard/products?category=Kopi&isAvailable=true",
    );
    expect(screen.queryByRole("link", { name: "Berikutnya" })).not.toBeInTheDocument();
  });

  it("distinguishes empty accounts from filtered no-result states", () => {
    const { rerender } = render(
      <ProductsPage
        filters={{ category: "", availability: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
        products={[]}
      />,
    );

    expect(screen.getByText("Belum ada produk")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tambah produk" })).toHaveLength(2);

    rerender(
      <ProductsPage
        filters={{ category: "Teh", availability: "unavailable" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
        products={[]}
      />,
    );

    expect(screen.getByText("Produk tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat semua produk" })).toHaveAttribute(
      "href",
      "/dashboard/products",
    );
  });

  it("offers a real server refresh after a load failure", async () => {
    const user = userEvent.setup();
    render(
      <ProductsPage
        error
        filters={{ category: "Kopi", availability: "all" }}
        meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }}
        products={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
