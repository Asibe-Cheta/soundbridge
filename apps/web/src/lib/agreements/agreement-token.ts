import crypto from 'crypto';

/** 32 random bytes, URL-safe. This is the only form the raw token ever takes -- never logged, never stored. */
export function generateAgreementToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashAgreementToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time equality for two hex hashes. The DB lookup itself is an
 * indexed equality match (practical and standard for hash-keyed lookups --
 * same approach used by session/API-key systems generally), but this is an
 * explicit defense-in-depth check on the result before it's trusted,
 * so a timing side-channel can't be used to narrow down a valid hash.
 */
export function hashesMatch(computedHash: string, storedHash: string): boolean {
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
