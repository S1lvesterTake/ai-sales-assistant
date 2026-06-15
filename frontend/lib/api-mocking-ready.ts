let resolveReady: (() => void) | undefined;
let isReady = false;

const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function markApiMockingReady(): void {
  if (isReady) return;
  isReady = true;
  resolveReady?.();
}

export async function waitForApiMockingReady(): Promise<void> {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
  ) {
    return;
  }
  await ready;
}
