import "server-only";

import { cookies } from "next/headers";

import { ApiClientError } from "@/lib/api-errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAuthenticatedApiClient } from "@/services/api-client";
import { productsService } from "@/services/products.service";
import type { ApiPaginatedResponse } from "@/types/api";
import type { Product, ProductInput, ProductListQuery } from "@/types/product";

declare global {
  var __aiSalesMockProducts: Product[] | undefined;
}

async function getMockProducts(): Promise<Product[]> {
  if (!globalThis.__aiSalesMockProducts) {
    const { productFixtures } = await import("@/mocks/fixtures");
    globalThis.__aiSalesMockProducts = structuredClone(productFixtures);
  }
  return globalThis.__aiSalesMockProducts;
}

async function requireAccessToken(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token || (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && token !== "demo-token")) {
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

function duplicateProduct() {
  return new ApiClientError({
    kind: "conflict",
    message: "Nama produk sudah digunakan.",
    status: 409,
    fieldErrors: [
      { field: "name", message: "Gunakan nama produk yang berbeda." },
    ],
  });
}

function productNotFound() {
  return new ApiClientError({
    kind: "not_found",
    message: "Produk tidak ditemukan.",
    status: 404,
  });
}

export async function listProducts(
  query: ProductListQuery,
): Promise<ApiPaginatedResponse<Product>> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return productsService.list(privateClient(accessToken), query);
  }

  const products = await getMockProducts();
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 10, 100);
  const filtered = products
    .filter(
      (product) =>
        !query.category ||
        product.category?.toLocaleLowerCase("id-ID") ===
          query.category.toLocaleLowerCase("id-ID"),
    )
    .filter(
      (product) =>
        query.isAvailable === undefined ||
        product.isAvailable === query.isAvailable,
    )
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  const start = (page - 1) * limit;

  return {
    success: true,
    message: "Products retrieved successfully",
    data: filtered.slice(start, start + limit),
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit),
    },
  };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await productsService.create(privateClient(accessToken), input)).data;
  }

  const products = await getMockProducts();
  if (
    products.some(
      (product) =>
        product.name.toLocaleLowerCase("id-ID") ===
        input.name.toLocaleLowerCase("id-ID"),
    )
  ) {
    throw duplicateProduct();
  }
  const now = new Date().toISOString();
  const product: Product = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  products.push(product);
  return product;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (await productsService.update(privateClient(accessToken), id, input)).data;
  }

  const products = await getMockProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw productNotFound();
  if (
    input.name &&
    products.some(
      (product) =>
        product.id !== id &&
        product.name.toLocaleLowerCase("id-ID") ===
          input.name?.toLocaleLowerCase("id-ID"),
    )
  ) {
    throw duplicateProduct();
  }
  const current = products[index];
  if (!current) throw productNotFound();
  const updated: Product = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  products[index] = updated;
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const accessToken = await requireAccessToken();
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    await productsService.remove(privateClient(accessToken), id);
    return;
  }

  const products = await getMockProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw productNotFound();
  products.splice(index, 1);
}
