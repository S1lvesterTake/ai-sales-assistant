import { z } from "zod";

import type { ProductInput } from "@/types/product";

const optionalText = (maximum: number, message: string) =>
  z.string().trim().max(maximum, message).optional();

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama produk wajib diisi.")
    .max(150, "Nama produk maksimal 150 karakter."),
  description: optionalText(1000, "Deskripsi maksimal 1000 karakter."),
  price: z
    .number({ error: "Harga wajib berupa angka." })
    .int("Harga harus berupa bilangan bulat.")
    .min(0, "Harga tidak boleh negatif."),
  category: optionalText(100, "Kategori maksimal 100 karakter."),
  isAvailable: z.boolean(),
  orderingInstruction: optionalText(
    1000,
    "Instruksi pemesanan maksimal 1000 karakter.",
  ),
  additionalNotes: optionalText(
    1000,
    "Catatan tambahan maksimal 1000 karakter.",
  ),
});

export const updateProductSchema = productSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Minimal satu perubahan wajib dikirim.",
);

type ProductSchemaValue = z.infer<typeof productSchema>;
type ProductSchemaPatch = {
  [Key in keyof ProductSchemaValue]?: ProductSchemaValue[Key] | undefined;
};

export function toProductInput(value: ProductSchemaValue): ProductInput {
  return {
    name: value.name,
    price: value.price,
    isAvailable: value.isAvailable,
    ...(value.description !== undefined
      ? { description: value.description }
      : {}),
    ...(value.category !== undefined ? { category: value.category } : {}),
    ...(value.orderingInstruction !== undefined
      ? { orderingInstruction: value.orderingInstruction }
      : {}),
    ...(value.additionalNotes !== undefined
      ? { additionalNotes: value.additionalNotes }
      : {}),
  };
}

export function toProductPatch(
  value: ProductSchemaPatch,
): Partial<ProductInput> {
  return {
    ...(value.name !== undefined ? { name: value.name } : {}),
    ...(value.price !== undefined ? { price: value.price } : {}),
    ...(value.isAvailable !== undefined
      ? { isAvailable: value.isAvailable }
      : {}),
    ...(value.description !== undefined
      ? { description: value.description }
      : {}),
    ...(value.category !== undefined ? { category: value.category } : {}),
    ...(value.orderingInstruction !== undefined
      ? { orderingInstruction: value.orderingInstruction }
      : {}),
    ...(value.additionalNotes !== undefined
      ? { additionalNotes: value.additionalNotes }
      : {}),
  };
}
