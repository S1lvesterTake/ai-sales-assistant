import { expect, test } from "@playwright/test";

import {
  AUTH_COOKIE_NAME,
  DEMO_CREDENTIALS,
} from "../lib/auth/constants";
import { MOCK_NO_PROFILE_TOKEN } from "../mocks/auth";

test("demo login creates an HttpOnly session, protects routes, and logs out", async ({
  context,
  page,
}) => {
  await page.goto("/dashboard?view=recent");
  await expect(page).toHaveURL(
    /\/login\?returnTo=%2Fdashboard%3Fview%3Drecent$/,
  );

  await page.getByRole("button", { name: "Gunakan akun demo" }).click();
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();

  await expect(page).toHaveURL(/\/dashboard\?view=recent$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard Kopi Senja" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    AUTH_COOKIE_NAME,
  );
  const authCookie = (await context.cookies()).find(
    (cookie) => cookie.name === AUTH_COOKIE_NAME,
  );
  expect(authCookie).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
    value: "demo-token",
  });

  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login\?reason=logged-out$/);
  expect(
    (await context.cookies()).some((cookie) => cookie.name === AUTH_COOKIE_NAME),
  ).toBe(false);
});

test("invalid credentials and external return targets remain on the app", async ({
  page,
}) => {
  await page.goto("/login?returnTo=https://evil.example/steal");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill("wrong-password");
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3100");
});

test("invalid sessions are cleared and users without a profile enter onboarding", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: "invalid-token",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/dashboard/leads");
  await expect(page).toHaveURL(
    /\/login\?reason=expired&returnTo=%2Fdashboard%2Fleads$/,
  );
  await expect(page.getByText("Sesi Anda telah berakhir")).toBeVisible();

  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: MOCK_NO_PROFILE_TOKEN,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard\/settings\?onboarding=1$/);
  await expect(page.getByText("Profil bisnis perlu dilengkapi")).toBeVisible();
});
