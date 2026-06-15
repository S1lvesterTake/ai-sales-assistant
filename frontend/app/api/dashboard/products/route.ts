import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import {
  productRouteError,
  readProductRequestBody,
} from "@/lib/products/route-response";
import { createProduct } from "@/lib/products/server-products";
import {
  productSchema,
  toProductInput,
} from "@/lib/products/validation";
import type { ApiErrorResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readProductRequestBody(request);
    if (!body.success) return body.response;
    const parsed = productSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data produk.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    const product = await createProduct(toProductInput(parsed.data));
    return NextResponse.json(
      { success: true, message: "Produk berhasil ditambahkan.", data: product },
      { status: 201 },
    );
  } catch (error) {
    return productRouteError(error);
  }
}
