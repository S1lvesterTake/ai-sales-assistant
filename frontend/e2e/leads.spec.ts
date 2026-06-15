import { expect, test } from "@playwright/test";

import { DEMO_CREDENTIALS } from "../lib/auth/constants";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CREDENTIALS.email);
  await page.getByLabel("Kata sandi").fill(DEMO_CREDENTIALS.password);
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("manages, follows up, filters, and paginates authorized leads", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const runId = Date.now();
  const runSuffix = String(runId).slice(-7);
  const leadName = `Lead E2E ${runId}`;
  const rawPhone = `0812${runSuffix}`;
  const canonicalPhone = `62812${runSuffix}`;
  const paginationSearch = `Batch Lead ${runId}`;

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
  await page.goto("/dashboard/leads");
  await expect(page.getByRole("heading", { name: "Lead" })).toBeVisible();
  await expect(page.getByText("Andi").first()).toBeVisible();
  await expect(page.getByText("+62 812-3456-7890").first()).toBeVisible();

  await page.getByLabel("Cari lead").fill("tidak ditemukan");
  await page.getByLabel("Filter status lead").selectOption("lost");
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect(page).toHaveURL(/search=tidak\+ditemukan.*status=lost/);
  await expect(page.getByText("Lead tidak ditemukan")).toBeVisible();
  await page.getByRole("link", { name: "Lihat semua lead" }).click();

  await page.getByRole("button", { name: "Tambah lead" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama").fill(leadName);
  await dialog.getByLabel(/Nomor WhatsApp/).fill(rawPhone);
  await dialog.getByLabel("Ringkasan minat").fill("Tertarik paket katering kantor.");
  await page.getByRole("button", { name: "Simpan lead" }).click();
  const leadRow = page.getByRole("row").filter({ hasText: leadName });
  await expect(leadRow).toBeVisible();
  await expect(leadRow).toContainText(`+62 812-${runSuffix.slice(0, 4)}-${runSuffix.slice(4)}`);

  await page.getByRole("button", { name: "Tambah lead" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nomor WhatsApp/).fill(`+${canonicalPhone}`);
  await page.getByRole("button", { name: "Simpan lead" }).click();
  await expect(
    page.getByText("Gunakan nomor lain atau buka lead yang sudah ada."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("row").filter({ hasText: leadName })).toHaveCount(1);

  await leadRow.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByText("Lead manual ini tidak memiliki percakapan chatbot"))
    .toBeVisible();
  const whatsapp = page.getByRole("link", { name: "Follow up via WhatsApp" });
  await expect(whatsapp).toHaveAttribute(
    "href",
    new RegExp(`wa.me/${canonicalPhone}`),
  );
  await page.getByRole("button", { name: "Close" }).click();

  await leadRow
    .getByLabel(`Ubah status lead ${leadName}`)
    .selectOption("qualified");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: leadName })
      .getByLabel(`Ubah status lead ${leadName}`),
  ).toHaveValue("qualified");

  for (let index = 0; index < 11; index += 1) {
    const phone = `62877${runSuffix}${String(index).padStart(2, "0")}`;
    const response = await page.request.post("/api/dashboard/leads", {
      data: {
        name: `${paginationSearch} ${index}`,
        phone,
        interestSummary: "Verifikasi pagination lead.",
      },
    });
    expect(response.ok()).toBe(true);
  }

  await page.goto(
    `/dashboard/leads?search=${encodeURIComponent(paginationSearch)}&page=2`,
  );
  await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
  await expect(page.getByText("Menampilkan 1 dari 11 lead")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Sebelumnya" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/leads");
  await expect(page.getByRole("button", { name: "Buka menu dashboard" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
