import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getSafeDashboardReturnTo } from "@/lib/auth/redirects";
import { getRequestOrigin } from "@/lib/auth/request-security";

export function GET(request: NextRequest) {
  const returnTo = getSafeDashboardReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );
  const loginUrl = new URL("/login", getRequestOrigin(request));
  loginUrl.searchParams.set("reason", "expired");
  loginUrl.searchParams.set("returnTo", returnTo);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
