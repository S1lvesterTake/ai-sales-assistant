import { expect, test } from "@playwright/test";

import { DEMO_CREDENTIALS } from "../lib/auth/constants";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("manages, filters, and paginates product knowledge without losing state", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const cleanupIds = new Set<string>();
  const runId = Date.now();
  const productName = `Produk E2E ${runId}`;
  const editedName = `${productName} Edit`;
  const paginationCategory = `Pagination-${runId}`;

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

  try {
    await page.goto("/dashboard/products");
    await expect(page.getByRole("heading", { name: "Produk" })).toBeVisible();
    await expect(page.getByText("Kopi Susu Gula Aren").first()).toBeVisible();
    await expect(page.getByText(/Rp\s?18\.000/).first()).toBeVisible();

    await page.getByLabel("Filter kategori").fill("Kopi");
    await page.getByLabel("Filter ketersediaan").selectOption("false");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/category=Kopi.*isAvailable=false/);
    await expect(page.getByText("Produk tidak ditemukan")).toBeVisible();
    await page.getByRole("link", { name: "Lihat semua produk" }).click();

    await page.getByRole("button", { name: "Tambah produk" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Nama produk/).fill(productName);
    await dialog.getByLabel(/Harga/).fill("27500");
    await dialog.getByLabel("Deskripsi").fill("Produk untuk verifikasi Playwright.");
    await dialog.getByRole("textbox", { name: "Kategori" }).fill("Pengujian");
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/dashboard/products") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Simpan produk" }).click();
    const createResponse = await createResponsePromise;
    const createBody = (await createResponse.json()) as { data: { id: string } };
    cleanupIds.add(createBody.data.id);
    await expect(page.getByText(productName).first()).toBeVisible();

    await page.getByRole("button", { name: "Tambah produk" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Nama produk/).fill(productName);
    await dialog.getByLabel(/Harga/).fill("27500");
    await page.getByRole("button", { name: "Simpan produk" }).click();
    await expect(
      page.getByText("Gunakan nama produk yang berbeda."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    const productRow = page.getByRole("row").filter({ hasText: productName });
    await productRow.getByRole("button", { name: "Edit" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Nama produk/).fill(editedName);
    await dialog.getByLabel(/Harga/).fill("30000");
    await page.getByRole("button", { name: "Simpan produk" }).click();
    await expect(page.getByText(editedName).first()).toBeVisible();
    await expect(page.getByText(/Rp\s?30\.000/).first()).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: editedName });
    await editedRow
      .getByRole("switch", { name: `Ubah ketersediaan ${editedName}` })
      .click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: editedName })
        .getByText("Nonaktif"),
    ).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: editedName })
      .getByRole("button", { name: "Hapus" })
      .click();
    await expect(page.getByRole("heading", { name: "Hapus produk?" })).toBeVisible();
    await page.getByRole("button", { name: "Hapus produk" }).click();
    await expect(page.getByText(editedName)).toHaveCount(0);
    cleanupIds.delete(createBody.data.id);

    for (let index = 0; index < 11; index += 1) {
      const response = await page.request.post("/api/dashboard/products", {
          data: {
            name: `Produk Pagination ${runId}-${index}`,
            price: 10000 + index,
            category: paginationCategory,
            isAvailable: true,
          },
        });
      expect(response.ok()).toBe(true);
      const body = (await response.json()) as { data: { id: string } };
      cleanupIds.add(body.data.id);
    }

    await page.goto(
      `/dashboard/products?category=${encodeURIComponent(paginationCategory)}&page=2`,
    );
    await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
    await expect(page.getByText("Menampilkan 1 dari 11 produk")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sebelumnya" })).toBeVisible();

    const onlyRow = page.locator("tbody tr");
    await expect(onlyRow).toHaveCount(1);
    await onlyRow.getByRole("button", { name: "Hapus" }).click();
    await page.getByRole("button", { name: "Hapus produk" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/products\\?category=${paginationCategory}$`),
    );
    await expect(page.getByText("Halaman 1 dari 1")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/products");
    await expect(page.getByRole("button", { name: "Buka menu dashboard" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  } finally {
    await Promise.all(
      [...cleanupIds].map((id) =>
        page.request.delete(`/api/dashboard/products/${encodeURIComponent(id)}`),
      ),
    );
  }
});
