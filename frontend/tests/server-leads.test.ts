jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";

import {
  createLead,
  getLead,
  listLeads,
  updateLeadStatus,
} from "@/lib/leads/server-leads";
import type { Lead } from "@/types/lead";

const mockCookies = jest.mocked(cookies);
type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieStore(value?: string): CookieStore {
  return {
    get: () => (value ? { name: "ai_sales_session", value } : undefined),
  } as unknown as CookieStore;
}

const baseLead: Lead = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300300",
  chatSessionId: "019b9d80-7a2e-7b4b-8dc1-7a44b6300400",
  name: "Andi",
  phone: "6281234567890",
  interestSummary: "Tertarik paket kopi kantor.",
  source: "chatbot",
  status: "new",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("server lead operations", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
    mockCookies.mockResolvedValue(cookieStore("demo-token"));
    globalThis.__aiSalesMockLeads = [{ ...baseLead }];
  });

  afterEach(() => {
    globalThis.__aiSalesMockLeads = undefined;
  });

  it("searches name, phone, and interest while filtering, ordering, and paginating", async () => {
    globalThis.__aiSalesMockLeads = Array.from({ length: 12 }, (_, index) => ({
      ...baseLead,
      id: `019b9d80-7a2e-7b4b-8dc1-${String(index).padStart(12, "0")}`,
      name: index === 2 ? "Budi Pengiriman" : `Lead ${index}`,
      phone: `62812345${String(index).padStart(5, "0")}`,
      interestSummary: index === 4 ? "Butuh katering rapat" : `Paket kopi ${index}`,
      status: index % 2 === 0 ? "qualified" : "new",
      createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const response = await listLeads({ page: 2, limit: 3, status: "qualified" });
    const nameMatch = await listLeads({ search: "PENGIRIMAN" });
    const phoneMatch = await listLeads({ search: "00004" });
    const interestMatch = await listLeads({ search: "KATERING" });

    expect(response.meta).toEqual({ page: 2, limit: 3, total: 6, totalPages: 2 });
    expect(response.data).toHaveLength(3);
    expect(response.data[0]!.createdAt >= response.data[1]!.createdAt).toBe(true);
    expect(nameMatch.data).toHaveLength(1);
    expect(phoneMatch.data).toHaveLength(1);
    expect(interestMatch.data).toHaveLength(1);
  });

  it("normalizes manual creation, prevents canonical duplicates, and preserves one row", async () => {
    const created = await createLead({
      name: "Sari",
      phone: "081355566677",
      interestSummary: "Pesanan acara",
      source: "untrusted-source",
    });
    expect(created).toMatchObject({
      phone: "6281355566677",
      source: "manual",
      status: "new",
    });

    await expect(createLead({ phone: "+6281355566677" })).rejects.toMatchObject({
      kind: "conflict",
      status: 409,
      fieldErrors: [{ field: "phone" }],
    });
    expect(globalThis.__aiSalesMockLeads).toHaveLength(2);
  });

  it("gets a detail and updates every supported status", async () => {
    await expect(getLead(baseLead.id)).resolves.toMatchObject({ name: "Andi" });
    for (const status of [
      "contacted",
      "qualified",
      "closed",
      "lost",
      "new",
    ] as const) {
      await expect(updateLeadStatus(baseLead.id, status)).resolves.toMatchObject({
        status,
      });
    }
  });

  it("rejects invalid phones, missing records, and unauthenticated access", async () => {
    await expect(createLead({ phone: "123" })).rejects.toMatchObject({
      kind: "validation",
      status: 422,
    });
    await expect(getLead("missing")).rejects.toMatchObject({ status: 404 });
    await expect(updateLeadStatus("missing", "lost")).rejects.toMatchObject({
      status: 404,
    });
    mockCookies.mockResolvedValue(cookieStore());
    await expect(listLeads({ page: 1 })).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
    });
  });
});
