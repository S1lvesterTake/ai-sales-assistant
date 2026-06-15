import type { NextRequest } from "next/server";

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const expectedUrl = getRequestOrigin(request);
    return (
      originUrl.host === expectedUrl.host &&
      originUrl.protocol === expectedUrl.protocol
    );
  } catch {
    return false;
  }
}

export function getRequestOrigin(request: NextRequest): URL {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return new URL(`${protocol}://${host}`);
}
