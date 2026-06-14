import { render, screen } from "@testing-library/react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SiteHeader } from "@/components/layout/site-header";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/products",
}));

describe("application shells", () => {
  it("exposes public navigation and primary actions", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("navigation", { name: "Navigasi utama" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coba demo" })).toHaveAttribute(
      "href",
      "/demo-chat",
    );
    expect(
      screen.getByRole("button", { name: "Buka navigasi" }),
    ).toBeInTheDocument();
  });

  it("marks the current dashboard destination", () => {
    render(
      <DashboardShell>
        <h1>Daftar produk</h1>
      </DashboardShell>,
    );

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { name: "Daftar produk" }),
    );
    expect(
      screen.getByRole("link", { name: "Produk" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
