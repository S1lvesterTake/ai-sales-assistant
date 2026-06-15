import { expect, test } from "@playwright/test";

test("loads the frontend foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /jawab pelanggan lebih cepat/i,
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/AI Sales Assistant untuk UMKM/);
});
