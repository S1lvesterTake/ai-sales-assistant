import "server-only";

import { cookies } from "next/headers";

import { ApiClientError } from "@/lib/api-errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAuthenticatedApiClient } from "@/services/api-client";
import { faqsService } from "@/services/faqs.service";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Faq, FaqInput, FaqListQuery } from "@/types/faq";

declare global {
  var __aiSalesMockFaqs: Faq[] | undefined;
}

async function getMockFaqs(): Promise<Faq[]> {
  if (!globalThis.__aiSalesMockFaqs) {
    const { faqFixtures } = await import("@/mocks/fixtures");
    globalThis.__aiSalesMockFaqs = structuredClone(faqFixtures);
  }
  return globalThis.__aiSalesMockFaqs;
}

async function requireAccessToken(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (
    !token ||
    (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && token !== "demo-token")
  ) {
    throw new ApiClientError({
      kind: "unauthorized",
      message: "Sesi tidak valid atau telah berakhir.",
      status: 401,
    });
  }
  return token;
}

function privateClient(accessToken: string) {
  return createAuthenticatedApiClient(accessToken, {
    baseUrl: getServerEnv().API_BASE_URL,
  });
}

function faqNotFound() {
  return new ApiClientError({
    kind: "not_found",
    message: "FAQ tidak ditemukan.",
    status: 404,
  });
}

export async function listFaqs(
  query: FaqListQuery,
): Promise<ApiPaginatedResponse<Faq>> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return faqsService.list(privateClient(accessToken), query);
  }

  const faqs = await getMockFaqs();
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 10, 100);
  const search = query.search?.toLocaleLowerCase("id-ID");
  const filtered = faqs
    .filter((faq) => {
      if (!search) return true;
      return [faq.question, faq.answer].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(search),
      );
    })
    .filter(
      (faq) =>
        !query.category ||
        faq.category?.toLocaleLowerCase("id-ID") ===
          query.category.toLocaleLowerCase("id-ID"),
    )
    .filter(
      (faq) => query.isActive === undefined || faq.isActive === query.isActive,
    )
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  const start = (page - 1) * limit;

  return {
    success: true,
    message: "FAQs retrieved successfully",
    data: filtered.slice(start, start + limit),
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit),
    },
  };
}

export async function createFaq(input: FaqInput): Promise<Faq> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await faqsService.create(privateClient(accessToken), input)).data;
  }

  const faqs = await getMockFaqs();
  const now = new Date().toISOString();
  const faq: Faq = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  faqs.push(faq);
  return faq;
}

export async function updateFaq(
  id: string,
  input: Partial<FaqInput>,
): Promise<Faq> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await faqsService.update(privateClient(accessToken), id, input)).data;
  }

  const faqs = await getMockFaqs();
  const index = faqs.findIndex((faq) => faq.id === id);
  if (index < 0) throw faqNotFound();
  const current = faqs[index];
  if (!current) throw faqNotFound();
  const updated: Faq = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  faqs[index] = updated;
  return updated;
}

export async function deleteFaq(id: string): Promise<void> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    await faqsService.remove(privateClient(accessToken), id);
    return;
  }

  const faqs = await getMockFaqs();
  const index = faqs.findIndex((faq) => faq.id === id);
  if (index < 0) throw faqNotFound();
  faqs.splice(index, 1);
}
