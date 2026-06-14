import { render, screen } from "@testing-library/react";

import HomePage from "@/app/(marketing)/page";

describe("public landing page", () => {
  it("explains the product workflow and portfolio proof", () => {
    render(<HomePage />);

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

  it("provides demo, login, WhatsApp, and API documentation actions", () => {
    render(<HomePage />);

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
