import { expect, test } from "@playwright/test";

import { DEMO_CREDENTIALS } from "../lib/auth/constants";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("renders server dashboard metrics and bounded recent activity", async ({
  page,
}) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "Dashboard Kopi Senja" }),
  ).toBeVisible();
  await expect(page.getByText("Total lead")).toBeVisible();
  await expect(page.getByText("24", { exact: true })).toBeVisible();
  await expect(page.getByText("86", { exact: true })).toBeVisible();
  await expect(page.getByText("31", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Tertarik paket kopi untuk rapat kantor."),
  ).toBeVisible();
  await expect(page.getByText("18 kali")).toBeVisible();
  await expect(page.locator('main a[href="/dashboard/leads"]')).toBeVisible();
});

test("fits the protected dashboard at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(
    page.getByRole("button", { name: "Buka menu dashboard" }),
  ).toBeVisible();
});
