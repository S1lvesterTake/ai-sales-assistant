import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import { faqRouteError, readFaqRequestBody } from "@/lib/faqs/route-response";
import { deleteFaq, updateFaq } from "@/lib/faqs/server-faqs";
import { toFaqPatch, updateFaqSchema } from "@/lib/faqs/validation";
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
    const body = await readFaqRequestBody(request);
    if (!body.success) return body.response;
    const parsed = updateFaqSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data FAQ.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    const faq = await updateFaq((await params).id, toFaqPatch(parsed.data));
    return NextResponse.json({
      success: true,
      message: "FAQ berhasil diperbarui.",
      data: faq,
    });
  } catch (error) {
    return faqRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) return forbidden();
  try {
    await deleteFaq((await params).id);
    return NextResponse.json({
      success: true,
      message: "FAQ berhasil dihapus.",
      data: null,
    });
  } catch (error) {
    return faqRouteError(error);
  }
}
