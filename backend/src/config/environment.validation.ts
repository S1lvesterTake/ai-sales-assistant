import { readBootstrapEnvironment } from './bootstrap-env';

function readPositiveInteger(
  environment: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const rawValue = environment[key] ?? fallback;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

function readFrontendUrl(environment: Record<string, unknown>): string {
  const rawValue = environment.FRONTEND_URL ?? 'http://localhost:3000';
  if (typeof rawValue !== 'string') {
    throw new Error('FRONTEND_URL must be a string');
  }
  const value = rawValue.trim();
  const origins = value.split(',').map((origin) => origin.trim());

  if (origins.some((origin) => !origin)) {
    throw new Error('FRONTEND_URL must contain valid comma-separated origins');
  }

  for (const origin of origins) {
    const parsed = new URL(origin);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error('FRONTEND_URL must contain valid HTTP origins');
    }
  }

  return origins.join(',');
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const bootstrap = readBootstrapEnvironment(environment as NodeJS.ProcessEnv);

  return {
    ...environment,
    NODE_ENV: bootstrap.nodeEnv,
    PORT: bootstrap.port,
    FRONTEND_URL: readFrontendUrl(environment),
    RATE_LIMIT_LIMIT: readPositiveInteger(environment, 'RATE_LIMIT_LIMIT', 100),
    RATE_LIMIT_TTL_MS: readPositiveInteger(
      environment,
      'RATE_LIMIT_TTL_MS',
      60_000,
    ),
  };
}
