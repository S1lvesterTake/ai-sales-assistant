import "server-only";

import { cookies } from "next/headers";

import { ApiClientError } from "@/lib/api-errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import { createAuthenticatedApiClient } from "@/services/api-client";
import { leadsService } from "@/services/leads.service";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Lead, LeadInput, LeadListQuery, LeadStatus } from "@/types/lead";

declare global {
  var __aiSalesMockLeads: Lead[] | undefined;
}

async function getMockLeads(): Promise<Lead[]> {
  if (!globalThis.__aiSalesMockLeads) {
    const { leadFixtures } = await import("@/mocks/fixtures");
    globalThis.__aiSalesMockLeads = structuredClone(leadFixtures);
  }
  return globalThis.__aiSalesMockLeads;
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

function duplicateLead() {
  return new ApiClientError({
    kind: "conflict",
    message: "Nomor WhatsApp sudah terdaftar sebagai lead.",
    status: 409,
    fieldErrors: [
      { field: "phone", message: "Gunakan nomor lain atau buka lead yang sudah ada." },
    ],
  });
}

function leadNotFound() {
  return new ApiClientError({
    kind: "not_found",
    message: "Lead tidak ditemukan.",
    status: 404,
  });
}

export async function listLeads(
  query: LeadListQuery,
): Promise<ApiPaginatedResponse<Lead>> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return leadsService.list(privateClient(accessToken), query);
  }

  const leads = await getMockLeads();
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const search = query.search?.toLocaleLowerCase("id-ID");
  const filtered = leads
    .filter((lead) => !query.status || lead.status === query.status)
    .filter((lead) => {
      if (!search) return true;
      return [lead.name, lead.phone, lead.interestSummary]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase("id-ID").includes(search));
    })
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  const start = (page - 1) * limit;

  return {
    success: true,
    message: "Leads retrieved successfully",
    data: filtered.slice(start, start + limit),
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit),
    },
  };
}

export async function getLead(id: string): Promise<Lead> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await leadsService.get(privateClient(accessToken), id)).data;
  }
  const lead = (await getMockLeads()).find((candidate) => candidate.id === id);
  if (!lead) throw leadNotFound();
  return lead;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const accessToken = await requireAccessToken();
  const phone = normalizeIndonesianPhone(input.phone);
  if (!phone) {
    throw new ApiClientError({
      kind: "validation",
      message: "Periksa kembali data lead.",
      status: 422,
      fieldErrors: [{ field: "phone", message: "Nomor WhatsApp tidak valid." }],
    });
  }
  const normalizedInput: LeadInput = { ...input, phone, source: "manual" };
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await leadsService.create(privateClient(accessToken), normalizedInput)).data;
  }

  const leads = await getMockLeads();
  if (leads.some((lead) => normalizeIndonesianPhone(lead.phone) === phone)) {
    throw duplicateLead();
  }
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID(),
    ...normalizedInput,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  leads.push(lead);
  return lead;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<Lead> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await leadsService.updateStatus(privateClient(accessToken), id, status)).data;
  }

  const leads = await getMockLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index < 0) throw leadNotFound();
  const current = leads[index];
  if (!current) throw leadNotFound();
  const updated: Lead = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  leads[index] = updated;
  return updated;
}
