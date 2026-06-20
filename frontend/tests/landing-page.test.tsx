jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: jest.fn().mockReturnValue("/"),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";

import HomePage from "@/app/(marketing)/page";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

describe("public landing page", () => {
  beforeEach(() => {
    jest.mocked(cookies).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as CookieStore);
  });

  it("explains the product workflow and portfolio proof", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /jawab pelanggan lebih cepat/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /dari pengetahuan bisnis/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Jawaban berbasis data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /produk bisnis dengan keputusan/i }),
    ).toBeInTheDocument();
  });

  it("provides demo, login, WhatsApp, and API documentation actions", async () => {
    render(await HomePage());

    expect(
      screen.getAllByRole("link", { name: /coba demo chatbot/i })[0],
    ).toHaveAttribute("href", "/demo-chat");
    expect(
      screen.getAllByRole("link", { name: /masuk dashboard/i })[0],
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: "Hubungi Kopi Senja" }),
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(
      screen.getByRole("link", { name: "Buka Swagger API" }),
    ).toHaveAttribute("href", "http://localhost:3001/api/docs");
  });
});
