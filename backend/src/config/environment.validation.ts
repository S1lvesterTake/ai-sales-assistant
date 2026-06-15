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

function readDatabaseUrl(environment: Record<string, unknown>): string {
  const rawValue = environment.DATABASE_URL;
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    throw new Error('DATABASE_URL is required');
  }
  const parsed = new URL(rawValue);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  return rawValue;
}

function readJwtSecret(environment: Record<string, unknown>): string {
  const value = environment.JWT_SECRET;
  if (typeof value !== 'string' || value.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  if (value.includes('replace-with') || value.includes('change-me')) {
    throw new Error('JWT_SECRET must not use a placeholder value');
  }
  return value;
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
    DATABASE_URL: readDatabaseUrl(environment),
    DATABASE_POOL_MAX: readPositiveInteger(
      environment,
      'DATABASE_POOL_MAX',
      10,
    ),
    DATABASE_CONNECTION_TIMEOUT_MS: readPositiveInteger(
      environment,
      'DATABASE_CONNECTION_TIMEOUT_MS',
      5_000,
    ),
    DATABASE_IDLE_TIMEOUT_MS: readPositiveInteger(
      environment,
      'DATABASE_IDLE_TIMEOUT_MS',
      30_000,
    ),
    JWT_SECRET: readJwtSecret(environment),
    JWT_EXPIRES_IN: readPositiveInteger(environment, 'JWT_EXPIRES_IN', 3_600),
    RATE_LIMIT_LIMIT: readPositiveInteger(environment, 'RATE_LIMIT_LIMIT', 100),
    RATE_LIMIT_TTL_MS: readPositiveInteger(
      environment,
      'RATE_LIMIT_TTL_MS',
      60_000,
    ),
  };
}
