import { NextRequest } from "next/server";

jest.mock("@/lib/products/server-products", () => ({
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

import { POST as create } from "@/app/api/dashboard/products/route";
import {
  DELETE as remove,
  PATCH as update,
} from "@/app/api/dashboard/products/[id]/route";
import { ApiClientError } from "@/lib/api-errors";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/products/server-products";
import type { Product } from "@/types/product";

const mockCreateProduct = jest.mocked(createProduct);
const mockUpdateProduct = jest.mocked(updateProduct);
const mockDeleteProduct = jest.mocked(deleteProduct);

const product: Product = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300100",
  name: "Kopi Uji",
  price: 18000,
  isAvailable: true,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

function request(path: string, method: string, body?: string, origin?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    ...(body !== undefined ? { body } : {}),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
  });
}

describe("same-origin product routes", () => {
  beforeEach(() => {
    mockCreateProduct.mockResolvedValue(product);
    mockUpdateProduct.mockResolvedValue(product);
    mockDeleteProduct.mockResolvedValue(undefined);
  });

  it("creates valid products and rejects cross-origin requests", async () => {
    const response = await create(
      request(
        "/api/dashboard/products",
        "POST",
        JSON.stringify({ name: "Kopi Uji", price: 18000, isAvailable: true }),
      ),
    );
    const forbidden = await create(
      request(
        "/api/dashboard/products",
        "POST",
        JSON.stringify({ name: "Kopi Uji", price: 18000, isAvailable: true }),
        "https://evil.example",
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: product,
    });
    expect(mockCreateProduct).toHaveBeenCalledWith({
      name: "Kopi Uji",
      price: 18000,
      isAvailable: true,
    });
    expect(forbidden.status).toBe(403);
  });

  it("returns field errors for malformed and invalid payloads", async () => {
    const malformed = await create(
      request("/api/dashboard/products", "POST", "{invalid"),
    );
    const invalid = await create(
      request(
        "/api/dashboard/products",
        "POST",
        JSON.stringify({ name: "", price: -1, isAvailable: true }),
      ),
    );

    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      success: false,
      errors: [{ field: "form" }],
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "price" }),
      ]),
    });
  });

  it("maps backend duplicate errors to the matching form field", async () => {
    mockCreateProduct.mockRejectedValue(
      new ApiClientError({
        kind: "conflict",
        message: "Nama produk sudah digunakan.",
        status: 409,
        fieldErrors: [
          { field: "name", message: "Gunakan nama produk yang berbeda." },
        ],
      }),
    );

    const response = await create(
      request(
        "/api/dashboard/products",
        "POST",
        JSON.stringify({ name: "Kopi Uji", price: 18000, isAvailable: true }),
      ),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Nama produk sudah digunakan.",
      errors: [{ field: "name", message: "Gunakan nama produk yang berbeda." }],
    });
  });

  it("updates partial data, rejects empty patches, and deletes by ID", async () => {
    const params = Promise.resolve({ id: product.id });
    const updated = await update(
      request(
        `/api/dashboard/products/${product.id}`,
        "PATCH",
        JSON.stringify({ isAvailable: false }),
      ),
      { params },
    );
    const empty = await update(
      request(
        `/api/dashboard/products/${product.id}`,
        "PATCH",
        JSON.stringify({}),
      ),
      { params: Promise.resolve({ id: product.id }) },
    );
    const deleted = await remove(
      request(`/api/dashboard/products/${product.id}`, "DELETE"),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(updated.status).toBe(200);
    expect(mockUpdateProduct).toHaveBeenCalledWith(product.id, {
      isAvailable: false,
    });
    expect(empty.status).toBe(400);
    expect(deleted.status).toBe(200);
    expect(mockDeleteProduct).toHaveBeenCalledWith(product.id);
  });

  it("sanitizes network failures from the backend", async () => {
    mockDeleteProduct.mockRejectedValue(
      new ApiClientError({
        kind: "network",
        message: "socket details",
        status: 0,
      }),
    );

    const response = await remove(
      request(`/api/dashboard/products/${product.id}`, "DELETE"),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Layanan produk sedang tidak tersedia. Silakan coba lagi.",
    });
  });
});
