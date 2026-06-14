import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";

describe("shared application states", () => {
  it("renders an actionable empty state", () => {
    render(
      <EmptyState
        action={<Button>Tambah produk</Button>}
        description="Produk pertama akan menjadi pengetahuan chatbot."
        title="Belum ada produk"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Belum ada produk" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tambah produk" }),
    ).toBeInTheDocument();
  });

  it("announces loading state and renders the requested rows", () => {
    const { container } = render(<LoadingState rows={4} />);

    expect(screen.getByLabelText("Memuat data")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
  });

  it("allows a failed request to be retried", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();

    render(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
