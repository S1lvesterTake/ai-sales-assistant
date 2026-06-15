import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  NEXT_PUBLIC_DEMO_BUSINESS_SLUG: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  NEXT_PUBLIC_API_MOCKING: z.enum(["enabled", "disabled"]).default("disabled"),
  NEXT_PUBLIC_REPOSITORY_URL: z.url().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

type PublicEnvSource = Readonly<Record<string, string | undefined>>;

const bundledPublicEnv: PublicEnvSource = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_DEMO_BUSINESS_SLUG:
    process.env.NEXT_PUBLIC_DEMO_BUSINESS_SLUG,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_REPOSITORY_URL: process.env.NEXT_PUBLIC_REPOSITORY_URL,
};

export function getPublicEnv(
  environment: PublicEnvSource = bundledPublicEnv,
): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_API_BASE_URL: environment.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_DEMO_BUSINESS_SLUG:
      environment.NEXT_PUBLIC_DEMO_BUSINESS_SLUG,
    NEXT_PUBLIC_API_MOCKING: environment.NEXT_PUBLIC_API_MOCKING,
    ...(environment.NEXT_PUBLIC_REPOSITORY_URL
      ? { NEXT_PUBLIC_REPOSITORY_URL: environment.NEXT_PUBLIC_REPOSITORY_URL }
      : {}),
  });
}
