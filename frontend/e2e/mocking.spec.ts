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
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          try {
            const response = await fetch(
              "http://localhost:3001/api/public/businesses/kopi-senja-umkm",
            );
            const body = (await response.json()) as {
              success: boolean;
              data: { businessName: string };
            };
            return {
              status: response.status,
              success: body.success,
              businessName: body.data.businessName,
            };
          } catch {
            return null;
          }
        }),
      { timeout: 10_000 },
    )
    .toEqual({
      status: 200,
      success: true,
      businessName: "Kopi Senja UMKM",
    });
});
