import { expect, test } from "@playwright/test";

test("serves deterministic API fixtures through MSW in development", async ({
  page,
}) => {
  await page.goto("/");

  const isControlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });

  if (!isControlled) await page.reload();

  const result = await page.evaluate(async () => {
    const response = await fetch(
      "http://localhost:3001/api/public/businesses/kopi-senja-umkm",
    );
    return {
      status: response.status,
      body: (await response.json()) as {
        success: boolean;
        data: { businessName: string };
      },
    };
  });

  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({
    success: true,
    data: { businessName: "Kopi Senja UMKM" },
  });
});
