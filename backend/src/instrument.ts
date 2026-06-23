import * as Sentry from '@sentry/nestjs';

// process.env is intentional here: DI container does not exist at this point.
// Same pattern as bootstrap-env.ts. This is the only file allowed to bypass
// the ConfigService rule for SENTRY_DSN.
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}
