import { delay, http, HttpResponse } from "msw";

import { getPublicEnv } from "@/lib/env";
import {
  businessProfileFixture,
  chatMessageFixtures,
  chatReplyFixture,
  chatSessionFixture,
  dashboardSummaryFixture,
  demoAuthSession,
  demoUser,
  faqFixtures,
  leadFixtures,
  productFixtures,
  publicBusinessFixture,
  recentConversationFixtures,
  topQuestionFixtures,
} from "@/mocks/fixtures";
import type { ApiErrorResponse } from "@/types/api";
import type { LoginInput } from "@/types/auth";

const apiUrl = (path: string) =>
  new URL(path, getPublicEnv().NEXT_PUBLIC_API_BASE_URL).toString();

const unauthorized = () =>
  HttpResponse.json<ApiErrorResponse>(
    { success: false, message: "Unauthorized" },
    { status: 401 },
  );

function hasDemoAuthorization(request: Request): boolean {
  return request.headers.get("Authorization") === "Bearer demo-token";
}

function hasChatAuthorization(request: Request): boolean {
  return (
    request.headers.get("X-Chat-Session-Token") ===
    chatSessionFixture.sessionToken
  );
}

const pagination = (total: number) => ({
  page: 1,
  limit: 20,
  total,
  totalPages: total === 0 ? 0 : 1,
});

export const handlers = [
  http.get(apiUrl("/api/public/businesses/:businessSlug"), ({ params }) => {
    if (params.businessSlug !== publicBusinessFixture.slug) {
      return HttpResponse.json<ApiErrorResponse>(
        { success: false, message: "Business not found" },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: "Business retrieved successfully",
      data: publicBusinessFixture,
    });
  }),
  http.post(
    apiUrl("/api/public/businesses/:businessSlug/chat/sessions"),
    ({ params }) => {
      if (params.businessSlug !== publicBusinessFixture.slug) {
        return HttpResponse.json<ApiErrorResponse>(
          { success: false, message: "Business not found" },
          { status: 404 },
        );
      }
      return HttpResponse.json(
        {
          success: true,
          message: "Chat session created successfully",
          data: chatSessionFixture,
        },
        { status: 201 },
      );
    },
  ),
  http.get(
    apiUrl(
      "/api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages",
    ),
    ({ request }) => {
      if (!hasChatAuthorization(request)) return unauthorized();
      return HttpResponse.json({
        success: true,
        message: "Chat history retrieved successfully",
        data: chatMessageFixtures,
        meta: pagination(chatMessageFixtures.length),
      });
    },
  ),
  http.post(
    apiUrl(
      "/api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages",
    ),
    async ({ request }) => {
      if (!hasChatAuthorization(request)) return unauthorized();
      const input = (await request.json()) as Record<string, unknown>;
      if (!input.message || !input.clientMessageId) {
        return HttpResponse.json<ApiErrorResponse>(
          {
            success: false,
            message: "Validation failed",
            errors: [
              { field: "message", message: "Message is required" },
            ],
          },
          { status: 400 },
        );
      }
      await delay(25);
      return HttpResponse.json({
        success: true,
        message: "Chat response generated successfully",
        data: { ...chatReplyFixture, clientMessageId: input.clientMessageId },
      });
    },
  ),
  http.post(apiUrl("/api/auth/login"), async ({ request }) => {
    const input = (await request.json()) as LoginInput;
    if (
      input.email !== "demo@kopisenja.id" ||
      input.password !== "DemoKopiSenja2026!"
    ) {
      return HttpResponse.json<ApiErrorResponse>(
        { success: false, message: "Email atau kata sandi salah" },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: "Login successful",
      data: demoAuthSession,
    });
  }),
  http.get(apiUrl("/api/auth/me"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Current user retrieved successfully",
      data: demoUser,
    });
  }),
  http.get(apiUrl("/api/business-profile"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Business profile retrieved successfully",
      data: businessProfileFixture,
    });
  }),
  http.get(apiUrl("/api/products"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Products retrieved successfully",
      data: productFixtures,
      meta: pagination(productFixtures.length),
    });
  }),
  http.get(apiUrl("/api/faqs"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "FAQs retrieved successfully",
      data: faqFixtures,
      meta: pagination(faqFixtures.length),
    });
  }),
  http.get(apiUrl("/api/leads"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Leads retrieved successfully",
      data: leadFixtures,
      meta: pagination(leadFixtures.length),
    });
  }),
  http.get(apiUrl("/api/dashboard/summary"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Dashboard summary retrieved successfully",
      data: dashboardSummaryFixture,
    });
  }),
  http.get(apiUrl("/api/dashboard/recent-leads"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Recent leads retrieved successfully",
      data: leadFixtures,
    });
  }),
  http.get(
    apiUrl("/api/dashboard/recent-conversations"),
    ({ request }) => {
      if (!hasDemoAuthorization(request)) return unauthorized();
      return HttpResponse.json({
        success: true,
        message: "Recent conversations retrieved successfully",
        data: recentConversationFixtures,
      });
    },
  ),
  http.get(apiUrl("/api/dashboard/top-questions"), ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      message: "Top questions retrieved successfully",
      data: topQuestionFixtures,
    });
  }),
  http.get(
    apiUrl("/api/public/businesses/:businessSlug/whatsapp/link"),
    () =>
      HttpResponse.json({
        success: true,
        message: "WhatsApp link generated successfully",
        data: { url: chatReplyFixture.whatsappUrl },
      }),
  ),
  http.post(
    apiUrl("/api/public/businesses/:businessSlug/whatsapp-clicks"),
    () =>
      HttpResponse.json(
        {
          success: true,
          message: "WhatsApp click tracked successfully",
          data: {
            id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300060",
            clickedAt: "2026-06-14T08:00:00.000Z",
          },
        },
        { status: 201 },
      ),
  ),
];
