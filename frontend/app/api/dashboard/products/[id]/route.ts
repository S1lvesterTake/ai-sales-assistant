import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import {
  productRouteError,
  readProductRequestBody,
} from "@/lib/products/route-response";
import {
  deleteProduct,
  updateProduct,
} from "@/lib/products/server-products";
import {
  toProductPatch,
  updateProductSchema,
} from "@/lib/products/validation";
import type { ApiErrorResponse } from "@/types/api";

function forbidden() {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, message: "Permintaan tidak diizinkan." },
    { status: 403 },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbidden();
  try {
    const body = await readProductRequestBody(request);
    if (!body.success) return body.response;
    const parsed = updateProductSchema.safeParse(body.data);
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
    const product = await updateProduct(
      (await params).id,
      toProductPatch(parsed.data),
    );
    return NextResponse.json({
      success: true,
      message: "Produk berhasil diperbarui.",
      data: product,
    });
  } catch (error) {
    return productRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbidden();
  try {
    await deleteProduct((await params).id);
    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus.",
      data: null,
    });
  } catch (error) {
    return productRouteError(error);
  }
}
