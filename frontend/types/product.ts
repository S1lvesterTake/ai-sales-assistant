import type { PaginationQuery } from "@/types/api";

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable: boolean;
  orderingInstruction?: string;
  additionalNotes?: string;
}

export interface Product extends ProductInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery extends PaginationQuery {
  category?: string;
  isAvailable?: boolean;
}
