import { expect, test } from "@playwright/test";

import { DEMO_CREDENTIALS } from "../lib/auth/constants";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("manages, searches, filters, and paginates FAQ knowledge", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const cleanupIds = new Set<string>();
  const runId = Date.now();
  const question = `Apakah tersedia layanan E2E ${runId}?`;
  const editedQuestion = `Bagaimana layanan E2E ${runId}?`;
  const paginationCategory = `FAQ-${runId}`;

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
    await page.goto("/dashboard/faqs");
    await expect(page.getByRole("heading", { name: "FAQ" })).toBeVisible();
    await expect(page.getByText("Apakah bisa pesan untuk acara?").first()).toBeVisible();

    await page.getByLabel("Cari FAQ").fill("tidak ditemukan");
    await page.getByLabel("Filter kategori FAQ").fill("Pemesanan");
    await page.getByLabel("Filter status FAQ").selectOption("false");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/search=tidak\+ditemukan.*isActive=false/);
    await expect(page.getByText("FAQ tidak ditemukan")).toBeVisible();
    await page.getByRole("link", { name: "Lihat semua FAQ" }).click();

    await page.getByRole("button", { name: "Tambah FAQ" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Pertanyaan/).fill(question);
    await dialog.getByLabel(/Jawaban/).fill("Tersedia untuk kebutuhan pengujian.");
    await dialog.getByRole("textbox", { name: "Kategori" }).fill("Pengujian");
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/dashboard/faqs") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Simpan FAQ" }).click();
    const createResponse = await createResponsePromise;
    const createBody = (await createResponse.json()) as { data: { id: string } };
    cleanupIds.add(createBody.data.id);
    await expect(page.getByText(question).first()).toBeVisible();

    const faqRow = page.getByRole("row").filter({ hasText: question });
    await faqRow.getByRole("button", { name: "Edit" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Pertanyaan/).fill(editedQuestion);
    await dialog.getByLabel(/Jawaban/).fill("Jawaban FAQ sudah diperbarui.");
    await dialog.getByRole("button", { name: "Simpan FAQ" }).click();
    await expect(page.getByText(editedQuestion).first()).toBeVisible();
    await expect(page.getByText("Jawaban FAQ sudah diperbarui.").first()).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: editedQuestion });
    await editedRow
      .getByRole("switch", { name: `Ubah status ${editedQuestion}` })
      .click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: editedQuestion })
        .getByText("Nonaktif"),
    ).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: editedQuestion })
      .getByRole("button", { name: "Hapus" })
      .click();
    await expect(page.getByRole("heading", { name: "Hapus FAQ?" })).toBeVisible();
    await page.getByRole("button", { name: "Hapus FAQ" }).click();
    await expect(page.getByText(editedQuestion)).toHaveCount(0);
    cleanupIds.delete(createBody.data.id);

    for (let index = 0; index < 11; index += 1) {
      const response = await page.request.post("/api/dashboard/faqs", {
          data: {
            question: `FAQ Pagination ${runId}-${index}?`,
            answer: `Jawaban pagination ${index}.`,
            category: paginationCategory,
            isActive: true,
          },
        });
      expect(response.ok()).toBe(true);
      const body = (await response.json()) as { data: { id: string } };
      cleanupIds.add(body.data.id);
    }

    await page.goto(
      `/dashboard/faqs?category=${encodeURIComponent(paginationCategory)}&page=2`,
    );
    await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
    await expect(page.getByText("Menampilkan 1 dari 11 FAQ")).toBeVisible();
    const onlyRow = page.locator("tbody tr");
    await expect(onlyRow).toHaveCount(1);
    await onlyRow.getByRole("button", { name: "Hapus" }).click();
    await page.getByRole("button", { name: "Hapus FAQ" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/faqs\\?category=${paginationCategory}$`),
    );
    await expect(page.getByText("Halaman 1 dari 1")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/faqs");
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
        page.request.delete(`/api/dashboard/faqs/${encodeURIComponent(id)}`),
      ),
    );
  }
});
