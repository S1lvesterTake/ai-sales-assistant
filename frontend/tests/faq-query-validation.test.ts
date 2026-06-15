import { faqPageHref, parseFaqSearchParams } from "@/lib/faqs/query";
import { faqSchema, updateFaqSchema } from "@/lib/faqs/validation";

describe("FAQ query and validation", () => {
  it("normalizes search, category, status, and pagination", () => {
    const parsed = parseFaqSearchParams({
      page: "2",
      search: "  acara  ",
      category: "  Pemesanan  ",
      isActive: "false",
    });

    expect(parsed).toEqual({
      filters: {
        search: "acara",
        category: "Pemesanan",
        activeStatus: "inactive",
      },
      query: {
        page: 2,
        limit: 10,
        search: "acara",
        category: "Pemesanan",
        isActive: false,
      },
    });
    expect(faqPageHref(3, parsed.filters)).toBe(
      "/dashboard/faqs?page=3&search=acara&category=Pemesanan&isActive=false",
    );
  });

  it("falls back from invalid values and bounds URL inputs", () => {
    const parsed = parseFaqSearchParams({
      page: "0",
      search: "x".repeat(350),
      category: "y".repeat(120),
      isActive: "invalid",
    });

    expect(parsed.query.page).toBe(1);
    expect(parsed.filters.search).toHaveLength(300);
    expect(parsed.filters.category).toHaveLength(100);
    expect(parsed.filters.activeStatus).toBe("all");
    expect(
      faqPageHref(1, { search: "", category: "", activeStatus: "all" }),
    ).toBe("/dashboard/faqs");
  });

  it("requires question and answer and enforces maximum lengths", () => {
    expect(
      faqSchema.safeParse({
        question: "Apakah buka hari Minggu?",
        answer: "Ya, kami buka setiap hari.",
        isActive: true,
      }).success,
    ).toBe(true);
    expect(faqSchema.safeParse({ answer: "Jawaban", isActive: true }).success).toBe(
      false,
    );
    expect(
      faqSchema.safeParse({ question: "Pertanyaan", isActive: true }).success,
    ).toBe(false);
    expect(
      faqSchema.safeParse({
        question: "x".repeat(301),
        answer: "Jawaban",
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      faqSchema.safeParse({
        question: "Pertanyaan",
        answer: "x".repeat(1001),
        isActive: true,
      }).success,
    ).toBe(false);
    expect(updateFaqSchema.safeParse({}).success).toBe(false);
  });
});
