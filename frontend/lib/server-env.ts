import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env";

const serverEnvSchema = z.object({
  API_BASE_URL: z.url(),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    API_BASE_URL:
      process.env.API_BASE_URL ?? getPublicEnv().NEXT_PUBLIC_API_BASE_URL,
  });
}
