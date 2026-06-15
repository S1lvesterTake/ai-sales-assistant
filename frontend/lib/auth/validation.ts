import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Masukkan alamat email yang valid."),
  password: z.string().min(1, "Kata sandi wajib diisi.").max(200),
});

export const loginRequestSchema = loginSchema.extend({
  returnTo: z.string().max(2048).optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
