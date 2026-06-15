import { z } from "zod";

import type { FaqInput } from "@/types/faq";

export const faqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib diisi.")
    .max(300, "Pertanyaan maksimal 300 karakter."),
  answer: z
    .string()
    .trim()
    .min(1, "Jawaban wajib diisi.")
    .max(1000, "Jawaban maksimal 1000 karakter."),
  category: z
    .string()
    .trim()
    .max(100, "Kategori maksimal 100 karakter.")
    .optional(),
  isActive: z.boolean(),
});

export const updateFaqSchema = faqSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Minimal satu perubahan wajib dikirim.",
);

type FaqSchemaValue = z.infer<typeof faqSchema>;
type FaqSchemaPatch = {
  [Key in keyof FaqSchemaValue]?: FaqSchemaValue[Key] | undefined;
};

export function toFaqInput(value: FaqSchemaValue): FaqInput {
  return {
    question: value.question,
    answer: value.answer,
    isActive: value.isActive,
    ...(value.category !== undefined ? { category: value.category } : {}),
  };
}

export function toFaqPatch(value: FaqSchemaPatch): Partial<FaqInput> {
  return {
    ...(value.question !== undefined ? { question: value.question } : {}),
    ...(value.answer !== undefined ? { answer: value.answer } : {}),
    ...(value.category !== undefined ? { category: value.category } : {}),
    ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
  };
}
