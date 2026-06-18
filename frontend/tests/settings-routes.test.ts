import { NextRequest } from "next/server";

jest.mock("@/lib/settings/server-settings", () => ({
  createBusinessProfile: jest.fn(),
  updateBusinessProfile: jest.fn(),
}));

import {
  PATCH as update,
  POST as create,
} from "@/app/api/dashboard/settings/route";
import { ApiClientError } from "@/lib/api-errors";
import {
  createBusinessProfile,
  updateBusinessProfile,
} from "@/lib/settings/server-settings";
import type { BusinessProfile } from "@/types/business";

const mockCreate = jest.mocked(createBusinessProfile);
const mockUpdate = jest.mocked(updateBusinessProfile);

const profile: BusinessProfile = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300002",
  businessName: "Kopi Senja UMKM",
  slug: "kopi-senja-umkm",
  whatsappNumber: "6281234567890",
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

function request(method: string, body?: string, origin?: string) {
  return new NextRequest("http://localhost:3000/api/dashboard/settings", {
    method,
    ...(body !== undefined ? { body } : {}),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
  });
}

describe("settings BFF routes", () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue(profile);
    mockUpdate.mockResolvedValue(profile);
  });

  describe("POST /api/dashboard/settings", () => {
    it("creates a profile and rejects cross-origin requests", async () => {
      const validBody = JSON.stringify({
        businessName: "Kopi Senja UMKM",
        slug: "kopi-senja-umkm",
        whatsappNumber: "081234567890",
      });
      const response = await create(request("POST", validBody));
      const forbidden = await create(request("POST", validBody, "https://evil.example"));

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({ success: true, data: profile });
      expect(forbidden.status).toBe(403);
    });

    it("validates required fields and slug format", async () => {
      const missingFields = await create(request("POST", JSON.stringify({})));
      const badSlug = await create(
        request(
          "POST",
          JSON.stringify({
            businessName: "Test",
            slug: "INVALID SLUG!",
            whatsappNumber: "081234567890",
          }),
        ),
      );
      const badPhone = await create(
        request(
          "POST",
          JSON.stringify({
            businessName: "Test",
            slug: "valid-slug",
            whatsappNumber: "99999",
          }),
        ),
      );

      expect(missingFields.status).toBe(400);
      await expect(missingFields.json()).resolves.toMatchObject({
        success: false,
        errors: expect.arrayContaining([expect.objectContaining({ field: "businessName" })]),
      });

      expect(badSlug.status).toBe(400);
      await expect(badSlug.json()).resolves.toMatchObject({
        success: false,
        errors: expect.arrayContaining([expect.objectContaining({ field: "slug" })]),
      });

      expect(badPhone.status).toBe(400);
      await expect(badPhone.json()).resolves.toMatchObject({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ field: "whatsappNumber" }),
        ]),
      });
    });

    it("maps conflict errors to a 409 response", async () => {
      mockCreate.mockRejectedValue(
        new ApiClientError({
          kind: "conflict",
          message: "Slug bisnis sudah digunakan.",
          status: 409,
          fieldErrors: [{ field: "slug", message: "Gunakan slug yang berbeda." }],
        }),
      );

      const response = await create(
        request(
          "POST",
          JSON.stringify({
            businessName: "Test",
            slug: "taken-slug",
            whatsappNumber: "081234567890",
          }),
        ),
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        success: false,
        message: "Slug bisnis sudah digunakan.",
        errors: [{ field: "slug", message: "Gunakan slug yang berbeda." }],
      });
    });

    it("sanitizes network failures", async () => {
      mockCreate.mockRejectedValue(
        new ApiClientError({ kind: "network", message: "socket error", status: 0 }),
      );
      const response = await create(
        request(
          "POST",
          JSON.stringify({
            businessName: "Test",
            slug: "test-slug",
            whatsappNumber: "081234567890",
          }),
        ),
      );
      expect(response.status).toBe(503);
    });

    it("rejects malformed JSON", async () => {
      const response = await create(request("POST", "{invalid"));
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/dashboard/settings", () => {
    it("updates a profile with partial data and rejects cross-origin requests", async () => {
      const validBody = JSON.stringify({ businessName: "Updated Name" });
      const response = await update(request("PATCH", validBody));
      const forbidden = await update(request("PATCH", validBody, "https://evil.example"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ success: true, data: profile });
      expect(forbidden.status).toBe(403);
    });

    it("rejects empty patches", async () => {
      const response = await update(request("PATCH", JSON.stringify({})));
      expect(response.status).toBe(400);
    });

    it("normalizes phone numbers before passing to service", async () => {
      await update(request("PATCH", JSON.stringify({ whatsappNumber: "081234567890" })));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ whatsappNumber: "6281234567890" }),
      );
    });

    it("rejects invalid phone numbers", async () => {
      const response = await update(
        request("PATCH", JSON.stringify({ whatsappNumber: "99999" })),
      );
      expect(response.status).toBe(400);
    });

    it("maps not-found errors to 404", async () => {
      mockUpdate.mockRejectedValue(
        new ApiClientError({ kind: "not_found", message: "Profil tidak ditemukan.", status: 404 }),
      );
      const response = await update(
        request("PATCH", JSON.stringify({ businessName: "Test" })),
      );
      expect(response.status).toBe(404);
    });
  });
});
