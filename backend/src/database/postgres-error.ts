interface PostgresErrorLike {
  cause?: unknown;
  code?: unknown;
  constraint?: unknown;
}

export interface PostgresErrorDetails {
  code: string;
  constraint: string | null;
}

export function postgresErrorDetails(
  error: unknown,
): PostgresErrorDetails | null {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return null;
    const candidate = current as PostgresErrorLike;
    if (typeof candidate.code === 'string') {
      return {
        code: candidate.code,
        constraint:
          typeof candidate.constraint === 'string'
            ? candidate.constraint
            : null,
      };
    }
    current = candidate.cause;
  }
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresErrorDetails(error)?.code === '23505';
}
