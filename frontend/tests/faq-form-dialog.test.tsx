import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FaqFormDialog } from "@/components/faqs/faq-form-dialog";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Pertanyaan/), "Apakah tersedia pengiriman?");
  await user.type(screen.getByLabelText(/Jawaban/), "Ya, untuk area tertentu.");
}

describe("FaqFormDialog", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("shows client validation before sending invalid data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch");
    render(<FaqFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah FAQ" }));
    await user.click(screen.getByRole("button", { name: "Simpan FAQ" }));

    expect(await screen.findByText("Pertanyaan wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Jawaban wajib diisi.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions and refreshes after create", async () => {
    const user = userEvent.setup();
    let resolveResponse: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(pendingResponse);
    render(<FaqFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah FAQ" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Simpan FAQ" }));

    const pendingButton = screen.getByRole("button", { name: "Menyimpan..." });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveResponse?.(
      new Response(
        JSON.stringify({ success: true, message: "Created", data: { id: "faq-id" } }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("maps backend validation to the matching field", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Periksa kembali data FAQ.",
          errors: [{ field: "answer", message: "Jawaban tidak valid." }],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<FaqFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah FAQ" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Simpan FAQ" }));

    expect(await screen.findByText("Jawaban tidak valid.")).toBeInTheDocument();
    expect(screen.getByText("Periksa kembali data FAQ.")).toBeInTheDocument();
  });
});
