import {
  generateSessionToken,
  hashToken,
  tokensMatch,
} from './session-token.utils';

describe('session-token.utils', () => {
  describe('hashToken()', () => {
    it('returns a consistent SHA-256 hex string for the same input', () => {
      const hash1 = hashToken('my-token');
      const hash2 = hashToken('my-token');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns different hashes for different inputs', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });

  describe('generateSessionToken()', () => {
    it('returns an object with raw and hash fields', () => {
      const token = generateSessionToken();

      expect(token).toHaveProperty('raw');
      expect(token).toHaveProperty('hash');
    });

    it('hash matches the raw value via hashToken', () => {
      const token = generateSessionToken();

      expect(token.hash).toBe(hashToken(token.raw));
    });

    it('generates unique tokens on each call', () => {
      const a = generateSessionToken();
      const b = generateSessionToken();

      expect(a.raw).not.toBe(b.raw);
    });
  });

  describe('tokensMatch()', () => {
    it('returns true when token matches the stored hash', () => {
      const raw = 'test-token';
      const hash = hashToken(raw);

      expect(tokensMatch(raw, hash)).toBe(true);
    });

    it('returns false when token does not match the stored hash', () => {
      const hash = hashToken('correct-token');

      expect(tokensMatch('wrong-token', hash)).toBe(false);
    });

    it('returns false for mismatched buffer lengths (invalid hash)', () => {
      expect(tokensMatch('token', 'not-a-hex-hash')).toBe(false);
    });
  });
});
