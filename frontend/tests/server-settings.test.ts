jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
jest.mock("server-only", () => ({}));
jest.mock("@/lib/server-env", () => ({
  getServerEnv: jest.fn().mockReturnValue({ API_BASE_URL: "http://localhost:3001" }),
}));
jest.mock("@/services/business-profile.service", () => ({
  businessProfileService: {
    getPrivate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

import { cookies } from "next/headers";

// eslint-disable-next-line import/order
import { businessProfileService } from "@/services/business-profile.service";
import {
  createBusinessProfile,
  getBusinessProfile,
  updateBusinessProfile,
} from "@/lib/settings/server-settings";
import { ApiClientError } from "@/lib/api-errors";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieStore(value?: string): CookieStore {
  return {
    get: () => (value ? { name: "ai_sales_session", value } : undefined),
  } as unknown as CookieStore;
}

const mockCookies = jest.mocked(cookies);
const mockSvc = businessProfileService as unknown as {
  getPrivate: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

// Force live mode so we test the real service path (not the globalThis mock path)
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_MOCKING = "disabled";
});

afterAll(() => {
  process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
});

describe("server-settings", () => {
  beforeEach(() => {
    mockCookies.mockResolvedValue(cookieStore("demo-token"));
  });

  it("returns null when the backend reports not_found", async () => {
    mockSvc.getPrivate.mockRejectedValue(
      new ApiClientError({ kind: "not_found", message: "Not found", status: 404 }),
    );
    const result = await getBusinessProfile();
    expect(result).toBeNull();
  });

  it("rethrows non-not_found errors from getBusinessProfile", async () => {
    mockSvc.getPrivate.mockRejectedValue(
      new ApiClientError({ kind: "server", message: "Server error", status: 500 }),
    );
    await expect(getBusinessProfile()).rejects.toBeInstanceOf(ApiClientError);
  });

  it("creates and returns a business profile", async () => {
    const profile = {
      id: "profile-id",
      businessName: "Test",
      slug: "test",
      whatsappNumber: "6281234567890",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    mockSvc.create.mockResolvedValue({ success: true, message: "Created", data: profile });
    const result = await createBusinessProfile({
      businessName: "Test",
      slug: "test",
      whatsappNumber: "6281234567890",
    });
    expect(result).toEqual(profile);
  });

  it("updates and returns the business profile", async () => {
    const profile = {
      id: "profile-id",
      businessName: "Updated",
      slug: "test",
      whatsappNumber: "6281234567890",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    mockSvc.update.mockResolvedValue({ success: true, message: "Updated", data: profile });
    const result = await updateBusinessProfile({ businessName: "Updated" });
    expect(result).toEqual(profile);
  });

  it("throws unauthorized when no cookie is present", async () => {
    mockCookies.mockResolvedValue(cookieStore(undefined));
    await expect(getBusinessProfile()).rejects.toMatchObject({ kind: "unauthorized" });
  });
});
