import { isUniqueViolation, postgresErrorDetails } from './postgres-error';

describe('PostgreSQL error unwrapping', () => {
  it('finds a wrapped unique-constraint violation', () => {
    const error = {
      cause: {
        code: '23505',
        constraint: 'business_profiles_user_id_unique',
      },
    };
    expect(postgresErrorDetails(error)).toEqual({
      code: '23505',
      constraint: 'business_profiles_user_id_unique',
    });
    expect(isUniqueViolation(error)).toBe(true);
  });

  it('returns null for unrelated errors', () => {
    expect(postgresErrorDetails(new Error('failure'))).toBeNull();
    expect(isUniqueViolation(new Error('failure'))).toBe(false);
  });
});
