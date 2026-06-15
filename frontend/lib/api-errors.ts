import type { ApiErrorResponse, ApiFieldError } from "@/types/api";

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "timeout"
  | "network"
  | "server"
  | "invalid_response";

export class ApiClientError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly fieldErrors: ApiFieldError[];
  readonly code?: string;

  constructor({
    code,
    fieldErrors = [],
    kind,
    message,
    status,
  }: {
    code?: string;
    fieldErrors?: ApiFieldError[];
    kind: ApiErrorKind;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
    if (code) this.code = code;
  }
}

export function getApiErrorKind(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limit";
  return "server";
}

export function createHttpError(
  status: number,
  response: ApiErrorResponse,
): ApiClientError {
  return new ApiClientError({
    ...(response.code ? { code: response.code } : {}),
    ...(response.errors ? { fieldErrors: response.errors } : {}),
    kind: getApiErrorKind(status),
    message: response.message,
    status,
  });
}

export function mapFieldErrors(
  fieldErrors: readonly ApiFieldError[],
): Record<string, string> {
  return fieldErrors.reduce<Record<string, string>>((result, error) => {
    result[error.field] ??= error.message;
    return result;
  }, {});
}

export function getUserFacingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "Terjadi gangguan yang tidak terduga. Silakan coba lagi.";
  }

  const messages: Record<ApiErrorKind, string> = {
    validation: error.message,
    unauthorized: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    forbidden: "Anda tidak memiliki akses untuk tindakan ini.",
    not_found: "Data yang diminta tidak ditemukan.",
    conflict: error.message,
    rate_limit: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
    timeout: "Server membutuhkan waktu terlalu lama. Silakan coba lagi.",
    network: "Koneksi ke server gagal. Periksa jaringan lalu coba lagi.",
    server: "Server sedang mengalami gangguan. Silakan coba lagi.",
    invalid_response: "Respons server tidak dapat diproses.",
  };

  return messages[error.kind];
}
