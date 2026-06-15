jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";

import {
  createFaq,
  deleteFaq,
  listFaqs,
  updateFaq,
} from "@/lib/faqs/server-faqs";
import type { Faq } from "@/types/faq";

const mockCookies = jest.mocked(cookies);
type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieStore(value?: string): CookieStore {
  return {
    get: () => (value ? { name: "ai_sales_session", value } : undefined),
  } as unknown as CookieStore;
}

const baseFaq: Faq = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300200",
  question: "Apakah bisa pesan untuk acara?",
  answer: "Bisa. Hubungi WhatsApp dua hari sebelumnya.",
  category: "Pemesanan",
  isActive: true,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("server FAQ operations", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
    mockCookies.mockResolvedValue(cookieStore("demo-token"));
    globalThis.__aiSalesMockFaqs = [{ ...baseFaq }];
  });

  afterEach(() => {
    globalThis.__aiSalesMockFaqs = undefined;
  });

  it("searches question and answer, filters, orders, and paginates", async () => {
    globalThis.__aiSalesMockFaqs = Array.from({ length: 12 }, (_, index) => ({
      ...baseFaq,
      id: `019b9d80-7a2e-7b4b-8dc1-${String(index).padStart(12, "0")}`,
      question: `Pertanyaan acara ${index}`,
      answer: index === 2 ? "Jawaban pengiriman khusus" : `Jawaban ${index}`,
      category: index === 0 ? "Operasional" : "Pemesanan",
      isActive: index % 2 === 0,
      createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const response = await listFaqs({
      page: 2,
      limit: 3,
      search: "acara",
      category: "pemesanan",
      isActive: true,
    });
    const answerMatch = await listFaqs({ search: "PENGIRIMAN" });

    expect(response.meta).toEqual({
      page: 2,
      limit: 3,
      total: 5,
      totalPages: 2,
    });
    expect(response.data).toHaveLength(2);
    expect(response.data[0]!.createdAt >= response.data[1]!.createdAt).toBe(true);
    expect(answerMatch.data).toHaveLength(1);
  });

  it("creates, updates, and deletes FAQ data", async () => {
    const created = await createFaq({
      question: "Apakah tersedia pengiriman?",
      answer: "Tersedia untuk area tertentu.",
      isActive: true,
    });
    expect(created.id).toEqual(expect.any(String));

    const updated = await updateFaq(created.id, {
      answer: "Tersedia melalui kurir lokal.",
      isActive: false,
    });
    expect(updated).toMatchObject({
      answer: "Tersedia melalui kurir lokal.",
      isActive: false,
    });

    await deleteFaq(created.id);
    await expect(deleteFaq(created.id)).rejects.toMatchObject({
      kind: "not_found",
      status: 404,
    });
  });

  it("requires the authenticated dashboard cookie", async () => {
    mockCookies.mockResolvedValue(cookieStore());
    await expect(listFaqs({ page: 1 })).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
    });
  });
});
