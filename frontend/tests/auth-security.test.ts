import { NextRequest } from "next/server";

import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "@/lib/auth/constants";
import { getSafeDashboardReturnTo } from "@/lib/auth/redirects";
import { proxy } from "@/proxy";

describe("authentication security utilities", () => {
  it.each([
    [undefined, "/dashboard"],
    ["/dashboard", "/dashboard"],
    ["/dashboard/leads?page=2", "/dashboard/leads?page=2"],
    ["https://evil.example/dashboard", "/dashboard"],
    ["//evil.example/dashboard", "/dashboard"],
    ["/login", "/dashboard"],
    ["/dashboard\\evil", "/dashboard"],
  ])("normalizes dashboard return target %s", (value, expected) => {
    expect(getSafeDashboardReturnTo(value)).toBe(expected);
  });

  it("uses a browser-inaccessible, same-site auth cookie", () => {
    expect(getAuthCookieOptions(new Date("2026-06-15T08:00:00.000Z"))).toMatchObject({
      httpOnly: true,
      path: "/",
      priority: "high",
      sameSite: "lax",
    });
  });

  it("redirects an unauthenticated dashboard request and preserves its path", () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/dashboard/leads?page=2"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?returnTo=%2Fdashboard%2Fleads%3Fpage%3D2",
    );
  });

  it("redirects a cookie-bearing login request to the dashboard", () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/login", {
        headers: { cookie: `${AUTH_COOKIE_NAME}=demo-token` },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });
});
