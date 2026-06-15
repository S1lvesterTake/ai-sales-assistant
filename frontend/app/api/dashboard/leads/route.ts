import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import { leadRouteError, readLeadRequestBody } from "@/lib/leads/route-response";
import { createLead } from "@/lib/leads/server-leads";
import { manualLeadSchema, toManualLeadInput } from "@/lib/leads/validation";
import type { ApiErrorResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readLeadRequestBody(request);
    if (!body.success) return body.response;
    const parsed = manualLeadSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data lead.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    const lead = await createLead(toManualLeadInput(parsed.data));
    return NextResponse.json(
      { success: true, message: "Lead berhasil ditambahkan.", data: lead },
      { status: 201 },
    );
  } catch (error) {
    return leadRouteError(error);
  }
}
