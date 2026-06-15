import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/test';
  const jwtSecret = 'unit-test-jwt-secret-with-at-least-32-characters';
  const validEnvironment = { DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret };

  it('applies transport defaults', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_POOL_MAX: 10,
      DEMO_DATA_RESET_ON_DEPLOY: false,
      RATE_LIMIT_LIMIT: 100,
      RATE_LIMIT_TTL_MS: 60_000,
    });
  });

  it('accepts multiple explicit frontend origins', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        FRONTEND_URL: 'https://example.com,http://localhost:3000',
      }),
    ).toMatchObject({
      FRONTEND_URL: 'https://example.com,http://localhost:3000',
    });
  });

  it.each([
    ['FRONTEND_URL', 'javascript:alert(1)'],
    ['RATE_LIMIT_LIMIT', '0'],
    ['RATE_LIMIT_TTL_MS', 'abc'],
    ['DEMO_DATA_RESET_ON_DEPLOY', 'yes'],
  ])('rejects invalid %s', (key, value) => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, [key]: value }),
    ).toThrow();
  });

  it.each([undefined, '', 'mysql://localhost/test'])(
    'rejects invalid database URL %s',
    (value) => {
      expect(() =>
        validateEnvironment({ ...validEnvironment, DATABASE_URL: value }),
      ).toThrow();
    },
  );

  it.each([
    undefined,
    'short',
    'replace-with-secret-value-that-is-long-enough',
  ])('rejects invalid JWT secret %s', (value) => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_SECRET: value }),
    ).toThrow();
  });
});
