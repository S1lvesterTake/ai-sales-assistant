import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_BYTES = 32;
const TOKEN_ENCODING: BufferEncoding = 'base64url';

export interface GeneratedToken {
  raw: string;
  hash: string;
}

export function generateSessionToken(): GeneratedToken {
  const raw = randomBytes(TOKEN_BYTES).toString(TOKEN_ENCODING);
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(token: string, storedHash: string): boolean {
  const tokenHash = hashToken(token);
  try {
    return timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    );
  } catch {
    return false;
  }
}
