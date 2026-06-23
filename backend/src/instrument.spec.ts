jest.mock('@sentry/nestjs', () => ({ init: jest.fn() }));

import * as Sentry from '@sentry/nestjs';
import { initSentry } from './instrument';

describe('initSentry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('calls Sentry.init with DSN and safe defaults when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://key@o123.ingest.sentry.io/456';

    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@o123.ingest.sentry.io/456',
        sendDefaultPii: false,
        tracesSampleRate: 0,
      }),
    );
  });

  it('does not call Sentry.init when SENTRY_DSN is absent', () => {
    delete process.env.SENTRY_DSN;

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does not call Sentry.init when SENTRY_DSN is an empty string', () => {
    process.env.SENTRY_DSN = '';

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
