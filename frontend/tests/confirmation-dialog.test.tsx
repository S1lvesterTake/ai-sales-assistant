import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Button } from "@/components/ui/button";

describe("ConfirmationDialog", () => {
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
});
