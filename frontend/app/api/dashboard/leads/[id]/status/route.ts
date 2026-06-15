import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import { leadRouteError, readLeadRequestBody } from "@/lib/leads/route-response";
import { updateLeadStatus } from "@/lib/leads/server-leads";
import { leadStatusSchema, toLeadStatus } from "@/lib/leads/validation";
import type { ApiErrorResponse } from "@/types/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readLeadRequestBody(request);
    if (!body.success) return body.response;
    const parsed = leadStatusSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Pilih status lead yang valid.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    const lead = await updateLeadStatus(
      (await params).id,
      toLeadStatus(parsed.data),
    );
    return NextResponse.json({
      success: true,
      message: "Status lead berhasil diperbarui.",
      data: lead,
    });
  } catch (error) {
    return leadRouteError(error);
  }
}
