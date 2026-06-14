import { getPublicEnv } from "@/lib/env";

describe("getPublicEnv", () => {
  it("accepts the configured API URL and business slug", () => {
    expect(
      getPublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
        NEXT_PUBLIC_DEMO_BUSINESS_SLUG: "kopi-senja-umkm",
      }),
    ).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
      NEXT_PUBLIC_API_MOCKING: "disabled",
      NEXT_PUBLIC_DEMO_BUSINESS_SLUG: "kopi-senja-umkm",
    });
  });

  it("rejects an invalid public business slug", () => {
    expect(() =>
      getPublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
        NEXT_PUBLIC_DEMO_BUSINESS_SLUG: "Internal ID",
      }),
    ).toThrow();
  });
});
