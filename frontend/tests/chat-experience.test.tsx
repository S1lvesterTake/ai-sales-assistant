import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatExperience } from "@/components/chat/chat-experience";

describe("ChatExperience", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("completes the customer chat, lead capture, and WhatsApp handoff flow", async () => {
    const user = userEvent.setup();
    render(<ChatExperience businessSlug="kopi-senja-umkm" />);

    expect(
      await screen.findByRole("heading", { name: "Kopi Senja UMKM" }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);

    await user.click(
      screen.getByRole("button", { name: "Apakah bisa pesan untuk acara?" }),
    );

    expect(
      await screen.findByText(/Harga Kopi Susu Gula Aren adalah Rp18.000/i),
    ).toBeInTheDocument();
    const leadSection = screen.getByRole("heading", {
      name: /Minta Kopi Senja UMKM menghubungi Anda/i,
    }).parentElement?.parentElement;
    expect(leadSection).not.toBeNull();

    await user.type(screen.getByLabelText("Nama"), "Siti");
    const phoneInput = screen.getByLabelText("Nomor WhatsApp");
    await user.type(phoneInput, "12345");
    await user.click(screen.getByRole("button", { name: "Simpan kontak" }));
    expect(
      await screen.findByText(/Gunakan nomor Indonesia/i),
    ).toBeInTheDocument();

    await user.clear(phoneInput);
    await user.type(phoneInput, "0813 1111 2222");
    await user.click(screen.getByRole("button", { name: "Simpan kontak" }));

    expect(
      await screen.findByText("Kontak berhasil disimpan"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Lanjut ke WhatsApp/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));
  });

  it("polls pending responses with one visible customer message", async () => {
    const user = userEvent.setup();
    render(<ChatExperience businessSlug="kopi-senja-umkm" />);
    await screen.findByRole("heading", { name: "Kopi Senja UMKM" });

    const composer = screen.getByLabelText("Tulis pesan");
    await user.type(composer, "pending cek status");
    await user.click(screen.getByRole("button", { name: "Kirim pesan" }));

    expect(await screen.findByText("pending cek status")).toBeInTheDocument();
    await waitFor(
      () => {
        expect(
          screen.getByText(/Harga Kopi Susu Gula Aren adalah Rp18.000/i),
        ).toBeInTheDocument();
      },
      { timeout: 2_000 },
    );
    expect(screen.getAllByText("pending cek status")).toHaveLength(1);
  });

  it("offers safe recovery when a stored session token is invalid", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      "ai-sales-chat-session:kopi-senja-umkm",
      JSON.stringify({
        sessionId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300040",
        sessionToken: "invalid-token",
        expiresAt: "2099-06-15T08:00:00.000Z",
      }),
    );

    render(<ChatExperience businessSlug="kopi-senja-umkm" />);

    const alert = await screen.findByText("Sesi chat telah berakhir");
    const recoveryRegion = alert.parentElement;
    expect(recoveryRegion).not.toBeNull();
    await user.click(
      within(recoveryRegion as HTMLElement).getByRole("button", {
        name: "Mulai sesi baru",
      }),
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Tulis pesan")).toBeEnabled(),
    );
    expect(window.sessionStorage.getItem("ai-sales-chat-session:kopi-senja-umkm")).toContain(
      "mock-chat-session-token",
    );
  });

  it("shows a retryable rate-limit message without losing the customer input", async () => {
    const user = userEvent.setup();
    render(<ChatExperience businessSlug="kopi-senja-umkm" />);
    await screen.findByRole("heading", { name: "Kopi Senja UMKM" });

    await user.type(screen.getByLabelText("Tulis pesan"), "rate limit");
    await user.click(screen.getByRole("button", { name: "Kirim pesan" }));

    expect(
      await screen.findByText(/Terlalu banyak permintaan/i),
    ).toBeInTheDocument();
    expect(screen.getByText("rate limit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim ulang" })).toBeEnabled();
  });

  it("renders the persisted Indonesian fallback as a completed reply", async () => {
    const user = userEvent.setup();
    render(<ChatExperience businessSlug="kopi-senja-umkm" />);
    await screen.findByRole("heading", { name: "Kopi Senja UMKM" });

    await user.type(screen.getByLabelText("Tulis pesan"), "fallback");
    await user.click(screen.getByRole("button", { name: "Kirim pesan" }));

    expect(
      await screen.findByText(/asisten sedang mengalami gangguan/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kirim ulang" })).not.toBeInTheDocument();
  });
});
