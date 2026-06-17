import { expect, test } from "@playwright/test";

import { DEMO_CREDENTIALS } from "../lib/auth/constants";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("views, edits, and previews the business profile settings", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await login(page);
  await page.goto("/dashboard/settings");

  await expect(page.getByRole("heading", { name: "Profil bisnis" })).toBeVisible();

  // Existing profile is loaded from MSW fixture
  expect(await page.getByLabel("Nama bisnis").inputValue()).toBe("Kopi Senja UMKM");
  expect(await page.getByLabel("Slug bisnis").inputValue()).toBe("kopi-senja-umkm");

  // Demo user: businessName is disabled
  await expect(page.getByLabel("Nama bisnis")).toBeDisabled();

  // Slug is read-only with immutability hint
  await expect(page.getByLabel("Slug bisnis")).toBeDisabled();
  await expect(page.getByText(/Slug tidak dapat diubah/)).toBeVisible();

  // Chatbot link section is visible
  await expect(page.getByText(/Tautan chatbot publik/)).toBeVisible();
  await expect(page.getByText("/chat/kopi-senja-umkm")).toBeVisible();

  // Edit a non-protected field
  await page.getByLabel("Kategori").fill("Kuliner & Minuman");
  await expect(page.getByText(/Ada perubahan yang belum disimpan/)).toBeVisible();

  // Save the profile
  const patchPromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/dashboard/settings") &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: /Simpan perubahan/ }).click();
  const patchResponse = await patchPromise;
  expect(patchResponse.ok()).toBe(true);

  // Unsaved-changes warning disappears after save
  await expect(page.getByText(/Ada perubahan yang belum disimpan/)).not.toBeVisible();

  // Preview link opens in a new tab (verify href)
  const previewLink = page.getByRole("link", { name: /Buka chatbot di tab baru/ });
  await expect(previewLink).toHaveAttribute("href", "/chat/kopi-senja-umkm");
  await expect(previewLink).toHaveAttribute("target", "_blank");

  // Responsive check at 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/settings");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
