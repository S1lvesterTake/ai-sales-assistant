export const AUTH_COOKIE_NAME = "ai_sales_access_token";
export const AUTH_RETURN_TO_HEADER = "x-dashboard-return-to";

export const DEMO_CREDENTIALS = {
  email: "demo@kopisenja.id",
  password: "DemoKopiSenja2026!",
} as const;

export function getAuthCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    path: "/",
    priority: "high" as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
