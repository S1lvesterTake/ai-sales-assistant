import { z } from "zod";

import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import type { BusinessProfileInput } from "@/types/business";

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug bisnis wajib diisi.")
  .max(100, "Slug bisnis maksimal 100 karakter.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
  );

const commonFields = {
  businessName: z
    .string()
    .trim()
    .min(1, "Nama bisnis wajib diisi.")
    .max(150, "Nama bisnis maksimal 150 karakter."),
  description: optionalText(500, "Deskripsi maksimal 500 karakter."),
  category: optionalText(100, "Kategori maksimal 100 karakter."),
  whatsappNumber: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi.")
    .refine(
      (value) => normalizeIndonesianPhone(value) !== null,
      "Nomor WhatsApp tidak valid. Gunakan format 08... atau +62...",
    ),
  location: optionalText(200, "Lokasi maksimal 200 karakter."),
  operatingHours: optionalText(200, "Jam operasional maksimal 200 karakter."),
  mainOffer: optionalText(300, "Penawaran utama maksimal 300 karakter."),
  ctaMessage: optionalText(200, "Pesan CTA maksimal 200 karakter."),
};

// Used for creating a new profile — slug is required
export const createProfileFormSchema = z.object({
  ...commonFields,
  slug: slugSchema,
});

// Used for updating — slug is immutable and excluded from the form submission
export const updateProfileFormSchema = z
  .object(commonFields)
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu perubahan wajib dikirim.",
  );

// Union type that covers both form modes; slug is optional so the form state
// is unified regardless of create vs update.
export const baseFormSchema = z.object({
  ...commonFields,
  slug: z.string().trim().max(100).optional(),
});
export type ProfileFormValues = z.infer<typeof baseFormSchema>;

// API-layer schemas (used by BFF route handlers)
export const createProfileApiSchema = createProfileFormSchema;
export const updateProfileApiSchema = updateProfileFormSchema;

export function toCreateInput(values: ProfileFormValues): BusinessProfileInput {
  const phone = normalizeIndonesianPhone(values.whatsappNumber ?? "") ?? values.whatsappNumber ?? "";
  return {
    businessName: values.businessName ?? "",
    ...(values.slug !== undefined ? { slug: values.slug } : {}),
    whatsappNumber: phone,
    ...(values.description !== undefined ? { description: values.description } : {}),
    ...(values.category !== undefined ? { category: values.category } : {}),
    ...(values.location !== undefined ? { location: values.location } : {}),
    ...(values.operatingHours !== undefined ? { operatingHours: values.operatingHours } : {}),
    ...(values.mainOffer !== undefined ? { mainOffer: values.mainOffer } : {}),
    ...(values.ctaMessage !== undefined ? { ctaMessage: values.ctaMessage } : {}),
  };
}

export function toUpdateInput(values: Partial<ProfileFormValues>): Partial<BusinessProfileInput> {
  const phone = values.whatsappNumber
    ? (normalizeIndonesianPhone(values.whatsappNumber) ?? values.whatsappNumber)
    : undefined;
  return {
    ...(values.businessName !== undefined ? { businessName: values.businessName } : {}),
    ...(phone !== undefined ? { whatsappNumber: phone } : {}),
    ...(values.description !== undefined ? { description: values.description } : {}),
    ...(values.category !== undefined ? { category: values.category } : {}),
    ...(values.location !== undefined ? { location: values.location } : {}),
    ...(values.operatingHours !== undefined ? { operatingHours: values.operatingHours } : {}),
    ...(values.mainOffer !== undefined ? { mainOffer: values.mainOffer } : {}),
    ...(values.ctaMessage !== undefined ? { ctaMessage: values.ctaMessage } : {}),
  };
}
