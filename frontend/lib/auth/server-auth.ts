import "server-only";

import { cache } from "react";

import { cookies } from "next/headers";

import { ApiClientError } from "@/lib/api-errors";
import {
  AUTH_COOKIE_NAME,
  DEMO_CREDENTIALS,
} from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAuthenticatedApiClient, createPublicApiClient } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import { businessProfileService } from "@/services/business-profile.service";
import type { AuthSession, AuthUser, LoginInput } from "@/types/auth";
import type { BusinessProfile } from "@/types/business";

export type DashboardSessionState =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | {
      status: "authenticated";
      user: AuthUser;
      businessProfile: BusinessProfile | null;
    };

function isMockingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
}

function unauthorized(message = "Email atau kata sandi salah.") {
  return new ApiClientError({
    kind: "unauthorized",
    message,
    status: 401,
  });
}

export async function authenticateUser(input: LoginInput): Promise<AuthSession> {
  if (isMockingEnabled()) {
    const { demoAuthSession } = await import("@/mocks/fixtures");
    if (
      input.email !== DEMO_CREDENTIALS.email ||
      input.password !== DEMO_CREDENTIALS.password
    ) {
      throw unauthorized();
    }
    return demoAuthSession;
  }

  const client = createPublicApiClient({
    baseUrl: getServerEnv().API_BASE_URL,
  });
  return (await authService.login(client, input)).data;
}

async function getMockSessionData(accessToken: string) {
  const { businessProfileFixture, demoUser } = await import("@/mocks/fixtures");
  const { MOCK_NO_PROFILE_TOKEN } = await import("@/mocks/auth");
  if (accessToken === "demo-token") {
    return { user: demoUser, businessProfile: businessProfileFixture };
  }
  if (accessToken === MOCK_NO_PROFILE_TOKEN) {
    return { user: { ...demoUser, isDemo: false }, businessProfile: null };
  }
  throw unauthorized("Sesi tidak valid atau telah berakhir.");
}

async function getLiveSessionData(accessToken: string) {
  const client = createAuthenticatedApiClient(accessToken, {
    baseUrl: getServerEnv().API_BASE_URL,
  });
  const user = (await authService.getCurrentUser(client)).data;

  try {
    const businessProfile = (await businessProfileService.getPrivate(client)).data;
    return { user, businessProfile };
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "not_found") {
      return { user, businessProfile: null };
    }
    throw error;
  }
}

export const getDashboardSession = cache(
  async (): Promise<DashboardSessionState> => {
    const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!accessToken) return { status: "missing" };

    try {
      const data = isMockingEnabled()
        ? await getMockSessionData(accessToken)
        : await getLiveSessionData(accessToken);
      return { status: "authenticated", ...data };
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.kind === "unauthorized" || error.kind === "forbidden")
      ) {
        return { status: "invalid" };
      }
      return { status: "unavailable" };
    }
  },
);
