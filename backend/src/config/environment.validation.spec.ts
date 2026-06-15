import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/test';

  it('applies transport defaults', () => {
    expect(validateEnvironment({ DATABASE_URL: databaseUrl })).toMatchObject({
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_POOL_MAX: 10,
      RATE_LIMIT_LIMIT: 100,
      RATE_LIMIT_TTL_MS: 60_000,
    });
  });

  it('accepts multiple explicit frontend origins', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: databaseUrl,
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
  ])('rejects invalid %s', (key, value) => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: databaseUrl, [key]: value }),
    ).toThrow();
  });

  it.each([undefined, '', 'mysql://localhost/test'])(
    'rejects invalid database URL %s',
    (value) => {
      expect(() => validateEnvironment({ DATABASE_URL: value })).toThrow();
    },
  );
});
