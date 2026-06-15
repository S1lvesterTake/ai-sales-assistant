import { ApiClientError, createHttpError } from "@/lib/api-errors";
import { waitForApiMockingReady } from "@/lib/api-mocking-ready";
import { getPublicEnv } from "@/lib/env";
import type {
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from "@/types/api";

const DEFAULT_TIMEOUT_MS = 10_000;

type Fetcher = typeof fetch;

export interface ApiRequestOptions
  extends Omit<RequestInit, "body" | "headers" | "signal"> {
  body?: unknown;
  headers?: HeadersInit;
  sessionToken?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface ApiClientOptions {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  fetcher?: Fetcher;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasValidFieldErrors(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (error) =>
          isRecord(error) &&
          typeof error.field === "string" &&
          typeof error.message === "string",
      ))
  );
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    value.success === false &&
    typeof value.message === "string" &&
    (value.code === undefined || typeof value.code === "string") &&
    hasValidFieldErrors(value.errors)
  );
}

function isSuccessResponse(value: unknown): value is ApiSuccessResponse<unknown> {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === "string" &&
    "data" in value
  );
}

function hasPaginationMeta(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isInteger(value.page) &&
    Number.isInteger(value.limit) &&
    Number.isInteger(value.total) &&
    Number.isInteger(value.totalPages) &&
    Number(value.page) >= 1 &&
    Number(value.limit) >= 1 &&
    Number(value.total) >= 0 &&
    Number(value.totalPages) >= 0
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiClientError({
      kind: "invalid_response",
      message: "Response body is not valid JSON",
      status: response.status,
    });
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private readonly fetcher: Fetcher | undefined;

  constructor({
    baseUrl = getPublicEnv().NEXT_PUBLIC_API_BASE_URL,
    defaultHeaders = {},
    fetcher,
  }: ApiClientOptions = {}) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    this.defaultHeaders = defaultHeaders;
    this.fetcher = fetcher;
  }

  async request<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiSuccessResponse<T>> {
    return this.execute<ApiSuccessResponse<T>>(path, options);
  }

  async requestPage<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiPaginatedResponse<T>> {
    const response = await this.execute<ApiPaginatedResponse<T>>(path, options);

    if (!Array.isArray(response.data) || !hasPaginationMeta(response.meta)) {
      throw new ApiClientError({
        kind: "invalid_response",
        message: "Paginated response is missing metadata",
        status: 200,
      });
    }

    return response;
  }

  private async execute<TResponse>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<TResponse> {
    const {
      body,
      headers,
      sessionToken,
      signal,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      ...requestInit
    } = options;
    const controller = new AbortController();
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);
    const abortFromCaller = () => controller.abort(signal?.reason);

    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener("abort", abortFromCaller, { once: true });

    const requestHeaders = new Headers(this.defaultHeaders);
    new Headers(headers).forEach((value, key) => requestHeaders.set(key, value));
    requestHeaders.set("Accept", "application/json");
    if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
    if (sessionToken) requestHeaders.set("X-Chat-Session-Token", sessionToken);

    try {
      await waitForApiMockingReady();
      const response = await (this.fetcher ?? fetch)(
        new URL(path.replace(/^\//, ""), this.baseUrl),
        {
        ...requestInit,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        headers: requestHeaders,
        signal: controller.signal,
        },
      );
      const payload = await parseJson(response);

      if (!response.ok) {
        if (!isErrorResponse(payload)) {
          throw new ApiClientError({
            kind: "invalid_response",
            message: "Error response does not match the API envelope",
            status: response.status,
          });
        }
        throw createHttpError(response.status, payload);
      }

      if (isErrorResponse(payload)) {
        throw createHttpError(response.status, payload);
      }

      if (!isSuccessResponse(payload)) {
        throw new ApiClientError({
          kind: "invalid_response",
          message: "Response does not match the API envelope",
          status: response.status,
        });
      }

      return payload as TResponse;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (didTimeout) {
        throw new ApiClientError({
          kind: "timeout",
          message: "Request timed out",
          status: 0,
        });
      }
      if (signal?.aborted) throw error;
      throw new ApiClientError({
        kind: "network",
        message: "Network request failed",
        status: 0,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

export function createPublicApiClient(options: ApiClientOptions = {}): ApiClient {
  return new ApiClient(options);
}

export function createAuthenticatedApiClient(
  accessToken: string,
  options: ApiClientOptions = {},
): ApiClient {
  if (!accessToken.trim()) {
    throw new Error("An access token is required for authenticated API calls");
  }

  const headers = new Headers(options.defaultHeaders);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new ApiClient({ ...options, defaultHeaders: headers });
}

export function toSearchParams<T extends object>(values: T): string {
  const searchParams = new URLSearchParams();
  Object.entries(
    values as Record<string, boolean | number | string | undefined>,
  ).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const publicApiClient = createPublicApiClient();
