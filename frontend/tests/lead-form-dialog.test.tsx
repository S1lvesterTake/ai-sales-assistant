import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LeadFormDialog } from "@/components/leads/lead-form-dialog";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("LeadFormDialog", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("shows client validation before sending invalid data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch");
    render(<LeadFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah lead" }));
    await user.click(screen.getByRole("button", { name: "Simpan lead" }));

    expect(await screen.findByText("Nomor WhatsApp wajib diisi.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes phone, prevents duplicate submissions, and refreshes after create", async () => {
    const user = userEvent.setup();
    let resolveResponse: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(pendingResponse);
    render(<LeadFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah lead" }));
    await user.type(screen.getByLabelText("Nama"), "Sari");
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), "081355566677");
    await user.type(screen.getByLabelText("Ringkasan minat"), "Pesanan acara");
    await user.click(screen.getByRole("button", { name: "Simpan lead" }));

    const pendingButton = screen.getByRole("button", { name: "Menyimpan..." });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/leads",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      name: "Sari",
      phone: "6281355566677",
      interestSummary: "Pesanan acara",
    });

    resolveResponse?.(
      new Response(
        JSON.stringify({ success: true, message: "Created", data: { id: "lead-id" } }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("maps duplicate backend validation to phone without closing the dialog", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Nomor WhatsApp sudah terdaftar sebagai lead.",
          errors: [{ field: "phone", message: "Gunakan nomor lain atau buka lead yang sudah ada." }],
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<LeadFormDialog />);

    await user.click(screen.getByRole("button", { name: "Tambah lead" }));
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), "081234567890");
    await user.click(screen.getByRole("button", { name: "Simpan lead" }));

    expect(
      await screen.findByText("Gunakan nomor lain atau buka lead yang sudah ada."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nomor WhatsApp sudah terdaftar sebagai lead."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
