import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import { faqRouteError, readFaqRequestBody } from "@/lib/faqs/route-response";
import { createFaq } from "@/lib/faqs/server-faqs";
import { faqSchema, toFaqInput } from "@/lib/faqs/validation";
import type { ApiErrorResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readFaqRequestBody(request);
    if (!body.success) return body.response;
    const parsed = faqSchema.safeParse(body.data);
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
    const faq = await createFaq(toFaqInput(parsed.data));
    return NextResponse.json(
      { success: true, message: "FAQ berhasil ditambahkan.", data: faq },
      { status: 201 },
    );
  } catch (error) {
    return faqRouteError(error);
  }
}
