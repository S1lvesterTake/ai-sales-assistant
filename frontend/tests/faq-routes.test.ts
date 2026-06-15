import { NextRequest } from "next/server";

jest.mock("@/lib/faqs/server-faqs", () => ({
  createFaq: jest.fn(),
  updateFaq: jest.fn(),
  deleteFaq: jest.fn(),
}));

import { POST as create } from "@/app/api/dashboard/faqs/route";
import {
  DELETE as remove,
  PATCH as update,
} from "@/app/api/dashboard/faqs/[id]/route";
import { ApiClientError } from "@/lib/api-errors";
import { createFaq, deleteFaq, updateFaq } from "@/lib/faqs/server-faqs";
import type { Faq } from "@/types/faq";

const mockCreateFaq = jest.mocked(createFaq);
const mockUpdateFaq = jest.mocked(updateFaq);
const mockDeleteFaq = jest.mocked(deleteFaq);

const faq: Faq = {
  id: "019b9d80-7a2e-7b4b-8dc1-7a44b6300200",
  question: "Apakah buka hari Minggu?",
  answer: "Ya, kami buka setiap hari.",
  isActive: true,
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

describe("same-origin FAQ routes", () => {
  beforeEach(() => {
    mockCreateFaq.mockResolvedValue(faq);
    mockUpdateFaq.mockResolvedValue(faq);
    mockDeleteFaq.mockResolvedValue(undefined);
  });

  it("creates valid FAQ data and rejects cross-origin requests", async () => {
    const body = JSON.stringify({
      question: faq.question,
      answer: faq.answer,
      isActive: true,
    });
    const response = await create(
      request("/api/dashboard/faqs", "POST", body),
    );
    const forbidden = await create(
      request("/api/dashboard/faqs", "POST", body, "https://evil.example"),
    );

    expect(response.status).toBe(201);
    expect(mockCreateFaq).toHaveBeenCalledWith({
      question: faq.question,
      answer: faq.answer,
      isActive: true,
    });
    expect(forbidden.status).toBe(403);
  });

  it("returns field errors for malformed and invalid payloads", async () => {
    const malformed = await create(
      request("/api/dashboard/faqs", "POST", "{invalid"),
    );
    const invalid = await create(
      request(
        "/api/dashboard/faqs",
        "POST",
        JSON.stringify({ question: "", answer: "", isActive: true }),
      ),
    );

    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      errors: [{ field: "form" }],
    });
    await expect(invalid.json()).resolves.toMatchObject({
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "question" }),
        expect.objectContaining({ field: "answer" }),
      ]),
    });
  });

  it("maps backend field errors, updates partial data, and deletes by ID", async () => {
    mockCreateFaq.mockRejectedValueOnce(
      new ApiClientError({
        kind: "validation",
        message: "Periksa kembali data FAQ.",
        status: 422,
        fieldErrors: [{ field: "answer", message: "Jawaban tidak valid." }],
      }),
    );
    const fieldError = await create(
      request(
        "/api/dashboard/faqs",
        "POST",
        JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          isActive: true,
        }),
      ),
    );
    const updated = await update(
      request(
        `/api/dashboard/faqs/${faq.id}`,
        "PATCH",
        JSON.stringify({ isActive: false }),
      ),
      { params: Promise.resolve({ id: faq.id }) },
    );
    const empty = await update(
      request(`/api/dashboard/faqs/${faq.id}`, "PATCH", JSON.stringify({})),
      { params: Promise.resolve({ id: faq.id }) },
    );
    const deleted = await remove(
      request(`/api/dashboard/faqs/${faq.id}`, "DELETE"),
      { params: Promise.resolve({ id: faq.id }) },
    );

    expect(fieldError.status).toBe(422);
    await expect(fieldError.json()).resolves.toMatchObject({
      errors: [{ field: "answer", message: "Jawaban tidak valid." }],
    });
    expect(updated.status).toBe(200);
    expect(mockUpdateFaq).toHaveBeenCalledWith(faq.id, { isActive: false });
    expect(empty.status).toBe(400);
    expect(deleted.status).toBe(200);
    expect(mockDeleteFaq).toHaveBeenCalledWith(faq.id);
  });

  it("sanitizes backend network failures", async () => {
    mockDeleteFaq.mockRejectedValue(
      new ApiClientError({
        kind: "network",
        message: "socket details",
        status: 0,
      }),
    );
    const response = await remove(
      request(`/api/dashboard/faqs/${faq.id}`, "DELETE"),
      { params: Promise.resolve({ id: faq.id }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Layanan FAQ sedang tidak tersedia. Silakan coba lagi.",
    });
  });
});
