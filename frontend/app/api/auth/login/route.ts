import { NextResponse, type NextRequest } from "next/server";

import { ApiClientError } from "@/lib/api-errors";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "@/lib/auth/constants";
import { getSafeDashboardReturnTo } from "@/lib/auth/redirects";
import { isSameOriginRequest } from "@/lib/auth/request-security";
import { authenticateUser } from "@/lib/auth/server-auth";
import { loginRequestSchema } from "@/lib/auth/validation";
import type { ApiErrorResponse } from "@/types/api";

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, message },
    { status },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Permintaan tidak diizinkan.", 403);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Format permintaan tidak valid.", 400);
  }

  const parsed = loginRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        message: "Periksa kembali email dan kata sandi.",
        errors: parsed.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? "form"),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const { returnTo, ...credentials } = parsed.data;
    const session = await authenticateUser(credentials);
    const expires = new Date(session.expiresAt);
    if (Number.isNaN(expires.getTime()) || expires <= new Date()) {
      return errorResponse("Sesi login tidak dapat dibuat.", 502);
    }

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      data: {
        user: session.user,
        expiresAt: session.expiresAt,
        redirectTo: getSafeDashboardReturnTo(returnTo),
      },
    });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(
      AUTH_COOKIE_NAME,
      session.accessToken,
      getAuthCookieOptions(expires),
    );
    return response;
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "unauthorized") {
      return errorResponse("Email atau kata sandi salah.", 401);
    }
    if (
      error instanceof ApiClientError &&
      (error.kind === "network" ||
        error.kind === "timeout" ||
        error.kind === "server")
    ) {
      return errorResponse(
        "Layanan login sedang tidak tersedia. Silakan coba lagi.",
        503,
      );
    }
    console.error("[BFF /api/auth/login] unhandled error:", error);
    return errorResponse("Login belum dapat diproses. Silakan coba lagi.", 500);
  }
}
