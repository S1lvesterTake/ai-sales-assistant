import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import type { BusinessProfile } from "@/types/business";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const profile: BusinessProfile = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300002",
  businessName: "Kopi Senja UMKM",
  slug: "kopi-senja-umkm",
  whatsappNumber: "6281234567890",
  category: "Kuliner",
  description: "Kedai kopi lokal.",
  location: "Makassar",
  operatingHours: "10.00-22.00",
  mainOffer: "Kopi Susu Gula Aren Rp18.000",
  ctaMessage: "Pesan via WhatsApp",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("BusinessProfileForm — update mode", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders existing profile values and shows immutable slug hint", async () => {
    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    expect(screen.getByLabelText(/Nama bisnis/)).toHaveValue("Kopi Senja UMKM");
    expect(screen.getByLabelText(/Slug bisnis/)).toHaveValue("kopi-senja-umkm");
    expect(screen.getByLabelText(/Slug bisnis/)).toBeDisabled();
    expect(
      screen.getByText(/Slug tidak dapat diubah/),
    ).toBeInTheDocument();
  });

  it("disables business name for demo users", () => {
    render(<BusinessProfileForm isDemo profile={profile} />);
    expect(screen.getByLabelText(/Nama bisnis/)).toBeDisabled();
  });

  it("shows unsaved-changes alert when the form is dirty", async () => {
    const user = userEvent.setup();
    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    await user.clear(screen.getByLabelText(/Nama bisnis/));
    await user.type(screen.getByLabelText(/Nama bisnis/), "Kopi Baru");

    expect(
      await screen.findByText(/Ada perubahan yang belum disimpan/),
    ).toBeInTheDocument();
  });

  it("shows canonical phone hint as user types a valid number", async () => {
    const user = userEvent.setup();
    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    const phoneInput = screen.getByLabelText(/Nomor WhatsApp/);
    await user.clear(phoneInput);
    await user.type(phoneInput, "081234567890");

    expect(
      await screen.findByText(/Format tersimpan: 6281234567890/),
    ).toBeInTheDocument();
  });

  it("prevents duplicate submissions and refreshes after a successful update", async () => {
    const user = userEvent.setup();
    let resolveResponse: ((r: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(pending);

    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    await user.clear(screen.getByLabelText(/Nama bisnis/));
    await user.type(screen.getByLabelText(/Nama bisnis/), "Kopi Baru");
    await user.click(screen.getByRole("button", { name: /Simpan perubahan/ }));

    const savingButton = screen.getByRole("button", { name: "Menyimpan..." });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/settings",
      expect.objectContaining({ method: "PATCH" }),
    );

    resolveResponse?.(
      new Response(
        JSON.stringify({ success: true, message: "Updated.", data: profile }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("maps backend field errors to matching fields", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Nomor WhatsApp tidak valid.",
          errors: [{ field: "whatsappNumber", message: "Format tidak didukung." }],
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    // Use a phone that passes client-side Zod validation so fetch is actually called
    await user.clear(screen.getByLabelText(/Nomor WhatsApp/));
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), "081234567890");
    await user.click(screen.getByRole("button", { name: /Simpan perubahan/ }));

    expect(await screen.findByText("Format tidak didukung.")).toBeInTheDocument();
    expect(screen.getByText("Nomor WhatsApp tidak valid.")).toBeInTheDocument();
  });

  it("shows a network error when the fetch fails", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    render(<BusinessProfileForm isDemo={false} profile={profile} />);

    await user.clear(screen.getByLabelText(/Nama bisnis/));
    await user.type(screen.getByLabelText(/Nama bisnis/), "New Name");
    await user.click(screen.getByRole("button", { name: /Simpan perubahan/ }));

    expect(
      await screen.findByText(/Profil bisnis belum dapat disimpan/),
    ).toBeInTheDocument();
  });

  it("shows the chatbot link section for existing profiles", () => {
    render(<BusinessProfileForm isDemo={false} profile={profile} />);
    // Section heading is visible
    expect(screen.getByRole("region", { name: /Tautan chatbot publik/ })).toBeInTheDocument();
    // The span displays the chatbot path
    expect(screen.getByText(`/chat/${profile.slug}`)).toBeInTheDocument();
  });
});

describe("BusinessProfileForm — create mode", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("shows slug input as editable with format hint", () => {
    render(<BusinessProfileForm isDemo={false} />);
    const slugInput = screen.getByLabelText(/Slug bisnis/);
    expect(slugInput).not.toBeDisabled();
    expect(screen.getByText(/Hanya huruf kecil/)).toBeInTheDocument();
  });

  it("validates client-side before sending: requires businessName, slug, and whatsappNumber", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch");

    render(<BusinessProfileForm isDemo={false} />);
    await user.click(screen.getByRole("button", { name: /Buat profil bisnis/ }));

    expect(await screen.findByText("Nama bisnis wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Slug bisnis wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Nomor WhatsApp wajib diisi.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates slug format", async () => {
    const user = userEvent.setup();
    render(<BusinessProfileForm isDemo={false} />);

    await user.type(screen.getByLabelText(/Nama bisnis/), "Test Bisnis");
    await user.type(screen.getByLabelText(/Slug bisnis/), "INVALID SLUG!");
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), "081234567890");
    await user.click(screen.getByRole("button", { name: /Buat profil bisnis/ }));

    expect(
      await screen.findByText(/Slug hanya boleh berisi huruf kecil/),
    ).toBeInTheDocument();
  });

  it("submits POST and calls refresh on success", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Created.",
          data: { ...profile, slug: "new-biz" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<BusinessProfileForm isDemo={false} />);

    await user.type(screen.getByLabelText(/Nama bisnis/), "New Bisnis");
    await user.type(screen.getByLabelText(/Slug bisnis/), "new-biz");
    await user.type(screen.getByLabelText(/Nomor WhatsApp/), "081234567890");
    await user.click(screen.getByRole("button", { name: /Buat profil bisnis/ }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/dashboard/settings",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not show the chatbot link section before a profile exists", () => {
    render(<BusinessProfileForm isDemo={false} />);
    expect(screen.queryByText(/Tautan chatbot publik/)).not.toBeInTheDocument();
  });
});
