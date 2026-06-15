import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { LeadStatusSelect } from "@/components/leads/lead-status-select";
import type { Lead } from "@/types/lead";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const lead: Lead = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300300",
  name: "Andi",
  phone: "6281234567890",
  status: "new",
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

describe("LeadStatusSelect", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("updates status once and refreshes server data", async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ...lead, status: "qualified" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<LeadStatusSelect lead={lead} />);

    await user.selectOptions(screen.getByLabelText("Ubah status lead Andi"), "qualified");

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/dashboard/leads/${lead.id}/status`,
      expect.objectContaining({ body: JSON.stringify({ status: "qualified" }) }),
    );
    expect(toast.success).toHaveBeenCalledWith("Status lead diperbarui.");
  });

  it("keeps a failed update recoverable", async () => {
    const user = userEvent.setup();
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<LeadStatusSelect lead={lead} />);

    await user.selectOptions(screen.getByLabelText("Ubah status lead Andi"), "lost");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Status lead belum dapat diperbarui.",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
