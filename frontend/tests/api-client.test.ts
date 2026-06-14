import { delay, http, HttpResponse } from "msw";

import {
  ApiClientError,
  getUserFacingErrorMessage,
  mapFieldErrors,
  type ApiErrorKind,
} from "@/lib/api-errors";
import { server } from "@/mocks/server";
import {
  ApiClient,
  createAuthenticatedApiClient,
  createPublicApiClient,
} from "@/services/api-client";
import { businessProfileService } from "@/services/business-profile.service";
import { chatService } from "@/services/chat.service";
import { productsService } from "@/services/products.service";

const API_BASE_URL = "http://localhost:3001";
const apiUrl = (path: string) => new URL(path, API_BASE_URL).toString();

describe("ApiClient", () => {
  it("reads a typed public API response through the service boundary", async () => {
    const response = await businessProfileService.getPublic(
      "kopi-senja-umkm",
      createPublicApiClient({ baseUrl: API_BASE_URL }),
    );

    expect(response.success).toBe(true);
    expect(response.data.businessName).toBe("Kopi Senja UMKM");
    expect(response.data).not.toHaveProperty("id");
  });

  it("preserves pagination metadata on authenticated lists", async () => {
    const client = createAuthenticatedApiClient("demo-token", {
      baseUrl: API_BASE_URL,
    });
    const response = await productsService.list(client, { page: 1, limit: 20 });

    expect(response.data).toHaveLength(2);
    expect(response.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it("sends the public chat token only through its dedicated header", async () => {
    const response = await chatService.getHistory(
      "kopi-senja-umkm",
      "019b9d80-7a2e-7b4b-8dc1-7a44b6300040",
      "mock-chat-session-token",
      {},
      createPublicApiClient({ baseUrl: API_BASE_URL }),
    );

    expect(response.data).toHaveLength(2);
  });

  it("maps backend validation errors to form fields", async () => {
    server.use(
      http.post(apiUrl("/api/test/validation"), () =>
        HttpResponse.json(
          {
            success: false,
            message: "Validation failed",
            errors: [
              { field: "price", message: "Price cannot be negative" },
              { field: "price", message: "Price must be an integer" },
            ],
          },
          { status: 400 },
        ),
      ),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    const error = await client
      .request("/api/test/validation", { method: "POST", body: {} })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(mapFieldErrors((error as ApiClientError).fieldErrors)).toEqual({
      price: "Price cannot be negative",
    });
  });

  it.each<[number, ApiErrorKind]>([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [429, "rate_limit"],
    [500, "server"],
  ])("normalizes HTTP %i as %s", async (status, kind) => {
    server.use(
      http.get(apiUrl("/api/test/status"), () =>
        HttpResponse.json(
          { success: false, message: `Request failed with ${status}` },
          { status },
        ),
      ),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    await expect(client.request("/api/test/status")).rejects.toMatchObject({
      kind,
      status,
    });
  });

  it("rejects a successful status with an invalid envelope", async () => {
    server.use(
      http.get(apiUrl("/api/test/invalid"), () =>
        HttpResponse.json({ data: { exposed: true } }),
      ),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    await expect(client.request("/api/test/invalid")).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("rejects malformed pagination metadata", async () => {
    server.use(
      http.get(apiUrl("/api/test/page"), () =>
        HttpResponse.json({
          success: true,
          message: "Broken page",
          data: [],
          meta: { page: 0, limit: "all", total: -1, totalPages: 0 },
        }),
      ),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    await expect(client.requestPage("/api/test/page")).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("rejects malformed field errors instead of trusting their shape", async () => {
    server.use(
      http.get(apiUrl("/api/test/broken-error"), () =>
        HttpResponse.json(
          {
            success: false,
            message: "Validation failed",
            errors: [{ field: 123, message: null }],
          },
          { status: 400 },
        ),
      ),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    await expect(
      client.request("/api/test/broken-error"),
    ).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("aborts requests that exceed the explicit timeout", async () => {
    server.use(
      http.get(apiUrl("/api/test/slow"), async () => {
        await delay(100);
        return HttpResponse.json({
          success: true,
          message: "Too late",
          data: null,
        });
      }),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    await expect(
      client.request("/api/test/slow", { timeoutMs: 5 }),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("normalizes low-level fetch failures without exposing the cause", async () => {
    server.use(
      http.get(apiUrl("/api/test/network"), () => HttpResponse.error()),
    );

    const client = new ApiClient({ baseUrl: API_BASE_URL });
    const error = await client
      .request("/api/test/network")
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "network", status: 0 });
    expect(getUserFacingErrorMessage(error)).toMatch(/koneksi ke server gagal/i);
  });

  it("refuses to construct an authenticated client without a token", () => {
    expect(() => createAuthenticatedApiClient(" ")).toThrow(
      "An access token is required",
    );
  });
});
