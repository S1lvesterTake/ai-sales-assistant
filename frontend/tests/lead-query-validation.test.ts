import {
  formatLeadDate,
  formatLeadPhone,
  leadStatusLabel,
  leadWhatsappHref,
} from "@/lib/leads/display";
import { leadPageHref, parseLeadSearchParams } from "@/lib/leads/query";
import {
  leadStatusSchema,
  manualLeadSchema,
  toManualLeadInput,
} from "@/lib/leads/validation";

describe("lead query, validation, and display utilities", () => {
  it("normalizes search, status, and pagination", () => {
    const parsed = parseLeadSearchParams({
      page: "2",
      search: "  kopi kantor  ",
      status: "qualified",
    });

    expect(parsed).toEqual({
      filters: { search: "kopi kantor", status: "qualified" },
      query: { page: 2, limit: 10, search: "kopi kantor", status: "qualified" },
    });
    expect(leadPageHref(3, parsed.filters)).toBe(
      "/dashboard/leads?page=3&search=kopi+kantor&status=qualified",
    );
  });

  it("bounds URL inputs and ignores unsupported statuses", () => {
    const parsed = parseLeadSearchParams({
      page: "0",
      search: "x".repeat(150),
      status: "archived",
    });

    expect(parsed.query.page).toBe(1);
    expect(parsed.filters.search).toHaveLength(100);
    expect(parsed.filters.status).toBe("all");
    expect(leadPageHref(1, { search: "", status: "all" })).toBe(
      "/dashboard/leads",
    );
  });

  it.each(["081234567890", "6281234567890", "+6281234567890"])(
    "accepts and canonicalizes Indonesian phone input %s",
    (phone) => {
      const parsed = manualLeadSchema.safeParse({ phone });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(toManualLeadInput(parsed.data)).toEqual({
          phone: "6281234567890",
        });
      }
    },
  );

  it("rejects invalid phones, oversized fields, unknown ownership fields, and statuses", () => {
    expect(manualLeadSchema.safeParse({ phone: "123" }).success).toBe(false);
    expect(
      manualLeadSchema.safeParse({ phone: "081234567890", name: "x".repeat(101) })
        .success,
    ).toBe(false);
    expect(
      manualLeadSchema.safeParse({
        phone: "081234567890",
        businessProfileId: "private-id",
      }).success,
    ).toBe(false);
    expect(leadStatusSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("formats phone, status, date, and a safely encoded WhatsApp URL", () => {
    expect(formatLeadPhone("081234567890")).toBe("+62 812-3456-7890");
    expect(leadStatusLabel("contacted")).toBe("Dihubungi");
    expect(formatLeadDate("invalid")).toBe("Tanggal tidak tersedia");
    const href = leadWhatsappHref("+6281234567890", "Andi");
    expect(href).toContain("https://wa.me/6281234567890");
    expect(new URL(href!).searchParams.get("text")).toContain("Halo Andi");
    expect(leadWhatsappHref("invalid")).toBeNull();
  });
});
