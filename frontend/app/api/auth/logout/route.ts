import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import {
  getRequestOrigin,
  isSameOriginRequest,
} from "@/lib/auth/request-security";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  const response = NextResponse.redirect(
    new URL("/login?reason=logged-out", getRequestOrigin(request)),
    { status: 303 },
  );
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
