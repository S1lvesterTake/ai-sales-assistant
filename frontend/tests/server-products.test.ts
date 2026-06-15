jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

import { cookies } from "next/headers";

import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/lib/products/server-products";
import type { Product } from "@/types/product";

const mockCookies = jest.mocked(cookies);
type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieStore(value?: string): CookieStore {
  return {
    get: () => (value ? { name: "ai_sales_session", value } : undefined),
  } as unknown as CookieStore;
}

const baseProduct: Product = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300100",
  name: "Produk awal",
  description: "Deskripsi",
  price: 10000,
  category: "Kopi",
  isAvailable: true,
  orderingInstruction: "Pesan via WhatsApp",
  additionalNotes: "Catatan",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("server product operations", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = "enabled";
    mockCookies.mockResolvedValue(cookieStore("demo-token"));
    globalThis.__aiSalesMockProducts = [{ ...baseProduct }];
  });

  afterEach(() => {
    globalThis.__aiSalesMockProducts = undefined;
  });

  it("filters, orders, and paginates deterministically", async () => {
    globalThis.__aiSalesMockProducts = Array.from({ length: 12 }, (_, index) => ({
      ...baseProduct,
      id: `019b9d80-7a2e-7b4b-8dc1-${String(index).padStart(12, "0")}`,
      name: `Produk ${index}`,
      category: index === 0 ? "Teh" : "Kopi",
      isAvailable: index % 2 === 0,
      createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const response = await listProducts({
      page: 2,
      limit: 3,
      category: "kopi",
      isAvailable: true,
    });

    expect(response.meta).toEqual({
      page: 2,
      limit: 3,
      total: 5,
      totalPages: 2,
    });
    expect(response.data).toHaveLength(2);
    expect(response.data[0]!.createdAt >= response.data[1]!.createdAt).toBe(true);
  });

  it("creates, updates, rejects duplicate names, and deletes products", async () => {
    const created = await createProduct({
      name: "Produk baru",
      price: 25000,
      isAvailable: true,
    });
    expect(created.id).toEqual(expect.any(String));

    const updated = await updateProduct(created.id, {
      price: 27000,
      isAvailable: false,
    });
    expect(updated).toMatchObject({ price: 27000, isAvailable: false });

    await expect(
      createProduct({ name: "produk AWAL", price: 1000, isAvailable: true }),
    ).rejects.toMatchObject({ kind: "conflict", status: 409 });

    await deleteProduct(created.id);
    await expect(deleteProduct(created.id)).rejects.toMatchObject({
      kind: "not_found",
      status: 404,
    });
  });

  it("requires the authenticated dashboard cookie", async () => {
    mockCookies.mockResolvedValue(cookieStore());

    await expect(listProducts({ page: 1 })).rejects.toMatchObject({
      kind: "unauthorized",
      status: 401,
    });
  });
});
