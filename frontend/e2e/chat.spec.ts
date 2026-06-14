import { expect, test, type Page } from "@playwright/test";

async function enableApiMocking(page: Page) {
  await page.goto("/");
  const isControlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  if (!isControlled) await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

test("customer can chat, save a lead, and reach the WhatsApp handoff", async ({
  page,
}) => {
  await enableApiMocking(page);
  await page.goto("/demo-chat");

  await expect(
    page.getByRole("heading", { name: "Kopi Senja UMKM" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/sessionToken|mock-chat-session-token/);
  expect(
    await page.evaluate(() =>
      Object.values(window.localStorage).join(" ").includes("mock-chat-session-token"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      Object.values(window.sessionStorage)
        .join(" ")
        .includes("mock-chat-session-token"),
    ),
  ).toBe(true);

  await page
    .getByRole("button", { name: "Apakah bisa pesan untuk acara?" })
    .click();
  await expect(
    page.getByText(/Harga Kopi Susu Gula Aren adalah Rp18.000/i),
  ).toBeVisible();

  await page.getByLabel("Nama").fill("Budi");
  await page.getByLabel("Nomor WhatsApp").fill("0812 9999 8888");
  await page.getByRole("button", { name: "Simpan kontak" }).click();

  await expect(page.getByText("Kontak berhasil disimpan")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Lanjut ke WhatsApp/i }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("pending message polling does not duplicate the customer message", async ({
  page,
}) => {
  await enableApiMocking(page);
  await page.goto("/demo-chat");

  await page.getByLabel("Tulis pesan").fill("pending cek status");
  await page.getByRole("button", { name: "Kirim pesan" }).click();

  await expect(page.getByText("pending cek status")).toHaveCount(1);
  await expect(
    page.getByText(/Harga Kopi Susu Gula Aren adalah Rp18.000/i),
  ).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("pending cek status")).toHaveCount(1);
});
