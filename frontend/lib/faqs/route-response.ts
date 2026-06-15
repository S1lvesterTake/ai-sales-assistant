import { NextResponse } from "next/server";

import { ApiClientError } from "@/lib/api-errors";
import type { ApiErrorResponse } from "@/types/api";

export async function readFaqRequestBody(
  request: Request,
): Promise<
  | { success: true; data: unknown }
  | { success: false; response: NextResponse<ApiErrorResponse> }
> {
  try {
    return { success: true, data: await request.json() };
  } catch {
    return {
      success: false,
      response: NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data FAQ.",
          errors: [
            { field: "form", message: "Data FAQ harus berupa JSON yang valid." },
          ],
        },
        { status: 400 },
      ),
    };
  }
}

export function faqRouteError(error: unknown) {
  if (error instanceof ApiClientError) {
    const message =
      error.kind === "unauthorized"
        ? "Sesi Anda telah berakhir. Silakan masuk kembali."
        : error.kind === "server" ||
            error.kind === "network" ||
            error.kind === "timeout"
          ? "Layanan FAQ sedang tidak tersedia. Silakan coba lagi."
          : error.message;
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        message,
        ...(error.fieldErrors.length > 0 ? { errors: error.fieldErrors } : {}),
      },
      {
        status:
          error.kind === "network" || error.kind === "timeout"
            ? 503
            : error.status,
      },
    );
  }
  return NextResponse.json<ApiErrorResponse>(
    { success: false, message: "Permintaan FAQ belum dapat diproses." },
    { status: 500 },
  );
}
