import { markApiMockingReady } from "@/lib/api-mocking-ready";

if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled"
) {
  try {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error(`API mock worker failed to start: ${reason}`);
  } finally {
    markApiMockingReady();
  }
}

export {};
