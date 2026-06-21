import "server-only";

import { cookies } from "next/headers";

import { ApiClientError } from "@/lib/api-errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAuthenticatedApiClient } from "@/services/api-client";
import { businessProfileService } from "@/services/business-profile.service";
import type { BusinessProfile, BusinessProfileInput } from "@/types/business";

declare global {
  var __aiSalesMockBusinessProfile: BusinessProfile | null | undefined;
}

async function getMockProfile(): Promise<BusinessProfile | null> {
  if (globalThis.__aiSalesMockBusinessProfile === undefined) {
    const { businessProfileFixture } = await import("@/mocks/fixtures");
    globalThis.__aiSalesMockBusinessProfile = structuredClone(businessProfileFixture);
  }
  return globalThis.__aiSalesMockBusinessProfile ?? null;
}

async function requireAccessToken(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (
    !token ||
    (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && token !== "demo-token")
  ) {
    throw new ApiClientError({
      kind: "unauthorized",
      message: "Sesi tidak valid atau telah berakhir.",
      status: 401,
    });
  }
  return token;
}

function privateClient(accessToken: string) {
  return createAuthenticatedApiClient(accessToken, {
    baseUrl: getServerEnv().API_BASE_URL,
  });
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    try {
      return (await businessProfileService.getPrivate(privateClient(accessToken))).data;
    } catch (error) {
      if (error instanceof ApiClientError && error.kind === "not_found") return null;
      throw error;
    }
  }
  return getMockProfile();
}

export async function createBusinessProfile(
  input: BusinessProfileInput,
): Promise<BusinessProfile> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await businessProfileService.create(privateClient(accessToken), input)).data;
  }

  const current = await getMockProfile();
  if (current) {
    throw new ApiClientError({
      kind: "conflict",
      message: "Bisnis sudah memiliki profil.",
      status: 409,
    });
  }
  const now = new Date().toISOString();
  const profile: BusinessProfile = {
    id: crypto.randomUUID(),
    slug: input.slug ?? "new-business",
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  globalThis.__aiSalesMockBusinessProfile = profile;
  return profile;
}

export async function updateBusinessProfile(
  input: Partial<BusinessProfileInput>,
): Promise<BusinessProfile> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await businessProfileService.update(privateClient(accessToken), input)).data;
  }

  const current = await getMockProfile();
  if (!current) {
    throw new ApiClientError({
      kind: "not_found",
      message: "Profil bisnis tidak ditemukan.",
      status: 404,
    });
  }
  const updated: BusinessProfile = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  globalThis.__aiSalesMockBusinessProfile = updated;
  return updated;
}
