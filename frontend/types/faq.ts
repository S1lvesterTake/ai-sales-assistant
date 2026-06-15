import type { PaginationQuery } from "@/types/api";

export interface FaqInput {
  question: string;
  answer: string;
  category?: string;
  isActive: boolean;
}

export interface Faq extends FaqInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaqListQuery extends PaginationQuery {
  search?: string;
  category?: string;
  isActive?: boolean;
}
