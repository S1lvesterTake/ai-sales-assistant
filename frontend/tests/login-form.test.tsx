import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "@/components/auth/login-form";
import { DEMO_CREDENTIALS } from "@/lib/auth/constants";

const replace = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("fills demo credentials and redirects after a successful login", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Login berhasil.",
          data: {
            user: {
              id: "user-id",
              name: "Demo",
              email: DEMO_CREDENTIALS.email,
              isDemo: true,
            },
            expiresAt: "2026-06-15T08:00:00.000Z",
            redirectTo: "/dashboard",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<LoginForm returnTo="/dashboard" />);

    await user.click(screen.getByRole("button", { name: "Gunakan akun demo" }));
    expect(screen.getByLabelText(/Email/)).toHaveValue(DEMO_CREDENTIALS.email);
    expect(screen.getByLabelText(/Kata sandi/)).toHaveValue(
      DEMO_CREDENTIALS.password,
    );
    await user.click(screen.getByRole("button", { name: "Masuk ke dashboard" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows expired-session and invalid-credential messages", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Email atau kata sandi salah.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<LoginForm reason="expired" returnTo="/dashboard" />);

    expect(screen.getByText("Sesi Anda telah berakhir")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Email/), DEMO_CREDENTIALS.email);
    await user.type(screen.getByLabelText(/Kata sandi/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Masuk ke dashboard" }));

    expect(
      await screen.findByText("Email atau kata sandi salah."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a user-safe message when the same-origin request fails", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network details"));
    render(<LoginForm returnTo="/dashboard" />);

    await user.click(screen.getByRole("button", { name: "Gunakan akun demo" }));
    await user.click(screen.getByRole("button", { name: "Masuk ke dashboard" }));

    expect(
      await screen.findByText("Koneksi ke layanan login gagal. Silakan coba lagi."),
    ).toBeInTheDocument();
  });
});
