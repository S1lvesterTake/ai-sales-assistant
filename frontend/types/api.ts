export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiFieldError[];
  code?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
