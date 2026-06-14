import type { PaginationQuery } from "@/types/api";

export type LeadStatus = "new" | "contacted" | "qualified" | "closed" | "lost";

export interface LeadInput {
  name?: string;
  phone: string;
  interestSummary?: string;
  source?: string;
  chatSessionId?: string;
}

export interface PublicLeadInput extends LeadInput {
  chatSessionId: string;
}

export interface Lead extends LeadInput {
  id: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListQuery extends PaginationQuery {
  search?: string;
  status?: LeadStatus;
}
