import { NextRequest } from "next/server";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as expireSession } from "@/app/api/auth/session-expired/route";
import { AUTH_COOKIE_NAME, DEMO_CREDENTIALS } from "@/lib/auth/constants";

describe("same-origin authentication routes", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
  });

  it("sets an HttpOnly cookie without returning the JWT in JSON", async () => {
    const response = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          ...DEMO_CREDENTIALS,
          returnTo: "/dashboard/leads?page=2",
        }),
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("demo-token");
    expect(body).toMatchObject({
      success: true,
      data: { redirectTo: "/dashboard/leads?page=2" },
    });
    expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=demo-token`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
  });

  it("rejects invalid credentials without creating a cookie", async () => {
    const response = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: DEMO_CREDENTIALS.email,
          password: "wrong-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: "Email atau kata sandi salah.",
    });
  });

  it("rejects cross-origin login and sanitizes open redirects", async () => {
    const forbidden = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
        body: JSON.stringify(DEMO_CREDENTIALS),
      }),
    );
    expect(forbidden.status).toBe(403);

    const safe = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          ...DEMO_CREDENTIALS,
          returnTo: "https://evil.example/steal",
        }),
      }),
    );
    await expect(safe.json()).resolves.toMatchObject({
      data: { redirectTo: "/dashboard" },
    });
  });

  it("returns a sanitized service error when the backend is unavailable", async () => {
    process.env.NEXT_PUBLIC_API_MOCKING = "disabled";
    process.env.API_BASE_URL = "http://localhost:3001";
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("socket details"));

    const response = await login(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify(DEMO_CREDENTIALS),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Layanan login sedang tidak tersedia. Silakan coba lagi.",
    });
  });

  it("clears the cookie on logout and expired-session recovery", async () => {
    const logoutResponse = await logout(
      new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      }),
    );
    const expiredResponse = expireSession(
      new NextRequest(
        "http://localhost:3000/api/auth/session-expired?returnTo=//evil.example",
      ),
    );

    expect(logoutResponse.status).toBe(303);
    expect(logoutResponse.headers.get("set-cookie")).toContain(
      `${AUTH_COOKIE_NAME}=`,
    );
    expect(expiredResponse.headers.get("location")).toBe(
      "http://localhost:3000/login?reason=expired&returnTo=%2Fdashboard",
    );
    expect(expiredResponse.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
