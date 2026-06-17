import { delay, http, HttpResponse } from "msw";

import { getPublicEnv } from "@/lib/env";
import { normalizeIndonesianPhone } from "@/lib/validation/phone";
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
import type { BusinessProfile, BusinessProfileInput } from "@/types/business";
import type { ChatReply } from "@/types/chat";
import type { Lead } from "@/types/lead";

// Mutable mock business profile state (starts with the demo fixture)
let mockBusinessProfile: BusinessProfile = structuredClone(businessProfileFixture);

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

const chatReplies = new Map<string, ChatReply>();
const pendingAttempts = new Map<string, number>();
const publicLeads = new Map<string, Lead>();

function completedChatReply(
  clientMessageId: string,
  message: string,
): ChatReply {
  const normalizedMessage = message.toLocaleLowerCase("id-ID");
  const hasBuyingIntent = ["beli", "pesan", "tertarik", "order"].some(
    (keyword) => normalizedMessage.includes(keyword),
  );
  const shouldUseFallback = normalizedMessage.includes("fallback");

  return {
    ...chatReplyFixture,
    clientMessageId,
    message: shouldUseFallback
      ? "Maaf, asisten sedang mengalami gangguan. Silakan lanjutkan melalui WhatsApp agar tetap dapat dibantu."
      : (chatReplyFixture.message ?? "Silakan lanjutkan melalui WhatsApp."),
    isBuyingIntentDetected: hasBuyingIntent,
    shouldCaptureLead: hasBuyingIntent,
  };
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
    ({ params, request }) => {
      if (
        params.sessionId !== chatSessionFixture.sessionId ||
        !hasChatAuthorization(request)
      ) {
        return unauthorized();
      }
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1");
      const limit = Number(url.searchParams.get("limit") ?? "20");
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return HttpResponse.json<ApiErrorResponse>(
          { success: false, message: "Invalid pagination" },
          { status: 400 },
        );
      }
      const start = (page - 1) * limit;
      const data = chatMessageFixtures.slice(start, start + limit);
      return HttpResponse.json({
        success: true,
        message: "Chat history retrieved successfully",
        data,
        meta: {
          page,
          limit,
          total: chatMessageFixtures.length,
          totalPages: Math.ceil(chatMessageFixtures.length / limit),
        },
      });
    },
  ),
  http.post(
    apiUrl(
      "/api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages",
    ),
    async ({ params, request }) => {
      if (
        params.sessionId !== chatSessionFixture.sessionId ||
        !hasChatAuthorization(request)
      ) {
        return unauthorized();
      }
      const input = (await request.json()) as Record<string, unknown>;
      if (
        typeof input.message !== "string" ||
        input.message.trim().length === 0 ||
        input.message.length > 1000 ||
        typeof input.clientMessageId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          input.clientMessageId,
        )
      ) {
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

      const storedReply = chatReplies.get(input.clientMessageId);
      if (storedReply) {
        return HttpResponse.json({
          success: true,
          message: "Stored chat response retrieved successfully",
          data: storedReply,
        });
      }

      const normalizedMessage = input.message.toLocaleLowerCase("id-ID");
      if (normalizedMessage.includes("rate limit")) {
        return HttpResponse.json<ApiErrorResponse>(
          { success: false, message: "Too many requests" },
          { status: 429 },
        );
      }

      if (normalizedMessage.includes("pending")) {
        const attempts = pendingAttempts.get(input.clientMessageId) ?? 0;
        pendingAttempts.set(input.clientMessageId, attempts + 1);
        if (attempts === 0) {
          return HttpResponse.json(
            {
              success: true,
              message: "Chat response is still processing",
              data: {
                clientMessageId: input.clientMessageId,
                processingStatus: "pending",
              },
            },
            { status: 202 },
          );
        }
      }

      await delay(25);
      const reply = completedChatReply(input.clientMessageId, input.message);
      chatReplies.set(input.clientMessageId, reply);
      return HttpResponse.json({
        success: true,
        message: "Chat response generated successfully",
        data: reply,
      });
    },
  ),
  http.post(apiUrl("/api/leads"), async ({ request }) => {
    if (!hasChatAuthorization(request)) return unauthorized();
    const input = (await request.json()) as Record<string, unknown>;
    const phone =
      typeof input.phone === "string"
        ? normalizeIndonesianPhone(input.phone)
        : null;
    if (
      input.chatSessionId !== chatSessionFixture.sessionId ||
      typeof input.name !== "string" ||
      input.name.trim().length < 2 ||
      !phone
    ) {
      return HttpResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Validation failed",
          errors: [
            { field: "phone", message: "Nomor WhatsApp tidak valid" },
          ],
        },
        { status: 400 },
      );
    }

    const existingLead = publicLeads.get(phone);
    if (existingLead) {
      return HttpResponse.json<ApiErrorResponse>(
        { success: false, message: "Nomor WhatsApp sudah tersimpan" },
        { status: 409 },
      );
    }

    const lead: Lead = {
      id: `019b9d80-7a2e-7b4b-8dc1-${String(publicLeads.size + 70).padStart(12, "0")}`,
      chatSessionId: chatSessionFixture.sessionId,
      name: input.name.trim(),
      phone,
      ...(typeof input.interestSummary === "string"
        ? { interestSummary: input.interestSummary }
        : {}),
      source: "chatbot",
      status: "new",
      createdAt: "2026-06-14T08:00:00.000Z",
      updatedAt: "2026-06-14T08:00:00.000Z",
    };
    publicLeads.set(phone, lead);
    return HttpResponse.json(
      { success: true, message: "Lead created successfully", data: lead },
      { status: 201 },
    );
  }),
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
      data: mockBusinessProfile,
    });
  }),
  http.post(apiUrl("/api/business-profile"), async ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    const input = (await request.json()) as Partial<BusinessProfileInput>;
    if (!input.businessName || !input.whatsappNumber) {
      return HttpResponse.json<ApiErrorResponse>(
        {
          success: false,
          message: "Validation failed",
          errors: [{ field: "businessName", message: "Business name is required" }],
        },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    const profile: BusinessProfile = {
      id: crypto.randomUUID(),
      slug: input.slug ?? "new-business",
      businessName: input.businessName,
      whatsappNumber: input.whatsappNumber,
      ...(input.description ? { description: input.description } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.operatingHours ? { operatingHours: input.operatingHours } : {}),
      ...(input.mainOffer ? { mainOffer: input.mainOffer } : {}),
      ...(input.ctaMessage ? { ctaMessage: input.ctaMessage } : {}),
      createdAt: now,
      updatedAt: now,
    };
    mockBusinessProfile = profile;
    return HttpResponse.json(
      { success: true, message: "Business profile created successfully", data: profile },
      { status: 201 },
    );
  }),
  http.patch(apiUrl("/api/business-profile"), async ({ request }) => {
    if (!hasDemoAuthorization(request)) return unauthorized();
    const input = (await request.json()) as Partial<BusinessProfileInput>;
    const updated: BusinessProfile = {
      ...mockBusinessProfile,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    mockBusinessProfile = updated;
    return HttpResponse.json({
      success: true,
      message: "Business profile updated successfully",
      data: updated,
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
    async ({ request }) => {
      const input = (await request.json()) as Record<string, unknown>;
      if (
        (input.sessionId || input.leadId) &&
        !hasChatAuthorization(request)
      ) {
        return unauthorized();
      }
      return (
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
      ));
    },
  ),
];
