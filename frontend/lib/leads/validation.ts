import { z } from "zod";

import { normalizeIndonesianPhone } from "@/lib/validation/phone";
import type { LeadInput, LeadStatus } from "@/types/lead";

export const manualLeadSchema = z
  .object({
    name: z.string().trim().max(100, "Nama maksimal 100 karakter.").optional(),
    phone: z
      .string()
      .trim()
      .min(1, "Nomor WhatsApp wajib diisi.")
      .refine(
        (value) => normalizeIndonesianPhone(value) !== null,
        "Gunakan format 08..., 628..., atau +628... yang valid.",
      ),
    interestSummary: z
      .string()
      .trim()
      .max(1000, "Ringkasan minat maksimal 1000 karakter.")
      .optional(),
  })
  .strict();

export const leadStatusSchema = z
  .object({
    status: z.enum(["new", "contacted", "qualified", "closed", "lost"]),
  })
  .strict();

export type ManualLeadValues = z.infer<typeof manualLeadSchema>;

export function toManualLeadInput(value: ManualLeadValues): LeadInput {
  const phone = normalizeIndonesianPhone(value.phone);
  if (!phone) throw new Error("Phone must be validated before normalization.");

  return {
    phone,
    ...(value.name ? { name: value.name } : {}),
    ...(value.interestSummary
      ? { interestSummary: value.interestSummary }
      : {}),
  };
}

export function toLeadStatus(value: { status: LeadStatus }): LeadStatus {
  return value.status;
}
