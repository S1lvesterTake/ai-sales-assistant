import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Button } from "@/components/ui/button";

describe("ConfirmationDialog", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("requires explicit confirmation before invoking the action", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <ConfirmationDialog
        description="Data produk akan dihapus permanen."
        onConfirm={onConfirm}
        title="Hapus produk?"
        trigger={<Button variant="destructive">Hapus</Button>}
        variant="destructive"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hapus" }));
    expect(
      screen.getByRole("heading", { name: "Hapus produk?" }),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("blocks duplicate confirmations and keeps failures recoverable", async () => {
    const user = userEvent.setup();
    let rejectConfirmation: ((reason?: unknown) => void) | undefined;
    const confirmation = new Promise<void>((_, reject) => {
      rejectConfirmation = reject;
    });
    const onConfirm = jest.fn(() => confirmation);

    render(
      <ConfirmationDialog
        description="Data produk akan dihapus permanen."
        onConfirm={onConfirm}
        title="Hapus produk?"
        trigger={<Button variant="destructive">Hapus</Button>}
        variant="destructive"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    const pendingButton = screen.getByRole("button", { name: "Memproses..." });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rejectConfirmation?.(new Error("backend unavailable"));
    expect(
      await screen.findByText("Tindakan belum berhasil. Silakan coba lagi."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hapus produk?" })).toBeInTheDocument();
  });
});
