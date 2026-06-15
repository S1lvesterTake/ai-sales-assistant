import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  it('applies transport defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      FRONTEND_URL: 'http://localhost:3000',
      RATE_LIMIT_LIMIT: 100,
      RATE_LIMIT_TTL_MS: 60_000,
    });
  });

  it('accepts multiple explicit frontend origins', () => {
    expect(
      validateEnvironment({
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
    expect(() => validateEnvironment({ [key]: value })).toThrow();
  });
});
