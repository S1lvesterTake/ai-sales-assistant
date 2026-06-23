import * as Sentry from '@sentry/nestjs';

// process.env is intentional here: DI container does not exist at this point.
// Same pattern as bootstrap-env.ts. This is the only file allowed to bypass
// the ConfigService rule for SENTRY_DSN.
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  } catch (err) {
    // Sentry is non-critical — a bad DSN must never crash the service.
    // console.warn is intentional: pino is not yet initialised at this point.
    console.warn('[Sentry] init failed, error capture disabled:', err);
  }
}
