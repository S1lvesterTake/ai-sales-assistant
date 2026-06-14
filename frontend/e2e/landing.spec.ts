import { expect, test } from "@playwright/test";

test("explains the product and exposes primary conversion paths", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Jawab pelanggan lebih cepat. Tangkap peluang penjualan lebih rapi.",
    }),
  ).toBeVisible();
  await expect(page.locator("#cara-kerja")).toBeVisible();
  await expect(page.locator("#fitur")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Hubungi Kopi Senja" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(
    page.getByRole("link", { name: "Buka Swagger API" }),
  ).toHaveAttribute("href", "http://localhost:3001/api/docs");
});

test("fits the landing page at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(
    page.getByRole("button", { name: "Buka navigasi" }),
  ).toBeVisible();
});
