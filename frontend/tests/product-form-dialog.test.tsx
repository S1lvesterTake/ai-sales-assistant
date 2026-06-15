import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductFormDialog } from "@/components/products/product-form-dialog";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nama produk/), "Kopi Uji");
  await user.type(screen.getByLabelText(/Harga/), "18000");
}

describe("ProductFormDialog", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("shows client validation before sending invalid data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch");
    render(<ProductFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah produk" }));
    await user.click(screen.getByRole("button", { name: "Simpan produk" }));

    expect(await screen.findByText("Nama produk wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Harga wajib diisi.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions and refreshes after a successful create", async () => {
    const user = userEvent.setup();
    let resolveResponse: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(pendingResponse);
    render(<ProductFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah produk" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Simpan produk" }));

    const pendingButton = screen.getByRole("button", { name: "Menyimpan..." });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/products",
      expect.objectContaining({ method: "POST" }),
    );

    resolveResponse?.(
      new Response(
        JSON.stringify({
          success: true,
          message: "Produk berhasil ditambahkan.",
          data: { id: "product-id" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("maps backend duplicate errors to the name field", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Nama produk sudah digunakan.",
          errors: [
            { field: "name", message: "Gunakan nama produk yang berbeda." },
          ],
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<ProductFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah produk" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Simpan produk" }));

    expect(
      await screen.findByText("Gunakan nama produk yang berbeda."),
    ).toBeInTheDocument();
    expect(screen.getByText("Nama produk sudah digunakan.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
