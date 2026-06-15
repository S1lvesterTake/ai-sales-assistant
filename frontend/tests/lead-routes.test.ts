import { NextRequest } from "next/server";

jest.mock("@/lib/leads/server-leads", () => ({
  createLead: jest.fn(),
  updateLeadStatus: jest.fn(),
}));

import { POST as create } from "@/app/api/dashboard/leads/route";
import { PATCH as updateStatus } from "@/app/api/dashboard/leads/[id]/status/route";
import { ApiClientError } from "@/lib/api-errors";
import { createLead, updateLeadStatus } from "@/lib/leads/server-leads";
import type { Lead } from "@/types/lead";

const mockCreateLead = jest.mocked(createLead);
const mockUpdateLeadStatus = jest.mocked(updateLeadStatus);

const lead: Lead = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300300",
  name: "Andi",
  phone: "6281234567890",
  interestSummary: "Tertarik paket kantor.",
  source: "manual",
  status: "new",
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

function request(path: string, method: string, body?: string, origin?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    ...(body !== undefined ? { body } : {}),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
  });
}

describe("same-origin lead routes", () => {
  beforeEach(() => {
    mockCreateLead.mockResolvedValue(lead);
    mockUpdateLeadStatus.mockResolvedValue(lead);
  });

  it("creates normalized manual lead data and rejects cross-origin requests", async () => {
    const body = JSON.stringify({
      name: " Andi ",
      phone: "081234567890",
      interestSummary: " Paket kantor ",
    });
    const response = await create(request("/api/dashboard/leads", "POST", body));
    const forbidden = await create(
      request("/api/dashboard/leads", "POST", body, "https://evil.example"),
    );

    expect(response.status).toBe(201);
    expect(mockCreateLead).toHaveBeenCalledWith({
      name: "Andi",
      phone: "6281234567890",
      interestSummary: "Paket kantor",
    });
    expect(forbidden.status).toBe(403);
  });

  it("rejects malformed, invalid, and ownership-related payloads", async () => {
    const malformed = await create(
      request("/api/dashboard/leads", "POST", "{invalid"),
    );
    const invalid = await create(
      request("/api/dashboard/leads", "POST", JSON.stringify({ phone: "123" })),
    );
    const ownership = await create(
      request(
        "/api/dashboard/leads",
        "POST",
        JSON.stringify({ phone: "081234567890", userId: "private-id" }),
      ),
    );

    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      errors: [{ field: "form" }],
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      errors: [expect.objectContaining({ field: "phone" })],
    });
    expect(ownership.status).toBe(400);
    expect(mockCreateLead).toHaveBeenCalledTimes(0);
  });

  it("maps duplicate field errors and updates a valid status", async () => {
    mockCreateLead.mockRejectedValueOnce(
      new ApiClientError({
        kind: "conflict",
        message: "Nomor WhatsApp sudah terdaftar sebagai lead.",
        status: 409,
        fieldErrors: [{ field: "phone", message: "Gunakan nomor lain." }],
      }),
    );
    const duplicate = await create(
      request(
        "/api/dashboard/leads",
        "POST",
        JSON.stringify({ phone: "081234567890" }),
      ),
    );
    const updated = await updateStatus(
      request(
        `/api/dashboard/leads/${lead.id}/status`,
        "PATCH",
        JSON.stringify({ status: "qualified" }),
      ),
      { params: Promise.resolve({ id: lead.id }) },
    );

    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toMatchObject({
      errors: [{ field: "phone", message: "Gunakan nomor lain." }],
    });
    expect(updated.status).toBe(200);
    expect(mockUpdateLeadStatus).toHaveBeenCalledWith(lead.id, "qualified");
  });

  it("rejects invalid and cross-origin status updates and sanitizes network errors", async () => {
    const invalid = await updateStatus(
      request(
        `/api/dashboard/leads/${lead.id}/status`,
        "PATCH",
        JSON.stringify({ status: "archived" }),
      ),
      { params: Promise.resolve({ id: lead.id }) },
    );
    const forbidden = await updateStatus(
      request(
        `/api/dashboard/leads/${lead.id}/status`,
        "PATCH",
        JSON.stringify({ status: "lost" }),
        "https://evil.example",
      ),
      { params: Promise.resolve({ id: lead.id }) },
    );
    mockUpdateLeadStatus.mockRejectedValueOnce(
      new ApiClientError({ kind: "network", message: "socket details", status: 0 }),
    );
    const network = await updateStatus(
      request(
        `/api/dashboard/leads/${lead.id}/status`,
        "PATCH",
        JSON.stringify({ status: "lost" }),
      ),
      { params: Promise.resolve({ id: lead.id }) },
    );

    expect(invalid.status).toBe(400);
    expect(forbidden.status).toBe(403);
    expect(network.status).toBe(503);
    await expect(network.json()).resolves.toMatchObject({
      message: "Layanan lead sedang tidak tersedia. Silakan coba lagi.",
    });
  });
});
