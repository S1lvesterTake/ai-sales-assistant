import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/request-security";
import {
  readSettingsRequestBody,
  settingsRouteError,
} from "@/lib/settings/route-response";
import {
  createBusinessProfile,
  updateBusinessProfile,
} from "@/lib/settings/server-settings";
import {
  createProfileApiSchema,
  toCreateInput,
  toUpdateInput,
  updateProfileApiSchema,
} from "@/lib/settings/validation";
import type { ApiErrorResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readSettingsRequestBody(request);
    if (!body.success) return body.response;

    const parsed = createProfileApiSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data profil bisnis.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const profile = await createBusinessProfile(toCreateInput(parsed.data));
    return NextResponse.json(
      {
        success: true,
        message: "Profil bisnis berhasil dibuat.",
        data: profile,
      },
      { status: 201 },
    );
  } catch (error) {
    return settingsRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json<ApiErrorResponse>(
      { success: false, message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await readSettingsRequestBody(request);
    if (!body.success) return body.response;

    const parsed = updateProfileApiSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Periksa kembali data profil bisnis.",
          errors: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "form"),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await updateBusinessProfile(toUpdateInput(parsed.data as any));
    return NextResponse.json(
      {
        success: true,
        message: "Profil bisnis berhasil diperbarui.",
        data: profile,
      },
      { status: 200 },
    );
  } catch (error) {
    return settingsRouteError(error);
  }
}
